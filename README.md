# eduOS Repository

This repository contains multiple ChaiDev projects organized by branches.

## Branch Structure

### `main` branch
**eduOS Website** - The main learning platform
- Full React/TypeScript application
- Deployed to Cloudflare Pages at `eduos.chaimode.dev`
- Firebase integration for authentication and data
- AI-powered lesson generation

### `extension` branch
**ChaiDev Quick Access Chrome Extension**
- Chrome extension for quick access to all ChaiDev products
- One-click access to eduOS, Lunchbox AI, and chaimode
- Keyboard shortcuts for instant access

## Getting Started

### For eduOS Website (main branch)
```bash
git checkout main
npm install
npm run dev
```

### For Chrome Extension (extension branch)
```bash
git checkout extension
# Follow instructions in chaimode-extension/INSTALL.md
```

## Deployment

### eduOS to Cloudflare Pages
- Connected to Cloudflare Pages
- Auto-deploys on push to `main` branch
- Custom domain: `eduos.chaimode.dev`

### Extension
- Load unpacked in Chrome: `chrome://extensions/`
- See `chaimode-extension/INSTALL.md` for details

## Projects

- **eduOS**: AI-powered spatial learning platform
- **Lunchbox AI**: AI-powered productivity platform
- **chaimode**: Nutrition and recipe finding with AI

## Tech Stack

- React + TypeScript
- Vite
- Firebase (Auth + Firestore)
- Google Gemini API
- Framer Motion
- Tailwind CSS
