'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface ApiContextType {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  secretKey: string | null;
  setSecretKey: (key: string | null) => void;
  isConnected: boolean;
  setIsConnected: (status: boolean) => void;
  apiLimit: { used: number; limit: number };
  setApiLimit: (limit: { used: number; limit: number }) => void;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('binance-apiKey');
    }
    return null;
  });
  const [secretKey, setSecretKey] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('binance-secretKey');
    }
    return null;
  });
  const [isConnected, setIsConnected] = useState<boolean>(() => {
     if (typeof window !== 'undefined') {
      return localStorage.getItem('binance-isConnected') === 'true';
    }
    return false;
  });
  const [apiLimit, setApiLimit] = useState({ used: 0, limit: 1200 });

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('binance-apiKey', apiKey);
    } else {
      localStorage.removeItem('binance-apiKey');
    }
  }, [apiKey]);

  useEffect(() => {
    if (secretKey) {
      localStorage.setItem('binance-secretKey', secretKey);
    } else {
      localStorage.removeItem('binance-secretKey');
    }
  }, [secretKey]);

  useEffect(() => {
    localStorage.setItem('binance-isConnected', String(isConnected));
  }, [isConnected]);


  return (
    <ApiContext.Provider value={{ apiKey, setApiKey, secretKey, setSecretKey, isConnected, setIsConnected, apiLimit, setApiLimit }}>
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
