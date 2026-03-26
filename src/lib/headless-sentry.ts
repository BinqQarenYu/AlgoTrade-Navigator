import { bufferMicrostructureEvent, MicrostructureEventRecord } from './db-service';
import { microstructureService } from './microstructure-service';
import { PERFORMANCE_CONFIG } from './performance-config';
import fs from 'fs';
import path from 'path';

const isServer = typeof window === 'undefined';
const CONFIG_PATH = isServer ? path.join(process.cwd(), 'sentry-config.json') : '';

// Use require or dynamic import for WS in Node, avoiding browser bundles
let WebSocketClass: any = null;
if (isServer) {
    if (globalThis.WebSocket) {
        WebSocketClass = globalThis.WebSocket;
    } else {
        WebSocketClass = require('ws');
    }
}

export interface SentryConfig {
    whaleThresholdUsd: number;
    vpinThreshold: number;
    entropyThreshold: number;
    enabled: boolean;
}

const DEFAULT_CONFIG: SentryConfig = {
    whaleThresholdUsd: 50000,
    vpinThreshold: 0.8,
    entropyThreshold: 2.5,
    enabled: false,
};

// Global persistence for Next.js HMR to prevent multiple instances
const globalForSentry = globalThis as unknown as {
    sentryInstance: HeadlessSentry | null;
};

export class HeadlessSentry {
    public config: SentryConfig = { ...DEFAULT_CONFIG };
    
    private wsConnections: any[] = [];
    private priceCache: Map<string, number> = new Map();
    
    private isRunning = false;
    
    constructor() {
        if (!isServer) return;
        this.loadConfig();
    }

    private loadConfig() {
        if (!isServer) return;
        try {
            if (fs.existsSync(CONFIG_PATH)) {
                const conf = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
                this.config = { ...DEFAULT_CONFIG, ...conf };
            }
        } catch(e) { console.error('Failed to load sentry config', e); }
    }

