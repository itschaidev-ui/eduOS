
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInAnonymously } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDhhfMzZwJIzXv5HUBEhWTJlzKSTZ48Tic",
  authDomain: "eduos-abcae.firebaseapp.com",
  projectId: "eduos-abcae",
  storageBucket: "eduos-abcae.firebasestorage.app",
  messagingSenderId: "975584235408",
  appId: "1:975584235408:web:68263c2aa168de4e09ed15",
  measurementId: "G-DBPK9SC3Y3"
};

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
