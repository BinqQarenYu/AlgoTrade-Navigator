import { describe, it, expect } from 'vitest';
import { MicrostructureEnricher } from './microstructure-enricher';
import type { HistoricalData } from '../types';

describe('MicrostructureEnricher', () => {
    it('should correctly enrich data using the sliding window average', () => {
        const data: HistoricalData[] = Array.from({ length: 25 }, (_, i) => ({
            time: Date.now() + i * 1000,
            open: 100,
            high: 110,
            low: 90,
            close: 100,
            volume: 1000 // constant volume
        }));

        const enriched = MicrostructureEnricher.enrich(data);
        expect(enriched.length).toBe(25);
        expect(enriched[0].microstructure).toBeDefined();

        // For the 25th item, average volume should be 1000
        expect(enriched[24].microstructure?.vpin).toBeDefined();
    });

    it('should return empty array for empty input', () => {
        expect(MicrostructureEnricher.enrich([])).toEqual([]);
    });

    it('should handle already enriched data', () => {
         const data: HistoricalData[] = [{
            time: Date.now(),
            open: 100,
            high: 110,
            low: 90,
            close: 100,
            volume: 1000,
            microstructure: {
                entropyScore: 4.0,
                isSynthetic: false,
                isOrganic: true,
                vpin: 0.5,
                isSpoofing: false,
                isIceberg: false,
                fundingRate: 0.0001
            }
        }];

        const enriched = MicrostructureEnricher.enrich(data);
        expect(enriched[0].microstructure?.vpin).toBe(0.5);
    });
});
