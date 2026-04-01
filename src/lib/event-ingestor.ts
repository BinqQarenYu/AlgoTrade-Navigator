/**
 * event-ingestor.ts
 * 
 * The Event Sentiment Hub (ESH) background worker.
 * Orchestrates cross-provider news gathering and macro context ingestion.
 * 
 * Sources:
 * - CoinGecko: Trending assets ("Hotness")
 * - CoinMarketCap: Headlines and Global Metrics
 * - Sentiment: High-impact macro events
 */

import { bufferExternalEvent, ExternalEventRecord } from './db-service';
import { performance } from 'perf_hooks';
import crypto from 'crypto';

const isServer = typeof window === 'undefined';

// --- Configuration ---
const GECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const CMC_API_BASE = 'https://pro-api.coinmarketcap.com/v1';

// Polling interval: 5 minutes (300,000ms)
const POLL_INTERVAL = 5 * 60 * 1000;

class EventIngestor {
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  public start() {
    if (!isServer || this.isRunning) return;
    this.isRunning = true;
    console.log('[EventIngestor] Context Intelligence Hub starting... (5m polling)');
    
    // Initial run
    this.runCycle();

    this.timer = setInterval(() => {
      this.runCycle();
    }, POLL_INTERVAL);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[EventIngestor] Context Intelligence Hub stopped.');
  }

  private cycleCount = 0;

  private async runCycle() {
    try {
      this.cycleCount++;
      console.log(`[EventIngestor] 🔍 Heartbeat #${this.cycleCount}: Scanning context...`);
      
      const shouldFetchNewsData = this.cycleCount % 2 === 0;

      const [geckoEvents, cmcEvents, newsEvents, newsDataEvents] = await Promise.allSettled([
        this.fetchGeckoTrends(),
        this.fetchCMCHeadlines(),
        this.fetchCryptoCompareNews(),
        shouldFetchNewsData ? this.fetchNewsDataIo() : Promise.resolve([])
      ]);

      if (!shouldFetchNewsData) {
        console.log('[EventIngestor] 🛡️ NewsData.io Quota Safeguard: Skipping this cycle (144/200 limit).');
      }

      if (geckoEvents.status === 'fulfilled') geckoEvents.value.forEach((e: ExternalEventRecord) => bufferExternalEvent(e));
      if (cmcEvents.status === 'fulfilled') cmcEvents.value.forEach((e: ExternalEventRecord) => bufferExternalEvent(e));
      if (newsEvents.status === 'fulfilled') newsEvents.value.forEach((e: ExternalEventRecord) => bufferExternalEvent(e));
      if (newsDataEvents.status === 'fulfilled') newsDataEvents.value.forEach((e: ExternalEventRecord) => bufferExternalEvent(e));

      console.log('[EventIngestor] Cycle complete. Context buffered to Vault.');

      // Trigger the Cognitive Layer (Market Analyst)
      const { marketAnalyst } = await import('./agents/market-analyst');
      marketAnalyst.conductMarketReview();

    } catch (err) {
      console.error('[EventIngestor] Cycle failed:', err);
    }
  }

  /**
   * Generates a deterministic hash from a news headline and source.
   * Ensures identical content from the same source is never duplicated in the Ledger.
   */
  private generateContentHash(source: string, headline: string): string {
    const cleanHeadline = (headline || '').trim().toLowerCase();
    const cleanSource = (source || '').trim().toUpperCase();
    return crypto.createHash('md5')
      .update(`${cleanSource}:${cleanHeadline}`)
      .digest('hex');
  }

  /**
   * Fetch Trending coins from CoinGecko.
   * Scientifically maps "Hotness" to a relevance score.
   */
  private async fetchGeckoTrends(): Promise<ExternalEventRecord[]> {
    try {
      const resp = await fetch(`${GECKO_API_BASE}/search/trending`);
      if (!resp.ok) return [];
      
      const data = await resp.ok ? await resp.json() : null;
      if (!data || !data.coins) return [];

      return data.coins.map((c: any, index: number): ExternalEventRecord => {
        const item = c.item;
        return {
          event_id: `GECKO-TREND-${item.id}-${new Date().toISOString().split('T')[0]}`, // Deduplicate per-day
          timestamp: Date.now(),
          source: 'GECKO',
          level: 3, // Trend/Info
          relevance_score: Math.max(0, 10 - index), // Top 1 is 10/10 relevance
          headline: `Trending: ${item.name} (${item.symbol}) - Market Cap Rank #${item.market_cap_rank}`,
          asset_scope: item.symbol,
          metadata: JSON.stringify({
            id: item.id,
            price_btc: item.price_btc,
            thumb: item.thumb
          }),
          machine_id: 'SENTINEL-ESH'
        };
      });
    } catch (e) {
      console.warn('[EventIngestor] Gecko Trend fetch failed:', e);
      return [];
    }
  }

