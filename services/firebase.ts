
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

// Get Firebase config from environment variables
// @ts-ignore
const getFirebaseConfig = () => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    const env = import.meta.env;
    const inferredProjectId =
      (env.VITE_FIREBASE_AUTH_DOMAIN && String(env.VITE_FIREBASE_AUTH_DOMAIN).split('.')[0]) || "";

    return {
      apiKey: env.VITE_FIREBASE_API_KEY || "",
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
      // projectId is required for Firestore. Infer from authDomain if missing.
      projectId: env.VITE_FIREBASE_PROJECT_ID || inferredProjectId,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: env.VITE_FIREBASE_APP_ID || "",
      measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || ""
    };
  }
  // Fallback (should not be used in production)
  return {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
  };
};

const firebaseConfig = getFirebaseConfig();

// Validate Firebase config before initializing
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "") {
  const errorMsg = "Firebase API key is missing. Please set VITE_FIREBASE_API_KEY in your .env file.";
  console.error("❌", errorMsg);
  console.error("📝 See ENV_SETUP.md for instructions.");
  // Don't throw here - let it fail gracefully so the error boundary can catch it
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Ensure auth state persists across reloads (helps both redirect + normal sessions)
setPersistence(auth, browserLocalPersistence).catch((e) => {
  console.warn("Auth persistence setup failed; continuing with default persistence.", e);
});

// Initialize Firestore with robust persistence settings
// This prevents "client offline" errors by allowing the app to read from IDB while connecting
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  console.warn("Firestore persistence initialization failed, falling back to default memory cache.", e);
  dbInstance = getFirestore(app);
}

export const db = dbInstance;

// Initialize Google Provider
const googleProvider = new GoogleAuthProvider();

// Add custom parameters to ensure redirect works correctly
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    const currentUrl = window.location.origin + window.location.pathname;
    console.log('🚀 [Firebase] Initiating Google sign-in redirect...');
    console.log('   Current URL:', currentUrl);
    console.log('   Full URL:', window.location.href);
    console.log('   Auth domain:', auth.config.authDomain);
    console.log('   Project ID:', auth.config.projectId);
    
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // Local dev: use popup (more reliable + avoids redirect-param issues)
    if (isLocalhost) {
      console.log('🧪 [Firebase] Using popup auth flow on localhost');
      try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log('✅ [Firebase] Popup sign-in success:', result.user?.email);
        sessionStorage.removeItem('firebase:redirectUser');
        return result.user;
      } catch (popupError: any) {
        console.warn('⚠️ [Firebase] Popup sign-in failed on localhost, falling back to redirect:', popupError);
        // fall through to redirect flow below
      }
    }

    // Set a flag in sessionStorage to track that we're initiating a redirect
    sessionStorage.setItem('firebase:redirectUser', 'pending');

    // Production: use redirect-based auth to avoid COOP issues
    await signInWithRedirect(auth, googleProvider);
    console.log('✅ [Firebase] Redirect initiated successfully');
    console.log('   ⚠️ You should be redirected to Google now...');
    return null;
  } catch (error: any) {
    // Clear the flag if redirect fails
    sessionStorage.removeItem('firebase:redirectUser');
    console.error("❌ [Firebase] Error signing in with Google:", error);
    if (error.code) {
      console.error('   Error code:', error.code);
      if (error.code === 'auth/unauthorized-domain') {
        console.error('   ⚠️ CRITICAL: Domain not authorized in Firebase!');
        console.error('   Solution: Go to Firebase Console → Authentication → Settings → Authorized domains');
        console.error('   Add: eduos.chaimode.dev');
      } else if (error.code === 'auth/operation-not-allowed') {
        console.error('   ⚠️ Google sign-in method not enabled!');
        console.error('   Solution: Go to Firebase Console → Authentication → Sign-in method → Enable Google');
      }
    }
    if (error.message) {
      console.error('   Error message:', error.message);
    }
    throw error;
  }
};

// Helper to check for redirect result (call this on app load)
export const checkRedirectResult = async () => {
  try {
    console.log('🔍 [Firebase] Calling getRedirectResult...');
    console.log('   Current URL:', window.location.href);
    console.log('   Has query params:', window.location.search.length > 0);
    console.log('   Has hash:', window.location.hash.length > 0);
    
    // Check if there are any Firebase-related parameters in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasFirebaseParams = urlParams.has('__firebase_request_key') || 
                             hashParams.has('__firebase_request_key') ||
                             urlParams.has('apiKey') ||
                             hashParams.has('apiKey');
    
    console.log('   Firebase params in URL:', hasFirebaseParams);
    if (hasFirebaseParams) {
      console.log('   Query params:', window.location.search);
      console.log('   Hash:', window.location.hash);
    }
    
    const result = await getRedirectResult(auth);
    if (result) {
      console.log('✅ [Firebase] Redirect result found:', {
        user: result.user.email,
        providerId: result.providerId,
        operationType: result.operationType
      });
      return result.user;
    }
    console.log('ℹ️ [Firebase] No redirect result returned');
    if (!hasFirebaseParams) {
      console.log('   ⚠️ No Firebase parameters in URL - redirect may not have completed');
      console.log('   This could mean:');
      console.log('   1. The redirect URL is wrong');
      console.log('   2. Query parameters were stripped');
      console.log('   3. The redirect never happened');
    }
    return null;
  } catch (error: any) {
    console.error("❌ [Firebase] Error checking redirect result:", error);
    // Log specific error details
    if (error.code) {
      console.error('   Error code:', error.code);
      if (error.code === 'auth/unauthorized-domain') {
        console.error('   ⚠️ Domain not authorized! Add eduos.chaimode.dev to Firebase authorized domains.');
      }
    }
    if (error.message) {
      console.error('   Error message:', error.message);
    }
    return null;
  }
};

export const signInAsGuest = async () => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error("Error signing in anonymously", error);
    throw error;
  }
};
