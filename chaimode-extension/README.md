# ChaiDev Quick Access Chrome Extension

A Chrome extension for quick access to all ChaiDev products: eduOS, Lunchbox AI, and chaimode.

## Features

- 🚀 **Quick Access**: One-click access to all ChaiDev projects
- ⌨️ **Keyboard Shortcuts**: 
  - `Ctrl+Shift+E` (Mac: `Cmd+Shift+E`) - Open eduOS
  - `Ctrl+Shift+L` (Mac: `Cmd+Shift+L`) - Open Lunchbox AI
  - `Ctrl+Shift+C` (Mac: `Cmd+Shift+C`) - Open chaimode
- 📂 **Open All**: Open all projects at once
- 🎨 **Modern UI**: Clean, dark-themed interface matching ChaiDev branding

## Installation

### From Source (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chaimode-extension` folder
5. The extension icon should appear in your toolbar

### Create Icons (Optional)

You'll need to create icon files:
- `icons/icon16.png` (16x16)
- `icons/icon48.png` (48x48)
- `icons/icon128.png` (128x128)

Or use an online tool to generate them from a logo.

## Usage

1. Click the extension icon in your Chrome toolbar
2. Click any project card to open it in a new tab
3. Use keyboard shortcuts for even faster access
4. Click "Open All" to launch all projects at once

## Customization

Edit `popup.js` to change project URLs:
```javascript
const PROJECTS = {
  eduos: 'https://eduos.chaimode.dev',
  lunchbox: 'https://lunchbox.chaimode.dev',
  chaimode: 'https://chaimode.dev'
};
```

## Development

- `manifest.json` - Extension configuration
- `popup.html` - Extension popup UI
- `popup.css` - Styling
- `popup.js` - Popup functionality
- `background.js` - Background service worker

## Publishing (Optional)

To publish to Chrome Web Store:
1. Create a ZIP of the extension folder
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload and submit for review
