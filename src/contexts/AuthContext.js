"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { isEmailAllowed } from '@/lib/utils';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email, password) => {
    if (!isEmailAllowed(email)) {
      throw new Error('This email is not authorized to create an account. Please contact the administrator.');
    }
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const signIn = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    
    // Check if the Google account email is whitelisted
    if (!isEmailAllowed(result.user.email)) {
      // Delete the user account that was just created
      await result.user.delete();
      throw new Error('This email is not authorized to access this application. Please contact the administrator.');
    }
    
    return result;
  };

  const signOut = async () => {
    return firebaseSignOut(auth);
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
