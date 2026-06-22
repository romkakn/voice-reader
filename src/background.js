const DEFAULT_SETTINGS = {
  explanatory:  { voiceName: "", rate: 1.0, pitch: 1.0 },
  storytelling: { voiceName: "", rate: 0.9, pitch: 1.1 },
  engine: 'auto',
  piper: { voiceId: 'en_US-hfc_female-medium' }
};

// Track the tab that last triggered a vr-tts message so we can relay state back.
let activeTtsTabId = null;
let offscreenCreating = false;

async function ensureOffscreen() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (existingContexts.length > 0) return;
  if (offscreenCreating) {
    // Wait for the pending creation to finish
    await new Promise(resolve => {
      const interval = setInterval(async () => {
        const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
        if (contexts.length > 0) { clearInterval(interval); resolve(); }
      }, 100);
    });
    return;
  }
  offscreenCreating = true;
  try {
    await chrome.offscreen.createDocument({
      url: 'src/offscreen/offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Neural TTS playback'
    });
  } finally {
    offscreenCreating = false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('vr_settings', (result) => {
    if (!result.vr_settings) {
      chrome.storage.sync.set({ vr_settings: DEFAULT_SETTINGS });
    }
  });

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'vr-parent',
      title: 'Voice Read',
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'vr-explanatory',
      parentId: 'vr-parent',
      title: 'Explanatory',
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'vr-storytelling',
      parentId: 'vr-parent',
      title: 'Storytelling',
      contexts: ['selection']
    });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'vr-tts') {
    // Ignore the copy we re-broadcast to the offscreen document (prevents a loop).
    if (message.target === 'offscreen') return false;
    // From content script -> relay to offscreen
    if (sender.tab) activeTtsTabId = sender.tab.id;
    ensureOffscreen().then(() => {
      chrome.runtime.sendMessage({ ...message, target: 'offscreen' });
    });
    return false;
  }

  if (message.type === 'vr-tts-state') {
    // From offscreen -> relay to content script in active tab
    if (activeTtsTabId !== null) {
      chrome.tabs.sendMessage(activeTtsTabId, message);
    }
    return false;
  }
});

// Content-script files, in load order. Used to inject on demand into tabs that
// were already open before the extension was (re)loaded — otherwise the context
// menu fires but no content script is listening and nothing appears.
const CONTENT_FILES = [
  'src/lib/chunker.js',
  'src/tts/engine.js',
  'src/tts/webspeech.js',
  'src/tts/piper.js',
  'src/ui/bar.js',
  'src/ui/captions.js',
  'src/content.js'
];

// Must match VR_BUILD in content.js. Bump together on content-script changes.
const CURRENT_BUILD = 17;

async function ensureContentInjected(tabId) {
  // Ask the tab which build (if any) is running. Missing or stale -> inject latest.
  let build = 0;
  try {
    const r = await chrome.tabs.sendMessage(tabId, { type: 'vr-ping' });
    if (r && typeof r.build === 'number') build = r.build;
  } catch (e) {
    build = 0; // no content script present
  }
  if (build >= CURRENT_BUILD) return; // up to date

  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['src/ui/bar.css', 'src/ui/captions.css'] });
  } catch (e) { /* CSS may already be present; ignore */ }
  await chrome.scripting.executeScript({ target: { tabId }, files: CONTENT_FILES });
  console.debug('[VoiceReader] injected build', CURRENT_BUILD, 'into tab', tabId, '(was', build + ')');
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const modeMap = {
    'vr-explanatory': 'explanatory',
    'vr-storytelling': 'storytelling'
  };
  const mode = modeMap[info.menuItemId];
  if (!mode || !info.selectionText || !tab) return;

  const payload = { type: 'vr-speak', text: info.selectionText, mode };
  try {
    await ensureContentInjected(tab.id);
    await chrome.tabs.sendMessage(tab.id, payload);
  } catch (e) {
    console.error('[VoiceReader] could not deliver vr-speak:', e);
  }
});
