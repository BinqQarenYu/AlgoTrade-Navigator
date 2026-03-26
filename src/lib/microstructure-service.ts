import type { BinanceOrderFlowData } from "@/hooks/use-order-flow";

export interface MicrostructureAnalysis {
    entropyScore: number;
    isSynthetic: boolean;     // < 2.5 (Bots/Padding)
    isOrganic: boolean;       // > 4.5 (Human/Institutional)
    isSpoofing: boolean;      // Phantom Liquidity
    isIceberg: boolean;       // Hidden Resting Volume
    vpin?: number;            // Toxicity Metric
    fundingRate?: number;     // Contextual Toxicity (Cost of carry)
    sentimentScore?: number;  // -1 to 1 (Social Sentiment)
    orderBookSkew?: number;   // -1 (Heavy Asks) to 1 (Heavy Bids)
    isToxicTrap?: boolean;    // If Sentiment is Bullish but Skew is Bearish
    marketState?: 'Discovery' | 'Toxic pressure' | 'Equilibrium' | 'Bot Noise' | 'Chaos';
    strategicImplication?: string;
}

class MicrostructureService {
    // Sliding window of trade sizes per symbol to calculate Shannon Entropy and VPIN
    private tradeHistory = new Map<string, { size: number, isBuy: boolean }[]>();
    private readonly WINDOW_SIZE = 1000;

    // Resting limit order liquidity map per price level per symbol
    private restingBids = new Map<string, Map<number, number>>();
    private restingAsks = new Map<string, Map<number, number>>();
    
    // Track executed volume per price level to distinguish between execution and cancellation
    private executedVolume = new Map<string, Map<number, number>>();

    // Detected Icebergs (timestamped for trailing cleanup)
    private icebergLevels = new Map<string, { price: number, size: number, timestamp: number }[]>();
    
    // Detected Spoofing Events (Phantom Liquidity)
    private spoofingEvents = new Map<string, { price: number, timestamp: number }[]>();

    // Live Funding Rates for Contextual Toxicity
    private fundingRates = new Map<string, number>();

    // Social Sentiment (Mock/Simulated for Phase 3)
    private socialSentiment = new Map<string, number>();

    // Cached Latest Metrics for AI/Strategy Polling
    private latestMetrics = new Map<string, MicrostructureAnalysis>();

