
'use client';

import type { SavedReport, StreamedDataPoint, SavedMarketReport, SavedManipulationScan } from './types';

const DB_NAME = 'AlgoTradeDB';
const DB_VERSION = 1;
const REPORT_STORE = 'reports';

// --- Database Initialization ---
let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB is not supported in this environment'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(REPORT_STORE)) {
                const store = db.createObjectStore(REPORT_STORE, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                store.createIndex('by_symbol', 'input.symbol');
                store.createIndex('by_type_and_symbol', ['type', 'input.symbol']);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
};

let savedData: StreamedDataPoint[] = [];

/**
 * Saves a new data point to our persistent storage.
 * @param dataPoint The data point to save.
 */
export const saveDataPoint = async (dataPoint: StreamedDataPoint): Promise<void> => {
    savedData.push(dataPoint);
};

/**
 * Loads all saved data points.
 * @returns An array of all saved data points.
 */
export const loadSavedData = async (): Promise<StreamedDataPoint[]> => {
    console.log(`Loading ${savedData.length} saved data points...`);
    return Promise.resolve([...savedData]);
};

/**
 * Clears all saved stream data from our in-memory store. AI Reports are not affected.
 */
export const clearStreamData = async (): Promise<void> => {
    console.log("Clearing all saved stream data.");
    savedData = [];
};

// --- New Report Functions ---

export const saveReport = async (report: Omit<SavedReport, 'id'>): Promise<SavedReport> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(REPORT_STORE, 'readwrite');
        const store = tx.objectStore(REPORT_STORE);
        const req = store.put(report);
        req.onsuccess = () => {
            const id = String(req.result);
            console.log(`Saving new report: ${report.type} with ID ${id}`);
            resolve({ ...report, id } as SavedReport);
        };
        req.onerror = () => reject(req.error);
    });
};

export const loadReports = async (): Promise<SavedReport[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(REPORT_STORE, 'readonly');
        const store = tx.objectStore(REPORT_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
            const reports: SavedReport[] = req.result || [];
            reports.sort((a: SavedReport, b: SavedReport) => b.timestamp - a.timestamp);
            console.log(`Loading ${reports.length} saved reports...`);
            resolve(reports);
        };
        req.onerror = () => reject(req.error);
    });
};

export const deleteReport = async (reportId: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(REPORT_STORE, 'readwrite');
        const store = tx.objectStore(REPORT_STORE);
        const req = store.delete(reportId);
        req.onsuccess = () => {
            console.log(`Deleting report with id: ${reportId}`);
            resolve();
        };
        req.onerror = () => reject(req.error);
    });
};

/**
 * Gets the most recent report of a specific type for a given symbol.
 * @param type The type of report ('market-report' or 'manipulation-scan').
 * @param symbol The asset symbol (e.g., 'BTCUSDT').
 * @returns The latest report or null if none is found.
 */
export const getLatestReport = async (
    type: 'market-report' | 'manipulation-scan', 
    symbol: string
): Promise<SavedMarketReport | SavedManipulationScan | null> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(REPORT_STORE, 'readonly');
        const store = tx.objectStore(REPORT_STORE);
        const index = store.index('by_type_and_symbol');
        const req = index.openCursor(IDBKeyRange.only([type, symbol]), 'prev');
        req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
                console.log(`Found latest '${type}' report for ${symbol}`);
                resolve(cursor.value as SavedMarketReport | SavedManipulationScan);
            } else {
                console.log(`No '${type}' report found for ${symbol}`);
                resolve(null);
            }
        };
        req.onerror = () => reject(req.error);
    });
};
