import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCoinDetailsByTickerFromCMC } from './coinmarketcap-service';

const MOCK_API_KEY = 'test-api-key';

describe('getCoinDetailsByTickerFromCMC', () => {
    let fetchMock: any;

    beforeEach(() => {
        // Setup a global fetch mock before each test
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        // Suppress console.error and console.warn during tests
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('should return null if ticker or apiKey is missing', async () => {
        expect(await getCoinDetailsByTickerFromCMC('', MOCK_API_KEY)).toBeNull();
        expect(await getCoinDetailsByTickerFromCMC('BTC', '')).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should handle successful quote and info API responses', async () => {
        const mockQuoteData = {
            data: {
                'BTC': {
                    id: 1,
                    name: 'Bitcoin',
                    symbol: 'BTC',
                    cmc_rank: 1,
                    circulating_supply: 19000000,
                    total_supply: 21000000,
                    quote: {
                        USD: {
                            market_cap: 800000000000,
                            percent_change_24h: 2.5,
                            volume_24h: 30000000000,
                            ath: 69000,
                            ath_date: '2021-11-10T00:00:00.000Z',
                            atl: 65,
                            atl_date: '2013-07-05T00:00:00.000Z'
                        }
                    }
                }
            }
        };

        const mockInfoData = {
            data: {
                'BTC': {
                    logo: 'https://example.com/btc.png',
                    description: 'Bitcoin is a decentralized cryptocurrency.'
                }
            }
        };

        fetchMock.mockImplementation((url: string | URL) => {
            const urlString = String(url);
            if (urlString.includes('/quotes/latest')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockQuoteData)
                });
            } else if (urlString.includes('/info')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockInfoData)
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const result = await getCoinDetailsByTickerFromCMC('btc', MOCK_API_KEY);

        expect(result).not.toBeNull();
        expect(result).toMatchObject({
            id: '1',
            symbol: 'BTC',
            name: 'Bitcoin',
            image: 'https://example.com/btc.png',
            description: 'Bitcoin is a decentralized cryptocurrency.',
            marketCapRank: 1,
            marketCap: 800000000000,
            priceChange24h: 2.5,
            volume24h: 30000000000,
            circulatingSupply: 19000000,
            totalSupply: 21000000,
            ath: 69000,
            atl: 65,
        });

        // Date parsing verification
        expect(result?.athDate).toBe(new Date('2021-11-10T00:00:00.000Z').toLocaleDateString());
        expect(result?.atlDate).toBe(new Date('2013-07-05T00:00:00.000Z').toLocaleDateString());

        // Verify API key is passed correctly
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/quotes/latest?symbol=BTC'),
            expect.objectContaining({ headers: expect.objectContaining({ 'X-CMC_PRO_API_KEY': MOCK_API_KEY }) })
        );
    });

    it('should return null and log error if quotes API returns non-ok response', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            statusText: 'Forbidden',
            json: () => Promise.resolve({ status: { error_message: 'Invalid API Key' } })
        });

        const result = await getCoinDetailsByTickerFromCMC('BTC', MOCK_API_KEY);

        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('CoinMarketCap API Error (Quotes): Invalid API Key'));
    });

    it('should return null and log warning if quotes API returns ok but data is missing', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ data: {} }) // Missing 'BTC' key
        });

        const result = await getCoinDetailsByTickerFromCMC('BTC', MOCK_API_KEY);

        expect(result).toBeNull();
        expect(console.warn).toHaveBeenCalledWith('No data for BTC in CoinMarketCap response.');
    });

    it('should return null and log warning if quotes API returns ok but quote.USD is missing', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                data: {
                    'BTC': {
                        id: 1,
                        name: 'Bitcoin',
                        symbol: 'BTC',
                        quote: {} // Missing USD key
                    }
                }
            })
        });

        const result = await getCoinDetailsByTickerFromCMC('BTC', MOCK_API_KEY);

        expect(result).toBeNull();
        expect(console.warn).toHaveBeenCalledWith('No USD quote for BTC in CoinMarketCap response.');
    });

    it('should return default logo/description if info API returns non-ok response', async () => {
        const mockQuoteData = {
            data: {
                'BTC': {
                    id: 1,
                    name: 'Bitcoin',
                    symbol: 'BTC',
                    quote: {
                        USD: { market_cap: 100 }
                    }
                }
            }
        };

        fetchMock.mockImplementation((url: string | URL) => {
            const urlString = String(url);
            if (urlString.includes('/quotes/latest')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockQuoteData)
                });
            } else if (urlString.includes('/info')) {
                return Promise.resolve({
                    ok: false // Info API fails
                });
            }
        });

        const result = await getCoinDetailsByTickerFromCMC('BTC', MOCK_API_KEY);

        expect(result).not.toBeNull();
        expect(result?.image).toBe(''); // Default empty logo
        expect(result?.description).toBe('Details from CoinMarketCap for Bitcoin. Full description not available in this API call.');
        expect(console.warn).toHaveBeenCalledWith('Could not fetch metadata for BTC from CoinMarketCap.');
    });

    it('should return default logo/description if info API data is missing', async () => {
        const mockQuoteData = {
            data: {
                'BTC': {
                    id: 1,
                    name: 'Bitcoin',
                    symbol: 'BTC',
                    quote: {
                        USD: { market_cap: 100 }
                    }
                }
            }
        };

        fetchMock.mockImplementation((url: string | URL) => {
            const urlString = String(url);
            if (urlString.includes('/quotes/latest')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockQuoteData)
                });
            } else if (urlString.includes('/info')) {
                return Promise.resolve({
                    ok: true, // Info API succeeds
                    json: () => Promise.resolve({ data: {} }) // But missing data
                });
            }
        });

        const result = await getCoinDetailsByTickerFromCMC('BTC', MOCK_API_KEY);

        expect(result).not.toBeNull();
        expect(result?.image).toBe(''); // Default empty logo
        expect(result?.description).toBe('Details from CoinMarketCap for Bitcoin. Full description not available in this API call.');
        // Note: No console.warn is logged when info API is OK but data is missing.
    });

    it('should catch fetch exceptions and return null', async () => {
        fetchMock.mockRejectedValueOnce(new Error('Network failure'));

        const result = await getCoinDetailsByTickerFromCMC('BTC', MOCK_API_KEY);

        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith(
            'Failed to fetch CoinMarketCap data for BTC:',
            expect.any(Error)
        );
    });
});
