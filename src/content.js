// VR content script — wiring + persistent reader + live captions
window.VR = window.VR || {};

(function () {
  // Build version — bump on every content-script change so the background can
  // detect a stale copy in an already-open tab and force-inject the latest.
  const VR_BUILD = 17;
  if (window.__VR_BUILD && window.__VR_BUILD >= VR_BUILD) return; // current/newer already active
  window.__VR_BUILD = VR_BUILD;

  const DEFAULT_SETTINGS = {
    explanatory:  { voiceName: '', rate: 1.0, pitch: 1.0 },
    storytelling: { voiceName: '', rate: 0.9, pitch: 1.1 },
    engine: 'auto',
    piper: { voiceId: 'en_US-hfc_female-medium' },
  };

  let engine = null;
  let engineType = null;        // 'piper' | 'system' | 'auto'
  let bar = null;
  let captions = null;
  let captionsOn = true;        // overridden from storage below
  let currentRate = 1.0;
  let lastMode = 'explanatory';
  let lastReadText = '';
  let currentChunks = [];
  let latestSelText = '';
  let wordTimer = null;

  // Piper has no per-word boundary events, so approximate karaoke marking with a
  // timer: step through the chunk's words at an estimated cadence (scaled by rate).
  function clearWordTimer() { if (wordTimer) { clearTimeout(wordTimer); wordTimer = null; } }
  // Per-word duration scales with word length, like real speech. Tuned so a
  // 5-letter word ≈ 250ms at rate 1.0 (matches ~3 words/sec English cadence).
  function wordDur(w) {
    const r = currentRate || 1;
    const ms = 80 + (w ? w.length : 1) * 42;
    return Math.max(90, Math.round(ms / r));
  }
  function startWordTimer(caps, text) {
    clearWordTimer();
    const words = (text || '').split(/\s+/).filter(Boolean);
    if (!words.length) return;
    let k = 0;
    caps.markWord(0);
    const step = () => {
      k++;
      if (k >= words.length) { clearWordTimer(); return; }
      caps.markWord(k);
      wordTimer = setTimeout(step, wordDur(words[k]));
    };
    wordTimer = setTimeout(step, wordDur(words[0]));
  }

  // ---- live selection tracking ------------------------------------------------
  function readLiveSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return { text: '' };
    return { text: sel.toString().replace(/\s+/g, ' ').trim() };
  }
  function captureSelection() {
    const { text } = readLiveSelection();
    if (text) latestSelText = text;
  }
  document.addEventListener('mouseup', captureSelection, true);
  document.addEventListener('keyup', captureSelection, true);

  try {
    chrome.storage.local.get('vr_captions_on', (r) => {
      if (r && typeof r.vr_captions_on === 'boolean') captionsOn = r.vr_captions_on;
      if (bar) bar.setCaptionsActive(captionsOn);
    });
  } catch (e) {}
  function persistCaptions() { try { chrome.storage.local.set({ vr_captions_on: captionsOn }); } catch (e) {} }

  // ---- components -------------------------------------------------------------
  function getBar() {
    if (bar) return bar;
    bar = new VR.Bar();
    bar.setCaptionsActive(captionsOn);

    bar.onPlayPause = () => {
      if (bar._state === 'playing') { if (engine) engine.pause(); clearWordTimer(); bar.setState('paused'); }
      else if (bar._state === 'paused') { if (engine) engine.resume(); bar.setState('playing'); }
      else { const t = readLiveSelection().text || latestSelText; if (t) startRead(t, lastMode); }
    };
    bar.onSpeedDown = (r) => { currentRate = r; if (engine) engine.setRate(r); };
    bar.onSpeedUp   = (r) => { currentRate = r; if (engine) engine.setRate(r); };
    bar.onModeChange = (m) => { lastMode = m; };
    bar.onToggleCaptions = () => {
      captionsOn = !captionsOn;
      persistCaptions();
      const caps = getCaptions();
      if (captionsOn) { if (currentChunks.length) caps.setChunks(currentChunks); caps.show(); }
      else caps.hide();
      bar.setCaptionsActive(captionsOn);
    };
    bar.onClose = () => {
      if (engine) engine.stop();
      clearWordTimer();
      engine = null; lastReadText = '';
      bar.setState('idle'); bar.hide();
      if (captions) captions.hide();
    };
    return bar;
  }

  function getCaptions() {
    if (captions) return captions;
    captions = new VR.Captions();
    captions.onReplay = (i) => replayFrom(i);
    captions.onClose = () => { captionsOn = false; persistCaptions(); if (bar) bar.setCaptionsActive(false); };
    return captions;
  }

  function buildEngine(selectedEngine) {
    if (selectedEngine === 'system') { engineType = 'system'; return new VR.WebSpeechEngine(); }
    if (typeof VR.PiperEngine !== 'undefined') { engineType = selectedEngine; return new VR.PiperEngine(); }
    engineType = 'system'; return new VR.WebSpeechEngine();
  }

  // ---- core read --------------------------------------------------------------
  function startRead(text, mode) {
    if (!text) return;
    lastReadText = text;
    runEngine(VR.chunker.split(text), mode, 0);
  }
  function replayFrom(index) {
    if (currentChunks.length) runEngine(currentChunks, lastMode, index);
  }

  function runEngine(chunks, mode, startIndex) {
    if (!chunks || !chunks.length) return;
    chrome.storage.sync.get('vr_settings', (result) => {
      const settings = Object.assign({}, DEFAULT_SETTINGS, result && result.vr_settings);
      const modeSettings = settings[mode] || DEFAULT_SETTINGS[mode] || DEFAULT_SETTINGS.explanatory;
      const selectedEngine = settings.engine || 'auto';
      const piperVoiceId = (settings.piper && settings.piper.voiceId) || DEFAULT_SETTINGS.piper.voiceId;

      lastMode = mode;
      currentRate = modeSettings.rate;
      currentChunks = chunks;

      if (engine) engine.stop();
      engine = buildEngine(selectedEngine);
      const captured = engine;

      const b = getBar();
      b.setMode(mode === 'storytelling' ? 'Story' : 'Explain');
      b.setSpeed(currentRate);
      b.show();

      const caps = getCaptions();
      if (captionsOn) {
        caps.setChunks(chunks);
        caps.show();
        if (startIndex > 0) caps.setActive(startIndex);
      }
      const onChunk = (i) => {
        if (engine !== captured || !captionsOn) return;
        caps.setActive(i);
        clearWordTimer();
        // Piper has no per-word boundary events; approximate via length-scaled timer.
        if (engineType !== 'system') startWordTimer(caps, chunks[i]);
      };
      // System engine emits real boundaries; Piper relies on the timer above.
      const onBoundary = (e) => { if (engine === captured && captionsOn) caps.markWordByChar(e.charIndex); };
      const onWord = (w) => { if (engine === captured && captionsOn) caps.markWord(w); };
      const onEnd = () => { if (engine !== captured) return; clearWordTimer(); b.setState('idle'); autoContinue(); };

      if (engineType === 'system') {
        b.setState('playing');
        captured.speak(chunks, {
          voice: modeSettings.voiceName || '', rate: currentRate, pitch: modeSettings.pitch,
          startIndex, onChunk, onBoundary, onEnd,
        });
      } else {
        b.setState('loading');
        captured.speak(chunks, {
          voiceId: piperVoiceId, rate: currentRate, startIndex, onChunk, onWord,
          onLoading: () => { if (engine === captured) b.setState('loading'); },
          onPlaying: () => { if (engine === captured) b.setState('playing'); },
          onPaused:  () => { if (engine === captured) b.setState('paused'); },
          onEnd,
          onError: (detail) => {
            if (engine !== captured) return;
            console.warn('[VoiceReader] Piper error:', detail);
            if (selectedEngine === 'auto' || selectedEngine === 'piper') {
              const fb = new VR.WebSpeechEngine();
              engine = fb; engineType = 'system';
              b.setState('playing');
              fb.speak(chunks, {
                voice: modeSettings.voiceName || '', rate: currentRate, pitch: modeSettings.pitch, startIndex,
                onChunk: (i) => { if (engine === fb && captionsOn) { caps.setActive(i); clearWordTimer(); } },
                onBoundary: (e) => { if (engine === fb && captionsOn) caps.markWordByChar(e.charIndex); },
                onEnd: () => { if (engine === fb) { b.setState('idle'); autoContinue(); } },
              });
            } else { b.setState('idle'); }
          },
        });
      }
    });
  }

  // After a read finishes, if the user selected a DIFFERENT block, continue it.
  function autoContinue() {
    const t = readLiveSelection().text || latestSelText;
    if (t && t !== lastReadText) startRead(t, lastMode);
  }

  // ---- messages ---------------------------------------------------------------
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'vr-ping') { sendResponse({ ok: true, build: VR_BUILD }); return; }
    if (window.__VR_BUILD !== VR_BUILD) return; // a newer build took over
    if (msg.type !== 'vr-speak') return;
    startRead(msg.text, msg.mode);
    console.debug('[VoiceReader] vr-speak handled, build', VR_BUILD);
  });

  console.debug('[VoiceReader] content build', VR_BUILD, 'ready');
})();
