
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
if (!firebaseConfig.apiKey) {
  console.error("❌ Firebase API key missing. Set VITE_FIREBASE_API_KEY in your .env.");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Ensure auth persists across reloads
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

export const signInWithGoogle = async () => {
  try {
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // Local dev: popup (more reliable)
    if (isLocalhost) {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }

    // Production: redirect to avoid popup COOP issues
    await signInWithRedirect(auth, googleProvider);
    return null;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Helper to check for redirect result (call this on app load)
export const checkRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      return result.user;
    }
    return null;
  } catch (error) {
    console.error("Error checking redirect result", error);
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
