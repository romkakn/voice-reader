// offscreen.js — ESM module. Runs Piper neural TTS in an MV3 offscreen document.
// Receives { type:'vr-tts', target:'offscreen', action, ... } from the service
// worker, synthesizes each chunk via @mintplex-labs/piper-tts-web, plays them
// sequentially through one <audio> element, and reports state back via
// chrome.runtime.sendMessage({ type:'vr-tts-state', state, detail }).

// Vendored locally (MV3 forbids remote script/wasm). onnxruntime-web is loaded
// as a UMD global (window.ort) by offscreen.html before this module runs; the
// vendored piper lib was patched to read globalThis.ort instead of importing it.
import { TtsSession } from '../../vendor/piper/piper-tts-web.js';

// All WASM served from the extension package (chrome-extension://). Only the
// voice model (.onnx/.json, data) is fetched remotely from HuggingFace.
const WASM_PATHS = {
  onnxWasm:  chrome.runtime.getURL('vendor/ort/'),                       // dir, trailing slash required
  piperWasm: chrome.runtime.getURL('vendor/phonemize/piper_phonemize.wasm'),
  piperData: chrome.runtime.getURL('vendor/phonemize/piper_phonemize.data'),
};

const audio = document.getElementById('vr-audio');

// ---- session cache (one TtsSession per voiceId; library is singleton) --------
const sessions = new Map(); // voiceId -> Promise<TtsSession>
function getSession(voiceId) {
  let p = sessions.get(voiceId);
  if (!p) {
    p = TtsSession.create({ voiceId, wasmPaths: WASM_PATHS }).catch((err) => {
      sessions.delete(voiceId); // allow retry after failure
      throw err;
    });
    sessions.set(voiceId, p);
  }
  return p;
}

// ---- queue state machine -----------------------------------------------------
let sessionId = 0;       // bumps on every speak/stop; stale audio events ignored
let queue = [];          // string[] chunks
let currentIndex = 0;
let rate = 1.0;
let paused = false;
let stopped = true;
let currentVoiceId = null;
let currentUrl = null;   // object URL of the chunk currently loaded in <audio>
let nextBlobPromise = null; // prefetched synth of the next chunk

function emit(state, detail) {
  chrome.runtime.sendMessage({ type: 'vr-tts-state', state, detail });
}

function clampRate(r) {
  r = Number(r);
  if (isNaN(r)) return 1.0;
  if (r < 0.5) return 0.5;
  if (r > 2.0) return 2.0;
  return r;
}

function revokeCurrentUrl() {
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}

function synth(text, voiceId) {
  return getSession(voiceId).then((session) => session.predict(text));
}

// Begin (or restart) playback of the queue from currentIndex.
async function speak({ chunks, voiceId, rate: r, startIndex }) {
  // Invalidate any in-flight playback.
  const mySession = ++sessionId;
  stopped = false;
  paused = false;
  queue = Array.isArray(chunks) ? chunks.slice() : [];
  currentIndex = (startIndex && startIndex > 0 && startIndex < queue.length) ? startIndex : 0;
  rate = clampRate(r != null ? r : 1.0);
  currentVoiceId = voiceId;
  nextBlobPromise = null;

  try { audio.pause(); } catch (e) {}
  revokeCurrentUrl();

  if (!queue.length) { emit('idle'); return; }

  emit('loading');

  try {
    // Warm the session (model fetch happens here on cold start).
    await getSession(voiceId);
    if (mySession !== sessionId) return; // superseded while loading
    await playFrom(mySession);
  } catch (err) {
    if (mySession !== sessionId) return;
    emit('error', String(err && err.message ? err.message : err));
  }
}

// Synthesize + play chunks sequentially. Prefetches chunk N+1 while N plays.
// Char-weighted word boundaries for time->word mapping (each word weighted by
// its length + 1, so longer words occupy proportionally more of the audio).
function wordBoundaries(text) {
  const words = (text || '').match(/\S+/g) || [];
  const cum = [];
  let acc = 0;
  for (let i = 0; i < words.length; i++) { cum.push(acc); acc += words[i].length + 1; }
  return { count: words.length, cum, total: acc || 1 };
}
function wordIndexAt(frac, wb) {
  if (wb.count === 0) return -1;
  const target = Math.max(0, Math.min(frac, 1)) * wb.total;
  let i = 0;
  while (i + 1 < wb.count && wb.cum[i + 1] <= target) i++;
  return i;
}

