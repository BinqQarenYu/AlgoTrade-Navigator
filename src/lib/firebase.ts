
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration is read from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

// Check if all required config values are present and not placeholders
const hasValidConfig =
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.startsWith("TODO") &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId;

if (hasValidConfig) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (e) {
      console.error("Firebase initialization failed:", e);
    }
  } else {
    app = getApps()[0];
  }
} else {
  console.warn(
    "Firebase configuration is missing or incomplete. Please check your .env file. Auth features will be disabled."
  );
}

// Initialize Auth only if app was successfully initialized
if (app) {
  try {
    auth = getAuth(app);
  } catch (e) {
    console.error("Firebase auth initialization failed:", e);
    // Ensure auth is null if getAuth fails
    auth = null;
  }
}

// Export auth as a named export that can be null
export { auth };
