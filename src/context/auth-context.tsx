
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, type User, getAuth, type Auth } from 'firebase/auth';
import { app } from '@/lib/firebase'; // Import the initialized app
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<Auth | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    // Initialize auth only on the client side, and only if the app was successfully configured.
    if (app) {
      const authInstance = getAuth(app);
      setAuth(authInstance);
      const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // If app is null (due to misconfiguration), stop loading and treat as logged out.
      setLoading(false);
      setUser(null);
      setAuth(null);
    }
  }, []);


  const signInWithGoogle = async () => {
    if (!auth) {
        toast({ title: "Auth Not Configured", description: "Firebase is not configured correctly. Please check your API keys in the .env file.", variant: "destructive" });
        return;
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Signed In", description: "You have successfully signed in." });
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      toast({ title: "Sign-In Failed", description: error.message, variant: "destructive" });
    }
  };

  const logOut = async () => {
    if (!auth) {
        toast({ title: "Auth Not Configured", description: "Firebase is not configured correctly.", variant: "destructive" });
        return;
    }
    try {
      await signOut(auth);
      toast({ title: "Signed Out", description: "You have been signed out." });
    } catch (error: any) {
      console.error("Sign-Out Error:", error);
      toast({ title: "Sign-Out Failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
