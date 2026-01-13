
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInAnonymously } from "firebase/auth";
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
    return {
      apiKey: env.VITE_FIREBASE_API_KEY || "",
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
      projectId: env.VITE_FIREBASE_PROJECT_ID || "",
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

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
    // Use redirect-based auth to avoid COOP (Cross-Origin-Opener-Policy) issues
    // Redirect is more reliable and doesn't have popup closing problems
    await signInWithRedirect(auth, googleProvider);
    // Return null - the redirect will happen and user will come back
    // The redirect result will be handled in App.tsx on mount
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
