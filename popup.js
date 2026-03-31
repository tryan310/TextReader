const statusEl = document.getElementById('status');
const readBtn = document.getElementById('readBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToActiveTab(message) {
  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    throw new Error('No active tab found.');
  }
  return chrome.tabs.sendMessage(tab.id, message);
}

async function refreshState() {
  try {
    const state = await sendToActiveTab({ type: 'TEXT_READER_GET_STATE' });
    renderState(state);
  } catch (error) {
    statusEl.textContent = 'Open a webpage, highlight text, and try again.';
    pauseBtn.textContent = '⏸ Pause';
  }
}

function renderState(state) {
  const hasSelection = Boolean(state?.selectedText);
  const isSpeaking = Boolean(state?.isSpeaking);
  const isPaused = Boolean(state?.isPaused);

  if (isSpeaking) {
    statusEl.textContent = isPaused
      ? 'Playback is paused.'
      : 'Reading highlighted text aloud.';
  } else if (hasSelection) {
    const preview = state.selectedText.length > 120
      ? state.selectedText.slice(0, 117) + '...'
      : state.selectedText;
    statusEl.textContent = `Selected: ${preview}`;
  } else {
    statusEl.textContent = 'Select text on a page, then press Read.';
  }

  pauseBtn.textContent = isPaused ? '▶ Play' : '⏸ Pause';
  pauseBtn.disabled = !isSpeaking;
  stopBtn.disabled = !isSpeaking && !isPaused;
}

readBtn.addEventListener('click', async () => {
  try {
    const result = await sendToActiveTab({ type: 'TEXT_READER_READ_SELECTION' });
    if (!result?.ok) {
      statusEl.textContent = result?.error || 'Select text on the page first.';
      return;
    }
    renderState(result);
  } catch (error) {
    statusEl.textContent = 'Could not read this page. Refresh the page and try again.';
  }
});

pauseBtn.addEventListener('click', async () => {
  try {
    const result = await sendToActiveTab({ type: 'TEXT_READER_TOGGLE_PAUSE' });
    renderState(result);
  } catch (error) {
    statusEl.textContent = 'Could not pause/play on this page.';
  }
});

stopBtn.addEventListener('click', async () => {
  try {
    const result = await sendToActiveTab({ type: 'TEXT_READER_STOP' });
    renderState(result);
  } catch (error) {
    statusEl.textContent = 'Could not stop playback on this page.';
  }
});

refreshState();
