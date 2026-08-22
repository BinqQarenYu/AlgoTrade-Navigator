import type {
  MBOEvent,
  FootprintBubble,
  OHLCVCandle,
  TradeTick,
  CVDPoint,
  VolumeProfileData,
  VolumeProfileLevel,
  ReplayConfig,
  LiquidationEvent,
  CumulativeLiquidation,
  MarketProfileData,
  MarketProfileTPOLevel,
} from './types';
import { MBOBookEngine } from './mbo-book-engine';

export interface ReplayFrameData {
  timestamp: number;
  currentPrice: number;
  bestBid: number;
  bestAsk: number;
  tick: TradeTick;
  bubbles: FootprintBubble[];
  candles: OHLCVCandle[];
  cvdHistory: CVDPoint[];
  volumeProfile: VolumeProfileData;
  heatmapSlices: Array<{ timestamp: number; levels: Map<number, number> }>;
  mboBook: MBOBookEngine;
  isLiveFeed?: boolean;
  liquidations: LiquidationEvent[];
  cumulativeLiquidations: CumulativeLiquidation[];
  marketProfile: MarketProfileData;
}

export class OrderFlowReplayEngine {
  private config: ReplayConfig;
  private bookEngine: MBOBookEngine;
  private isRunning: boolean = false;
  private isLiveFeed: boolean = false;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private wsTrade: WebSocket | null = null;
  private wsDepth: WebSocket | null = null;
  private wsLiquidation: WebSocket | null = null;

  // Historical / Real-Time accumulator state
  private currentPrice: number = 7368.5;
  private currentTimestamp: number = Date.now();
  private cumulativeCVD: number = 0;
  private sessionVolume: number = 0;
  
  private liquidations: LiquidationEvent[] = [];
  private cumulativeLiquidations: CumulativeLiquidation[] = [];
  private currentCumulativeLongLiq: number = 0;
  private currentCumulativeShortLiq: number = 0;

  private bubbles: FootprintBubble[] = [];
  private candles: OHLCVCandle[] = [];
  private cvdHistory: CVDPoint[] = [];
  private volumeProfileLevels: Map<number, VolumeProfileLevel> = new Map();
  private heatmapSlices: Array<{ timestamp: number; levels: Map<number, number> }> = [];

  // Market Profile TPO accumulator state
  private mpTPOMap: Map<number, Set<string>> = new Map(); // price -> set of letters
  private mpVolByPrice: Map<number, { buy: number; sell: number }> = new Map();
  private mpSessionStart: number = 0;
  private mpOpenPrice: number = 0;
  private mpIBHigh: number = 0;
  private mpIBLow: number = Infinity;
  private mpIBPeriodsElapsed: number = 0;
  private mpCurrentLetterIndex: number = 0;
  private mpLastLetterTimestamp: number = 0;
  private mpPriceAggregation: number = 4; // aggregate N tick sizes

  private listeners: Set<(data: ReplayFrameData) => void> = new Set();

  private tickSize: number = 0.25;

  constructor(initialSymbol: string = 'BTCUSDT', tickSize: number = 1.0) {
    this.tickSize = tickSize;
    this.bookEngine = new MBOBookEngine(tickSize);
    this.config = {
      symbol: initialSymbol,
      startDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
      speedMultiplier: 100,
      includeMBO: true,
      isPlaying: true,
      currentTime: Date.now(),
      startTime: Date.now() - 3600 * 1000,
      endTime: Date.now(),
    };

    this.connectLiveFeed();
  }

