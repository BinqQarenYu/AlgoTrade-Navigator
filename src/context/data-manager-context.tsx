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
  getSeasonalData: (
    symbol: string,
    years?: number
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

  const getSeasonalData = useCallback(async (
    symbol: string,
    years: number = 7
  ): Promise<HistoricalData[] | null> => {
    const cacheKey = `SEASONAL-${symbol}-${years}Y`;

    // 1. In-Memory Cache Check
    if (cacheRef.current[cacheKey]) {
      console.log(`[Cache] Memory HIT for ${cacheKey}`);
      return cacheRef.current[cacheKey];
    }

    // 2. Persistent IndexedDB Cache Check
    const persistentData = await getCachedKlines(cacheKey);
    if (persistentData && persistentData.length > 0) {
      console.log(`[Cache] IndexedDB HIT for ${cacheKey} (${persistentData.length} candles)`);
      cacheRef.current[cacheKey] = persistentData;
      return persistentData;
    }

    // 3. Network Fetch (Public Binance API) with Pagination
    console.log(`[Cache] MISS for ${cacheKey}. Fetching ${years} years of daily data...`);
    setIsLoading(true);
    setError(null);

    try {
      let allData: HistoricalData[] = [];
      const now = Date.now();
      let startTime = now - (years * 365 * 24 * 60 * 60 * 1000);
      
      while (startTime < now) {
        const chunk = await getHistoricalKlines(symbol, '1d', startTime, now);
        
        if (!chunk || chunk.length === 0) {
          break;
        }

        allData = [...allData, ...chunk];
        
        const lastCandleTime = chunk[chunk.length - 1].time;
        
        // If CCXT returned less than 500, we probably reached the end of available data
        if (lastCandleTime >= now - (24 * 60 * 60 * 1000) || chunk.length < 500) {
           break;
        }
        
        startTime = lastCandleTime + 1; // Start right after the last candle

        // Wait a bit to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (allData.length > 0) {
        // Sort just in case
        allData.sort((a, b) => a.time - b.time);
        
        cacheRef.current[cacheKey] = allData;
        await saveCachedKlines(cacheKey, allData);
      }
      
      setIsLoading(false);
      return allData.length > 0 ? allData : null;
    } catch (e: any) {
      console.error(`Failed to fetch seasonal data for ${symbol}:`, e);
      setError(e.message || "An unknown error occurred while fetching seasonal data.");
      setIsLoading(false);
      return null;
    }
  }, []);

  return (
    <DataManagerContext.Provider value={{ getChartData, getSeasonalData, isLoading, isLastFetchCached, error, clearPersistentCache }}>
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
