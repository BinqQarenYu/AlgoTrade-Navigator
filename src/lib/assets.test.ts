import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSymbolString } from './assets.ts';

test('parseSymbolString', async (t) => {
    await t.test('should correctly parse valid pairs with supported quotes', () => {
        assert.deepEqual(parseSymbolString('BTCUSDT'), { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT' });
        assert.deepEqual(parseSymbolString('ETHUSDC'), { symbol: 'ETHUSDC', base: 'ETH', quote: 'USDC' });
        assert.deepEqual(parseSymbolString('SOLBTC'), { symbol: 'SOLBTC', base: 'SOL', quote: 'BTC' });
        assert.deepEqual(parseSymbolString('BNBETH'), { symbol: 'BNBETH', base: 'BNB', quote: 'ETH' });
        assert.deepEqual(parseSymbolString('ADAUSDT'), { symbol: 'ADAUSDT', base: 'ADA', quote: 'USDT' });
        assert.deepEqual(parseSymbolString('DOGEBNB'), { symbol: 'DOGEBNB', base: 'DOGE', quote: 'BNB' });
    });

    await t.test('should return null for unknown or unsupported quotes', () => {
        assert.equal(parseSymbolString('BTCUSD'), null);
        assert.equal(parseSymbolString('BTCEUR'), null);
        assert.equal(parseSymbolString('BTCUNKNOWN'), null);
    });

    await t.test('should return null when there is no match or no base', () => {
        assert.equal(parseSymbolString('UNKNOWN'), null);
        assert.equal(parseSymbolString('USDT'), null); // Missing base
        assert.equal(parseSymbolString('123'), null);
        assert.equal(parseSymbolString(''), null);
    });

    await t.test('should handle symbols containing / or : by removing them', () => {
        assert.deepEqual(parseSymbolString('BTC/USDT'), { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT' });
        assert.deepEqual(parseSymbolString('ETH:USDC'), { symbol: 'ETHUSDC', base: 'ETH', quote: 'USDC' });
    });

    await t.test('should correctly parse pairs where base contains numbers', () => {
        assert.deepEqual(parseSymbolString('1INCHUSDT'), { symbol: '1INCHUSDT', base: '1INCH', quote: 'USDT' });
    });
});
