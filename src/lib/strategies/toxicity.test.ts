
import { describe, it, expect } from 'vitest';
import { calculateCCI, calculateEMA } from '../indicators';
import { executeBacktestEngine } from '../analysis/backtest-engine';
import cciMeanEngine, { defaultCciMeanEngineParams } from './cci-mean-engine';
import { HistoricalData } from '../types';

describe('Institutional Toxicity Benchmark (Phase 3)', () => {
    // Helper to generate mock data with a toxic trap
    function generateMockData(count: number): HistoricalData[] {
        const data: HistoricalData[] = [];
        let price = 50000;
        const now = Date.now();

        for (let i = 0; i < count; i++) {
            price += (Math.random() - 0.5) * 100;
            data.push({
                time: now - (count - i) * 60000,
                open: price,
                high: price + 200,
                low: price - 200,
                close: price,
                volume: 10,
                microstructure: {
                    entropyScore: 4.5,
                    isSynthetic: false,
                    isOrganic: true,
                    isSpoofing: false,
                    isIceberg: false,
                    vpin: 0.1,
                    orderBookSkew: 0.1,
                    isToxicTrap: false
                }
            });
        }

        // 1. Create a "Oversold" signal: CCI < -100
        // We force a dip at index 100
        for (let j = 95; j <= 100; j++) {
            data[j].close = 45000;
            data[j].low = 44500;
        }

        // 2. Add THE TOXIC TRAP at index 101 (The Entry Bar)
        // Price begins to "revert" but VPIN is extreme and Skew is Distribution
        data[101].close = 45500; // Recovers slightly to trigger the "Cross back above -100"
        data[101].microstructure = {
            ...data[101].microstructure!,
            vpin: 0.95, // EXTREME TOXICITY
            isToxicTrap: true, // PHASE 3 INDICATOR
            isSynthetic: true  // Bot noise
        };

        // 3. Make the price crash after the trap to ensure loss if entered
        for (let k = 102; k <= 110; k++) {
            data[k].close = 40000;
            data[k].low = 39000;
        }

        return data;
    }

    it('should VETO a trade during a toxic trap, preventing a massive drawdown', async () => {
        const data = generateMockData(200);

        // CASE A: UNFILTERED (Standard Algorithm)
        const paramsNoFilters = { 
            ...defaultCciMeanEngineParams, 
            maxVpin: 1.0, 
            minEntropy: 0, 
            avoidSpoofing: false, 
            avoidTraps: false, 
            avoidIcebergs: false 
        };
        const dataNoFilters = await cciMeanEngine.calculate(JSON.parse(JSON.stringify(data)), paramsNoFilters);
        const resultNoFilters = executeBacktestEngine(dataNoFilters, {
            initialCapital: 10000,
            leverage: 1,
            fee: 0,
            slippage: 0,
            stopLoss: 5.0,
            takeProfit: 5.0,
            useCompounding: false
        });

        // CASE B: FILTERED (Institutional Safeguards)
        const paramsWithFilters = { ...defaultCciMeanEngineParams };
        const dataWithFilters = await cciMeanEngine.calculate(JSON.parse(JSON.stringify(data)), paramsWithFilters);
        const resultWithFilters = executeBacktestEngine(dataWithFilters, {
            initialCapital: 10000,
            leverage: 1,
            fee: 0,
            slippage: 0,
            stopLoss: 5.0,
            takeProfit: 5.0,
            useCompounding: false
        });

        console.log(`\n--- BENCHMARK RESULTS ---`);
        console.log(`❌ UNFILTERED PNl: ${resultNoFilters.summary.totalPnl.toFixed(2)}`);
        console.log(`🛡️ FILTERED PNL: ${resultWithFilters.summary.totalPnl.toFixed(2)}`);

        // VERIFICATION:
        // The unfiltered one should have entered at index 102 and hit SL or Signal exit
        // The filtered one should have zero trades in this toxic zone.
        expect(resultWithFilters.trades.length).toBeLessThan(resultNoFilters.trades.length);
        expect(resultWithFilters.summary.totalPnl).toBeGreaterThan(resultNoFilters.summary.totalPnl);
    });
});
