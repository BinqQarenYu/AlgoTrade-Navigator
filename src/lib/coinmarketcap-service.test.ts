import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCoinDetailsByTickerFromCMC } from './coinmarketcap-service';

const API_KEY = 'test-api-key';

describe('getCoinDetailsByTickerFromCMC', () => {
    let fetchMock: any;

    beforeEach(() => {
        fetchMock = vi.spyOn(global, 'fetch');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return null if ticker or apiKey is missing', async () => {
        expect(await getCoinDetailsByTickerFromCMC('', API_KEY)).toBeNull();
        expect(await getCoinDetailsByTickerFromCMC('BTC', '')).toBeNull();
    });

    it('should return null if the quotes API response is not OK', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            statusText: 'Unauthorized',
            json: async () => ({
                status: { error_message: 'Invalid API Key' }
            })
        });

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = await getCoinDetailsByTickerFromCMC('BTC', API_KEY);

        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('CoinMarketCap API Error (Quotes): Invalid API Key')
        );

        consoleErrorSpy.mockRestore();
    });

    it('should return null if no data for the ticker is in the response', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                data: {}
            })
        });

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await getCoinDetailsByTickerFromCMC('BTC', API_KEY);

        expect(result).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('No data for BTC in CoinMarketCap response.')
        );

        consoleWarnSpy.mockRestore();
    });

    it('should return null if USD quote is missing', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                data: {
                    BTC: {
                        id: 1,
                        symbol: 'BTC',
                        name: 'Bitcoin',
                        quote: {}
                    }
                }
            })
        });

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await getCoinDetailsByTickerFromCMC('BTC', API_KEY);

        expect(result).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('No USD quote for BTC in CoinMarketCap response.')
        );

        consoleWarnSpy.mockRestore();
    });

    it('should return details with default description and empty logo if info API fails', async () => {
        // Mock quotes API success
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                data: {
                    BTC: {
                        id: 1,
                        symbol: 'BTC',
                        name: 'Bitcoin',
                        cmc_rank: 1,
                        circulating_supply: 19000000,
                        total_supply: 21000000,
                        quote: {
                            USD: {
                                market_cap: 1000000000000,
                                percent_change_24h: 5.5,
                                volume_24h: 30000000000,
                                ath: 69000,
                                ath_date: '2021-11-10T00:00:00.000Z',
                                atl: 67.81,
                                atl_date: '2013-07-06T00:00:00.000Z'
                            }
                        }
                    }
                }
            })
        });

        // Mock info API failure
        fetchMock.mockResolvedValueOnce({
            ok: false,
            json: async () => ({})
        });

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await getCoinDetailsByTickerFromCMC('BTC', API_KEY);

        expect(result).not.toBeNull();
        expect(result?.name).toBe('Bitcoin');
        expect(result?.image).toBe('');
        expect(result?.description).toBe('Details from CoinMarketCap for Bitcoin. Full description not available in this API call.');
        expect(result?.marketCap).toBe(1000000000000);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Could not fetch metadata for BTC from CoinMarketCap.')
        );

        consoleWarnSpy.mockRestore();
    });

    it('should successfully map complete data when both APIs succeed', async () => {
        // Mock quotes API success
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                data: {
                    ETH: {
                        id: 1027,
                        symbol: 'ETH',
                        name: 'Ethereum',
                        cmc_rank: 2,
                        circulating_supply: 120000000,
                        total_supply: 120000000,
                        quote: {
                            USD: {
                                market_cap: 300000000000,
                                percent_change_24h: -1.2,
                                volume_24h: 15000000000,
                                ath: 4891.70,
                                ath_date: '2021-11-16T00:00:00.000Z',
                                atl: 0.42,
                                atl_date: '2015-10-21T00:00:00.000Z'
                            }
                        }
                    }
                }
            })
        });

        // Mock info API success
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                data: {
                    ETH: {
                        logo: 'https://example.com/eth.png',
                        description: 'Ethereum is a decentralized open-source blockchain system.'
                    }
                }
            })
        });

        const result = await getCoinDetailsByTickerFromCMC('ETH', API_KEY);

        expect(result).not.toBeNull();
        expect(result?.id).toBe('1027');
        expect(result?.symbol).toBe('ETH');
        expect(result?.name).toBe('Ethereum');
        expect(result?.marketCapRank).toBe(2);
        expect(result?.marketCap).toBe(300000000000);
        expect(result?.priceChange24h).toBe(-1.2);
        expect(result?.volume24h).toBe(15000000000);
        expect(result?.circulatingSupply).toBe(120000000);
        expect(result?.totalSupply).toBe(120000000);
        expect(result?.ath).toBe(4891.7);
        expect(result?.athDate).toBe(new Date('2021-11-16T00:00:00.000Z').toLocaleDateString());
        expect(result?.atl).toBe(0.42);
        expect(result?.atlDate).toBe(new Date('2015-10-21T00:00:00.000Z').toLocaleDateString());
        expect(result?.image).toBe('https://example.com/eth.png');
        expect(result?.description).toBe('Ethereum is a decentralized open-source blockchain system.');

        // Verify that fetch was called twice with correct URLs and headers
        expect(fetchMock).toHaveBeenCalledTimes(2);

        // 1st call: quotes API
        const quotesCall = fetchMock.mock.calls[0];
        expect(quotesCall[0]).toContain('quotes/latest?symbol=ETH');
        expect(quotesCall[1].headers).toEqual({ 'X-CMC_PRO_API_KEY': API_KEY, 'Accept': 'application/json' });

        // 2nd call: info API
        const infoCall = fetchMock.mock.calls[1];
        expect(infoCall[0]).toContain('info?symbol=ETH');
        expect(infoCall[1].headers).toEqual({ 'X-CMC_PRO_API_KEY': API_KEY, 'Accept': 'application/json' });
    });

    it('should handle fetch throwing an exception', async () => {
        fetchMock.mockRejectedValueOnce(new Error('Network error'));

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = await getCoinDetailsByTickerFromCMC('SOL', API_KEY);

        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('Failed to fetch CoinMarketCap data for SOL:'),
            expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
    });
});
