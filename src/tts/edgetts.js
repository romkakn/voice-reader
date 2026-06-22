// edgetts.js — classic content script. STUB only (P3).
// Future approach: a background/proxy fetches Microsoft Edge TTS audio
// (SSML -> streamed audio blob) since the Edge voices aren't exposed to
// the WebSpeech API in-page. The proxy returns an audio Blob/ArrayBuffer
// which this engine plays via an <audio>/AudioBufferSourceNode, mapping
// the contract's onChunk/onBoundary/onEnd onto audio playback + SSML marks.
(function () {
  window.VR = window.VR || {};

  function notImplemented() {
    throw new Error('EdgeTTS not implemented (P3)');
  }

  class EdgeTTSEngine extends VR.TTSEngine {
    speak(chunks, opts) { notImplemented(); }
    pause() { notImplemented(); }
    resume() { notImplemented(); }
    stop() { notImplemented(); }
    setRate(r) { notImplemented(); }
  }

  VR.EdgeTTSEngine = EdgeTTSEngine;
})();
