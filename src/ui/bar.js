// VR.Bar — floating control bar (futuristic-minimal glass pill).
// Fixed-position, draggable, position persisted. Inline settings panel.
window.VR = window.VR || {};

VR.Bar = (function () {
  const VOICES = [
    ['en_US-hfc_female-medium', 'HFC Female (US)'],
    ['en_US-hfc_male-medium', 'HFC Male (US)'],
    ['en_US-lessac-high', 'Lessac (US) · HQ'],
    ['en_US-amy-medium', 'Amy (US)'],
    ['en_GB-jenny_dioco-medium', 'Jenny (UK)'],
  ];

  function storageGet(area, key, cb) {
    try { chrome.storage[area].get(key, cb); } catch (e) { cb({}); }
  }
  function storageSet(area, obj) {
    try { chrome.storage[area].set(obj); } catch (e) {}
  }

  class Bar {
    constructor() {
      this._speed = 1.0;
      this._state = 'idle';
      this._mode = '';
      this._el = null;
      this._panel = null;
      this._drag = null;
      this._build();
      this._buildPanel();
      this._restorePos();
    }

    _build() {
      const el = document.createElement('div');
      el.className = 'vr-bar vr-bar--hidden';
      el.setAttribute('role', 'toolbar');
      el.setAttribute('aria-label', 'Voice Reader controls');
      el.innerHTML = `
        <span class="vr-bar__grip" title="Drag" aria-hidden="true"></span>
        <span class="vr-bar__mode"></span>
        <button class="vr-bar__btn vr-bar__play" type="button" title="Play / Pause" aria-label="Play or pause">
          <span class="vr-bar__ico vr-bar__ico--play"></span>
          <span class="vr-bar__ico vr-bar__ico--pause"><i></i><i></i></span>
          <span class="vr-bar__ico vr-bar__ico--spin"></span>
        </button>
        <div class="vr-bar__speed">
          <button class="vr-bar__btn vr-bar__sd" type="button" title="Slower" aria-label="Slower">&#8722;</button>
          <span class="vr-bar__speed-label">1.0x</span>
          <button class="vr-bar__btn vr-bar__su" type="button" title="Faster" aria-label="Faster">&#43;</button>
        </div>
        <button class="vr-bar__btn vr-bar__cc" type="button" title="Captions" aria-label="Toggle captions">CC</button>
        <button class="vr-bar__btn vr-bar__gear" type="button" title="Settings" aria-label="Settings">&#9881;</button>
        <span class="vr-bar__sep"></span>
        <button class="vr-bar__btn vr-bar__close" type="button" title="Close" aria-label="Close">&#10005;</button>
      `;
      document.body.appendChild(el);
      this._el = el;
      this._playBtn = el.querySelector('.vr-bar__play');
      this._speedLabel = el.querySelector('.vr-bar__speed-label');
      this._modeLabel = el.querySelector('.vr-bar__mode');

      this._playBtn.addEventListener('click', () => { if (this.onPlayPause) this.onPlayPause(); });
      el.querySelector('.vr-bar__sd').addEventListener('click', () => {
        const next = Math.max(0.5, Math.round((this._speed - 0.1) * 10) / 10);
        this.setSpeed(next); if (this.onSpeedDown) this.onSpeedDown(next);
      });
      el.querySelector('.vr-bar__su').addEventListener('click', () => {
        const next = Math.min(2.0, Math.round((this._speed + 0.1) * 10) / 10);
        this.setSpeed(next); if (this.onSpeedUp) this.onSpeedUp(next);
      });
      el.querySelector('.vr-bar__cc').addEventListener('click', () => { if (this.onToggleCaptions) this.onToggleCaptions(); });
      el.querySelector('.vr-bar__gear').addEventListener('click', () => this._togglePanel());
      el.querySelector('.vr-bar__close').addEventListener('click', () => { if (this.onClose) this.onClose(); });

      // Dragging — anywhere on the bar except interactive controls.
      el.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button, select')) return;
        this._dragStart(e);
      });
    }

    _buildPanel() {
      const p = document.createElement('div');
      p.className = 'vr-panel vr-panel--hidden';
      p.innerHTML = `
        <div class="vr-panel__row"><span>Engine</span>
          <select class="vr-p-engine">
            <option value="auto">Auto · neural → system</option>
            <option value="piper">Neural (Piper)</option>
            <option value="system">System voice</option>
          </select></div>
        <div class="vr-panel__row"><span>Voice</span>
          <select class="vr-p-voice">${VOICES.map(v => `<option value="${v[0]}">${v[1]}</option>`).join('')}</select></div>
        <div class="vr-panel__row"><span>Mode</span>
          <select class="vr-p-mode"><option value="explanatory">Explain</option><option value="storytelling">Story</option></select></div>
      `;
      this._el.appendChild(p);
      this._panel = p;

      p.querySelector('.vr-p-engine').addEventListener('change', (e) => this._saveSetting('engine', e.target.value));
      p.querySelector('.vr-p-voice').addEventListener('change', (e) => this._saveSetting('piper', { voiceId: e.target.value }));
      p.querySelector('.vr-p-mode').addEventListener('change', (e) => {
        const m = e.target.value;
        this.setMode(m === 'storytelling' ? 'Story' : 'Explain');
        if (this.onModeChange) this.onModeChange(m);
      });
    }

    _togglePanel() {
      const hidden = this._panel.classList.toggle('vr-panel--hidden');
      if (!hidden) this._loadPanel();
    }
    _loadPanel() {
      storageGet('sync', 'vr_settings', (r) => {
        const s = (r && r.vr_settings) || {};
        if (s.engine) this._panel.querySelector('.vr-p-engine').value = s.engine;
        if (s.piper && s.piper.voiceId) this._panel.querySelector('.vr-p-voice').value = s.piper.voiceId;
      });
    }
    _saveSetting(key, val) {
      storageGet('sync', 'vr_settings', (r) => {
        const s = Object.assign({}, r && r.vr_settings);
        s[key] = val;
        storageSet('sync', { vr_settings: s });
      });
    }

    // ---- dragging -------------------------------------------------------------
    _dragStart(e) {
      const r = this._el.getBoundingClientRect();
      this._drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      this._el.classList.add('vr-bar--dragging');
      const move = (ev) => this._dragMove(ev);
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        this._el.classList.remove('vr-bar--dragging');
        this._drag = null;
        this._savePos();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      e.preventDefault();
    }
    _dragMove(e) {
      if (!this._drag) return;
      const w = this._el.offsetWidth, h = this._el.offsetHeight, m = 6;
      let left = e.clientX - this._drag.dx;
      let top = e.clientY - this._drag.dy;
      left = Math.max(m, Math.min(left, window.innerWidth - w - m));
      top = Math.max(m, Math.min(top, window.innerHeight - h - m));
      this._applyPos({ left: left + 'px', top: top + 'px' });
    }
    _applyPos(pos) {
      const el = this._el;
      el.style.left = pos.left;
      el.style.top = pos.top;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.marginLeft = '0';
    }
    _savePos() {
      storageSet('local', { vr_barpos: { left: this._el.style.left, top: this._el.style.top } });
    }
    _restorePos() {
      storageGet('local', 'vr_barpos', (r) => {
        if (r && r.vr_barpos && r.vr_barpos.left) this._applyPos(r.vr_barpos);
      });
    }

    // ---- public API (positioning is fixed & user-controlled) ------------------
    show() {
      const el = this._el;
      if (!el.style.left) {
        // default: bottom-center, in viewport (position: fixed)
        const w = el.offsetWidth || 320;
        this._applyPos({
          left: Math.round((window.innerWidth - w) / 2) + 'px',
          top: Math.round(window.innerHeight - 80) + 'px',
        });
      }
      el.classList.remove('vr-bar--hidden');
    }
    hide() {
      this._el.classList.add('vr-bar--hidden');
      this._panel.classList.add('vr-panel--hidden');
    }
    setState(state) {
      this._state = state;
      const el = this._el;
      el.classList.toggle('vr-bar--playing', state === 'playing');
      el.classList.toggle('vr-bar--loading', state === 'loading');
      this._playBtn.title = state === 'playing' ? 'Pause' : (state === 'loading' ? 'Loading voice…' : 'Play');
    }
    setSpeed(r) {
      this._speed = Math.max(0.5, Math.min(2.0, r));
      this._speedLabel.textContent = this._speed.toFixed(1) + 'x';
    }
    setMode(modeLabel) {
      this._mode = modeLabel;
      this._modeLabel.textContent = modeLabel;
      const sel = this._panel && this._panel.querySelector('.vr-p-mode');
      if (sel) sel.value = modeLabel === 'Story' ? 'storytelling' : 'explanatory';
    }
    setCaptionsActive(on) {
      this._el.querySelector('.vr-bar__cc').classList.toggle('vr-bar__cc--on', !!on);
    }
  }

  return Bar;
})();
