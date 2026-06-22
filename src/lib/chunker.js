// chunker.js — classic content script, attaches VR.chunker.
// Splits text into sentence-sized chunks for TTS queueing.
(function () {
  window.VR = window.VR || {};

  var MAX = 240; // hard cap per chunk so no single utterance is too long

  // Common abbreviations we don't want to treat as sentence ends.
  var ABBR = /(\b(?:mr|mrs|ms|dr|prof|sr|jr|st|vs|etc|e\.g|i\.e|fig|al|inc|ltd|co|dept|no|vol|p\.s)\.?)$/i;

  // Hard-split a long string on commas, then spaces, keeping pieces <= MAX.
  function hardSplit(s) {
    if (s.length <= MAX) return [s];
    var out = [];
    var rest = s;
    while (rest.length > MAX) {
      var window_ = rest.slice(0, MAX);
      // prefer breaking at a comma, else a space, else hard cut at MAX
      var cut = window_.lastIndexOf(',');
      if (cut > MAX * 0.5) cut = cut + 1; // keep the comma with the left piece
      else {
        cut = window_.lastIndexOf(' ');
        if (cut <= 0) cut = MAX;
      }
      out.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest.length) out.push(rest);
    return out.filter(Boolean);
  }

  function split(text) {
    if (!text || typeof text !== 'string') return [];

    var raw = [];
    var buf = '';

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      buf += ch;

      // newline is always a boundary
      if (ch === '\n') {
        if (buf.trim()) raw.push(buf.trim());
        buf = '';
        continue;
      }

      if (ch === '.' || ch === '!' || ch === '?') {
        // collapse runs of terminators (e.g. "?!", "...")
        while (i + 1 < text.length && /[.!?]/.test(text[i + 1])) {
          buf += text[++i];
        }
        var next = text[i + 1];
        // boundary only if followed by whitespace/end (avoids "3.14", "a.b")
        if (next === undefined || /\s/.test(next)) {
          // guard against abbreviations like "Dr." / "e.g."
          if (!ABBR.test(buf.trim())) {
            if (buf.trim()) raw.push(buf.trim());
            buf = '';
          }
        }
      }
    }
    if (buf.trim()) raw.push(buf.trim());

    // enforce length cap
    var out = [];
    for (var j = 0; j < raw.length; j++) {
      var pieces = hardSplit(raw[j]);
      for (var k = 0; k < pieces.length; k++) {
        if (pieces[k]) out.push(pieces[k]);
      }
    }
    return out;
  }

  VR.chunker = { split: split };
})();
