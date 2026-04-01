import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { saveDataPoint, loadSavedData, clearStreamData } from "./data-service.ts";
import type { StreamedDataPoint } from "./types.ts";

describe("data-service", () => {
  beforeEach(async () => {
    await clearStreamData();
  });

  test("loadSavedData should return an empty array initially", async () => {
    const data = await loadSavedData();
    assert.deepStrictEqual(data, []);
  });

  test("loadSavedData should return saved data points", async () => {
    const point1: StreamedDataPoint = { id: 1, time: 1000, price: 50000, volume: 1 };
    const point2: StreamedDataPoint = { id: 2, time: 2000, price: 51000, volume: 2 };

    await saveDataPoint(point1);
    await saveDataPoint(point2);

    const data = await loadSavedData();
    assert.deepStrictEqual(data, [point1, point2]);
  });

  test("loadSavedData should return a copy, not the original reference", async () => {
    const point1: StreamedDataPoint = { id: 1, time: 1000, price: 50000, volume: 1 };
    await saveDataPoint(point1);

    const data1 = await loadSavedData();
    data1.push({ id: 2, time: 2000, price: 51000, volume: 2 });

    const data2 = await loadSavedData();
    assert.strictEqual(data2.length, 1);
    assert.deepStrictEqual(data2, [point1]);
  });
});
