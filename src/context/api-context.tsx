
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { ApiProfile } from '@/lib/types';

interface ApiContextType {
  profiles: ApiProfile[];
  activeProfile: ApiProfile | null;
  apiKey: string | null;
  secretKey: string | null;
  
  addProfile: (profile: ApiProfile) => void;
  updateProfile: (profile: ApiProfile) => void;
  deleteProfile: (profileId: string) => void;
  setActiveProfile: (profileId: string | null) => void;
  
  isConnected: boolean;
  setIsConnected: (status: boolean) => void;
  apiLimit: { used: number; limit: number };
  setApiLimit: (limit: { used: number; limit: number }) => void;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const [profiles, setProfiles] = useState<ApiProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [apiLimit, setApiLimit] = useState({ used: 0, limit: 1200 });

  // Load initial state from localStorage
  useEffect(() => {
    const storedProfiles = localStorage.getItem('apiProfiles');
    const storedActiveId = localStorage.getItem('activeProfileId');
    const storedIsConnected = localStorage.getItem('binance-isConnected') === 'true';

    const loadedProfiles = storedProfiles ? JSON.parse(storedProfiles) : [];
    setProfiles(loadedProfiles);
    
    if (storedActiveId && loadedProfiles.some((p: ApiProfile) => p.id === storedActiveId)) {
      setActiveProfileId(storedActiveId);
      // Only set connected if an active profile exists and it was connected before
      if (storedIsConnected) {
        setIsConnected(true);
      }
    } else {
        setIsConnected(false); // No active profile, must be disconnected
    }
  }, []);

  // Persist profiles to localStorage
  useEffect(() => {
    localStorage.setItem('apiProfiles', JSON.stringify(profiles));
  }, [profiles]);

  // Persist activeProfileId to localStorage and handle connection status
  const setActiveProfile = useCallback((profileId: string | null) => {
    if (profileId !== activeProfileId) {
      setIsConnected(false); // Disconnect when switching profiles
      setActiveProfileId(profileId);
      if (profileId) {
        localStorage.setItem('activeProfileId', profileId);
      } else {
        localStorage.removeItem('activeProfileId');
      }
    }
  }, [activeProfileId]);
  
  // Persist connection status
  useEffect(() => {
    localStorage.setItem('binance-isConnected', String(isConnected));
  }, [isConnected]);

  // --- Profile Management Functions ---
  const addProfile = (profile: ApiProfile) => {
    setProfiles(prev => [...prev, profile]);
  };

  const updateProfile = (updatedProfile: ApiProfile) => {
    setProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
  };

  const deleteProfile = (profileId: string) => {
    setProfiles(prev => prev.filter(p => p.id !== profileId));
    if (activeProfileId === profileId) {
      setActiveProfile(null);
    }
  };

  const activeProfile = profiles.find(p => p.id === activeProfileId) || null;

  return (
    <ApiContext.Provider value={{ 
      profiles, 
      activeProfile,
      apiKey: activeProfile?.apiKey || null,
      secretKey: activeProfile?.secretKey || null,
      addProfile,
      updateProfile,
      deleteProfile,
      setActiveProfile,
      isConnected,
      setIsConnected, 
      apiLimit, 
      setApiLimit 
    }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};