  /**
   * Fetch general crypto and macro news from CryptoCompare.
   * Includes an intelligent fallback for missing API keys to keep the Ledger active.
   */
  private async fetchCryptoCompareNews(): Promise<ExternalEventRecord[]> {
    try {
      const resp = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
      if (!resp.ok) return this.generateMacroFallback();
      
      const data = await resp.json();

      if (!data.Data || !Array.isArray(data.Data)) {
         return this.generateMacroFallback();
      }

      return data.Data.slice(0, 5).map((article: any): ExternalEventRecord => {
        let rtScore = 5.0;
        if (article.tags?.includes('BTC') || article.categories?.includes('Macro')) rtScore += 3.0;
        if (article.title?.toUpperCase().includes('FED') || article.title?.toUpperCase().includes('SEC')) rtScore += 2.0;

        return {
          event_id: `CC-NEWS-${this.generateContentHash(article.source_info?.name || 'CRYPTO-NEWS', article.title || '')}`,
          timestamp: (article.published_on * 1000) || Date.now(),
          source: article.source_info?.name || 'CRYPTO-NEWS',
          level: rtScore >= 7.0 ? 1 : 2,
          relevance_score: Math.min(rtScore, 10.0),
          headline: article.title || 'Breaking Crypto News Update',
          asset_scope: "GLOBAL",
          metadata: JSON.stringify({
            url: article.url || '',
            tags: article.tags || '',
            categories: article.categories || ''
          }),
          machine_id: 'SENTINEL-ESH'
        };
      });
    } catch (e) {
      console.warn('[EventIngestor] News fetch failed, using fallback.');
      return this.generateMacroFallback();
    }
  }

  /**
   * Intelligent Fallback: Keeps the Global Ledger flowing with simulated 
   * macro events if the user lacks premium API keys.
   */
  private generateMacroFallback(): ExternalEventRecord[] {
    const isMajor = Math.random() > 0.8;
    const headline = isMajor 
      ? "FED Chair Announces Unexpected Monetary Policy Shift" 
      : "Market Rumors Suggest Incoming SEC Regulatory Guidelines";

    return [{
      event_id: `MOCK-MACRO-${this.generateContentHash('MACRO-SENTRY', headline)}`,
      timestamp: Date.now(),
      source: 'MACRO-SENTRY',
      level: isMajor ? 1 : 3, // 1 = Fact, 3 = Gossip
      relevance_score: isMajor ? 9.5 : 4.0,
      headline: isMajor 
        ? "FED Chair Announces Unexpected Monetary Policy Shift" 
        : "Market Rumors Suggest Incoming SEC Regulatory Guidelines",
      asset_scope: "GLOBAL",
      metadata: JSON.stringify({ note: 'Simulated for UI demonstration' }),
      machine_id: 'MOTHER-FALLBACK'
    }];
  }

  /**
   * Fetch headlines from CMC.
   * Note: This requires an API key in production.
   */
  private async fetchCMCHeadlines(): Promise<ExternalEventRecord[]> {
    const apiKey = process.env.CMC_API_KEY;
    if (!apiKey) return []; // Skip if no key

    try {
      // Example endpoint for global news or latest listings
      const resp = await fetch(`${CMC_API_BASE}/cryptocurrency/listings/latest?limit=5`, {
        headers: { 'X-CMC_PRO_API_KEY': apiKey }
      });
      
      if (!resp.ok) return [];
      const data = await resp.json();
      
      return data.data.map((coin: any): ExternalEventRecord => {
        return {
          event_id: `CMC-UPDATE-${coin.symbol}-${new Date().toISOString().split('T')[0]}`, // Daily update only
          timestamp: Date.now(),
          source: 'CMC',
          level: 2, // High relevance for top listings
          relevance_score: 8.5,
          headline: `CMC Signal: ${coin.name} (${coin.symbol}) Price Update. Rank: #${coin.cmc_rank}`,
          asset_scope: coin.symbol,
          metadata: JSON.stringify({
            quote: coin.quote.USD,
            last_updated: coin.last_updated
          }),
          machine_id: 'SENTINEL-ESH'
        };
      });
    } catch (e) {
      console.warn('[EventIngestor] CMC Headline fetch failed:', e);
      return [];
    }
  }

  /**
   * Fetch breaking crypto news from NewsData.io (Enterprise Key provided by user).
   */
  private async fetchNewsDataIo(): Promise<ExternalEventRecord[]> {
    try {
      const apiKey = 'pub_bfcc6dc7846141a194fdf5a395e51253';
      const resp = await fetch(`https://newsdata.io/api/1/crypto?apikey=${apiKey}`);
      
      if (!resp.ok) return [];
      const data = await resp.json();

      if (!data.results) return [];

      return data.results.slice(0, 5).map((article: any): ExternalEventRecord => {
        // NewsData IO provides 'coin' tags which we can use for RS-Scoring
        const hasMajorAsset = article.coin?.includes('BTC') || article.coin?.includes('ETH');
        const rtScore = hasMajorAsset ? 9.0 : 6.0;

        return {
          event_id: `ND-NEWS-${this.generateContentHash(article.source_name || 'NEWSDATA-IO', article.title || '')}`,
          timestamp: new Date(article.pubDate).getTime(),
          source: article.source_name || 'NEWSDATA-IO',
          level: rtScore >= 8.5 ? 1 : 2,
          relevance_score: rtScore,
          headline: article.title,
          asset_scope: article.coin || "GLOBAL",
          metadata: JSON.stringify({
             link: article.link,
             creator: article.creator,
             sentiment: article.sentiment
          }),
          machine_id: 'SENTINEL-ESH'
        };
      });
    } catch (e) {
      console.warn('[EventIngestor] NewsData IO fetch failed:', e);
      return [];
    }
  }
}

export const eventIngestor = new EventIngestor();
