export const PERFORMANCE_CONFIG = {
    // Tier 1: Always-On assets (High priority)
    PRIORITY_ASSETS: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT'],

    // Tier 3: Cooldown buffer in milliseconds (15 minutes)
    COOLDOWN_MS: 15 * 60 * 1000,

    // Limits
    MAX_CONCURRENT_STREAMS: 50,

    // Flush to DB interval
    BATCH_FLUSH_MS: 1000
};