    /**
     * Deep analysis of a single trade tick
     */
    public analyzeTrade(symbol: string, size: number, price: number, isBuy: boolean): MicrostructureAnalysis {
        const upperSymbol = symbol.toUpperCase();
        
        // 1. Maintain sliding window of trade sizes
        if (!this.tradeHistory.has(upperSymbol)) {
            this.tradeHistory.set(upperSymbol, []);
        }
        if (!this.executedVolume.has(upperSymbol)) {
            this.executedVolume.set(upperSymbol, new Map());
        }
        
        const history = this.tradeHistory.get(upperSymbol)!;
        history.push({ size, isBuy });
        if (history.length > this.WINDOW_SIZE) {
            history.shift();
        }
        
        // Track executed volume at this price level for Cancel velocity check
        const execMap = this.executedVolume.get(upperSymbol)!;
        execMap.set(price, (execMap.get(price) || 0) + size);

        // 2. Calculate Shannon Entropy & VPIN
        let entropy = 0;
        let vpin = 0.5; // neutral baseline
        
        if (history.length > 50) {
            const counts = new Map<number, number>();
            let buyV = 0;
            let sellV = 0;
            let totalV = 0;

            for (let i = 0; i < history.length; i++) {
                const s = history[i].size;
                const b = history[i].isBuy;
                
                if (b) buyV += s; else sellV += s;
                totalV += s;

                // Quantizing slightly to catch near-identical bot sizes
                const quantizedSize = Number(s.toPrecision(4)); 
                counts.set(quantizedSize, (counts.get(quantizedSize) || 0) + 1);
            }
            
            // Shannon Entropy
            const total = history.length;
            for (const count of counts.values()) {
                const p = count / total;
                entropy -= p * Math.log2(p);
            }
            
            // VPIN (Volume-Synchronized Probability of Informed Trading) simplified approximation
            if (totalV > 0) {
                vpin = Math.abs(buyV - sellV) / totalV;
            }
        } else {
            entropy = 3.5; 
        }

        let isIceberg = false;
        const bids = this.restingBids.get(upperSymbol);
        const asks = this.restingAsks.get(upperSymbol);
        const totalExecAtPrice = execMap.get(price) || 0;

        if (bids || asks) {
            const bidVol = bids?.get(price);
            const askVol = asks?.get(price);
            const restingVol = (bidVol || 0) + (askVol || 0);
            
            // If executed size at this price level exceeds the previously known resting wall size,
            // yet liquidity is still there, it's a "Shadow Trade" / Iceberg.
            if (restingVol > 0 && totalExecAtPrice > restingVol * 1.2) {
                isIceberg = true;
                
                // Track or update the existing iceberg at this level
                const icebergs = this.icebergLevels.get(upperSymbol) || [];
                const existingIdx = icebergs.findIndex(ib => ib.price === price);
                
                if (existingIdx >= 0) {
                    icebergs[existingIdx].size = totalExecAtPrice;
                    icebergs[existingIdx].timestamp = Date.now();
                } else {
                    icebergs.push({
                        price,
                        size: totalExecAtPrice,
                        timestamp: Date.now()
                    });
                }
                this.icebergLevels.set(upperSymbol, icebergs);
            }
        }

        // Clean up old icebergs (15 mins lifespan for persistent levels)
        const cutoff = Date.now() - 900000; // 15 mins
        if (this.icebergLevels.has(upperSymbol)) {
            const icebergs = this.icebergLevels.get(upperSymbol)!;
            this.icebergLevels.set(upperSymbol, icebergs.filter(ib => ib.timestamp > cutoff));
        }

        // 4. Flagging logic based on Entropy Score thresholds
        const isSynthetic = entropy < 2.5 && history.length > 50;
        const isOrganic = entropy >= 4.5 && history.length > 50;

        // Clean up and check Spoofing events
        if (!this.spoofingEvents.has(upperSymbol)) {
            this.spoofingEvents.set(upperSymbol, []);
        }
        const spoofs = this.spoofingEvents.get(upperSymbol)!;
        this.spoofingEvents.set(upperSymbol, spoofs.filter(s => s.timestamp > cutoff));
        const activeSpoofs = spoofs.length;
        const isSpoofing = activeSpoofs > 3; // Trigger phantom liquidity warning if > 3 quick massive cancels

        const fundingRate = this.fundingRates.get(upperSymbol);

        // 5. Market State Classification Matrix
        let marketState: MicrostructureAnalysis['marketState'] = 'Equilibrium';
        let implication = 'Market is healthy and pricing efficiently.';

        if (vpin > 0.7) {
            marketState = 'Toxic pressure';
            implication = 'Institutional dominance detected. Retail stops at risk.';
        } else if (entropy < 2.5 && history.length > 50) {
            marketState = 'Bot Noise';
            implication = 'Wash trading or algorithmic testing in progress.';
        } else if (entropy > 5.5) {
            marketState = 'Chaos';
            implication = 'High regime shift risk. Liquidity is fragmented.';
        } else if (vpin < 0.2 && entropy > 4.5) {
            marketState = 'Discovery';
            implication = 'New price discovery via organic participation.';
        }

        const metrics: MicrostructureAnalysis = {
            entropyScore: Number(entropy.toFixed(2)),
            isSynthetic,
            isOrganic,
            isSpoofing,
            isIceberg,
            vpin: Number(vpin.toFixed(4)),
            fundingRate,
            sentimentScore: this.socialSentiment.get(upperSymbol) || 0,
            orderBookSkew: this.calculateOrderBookSkew(upperSymbol),
            marketState,
            strategicImplication: implication
        };

        // Trap Detection (Sentiment vs Skew Divergence)
        if (metrics.sentimentScore && metrics.sentimentScore > 0.3 && metrics.orderBookSkew && metrics.orderBookSkew < -0.3) {
            metrics.isToxicTrap = true;
        }

        this.latestMetrics.set(upperSymbol, metrics);
        return metrics;
    }

