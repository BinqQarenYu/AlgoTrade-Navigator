import type { HistoricalData } from "./types"

const DB_NAME = "AlgoTradeHistoricalCache"
const DB_VERSION = 1
const STORE_NAME = "klines"

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject("IndexedDB not supported")
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveCachedKlines(key: string, data: HistoricalData[]): Promise<void> {
  if (!data || data.length === 0) return
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    store.put({ key, data, updatedAt: Date.now() })
  } catch (e) {
    console.warn("[HistoricalDataStore] IndexedDB save failed, fallback to sessionStorage:", e)
    try {
      sessionStorage.setItem(`klines_cache_${key}`, JSON.stringify(data))
    } catch (err) {}
  }
}

export async function getCachedKlines(key: string): Promise<HistoricalData[] | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    return new Promise((resolve) => {
      const req = store.get(key)
      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result.data) && req.result.data.length > 0) {
          resolve(req.result.data)
        } else {
          resolve(null)
        }
      }
      req.onerror = () => resolve(null)
    })
  } catch (e) {
    try {
      const fallback = sessionStorage.getItem(`klines_cache_${key}`)
      if (fallback) return JSON.parse(fallback)
    } catch (err) {}
    return null
  }
}

export async function clearKlinesCache(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).clear()
  } catch (e) {
    try {
      sessionStorage.clear()
    } catch (err) {}
  }
}
