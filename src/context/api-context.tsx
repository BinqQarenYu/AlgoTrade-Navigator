'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import type { ApiProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { loadSecureSession, saveSecureSession } from '@/app/actions/secure-storage';
import { getAccountBalance } from '@/lib/binance-service';

interface ApiContextType {
  profiles: ApiProfile[];
  activeProfile: ApiProfile | null;
  // These are now for display/selection only, not direct use
  apiKey: string | null;
  secretKey: string | null;
  coingeckoApiKey: string | null;
  coinmarketcapApiKey: string | null;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  geminiApiKey: string | null;
  
  addProfile: (profile: ApiProfile) => void;
  updateProfile: (profile: ApiProfile) => void;
  deleteProfile: (profileId: string) => void;
  setActiveProfile: (profileId: string | null) => void;
  setCoingeckoApiKey: (key: string | null) => void;
  setCoinmarketcapApiKey: (key: string | null) => void;
  setTelegramBotToken: (token: string | null) => void;
  setTelegramChatId: (id: string | null) => void;
  setGeminiApiKey: (key: string | null) => void;
  
  isConnected: boolean;
  setIsConnected: (status: boolean) => void;
  apiLimit: { used: number; limit: number };
  setApiLimit: (limit: { used: number; limit: number }) => void;
  rateLimitThreshold: number;
  setRateLimitThreshold: (limit: number) => void;

  aiQuota: {
    used: number;
    limit: number;
    lastReset: string;
  };
  setAiQuotaLimit: (newLimit: number) => void;
  canUseAi: () => boolean;
  consumeAiCredit: () => void;
  
