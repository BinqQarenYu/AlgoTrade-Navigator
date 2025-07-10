
'use client';

import type { SavedReport, StreamedDataPoint, SavedMarketReport, SavedManipulationScan } from './types';
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'AlgoTradeDB';
const DB_VERSION = 1;
const REPORT_STORE = 'reports';

// --- Database Initialization ---
let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = () => {
    if (dbPromise) return dbPromise;

    dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(REPORT_STORE)) {
                const store = db.createObjectStore(REPORT_STORE, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                // Create an index on the 'symbol' property for efficient lookups.
                store.createIndex('by_symbol', 'input.symbol');
                store.createIndex('by_type_and_symbol', ['type', 'input.symbol']);
            }
        },
    });
    return dbPromise;
};


// In a real application, this would interact with a database like Firestore.
// For now, we will simulate this by storing data in-memory on the server.
// This data will be lost when the server restarts.
let savedData: StreamedDataPoint[] = [];

/**
 * Saves a new data point to our persistent storage.
 * @param dataPoint The data point to save.
 */
export const saveDataPoint = async (dataPoint: StreamedDataPoint): Promise<void> => {
    // console.log("Saving data point:", dataPoint);
    savedData.push(dataPoint);
};

/**
 * Loads all saved data points.
 * @returns An array of all saved data points.
 */
export const loadSavedData = async (): Promise<StreamedDataPoint[]> => {
    console.log(`Loading ${savedData.length} saved data points...`);
    return Promise.resolve([...savedData]); // Return a copy
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
    const id = await db.put(REPORT_STORE, report);
    console.log(`Saving new report: ${report.type} with ID ${id}`);
    return { ...report, id: String(id) } as SavedReport;
};

export const loadReports = async (): Promise<SavedReport[]> => {
    const db = await initDB();
    const reports = await db.getAll(REPORT_STORE);
    reports.sort((a, b) => b.timestamp - a.timestamp); // Show most recent first
    console.log(`Loading ${reports.length} saved reports...`);
    return reports;
};

export const deleteReport = async (reportId: string): Promise<void> => {
    const db = await initDB();
    await db.delete(REPORT_STORE, reportId);
    console.log(`Deleting report with id: ${reportId}`);
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
    const tx = db.transaction(REPORT_STORE, 'readonly');
    const index = tx.store.index('by_type_and_symbol');
    
    // The key range finds all reports matching the type and symbol.
    // 'prev' ensures we get the one with the highest key (most recent).
    const cursor = await index.openCursor(IDBKeyRange.only([type, symbol]), 'prev');
    
    await tx.done;

    if (cursor) {
        console.log(`Found latest '${type}' report for ${symbol}`);
        return cursor.value as SavedMarketReport | SavedManipulationScan;
    } else {
        console.log(`No '${type}' report found for ${symbol}`);
        return null;
    }
};
