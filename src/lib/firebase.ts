// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

// Your web app's Firebase configuration is read from environment variables
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This function now safely gets the app instance, only initializing it if needed.
export function getFirebaseApp(): FirebaseApp | null {
  // A more robust check to ensure all required config values are present and are not placeholders.
  const hasValidConfig =
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes("YOUR_") &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId;

  if (!hasValidConfig) {
    console.warn(
      "Firebase configuration is missing or incomplete. Firebase features will be disabled."
    );
    return null;
  }
  
  if (getApps().length) {
    return getApps()[0];
  } else {
    try {
      return initializeApp(firebaseConfig);
    } catch (e) {
      console.error("Firebase initialization failed:", e);
      return null;
    }
  }
}
