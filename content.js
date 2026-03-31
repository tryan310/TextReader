// Text Reader content script
// Injects a lightweight selection toolbar and coordinates playback with the popup.

const host = document.createElement('div');
host.id = 'text-reader-ext';
host.style.cssText = 'position:absolute;top:0;left:0;z-index:2147483647;pointer-events:none;';
document.documentElement.appendChild(host);

const shadow = host.attachShadow({ mode: 'closed' });

const style = document.createElement('style');
style.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .toolbar {
    position: fixed;
    display: none;
    align-items: center;
    gap: 8px;
    background: #1a1a2e;
    border-radius: 10px;
    padding: 8px 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.35);
    font-family: system-ui, -apple-system, sans-serif;
    pointer-events: auto;
    white-space: nowrap;
  }

  button {
    padding: 6px 12px;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
    line-height: 1.2;
  }

  .read-btn { background: #1a73e8; }
  .read-btn:hover { background: #1557b0; }

  .pause-btn { background: #555; }
  .pause-btn:hover { background: #666; }

  .stop-btn { background: #c0392b; }
  .stop-btn:hover { background: #a5311f; }
`;
shadow.appendChild(style);

const toolbar = document.createElement('div');
toolbar.className = 'toolbar';
shadow.appendChild(toolbar);

const readBtn = document.createElement('button');
readBtn.className = 'read-btn';
readBtn.textContent = '🔊 Read';
toolbar.appendChild(readBtn);

const pauseBtn = document.createElement('button');
pauseBtn.className = 'pause-btn';
pauseBtn.style.display = 'none';
toolbar.appendChild(pauseBtn);

const stopBtn = document.createElement('button');
stopBtn.className = 'stop-btn';
stopBtn.textContent = '⏹ Stop';
stopBtn.style.display = 'none';
toolbar.appendChild(stopBtn);

let isPaused = false;
let isSpeaking = false;
let selectedText = '';
let currentUtterance = null;
let keepAliveTimer = null;

function positionToolbar() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  toolbar.style.top = (rect.bottom + 8) + 'px';
  toolbar.style.left = Math.max(4, rect.left) + 'px';
}

function showReadyState() {
  readBtn.style.display = 'inline-block';
  pauseBtn.style.display = 'none';
  stopBtn.style.display = 'none';
}

function showPlayingState() {
  readBtn.style.display = 'none';
  pauseBtn.style.display = 'inline-block';
  pauseBtn.textContent = isPaused ? '▶ Play' : '⏸ Pause';
  stopBtn.style.display = 'inline-block';
}

function clearKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

function startKeepAlive() {
  clearKeepAlive();
  keepAliveTimer = setInterval(() => {
    if (!isSpeaking || isPaused) return;
    if (!window.speechSynthesis.speaking) {
      clearKeepAlive();
      return;
    }
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
  }, 10000);
}

function syncPlaybackState() {
  chrome.storage.local.set({
    playbackState: {
      isSpeaking,
      isPaused,
      selectedText,
      updatedAt: Date.now()
    }
  });
}

function finalizeSpeech() {
  clearKeepAlive();
  currentUtterance = null;
  isSpeaking = false;
  isPaused = false;
  showReadyState();
  syncPlaybackState();
}

function speak(text) {
  if (!text) return;

  clearKeepAlive();
  window.speechSynthesis.cancel();

  selectedText = text;
  isPaused = false;
  isSpeaking = true;

  const utt = new SpeechSynthesisUtterance(text);
  currentUtterance = utt;
  utt.rate = 1;
  utt.pitch = 1;
  utt.lang = 'en-US';

  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'));
  if (preferred) utt.voice = preferred;

  utt.onstart = () => {
    isSpeaking = true;
    isPaused = false;
    showPlayingState();
    startKeepAlive();
    syncPlaybackState();
  };

  utt.onend = () => {
    if (currentUtterance !== utt) return;
    finalizeSpeech();
  };

  utt.onerror = () => {
    if (currentUtterance !== utt) return;
    finalizeSpeech();
  };

  window.speechSynthesis.speak(utt);
  showPlayingState();
  syncPlaybackState();
}

function stopSpeech() {
  clearKeepAlive();
  currentUtterance = null;
  window.speechSynthesis.cancel();
  isSpeaking = false;
  isPaused = false;
  showReadyState();
  syncPlaybackState();
}

function togglePause() {
  if (!isSpeaking && !window.speechSynthesis.speaking) return;

  if (isPaused) {
    window.speechSynthesis.resume();
    isPaused = false;
  } else {
    window.speechSynthesis.pause();
    isPaused = true;
  }

  showPlayingState();
  syncPlaybackState();
}

document.addEventListener('mouseup', (e) => {
  if (host.contains(e.target)) return;

  setTimeout(() => {
    const sel = window.getSelection().toString().trim();
    if (sel.length > 0) {
      selectedText = sel;
      positionToolbar();
      toolbar.style.display = 'flex';
      showReadyState();
      syncPlaybackState();
    }
  }, 10);
});

document.addEventListener('mousedown', (e) => {
  if (host.contains(e.target)) return;
  const path = e.composedPath();
  if (path.includes(toolbar)) return;

  if (isSpeaking || isPaused) {
    toolbar.style.display = 'flex';
    showPlayingState();
    return;
  }

  toolbar.style.display = 'none';
});

toolbar.addEventListener('mousedown', (e) => e.stopPropagation());
toolbar.addEventListener('mouseup', (e) => e.stopPropagation());
toolbar.addEventListener('click', (e) => e.stopPropagation());

readBtn.addEventListener('click', () => {
  if (selectedText) speak(selectedText);
});

pauseBtn.addEventListener('click', () => {
  togglePause();
});

stopBtn.addEventListener('click', () => {
  stopSpeech();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === 'TEXT_READER_GET_STATE') {
    sendResponse({ isSpeaking, isPaused, selectedText });
    return true;
  }

  if (message.type === 'TEXT_READER_READ_SELECTION') {
    if (!selectedText) {
      selectedText = window.getSelection().toString().trim();
    }
    if (selectedText) {
      speak(selectedText);
      sendResponse({ ok: true, isSpeaking, isPaused, selectedText });
    } else {
      sendResponse({ ok: false, error: 'No selected text on this page.' });
    }
    return true;
  }

  if (message.type === 'TEXT_READER_TOGGLE_PAUSE') {
    togglePause();
    sendResponse({ ok: true, isSpeaking, isPaused, selectedText });
    return true;
  }

  if (message.type === 'TEXT_READER_STOP') {
    stopSpeech();
    sendResponse({ ok: true, isSpeaking, isPaused, selectedText });
    return true;
  }
});

window.speechSynthesis.getVoices();
window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
syncPlaybackState();
