const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');


// --- Configuration ---
const MOTHER_NODE_URL = process.env.MOTHER_NODE_URL || 'http://localhost:3000/api/ingest';
const SECRET_TOKEN = process.env.ORANGE_PI_SECRET || 'dev-secret-key';
const SENTRY_ID = process.env.SENTRY_ID || 'SENTINEL-CLUSTER-ALPHA';
const FLUSH_INTERVAL_MS = 10000;
const BATCH_SIZE = 5000;

// --- Tiered Asset Lists ---
const TIER_1 = ["btcusdt", "ethusdt", "solusdt", "xrpusdt", "bnbusdt", "dogeusdt", "adausdt", "trxusdt", "linkusdt", "suiusdt"];
const TIER_2 = [
    "wldusdt", "ltcusdt", "pepeusdt", "bchusdt", "ondousdt", "avaxusdt", "fetusdt", "shibusdt", "dotusdt", "icpusdt",
    "atomusdt", "nearusdt", "etcusdt", "aptusdt", "opusdt", "arbusdt", "imxusdt", "galausdt", "filusdt", "stxusdt",
    "taousdt", "cfgusdt", "zecusdt", "dymusdt", "arusdt", "xautusdt", "injusdt", "tiausdt", "seiusdt", "runeusdt",
    "kasusdt", "aaveusdt", "egldusdt", "mkrusdt", "ldousdt", "rndrusdt", "crvusdt", "ftmusdt", "grtusdt", "bonkusdt"
];

const ALL_SYMBOLS = [...TIER_1, ...TIER_2];

// --- State Tracking (Per-Symbol Maps) ---
const lastImbalance = new Map();
const lastWallPrice = new Map();
const lastBidVolUsd = new Map();
const lastAskVolUsd = new Map();
const lastSpotPrice = new Map();

let tradeBuffer = [];
let eventBuffer = [];
let ws = null;
let isMotherOnline = true;
let isDraining = false;

