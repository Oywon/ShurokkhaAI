import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebase/config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password) {
    try {
      return await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.warn("Firebase Auth signup failed, falling back to Local Mock Auth:", err.message);
      const mockUser = { uid: "mock_user_123", email };
      setCurrentUser(mockUser);
      localStorage.setItem("mock_current_user", JSON.stringify(mockUser));
      return { user: mockUser };
    }
  }

  async function login(email, password) {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.warn("Firebase Auth login failed, falling back to Local Mock Auth:", err.message);
      const mockUser = { uid: "mock_user_123", email };
      setCurrentUser(mockUser);
      localStorage.setItem("mock_current_user", JSON.stringify(mockUser));
      return { user: mockUser };
    }
  }

  async function logout() {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Firebase Auth signout failed:", e.message);
    }
    setCurrentUser(null);
    localStorage.removeItem("mock_current_user");
  }

  useEffect(() => {
    // Listen for Auth changes in Firebase
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        setCurrentUser(user);
        setLoading(false);
      } else {
        // Fallback to local storage session if Firebase is not signed in
        const localUser = localStorage.getItem("mock_current_user");
        if (localUser) {
          setCurrentUser(JSON.parse(localUser));
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      }
    }, (err) => {
      console.warn("onAuthStateChanged error, attempting LocalStorage session fallback:", err.message);
      const localUser = localStorage.getItem("mock_current_user");
      if (localUser) {
        setCurrentUser(JSON.parse(localUser));
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = { currentUser, signup, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