async function playFrom(mySession) {
  while (!stopped && mySession === sessionId && currentIndex < queue.length) {
    const idx = currentIndex;

    // Use prefetched blob if available, else synth now.
    let blob;
    if (nextBlobPromise) {
      blob = await nextBlobPromise;
      nextBlobPromise = null;
    } else {
      blob = await synth(queue[idx], currentVoiceId);
    }
    if (stopped || mySession !== sessionId) return;

    // Kick off prefetch of the next chunk while this one plays.
    if (idx + 1 < queue.length) {
      nextBlobPromise = synth(queue[idx + 1], currentVoiceId).catch(() => null);
    }

    revokeCurrentUrl();
    currentUrl = URL.createObjectURL(blob);
    audio.src = currentUrl;
    audio.playbackRate = rate;

    // Play and wait for this chunk to finish (or for an error).
    const ended = await playCurrent(mySession, idx, wordBoundaries(queue[idx]));
    if (ended === 'stale') return; // superseded / stopped; do not advance

    currentIndex = idx + 1;
  }

  if (!stopped && mySession === sessionId && currentIndex >= queue.length) {
    revokeCurrentUrl();
    emit('idle');
  }
}

// Plays the loaded <audio> source to completion. The active-sentence event is
// sent on real playback start; word marking is driven by audio currentTime so it
// stays in sync with the voice (and with playbackRate / pause / resume).
function playCurrent(mySession, idx, wb) {
  return new Promise((resolve) => {
    let settled = false, started = false, lastWord = -1;
    const finish = (val) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('timeupdate', onTime);
      resolve(val);
    };
    const onEnded = () => finish('ended');
    const onError = () => {
      if (mySession !== sessionId || stopped) { finish('stale'); return; }
      emit('error', 'audio playback error');
      finish('stale');
    };
    const onPlaying = () => {
      if (mySession !== sessionId || stopped) return;
      if (!started) {
        started = true;
        // Switch the active caption line exactly when this chunk's audio begins.
        chrome.runtime.sendMessage({ type: 'vr-tts-state', state: 'chunk', index: idx });
      }
      emit('playing');
    };
    const onTime = () => {
      if (mySession !== sessionId || stopped) return;
      const d = audio.duration;
      if (!d || !isFinite(d) || wb.count === 0) return;
      const wi = wordIndexAt(audio.currentTime / d, wb);
      if (wi !== lastWord) {
        lastWord = wi;
        chrome.runtime.sendMessage({ type: 'vr-tts-state', state: 'word', index: wi });
      }
    };
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('timeupdate', onTime);

    audio.play().catch(() => {
      // play() rejects if paused immediately (e.g. pause action) — not fatal.
      if (mySession !== sessionId || stopped) finish('stale');
    });
  });
}

function pause() {
  if (stopped) return;
  paused = true;
  try { audio.pause(); } catch (e) {}
  emit('paused');
}

function resume() {
  if (stopped || !paused) return;
  paused = false;
  audio.play().then(() => emit('playing')).catch(() => {});
}

function stop() {
  sessionId++;        // invalidate any in-flight playFrom loop / audio events
  stopped = true;
  paused = false;
  queue = [];
  currentIndex = 0;
  nextBlobPromise = null;
  try { audio.pause(); } catch (e) {}
  try { audio.removeAttribute('src'); audio.load(); } catch (e) {}
  revokeCurrentUrl();
  emit('idle');
}

function setRate({ rate: r }) {
  rate = clampRate(r);
  // Live: applies to the currently-playing chunk and all subsequent ones.
  try { audio.playbackRate = rate; } catch (e) {}
}

// ---- message router ----------------------------------------------------------
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== 'vr-tts' || msg.target !== 'offscreen') return;
  switch (msg.action) {
    case 'speak':   speak(msg); break;
    case 'pause':   pause(); break;
    case 'resume':  resume(); break;
    case 'stop':    stop(); break;
    case 'setRate': setRate(msg); break;
  }
});
