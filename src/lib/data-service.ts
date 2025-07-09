'use server';

import type { SavedReport, StreamedDataPoint } from './types';

// In a real application, this would interact with a database like Firestore.
// For now, we will simulate this by storing data in-memory on the server.
// This data will be lost when the server restarts.
let savedData: StreamedDataPoint[] = [];
let savedReports: SavedReport[] = [];

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
    const newReport = {
        ...report,
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    } as SavedReport;
    savedReports.unshift(newReport); // Add to the beginning of the array
    console.log(`Saving new report: ${newReport.type}`);
    return newReport;
};

export const loadReports = async (): Promise<SavedReport[]> => {
    console.log(`Loading ${savedReports.length} saved reports...`);
    return Promise.resolve([...savedReports]);
};

export const deleteReport = async (reportId: string): Promise<void> => {
    console.log(`Deleting report with id: ${reportId}`);
    savedReports = savedReports.filter(report => report.id !== reportId);
};
