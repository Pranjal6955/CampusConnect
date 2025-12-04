import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth, initializeAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

// Firebase configuration
// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-auth-domain",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-storage-bucket",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "your-app-id",
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services with AsyncStorage persistence for Auth
// In Firebase v9+ for React Native, getAuth() automatically uses AsyncStorage
// if @react-native-async-storage/async-storage is installed (which it is)
let auth: Auth;

try {
  // Try to get existing auth instance
  auth = getAuth(app);
} catch {
  // Auth not initialized, initialize it
  // Firebase will automatically detect and use AsyncStorage in React Native
  try {
    auth = initializeAuth(app);
  } catch (initError: any) {
    // If already initialized, get the existing instance
    if (initError.code === 'auth/already-initialized') {
      auth = getAuth(app);
    } else {
      // Fallback: use getAuth
      auth = getAuth(app);
    }
  }
}

export { auth };
export const db: Firestore = getFirestore(app);
// Note: Storage is now handled by Cloudinary (see config/cloudinary.ts)
export default app;

