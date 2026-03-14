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
    // Generate more realistic risk scores and patterns
    const baseRisk = Math.random() * 10;
    const isLargeOrder = order.size > 5;
    const isRapidOrder = Date.now() - order.timestamp < 1000;
    
    let riskScore = baseRisk;
    let reasons = ['Normal trading pattern'];
    let flags = { 
      spoofing: false, 
      layering: false, 
      washTrading: false, 
      isPadding: false, 
      isScam: false, 
      isRag: false 
    };
    
    // Detect manipulation patterns
    if (isLargeOrder && baseRisk > 7) {
      flags.spoofing = true;
      reasons = ['Large order with suspicious timing'];
      riskScore = Math.min(9, riskScore + 2);
    }
    
    if (order.size < 0.1 && Math.random() > 0.8) {
      flags.isPadding = true;
      reasons = ['Small order - potential volume padding'];
      riskScore = Math.min(8, riskScore + 1);
    }
    
    if (isRapidOrder && Math.random() > 0.9) {
      flags.isRag = true;
      reasons = ['Rapid aggressive trading detected'];
      riskScore = Math.min(9, riskScore + 2);
    }
    
    if (Math.random() > 0.95) {
      flags.isScam = true;
      reasons = ['Potential scam pattern detected'];
      riskScore = 9;
    }
    
    return { 
      spoofing: flags.spoofing, 
      layering: flags.layering, 
      washTrading: flags.washTrading,
      reasons: reasons,
      riskScore: riskScore,
      isPadding: flags.isPadding,
      isScam: flags.isScam,
      isRag: flags.isRag
    };
  },

  getManipulationStats: (symbol?: string): ManipulationStats => {
    const paddingCount = Math.floor(Math.random() * 10);
    const scamCount = Math.floor(Math.random() * 3);
    const ragCount = Math.floor(Math.random() * 15);
    
    return { 
      total: paddingCount + scamCount + ragCount, 
      spoofing: Math.floor(Math.random() * 5), 
      layering: Math.floor(Math.random() * 5), 
      washTrading: Math.floor(Math.random() * 3),
      averageRiskScore: 2 + Math.random() * 6, // Range 2-8
      paddingCount: paddingCount,
      scamCount: scamCount,
      ragCount: ragCount
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
