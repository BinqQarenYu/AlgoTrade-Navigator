export interface OrderData {
  symbol: string;
  timestamp: number;
  side: 'buy' | 'sell';
  size: number;
  price: number;
  orderId: string;
  venue?: string;
}

export interface ManipulationFlags {
  isPadding: boolean;
  isScam: boolean;
  isRag: boolean;
  riskScore: number;
  reasons: string[];
}

export class OrderFlowAnalyzer {
  private orderHistory: OrderData[] = [];
  private readonly MAX_HISTORY = 1000;

  addOrder(order: OrderData) {
    this.orderHistory.unshift(order);
    if (this.orderHistory.length > this.MAX_HISTORY) {
      this.orderHistory = this.orderHistory.slice(0, this.MAX_HISTORY);
    }
  }

  analyzeOrder(order: OrderData): ManipulationFlags {
    const flags: ManipulationFlags = {
      isPadding: false,
      isScam: false,
      isRag: false,
      riskScore: 0,
      reasons: []
    };

    // Analyze for padding (small orders to create artificial volume)
    if (this.detectPadding(order)) {
      flags.isPadding = true;
      flags.riskScore += 2;
      flags.reasons.push('Small order padding detected');
    }

    // Analyze for scam patterns (suspicious order behavior)
    if (this.detectScamPattern(order)) {
      flags.isScam = true;
      flags.riskScore += 5;
      flags.reasons.push('Scam pattern detected');
    }

    // Analyze for rag (rapid aggressive trading)
    if (this.detectRagPattern(order)) {
      flags.isRag = true;
      flags.riskScore += 3;
      flags.reasons.push('Rapid aggressive trading detected');
    }

    // Additional risk factors
    flags.riskScore += this.calculateAdditionalRisk(order);

    return flags;
  }

  private detectPadding(order: OrderData): boolean {
    // Check for small orders that might be padding
    const recentOrders = this.getRecentOrders(order.symbol, 60000); // Last minute
    const avgSize = recentOrders.reduce((sum, o) => sum + o.size, 0) / recentOrders.length;
    
    // If order is significantly smaller than average and there are many small orders
    if (order.size < avgSize * 0.1 && recentOrders.length > 10) {
      const smallOrders = recentOrders.filter(o => o.size < avgSize * 0.2);
      return smallOrders.length > recentOrders.length * 0.7;
    }
    
    return false;
  }

  private detectScamPattern(order: OrderData): boolean {
    // Look for suspicious patterns like wash trading
    const recentOrders = this.getRecentOrders(order.symbol, 300000); // Last 5 minutes
    
    // Check for back-and-forth trading (buy followed by sell at similar prices)
    const similarPriceOrders = recentOrders.filter(o => 
      Math.abs(o.price - order.price) / order.price < 0.001 // Within 0.1%
    );
    
    if (similarPriceOrders.length >= 2) {
      const buyCount = similarPriceOrders.filter(o => o.side === 'buy').length;
      const sellCount = similarPriceOrders.filter(o => o.side === 'sell').length;
      
      // If there's an even distribution of buys and sells at similar prices
      return Math.abs(buyCount - sellCount) <= 1 && buyCount > 1 && sellCount > 1;
    }
    
    return false;
  }

  private detectRagPattern(order: OrderData): boolean {
    // Check for rapid aggressive trading patterns
    const recentOrders = this.getRecentOrders(order.symbol, 30000); // Last 30 seconds
    
    if (recentOrders.length >= 5) {
      // Check if orders are rapidly changing the market price
      const priceChanges = [];
      for (let i = 1; i < recentOrders.length; i++) {
        const change = Math.abs(recentOrders[i-1].price - recentOrders[i].price) / recentOrders[i].price;
        priceChanges.push(change);
      }
      
      const avgPriceChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
      
      // If average price change is significant and order frequency is high
      return avgPriceChange > 0.005 && recentOrders.length > 8; // 0.5% average change with high frequency
    }
    
    return false;
  }

  private calculateAdditionalRisk(order: OrderData): number {
    let risk = 0;
    
    // Large order risk
    const recentOrders = this.getRecentOrders(order.symbol, 300000);
    if (recentOrders.length > 0) {
      const avgSize = recentOrders.reduce((sum, o) => sum + o.size, 0) / recentOrders.length;
      if (order.size > avgSize * 10) {
        risk += 3; // Large order compared to recent average - higher risk
      } else if (order.size > avgSize * 5) {
        risk += 2; // Moderately large order
      }
    }
    
    // Extremely large orders (absolute size thresholds)
    if (order.size > 50) {
      risk += 2; // Very large absolute size
    }
    
    // Time-based risk (orders during low liquidity periods)
    const hour = new Date(order.timestamp).getHours();
    if (hour < 6 || hour > 22) {
      risk += 1; // Off-hours trading
    }
    
    // Price manipulation indicators
    const priceHistory = this.getRecentOrders(order.symbol, 60000); // Last minute
    if (priceHistory.length > 3) {
      const prices = priceHistory.map(o => o.price);
      const priceVolatility = (Math.max(...prices) - Math.min(...prices)) / Math.min(...prices);
      if (priceVolatility > 0.02 && order.size > 10) { // High volatility + large size
        risk += 2;
      }
    }
    
    return Math.min(risk, 5); // Cap additional risk at 5 (higher cap for better detection)
  }

  private getRecentOrders(symbol: string, timeWindow: number): OrderData[] {
    const cutoff = Date.now() - timeWindow;
    return this.orderHistory.filter(order => 
      order.symbol === symbol && order.timestamp > cutoff
    );
  }

