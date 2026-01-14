# Cloudflare Pages Deployment Guide

## Quick Deploy to eduos.chaimode.dev

### Option 1: Cloudflare Dashboard (Recommended)

1. **Go to Cloudflare Dashboard**
   - Navigate to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Click on **Pages** → **Create a project**

2. **Connect Repository**
   - Connect your GitHub/GitLab/Bitbucket repository
   - Select the `eduos` repository

3. **Build Settings**
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Deploy command**: **LEAVE EMPTY** (Cloudflare auto-deploys `dist` folder)
     - If field is required, use: `echo "Deployment handled by Cloudflare"`
   - **Root directory**: `/` (leave empty)
   - **Node version**: `18` or `20`
   
   **Important**: For Git-connected Pages projects, you do NOT need a deploy command. Cloudflare automatically deploys the output directory after the build completes.

4. **Environment Variables** (CRITICAL)
   - Go to **Settings** → **Environment variables**
   - You MUST add your variables with the `VITE_` prefix:
     - `VITE_GEMINI_API_KEYS`
     - `VITE_FIREBASE_API_KEY`
     - ...and all others from your `.env` file
   - If you skip this, the app will not have API access!

5. **Custom Domain**
   - Go to **Custom domains** in your Pages project
   - Click **Set up a custom domain**
   - Enter: `eduos.chaimode.dev`
   - Cloudflare will automatically configure DNS and SSL

6. **Deploy**
   - Click **Save and Deploy**
   - Your site will be live at `eduos.chaimode.dev` in a few minutes!

### Option 2: Wrangler CLI (Manual)

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build the project
npm run build

# Deploy to Cloudflare Pages
npm run deploy:cloudflare
```

### DNS Configuration

If `chaimode.dev` is already in Cloudflare:
- Cloudflare will automatically create the CNAME record
- SSL/TLS will be automatically configured

If not:
1. Add `chaimode.dev` to Cloudflare
2. Add CNAME record:
   - **Name**: `eduos`
   - **Target**: `your-pages-project.pages.dev`
   - **Proxy**: Enabled (orange cloud)

### Environment Variables

For production, set these in Cloudflare Pages (Settings -> Environment variables):
- `VITE_GEMINI_API_KEYS`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- ...etc (all variables from .env)

### Build Commands Reference

- `npm run build` - Build for production
- `npm run deploy:cloudflare` - Build and deploy to Cloudflare
- `npm run deploy:cloudflare:prod` - Deploy to production branch

### Troubleshooting

- **404 errors on routes**: The `_redirects` file in `public/` handles SPA routing
- **Build fails**: Check Node version (use 18 or 20)
- **Domain not working**: Verify DNS records in Cloudflare

### Notes

- Cloudflare Pages automatically handles:
  - SSL/HTTPS certificates
  - Global CDN distribution
  - Automatic deployments on git push
  - Preview deployments for pull requests