    private saveConfig() {
        if (!isServer) return;
        try {
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2));
        } catch(e) { console.error('Failed to save sentry config', e); }
    }

    public autoBoot() {
        if (!isServer) return;
        if (this.config.enabled && !this.isRunning) {
            console.log('[HeadlessSentry] Auto-booting Sentry based on saved config...');
            this.start();
        }
    }

    public start() {
        if (!isServer) return;
        if (this.isRunning) return;
        this.isRunning = true;
        this.config.enabled = true;
        this.saveConfig();
        
        console.log('[HeadlessSentry] Starting 24/7 Anomaly Sentry...');
        this.connectShards();
    }

    public stop() {
        if (!isServer) return;
        this.isRunning = false;
        this.config.enabled = false;
        this.saveConfig();
        
        console.log('[HeadlessSentry] Stopping Sentry...');
        for (const ws of this.wsConnections) {
            ws.close();
        }
        this.wsConnections = [];
    }
    
    public updateConfig(newConfig: Partial<SentryConfig>) {
       this.config = { ...this.config, ...newConfig };
       this.saveConfig();
    }

    private connectShards() {
        // Track the top priority assets
        const allAssets = PERFORMANCE_CONFIG.PRIORITY_ASSETS; 
        
        const SHARD_SIZE = 50; 
        for (let i = 0; i < allAssets.length; i += SHARD_SIZE) {
            const chunk = allAssets.slice(i, i + SHARD_SIZE);
            this.createWsConnection(chunk, i);
        }
    }

    private createWsConnection(symbols: string[], shardId: number) {
        if (!this.isRunning || !WebSocketClass) return;

        const url = 'wss://fstream.binance.com/ws';
        const ws = new WebSocketClass(url);
        this.wsConnections.push(ws);
        
        ws.onopen = () => {
            console.log(`[HeadlessSentry Shard ${shardId}] Connected.`);
            const params: string[] = [];
            symbols.forEach(sym => {
                const s = sym.toLowerCase();
                params.push(`${s}@aggTrade`);
                params.push(`${s}@forceOrder`); // Liquidations
            });
            
            ws.send(JSON.stringify({
                method: 'SUBSCRIBE',
                params: params,
                id: Date.now()
            }));
        };

        ws.onmessage = (event: any) => {
            if (!this.isRunning) return;
            try {
                let data = event.data;
                if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) data = data.toString('utf8');
                if (data instanceof ArrayBuffer) data = new TextDecoder().decode(data);
                
                const parsed = JSON.parse(data);

                if (parsed.e === 'aggTrade') {
                    this.processTrade(parsed);
                } 
                else if (parsed.e === 'forceOrder') {
                    this.processLiquidation(parsed);
                }
            } catch (err) {}
        };

        ws.onclose = () => {
            console.log(`[HeadlessSentry Shard ${shardId}] Closed.`);
            this.wsConnections = this.wsConnections.filter(w => w !== ws);
            if (this.isRunning) {
                setTimeout(() => this.createWsConnection(symbols, shardId), 5000); // Reconnect loop
            }
        };

        ws.onerror = (e: any) => {
            console.warn(`[HeadlessSentry Shard ${shardId}] WS Error.`);
        };
    }

    private getWhaleMultiplier(symbol: string): number {
        // Institutional Depth Tier 1: Massive Liquidity (BTC/ETH only)
        if (symbol === 'BTCUSDT') return 100; // $5,000,000 (Real Whales)
        if (symbol === 'ETHUSDT') return 50;  // $2,500,000
        
        // Tier 2: High Liquidity Alts (Top 10)
        const top10 = ['SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOGEUSDT', 'DOTUSDT'];
        if (top10.includes(symbol)) return 10; // $500,000
        
        // Tier 3: Mid Caps (Top 50)
        const top50 = ['LINKUSDT', 'MATICUSDT', 'SHIBUSDT', 'TRXUSDT', 'UNIUSDT', 'LTCUSDT', 'BCHUSDT', 'NEARUSDT', 'APTUSDT', 'INJUSDT'];
        if (top50.includes(symbol)) return 5; // $250,000
        
        // Tier 4: Small Caps
        const smallCaps = ['PEPEUSDT', 'BONKUSDT', 'FTMUSDT', 'STXUSDT', 'RNDRUSDT'];
        if (smallCaps.includes(symbol)) return 2; // $100,000

        // Tier 5: Micro Caps / New Listings (Very thin depth)
        const microCaps = ['MEMEUSDT', 'WIFUSDT', 'ORDIUSDT', 'MYROUSDT'];
        if (microCaps.includes(symbol)) return 0.5; // $25,000 is a whale here

        return 1; // standard $50k base
    }

    private processTrade(data: any) {
        const symbol = data.s.toUpperCase();
        const price = parseFloat(data.p);
        const qty = parseFloat(data.q);
        const isBuy = !data.m;
        const timestamp = data.T;
        const tradeId = data.a;
        
        this.priceCache.set(symbol, price);
        const usdVolume = price * qty;
        
        const whaleMultiplier = this.getWhaleMultiplier(symbol);
        const effectiveWhaleThreshold = this.config.whaleThresholdUsd * whaleMultiplier;

        const micro = microstructureService.analyzeTrade(symbol, qty, price, isBuy);
        
        let anomalyDetected = false;
        let eventType: MicrostructureEventRecord['event_type'] | null = null;
        let severity = 0.5;

        if (usdVolume >= effectiveWhaleThreshold) {
            anomalyDetected = true;
            eventType = 'WHALE_TX';
            severity = Math.min(usdVolume / (effectiveWhaleThreshold * 10), 1.0);
        }
        else if (micro.isIceberg) {
            anomalyDetected = true;
            eventType = 'ICEBERG';
            severity = 0.8;
        }
        else if (micro.isSpoofing) {
            anomalyDetected = true;
            eventType = 'SPOOF_CANCEL';
            severity = 0.9;
        }
        else if (micro.vpin && micro.vpin > this.config.vpinThreshold) {
            anomalyDetected = true;
            eventType = 'VPIN_SPIKE';
            severity = micro.vpin;
        }
        else if (micro.isSynthetic && micro.entropyScore < this.config.entropyThreshold) {
            anomalyDetected = true;
            eventType = 'ENTROPY_SHIFT';
            severity = 1.0 - (micro.entropyScore / 3.0);
        }

        if (anomalyDetected && eventType) {
            const eventId = `${symbol}-${timestamp}-${eventType}-${tradeId}`;
            bufferMicrostructureEvent({
                event_id: eventId,
                timestamp,
                symbol,
                event_type: eventType,
                price,
                volume_base: qty,
                volume_usd: usdVolume,
                severity_score: severity,
                metadata: JSON.stringify({ side: isBuy ? 'BUY' : 'SELL', micro })
            });
        }
    }

    private processLiquidation(data: any) {
        const order = data.o;
        if (!order) return;
        
        const symbol = order.s.toUpperCase();
        const price = parseFloat(order.p);
        const qty = parseFloat(order.q);
        const timestamp = data.E;
        const side = order.S; 
        
        const usdVolume = price * qty;
        const eventId = `LIQ-${symbol}-${timestamp}-${Math.floor(Math.random() * 1000)}`;
        
        bufferMicrostructureEvent({
            event_id: eventId,
            timestamp,
            symbol,
            event_type: 'LIQUIDATION',
            price,
            volume_base: qty,
            volume_usd: usdVolume,
            severity_score: 1.0, 
            metadata: JSON.stringify({ side })
        });
    }

    public getStatus() {
        return {
            isRunning: this.isRunning,
            config: this.config,
            activeSockets: this.wsConnections.length,
            cachedPrices: this.priceCache.size
        };
    }
}

export const headlessSentry = globalForSentry.sentryInstance || new HeadlessSentry();
if (isServer) globalForSentry.sentryInstance = headlessSentry;
