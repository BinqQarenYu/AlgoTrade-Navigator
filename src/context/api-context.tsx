
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { ApiProfile } from '@/lib/types';

interface ApiContextType {
  profiles: ApiProfile[];
  activeProfile: ApiProfile | null;
  apiKey: string | null;
  secretKey: string | null;
  coingeckoApiKey: string | null;
  coinmarketcapApiKey: string | null;
  
  addProfile: (profile: ApiProfile) => void;
  updateProfile: (profile: ApiProfile) => void;
  deleteProfile: (profileId: string) => void;
  setActiveProfile: (profileId: string | null) => void;
  setCoingeckoApiKey: (key: string | null) => void;
  setCoinmarketcapApiKey: (key: string | null) => void;
  
  isConnected: boolean;
  setIsConnected: (status: boolean) => void;
  apiLimit: { used: number; limit: number };
  setApiLimit: (limit: { used: number; limit: number }) => void;
  rateLimitThreshold: number;
  setRateLimitThreshold: (limit: number) => void;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const [profiles, setProfiles] = useState<ApiProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [apiLimit, setApiLimit] = useState({ used: 0, limit: 1200 });
  const [rateLimitThreshold, setRateLimitThreshold] = useState<number>(1100);
  const [coingeckoApiKey, setCoingeckoApiKey] = useState<string | null>(null);
  const [coinmarketcapApiKey, setCoinmarketcapApiKey] = useState<string | null>(null);

  // Load initial state from localStorage
  useEffect(() => {
    const storedProfiles = localStorage.getItem('apiProfiles');
    const storedActiveId = localStorage.getItem('activeProfileId');
    const storedIsConnected = localStorage.getItem('binance-isConnected') === 'true';
    const storedThreshold = localStorage.getItem('rateLimitThreshold');
    const storedCgKey = localStorage.getItem('coingeckoApiKey');
    const storedCmcKey = localStorage.getItem('coinmarketcapApiKey');

    const loadedProfiles = storedProfiles ? JSON.parse(storedProfiles) : [];
    setProfiles(loadedProfiles);
    
    if (storedCgKey) {
        setCoingeckoApiKey(storedCgKey);
    }
    if (storedCmcKey) {
        setCoinmarketcapApiKey(storedCmcKey);
    }

    if (storedThreshold) {
      setRateLimitThreshold(parseInt(storedThreshold, 10));
    }
    
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

  // Persist coingecko key to localStorage
  useEffect(() => {
    if (coingeckoApiKey) {
      localStorage.setItem('coingeckoApiKey', coingeckoApiKey);
    } else {
      localStorage.removeItem('coingeckoApiKey');
    }
  }, [coingeckoApiKey]);

  useEffect(() => {
    if (coinmarketcapApiKey) {
      localStorage.setItem('coinmarketcapApiKey', coinmarketcapApiKey);
    } else {
      localStorage.removeItem('coinmarketcapApiKey');
    }
  }, [coinmarketcapApiKey]);


  // Persist threshold to localStorage
  useEffect(() => {
    localStorage.setItem('rateLimitThreshold', String(rateLimitThreshold));
  }, [rateLimitThreshold]);

  // Persist activeProfileId to localStorage and handle connection status
  const setActiveProfile = useCallback((profileId: string | null) => {
    if (profileId !== activeProfileId) {
      setIsConnected(false); // Disconnect when switching profiles
      setApiLimit({ used: 0, limit: 1200 }); // Reset limit on profile switch
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
    if (!isConnected) {
      setApiLimit({ used: 0, limit: 1200 }); // Reset usage when disconnected
    }
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
      coingeckoApiKey,
      coinmarketcapApiKey,
      addProfile,
      updateProfile,
      deleteProfile,
      setActiveProfile,
      setCoingeckoApiKey,
      setCoinmarketcapApiKey,
      isConnected,
      setIsConnected, 
      apiLimit, 
      setApiLimit,
      rateLimitThreshold,
      setRateLimitThreshold,
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
