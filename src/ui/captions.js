// VR.Captions — live caption screen. Shows the sentences being read, highlights
// the active one (and active word for the system engine), auto-scrolls, and lets
// the user click any sentence/word to replay from there. Draggable, resizable,
// with readability settings (font size / family / line spacing). Prefs persisted.
window.VR = window.VR || {};

VR.Captions = (function () {
  const FAMILIES = [
    ['system', 'Sans'],
    ['Georgia, "Times New Roman", serif', 'Serif'],
    ['"SF Mono", ui-monospace, Menlo, monospace', 'Mono'],
    ['"Comic Sans MS", "Comic Sans", cursive', 'Readable'],
  ];
  const DEFAULT_PREFS = { fontSize: 20, family: 'system', lineHeight: 1.7, focus: false };

  function sGet(area, key, cb) { try { chrome.storage[area].get(key, cb); } catch (e) { cb({}); } }
  function sSet(area, obj) { try { chrome.storage[area].set(obj); } catch (e) {} }

  class Captions {
    constructor() {
      this._el = null;
      this._body = null;
      this._lines = [];
      this._active = -1;
      this._words = [];
      this._wordEls = null;
      this._wordAt = -1;
      this._prefs = Object.assign({}, DEFAULT_PREFS);
      this._drag = null;
      this._build();
      this._restore();
    }

    _build() {
      const el = document.createElement('div');
      el.className = 'vr-cap vr-cap--hidden';
      el.setAttribute('role', 'region');
      el.setAttribute('aria-label', 'Live captions');
      el.innerHTML = `
        <div class="vr-cap__head">
          <span class="vr-cap__grip" aria-hidden="true"></span>
          <span class="vr-cap__title">Captions</span>
          <div class="vr-cap__tools">
            <button class="vr-cap__btn vr-cap__fs-down" type="button" title="Smaller text" aria-label="Smaller text">A&#8722;</button>
            <button class="vr-cap__btn vr-cap__fs-up" type="button" title="Larger text" aria-label="Larger text">A&#43;</button>
            <select class="vr-cap__family" title="Font">${FAMILIES.map(f => `<option value="${f[0].replace(/"/g, '&quot;')}">${f[1]}</option>`).join('')}</select>
            <button class="vr-cap__btn vr-cap__ls" type="button" title="Line spacing" aria-label="Line spacing">&#8693;</button>
            <button class="vr-cap__btn vr-cap__focus" type="button" title="Focus mode — show only the line being read" aria-label="Focus mode">&#9678;</button>
            <button class="vr-cap__btn vr-cap__close" type="button" title="Hide captions" aria-label="Hide captions">&#10005;</button>
          </div>
        </div>
        <div class="vr-cap__body" tabindex="0"></div>
        <div class="vr-cap__hint">Click any line to replay from there</div>
      `;
      document.body.appendChild(el);
      this._el = el;
      this._body = el.querySelector('.vr-cap__body');
      this._familySel = el.querySelector('.vr-cap__family');

      el.querySelector('.vr-cap__fs-down').addEventListener('click', () => this._bumpFont(-2));
      el.querySelector('.vr-cap__fs-up').addEventListener('click', () => this._bumpFont(2));
      el.querySelector('.vr-cap__ls').addEventListener('click', () => this._cycleLineHeight());
      el.querySelector('.vr-cap__focus').addEventListener('click', () => this.toggleFocus());
      this._familySel.addEventListener('change', (e) => { this._prefs.family = e.target.value; this._applyPrefs(); this._savePrefs(); });
      el.querySelector('.vr-cap__close').addEventListener('click', () => { this.hide(); if (this.onClose) this.onClose(); });

      // Click a line/word -> replay from that sentence.
      this._body.addEventListener('click', (e) => {
        const line = e.target.closest('.vr-cap__line');
        if (!line || !this.onReplay) return;
        this.onReplay(parseInt(line.dataset.i, 10));
      });

      // Drag by the header.
      el.querySelector('.vr-cap__head').addEventListener('pointerdown', (e) => {
        if (e.target.closest('button, select')) return;
        this._dragStart(e);
      });
    }

    // ---- content ----
    setChunks(chunks) {
      this._active = -1;
      this._lines = [];
      this._body.innerHTML = '';
      chunks.forEach((c, i) => {
        const d = document.createElement('div');
        d.className = 'vr-cap__line';
        d.dataset.i = i;
        d.textContent = c;
        this._body.appendChild(d);
        this._lines.push({ el: d, text: c });
      });
    }

    setActive(index) {
      if (index === this._active) {
        // re-arm word spans even if same line (e.g. replay of same chunk)
        if (!this._words.length) this._renderWords(this._lines[index]);
        return;
      }
      const prev = this._lines[this._active];
      if (prev) { prev.el.classList.remove('vr-cap__line--active'); prev.el.textContent = prev.text; }
      this._active = index;
      this._words = [];
      this._wordAt = -1;
      const cur = this._lines[index];
      if (!cur) return;
      cur.el.classList.add('vr-cap__line--active');
      this._renderWords(cur);
      // Scroll within the caption body only — never trigger page scroll.
      const body = this._body;
      if (body) {
        const lr = cur.el.getBoundingClientRect();
        const br = body.getBoundingClientRect();
        if (lr.top < br.top || lr.bottom > br.bottom) {
          body.scrollTop += (lr.top - br.top) - (br.height / 2) + (lr.height / 2);
        }
      }
    }

    // Tokenize the active line into per-word spans so words can be marked as read.
    // No glow pill — current word is shown via bold + color emphasis (CSS transition).
    _renderWords(cur) {
      if (!cur) return;
      const t = cur.text || '';
      if (!t.trim()) { this._wordEls = []; this._words = []; return; }
      const re = /\S+/g;
      let m, last = 0, html = '', wi = 0;
      this._words = [];
      while ((m = re.exec(t)) !== null) {
        html += esc(t.slice(last, m.index));
        // data-word holds the bold overlay text (rendered via ::after) so the
        // base word keeps a fixed weight/width — toggling "now" never reflows.
        html += '<span class="vr-cap__wd" data-w="' + wi + '" data-word="' + escAttr(m[0]) + '">' + esc(m[0]) + '</span>';
        this._words.push({ start: m.index, end: m.index + m[0].length });
        last = m.index + m[0].length;
        wi++;
      }
      html += esc(t.slice(last));
      cur.el.innerHTML = html;
      this._wordEls = cur.el.querySelectorAll('.vr-cap__wd');
    }

    wordCount() { return this._words ? this._words.length : 0; }

    // Advance the "current word" highlight. FORWARD-ONLY within an active line:
    // speech-boundary events (and the Piper timer) can fire slightly out of order,
    // so ignoring any index <= the current one stops the bold from flickering
    // back-and-forth between words. A new line / replay resets via setActive().
    markWord(idx) {
      if (!this._wordEls || !this._wordEls.length) return;
      const N = this._wordEls.length;
      if (idx < 0 || idx >= N) return;     // out of range — keep current
      if (idx <= this._wordAt) return;     // monotonic: never step backward

      if (this._wordAt >= 0) this._wordEls[this._wordAt].classList.remove('vr-cap__wd--now');
      for (let k = Math.max(0, this._wordAt); k < idx; k++) {
        this._wordEls[k].classList.add('vr-cap__wd--read');
        this._wordEls[k].classList.remove('vr-cap__wd--now');
      }
      const cur = this._wordEls[idx];
      cur.classList.add('vr-cap__wd--now');
      cur.classList.remove('vr-cap__wd--read');
      this._wordAt = idx;
    }

    // Map a character offset (system engine onboundary) to a word index.
    markWordByChar(charIndex) {
      if (typeof charIndex !== 'number' || !this._words) return;
      for (let k = 0; k < this._words.length; k++) {
        if (charIndex >= this._words[k].start && charIndex < this._words[k].end) { this.markWord(k); return; }
      }
    }
    // Back-compat alias.
    highlightWord(charIndex) { this.markWordByChar(charIndex); }

    // ---- focus mode ----
    toggleFocus() {
      this._prefs.focus = !this._prefs.focus;
      this._applyFocus();
      this._savePrefs();
    }
    _applyFocus() {
      this._el.classList.toggle('vr-cap--focus', !!this._prefs.focus);
      const b = this._el.querySelector('.vr-cap__focus');
      if (b) b.classList.toggle('vr-cap__btn--on', !!this._prefs.focus);
    }

    // ---- visibility ----
    show() { this._ensurePos(); this._el.classList.remove('vr-cap--hidden'); }
    hide() { this._el.classList.add('vr-cap--hidden'); }
    isVisible() { return !this._el.classList.contains('vr-cap--hidden'); }
    toggle() { this.isVisible() ? this.hide() : this.show(); return this.isVisible(); }

    // ---- readability prefs ----
    _bumpFont(d) {
      this._prefs.fontSize = Math.max(12, Math.min(40, this._prefs.fontSize + d));
      this._applyPrefs(); this._savePrefs();
    }
    _cycleLineHeight() {
      const steps = [1.4, 1.7, 2.1];
      const i = (steps.indexOf(this._prefs.lineHeight) + 1) % steps.length;
      this._prefs.lineHeight = steps[i];
      this._applyPrefs(); this._savePrefs();
    }
    _applyPrefs() {
      const fam = this._prefs.family === 'system'
        ? 'ui-sans-serif, system-ui, -apple-system, sans-serif' : this._prefs.family;
      this._body.style.fontSize = this._prefs.fontSize + 'px';
      this._body.style.fontFamily = fam;
      this._body.style.lineHeight = String(this._prefs.lineHeight);
      if (this._familySel) this._familySel.value = this._prefs.family;
      this._applyFocus();
    }
    _savePrefs() { sSet('local', { vr_caption_prefs: this._prefs }); }

    // ---- position / size persistence ----
    _ensurePos() {
      const el = this._el;
      if (!el.style.left) {
        const w = 420, h = 260;
        el.style.width = w + 'px';
        el.style.height = h + 'px';
        el.style.left = Math.round((window.innerWidth - w) / 2) + 'px';
        el.style.top = '90px';
      }
    }
    _dragStart(e) {
      const r = this._el.getBoundingClientRect();
      this._drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      this._el.classList.add('vr-cap--dragging');
      const move = (ev) => this._dragMove(ev);
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        this._el.classList.remove('vr-cap--dragging');
        this._drag = null; this._saveBox();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      e.preventDefault();
    }
    _dragMove(e) {
      if (!this._drag) return;
      const el = this._el, w = el.offsetWidth, h = el.offsetHeight, m = 6;
      let left = Math.max(m, Math.min(e.clientX - this._drag.dx, window.innerWidth - w - m));
      let top = Math.max(m, Math.min(e.clientY - this._drag.dy, window.innerHeight - h - m));
      el.style.left = left + 'px'; el.style.top = top + 'px';
    }
    _saveBox() {
      const el = this._el;
      sSet('local', { vr_caption_box: { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height } });
    }
    _restore() {
      sGet('local', ['vr_caption_prefs', 'vr_caption_box'], (r) => {
        if (r && r.vr_caption_prefs) this._prefs = Object.assign({}, DEFAULT_PREFS, r.vr_caption_prefs);
        this._applyPrefs();
        if (r && r.vr_caption_box && r.vr_caption_box.left) {
          const b = r.vr_caption_box, el = this._el;
          el.style.left = b.left; el.style.top = b.top;
          if (b.width) el.style.width = b.width;
          if (b.height) el.style.height = b.height;
        }
      });
      // Persist user resize (CSS `resize`) when the pointer leaves the panel.
      this._el.addEventListener('mouseup', () => this._saveBox());
    }
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(s) {
    return esc(s).replace(/"/g, '&quot;');
  }

  return Captions;
})();
