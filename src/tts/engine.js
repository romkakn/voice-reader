// engine.js — classic content script, defines VR.TTSEngine base class.
// Interface only; concrete engines (webspeech.js, edgetts.js) extend this.
(function () {
  window.VR = window.VR || {};

  class TTSEngine {
    // speak(chunks, { voice, rate, pitch, onBoundary, onChunk, onEnd })
    // chunks: string[] — one utterance per chunk.
    speak(chunks, opts) {}

    pause() {}
    resume() {}
    stop() {}

    // setRate(r): live retune is impossible; implementations cancel and
    // re-queue remaining chunks from the current index at the new rate.
    setRate(r) {}
  }

  VR.TTSEngine = TTSEngine;
})();
