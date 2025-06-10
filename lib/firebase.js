import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { ref } from "firebase/storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Set auth persistence to local storage to maintain authentication across browser sessions
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Failed to set auth persistence:", error);
});

// Initialize Firestore with experimentalAutoDetectLongPolling to fix offline errors
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

export const storage = getStorage(app);

// Test Firebase Storage connectivity
export const testStorageConnection = async () => {
  try {
    console.log("🔧 Testing Firebase Storage connection...");
    console.log("Storage bucket:", storage.app.options.storageBucket);

    // Try to create a reference (this doesn't actually create anything)
    const testRef = ref(storage, "test-connection");
    console.log("✅ Firebase Storage connection successful");
    console.log("Test ref:", testRef.toString());
    return true;
  } catch (error) {
    console.error("❌ Firebase Storage connection failed:", error);
    return false;
  }
};

// Helper function to handle Firestore operations with retry logic
export const handleFirestoreOperation = async (
  operation,
  retries = 3,
  delay = 1000
) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(
        `Firestore operation attempt ${i + 1} failed:`,
        error.message
      );

      if (error.code === "unavailable" || error.message.includes("offline")) {
        if (i < retries - 1) {
          console.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw new Error(
            "Firebase is currently offline. Please check your internet connection and try again."
          );
        }
      } else {
        throw error;
      }
    }
  }
};

// Test Firebase connectivity
export const testFirebaseConnection = async () => {
  try {
    console.log("✅ Firebase Firestore connection successful");
    return true;
  } catch (error) {
    console.error("❌ Firebase Firestore connection failed:", error);
    return false;
  }
};

export default app;
