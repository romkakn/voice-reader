# Voice Reader

Free, open-source Chrome extension that reads selected text aloud with a natural neural voice — text to speech that runs offline, right in your browser.

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-blue.svg)](#installation)
[![No dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#)
[![Runs locally](https://img.shields.io/badge/runs-locally-orange.svg)](#neural-voices-piper)
[![Neural TTS: Piper](https://img.shields.io/badge/neural%20TTS-Piper-purple.svg)](#neural-voices-piper)

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

## Why Voice Reader?

You highlight a paragraph, right-click, and hear it. That's the whole idea. Voice Reader is a free text to speech Chrome extension that reads web pages aloud using a natural neural voice (Piper VITS) compiled to WebAssembly. The voice generation happens on your machine, so there's no API key, no account, and no subscription. After a one-time voice download (~63MB) it keeps working offline.

Most read-aloud tools ship your text to a server. This one doesn't. If you've looked at Speechify and balked at the paywall, Voice Reader is a free alternative that stays on your device. When a neural voice isn't loaded yet, it falls back to your browser's built-in Web Speech API so you're never stuck.

## Features

| Feature | What it does |
| --- | --- |
| Neural voice (Piper VITS) | Generates natural speech locally via WebAssembly — no cloud round-trip |
| Web Speech fallback | Uses the browser's built-in voices when no neural voice is loaded |
| Right-click to read | Select text, right-click, and listen to it on any page |
| Voice modes | Switch between Explanatory and Storytelling tone |
| Floating control bar | Draggable bar for play, pause, speed, and mode |
| Synced captions | Live captions with karaoke-style word highlighting |
| Focus mode | Surfaces one sentence at a time to cut distraction |
| Click-to-replay | Tap any word or sentence to hear it again |
| Adjustable speed | Slow down or speed up reading to taste |
| Offline after setup | Works with no connection once the voice is downloaded |

## Use cases

- Listen to long documentation instead of scrolling through it (Claude docs, Google Cloud, API references)
- Read Wikipedia articles aloud while you do something else
- Get through dense English articles when reading them is slow going
- Dyslexia-friendly reading help and general accessibility support
- Study by listening — let your ears carry the load when your eyes are tired
- Reduce reading fatigue on long sessions
- Multitask: cook, walk, or commute while a page reads itself to you

## Installation

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome (or Edge, Brave, Opera).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and pick the extension folder.
5. Pin Voice Reader to your toolbar.

New to unpacked extensions? The [step-by-step guide](https://romkakn.github.io/voice-reader/install-unpacked-chrome-extension-developer-mode.html) walks through it with screenshots. Hebrew speakers can follow [`INSTALL.md`](INSTALL.md).

## Usage

1. Select any text on a web page.
2. Right-click and choose **Read aloud** (or use the floating control bar).
3. Adjust speed, switch voice mode, or turn on focus mode from the bar.
4. Click a highlighted word to replay from there.

## Neural voices (Piper)

Voice Reader uses [Piper](https://github.com/rhasspy/piper) VITS models compiled to WebAssembly. The first time you pick a neural voice, the extension downloads the model once (~63MB) and caches it. After that, every word is synthesized on your device — nothing leaves the browser, and it works with no internet connection. If a neural voice isn't ready, the Web Speech API handles playback so reading never blocks.

## License

MIT — see [`LICENSE`](LICENSE). Zero runtime dependencies; everything is vendored.

## Keywords

free text to speech chrome extension, read web pages aloud, offline neural TTS, Piper VITS WebAssembly, read selected text aloud, no API key text to speech, Speechify alternative free, read aloud browser extension, accessibility reading tool, dyslexia reading help, screen reader alternative, privacy-first TTS, Manifest V3 extension, Edge Brave Opera text to speech, karaoke word highlighting, focus reading mode
