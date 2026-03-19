

"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import type { HistoricalData } from '@/lib/types';
import { getLatestKlinesByLimit, getHistoricalKlines, checkLocalVault } from '@/lib/binance-service';
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
        const startTime = dateRange.from.getTime();
        const endTime = dateRange.to.getTime();

        // 1. Check Local Vault First
        console.log(`[DataVault] Checking local vault for ${symbol} ${interval} from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}...`);
        const vaultData = await checkLocalVault(symbol, interval, startTime, endTime);

        // 2. Determine Gaps and Fetch if needed
        // For simplicity in this implementation, if we have *any* data that covers the range reasonably well, we'll use it.
        // A more robust implementation would check for exact gaps.
        // If vaultData is empty or has a significant gap at the start/end, fetch from REST.

        let needsRestFetch = false;

        // Convert interval string to ms for gap checking
        const intervalMsMatch = interval.match(/(\d+)([mhdw])/);
        let intervalMs = 60000; // default 1m
        if (intervalMsMatch) {
            const val = parseInt(intervalMsMatch[1]);
            const unit = intervalMsMatch[2];
            if (unit === 'm') intervalMs = val * 60000;
            if (unit === 'h') intervalMs = val * 3600000;
            if (unit === 'd') intervalMs = val * 86400000;
            if (unit === 'w') intervalMs = val * 604800000;
        }

        if (vaultData.length === 0) {
            console.log(`[DataVault] Vault empty for range. Fetching entirely from REST...`);
            needsRestFetch = true;
        } else {
             const vaultStart = vaultData[0].time;
             const vaultEnd = vaultData[vaultData.length - 1].time;

             // Check if we are missing more than one interval at the beginning or end
             if (startTime < vaultStart - intervalMs || endTime > vaultEnd + intervalMs) {
                 console.log(`[DataVault] Vault missing data edges. Fetching from REST to fill gaps...`);
                 needsRestFetch = true;
             }
        }

        if (needsRestFetch) {
             const restData = await getHistoricalKlines(symbol, interval, startTime, endTime);

             // Sink new data to the local vault asynchronously
             if (restData.length > 0) {
                 console.log(`[DataVault] Sinking ${restData.length} records to local DuckDB vault...`);
                 // Fire and forget
                 fetch('/api/db/save', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({
                         source: 'BACKFILL',
                         symbol,
                         data: restData.map(k => ({
                             interval,
                             time: k.time,
                             open: k.open,
                             high: k.high,
                             low: k.low,
                             close: k.close,
                             volume: k.volume
                         }))
                     })
                 }).catch(err => console.error('[DataVault] Failed to sink data:', err));
             }

             // Merge data (REST data should be complete for the requested range, so we use it directly here.
             // If we implemented chunked gap-filling, we would merge vaultData and restData here).
             data = restData;
        } else {
             console.log(`[DataVault] Vault hit! Loaded ${vaultData.length} records locally.`);
             data = vaultData;
        }

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
