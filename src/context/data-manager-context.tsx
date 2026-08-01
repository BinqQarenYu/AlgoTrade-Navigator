"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import type { HistoricalData } from '@/lib/types';
import { getLatestKlinesByLimit, getHistoricalKlines } from '@/lib/binance-service';
import { getCachedKlines, saveCachedKlines, clearKlinesCache } from '@/lib/historical-data-store';

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
  isLastFetchCached: boolean;
  error: string | null;
  clearPersistentCache: () => Promise<void>;
}

const DataManagerContext = createContext<DataManagerContextType | undefined>(undefined);

export const DataManagerProvider = ({ children }: { children: ReactNode }) => {
  const cacheRef = useRef<ChartDataCache>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLastFetchCached, setIsLastFetchCached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearPersistentCache = useCallback(async () => {
    cacheRef.current = {};
    await clearKlinesCache();
  }, []);

  const getChartData = useCallback(async (
    symbol: string,
    interval: string,
    dateRange?: { from?: Date, to?: Date }
  ): Promise<HistoricalData[] | null> => {
    // Generate a unique key for the request.
    const cacheKey = dateRange 
      ? `DATERANGE-${symbol}-${interval}-${dateRange.from?.getTime()}-${dateRange.to?.getTime()}` 
      : `${symbol}-${interval}`;

    // 1. In-Memory Cache Check
    if (cacheRef.current[cacheKey]) {
      console.log(`[Cache] Memory HIT for ${cacheKey}`);
      setIsLastFetchCached(true);
      return cacheRef.current[cacheKey];
    }

    // 2. Persistent IndexedDB Cache Check
    const persistentData = await getCachedKlines(cacheKey);
    if (persistentData && persistentData.length > 0) {
      console.log(`[Cache] IndexedDB HIT for ${cacheKey} (${persistentData.length} candles)`);
      cacheRef.current[cacheKey] = persistentData;
      setIsLastFetchCached(true);
      return persistentData;
    }

    // 3. Network Fetch (Public Binance API)
    console.log(`[Cache] MISS for ${cacheKey}. Fetching public Binance klines...`);
    setIsLoading(true);
    setIsLastFetchCached(false);
    setError(null);

    try {
      let data: HistoricalData[] = [];
      if (dateRange?.from && dateRange?.to) {
        data = await getHistoricalKlines(symbol, interval, dateRange.from.getTime(), dateRange.to.getTime());
      } else {
        data = await getLatestKlinesByLimit(symbol, interval, 1000);
      }

      if (data && data.length > 0) {
        cacheRef.current[cacheKey] = data;
        await saveCachedKlines(cacheKey, data);
      }
      
      setIsLoading(false);
      return data;
    } catch (e: any) {
      console.error(`Failed to fetch chart data for ${symbol}:`, e);
      setError(e.message || "An unknown error occurred while fetching data.");
      setIsLoading(false);
      return null;
    }
  }, []);

  return (
    <DataManagerContext.Provider value={{ getChartData, isLoading, isLastFetchCached, error, clearPersistentCache }}>
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
