import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getAvailableQuotesForBase } from './assets.ts';

describe('getAvailableQuotesForBase', () => {
  test('returns multiple quotes correctly based on actual data', () => {
    // The implementation uses .sort(), so USDC comes before USDT
    const quotes = getAvailableQuotesForBase('BTC');
    assert.deepStrictEqual(quotes, ['USDC', 'USDT']);
  });

  test('returns single quote for a base with only one quote', () => {
    // AAVE has AAVEUSDT in the default fullAssetList
    const quotes = getAvailableQuotesForBase('AAVE');
    assert.deepStrictEqual(quotes, ['USDT']);
  });

  test('returns empty array for an unknown base', () => {
    const quotes = getAvailableQuotesForBase('UNKNOWN_BASE');
    assert.deepStrictEqual(quotes, []);
  });
});
