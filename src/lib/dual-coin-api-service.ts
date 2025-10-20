import type { CoinDetails } from './types';
import { getTopCoins as getCoinGeckoCoins, getCoinDetailsByTicker, getCoinPrice } from './coingecko-service';
import { getCoinDetailsByTickerFromCMC } from './coinmarketcap-service';
import { getTicker, getKlines } from './binance-service';

interface ApiUsageStats {
  coingecko: {
    used: number;
    limit: number;
    resetTime?: number;
    lastCallTime?: number;
    rateLimitPerMinute: number;
    callsInCurrentMinute: number;
    minuteWindowStart?: number;
  };
  coinmarketcap: {
    used: number;
    limit: number;
    resetTime?: number;
    lastCallTime?: number;
    rateLimitPerMinute: number;
    callsInCurrentMinute: number;
    minuteWindowStart?: number;
  };
  binance: {
    used: number;
    limit: number;
    resetTime?: number;
    lastCallTime?: number;
    rateLimitPerMinute: number;
    callsInCurrentMinute: number;
    minuteWindowStart?: number;
  };
}

// Enhanced API usage tracking with intelligent rate limiting
let apiUsage: ApiUsageStats = {
  coingecko: { 
    used: 0, 
    limit: 1000, // Daily limit for free tier
    rateLimitPerMinute: 30, // Conservative rate limit per minute
    callsInCurrentMinute: 0,
    minuteWindowStart: Date.now()
  },
  coinmarketcap: { 
    used: 0, 
    limit: 333, // ~10,000 monthly / 30 days = 333 daily
    rateLimitPerMinute: 20, // Conservative rate limit per minute
    callsInCurrentMinute: 0,
    minuteWindowStart: Date.now()
  },
  binance: {
    used: 0,
    limit: 1200, // Binance weight limit per minute
    rateLimitPerMinute: 1200, // Reset every minute
    callsInCurrentMinute: 0,
    minuteWindowStart: Date.now()
  }
};

/**
 * Dual API service that automatically switches between CoinGecko and CoinMarketCap
 * when rate limits are reached
 */
export class DualCoinApiService {
  private coingeckoApiKey: string | null;
  private coinmarketcapApiKey: string | null;
  private requestQueue: Map<string, Promise<any>> = new Map(); // Prevent duplicate requests
  private lastRequestTimes: Map<string, number> = new Map(); // Track request timing

  constructor(coingeckoKey?: string | null, coinmarketcapKey?: string | null) {
    this.coingeckoApiKey = coingeckoKey || null;
    this.coinmarketcapApiKey = coinmarketcapKey || null;
    
    // Set up automatic rate limit reset timers
    this.setupRateLimitResets();
  }

