
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { ApiProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getAccountBalance, pingBinance } from '@/lib/binance-service';

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
  geminiModel: string;
  setGeminiModel: (model: string) => void;
  
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
  saveToDisk: () => Promise<void>;
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
  const [telegramBotToken, setTelegramBotToken] = useState<string | null>(null);
  const [telegramChatId, setTelegramChatId] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);
  const [geminiModel, setGeminiModel] = useState<string>('gemini-1.5-flash');
  const [aiQuota, setAiQuota] = useState({
    used: 0,
    limit: 49,
    lastReset: new Date().toISOString().split('T')[0],
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial state from localStorage and Server
  useEffect(() => {
    const loadSettings = async () => {
      // 1. Load from localStorage
      const storedProfiles = localStorage.getItem('apiProfiles');
      const storedActiveId = localStorage.getItem('activeProfileId');
      const storedIsConnected = localStorage.getItem('binance-isConnected') === 'true';
      const storedThreshold = localStorage.getItem('rateLimitThreshold');
      const storedCgKey = localStorage.getItem('coingeckoApiKey');
      const storedCmcKey = localStorage.getItem('coinmarketcapApiKey');
      const storedGeminiKey = localStorage.getItem('geminiApiKey');
      const storedGeminiModel = localStorage.getItem('geminiModel');
      const storedAiQuota = localStorage.getItem('aiQuota');
      const storedTgToken = localStorage.getItem('telegramBotToken');
      const storedTgChatId = localStorage.getItem('telegramChatId');

      // 2. Load from Server (Secondary Backup)
      let serverSettings: any = null;
      try {
        const res = await fetch('/api/app-persistence');
        const data = await res.json();
        if (data.found) serverSettings = data.settings;
      } catch (e) { console.error("Server sync failed", e); }

      // Merge logic: Prefer localStorage, then serverSettings
      if (storedTgToken) setTelegramBotToken(storedTgToken);
      else if (serverSettings?.telegramBotToken) setTelegramBotToken(serverSettings.telegramBotToken);

      if (storedTgChatId) setTelegramChatId(storedTgChatId);
      else if (serverSettings?.telegramChatId) setTelegramChatId(serverSettings.telegramChatId);

      if (storedGeminiKey) setGeminiApiKey(storedGeminiKey);
      else if (serverSettings?.geminiApiKey) setGeminiApiKey(serverSettings.geminiApiKey);

      if (storedGeminiModel) setGeminiModel(storedGeminiModel);
      else if (serverSettings?.geminiModel) setGeminiModel(serverSettings.geminiModel);

      if (storedAiQuota) {
          const parsed = JSON.parse(storedAiQuota);
          const today = new Date().toISOString().split('T')[0];
          if (parsed.lastReset !== today) setAiQuota({ ...parsed, used: 0, lastReset: today });
          else setAiQuota(parsed);
      } else if (serverSettings?.aiQuota) {
          setAiQuota(serverSettings.aiQuota);
      }

      let loadedProfiles = storedProfiles ? JSON.parse(storedProfiles) : (serverSettings?.profiles || []);
      loadedProfiles = loadedProfiles.map((p: any) => ({ ...p, permissions: p.permissions || 'ReadOnly' }));
      setProfiles(loadedProfiles);
      
      if (storedCgKey) setCoingeckoApiKey(storedCgKey);
      else if (serverSettings?.coingeckoApiKey) setCoingeckoApiKey(serverSettings.coingeckoApiKey);

      if (storedCmcKey) setCoinmarketcapApiKey(storedCmcKey);
      else if (serverSettings?.coinmarketcapApiKey) setCoinmarketcapApiKey(serverSettings.coinmarketcapApiKey);

      if (storedThreshold) setRateLimitThreshold(parseInt(storedThreshold, 10));
      else if (serverSettings?.rateLimitThreshold) setRateLimitThreshold(serverSettings.rateLimitThreshold);
      
      if (storedActiveId && loadedProfiles.some((p: ApiProfile) => p.id === storedActiveId)) {
        setActiveProfileId(storedActiveId);
        if (storedIsConnected) setIsConnected(true);
      } else if (serverSettings?.activeProfileId && loadedProfiles.some((p: ApiProfile) => p.id === serverSettings.activeProfileId)) {
        setActiveProfileId(serverSettings.activeProfileId);
      } else {
        setIsConnected(false);
      }

      setIsLoaded(true);
    };

    loadSettings();
  }, []);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || null;
  
  const setActiveProfile = useCallback((profileId: string | null) => {
    if (profileId !== activeProfileId) {
      setIsConnected(false);
      setApiLimit({ used: 0, limit: 1200 });
      setActiveProfileId(profileId);
      if (profileId) {
        localStorage.setItem('activeProfileId', profileId);
      } else {
        localStorage.removeItem('activeProfileId');
      }
    }
  }, [activeProfileId]);
  
  // Persistence to localStorage
  useEffect(() => { if (isLoaded) localStorage.setItem('apiProfiles', JSON.stringify(profiles)); }, [profiles, isLoaded]);
  useEffect(() => { if (isLoaded && telegramBotToken) localStorage.setItem('telegramBotToken', telegramBotToken); }, [telegramBotToken, isLoaded]);
  useEffect(() => { if (isLoaded && telegramChatId) localStorage.setItem('telegramChatId', telegramChatId); }, [telegramChatId, isLoaded]);
  useEffect(() => { if (isLoaded && geminiApiKey) localStorage.setItem('geminiApiKey', geminiApiKey); }, [geminiApiKey, isLoaded]);
  useEffect(() => { if (isLoaded && geminiModel) localStorage.setItem('geminiModel', geminiModel); }, [geminiModel, isLoaded]);
  useEffect(() => { if (isLoaded && coingeckoApiKey) localStorage.setItem('coingeckoApiKey', coingeckoApiKey); }, [coingeckoApiKey, isLoaded]);
  useEffect(() => { if (isLoaded && coinmarketcapApiKey) localStorage.setItem('coinmarketcapApiKey', coinmarketcapApiKey); }, [coinmarketcapApiKey, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem('rateLimitThreshold', String(rateLimitThreshold)); }, [rateLimitThreshold, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem('binance-isConnected', String(isConnected)); if (isLoaded && !isConnected) { setApiLimit({ used: 0, limit: 1200 }); } }, [isConnected, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem('aiQuota', JSON.stringify(aiQuota)); }, [aiQuota, isLoaded]);

  // Persistence to Server
  const saveToDisk = useCallback(async () => {
    if (!isLoaded) return;
    try {
      await fetch('/api/app-persistence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profiles,
          activeProfileId,
          telegramBotToken,
          telegramChatId,
          geminiApiKey,
          geminiModel,
          coingeckoApiKey,
          coinmarketcapApiKey,
          rateLimitThreshold,
          aiQuota
        })
      });
      toast({ title: "Settings Saved to Disk", description: "Your configuration is now permanently stored on the server." });
    } catch (e) {
      console.error("Failed to save to disk", e);
      toast({ title: "Save Failed", description: "Could not write settings to server storage.", variant: "destructive" });
    }
  }, [profiles, activeProfileId, telegramBotToken, telegramChatId, geminiApiKey, geminiModel, coingeckoApiKey, coinmarketcapApiKey, rateLimitThreshold, aiQuota, isLoaded]);

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
        // Fast ping check first
        const keys = { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey };
        const isPingSuccessful = await pingBinance(keys, activeProfile.useDirectConnection);
        
        if (!isPingSuccessful) return false;

        // Then fetch initial balance/weight
        const { usedWeight } = await getAccountBalance(keys, activeProfile.useDirectConnection);
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
      coingeckoApiKey, coinmarketcapApiKey, telegramBotToken, telegramChatId, geminiApiKey, geminiModel,
      addProfile, updateProfile, deleteProfile, setActiveProfile,
      setCoingeckoApiKey, setCoinmarketcapApiKey, setTelegramBotToken, setTelegramChatId, setGeminiApiKey, setGeminiModel,
      isConnected, setIsConnected, apiLimit, setApiLimit,
      rateLimitThreshold, setRateLimitThreshold,
      aiQuota, setAiQuotaLimit, canUseAi, consumeAiCredit,
      testConnection,
      saveToDisk, // Exporting the new function
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
