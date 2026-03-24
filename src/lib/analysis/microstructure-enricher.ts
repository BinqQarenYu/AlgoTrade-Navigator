import type { HistoricalData } from '../types';

/**
 * Microstructure Enricher
 * Decides whether to use recorded DuckDB microstructure or generate high-fidelity synthetic proxies.
 */
export class MicrostructureEnricher {
    /**
     * Enriches historical OHLCV data with microstructure metadata.
     * In a production environment, this would query DuckDB for the exact timestamps.
     * For now, we use a high-fidelity proxy calculation based on price/volume variance.
     */
    static enrich(data: HistoricalData[]): HistoricalData[] {
        if (!data.length) return data;

        // ⚡ Bolt Optimization: Replace O(N * 21) slice().reduce() with O(N) sliding window
        // Pre-allocate array for better memory performance and reduced GC latency
        const result = new Array(data.length);

        let windowSum = 0;
        let windowSize = 0;

        for (let i = 0; i < data.length; i++) {
            const d = data[i];

            // Manage sliding window (up to 21 items)
            windowSum += d.volume;
            windowSize++;

            if (windowSize > 21) {
                windowSum -= data[i - 21].volume;
                windowSize = 21;
            }

            if (d.microstructure) {
                result[i] = d; // Already enriched
                continue;
            }

            // 1. Generate Synthetic VPIN (Volume-Synchronized Probability of Informed Trading)
            // Proxy: High relative volume + Price Volatility = Informed Flow
            const avgVolume = windowSum / windowSize;
            const volRatio = d.volume / (avgVolume || 1);
            const priceMove = Math.abs((d.close - d.open) / d.open);
            
            // VPIN between 0.1 and 0.95
            const syntheticVpin = Math.min(0.95, Math.max(0.1, (volRatio * 0.3) + (priceMove * 10)));

            // 2. Generate Shannon Entropy (Humanity Score)
            // Proxy: Clean price moves = Human/Institutional. Choppy/Sideways with spikes = Bot/Synthetic.
            // A higher entropy (4.5+) means diverse, organic size distribution. 
            // In OHLCV we can't see individual trades, so we proxy via candle "cleanliness".
            const candleCleanliness = Math.abs(d.close - d.open) / (d.high - d.low || 0.0001);
            const syntheticEntropy = 3.0 + (candleCleanliness * 2.5); // Ranges from 3.0 to 5.5

            // 3. Spoofing & Iceberg Detection (Proxied via Volume anomalies)
            const isIceberg = volRatio > 2.5 && priceMove < 0.002; // High volume, small move = Hidden resistance
            const isSpoofing = volRatio > 4 && priceMove > 0.01; // Massive volume spike on breakout

            result[i] = {
                ...d,
                microstructure: {
                    entropyScore: Number(syntheticEntropy.toFixed(2)),
                    isSynthetic: syntheticEntropy < 3.2,
                    isOrganic: syntheticEntropy > 4.8,
                    vpin: Number(syntheticVpin.toFixed(4)),
                    isSpoofing: isSpoofing,
                    isIceberg: isIceberg,
                    fundingRate: 0.0001 // Default baseline
                }
            };
        }

        return result;
    }
}
