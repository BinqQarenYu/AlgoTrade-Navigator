
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { ApiProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

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

  aiQuota: {
    used: number;
    limit: number;
    lastReset: string; // YYYY-MM-DD
  };
  setAiQuotaLimit: (newLimit: number) => void;
  canUseAi: () => boolean;
  consumeAiCredit: () => void;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ApiProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [apiLimit, setApiLimit] = useState({ used: 0, limit: 1200 });
  const [rateLimitThreshold, setRateLimitThreshold] = useState<number>(1100);
  const [coingeckoApiKey, setCoingeckoApiKey] = useState<string | null>(null);
  const [coinmarketcapApiKey, setCoinmarketcapApiKey] = useState<string | null>(null);
  const [aiQuota, setAiQuota] = useState({
    used: 0,
    limit: 49,
    lastReset: new Date().toISOString().split('T')[0],
  });

  // Load initial state from localStorage
  useEffect(() => {
    const storedProfiles = localStorage.getItem('apiProfiles');
    const storedActiveId = localStorage.getItem('activeProfileId');
    const storedIsConnected = localStorage.getItem('binance-isConnected') === 'true';
    const storedThreshold = localStorage.getItem('rateLimitThreshold');
    const storedCgKey = localStorage.getItem('coingeckoApiKey');
    const storedCmcKey = localStorage.getItem('coinmarketcapApiKey');
    const storedAiQuota = localStorage.getItem('aiQuota');

    if (storedAiQuota) {
        const parsed = JSON.parse(storedAiQuota);
        const today = new Date().toISOString().split('T')[0];
        // Reset if it's a new day
        if (parsed.lastReset !== today) {
            setAiQuota({ ...parsed, used: 0, lastReset: today });
        } else {
            setAiQuota(parsed);
        }
    }

    let loadedProfiles = storedProfiles ? JSON.parse(storedProfiles) : [];
    
    // Simple migration for old profiles without permissions
    loadedProfiles = loadedProfiles.map((p: any) => ({
        ...p,
        permissions: p.permissions || 'ReadOnly'
    }));

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

  // Persist AI Quota
  useEffect(() => {
    localStorage.setItem('aiQuota', JSON.stringify(aiQuota));
  }, [aiQuota]);

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

  // --- AI Quota Management ---
  const setAiQuotaLimit = (newLimit: number) => {
    setAiQuota(prev => ({ ...prev, limit: Math.max(1, Math.min(50, newLimit)) }));
  };

  const canUseAi = (): boolean => {
    let currentQuota = { ...aiQuota };
    const today = new Date().toISOString().split('T')[0];

    // Check if we need to reset the quota for a new day
    if (currentQuota.lastReset !== today) {
        const newQuota = { ...currentQuota, used: 0, lastReset: today };
        setAiQuota(newQuota);
        currentQuota = newQuota; // use the new value for the check below
    }

    if (currentQuota.used >= currentQuota.limit) {
      toast({
        title: "AI Daily Quota Limit Reached",
        description: `You have used ${currentQuota.used}/${currentQuota.limit} requests. The quota will reset tomorrow.`,
        variant: "destructive",
      });
      return false;
    }
    return true; // It's possible to use AI
  };
  
  const consumeAiCredit = () => {
    // This function assumes canUseAi() was already called and returned true.
    const today = new Date().toISOString().split('T')[0];
    setAiQuota(prev => {
        if (prev.lastReset !== today) {
            // This case should be handled by canUseAi, but as a fallback:
            return { ...prev, used: 1, lastReset: today };
        }
        if (prev.used < prev.limit) {
            return { ...prev, used: prev.used + 1 };
        }
        return prev; // Don't increment if limit is already reached
    });
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
      aiQuota,
      setAiQuotaLimit,
      canUseAi,
      consumeAiCredit,
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