  public subscribe(callback: (data: ReplayFrameData) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public setSpeed(multiplier: number) {
    this.config.speedMultiplier = multiplier;
    if (this.isRunning && !this.isLiveFeed) {
      this.pause();
      this.play();
    }
  }

  public setSymbol(symbol: string) {
    this.config.symbol = symbol;
    const isBtc = symbol.toUpperCase().includes('BTC');
    const isEth = symbol.toUpperCase().includes('ETH');
    const isSol = symbol.toUpperCase().includes('SOL');

    this.tickSize = isBtc ? 1.0 : isEth ? 0.1 : isSol ? 0.01 : 0.25;
    this.currentPrice = isBtc ? 96500.0 : isEth ? 2850.0 : isSol ? 195.0 : 7368.5;
    this.bookEngine.setTickSize(this.tickSize);

    this.disconnectLiveFeed();
    this.connectLiveFeed();
  }

  public setIncludeMBO(include: boolean) {
    this.config.includeMBO = include;
  }

  public getConfig(): ReplayConfig {
    return { ...this.config, isPlaying: this.isRunning || this.isLiveFeed };
  }

  public getBookEngine(): MBOBookEngine {
    return this.bookEngine;
  }

  // --- Real Live Data Streaming (Binance Public WebSockets + REST) ---

  public connectLiveFeed() {
    this.disconnectLiveFeed();
    this.bookEngine.clear();
    this.bubbles = [];
    this.cvdHistory = [];
    this.volumeProfileLevels.clear();
    this.heatmapSlices = [];
    this.cumulativeCVD = 0;
    this.sessionVolume = 0;

    // Reset Market Profile for new session
    this.mpTPOMap.clear();
    this.mpVolByPrice.clear();
    this.mpSessionStart = Date.now();
    this.mpOpenPrice = 0;
    this.mpIBHigh = 0;
    this.mpIBLow = Infinity;
    this.mpIBPeriodsElapsed = 0;
    this.mpCurrentLetterIndex = 0;
    this.mpLastLetterTimestamp = Date.now();

    let cleanSym = this.config.symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleanSym.includes('USDT') && !cleanSym.includes('BUSD') && !cleanSym.includes('BTC')) {
      cleanSym = 'BTCUSDT';
    }

    // 1. Fetch live snapshot of real recent trades & depth
    this.fetchLiveSnapshot(cleanSym);

    // 2. Open Real Live WebSocket streams in browser environment
    if (typeof window !== 'undefined') {
      try {
        const tradeWsUrl = `wss://stream.binance.com:9443/ws/${cleanSym.toLowerCase()}@trade`;
        const depthWsUrl = `wss://stream.binance.com:9443/ws/${cleanSym.toLowerCase()}@depth20@100ms`;

        this.wsTrade = new WebSocket(tradeWsUrl);
        this.wsTrade.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.p && data.q) {
              const tradePrice = parseFloat(data.p);
              const tradeSize = parseFloat(data.q);
              const isAggressiveBuy = !data.m; // m: true = buyer is maker => aggressive sell; false => aggressive buy
              this.handleLiveTrade(tradePrice, tradeSize, isAggressiveBuy, data.T || Date.now());
            }
          } catch (err) {
            console.error('Error parsing live trade WebSocket message:', err);
          }
        };

