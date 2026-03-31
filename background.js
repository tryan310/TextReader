chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    playbackState: {
      isSpeaking: false,
      isPaused: false,
      selectedText: '',
      updatedAt: Date.now()
    }
  });
});