  // New connection test function
  testConnection: () => Promise<boolean>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [profiles, setProfiles] = useState<ApiProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [apiLimit, setApiLimit] = useState({ used: 0, limit: 1200 });
  const [rateLimitThreshold, setRateLimitThreshold] = useState<number>(1100);
  const [coingeckoApiKey, setCoingeckoApiKey] = useState<string | null>(null);
  const [coinmarketcapApiKey, setCoinmarketcapApiKey] = useState<string | null>(null);
  const [telegramBotToken, setTelegramBotToken] = useState<string | null>(null);
  const [telegramChatId, setTelegramChatId] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);
  const [aiQuota, setAiQuota] = useState({
    used: 0,
    limit: 49,
    lastReset: new Date().toISOString().split('T')[0],
  });

  // Load initial state from secure storage
  useEffect(() => {
    async function loadInitialState() {
      const session = await loadSecureSession();

      const storedProfiles = session.apiProfiles ? JSON.stringify(session.apiProfiles) : null;
      const storedActiveId = session.activeProfileId || null;
      const storedIsConnected = session.binanceIsConnected === 'true';
      const storedThreshold = session.rateLimitThreshold;
      const storedCgKey = session.coingeckoApiKey || null;
      const storedCmcKey = session.coinmarketcapApiKey || null;
      const storedGeminiKey = session.geminiApiKey || null;
      const storedAiQuota = session.aiQuota || null;
      const storedTgToken = session.telegramBotToken || null;
      const storedTgChatId = session.telegramChatId || null;

      if (storedTgToken) setTelegramBotToken(storedTgToken);
      if (storedTgChatId) setTelegramChatId(storedTgChatId);
      if (storedGeminiKey) setGeminiApiKey(storedGeminiKey);

      if (storedAiQuota) {
          const parsed = JSON.parse(storedAiQuota);
          const today = new Date().toISOString().split('T')[0];
          if (parsed.lastReset !== today) {
              setAiQuota({ ...parsed, used: 0, lastReset: today });
          } else {
              setAiQuota(parsed);
          }
      }

      let loadedProfiles = storedProfiles ? JSON.parse(storedProfiles) : [];
      loadedProfiles = loadedProfiles.map((p: any) => ({
          ...p,
          permissions: p.permissions || 'ReadOnly'
      }));

      setProfiles(loadedProfiles);

      if (storedCgKey) setCoingeckoApiKey(storedCgKey);
      if (storedCmcKey) setCoinmarketcapApiKey(storedCmcKey);
      if (storedThreshold) setRateLimitThreshold(parseInt(storedThreshold, 10));

      if (storedActiveId && loadedProfiles.some((p: ApiProfile) => p.id === storedActiveId)) {
        setActiveProfileId(storedActiveId);
        if (storedIsConnected) setIsConnected(true);
      } else {
          setIsConnected(false);
      }
      setIsLoaded(true);
    }
    loadInitialState();
  }, []);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || null;
  
  const setActiveProfile = useCallback((profileId: string | null) => {
    if (profileId !== activeProfileId) {
      setIsConnected(false);
      setApiLimit({ used: 0, limit: 1200 });
      setActiveProfileId(profileId);
    }
  }, [activeProfileId]);
  
  // We use a ref to prevent saving the initial hydrated state back to the server.
  const isInitialMount = useRef(true);

  // Debounced save for all state variables to prevent race conditions and network flooding.
  useEffect(() => {
    if (!isLoaded) return;

    // Skip the first execution immediately after loading
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      saveSecureSession({
        apiProfiles: profiles,
        activeProfileId,
        binanceIsConnected: String(isConnected),
        rateLimitThreshold: String(rateLimitThreshold),
        coingeckoApiKey,
        coinmarketcapApiKey,
        geminiApiKey,
        telegramBotToken,
        telegramChatId,
        aiQuota: JSON.stringify(aiQuota)
      });

      if (!isConnected) {
        setApiLimit({ used: 0, limit: 1200 });
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [
    isLoaded,
    profiles,
    activeProfileId,
    isConnected,
    rateLimitThreshold,
    coingeckoApiKey,
    coinmarketcapApiKey,
    geminiApiKey,
    telegramBotToken,
    telegramChatId,
    aiQuota
  ]);

  const addProfile = (profile: ApiProfile) => setProfiles(prev => [...prev, profile]);
  const updateProfile = (updatedProfile: ApiProfile) => setProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
  const deleteProfile = (profileId: string) => { setProfiles(prev => prev.filter(p => p.id !== profileId)); if (activeProfileId === profileId) { setActiveProfile(null); } };
  const setAiQuotaLimit = (newLimit: number) => setAiQuota(prev => ({ ...prev, limit: Math.max(1, Math.min(50, newLimit)) }));

  const canUseAi = (): boolean => {
    if (!geminiApiKey) {
        toast({ title: "Google AI API Key Missing", description: "Please set your Gemini API key in Settings.", variant: "destructive" });
        return false;
    }
    let currentQuota = { ...aiQuota };
    const today = new Date().toISOString().split('T')[0];
    if (currentQuota.lastReset !== today) {
        const newQuota = { ...currentQuota, used: 0, lastReset: today };
        setAiQuota(newQuota);
        currentQuota = newQuota;
    }
    if (currentQuota.used >= currentQuota.limit) {
      toast({ title: "AI Daily Quota Reached", description: `Used ${currentQuota.used}/${currentQuota.limit}. Resets tomorrow.`, variant: "destructive" });
      return false;
    }
    return true;
  };
  
  const consumeAiCredit = () => {
    const today = new Date().toISOString().split('T')[0];
    setAiQuota(prev => {
        if (prev.lastReset !== today) return { ...prev, used: 1, lastReset: today };
        if (prev.used < prev.limit) return { ...prev, used: prev.used + 1 };
        return prev;
    });
  };

  const testConnection = async (): Promise<boolean> => {
    if (!activeProfile) return false;
    try {
        const { usedWeight } = await getAccountBalance({ apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey });
        setApiLimit({ used: usedWeight, limit: 1200 });
        return true;
    } catch (error) {
        return false;
    }
  };

  return (
    <ApiContext.Provider value={{ 
      profiles, activeProfile,
      apiKey: activeProfile?.apiKey || null, secretKey: activeProfile?.secretKey || null,
      coingeckoApiKey, coinmarketcapApiKey, telegramBotToken, telegramChatId, geminiApiKey,
      addProfile, updateProfile, deleteProfile, setActiveProfile,
      setCoingeckoApiKey, setCoinmarketcapApiKey, setTelegramBotToken, setTelegramChatId, setGeminiApiKey,
      isConnected, setIsConnected, apiLimit, setApiLimit,
      rateLimitThreshold, setRateLimitThreshold,
      aiQuota, setAiQuotaLimit, canUseAi, consumeAiCredit,
      testConnection,
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
