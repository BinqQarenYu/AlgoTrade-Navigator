'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [apiLimit, setApiLimit] = useState({ used: 0, limit: 1200 });


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
