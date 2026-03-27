import type { OrderData, ManipulationFlags } from "@/lib/order-flow-analyzer";
import type { OrderFlowData, EnhancedOrderFlowData, BinanceOrderFlowData, ManipulationPattern, VeryLargeActivity } from "./types";

// Mock implementations for missing services
export const getTicker = async (symbol: string) => ({ price: Math.random() * 50000 + 20000 });
export const getKlines = async (symbol: string, interval: string) => ([]);

export const localEnhancedOrderFlowAnalyzer = {
  analyze: (data: any[]) => ({
    manipulation: {
      spoofing: false,
      layering: false,
      washTrading: false,
      reasons: [],
      riskScore: 0
    },
    orders: []
  }),
  generateEnhancedOrders: (count: number, symbol?: string, service?: any) => Array.from({ length: count }, (_, i) => ({
    id: \`enhanced-\${i}\`,
    timestamp: Date.now() + i * 1000,
    price: Math.random() * 50000 + 20000,
    volume: Math.random() * 10,
    type: Math.random() > 0.5 ? 'buy' as const : 'sell' as const,
    symbol: 'BTCUSDT',
    source: 'binance'
  }))
};

export const createDualApiService = (key1?: string | null, key2?: string | null) => ({
  getCoinDetails: (symbol: string) => Promise.resolve({ symbol }),
  trackBinanceUsage: (count?: number) => {},
  getApiStatus: async () => ({ status: 'ok', activeApi: 'binance' })
});

export const binanceWebSocketService = {
  onConnection: (callback: (connected: boolean) => void) => {},
  onError: (callback: (error: Error) => void) => {},
  subscribeToAggTrades: (symbol: string, callback: (orderData: BinanceOrderFlowData) => void) => {},
  connect: () => {},
  unsubscribe: (symbol?: string) => {},
  disconnect: () => {}
};
