import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { getAccountBalance, proxyApi } from './binance-service.ts';

describe('binance-service', () => {
    describe('getAccountBalance', () => {
        afterEach(() => {
            mock.restoreAll();
        });

        it('should correctly parse the account balance on successful proxy response', async () => {
            const mockProxyResponse = {
                data: {
                    totalWalletBalance: "10500.50",
                    totalUnrealizedProfit: "250.75",
                },
                usedWeight: 5
            };

            const callProxyMock = mock.method(proxyApi, 'callProxy', async () => mockProxyResponse);

            const keys = { apiKey: 'test-api-key', secretKey: 'test-secret-key' };
            const result = await getAccountBalance(keys);

            assert.deepStrictEqual(result, {
                data: {
                    balance: 10500.50,
                    totalPnl: 250.75,
                    dailyVolume: 0,
                },
                usedWeight: 5
            });

            // Verify callProxy was called with correct arguments
            const calls = callProxyMock.mock.calls;
            assert.strictEqual(calls.length, 1);

            const [path, method, body, receivedKeys] = calls[0].arguments;
            assert.strictEqual(path, '/fapi/v2/account');
            assert.strictEqual(method, 'GET');
            assert.strictEqual(body, undefined);
            assert.deepStrictEqual(receivedKeys, keys);
        });

        it('should throw an error when callProxy throws', async () => {
            mock.method(proxyApi, 'callProxy', async () => {
                throw new Error("Invalid API key");
            });

            const keys = { apiKey: 'test-api-key', secretKey: 'test-secret-key' };

            await assert.rejects(
                async () => {
                    await getAccountBalance(keys);
                },
                (error: Error) => {
                    assert.strictEqual(error.message, 'Invalid API key');
                    return true;
                }
            );
        });
    });
});
