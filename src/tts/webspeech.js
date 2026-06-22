// webspeech.js — classic content script. VR.WebSpeechEngine extends VR.TTSEngine.
// Uses window.speechSynthesis. Handles Chrome long-utterance cutoff (input is
// pre-chunked) and rate-restart (cancel + re-queue from currentIndex).
(function () {
  window.VR = window.VR || {};

  var synth = window.speechSynthesis;

  // Resolve voices, waiting for 'voiceschanged' if the list is empty on first call.
  function getVoices() {
    return new Promise(function (resolve) {
      var voices = synth.getVoices();
      if (voices && voices.length) {
        resolve(voices);
        return;
      }
      var done = false;
      function handler() {
        if (done) return;
        done = true;
        synth.removeEventListener('voiceschanged', handler);
        resolve(synth.getVoices() || []);
      }
      synth.addEventListener('voiceschanged', handler);
      // fallback poll in case the event never fires
      var tries = 0;
      var t = setInterval(function () {
        var v = synth.getVoices();
        if ((v && v.length) || tries++ > 20) {
          clearInterval(t);
          handler();
        }
      }, 100);
    });
  }

  function resolveVoice(voices, voiceName) {
    if (voiceName) {
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].name === voiceName) return voices[i];
      }
    }
    // sensible default: a local English voice, else default-flagged, else first.
    var local = voices.filter(function (v) { return v.localService; });
    var pool = local.length ? local : voices;
    for (var j = 0; j < pool.length; j++) {
      if (/^en(-|_|$)/i.test(pool[j].lang)) return pool[j];
    }
    for (var k = 0; k < pool.length; k++) {
      if (pool[k].default) return pool[k];
    }
    return pool[0] || null;
  }

  class WebSpeechEngine extends VR.TTSEngine {
    constructor() {
      super();
      this.chunks = [];
      this.currentIndex = 0;
      this.voice = null;        // resolved SpeechSynthesisVoice
      this.rate = 1.0;
      this.pitch = 1.0;
      this.callbacks = {};
      this._speaking = false;
      this._sessionId = 0;      // invalidates stale utterance callbacks
      this._paused = false;
      this._pendingRequeue = false; // rate changed while paused; re-queue on resume
      this._ended = false;          // reached natural end; play restarts from 0
    }

    speak(chunks, opts) {
      opts = opts || {};
      // Guard against overlap from a previous run.
      synth.cancel();

      this.chunks = Array.isArray(chunks) ? chunks.slice() : [];
      this.currentIndex = 0;
      this._paused = false;
      this._pendingRequeue = false;
      this._ended = false;
      this.rate = clampRate(opts.rate != null ? opts.rate : 1.0);
      this.pitch = opts.pitch != null ? opts.pitch : 1.0;
      this.callbacks = {
        onBoundary: opts.onBoundary,
        onChunk: opts.onChunk,
        onEnd: opts.onEnd
      };

      var start = (opts.startIndex && opts.startIndex > 0) ? opts.startIndex : 0;
      var self = this;
      getVoices().then(function (voices) {
        self.voice = resolveVoice(voices, opts.voice);
        self._run(start);
      });
    }

    // Queue utterances starting at fromIndex. Bumps session id to ignore
    // callbacks from any previously-cancelled utterances.
    _run(fromIndex) {
      var session = ++this._sessionId;
      this.currentIndex = fromIndex;
      this._speaking = true;

      this._ended = false;
      if (fromIndex >= this.chunks.length) {
        this._speaking = false;
        this._ended = true;
        if (this.callbacks.onEnd) this.callbacks.onEnd();
        return;
      }

      var self = this;
      for (var i = fromIndex; i < this.chunks.length; i++) {
        var u = new SpeechSynthesisUtterance(this.chunks[i]);
        if (this.voice) u.voice = this.voice;
        u.rate = this.rate;
        u.pitch = this.pitch;

        (function (index) {
          u.onstart = function () {
            if (session !== self._sessionId) return;
            self.currentIndex = index;
            if (self.callbacks.onChunk) self.callbacks.onChunk(index);
          };
          u.onboundary = function (e) {
            if (session !== self._sessionId) return;
            if (self.callbacks.onBoundary) self.callbacks.onBoundary(e);
          };
          u.onend = function () {
            if (session !== self._sessionId) return;
            if (index >= self.chunks.length - 1) {
              self._speaking = false;
              self._ended = true;
              if (self.callbacks.onEnd) self.callbacks.onEnd();
            }
          };
        })(i);

        synth.speak(u);
      }
    }

    pause() {
      this._paused = true;
      try { synth.pause(); } catch (e) {}
    }

    resume() {
      // Rate changed while paused: re-queue remaining chunks at the new rate.
      if (this._pendingRequeue) {
        this._pendingRequeue = false;
        this._paused = false;
        this._run(this.currentIndex);
        return;
      }
      // Finished naturally: play restarts from the beginning.
      if (this._ended) {
        this._ended = false;
        this._paused = false;
        this._run(0);
        return;
      }
      this._paused = false;
      try { synth.resume(); } catch (e) {}
    }

    stop() {
      this._sessionId++; // invalidate pending callbacks
      this._speaking = false;
      this._paused = false;
      this._pendingRequeue = false;
      this._ended = false;
      this.currentIndex = 0;
      try { synth.cancel(); } catch (e) {}
    }

    // Live retune is impossible: cancel and re-queue remaining chunks from
    // the current index at the new rate. While paused, defer the re-queue
    // until resume so the audio stays paused and the UI stays in sync.
    setRate(r) {
      this.rate = clampRate(r);
      if (!this.chunks.length) return;
      if (this._paused) {
        this._pendingRequeue = true;
        return;
      }
      var from = this.currentIndex;
      try { synth.cancel(); } catch (e) {}
      this._run(from);
    }
  }

  function clampRate(r) {
    r = Number(r);
    if (isNaN(r)) return 1.0;
    if (r < 0.5) return 0.5;
    if (r > 2.0) return 2.0;
    return r;
  }

  VR.WebSpeechEngine = WebSpeechEngine;
})();
