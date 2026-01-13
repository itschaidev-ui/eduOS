# Branch Structure Guide

This repository uses separate branches for different projects:

## Branches

### `main` branch
**eduOS Website**
- Contains the full eduOS React application
- Deployed to Cloudflare Pages
- Custom domain: `eduos.chaimode.dev`

### `extension` branch  
**Chrome Extension**
- Contains the ChaiDev Quick Access Chrome extension
- Located in `chaimode-extension/` directory
- Separate from website code

## Working with Branches

### Switch to website (main)
```bash
git checkout main
```

### Switch to extension
```bash
git checkout extension
```

### Push both branches to GitHub

**First time setup:**
```bash
# Push main branch (website)
git checkout main
git push -u origin main

# Push extension branch
git checkout extension
git push -u origin extension
```

**After authentication:**
You'll need to authenticate with GitHub. Options:

1. **Personal Access Token** (Recommended):
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Create a token with `repo` permissions
   - Use it as password when pushing

2. **SSH Key**:
   - Set up SSH key with GitHub
   - Change remote: `git remote set-url origin git@github.com:itschaidev-ui/eduOS.git`

## Cloudflare Pages Setup

When connecting to Cloudflare Pages:
- **Select branch**: `main` (for the website)
- **Build command**: `npm run build`
- **Output directory**: `dist`

The extension branch is separate and doesn't need Cloudflare deployment.
