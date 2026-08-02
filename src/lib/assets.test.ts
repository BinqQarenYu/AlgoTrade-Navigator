import { describe, it, expect } from 'vitest';
import { parseSymbolString } from './assets';

describe('parseSymbolString', () => {
    it('should correctly parse valid pairs with supported quotes', () => {
        expect(parseSymbolString('BTCUSDT')).toEqual({ symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT' });
        expect(parseSymbolString('ETHUSDC')).toEqual({ symbol: 'ETHUSDC', base: 'ETH', quote: 'USDC' });
        expect(parseSymbolString('SOLBTC')).toEqual({ symbol: 'SOLBTC', base: 'SOL', quote: 'BTC' });
        expect(parseSymbolString('BNBETH')).toEqual({ symbol: 'BNBETH', base: 'BNB', quote: 'ETH' });
        expect(parseSymbolString('ADAUSDT')).toEqual({ symbol: 'ADAUSDT', base: 'ADA', quote: 'USDT' });
        expect(parseSymbolString('DOGEBNB')).toEqual({ symbol: 'DOGEBNB', base: 'DOGE', quote: 'BNB' });
    });

    it('should return null for unknown or unsupported quotes', () => {
        expect(parseSymbolString('BTCUSD')).toBeNull();
        expect(parseSymbolString('BTCEUR')).toBeNull();
        expect(parseSymbolString('BTCUNKNOWN')).toBeNull();
    });

    it('should return null when there is no match or no base', () => {
        expect(parseSymbolString('UNKNOWN')).toBeNull();
        expect(parseSymbolString('USDT')).toBeNull();
        expect(parseSymbolString('123')).toBeNull();
        expect(parseSymbolString('')).toBeNull();
    });

    it('should handle symbols containing / or : by removing them', () => {
        expect(parseSymbolString('BTC/USDT')).toEqual({ symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT' });
        expect(parseSymbolString('ETH:USDC')).toEqual({ symbol: 'ETHUSDC', base: 'ETH', quote: 'USDC' });
    });

    it('should correctly parse pairs where base contains numbers', () => {
        expect(parseSymbolString('1INCHUSDT')).toEqual({ symbol: '1INCHUSDT', base: '1INCH', quote: 'USDT' });
    });
});