  getManipulationStats(symbol?: string, timeWindow: number = 3600000) {
    const cutoff = Date.now() - timeWindow;
    const relevantOrders = this.orderHistory.filter(order => 
      order.timestamp > cutoff && (!symbol || order.symbol === symbol)
    );

    const stats = {
      totalOrders: relevantOrders.length,
      paddingCount: 0,
      scamCount: 0,
      ragCount: 0,
      highRiskCount: 0,
      averageRiskScore: 0
    };

    let totalRiskScore = 0;

    relevantOrders.forEach(order => {
      const flags = this.analyzeOrder(order);
      if (flags.isPadding) stats.paddingCount++;
      if (flags.isScam) stats.scamCount++;
      if (flags.isRag) stats.ragCount++;
      if (flags.riskScore >= 7) stats.highRiskCount++;
      totalRiskScore += flags.riskScore;
    });

    stats.averageRiskScore = relevantOrders.length > 0 ? totalRiskScore / relevantOrders.length : 0;

    return stats;
  }

  // Mock data generator for testing
  generateMockOrders(symbol: string, count: number = 50): OrderData[] {
    const orders: OrderData[] = [];
    
    // Get realistic base price based on symbol
    const getBasePrice = (symbol: string): number => {
      // Top cryptocurrencies
      if (symbol === 'BTCUSDT') return 67500;
      if (symbol === 'ETHUSDT') return 2650;
      if (symbol === 'BNBUSDT') return 420;
      if (symbol === 'XRPUSDT') return 0.52;
      if (symbol === 'SOLUSDT') return 145;
      if (symbol === 'ADAUSDT') return 0.45;
      if (symbol === 'AVAXUSDT') return 28;
      if (symbol === 'DOTUSDT') return 6.8;
      if (symbol === 'LINKUSDT') return 12.5;
      if (symbol === 'MATICUSDT') return 0.85;
      if (symbol === 'UNIUSDT') return 8.2;
      if (symbol === 'LTCUSDT') return 85;
      if (symbol === 'NEARUSDT') return 5.4;
      if (symbol === 'ATOMUSDT') return 9.2;
      if (symbol === 'FILUSDT') return 4.8;
      if (symbol === 'APTUSDT') return 8.5;
      if (symbol === 'ARBUSDT') return 1.2;
      if (symbol === 'OPUSDT') return 2.1;
      if (symbol === 'INJUSDT') return 25;
      if (symbol === 'SUIUSDT') return 2.8;
      
      // Meme coins
      if (symbol === 'DOGEUSDT') return 0.082;
      if (symbol === 'SHIBUSDT') return 0.000018;
      if (symbol === 'PEPEUSDT') return 0.0000085;
      if (symbol === 'FLOKIUSDT') return 0.00018;
      if (symbol === 'WIFUSDT') return 2.4;
      if (symbol === 'BONKUSDT') return 0.000025;
      if (symbol === '1000RATSUSDT') return 0.12;
      if (symbol === 'BOMEUSDT') return 0.0095;
      if (symbol === 'MEMEUSDT') return 0.028;
      if (symbol === 'BABYDOGEUSDT') return 0.0000035;
      
      // New assets
      if (symbol === 'WLDUSDT') return 3.2;
      if (symbol === 'TIAUSDT') return 8.5;
      if (symbol === 'SELUSDT') return 0.42;
      if (symbol === 'JUPUSDT') return 0.85;
      if (symbol === 'ALTUSDT') return 0.18;
      if (symbol === 'JITOUSDT') return 2.4;
      if (symbol === 'DYMUSDT') return 2.8;
      if (symbol === 'AIUSDT') return 0.65;
      if (symbol === 'PIXELUSDT') return 0.28;
      if (symbol === 'STRKUSDT') return 1.2;
      
      // Networks (additional)
      if (symbol === 'ALGOUSDT') return 0.18;
      
      // Default fallback
      return 1.0;
    };
    
    const basePrice = getBasePrice(symbol);
    
    for (let i = 0; i < count; i++) {
      const timestamp = Date.now() - (i * 1000 * Math.random() * 60); // Random within last hour
      const priceVariation = (Math.random() - 0.5) * 0.02; // ±1% variation
      const price = basePrice * (1 + priceVariation);
      
      // Create some patterns
      let size = Math.random() * 2 + 0.1; // 0.1 to 2.1
      let side: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell';
      
      // Adjust size based on price for more realistic orders
      if (basePrice > 1000) { // High-value coins like BTC
        size = Math.random() * 0.5 + 0.001; // Smaller sizes
      } else if (basePrice < 0.001) { // Very low-value coins
        size = Math.random() * 1000000 + 10000; // Larger sizes
      } else if (basePrice < 1) { // Low-value coins
        size = Math.random() * 10000 + 100; // Medium-large sizes
      }
      
      // Introduce padding patterns (small orders)
      if (Math.random() < 0.3) {
        size = size * 0.1; // Very small orders
      }
      
      // Introduce large orders occasionally with high risk
      if (Math.random() < 0.1) {
        size = size * (Math.random() * 50 + 10); // Large orders
        
        // Some large orders should be high risk
        if (Math.random() < 0.4) { // 40% of large orders are high risk
          // This will be flagged as high risk in analyzeOrder
        }
      }
      
      orders.push({
        symbol,
        timestamp,
        side,
        size,
        price,
        orderId: `order_${i}_${timestamp}`,
        venue: 'binance'
      });
    }
    
    return orders.sort((a, b) => b.timestamp - a.timestamp);
  }
}

export const orderFlowAnalyzer = new OrderFlowAnalyzer();