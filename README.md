# Voice Reader

Select any text on the web and listen to it read aloud with customizable voice, speed, and tone.

> 🌐 **Website & guides:** https://romkakn.github.io/voice-reader/
> 🇮🇱 **מדריך התקנה בעברית (לא-מתכנתים):** ראו [`INSTALL.md`](INSTALL.md) — כולל צילומי מסך וצעד-אחר-צעד.
> 🔒 **אבטחה ופרטיות:** ראו [`SECURITY.md`](SECURITY.md).

### 📚 Guides
- [Make Chrome read text out loud (free)](https://romkakn.github.io/voice-reader/read-text-aloud-chrome-free.html)
- [Free TTS Chrome extension — no account](https://romkakn.github.io/voice-reader/free-offline-tts-chrome-extension-no-account.html)
- [Install an unpacked extension (Developer mode)](https://romkakn.github.io/voice-reader/install-unpacked-chrome-extension-developer-mode.html)
- [Offline neural TTS with Piper + WebAssembly](https://romkakn.github.io/voice-reader/offline-neural-tts-browser-piper-webassembly.html)
- [Privacy-first TTS — zero data to the cloud](https://romkakn.github.io/voice-reader/privacy-tts-extension-no-data-cloud.html)
- [Word highlighting & focus mode](https://romkakn.github.io/voice-reader/tts-word-highlighting-focus-reading-extension.html)
- [Read-aloud for dyslexia & reading difficulty](https://romkakn.github.io/voice-reader/tts-extension-dyslexia-accessibility-reading-difficulty.html)
- [Free Speechify alternative for Chrome](https://romkakn.github.io/voice-reader/free-speechify-alternative-chrome-extension.html)

## Installation

1. Open `chrome://extensions/` in Chrome
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `voice-reader` folder
5. The extension appears in your Chrome toolbar

## Usage

1. Select text anywhere on any webpage
2. Right-click and choose:
   - **Read (Explanatory)** — Clear, measured voice for learning
   - **Read (Storytelling)** — Engaging, expressive voice for narrative
3. A floating control bar appears with:
   - **Play/Pause** button
   - **Speed slider** — Adjust playback speed on the fly
   - **Stop** button to cancel
4. Open extension options to customize voices, rate, and pitch per mode

## File Map

```
voice-reader/
├── manifest.json              # MV3 extension config
├── README.md                  # This file
├── src/
│   ├── background.js          # Service worker (context menu, messaging)
│   ├── content.js             # Page injection, message listener
│   ├── lib/
│   │   └── chunker.js         # Text → sentence chunks for TTS queueing
│   ├── tts/
│   │   ├── engine.js          # TTSEngine base class
│   │   └── webspeech.js       # WebSpeechEngine (Web Speech API impl)
│   └── ui/
│       ├── bar.js             # Bar controller class
│       └── bar.css            # Floating control bar styles
└── src/options/
    └── options.html           # Settings page (voice/rate/pitch per mode)
```

## Architecture

- **No build step** — all scripts load as classic globals via manifest
- **Window.VR namespace** — all modules attach to `window.VR` for cross-script access
- **Chrome storage** — syncs settings across devices (key: `vr_settings`)
- **Web Speech API** — uses native browser TTS with fallback voices

## Neural voices (Piper)

Voice Reader includes an optional neural TTS engine powered by [Piper](https://github.com/rhasspy/piper) running locally via WebAssembly — no cloud, no subscription.

**First-run download:** the selected voice model (~63–75 MB for medium quality) is fetched from HuggingFace on first use and cached in the browser's Origin Private File System (OPFS). Subsequent reads are fully offline and near-instant.

**Internet requirement:** only needed once per voice, for the initial model download. After that the extension works offline.

**Switching engine or voice:**
1. Click the Voice Reader icon → **Options** (or right-click → *Extension options*)
2. Under **Engine**, choose:
   - *Auto* — uses Piper neural TTS; falls back to system voices if model fails to load
   - *Neural (Piper)* — always use Piper; error shown if unavailable
   - *System* — use the browser's built-in Web Speech API voices (original behaviour)
3. Under **Neural voice**, pick a voice ID (e.g. `en_US-hfc_female-medium`, `en_US-lessac-high`)
4. Save — takes effect on the next read action
