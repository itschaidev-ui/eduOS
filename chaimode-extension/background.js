// Background service worker for ChaiDev Quick Access extension

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('ChaiDev Quick Access extension installed');
    // Set default preferences
    chrome.storage.sync.set({
      preferences: {
        openInNewTab: true,
        showNotifications: true
      }
    });
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  const urls = {
    'open-eduos': 'https://eduos.chaimode.dev',
    'open-lunchbox': 'https://lunchbox.chaimode.dev',
    'open-chaimode': 'https://chaimode.dev'
  };

  const url = urls[command];
  if (url) {
    chrome.tabs.create({ url });
  }
});

// Optional: Check if projects are accessible
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkUrl') {
    fetch(request.url, { method: 'HEAD', mode: 'no-cors' })
      .then(() => sendResponse({ accessible: true }))
      .catch(() => sendResponse({ accessible: false }));
    return true; // Keep channel open for async response
  }
});