// --- Database Initialization ---
const dbPath = path.join(__dirname, 'sentry_vault.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('[Sentinel Cluster] DB Error:', err.message);
    else console.log('[Sentinel Cluster] Safe Vault (SSD) initialized.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS vault (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

/**
 * Gets the current count of items in the SSD vault.
 */
function getVaultCount() {
    return new Promise((resolve) => {
        db.get("SELECT COUNT(*) as count FROM vault", (err, row) => {
            resolve(err ? 0 : (row?.count || 0));
        });
    });
}

/**
 * Robust Recovery Engine
 * Flushes SSD backlog to Mother Node using chunked recovery logic.
 */
async function drainVault() {
    if (isDraining || !isMotherOnline) return;
    
    // Check if we have anything to drain
    const count = await getVaultCount();
    if (count === 0) {
        isDraining = false;
        return;
    }

    isDraining = true;
    console.log(`[Sentinel Cluster] Recovery Active: ${count} items in SSD Vault...`);

    db.get("SELECT id, payload FROM vault ORDER BY id ASC LIMIT 1", async (err, row) => {
        if (err || !row) {
            isDraining = false;
            return;
        }

        try {
            const payload = JSON.parse(row.payload);
            const response = await fetch(MOTHER_NODE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SECRET_TOKEN}`
                },
                body: JSON.stringify({
                    ...payload,
                    sentry_id: SENTRY_ID,
                    is_recovery: true,
                    vault_id: row.id
                })
            });

            if (response.ok) {
                db.run("DELETE FROM vault WHERE id = ?", row.id, () => {
                    isDraining = false;
                    // Immediately try next row to clear backlog fast
                    setImmediate(drainVault);
                });
            } else {
                console.warn(`[Sentinel Cluster] Recovery paused (Mother busy: ${response.status})`);
                isDraining = false;
                isMotherOnline = false;
            }
        } catch (e) {
            isDraining = false;
            isMotherOnline = false;
        }
    });
}

// --- Initialize State ---
ALL_SYMBOLS.forEach(s => {
    lastImbalance.set(s, 0);
    lastWallPrice.set(s, 0);
    lastBidVolUsd.set(s, 0);
    lastAskVolUsd.set(s, 0);
    lastSpotPrice.set(s, 0);
});

function startSentry() {
    console.log(`[Sentinel Cluster] Starting Multiplexed Radar for ${ALL_SYMBOLS.length} assets...`);
    connectWebsocket();
    setInterval(flushBuffer, FLUSH_INTERVAL_MS);
}

function connectWebsocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    // Build Multiplexed URL
    const streams = [];
    TIER_1.forEach(s => streams.push(`${s}@aggTrade`, `${s}@forceOrder`, `${s}@depth20@100ms`));
    TIER_2.forEach(s => streams.push(`${s}@aggTrade`, `${s}@forceOrder`));

    const url = `wss://fstream.binance.com/stream?streams=${streams.join('/')}`;
    console.log(`[Sentinel Cluster] Connecting to ${streams.length} data streams...`);
    
    ws = new WebSocket(url);

    ws.on('open', () => console.log(`[Sentinel Cluster] Connected to Binance Multiplexer.`));

    ws.on('message', (data) => {
        try {
            const parsedRoot = JSON.parse(data.toString());
            const streamName = parsedRoot.stream;
            const parsed = parsedRoot.data;
            if (!streamName || !parsed) return;

            const symbol = streamName.split('@')[0];
            const upperSymbol = symbol.toUpperCase();

            if (streamName.includes('@aggTrade')) {
                handleTrade(symbol, upperSymbol, parsed);
            } else if (streamName.includes('@forceOrder')) {
                handleLiquidation(symbol, upperSymbol, parsed.o);
            } else if (streamName.includes('@depth20')) {
                handleDepth(symbol, upperSymbol, parsed);
            }
        } catch (e) {
            console.error('[Sentinel Cluster] WS Parse Error:', e.message);
        }
    });

    ws.on('close', () => {
        console.warn(`[Sentinel Cluster] WS Closed. Reconnecting in 5s...`);
        setTimeout(connectWebsocket, 5000);
    });

    ws.on('error', (err) => console.error(`[Sentinel Cluster] WS Error:`, err.message));
}

function handleTrade(symbol, upperSymbol, parsed) {
    const price = parseFloat(parsed.p);
    const quantity = parseFloat(parsed.q);
    const side = parsed.m ? 'sell' : 'buy';
    lastSpotPrice.set(symbol, price);

    tradeBuffer.push({
        trade_id: String(parsed.a),
        symbol: upperSymbol,
        price,
        quantity,
        side,
        timestamp: parsed.E,
        source: 'LIVE'
    });

    // Dynamic Whale Threshold: $50k for Tier 1, $10k for Tier 2
    const threshold = TIER_1.includes(symbol) ? 50000 : 10000;
    const notionalUsd = price * quantity;

    if (notionalUsd >= threshold) {
        eventBuffer.push({
            event_id: `whale-${parsed.a}-${Math.random().toString(36).substring(7)}`,
            timestamp: parsed.E,
            symbol: upperSymbol,
            event_type: 'WHALE_TX',
            price,
            volume_base: quantity,
            volume_usd: notionalUsd,
            severity_score: Number((notionalUsd / threshold).toFixed(2)),
            metadata: JSON.stringify({ side })
        });
    }
}

function handleLiquidation(symbol, upperSymbol, o) {
    const price = Math.max(parseFloat(o.p) || 0, parseFloat(o.ap) || 0);
    const quantity = parseFloat(o.q);
    const notionalUsd = price * quantity;
    
    eventBuffer.push({
        event_id: `liq-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        timestamp: Date.now(),
        symbol: upperSymbol,
        event_type: 'LIQUIDATION',
        price,
        volume_base: quantity,
        volume_usd: notionalUsd,
        severity_score: Math.min(Number((notionalUsd / 20000).toFixed(2)), 10),
        metadata: JSON.stringify({ side: o.S })
    });
}

function handleDepth(symbol, upperSymbol, parsed) {
    if (!parsed.b || !parsed.a) return;
    
    let bidVolUsd = 0;
    let askVolUsd = 0;
    let maxWall = { price: 0, volUsd: 0, side: '' };

    for (let i = 0; i < parsed.b.length; i++) {
        const p = parseFloat(parsed.b[i][0]);
        const q = parseFloat(parsed.b[i][1]);
        const vol = p * q;
        bidVolUsd += vol;
        if (vol > maxWall.volUsd) maxWall = { price: p, volUsd: vol, side: 'bid' };
    }

    for (let i = 0; i < parsed.a.length; i++) {
        const p = parseFloat(parsed.a[i][0]);
        const q = parseFloat(parsed.a[i][1]);
        const vol = p * q;
        askVolUsd += vol;
        if (vol > maxWall.volUsd) maxWall = { price: p, volUsd: vol, side: 'ask' };
    }

    const timestamp = parsed.E || Date.now();
    const ICEBERG_THRESHOLD = 2000000; // Adjusted for multi-asset sensitivity

    if (maxWall.volUsd > ICEBERG_THRESHOLD && maxWall.price !== lastWallPrice.get(symbol)) {
        eventBuffer.push({
            event_id: `iceberg-${timestamp}-${Math.random().toString(36).substring(7)}`,
            timestamp: timestamp,
            symbol: upperSymbol,
            event_type: 'ICEBERG',
            price: maxWall.price,
            volume_base: Number((maxWall.volUsd / Math.max(maxWall.price, 1)).toFixed(2)),
            volume_usd: maxWall.volUsd,
            severity_score: Number((maxWall.volUsd / ICEBERG_THRESHOLD).toFixed(2)),
            metadata: JSON.stringify({ side: maxWall.side })
        });
        lastWallPrice.set(symbol, maxWall.price);
    }

    // VPIN Shift
    const totalLiq = bidVolUsd + askVolUsd;
    if (totalLiq > 0) {
        const currentImbalance = (bidVolUsd - askVolUsd) / totalLiq;
        const shift = Math.abs(currentImbalance - (lastImbalance.get(symbol) || 0));
        
        if (shift > 0.4) {
            eventBuffer.push({
                event_id: `vpin-${timestamp}-${Math.random().toString(36).substring(7)}`,
                timestamp: timestamp,
                symbol: upperSymbol,
                event_type: 'VPIN_SPIKE',
                price: lastSpotPrice.get(symbol) || 0,
                volume_base: 0,
                volume_usd: totalLiq,
                severity_score: Number((shift * 10).toFixed(2)),
                metadata: JSON.stringify({ imbalance: currentImbalance.toFixed(2) })
            });
        }
        lastImbalance.set(symbol, currentImbalance);
    }
}

function startSentryLoop() {
    startSentry();
}
// Start!
startSentryLoop();
/**
 * Saves a batch of trades and events to the local SSD vault.
 */
function vaultBatch(trades, events) {
    if (trades.length === 0 && events.length === 0) return;
    
    const payload = JSON.stringify({ trades, microstructure_events: events });
    const stmt = db.prepare("INSERT INTO vault (payload) VALUES (?)");
    stmt.run(payload, (err) => {
        if (err) console.error('[Sentinel Cluster] Failed to vault data:', err.message);
        else console.log(`[Sentinel Cluster] Persistent Vaulted: ${trades.length} trades, ${events.length} events.`);
    });
    stmt.finalize();
}

async function flushBuffer() {
    const trades = tradeBuffer.splice(0, BATCH_SIZE);
    const events = eventBuffer.splice(0, BATCH_SIZE);

    const vaultCount = await getVaultCount();

    if (trades.length === 0 && events.length === 0) {
        // Heartbeat pulse with vault status
        try {
            await fetch(MOTHER_NODE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET_TOKEN}` },
                body: JSON.stringify({ 
                    sentry_id: SENTRY_ID, 
                    pulse: true,
                    backlog_count: vaultCount,
                    status: vaultCount > 0 ? 'RECOVERING' : 'ACTIVE'
                })
            });
            isMotherOnline = true;
            if (vaultCount > 0) drainVault();
        } catch (e) {
            isMotherOnline = false;
        }
        return;
    }
    
    try {
        const response = await fetch(MOTHER_NODE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SECRET_TOKEN}`
            },
            body: JSON.stringify({ 
                trades, 
                microstructure_events: events,
                buffer_remaining: tradeBuffer.length + eventBuffer.length, 
                sentry_id: SENTRY_ID,
                asset_count: ALL_SYMBOLS.length,
                backlog_count: vaultCount
            })
        });

        if (response.ok) {
            isMotherOnline = true;
            if (vaultCount > 0) drainVault();
        } else {
            handleMotherOffline(trades, events);
        }
    } catch (e) {
        handleMotherOffline(trades, events);
    }
}

function handleMotherOffline(t, e) {
    isMotherOnline = false;
    vaultBatch(t, e);
    console.warn(`[Sentinel Cluster] Mother Node Offline. Items moved to SSD Vault. RAM Buffer: ${tradeBuffer.length}`);
}


startSentry();
