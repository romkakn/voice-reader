// piper.js — classic content script, VR.PiperEngine proxy (no WASM here).
// Forwards speak/pause/resume/stop/setRate to background -> offscreen.
// Listens for {type:'vr-tts-state'} to drive callbacks.
//
// Listener + callbacks live on `window` so repeated injection (dev reloads,
// background re-inject) never stacks duplicate listeners or splits state.
(function () {
  window.VR = window.VR || {};
  window.__VR_PIPER_CB = window.__VR_PIPER_CB ||
    { onLoading: null, onPlaying: null, onPaused: null, onChunk: null, onWord: null, onEnd: null, onError: null };

  // Bind the state listener exactly once per page.
  if (!window.__VR_PIPER_BOUND) {
    window.__VR_PIPER_BOUND = true;
    chrome.runtime.onMessage.addListener((msg) => {
      if (!msg || msg.type !== 'vr-tts-state') return;
      const c = window.__VR_PIPER_CB;
      switch (msg.state) {
        case 'loading': if (c.onLoading) c.onLoading(); break;
        case 'playing': if (c.onPlaying) c.onPlaying(); break;
        case 'paused':  if (c.onPaused)  c.onPaused();  break;
        case 'chunk':   if (c.onChunk)   c.onChunk(msg.index); break;
        case 'word':    if (c.onWord)    c.onWord(msg.index);  break;
        case 'idle':    if (c.onEnd)     c.onEnd();     break;
        case 'error':   if (c.onError)   c.onError(msg.detail); break;
      }
    });
  }

  class PiperEngine extends VR.TTSEngine {
    speak(chunks, opts = {}) {
      const c = window.__VR_PIPER_CB;
      c.onLoading = opts.onLoading || null;
      c.onPlaying = opts.onPlaying || null;
      c.onPaused  = opts.onPaused  || null;
      c.onChunk   = opts.onChunk   || null;
      c.onWord    = opts.onWord    || null;
      c.onEnd     = opts.onEnd     || null;
      c.onError   = opts.onError   || null;
      chrome.runtime.sendMessage({
        type: 'vr-tts',
        action: 'speak',
        chunks,
        voiceId: opts.voiceId || 'en_US-hfc_female-medium',
        rate: opts.rate || 1.0,
        startIndex: opts.startIndex || 0,
      });
    }
    pause()  { chrome.runtime.sendMessage({ type: 'vr-tts', action: 'pause'  }); }
    resume() { chrome.runtime.sendMessage({ type: 'vr-tts', action: 'resume' }); }
    stop() {
      chrome.runtime.sendMessage({ type: 'vr-tts', action: 'stop' });
      const c = window.__VR_PIPER_CB;
      c.onLoading = c.onPlaying = c.onPaused = c.onChunk = c.onWord = c.onEnd = c.onError = null;
    }
    setRate(r) { chrome.runtime.sendMessage({ type: 'vr-tts', action: 'setRate', rate: r }); }
  }

  VR.PiperEngine = PiperEngine;
})();
