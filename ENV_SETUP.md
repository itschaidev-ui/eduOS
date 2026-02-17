# Environment Variables Setup

## ⚠️ IMPORTANT: API Keys Security

Your API keys have been moved to environment variables for security. You **must** create a `.env` file in the root directory.

## Quick Setup

1. **Create `.env` file** in the root directory (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. **Add your API keys** to `.env`:
   ```env
   # Gemini API Keys (comma-separated for multiple keys)
   VITE_GEMINI_API_KEYS=your_key_1,your_key_2,your_key_3

   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
   ```

3. **Restart your dev server** after creating `.env`:
   ```bash
   npm run dev
   ```

## For Cloudflare Pages Deployment

Add these environment variables in Cloudflare Pages dashboard:

1. Go to your project → **Settings** → **Environment Variables**
2. Add each variable with the `VITE_` prefix
3. For `VITE_GEMINI_API_KEYS`, use comma-separated values: `key1,key2,key3`

## Firebase Auth: Fix "Sign-in doesn't work" on Deployed Site

If sign-in works locally but **not** on your deployed URL (e.g. `https://eduos-abcae.web.app`), add the deployment domain to Firebase:

1. Open [Firebase Console](https://console.firebase.google.com) → your project (**eduos-abcae**).
2. Go to **Authentication** → **Settings** (or **Sign-in method** tab) → **Authorized domains**.
3. Click **Add domain** and add:
   - `eduos-abcae.web.app` (Firebase Hosting default)
   - `eduos-abcae.firebaseapp.com` (if not already listed)
   - Any custom domain you use (e.g. `eduos.chaimode.dev`).
4. Save. Try sign-in again on the deployed site.

Without this, Firebase blocks auth with `auth/unauthorized-domain`. The browser console will show the exact domain to add.

## Security Notes

- ✅ `.env` is in `.gitignore` - it will **never** be committed
- ✅ `.env.example` is a template (safe to commit)
- ⚠️ **Never commit `.env` to Git**
- ⚠️ If you already pushed keys, **rotate them immediately** in Google Cloud Console
