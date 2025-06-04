"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, handleFirestoreOperation } from "../../lib/firebase";

const AuthContext = createContext({});

/**
 * Authentication context provider component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Auth context provider
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔧 Setting up auth state listener...");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log(
        "🔐 Auth state changed:",
        user ? "User logged in" : "User logged out",
        user?.email
      );

      if (user) {
        try {
          // Get additional user data from Firestore with retry logic
          const userData = await handleFirestoreOperation(async () => {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              return userDoc.data();
            } else {
              // Create a basic user document if it doesn't exist
              const basicUserData = {
                email: user.email,
                role: "user",
                createdAt: new Date(),
              };
              await setDoc(doc(db, "users", user.uid), basicUserData);
              console.log("📝 Created new user document in Firestore");
              return basicUserData;
            }
          });

          console.log("👤 User data loaded:", {
            uid: user.uid,
            email: user.email,
            ...userData,
          });

          setUser({
            uid: user.uid,
            email: user.email,
            ...userData,
          });
        } catch (error) {
          console.warn("Failed to fetch user data from Firestore:", error);
          // Set user with basic auth data if Firestore fails
          const basicUserData = {
            uid: user.uid,
            email: user.email,
            role: "user", // Default role
          };

          console.log("👤 Using basic user data:", basicUserData);
          setUser(basicUserData);
        }
        console.log("✅ Setting loading to false after user data is processed");
        setLoading(false);
      } else {
        console.log("👤 Clearing user data");
        setUser(null);
        console.log("✅ Setting loading to false as user is null");
        setLoading(false);
      }
    });

    return () => {
      console.log("🔧 Cleaning up auth state listener");
      unsubscribe();
    };
  }, []);

  /**
   * Sign in user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<void>}
   */
  const signIn = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Sign up new user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} userData - Additional user data
   * @returns {Promise<void>}
   */
  const signUp = async (email, password, userData = {}) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Save additional user data to Firestore with retry logic
      try {
        await handleFirestoreOperation(async () => {
          return await setDoc(doc(db, "users", result.user.uid), {
            email,
            role: "user",
            createdAt: new Date(),
            ...userData,
          });
        });
      } catch (firestoreError) {
        console.warn("Failed to save user data to Firestore:", firestoreError);
        // Authentication still succeeded, just user data wasn't saved
      }

      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out current user
   * @returns {Promise<void>}
   */
  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 * @returns {Object} Auth context value
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