        this.wsDepth = new WebSocket(depthWsUrl);
        this.wsDepth.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && (data.bids || data.asks)) {
              this.handleLiveDepth(data.bids || [], data.asks || [], Date.now());
            }
          } catch (err) {
            console.error('Error parsing live depth WebSocket message:', err);
          }
        };

        const liqWsUrl = `wss://fstream.binance.com/ws/${cleanSym.toLowerCase()}@forceOrder`;
        this.wsLiquidation = new WebSocket(liqWsUrl);
        this.wsLiquidation.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.e === 'forceOrder' && data.o) {
              const o = data.o;
              this.handleLiveLiquidation(
                parseFloat(o.p),
                parseFloat(o.q),
                o.S as 'BUY' | 'SELL',
                data.E || Date.now()
              );
            }
          } catch (err) {
            console.error('Error parsing live liquidation', err);
          }
        };

        this.isLiveFeed = true;
      } catch (e) {
        console.warn('Live WebSocket connection failed, falling back to historical replay:', e);
        this.initializeSeedData();
        this.play();
      }
    } else {
      this.initializeSeedData();
      this.play();
    }
  }

  public disconnectLiveFeed() {
    this.isLiveFeed = false;
    if (this.wsTrade) {
      this.wsTrade.close();
      this.wsTrade = null;
    }
    if (this.wsDepth) {
      this.wsDepth.close();
      this.wsDepth = null;
    }
    if (this.wsLiquidation) {
      this.wsLiquidation.close();
      this.wsLiquidation = null;
    }
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private async fetchLiveSnapshot(symbol: string) {
    try {
      // Fetch recent real trades from Binance REST
      const tradesRes = await fetch(`https://api.binance.com/api/v3/trades?symbol=${symbol}&limit=60`);
      if (tradesRes.ok) {
        const rawTrades = await tradesRes.json();
        if (Array.isArray(rawTrades)) {
          for (const t of rawTrades) {
            const p = parseFloat(t.price);
            const qty = parseFloat(t.qty);
            const isBuy = !t.isBuyerMaker;
            this.handleLiveTrade(p, qty, isBuy, t.time, false);
          }
        }
      }

      // Fetch live real depth
      const depthRes = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=50`);
      if (depthRes.ok) {
        const rawDepth = await depthRes.json();
        if (rawDepth.bids && rawDepth.asks) {
          this.handleLiveDepth(rawDepth.bids, rawDepth.asks, Date.now());
        }
      }
    } catch (e) {
      console.warn('Failed to fetch live initial snapshot:', e);
      if (this.bubbles.length === 0) {
        this.initializeSeedData();
      }
    }
  }

  private handleLiveTrade(price: number, size: number, isAggressiveBuy: boolean, timestamp: number, shouldEmit: boolean = true) {
    this.currentPrice = this.bookEngine.roundPrice(price);
    this.currentTimestamp = timestamp;

    const askVol = isAggressiveBuy ? size : 0;
    const bidVol = isAggressiveBuy ? 0 : size;
    const delta = askVol - bidVol;

    this.cumulativeCVD += delta;
    this.sessionVolume += size;

    // Process into MBO book
    if (this.config.includeMBO) {
      this.bookEngine.processEvent({
        action: 'EXECUTE',
        side: isAggressiveBuy ? 'ASK' : 'BID',
        price: this.currentPrice,
        size,
        orderId: `live-exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp,
      });
    }

    // Footprint Bubble node aggregation
    const lastBubble = this.bubbles[this.bubbles.length - 1];
    if (lastBubble && Math.abs(lastBubble.price - this.currentPrice) < 0.001 && timestamp - lastBubble.timestamp < 2000) {
      lastBubble.totalVolume += size;
      lastBubble.askVolume += askVol;
      lastBubble.bidVolume += bidVol;
      lastBubble.delta = lastBubble.askVolume - lastBubble.bidVolume;
      lastBubble.tradeCount += 1;
      lastBubble.isBuyAggression = lastBubble.delta >= 0;
      if (lastBubble.totalVolume > 50) {
        lastBubble.label = `${lastBubble.totalVolume.toFixed(1)} (${lastBubble.tradeCount})`;
      }
    } else {
      this.bubbles.push({
        id: `bubble-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp,
        price: this.currentPrice,
        totalVolume: size,
        bidVolume: bidVol,
        askVolume: askVol,
        delta,
        tradeCount: 1,
        isBuyAggression: isAggressiveBuy,
        label: size > 20 ? `${size.toFixed(1)} (1)` : undefined,
      });
    }

    if (this.bubbles.length > 250) this.bubbles.shift();

    // CVD Point
    this.cvdHistory.push({
      timestamp,
      cvd: this.cumulativeCVD,
      sessionVolume: this.sessionVolume,
      delta,
      isPositive: this.cumulativeCVD >= 0,
    });
    if (this.cvdHistory.length > 250) this.cvdHistory.shift();

    // Candlestick aggregation
    this.updateCandle(timestamp, this.currentPrice, size, isAggressiveBuy);

    // Volume Profile
    this.addToVolumeProfile(this.currentPrice, askVol, bidVol);

    // Market Profile TPO
    this.updateMarketProfile(this.currentPrice, size, isAggressiveBuy, timestamp);

    if (shouldEmit) {
      this.emitFrame(size, isAggressiveBuy, bidVol, askVol);
    }
  }

  private handleLiveDepth(bids: Array<[string, string] | [number, number]>, asks: Array<[string, string] | [number, number]>, timestamp: number) {
    const sliceMap = new Map<number, number>();

    for (const [pStr, vStr] of bids) {
      const p = this.bookEngine.roundPrice(typeof pStr === 'number' ? pStr : parseFloat(pStr));
      const v = typeof vStr === 'number' ? vStr : parseFloat(vStr);
      sliceMap.set(p, v);

      this.bookEngine.processEvent({
        action: 'ADD',
        side: 'BID',
        price: p,
        size: v,
        orderId: `live-bid-${p}`,
        timestamp,
      });
    }

    for (const [pStr, vStr] of asks) {
      const p = this.bookEngine.roundPrice(typeof pStr === 'number' ? pStr : parseFloat(pStr));
      const v = typeof vStr === 'number' ? vStr : parseFloat(vStr);
      sliceMap.set(p, v);

      this.bookEngine.processEvent({
        action: 'ADD',
        side: 'ASK',
        price: p,
        size: v,
        orderId: `live-ask-${p}`,
        timestamp,
      });
    }

    this.heatmapSlices.push({ timestamp, levels: sliceMap });
    if (this.heatmapSlices.length > 180) this.heatmapSlices.shift();

    this.emitFrame();
  }

  // --- Replay / Fallback Simulation Mode ---

  private initializeSeedData() {
    this.bookEngine.clear();
    this.bubbles = [];
    this.cvdHistory = [];
    this.volumeProfileLevels.clear();
    this.heatmapSlices = [];
    this.cumulativeCVD = 0;
    this.sessionVolume = 0;

    const basePrice = this.currentPrice;
    let runningPrice = basePrice;
    const now = Date.now();
    const numInitialCandles = 60;

    const depthLevels = 40;
    for (let i = 0; i < numInitialCandles; i++) {
      const sliceTime = now - (numInitialCandles - i) * 15000;
      const sliceMap = new Map<number, number>();

      for (let d = -depthLevels; d <= depthLevels; d++) {
        const p = this.bookEngine.roundPrice(basePrice + d * this.tickSize);
        let vol = Math.floor(Math.random() * 80) + 10;
        if (d === 12 || d === -18 || d === 24 || d === -8) {
          vol = Math.floor(Math.random() * 400) + 300;
        }
        sliceMap.set(p, vol);

        if (d < 0) {
          this.bookEngine.processEvent({
            action: 'ADD',
            side: 'BID',
            price: p,
            size: vol,
            orderId: `seed-bid-${d}-${i}`,
            timestamp: sliceTime,
          });
        } else if (d > 0) {
          this.bookEngine.processEvent({
            action: 'ADD',
            side: 'ASK',
            price: p,
            size: vol,
            orderId: `seed-ask-${d}-${i}`,
            timestamp: sliceTime,
          });
        }
      }

      this.heatmapSlices.push({ timestamp: sliceTime, levels: sliceMap });

      const priceDelta = (Math.random() - 0.48) * this.tickSize * 2;
      runningPrice = this.bookEngine.roundPrice(runningPrice + priceDelta);
      const isAggressiveBuy = Math.random() > 0.48;
      const tradeVol = Math.floor(Math.random() * 150) + 20;
      const askVol = isAggressiveBuy ? Math.floor(tradeVol * 0.75) : Math.floor(tradeVol * 0.25);
      const bidVol = tradeVol - askVol;
      const delta = askVol - bidVol;

      this.cumulativeCVD += delta;
      this.sessionVolume += tradeVol;

      this.bubbles.push({
        id: `seed-bubble-${i}`,
        timestamp: sliceTime,
        price: runningPrice,
        totalVolume: tradeVol,
        bidVolume: bidVol,
        askVolume: askVol,
        delta,
        tradeCount: Math.floor(Math.random() * 8) + 1,
        isBuyAggression: isAggressiveBuy,
        label: tradeVol > 120 ? `${tradeVol} (1)` : undefined,
      });

      this.cvdHistory.push({
        timestamp: sliceTime,
        cvd: this.cumulativeCVD,
        sessionVolume: this.sessionVolume,
        delta,
        isPositive: this.cumulativeCVD >= 0,
      });

      this.updateCandle(sliceTime, runningPrice, tradeVol, isAggressiveBuy);
      this.addToVolumeProfile(runningPrice, askVol, bidVol);
    }

    this.currentPrice = runningPrice;
  }

  private addToVolumeProfile(price: number, buyVol: number, sellVol: number) {
    const existing = this.volumeProfileLevels.get(price) || {
      price,
      buyVolume: 0,
      sellVolume: 0,
      totalVolume: 0,
      delta: 0,
    };
    existing.buyVolume += buyVol;
    existing.sellVolume += sellVol;
    existing.totalVolume += buyVol + sellVol;
    existing.delta = existing.buyVolume - existing.sellVolume;
    this.volumeProfileLevels.set(price, existing);
  }

  private computeVolumeProfileData(): VolumeProfileData {
    const levels = Array.from(this.volumeProfileLevels.values()).sort((a, b) => b.price - a.price);
    let totalVol = 0;
    let totalDelta = 0;
    let pocPrice = this.currentPrice;
    let maxVol = 0;

    for (const lvl of levels) {
      totalVol += lvl.totalVolume;
      totalDelta += lvl.delta;
      if (lvl.totalVolume > maxVol) {
        maxVol = lvl.totalVolume;
        pocPrice = lvl.price;
      }
    }

    const targetValueAreaVol = totalVol * 0.68;
    let accumulatedVol = maxVol;
    let vahPrice = pocPrice;
    let valPrice = pocPrice;

    const pocIdx = levels.findIndex((l) => l.price === pocPrice);
    let upperIdx = pocIdx - 1;
    let lowerIdx = pocIdx + 1;

    while (accumulatedVol < targetValueAreaVol && (upperIdx >= 0 || lowerIdx < levels.length)) {
      const upperVol = upperIdx >= 0 ? levels[upperIdx].totalVolume : -1;
      const lowerVol = lowerIdx < levels.length ? levels[lowerIdx].totalVolume : -1;

      if (upperVol >= lowerVol && upperIdx >= 0) {
        accumulatedVol += levels[upperIdx].totalVolume;
        vahPrice = levels[upperIdx].price;
        upperIdx--;
      } else if (lowerIdx < levels.length) {
        accumulatedVol += levels[lowerIdx].totalVolume;
        valPrice = levels[lowerIdx].price;
        lowerIdx++;
      } else if (upperIdx >= 0) {
        accumulatedVol += levels[upperIdx].totalVolume;
        vahPrice = levels[upperIdx].price;
        upperIdx--;
      }
    }

    return {
      levels,
      pocPrice,
      pocVolume: maxVol,
      vahPrice,
      valPrice,
      totalVolume: totalVol,
      totalDelta,
    };
  }

  public play() {
    if (this.isRunning) return;
    this.isRunning = true;

    const intervalMs = Math.max(16, Math.floor(250 / Math.sqrt(this.config.speedMultiplier)));

    this.timerId = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  public pause() {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public reset() {
    this.pause();
    this.currentTimestamp = Date.now() - 3600 * 1000;
    this.initializeSeedData();
    this.emitFrame();
  }

  private tick() {
    const timeIncrement = Math.floor(200 * (this.config.speedMultiplier / 10));
    this.currentTimestamp += timeIncrement;

    const rnd = Math.random();
    let priceMove = 0;
    if (rnd > 0.65) {
      priceMove = this.tickSize;
    } else if (rnd < 0.35) {
      priceMove = -this.tickSize;
    }

    this.currentPrice = this.bookEngine.roundPrice(this.currentPrice + priceMove);

    const isAggressiveBuy = Math.random() > 0.49;
    const tradeSize = Math.floor(Math.random() * 80) + 5;
    const askVol = isAggressiveBuy ? Math.floor(tradeSize * 0.8) : Math.floor(tradeSize * 0.2);
    const bidVol = tradeSize - askVol;
    const delta = askVol - bidVol;

    this.cumulativeCVD += delta;
    this.sessionVolume += tradeSize;

    if (this.config.includeMBO) {
      const execEvent: MBOEvent = {
        action: 'EXECUTE',
        side: isAggressiveBuy ? 'ASK' : 'BID',
        price: this.currentPrice,
        size: tradeSize,
        orderId: `mbo-exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: this.currentTimestamp,
      };
      this.bookEngine.processEvent(execEvent);
    }

    const lastBubble = this.bubbles[this.bubbles.length - 1];
    if (lastBubble && Math.abs(lastBubble.price - this.currentPrice) < 0.001 && this.currentTimestamp - lastBubble.timestamp < 3000) {
      lastBubble.totalVolume += tradeSize;
      lastBubble.askVolume += askVol;
      lastBubble.bidVolume += bidVol;
      lastBubble.delta = lastBubble.askVolume - lastBubble.bidVolume;
      lastBubble.tradeCount += 1;
      lastBubble.isBuyAggression = lastBubble.delta >= 0;
      if (lastBubble.totalVolume > 150) {
        lastBubble.label = `${lastBubble.totalVolume} (${lastBubble.tradeCount})`;
      }
    } else {
      this.bubbles.push({
        id: `bubble-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: this.currentTimestamp,
        price: this.currentPrice,
        totalVolume: tradeSize,
        bidVolume: bidVol,
        askVolume: askVol,
        delta,
        tradeCount: 1,
        isBuyAggression: isAggressiveBuy,
        label: tradeSize > 120 ? `${tradeSize} (1)` : undefined,
      });
    }

    if (this.bubbles.length > 250) this.bubbles.shift();

    this.cvdHistory.push({
      timestamp: this.currentTimestamp,
      cvd: this.cumulativeCVD,
      sessionVolume: this.sessionVolume,
      delta,
      isPositive: this.cumulativeCVD >= 0,
    });
    if (this.cvdHistory.length > 250) this.cvdHistory.shift();

    const currentSlice = this.bookEngine.getHeatmapSlice();
    this.heatmapSlices.push({
      timestamp: this.currentTimestamp,
      levels: currentSlice,
    });
    if (this.heatmapSlices.length > 180) this.heatmapSlices.shift();

    // Candlestick aggregation
    this.updateCandle(this.currentTimestamp, this.currentPrice, tradeSize, isAggressiveBuy);

    this.addToVolumeProfile(this.currentPrice, askVol, bidVol);
    this.emitFrame(tradeSize, isAggressiveBuy, bidVol, askVol);
  }

  private updateCandle(timestamp: number, price: number, size: number, isAggressiveBuy: boolean) {
    const bucketMs = 15000;
    const bucketTime = Math.floor(timestamp / bucketMs) * bucketMs;
    const lastCandle = this.candles[this.candles.length - 1];

    if (lastCandle && lastCandle.timestamp === bucketTime) {
      lastCandle.high = Math.max(lastCandle.high, price);
      lastCandle.low = Math.min(lastCandle.low, price);
      lastCandle.close = price;
      lastCandle.volume += size;
      if (isAggressiveBuy) {
        lastCandle.buyVolume = (lastCandle.buyVolume || 0) + size;
      } else {
        lastCandle.sellVolume = (lastCandle.sellVolume || 0) + size;
      }
    } else {
      const openPrice = lastCandle ? lastCandle.close : price;
      this.candles.push({
        timestamp: bucketTime,
        open: openPrice,
        high: Math.max(openPrice, price),
        low: Math.min(openPrice, price),
        close: price,
        volume: size,
        buyVolume: isAggressiveBuy ? size : 0,
        sellVolume: isAggressiveBuy ? 0 : size,
      });
    }

    if (this.candles.length > 250) {
      this.candles.shift();
    }
  }

  private handleLiveLiquidation(price: number, size: number, side: 'BUY' | 'SELL', timestamp: number) {
    this.liquidations.push({ timestamp, price, volume: size, side });
    if (this.liquidations.length > 100) this.liquidations.shift();

    if (side === 'SELL') {
      this.currentCumulativeLongLiq += size;
    } else {
      this.currentCumulativeShortLiq += size;
    }

    this.cumulativeLiquidations.push({
      timestamp,
      longVol: this.currentCumulativeLongLiq,
      shortVol: this.currentCumulativeShortLiq,
    });
    if (this.cumulativeLiquidations.length > 250) this.cumulativeLiquidations.shift();

    this.emitFrame();
  }

  // ============================================================
  // Market Profile: TPO Accumulation & Computation
  // ============================================================

  private updateMarketProfile(price: number, size: number, isAggressiveBuy: boolean, timestamp: number) {
    const periodMs = 30 * 60 * 1000; // 30-minute TPO periods
    const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

    // Set session open price on first trade
    if (this.mpOpenPrice === 0) {
      this.mpOpenPrice = price;
      this.mpSessionStart = timestamp;
      this.mpLastLetterTimestamp = timestamp;
    }

    // Advance TPO letter if a new period has started
    const elapsedSinceLetterStart = timestamp - this.mpLastLetterTimestamp;
    if (elapsedSinceLetterStart >= periodMs) {
      const periodsAdvanced = Math.floor(elapsedSinceLetterStart / periodMs);
      this.mpCurrentLetterIndex = (this.mpCurrentLetterIndex + periodsAdvanced) % LETTERS.length;
      this.mpLastLetterTimestamp += periodsAdvanced * periodMs;
      this.mpIBPeriodsElapsed += periodsAdvanced;
    }

    const currentLetter = LETTERS[this.mpCurrentLetterIndex];

    // Aggregate price to configurable bucket size
    const bucketSize = this.tickSize * this.mpPriceAggregation;
    const bucketPrice = Math.round(price / bucketSize) * bucketSize;

    // Record TPO letter at this price level
    if (!this.mpTPOMap.has(bucketPrice)) {
      this.mpTPOMap.set(bucketPrice, new Set<string>());
    }
    this.mpTPOMap.get(bucketPrice)!.add(currentLetter);

    // Accumulate buy/sell volume
    if (!this.mpVolByPrice.has(bucketPrice)) {
      this.mpVolByPrice.set(bucketPrice, { buy: 0, sell: 0 });
    }
    const volEntry = this.mpVolByPrice.get(bucketPrice)!;
    if (isAggressiveBuy) {
      volEntry.buy += size;
    } else {
      volEntry.sell += size;
    }

    // Track Initial Balance (first 2 periods = first 60 min)
    if (this.mpIBPeriodsElapsed < 2) {
      if (price > this.mpIBHigh) this.mpIBHigh = price;
      if (price < this.mpIBLow) this.mpIBLow = price;
    }
  }

  private computeMarketProfileData(): MarketProfileData {
    const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
    const currentLetter = LETTERS[this.mpCurrentLetterIndex];

    // Build sorted array of levels
    const priceLevels: { price: number; tpoCount: number; letters: string[]; buy: number; sell: number }[] = [];
    let totalTPOCount = 0;

    for (const [price, letterSet] of this.mpTPOMap.entries()) {
      const letters = Array.from(letterSet).sort();
      const vol = this.mpVolByPrice.get(price) || { buy: 0, sell: 0 };
      priceLevels.push({
        price,
        tpoCount: letters.length,
        letters,
        buy: vol.buy,
        sell: vol.sell,
      });
      totalTPOCount += letters.length;
    }

    // Sort by price descending (high to low)
    priceLevels.sort((a, b) => b.price - a.price);

    // Find POC (price with most TPO blocks)
    let pocPrice = this.currentPrice;
    let pocTPOCount = 0;
    let pocVolume = 0;
    for (const lvl of priceLevels) {
      if (lvl.tpoCount > pocTPOCount) {
        pocTPOCount = lvl.tpoCount;
        pocPrice = lvl.price;
        pocVolume = lvl.buy + lvl.sell;
      }
    }

    // Compute Value Area (70% of total TPO blocks, expanding symmetrically from POC)
    const vaTargetCount = Math.ceil(totalTPOCount * 0.70);
    let vaCount = pocTPOCount;
    let vahPrice = pocPrice;
    let valPrice = pocPrice;

    const pocIdx = priceLevels.findIndex(l => l.price === pocPrice);
    let upperIdx = pocIdx - 1; // higher prices are at lower indices (sorted desc)
    let lowerIdx = pocIdx + 1;

    while (vaCount < vaTargetCount && (upperIdx >= 0 || lowerIdx < priceLevels.length)) {
      const upperCount = upperIdx >= 0 ? priceLevels[upperIdx].tpoCount : 0;
      const lowerCount = lowerIdx < priceLevels.length ? priceLevels[lowerIdx].tpoCount : 0;

      if (upperCount >= lowerCount && upperIdx >= 0) {
        vaCount += upperCount;
        vahPrice = priceLevels[upperIdx].price;
        upperIdx--;
      } else if (lowerIdx < priceLevels.length) {
        vaCount += lowerCount;
        valPrice = priceLevels[lowerIdx].price;
        lowerIdx++;
      } else {
        break;
      }
    }

    // Build the output levels with isInsideVA flag
    const levels: MarketProfileTPOLevel[] = priceLevels.map(lvl => ({
      price: lvl.price,
      letters: lvl.letters,
      buyVolume: lvl.buy,
      sellVolume: lvl.sell,
      totalVolume: lvl.buy + lvl.sell,
      isInsideVA: lvl.price >= valPrice && lvl.price <= vahPrice,
    }));

    return {
      levels,
      pocPrice,
      pocVolume,
      vahPrice,
      valPrice,
      ibHigh: this.mpIBHigh === 0 ? this.currentPrice : this.mpIBHigh,
      ibLow: this.mpIBLow === Infinity ? this.currentPrice : this.mpIBLow,
      openPrice: this.mpOpenPrice || this.currentPrice,
      closePrice: this.currentPrice,
      currentLetter,
      sessionStart: this.mpSessionStart,
      totalTPOCount,
    };
  }

  private emitFrame(tradeSize: number = 0, isAggressiveBuy: boolean = true, bidVol: number = 0, askVol: number = 0) {
    const bb = this.bookEngine.getBestBid() || this.currentPrice - this.tickSize;
    const ba = this.bookEngine.getBestAsk() || this.currentPrice + this.tickSize;

    const tick: TradeTick = {
      id: `tick-${Date.now()}`,
      timestamp: this.currentTimestamp,
      price: this.currentPrice,
      size: tradeSize,
      side: isAggressiveBuy ? 'BUY' : 'SELL',
      isAggressiveBuy,
      bidVol,
      askVol,
    };

    const frameData: ReplayFrameData = {
      timestamp: this.currentTimestamp,
      currentPrice: this.currentPrice,
      bestBid: bb,
      bestAsk: ba,
      tick,
      bubbles: this.bubbles,
      candles: this.candles,
      cvdHistory: this.cvdHistory,
      volumeProfile: this.computeVolumeProfileData(),
      heatmapSlices: this.heatmapSlices,
      mboBook: this.bookEngine,
      isLiveFeed: this.isLiveFeed,
      liquidations: this.liquidations,
      cumulativeLiquidations: this.cumulativeLiquidations,
      marketProfile: this.computeMarketProfileData(),
    };

    for (const listener of this.listeners) {
      listener(frameData);
    }
  }
}