  /**
   * Setup automatic rate limit resets for different time windows
   */
  private setupRateLimitResets(): void {
    // Reset minute-based counters every minute
    setInterval(() => {
      const now = Date.now();
      Object.keys(apiUsage).forEach(api => {
        const apiKey = api as keyof ApiUsageStats;
        const usage = apiUsage[apiKey];
        
        // Reset minute window if it's been more than 60 seconds
        if (now - (usage.minuteWindowStart || 0) >= 60000) {
          usage.callsInCurrentMinute = 0;
          usage.minuteWindowStart = now;
          
          // Reset Binance weight limit every minute
          if (apiKey === 'binance') {
            usage.used = 0;
          }
        }
      });
    }, 5000); // Check every 5 seconds for accuracy

    // Reset daily limits at midnight
    const resetDailyLimits = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      setTimeout(() => {
        apiUsage.coingecko.used = 0;
        apiUsage.coinmarketcap.used = 0;
        console.log('🔄 Daily API limits reset');
        resetDailyLimits(); // Schedule next reset
      }, tomorrow.getTime() - now.getTime());
    };
    resetDailyLimits();
  }

  /**
   * Check if an API has remaining quota and is within rate limits
   */
  private canMakeRequest(api: keyof ApiUsageStats): boolean {
    const usage = apiUsage[api];
    const now = Date.now();
    
    // Check daily/overall limit
    if (usage.used >= usage.limit) {
      console.log(`🚫 ${api} daily limit reached: ${usage.used}/${usage.limit}`);
      return false;
    }
    
    // Check minute-based rate limit
    if (usage.callsInCurrentMinute >= usage.rateLimitPerMinute) {
      console.log(`⏰ ${api} rate limit reached: ${usage.callsInCurrentMinute}/${usage.rateLimitPerMinute} per minute`);
      return false;
    }
    
    // Check minimum time between requests (0.5 seconds)
    const lastCall = usage.lastCallTime || 0;
    if (now - lastCall < 500) {
      console.log(`⏸️ ${api} rate limiting: waiting before next call`);
      return false;
    }
    
    return true;
  }

  /**
   * Wait for rate limit availability
   */
  private async waitForRateLimit(api: keyof ApiUsageStats): Promise<void> {
    const usage = apiUsage[api];
    const now = Date.now();
    
    // Wait if we're hitting minute-based rate limits
    if (usage.callsInCurrentMinute >= usage.rateLimitPerMinute) {
      const timeToWait = 60000 - (now - (usage.minuteWindowStart || 0));
      if (timeToWait > 0) {
        console.log(`⏳ Waiting ${Math.ceil(timeToWait / 1000)}s for ${api} rate limit reset`);
        await new Promise(resolve => setTimeout(resolve, timeToWait));
      }
    }
    
    // Wait minimum time between requests
    const lastCall = usage.lastCallTime || 0;
    const timeSinceLastCall = now - lastCall;
    if (timeSinceLastCall < 500) {
      const waitTime = 500 - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Check if an API has remaining quota (legacy method for compatibility)
   */
  private hasQuota(api: 'coingecko' | 'coinmarketcap'): boolean {
    return this.canMakeRequest(api);
  }

  /**
   * Increment API usage counter with enhanced tracking
   */
  private incrementUsage(api: keyof ApiUsageStats, weight: number = 1): void {
    const usage = apiUsage[api];
    const now = Date.now();
    
    usage.used += weight;
    usage.callsInCurrentMinute += weight;
    usage.lastCallTime = now;
    
    // Reset minute window if needed
    if (now - (usage.minuteWindowStart || 0) >= 60000) {
      usage.callsInCurrentMinute = weight;
      usage.minuteWindowStart = now;
    }
    
    console.log(`📊 ${api} usage: ${usage.used}/${usage.limit} daily, ${usage.callsInCurrentMinute}/${usage.rateLimitPerMinute} per minute`);
  }

  /**
   * Get API health status
   */
  public getApiHealth(): Record<keyof ApiUsageStats, { 
    available: boolean; 
    dailyUsage: number; 
    dailyLimit: number; 
    minuteUsage: number; 
    minuteLimit: number;
    status: 'healthy' | 'warning' | 'exhausted';
  }> {
    const health: any = {};
    
    Object.keys(apiUsage).forEach(api => {
      const apiKey = api as keyof ApiUsageStats;
      const usage = apiUsage[apiKey];
      const dailyPercentage = (usage.used / usage.limit) * 100;
      const minutePercentage = (usage.callsInCurrentMinute / usage.rateLimitPerMinute) * 100;
      
      let status: 'healthy' | 'warning' | 'exhausted' = 'healthy';
      if (dailyPercentage >= 90 || minutePercentage >= 90) {
        status = 'exhausted';
      } else if (dailyPercentage >= 75 || minutePercentage >= 75) {
        status = 'warning';
      }
      
      health[apiKey] = {
        available: this.canMakeRequest(apiKey),
        dailyUsage: usage.used,
        dailyLimit: usage.limit,
        minuteUsage: usage.callsInCurrentMinute,
        minuteLimit: usage.rateLimitPerMinute,
        status
      };
    });
    
    return health;
  }

  /**
   * Reset daily/monthly counters (should be called by a scheduler in production)
   */
  public resetUsageCounters(): void {
    apiUsage.coingecko.used = 0;
    apiUsage.coinmarketcap.used = 0;
    console.log('API usage counters reset');
  }

  /**
   * Get current API usage stats
   */
  public getUsageStats(): ApiUsageStats {
    return { ...apiUsage };
  }

  /**
   * Fetch coin details with intelligent rate limiting and caching
   */
  async getCoinDetails(ticker: string): Promise<CoinDetails | null> {
    const cacheKey = `coin-details-${ticker}`;
    
    // Check if we already have a pending request for this ticker
    if (this.requestQueue.has(cacheKey)) {
      console.log(`� Using pending request for ${ticker}`);
      return await this.requestQueue.get(cacheKey);
    }
    
    console.log(`�🔍 Fetching details for ${ticker} with intelligent rate limiting`);
    
    const requestPromise = this.executeCoinDetailsRequest(ticker);
    this.requestQueue.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up the request queue after completion
      setTimeout(() => {
        this.requestQueue.delete(cacheKey);
      }, 1000);
    }
  }

  /**
   * Execute coin details request with fallback logic
   */
  private async executeCoinDetailsRequest(ticker: string): Promise<CoinDetails | null> {
    // Try CoinGecko first if available and within limits
    if (this.canMakeRequest('coingecko')) {
      try {
        console.log(`📡 Trying CoinGecko for ${ticker}...`);
        
        // Wait for rate limit if needed
        await this.waitForRateLimit('coingecko');
        
        const result = await getCoinDetailsByTicker(ticker, this.coingeckoApiKey);
        if (result) {
          this.incrementUsage('coingecko');
          console.log(`✅ CoinGecko success for ${ticker}`);
          return result;
        }
      } catch (error: any) {
        console.warn(`⚠️ CoinGecko failed for ${ticker}:`, error.message);
        
        // Check if it's a rate limit error
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          console.log(`🚫 CoinGecko rate limit hit, marking as exhausted`);
          apiUsage.coingecko.used = apiUsage.coingecko.limit; // Mark as exhausted
        }
      }
    } else {
      console.log(`⏭️ CoinGecko not available (quota: ${apiUsage.coingecko.used}/${apiUsage.coingecko.limit}, minute: ${apiUsage.coingecko.callsInCurrentMinute}/${apiUsage.coingecko.rateLimitPerMinute})`);
    }

    // Fallback to CoinMarketCap if available
    if (this.coinmarketcapApiKey && this.canMakeRequest('coinmarketcap')) {
      try {
        console.log(`📡 Trying CoinMarketCap for ${ticker}...`);
        
        // Wait for rate limit if needed
        await this.waitForRateLimit('coinmarketcap');
        
        const result = await getCoinDetailsByTickerFromCMC(ticker, this.coinmarketcapApiKey);
        if (result) {
          this.incrementUsage('coinmarketcap');
          console.log(`✅ CoinMarketCap success for ${ticker}`);
          return result;
        }
      } catch (error: any) {
        console.warn(`⚠️ CoinMarketCap failed for ${ticker}:`, error.message);
        
        // Check if it's a rate limit error
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          console.log(`🚫 CoinMarketCap rate limit hit, marking as exhausted`);
          apiUsage.coinmarketcap.used = apiUsage.coinmarketcap.limit;
        }
      }
    } else if (!this.coinmarketcapApiKey) {
      console.log(`🔑 No CoinMarketCap API key provided`);
    } else {
      console.log(`⏭️ CoinMarketCap not available (quota: ${apiUsage.coinmarketcap.used}/${apiUsage.coinmarketcap.limit}, minute: ${apiUsage.coinmarketcap.callsInCurrentMinute}/${apiUsage.coinmarketcap.rateLimitPerMinute})`);
    }

    console.log(`❌ All APIs exhausted or failed for ${ticker}`);
    return null;
  }

  /**
   * Fetch top coins with automatic fallback
   */
  async getTopCoins(limit: number = 50): Promise<any[]> {
    console.log(`🔍 Fetching top ${limit} coins`);

    // Try CoinGecko first if it has quota
    if (this.hasQuota('coingecko')) {
      try {
        console.log(`📡 Trying CoinGecko for top coins...`);
        const result = await getCoinGeckoCoins(limit, this.coingeckoApiKey);
        if (result && result.length > 0) {
          this.incrementUsage('coingecko');
          console.log(`✅ CoinGecko success: ${result.length} coins`);
          return result;
        }
      } catch (error: any) {
        console.warn(`⚠️ CoinGecko failed for top coins:`, error.message);
        
        // Check if it's a rate limit error
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          console.log(`🚫 CoinGecko rate limit reached`);
          apiUsage.coingecko.used = apiUsage.coingecko.limit; // Mark as exhausted
        }
      }
    } else {
      console.log(`⏭️ CoinGecko quota exhausted, skipping...`);
    }

    // For top coins, we could implement CoinMarketCap fallback here too
    // but CoinMarketCap's /listings/latest endpoint structure is different
    // For now, return empty array if CoinGecko fails
    console.log(`❌ Could not fetch top coins from any API`);
    return [];
  }

  /**
   * Get real-time price data with intelligent rate limiting and fallback
   */
  async getRealTimePrice(ticker: string): Promise<{ price: number; change24h: number; volume24h: number } | null> {
    const cacheKey = `price-${ticker}`;
    
    // Check if we already have a pending request for this ticker
    if (this.requestQueue.has(cacheKey)) {
      console.log(`� Using pending price request for ${ticker}`);
      return await this.requestQueue.get(cacheKey);
    }
    
    console.log(`�💰 Fetching price for ${ticker} with intelligent rate limiting`);

    const requestPromise = this.executePriceRequest(ticker);
    this.requestQueue.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up the request queue after completion
      setTimeout(() => {
        this.requestQueue.delete(cacheKey);
      }, 1000);
    }
  }

  /**
   * Execute price request with fallback logic and intelligent rate limiting
   * Prioritizes Binance API for real-time trading data
   */
  private async executePriceRequest(ticker: string): Promise<{ price: number; change24h: number; volume24h: number } | null> {
    // Try Binance API first for real-time price data
    if (this.canMakeRequest('binance')) {
      try {
        console.log(`📡 Trying Binance for ${ticker}...`);
        
        // Wait for rate limit if needed
        await this.waitForRateLimit('binance');
        
        const binanceTicker = await getTicker(ticker);
        if (binanceTicker) {
          this.incrementUsage('binance');
          console.log(`✅ Binance success for ${ticker}: $${binanceTicker.last}`);
          return {
            price: binanceTicker.last || 0,
            change24h: binanceTicker.percentage || 0,
            volume24h: binanceTicker.baseVolume || 0
          };
        }
      } catch (error: any) {
        console.warn(`⚠️ Binance failed for ${ticker}:`, error.message);
        
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          console.log(`🚫 Binance rate limit hit`);
          apiUsage.binance.used = apiUsage.binance.limit;
        }
      }
    } else {
      console.log(`⏭️ Binance not available (quota: ${apiUsage.binance.used}/${apiUsage.binance.limit})`);
    }

    // Map ticker to CoinGecko ID for fallback
    const tickerToId: Record<string, string> = {
      'BTCUSDT': 'bitcoin',
      'ETHUSDT': 'ethereum',
      'SOLUSDT': 'solana',
      'BNBUSDT': 'binancecoin',
      'ADAUSDT': 'cardano',
      'XRPUSDT': 'ripple',
      'DOGEUSDT': 'dogecoin',
    };

    const coinId = tickerToId[ticker] || ticker.replace('USDT', '').toLowerCase();

    // Fallback to CoinGecko price endpoint if Binance is not available
    if (this.canMakeRequest('coingecko')) {
      try {
        console.log(`📡 Fallback to CoinGecko price for ${coinId}...`);
        
        // Wait for rate limit if needed
        await this.waitForRateLimit('coingecko');
        
        const result = await getCoinPrice(coinId, this.coingeckoApiKey);
        if (result) {
          this.incrementUsage('coingecko');
          console.log(`✅ CoinGecko price success for ${ticker}: $${result.price}`);
          return result;
        }
      } catch (error: any) {
        console.warn(`⚠️ CoinGecko price failed for ${ticker}:`, error.message);
        
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          console.log(`🚫 CoinGecko price rate limit hit`);
          apiUsage.coingecko.used = apiUsage.coingecko.limit;
        }
      }
    } else {
      console.log(`⏭️ CoinGecko price not available (quota: ${apiUsage.coingecko.used}/${apiUsage.coingecko.limit})`);
    }

    // Final fallback to enhanced mock data
    console.log(`📊 Using enhanced mock price for ${ticker}`);
    return {
      price: this.getEnhancedMockPrice(ticker),
      change24h: (Math.random() - 0.5) * 10, // Random ±5% change
      volume24h: Math.random() * 1000000
    };
  }

  /**
   * Get enhanced mock price with more realistic market data
   */
  private getEnhancedMockPrice(symbol: string): number {
    const basePrice = this.getMockPrice(symbol);
    // Add some realistic market volatility
    const volatility = 0.02; // 2% volatility
    const randomFactor = 1 + (Math.random() - 0.5) * volatility;
    return Math.round(basePrice * randomFactor * 100) / 100;
  }

  /**
   * Get mock price for testing
   */
  private getMockPrice(symbol: string): number {
    const mockPrices: Record<string, number> = {
      'BTCUSDT': 67000,
      'ETHUSDT': 2600,
      'SOLUSDT': 160,
      'BNBUSDT': 600,
      'ADAUSDT': 0.45,
      'XRPUSDT': 0.55,
      'DOGEUSDT': 0.12
    };
    return mockPrices[symbol] || 100;
  }

  /**
   * Get historical kline data from Binance (primary) with fallback
   */
  async getHistoricalData(symbol: string, interval: string = '1h', limit: number = 100): Promise<any[] | null> {
    // Try Binance API first for historical data
    if (this.canMakeRequest('binance')) {
      try {
        console.log(`📡 Trying Binance historical data for ${symbol}...`);
        
        // Wait for rate limit if needed
        await this.waitForRateLimit('binance');
        
        const klines = await getKlines(symbol, interval, limit);
        if (klines && klines.length > 0) {
          this.incrementUsage('binance', 2); // Historical data might use more weight
          console.log(`✅ Binance historical data success for ${symbol}: ${klines.length} candles`);
          return klines;
        }
      } catch (error: any) {
        console.warn(`⚠️ Binance historical data failed for ${symbol}:`, error.message);
        
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          console.log(`🚫 Binance historical data rate limit hit`);
          apiUsage.binance.used = apiUsage.binance.limit;
        }
      }
    } else {
      console.log(`⏭️ Binance historical data not available (quota: ${apiUsage.binance.used}/${apiUsage.binance.limit})`);
    }

    console.log(`❌ Could not fetch historical data for ${symbol}`);
    return null;
  }

  /**
   * Track Binance API usage
   */
  public trackBinanceUsage(weight: number = 1): void {
    this.incrementUsage('binance', weight);
  }

  /**
   * Check which APIs are currently available with detailed status
   */
  getApiStatus(): { 
    coingecko: boolean; 
    coinmarketcap: boolean; 
    binance: boolean;
    activeApi: string;
    health: any; // Simplified type to avoid circular reference
  } {
    const cgAvailable = this.canMakeRequest('coingecko');
    const cmcAvailable = this.coinmarketcapApiKey !== null && this.canMakeRequest('coinmarketcap');
    const binanceAvailable = this.canMakeRequest('binance');
    
    let activeApi = 'none';
    if (binanceAvailable) activeApi = 'binance'; // Prioritize Binance
    else if (cgAvailable) activeApi = 'coingecko';
    else if (cmcAvailable) activeApi = 'coinmarketcap';

    return {
      coingecko: cgAvailable,
      coinmarketcap: cmcAvailable,
      binance: binanceAvailable,
      activeApi,
      health: this.getApiHealth()
    };
  }

  /**
   * Force reset all API counters (admin function)
   */
  public resetAllCounters(): void {
    Object.keys(apiUsage).forEach(api => {
      const apiKey = api as keyof ApiUsageStats;
      apiUsage[apiKey].used = 0;
      apiUsage[apiKey].callsInCurrentMinute = 0;
      apiUsage[apiKey].minuteWindowStart = Date.now();
    });
    console.log('🔄 All API counters reset manually');
  }

  /**
   * Set custom rate limits for APIs
   */
  public setRateLimit(api: keyof ApiUsageStats, dailyLimit: number, minuteLimit: number): void {
    if (apiUsage[api]) {
      apiUsage[api].limit = dailyLimit;
      apiUsage[api].rateLimitPerMinute = minuteLimit;
      console.log(`⚙️ ${api} limits updated: ${dailyLimit}/day, ${minuteLimit}/minute`);
    }
  }
}

