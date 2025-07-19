

"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import type { HistoricalData } from '@/lib/types';
import { getLatestKlinesByLimit, getHistoricalKlines } from '@/lib/binance-service';
import { useApi } from './api-context';

type ChartDataCache = {
  [key: string]: HistoricalData[]; // Key format: "SYMBOL-INTERVAL" e.g., "BTCUSDT-1h"
};

interface DataManagerContextType {
  getChartData: (
    symbol: string, 
    interval: string, 
    dateRange?: { from?: Date, to?: Date }
  ) => Promise<HistoricalData[] | null>;
  isLoading: boolean;
  error: string | null;
}

const DataManagerContext = createContext<DataManagerContextType | undefined>(undefined);

export const DataManagerProvider = ({ children }: { children: ReactNode }) => {
  const cacheRef = useRef<ChartDataCache>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useApi();

  const getChartData = useCallback(async (
    symbol: string,
    interval: string,
    dateRange?: { from?: Date, to?: Date }
  ): Promise<HistoricalData[] | null> => {
    
    // Do not fetch if not connected
    if (!isConnected) {
        cacheRef.current = {}; // Clear cache when disconnected
        return null;
    }
    
    // Generate a unique key for the request. Date range queries are not cached for now.
    const cacheKey = dateRange ? `DATERANGE-${symbol}-${interval}-${dateRange.from?.getTime()}-${dateRange.to?.getTime()}` : `${symbol}-${interval}`;

    if (cacheRef.current[cacheKey]) {
      console.log(`[Cache] HIT for ${cacheKey}`);
      return cacheRef.current[cacheKey];
    }

    console.log(`[Cache] MISS for ${cacheKey}. Fetching from API...`);
    setIsLoading(true);
    setError(null);

    try {
      let data: HistoricalData[] = [];
      if (dateRange?.from && dateRange?.to) {
        data = await getHistoricalKlines(symbol, interval, dateRange.from.getTime(), dateRange.to.getTime());
      } else {
        data = await getLatestKlinesByLimit(symbol, interval, 1000);
      }
      
      // Don't cache date range queries as they can be very large and specific
      if (!dateRange) {
        cacheRef.current[cacheKey] = data;
      }
      
      setIsLoading(false);
      return data;
    } catch (e: any) {
      console.error(`Failed to fetch chart data for ${symbol}:`, e);
      setError(e.message || "An unknown error occurred while fetching data.");
      setIsLoading(false);
      return null;
    }
  }, [isConnected]);

  return (
    <DataManagerContext.Provider value={{ getChartData, isLoading, error }}>
      {children}
    </DataManagerContext.Provider>
  );
};

export const useDataManager = () => {
  const context = useContext(DataManagerContext);
  if (context === undefined) {
    throw new Error('useDataManager must be used within a DataManagerProvider');
  }
  return context;
};
