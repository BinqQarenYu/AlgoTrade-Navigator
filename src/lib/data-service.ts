'use server';

import type { StreamedDataPoint } from './types';

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
 * Clears all saved data from our in-memory store.
 */
export const clearSavedData = async (): Promise<void> => {
    console.log("Clearing all saved data.");
    savedData = [];
};