    private calculateOrderBookSkew(symbol: string): number {
        const bids = this.restingBids.get(symbol.toUpperCase());
        const asks = this.restingAsks.get(symbol.toUpperCase());
        if (!bids || !asks) return 0;

        let bidVol = 0;
        let askVol = 0;

        // Sum up volumes for bids and asks
        for (const volume of bids.values()) {
            bidVol += volume;
        }
        for (const volume of asks.values()) {
            askVol += volume;
        }

        const totalVol = bidVol + askVol;
        if (totalVol === 0) return 0;

        // Skew calculation: (Bid Volume - Ask Volume) / (Total Volume)
        // -1 means heavy asks, 1 means heavy bids
        return (bidVol - askVol) / totalVol;
    }

    public updateSentiment(symbol: string, score: number) {
        this.socialSentiment.set(symbol.toUpperCase(), score);
    }

    /**
     * Exposes latest microstructure health snapshot for the AI Research Engine
     */
    public getLatestMetrics(symbol: string): MicrostructureAnalysis | null {
        return this.latestMetrics.get(symbol.toUpperCase()) || null;
    }

    /**
     * Updates the local cache of resting liquidity from WebSocket streams (Order Book Depth)
     */
    public updateDepth(symbol: string, bids: [number, number][], asks: [number, number][]) {
        const upperSymbol = symbol.toUpperCase();
        
        const oldBids = this.restingBids.get(upperSymbol) || new Map();
        const oldAsks = this.restingAsks.get(upperSymbol) || new Map();
        
        const newBids = new Map<number, number>();
        const newAsks = new Map<number, number>();
        for (const [p, v] of bids) newBids.set(p, v);
        for (const [p, v] of asks) newAsks.set(p, v);
        
        // Anti-Spoofing & Iceberg logic for Bids
        this.processLiquidityChange(upperSymbol, oldBids, newBids);
        // Anti-Spoofing & Iceberg logic for Asks
        this.processLiquidityChange(upperSymbol, oldAsks, newAsks);
        
        this.restingBids.set(upperSymbol, newBids);
        this.restingAsks.set(upperSymbol, newAsks);
        
        // Reset execution volume between snapshots 
        // Note: In high velocity, we should do this PER UPDATE.
        const execMap = this.executedVolume.get(upperSymbol);
        if (execMap) execMap.clear();
    }

    private processLiquidityChange(symbol: string, oldMap: Map<number, number>, newMap: Map<number, number>) {
        const execMap = this.executedVolume.get(symbol) || new Map();
        
        for (const [price, oldVol] of oldMap.entries()) {
            const newVol = newMap.get(price) || 0;
            const executed = execMap.get(price) || 0;

            if (oldVol > newVol) {
                const drop = oldVol - newVol;
                if (drop > 15 && executed < drop * 0.1) {
                    if (!this.spoofingEvents.has(symbol)) {
                        this.spoofingEvents.set(symbol, []);
                    }
                    this.spoofingEvents.get(symbol)!.push({ price, timestamp: Date.now() });
                }
            }
            
            if (executed > oldVol * 1.05 && oldVol > 0) {
                const icebergs = this.icebergLevels.get(symbol) || [];
                const existingIdx = icebergs.findIndex(ib => ib.price === price);
                if (existingIdx === -1) {
                   icebergs.push({ price, size: executed, timestamp: Date.now() });
                   this.icebergLevels.set(symbol, icebergs);
                }
            }
        }
    }

    /**
     * Retrieves active iceberg levels for a given symbol to overlay on Heatmaps
     */
    public getIcebergLevels(symbol: string) {
        return this.icebergLevels.get(symbol.toUpperCase()) || [];
    }

    /**
     * Updates internal state with the latest funding rate
     */
    public updateFundingRate(symbol: string, rate: number) {
        this.fundingRates.set(symbol.toUpperCase(), rate);
    }

    /**
     * DEVELOPER MOCKING TOOLS: Simulates a massive wall spoofing cancellation.
     * Accessible via window.Microstructure.injectMockPhantom("BTCUSDT") in the browser console.
     */
    public injectMockPhantom(symbol: string) {
        const upper = symbol.toUpperCase();
        if (!this.spoofingEvents.has(upper)) this.spoofingEvents.set(upper, []);
        for (let i = 0; i < 4; i++) {
            this.spoofingEvents.get(upper)!.push({ price: 100000, timestamp: Date.now() });
        }
    }
}

export const microstructureService = new MicrostructureService();

if (typeof window !== 'undefined') {
    (window as any).Microstructure = microstructureService;
}
