import React, { createContext, useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';

// Create the AuthContext
export const AuthContext = createContext();

// Create the AuthProvider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Handle user state changes
  function onAuthStateChanged(user) {
    setUser(user);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    // Subscribe to auth state changes
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    // Unsubscribe on unmount
    return subscriber;
  }, []);

  const value = {
    user,
    initializing,
    login: async (email, password) => {
      try {
        return await auth().signInWithEmailAndPassword(email, password);
      } catch (error) {
        throw error;
      }
    },
    register: async (email, password) => {
      try {
        return await auth().createUserWithEmailAndPassword(email, password);
      } catch (error) {
        throw error;
      }
    },
    logout: async () => {
      try {
        await auth().signOut();
      } catch (error) {
        throw error;
      }
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};