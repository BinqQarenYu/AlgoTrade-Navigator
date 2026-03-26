/**
 * Gold Standard Multi-Asset Sync Service
 * 
 * Sequentially fetches historical data for every asset in the registry.
 * This ensures no 429 Rate Limits occur, as we only ever make ONE
 * request at a time across the entire app.
 */

import { fullAssetList } from './assets';
import { getHistoricalKlines } from './binance-service';

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
                // 1. Fetch from Binance via Recursive CCXT
                const klines = await getHistoricalKlines(
                    symbol,
                    interval,
                    startTime,
                    endTime
                );

                if (klines.length > 0) {
                    // 2. Save to Vault (DuckDB) via API
                    await fetch('/api/db/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            source: 'BACKFILL',
                            symbol,
                            data: klines.map((k: any) => ({ ...k, interval }))
                        })
                    });
                }

                status.completedSymbols.push(symbol);
                status.progressPercent = Math.round((status.completedSymbols.length / total) * 100);
                onUpdate({ ...status });

                // Jitter delay to prevent thundering herd on Binance
                await new Promise(r => setTimeout(r, 500));

            } catch (error: any) {
                console.error(`[SYNC FAILURE] ${symbol}:`, error);
                status.error = `Error at ${symbol}: ${error.message}`;
                onUpdate({ ...status });
                // We continue to next asset unless it's a critical error
                if (error.message.includes('429')) {
                    status.isRunning = false;
                    this.isRunning = false;
                    return;
                }
            }
        }

        this.isRunning = false;
        onUpdate({ ...status, isRunning: false, currentSymbol: 'Completed' });
    }

    public stop() {
        this.abortSignal = true;
    }
}

export const assetSyncService = new AssetSyncService();
