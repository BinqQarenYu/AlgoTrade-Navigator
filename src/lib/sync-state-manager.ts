import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'sync_state.json');

export interface SyncState {
    last_fetched_ms: number;
    first_ws_packet_ms: number | null;
    config: {
        storage_path: string;
    };
    historical_backfill: {
        status: 'pending' | 'in_progress' | 'complete';
    };
}

const DEFAULT_STATE: SyncState = {
    last_fetched_ms: Date.now() - (60 * 24 * 60 * 60 * 1000), // 2 months ago
    first_ws_packet_ms: null,
    config: {
        storage_path: path.join(DATA_DIR, 'algo_trades.duckdb')
    },
    historical_backfill: {
        status: 'pending'
    }
};

export function initSyncState(): SyncState {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(STATE_FILE)) {
        fs.writeFileSync(STATE_FILE, JSON.stringify(DEFAULT_STATE, null, 2));
        return DEFAULT_STATE;
    }

    try {
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        return JSON.parse(raw) as SyncState;
    } catch (error) {
        console.error("Failed to parse sync_state.json, resetting to default", error);
        fs.writeFileSync(STATE_FILE, JSON.stringify(DEFAULT_STATE, null, 2));
        return DEFAULT_STATE;
    }
}

export function getSyncState(): SyncState {
    if (!fs.existsSync(STATE_FILE)) {
        return initSyncState();
    }

    try {
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        return JSON.parse(raw) as SyncState;
    } catch {
        return DEFAULT_STATE;
    }
}

export function updateSyncState(updates: Partial<SyncState>) {
    const currentState = getSyncState();

    // Deep merge for nested objects like config or historical_backfill
    const newState: SyncState = {
        ...currentState,
        ...updates,
        config: {
            ...currentState.config,
            ...(updates.config || {})
        },
        historical_backfill: {
            ...currentState.historical_backfill,
            ...(updates.historical_backfill || {})
        }
    };

    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(newState, null, 2));
    return newState;
}
