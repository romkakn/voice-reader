const DEFAULT_SETTINGS = {
  engine: 'auto',
  piper: { voiceId: 'en_US-hfc_female-medium' },
  explanatory: { voiceName: '', rate: 1.0, pitch: 1.0 },
  storytelling: { voiceName: '', rate: 0.9, pitch: 1.1 }
};

async function getVoices() {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
    } else {
      const handler = () => {
        speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(speechSynthesis.getVoices());
      };
      speechSynthesis.addEventListener('voiceschanged', handler);
    }
  });
}

async function populateVoices() {
  const voices = await getVoices();
  const voiceNames = voices.map(v => v.name);

  ['explanatory', 'storytelling'].forEach(mode => {
    const select = document.getElementById(`${mode}-voice`);
    select.innerHTML = '<option value="">Default System Voice</option>';
    voiceNames.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
  });
}

async function loadSettings() {
  const result = await chrome.storage.sync.get('vr_settings');
  const settings = result.vr_settings || DEFAULT_SETTINGS;

  const engine = settings.engine || DEFAULT_SETTINGS.engine;
  const piper = settings.piper || DEFAULT_SETTINGS.piper;

  document.getElementById('engine-select').value = engine;
  document.getElementById('piper-voice').value = piper.voiceId;
  updatePiperVoiceVisibility(engine);

  ['explanatory', 'storytelling'].forEach(mode => {
    const modeSettings = settings[mode] || DEFAULT_SETTINGS[mode];
    document.getElementById(`${mode}-voice`).value = modeSettings.voiceName;
    document.getElementById(`${mode}-rate`).value = modeSettings.rate;
    document.getElementById(`${mode}-rate-value`).textContent = modeSettings.rate.toFixed(1) + 'x';
    document.getElementById(`${mode}-pitch`).value = modeSettings.pitch;
    document.getElementById(`${mode}-pitch-value`).textContent = modeSettings.pitch.toFixed(1);
  });
}

function updatePiperVoiceVisibility(engine) {
  const piperGroup = document.getElementById('piper-voice-group');
  if (engine === 'piper' || engine === 'auto') {
    piperGroup.style.display = 'block';
  } else {
    piperGroup.style.display = 'none';
  }
}

function setupRangeListeners() {
  document.getElementById('engine-select').addEventListener('change', (e) => {
    updatePiperVoiceVisibility(e.target.value);
  });

  ['explanatory', 'storytelling'].forEach(mode => {
    const rateInput = document.getElementById(`${mode}-rate`);
    const rateValue = document.getElementById(`${mode}-rate-value`);
    const pitchInput = document.getElementById(`${mode}-pitch`);
    const pitchValue = document.getElementById(`${mode}-pitch-value`);

    rateInput.addEventListener('input', () => {
      rateValue.textContent = parseFloat(rateInput.value).toFixed(1) + 'x';
    });

    pitchInput.addEventListener('input', () => {
      pitchValue.textContent = parseFloat(pitchInput.value).toFixed(1);
    });
  });
}

async function saveSettings() {
  const settings = {
    engine: document.getElementById('engine-select').value,
    piper: { voiceId: document.getElementById('piper-voice').value },
    explanatory: {
      voiceName: document.getElementById('explanatory-voice').value,
      rate: parseFloat(document.getElementById('explanatory-rate').value),
      pitch: parseFloat(document.getElementById('explanatory-pitch').value)
    },
    storytelling: {
      voiceName: document.getElementById('storytelling-voice').value,
      rate: parseFloat(document.getElementById('storytelling-rate').value),
      pitch: parseFloat(document.getElementById('storytelling-pitch').value)
    }
  };

  await chrome.storage.sync.set({ vr_settings: settings });

  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Saved!';
  statusEl.classList.remove('hidden');
  setTimeout(() => {
    statusEl.classList.add('hidden');
  }, 2000);
}

document.addEventListener('DOMContentLoaded', async () => {
  await populateVoices();
  await loadSettings();
  setupRangeListeners();
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
});
