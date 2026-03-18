// Order Flow Analyzer - Restored Working Version
// Analyzes order flow data for manipulation patterns and generates mock data

export interface OrderData {
  id: string;
  timestamp: number;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  symbol: string;
  size: number;
  orderId?: string;
  venue?: string;
}

export interface ManipulationFlags {
  spoofing: boolean;
  layering: boolean;
  washTrading: boolean;
  isPadding?: boolean;
  isScam?: boolean;
  isRag?: boolean;
  reasons?: string[];
  riskScore?: number;
}

export interface ManipulationStats {
  total: number;
  spoofing: number;
  layering: number;
  washTrading: number;
  averageRiskScore: number;
  paddingCount: number;
  scamCount: number;
  ragCount: number;
}

export const orderFlowAnalyzer = {
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

  analyzeOrder: (order: OrderData): ManipulationFlags => {
    let riskScore = 0;
    let reasons: string[] = [];
    let flags = {
      spoofing: false,
      layering: false,
      washTrading: false,
      isPadding: false,
      isScam: false,
      isRag: false
    };

    const isLargeOrder = order.size > 10;
    const isRapidOrder = Date.now() - order.timestamp < 100;

    if (isLargeOrder) {
      riskScore += 4;
      if (isRapidOrder) {
        flags.spoofing = true;
        reasons.push('Large order with rapid timing');
        riskScore += 3;
      } else {
        reasons.push('Large order block');
      }
    }

    if (order.size < 0.01) {
      flags.isPadding = true;
      reasons.push('Micro order - potential volume padding');
      riskScore += 1;
    }

    if (isRapidOrder) {
      flags.isRag = true;
      reasons.push('Rapid execution detected');
      riskScore += 2;
    }

    if (reasons.length === 0) {
      reasons.push('Normal trading pattern');
    }

    return {
      spoofing: flags.spoofing,
      layering: flags.layering,
      washTrading: flags.washTrading,
      reasons: reasons,
      riskScore: Math.min(10, riskScore),
      isPadding: flags.isPadding,
      isScam: flags.isScam,
      isRag: flags.isRag
    };
  },

  getManipulationStats: (orders: any[]): ManipulationStats => {
    let paddingCount = 0;
    let scamCount = 0;
    let ragCount = 0;
    let spoofingCount = 0;
    let totalRisk = 0;

    orders.forEach(o => {
      const f = o.flags || {};
      if (f.isPadding) paddingCount++;
      if (f.isScam) scamCount++;
      if (f.isRag) ragCount++;
      if (f.spoofing) spoofingCount++;
      totalRisk += (o.riskScore || 0);
    });

    const averageRiskScore = orders.length > 0 ? (totalRisk / orders.length) : 0;

    return { 
      total: orders.length, 
      spoofing: spoofingCount, 
      layering: 0, 
      washTrading: 0,
      averageRiskScore,
      paddingCount,
      scamCount,
      ragCount
    };
  },

  generateMockOrders: (symbolOrCount: string | number, count?: number): OrderData[] => {
    const actualCount = typeof symbolOrCount === 'number' ? symbolOrCount : (count || 10);
    const symbol = typeof symbolOrCount === 'string' ? symbolOrCount : 'BTCUSDT';
    const now = Date.now();
    
    return Array.from({ length: actualCount }, (_, i) => {
      const timestamp = now - (i * 2000) + Math.random() * 1000; // Spread over time
      const isBuy = Math.random() > 0.5;
      const baseSize = Math.random() * 10;
      
      // Create more varied order sizes
      let size = baseSize;
      if (Math.random() > 0.9) size *= 5; // Some large orders
      if (Math.random() > 0.8) size *= 0.1; // Some micro orders
      
      return {
        id: `order-${timestamp}-${i}`,
        timestamp: timestamp,
        price: 45000 + Math.random() * 10000, // Realistic BTC price range
        quantity: size,
        side: isBuy ? 'buy' as const : 'sell' as const,
        symbol: symbol,
        size: size
      };
    });
  }
};

export const enhancedOrderFlowAnalyzer = {
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
    id: `enhanced-${i}`,
    timestamp: Date.now() + i * 1000,
    price: Math.random() * 50000 + 20000,
    volume: Math.random() * 10,
    type: Math.random() > 0.5 ? 'buy' as const : 'sell' as const,
    symbol: 'BTCUSDT',
    riskScore: Math.random() * 10
  }))
};

export default orderFlowAnalyzer;
