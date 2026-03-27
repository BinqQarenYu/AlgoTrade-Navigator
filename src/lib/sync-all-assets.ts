/**
 * Gold Standard Multi-Asset Sync Service
 * 
 * Sequentially fetches historical data for every asset in the registry.
 * This ensures no 429 Rate Limits occur, as we only ever make ONE
 * request at a time across the entire app.
 */

import { fullAssetList } from './assets';
import { getHistoricalKlines, checkLocalVault } from './binance-service';


export interface SyncStatus {
    currentSymbol: string;
    completedSymbols: string[];
    totalSymbols: number;
    progressPercent: number;
    isRunning: boolean;
    error: string | null;
}

type SyncCallback = (status: SyncStatus) => void;

class AssetSyncService {
    private isRunning = false;
    private abortSignal = false;

    public async startGlobalSync(
        lookbackDays: number = 30,
        interval: string = '1h',
        onUpdate: SyncCallback
    ) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.abortSignal = false;

        const allAssets = fullAssetList.sort();
        const total = allAssets.length;
        const endTime = Date.now();
        const startTime = endTime - (lookbackDays * 24 * 60 * 60 * 1000);

        const status: SyncStatus = {
            currentSymbol: '',
            completedSymbols: [],
            totalSymbols: total,
            progressPercent: 0,
            isRunning: true,
            error: null
        };

        for (let i = 0; i < allAssets.length; i++) {
            if (this.abortSignal) break;

            const symbol = allAssets[i];
            status.currentSymbol = symbol;
            onUpdate({ ...status });

            try {
                // 1. Optimized Check: Do we already have this range in DuckDB?
                const localData = await checkLocalVault(symbol, interval, startTime, endTime);
                
                // If we have at least 80% of the expected candles, skip API fetch
                const expectedCandles = (lookbackDays * 24 * 60) / (interval === '1h' ? 60 : 1); 
                if (localData.length >= expectedCandles * 0.8) {
                    console.log(`[SYNC] Skipping ${symbol}, vault already has ${localData.length} records.`);
                    status.completedSymbols.push(symbol);
                    status.progressPercent = Math.round((status.completedSymbols.length / total) * 100);
                    onUpdate({ ...status });
                    continue;
                }

                // 2. Fetch from Binance via Looping CCXT
                const klines = await getHistoricalKlines(
                    symbol,
                    interval,
                    startTime,
                    endTime
                );

                if (klines.length > 0) {
                    // 3. Chunked Save to Vault (DuckDB) to avoid Large Payload Errors
                    const CHUNK_SIZE = 1000;
                    for (let j = 0; j < klines.length; j += CHUNK_SIZE) {
                        if (this.abortSignal) break;
                        
                        const chunk = klines.slice(j, j + CHUNK_SIZE);
                        const response = await fetch('/api/db/save', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                source: 'BACKFILL',
                                symbol,
                                data: chunk.map((k: any) => ({ ...k, interval }))
                            })
                        });
                        
                        if (!response.ok) {
                            console.error(`[SYNC SAVE FAIL] Chunk ${j/CHUNK_SIZE} for ${symbol}`);
                        }
                    }
                }

                status.completedSymbols.push(symbol);
                status.progressPercent = Math.round((status.completedSymbols.length / total) * 100);
                onUpdate({ ...status });

                // Ethically spaced requests to avoid Binance/Proxy rate limit pressure
                await new Promise(r => setTimeout(r, 300));

            } catch (error: any) {
                console.error(`[SYNC FAILURE] ${symbol}:`, error);
                status.error = `Error at ${symbol}: ${error.message}`;
                onUpdate({ ...status });
                
                // If it's a Rate Limit error, back off significantly
                if (error.message.includes('429')) {
                    console.warn('[SYNC] 429 Detected, sleeping for 60s...');
                    await new Promise(r => setTimeout(r, 60000));
                }
            }
        }

        this.isRunning = false;
        onUpdate({ ...status, isRunning: false, currentSymbol: this.abortSignal ? 'Stopped' : 'Completed' });
    }


    public stop() {
        this.abortSignal = true;
    }
}

export const assetSyncService = new AssetSyncService();