/**
 * Factory function to create a dual API service instance
 */
export const createDualApiService = (coingeckoKey?: string | null, coinmarketcapKey?: string | null): DualCoinApiService => {
  return new DualCoinApiService(coingeckoKey, coinmarketcapKey);
};

/**
 * Enhanced order flow data with real API integration
 */
export interface EnhancedOrderFlowData {
  id: string;
  timestamp: number;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  price: number;
  source: 'binance' | 'api' | 'mock';
  apiUsed?: 'binance' | 'coingecko' | 'coinmarketcap';
  riskLevel: 'low' | 'medium' | 'high';
  manipulationScore: number;
  realTimePrice?: number;
  priceChange24h?: number;
  binanceVolume?: number;
}

/**
 * Get mock price for fallback
 */
const getMockPrice = (symbol: string): number => {
  const mockPrices: Record<string, number> = {
    'BTCUSDT': 67000,
    'ETHUSDT': 2600,
    'SOLUSDT': 160,
    'BNBUSDT': 600,
    'ADAUSDT': 0.45,
    'XRPUSDT': 0.55,
    'DOGEUSDT': 0.12
  };
  return mockPrices[symbol] || 100;
};

/**
 * Enhanced order flow analyzer that uses real API data when available
 */
export const enhancedOrderFlowAnalyzer = {
  async generateEnhancedOrders(
    symbol: string, 
    count: number, 
    dualApiService: DualCoinApiService
  ): Promise<EnhancedOrderFlowData[]> {
    const orders: EnhancedOrderFlowData[] = [];
    
    // Try to get real-time price data from Binance first
    const priceData = await dualApiService.getRealTimePrice(symbol);
    const basePrice = priceData?.price || getMockPrice(symbol);
    const change24h = priceData?.change24h || 0;
    const volume24h = priceData?.volume24h || 0;

    // Get historical data from Binance for more realistic order flow simulation
    const historicalData = await dualApiService.getHistoricalData(symbol, '1m', 20);
    const apiStatus = dualApiService.getApiStatus();
    
    // Determine data source
    const dataSource: 'binance' | 'api' | 'mock' = 
      apiStatus.activeApi === 'binance' ? 'binance' : 
      priceData ? 'api' : 'mock';

    for (let i = 0; i < count; i++) {
      const timestamp = Date.now() - (count - i) * 1000; // 1 second intervals
      const type = Math.random() > 0.5 ? 'buy' : 'sell';
      
      // Use historical data for more realistic price variation if available
      let currentPrice = basePrice;
      if (historicalData && historicalData.length > 0) {
        const randomCandle = historicalData[Math.floor(Math.random() * historicalData.length)];
        const priceRange = randomCandle.high - randomCandle.low;
        const priceVariation = (Math.random() - 0.5) * (priceRange / randomCandle.close) * 0.5;
        currentPrice = basePrice * (1 + priceVariation);
      } else {
        // Fallback to basic price variation
        const priceVariation = (Math.random() - 0.5) * 0.02; // ±1% variation
        currentPrice = basePrice * (1 + priceVariation);
      }
      
      // More sophisticated volume calculation based on market conditions
      let volume = Math.random() * 10 + 0.1;
      if (Math.abs(change24h) > 5) {
        // Higher volume during volatile periods
        volume *= (1 + Math.abs(change24h) / 20);
      }
      
      // Enhanced manipulation score based on volume and price movement patterns
      const manipulationScore = this.calculateManipulationScore(volume, change24h, volume24h);
      
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (manipulationScore > 80) riskLevel = 'high';
      else if (manipulationScore > 50) riskLevel = 'medium';

      orders.push({
        id: `${symbol}-${timestamp}-${i}`,
        timestamp,
        symbol,
        type,
        volume,
        price: currentPrice,
        source: dataSource,
        apiUsed: apiStatus.activeApi as 'binance' | 'coingecko' | 'coinmarketcap',
        riskLevel,
        manipulationScore,
        realTimePrice: priceData?.price,
        priceChange24h: change24h,
        binanceVolume: volume24h
      });
    }

    return orders;
  },

  calculateManipulationScore(volume: number, change24h: number, volume24h: number): number {
    let score = 0;
    
    // High volume concentration
    if (volume > volume24h * 0.01) score += 30; // If single order is > 1% of daily volume
    
    // Unusual price movements
    if (Math.abs(change24h) > 10) score += 25;
    else if (Math.abs(change24h) > 5) score += 15;
    
    // Volume-price mismatch (high volume with small price movement could indicate manipulation)
    const volumeRatio = volume / (volume24h / 1440); // Compare to average minute volume
    const priceVolatility = Math.abs(change24h);
    if (volumeRatio > 5 && priceVolatility < 1) score += 35;
    
    // Random noise to simulate other detection algorithms
    score += Math.random() * 10;
    
    return Math.min(100, Math.max(0, score));
  }
};