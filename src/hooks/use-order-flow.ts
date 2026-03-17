import { useState, useEffect, useMemo, useCallback } from "react";
import * as React from "react";
import { orderFlowAnalyzer, enhancedOrderFlowAnalyzer, type OrderData, type ManipulationFlags } from "@/lib/order-flow-analyzer";

// Types
export interface OrderFlowData {
  symbol: string;
  timestamp: number;
  orderType: 'buy' | 'sell';
  size: number;
  price: number;
  suspiciousFlags: string[];
  riskScore: number;
  flags: ManipulationFlags;
  marketSource?: any;
}

export interface BinanceOrderFlowData {
  id: string;
  timestamp: number;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  symbol: string;
}

export interface VeryLargeActivity {
  id: string;
  startTime: number;
  endTime?: number;
  symbol: string;
  type: 'massive_buy' | 'massive_sell' | 'whale_activity' | 'coordinated_attack';
  totalVolume: number;
  orderCount: number;
  avgPrice: number;
  maxOrderSize: number;
  description: string;
  isActive: boolean;
  riskLevel: 'extreme' | 'critical';
}

export interface ManipulationPattern {
  type: 'padding' | 'scam' | 'rag';
  description: string;
  severity: 'low' | 'medium' | 'high';
  count: number;
  examples: OrderFlowData[];
}

// Mock implementations for missing services
const getTicker = async (symbol: string) => ({ price: Math.random() * 50000 + 20000 });
const getKlines = async (symbol: string, interval: string) => ([]);

const createDualApiService = (key1?: string | null, key2?: string | null) => ({
  getCoinDetails: (symbol: string) => Promise.resolve({ symbol }),
  trackBinanceUsage: (count?: number) => {},
  getApiStatus: async () => ({ status: 'ok', activeApi: 'binance' })
});

const binanceWebSocketService = {
  onConnection: (callback: (connected: boolean) => void) => {},
  onError: (callback: (error: Error) => void) => {},
  subscribeToAggTrades: (symbol: string, callback: (orderData: BinanceOrderFlowData) => void) => {},
  connect: () => {},
  unsubscribe: (symbol?: string) => {},
  disconnect: () => {}
};

export function useOrderFlow(selectedSymbol: string, selectedTimeInterval: string, coingeckoApiKey?: string | null, coinmarketcapApiKey?: string | null) {
  const [orderFlowData, setOrderFlowData] = useState<OrderFlowData[]>([]);
  const [manipulationPatterns, setManipulationPatterns] = useState<ManipulationPattern[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [hasHighRiskDetected, setHasHighRiskDetected] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<any>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [realTimeOrders, setRealTimeOrders] = useState<BinanceOrderFlowData[]>([]);
  const [tradingChartData, setTradingChartData] = useState<any[]>([]);
  
  // Very Large Activity tracking
  const [veryLargeActivities, setVeryLargeActivities] = useState<VeryLargeActivity[]>([]);
  const [activeVeryLargeActivity, setActiveVeryLargeActivity] = useState<VeryLargeActivity | null>(null);
  const [veryLargeActivityLog, setVeryLargeActivityLog] = useState<string[]>([]);

  const dualApiService = useMemo(() => createDualApiService(coingeckoApiKey, coinmarketcapApiKey), [coingeckoApiKey, coinmarketcapApiKey]);

  const { buyOrderCount, sellOrderCount } = useMemo(() => {
    let buy = 0;
    let sell = 0;
    for (let i = 0; i < orderFlowData.length; i++) {
      if (orderFlowData[i].orderType === 'buy') buy++;
      else if (orderFlowData[i].orderType === 'sell') sell++;
    }
    return { buyOrderCount: buy, sellOrderCount: sell };
  }, [orderFlowData]);

  const getIntervalMs = useCallback((interval: string) => {
    switch (interval) {
      case '30s': return 30000;
      case '5m': return 300000;
      case '1h': return 3600000;
      case '4h': return 14400000;
      default: return 30000;
    }
  }, []);

  const updateChartData = useCallback((orders: OrderFlowData[]) => {
    const intervalMs = getIntervalMs(selectedTimeInterval);
    const now = Date.now();
    const timeGroups: { [key: number]: any } = {};
    
    // Generate time slots for the last 20 intervals to ensure continuous data
    const numIntervals = 20;
    for (let i = numIntervals - 1; i >= 0; i--) {
      const intervalTime = Math.floor((now - (i * intervalMs)) / intervalMs) * intervalMs;
      timeGroups[intervalTime] = {
        buyVolume: 0,
        sellVolume: 0,
        buyCount: 0,
        sellCount: 0,
        avgRisk: 0,
        timestamp: intervalTime
      };
    }
    
    // Process existing orders into time groups
    const dataToProcess = orders;
    dataToProcess.forEach(order => {
      const intervalTime = Math.floor(order.timestamp / intervalMs) * intervalMs;
      if (timeGroups[intervalTime]) {
        if (order.orderType === 'buy') {
          timeGroups[intervalTime].buyVolume += order.size;
          timeGroups[intervalTime].buyCount += 1;
        } else {
          timeGroups[intervalTime].sellVolume += order.size;
          timeGroups[intervalTime].sellCount += 1;
        }
        timeGroups[intervalTime].avgRisk = (timeGroups[intervalTime].avgRisk + order.riskScore) / 2;
      }
    });

    Object.values(timeGroups).forEach(group => {
      if (group.buyVolume === 0 && group.sellVolume === 0) {
        const baseVolume = Math.random() * 5 + 1;
        group.buyVolume = baseVolume * (0.4 + Math.random() * 0.2);
        group.sellVolume = baseVolume * (0.4 + Math.random() * 0.2);
        group.buyCount = Math.floor(Math.random() * 3) + 1;
        group.sellCount = Math.floor(Math.random() * 3) + 1;
        group.avgRisk = Math.random() * 3 + 1;
      }
    });

    const chartDataArray = Object.entries(timeGroups)
      .map(([timestampStr, data]: [string, any]) => ({
        time: parseInt(timestampStr),
        timestamp: data.timestamp,
        buyVolume: data.buyVolume,
        sellVolume: data.sellVolume,
        buyCount: data.buyCount,
        sellCount: data.sellCount,
        avgRisk: data.avgRisk,
        netFlow: data.buyVolume - data.sellVolume,
        totalVolume: data.buyVolume + data.sellVolume,
        orderImbalance: ((data.buyCount - data.sellCount) / Math.max(data.buyCount + data.sellCount, 1)) * 100
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    setChartData(chartDataArray);
  }, [selectedTimeInterval, getIntervalMs]);

  const generateTradingChartData = useCallback(() => {
    const now = Date.now();
    const intervalMs = getIntervalMs(selectedTimeInterval);
    const numCandles = 50;
    
    const basePrice = 45000 + Math.random() * 10000;
    let currentPrice = basePrice;
    
    const tradingData = Array.from({ length: numCandles }, (_, i) => {
      const timestamp = now - ((numCandles - 1 - i) * intervalMs);
      const open = currentPrice;
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility * open;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 0.01 * open;
      const low = Math.min(open, close) - Math.random() * 0.01 * open;
      const volume = (50 + Math.random() * 100) * Math.abs(change / open) * 1000;
      currentPrice = close;
      
      return {
        timestamp,
        time: timestamp,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Number(volume.toFixed(2)),
        sma20: Number((currentPrice * (0.98 + Math.random() * 0.04)).toFixed(2)),
        ema12: Number((currentPrice * (0.99 + Math.random() * 0.02)).toFixed(2)),
        buyPressure: orderFlowData.filter(o => Math.abs(o.timestamp - timestamp) < intervalMs && o.orderType === 'buy').length,
        sellPressure: orderFlowData.filter(o => Math.abs(o.timestamp - timestamp) < intervalMs && o.orderType === 'sell').length,
        manipulationRisk: Math.random() * 10,
        resistance: Number((high * 1.005).toFixed(2)),
        support: Number((low * 0.995).toFixed(2))
      };
    });
    
    setTradingChartData(tradingData);
  }, [selectedTimeInterval, orderFlowData, getIntervalMs]);

  const fetchMarketData = useCallback(async () => {
    try {
      const ticker = selectedSymbol.replace('USDT', '').toLowerCase();
      const coinDetails = await dualApiService.getCoinDetails(ticker);
      
      let binanceData = null;
      try {
        const tickerData = await getTicker(selectedSymbol);
        binanceData = tickerData;
        dualApiService.trackBinanceUsage(1);
      } catch (binanceError) {
        console.warn(`⚠️ Binance API failed for ${selectedSymbol}:`, binanceError);
      }
      
      const apiStatus = await dualApiService.getApiStatus();
      const combinedMarketData = {
        symbol: selectedSymbol,
        coinDetails: coinDetails,
        binanceData: binanceData,
        timestamp: Date.now(),
        dataSource: {
          coinApi: coinDetails ? apiStatus.activeApi : 'None',
          priceApi: binanceData ? 'Binance' : 'None'
        }
      };
      
      setMarketData(combinedMarketData);
    } catch (error) {
      console.error('❌ Error fetching market data:', error);
    }
  }, [selectedSymbol, dualApiService]);

  const loadMockData = useCallback(async () => {
    let mockOrders: OrderData[];
    
    if (marketData?.binanceData) {
      const enhancedOrders = await enhancedOrderFlowAnalyzer.generateEnhancedOrders(100, selectedSymbol, dualApiService);
      mockOrders = enhancedOrders.map(order => ({
        id: order.id,
        symbol: order.symbol,
        timestamp: order.timestamp,
        side: (order as any).type || (order as any).side,
        size: (order as any).volume || (order as any).size,
        quantity: (order as any).volume || (order as any).size,
        price: order.price,
        orderId: order.id,
        venue: (order as any).source
      }));
    } else {
      mockOrders = orderFlowAnalyzer.generateMockOrders(selectedSymbol, 100);
    }
    
    const analyzedOrders: OrderFlowData[] = mockOrders.map(order => {
      const flags = orderFlowAnalyzer.analyzeOrder(order);
      return {
        symbol: order.symbol,
        timestamp: order.timestamp,
        orderType: order.side,
        size: order.size,
        price: order.price,
        suspiciousFlags: flags.reasons || [],
        riskScore: flags.riskScore || 0,
        flags,
        marketSource: marketData?.dataSource
      };
    });

    setOrderFlowData(analyzedOrders);
    const currentStats = orderFlowAnalyzer.getManipulationStats(selectedSymbol);
    setStats(currentStats);

    const hasLargeOrderManipulation = analyzedOrders.some(order => order.riskScore >= 8 && order.size > 10);
    const hasHighOverallRisk = currentStats.averageRiskScore >= 7;
    setHasHighRiskDetected(hasLargeOrderManipulation || hasHighOverallRisk);

    const patterns: ManipulationPattern[] = [
      {
        type: 'padding',
        description: 'Small orders placed to create artificial volume',
        severity: currentStats.paddingCount > 10 ? 'high' : currentStats.paddingCount > 5 ? 'medium' : 'low',
        count: currentStats.paddingCount,
        examples: analyzedOrders.filter(order => order.flags.isPadding).slice(0, 3)
      },
      {
        type: 'scam',
        description: 'Suspicious trading patterns indicating potential scam activity',
        severity: currentStats.scamCount > 5 ? 'high' : currentStats.scamCount > 2 ? 'medium' : 'low',
        count: currentStats.scamCount,
        examples: analyzedOrders.filter(order => order.flags.isScam).slice(0, 3)
      },
      {
        type: 'rag',
        description: 'Rapid aggressive trades designed to manipulate price',
        severity: currentStats.ragCount > 8 ? 'high' : currentStats.ragCount > 4 ? 'medium' : 'low',
        count: currentStats.ragCount,
        examples: analyzedOrders.filter(order => order.flags.isRag).slice(0, 3)
      }
    ];

    setManipulationPatterns(patterns);
    updateChartData(analyzedOrders);
  }, [selectedSymbol, marketData, dualApiService, updateChartData]);

  const detectVeryLargeActivity = useCallback((recentOrders: OrderFlowData[]) => {
    const isWhaleActivity = recentOrders.some(o => o.size > 25);
    const highRiskDensity = recentOrders.filter(o => o.riskScore >= 7).length / Math.max(recentOrders.length, 1);
    
    if (isWhaleActivity || highRiskDensity > 0.4) {
      if (!activeVeryLargeActivity) {
        const newActivity: VeryLargeActivity = {
          id: `whale-${Date.now()}`,
          startTime: Date.now(),
          symbol: selectedSymbol,
          type: isWhaleActivity ? 'whale_activity' : 'massive_buy',
          totalVolume: recentOrders.reduce((acc, o) => acc + o.size, 0),
          orderCount: recentOrders.length,
          avgPrice: recentOrders.reduce((acc, o) => acc + o.price, 0) / recentOrders.length,
          maxOrderSize: Math.max(...recentOrders.map(o => o.size)),
          description: isWhaleActivity ? '🐋 Massive whale movement detected!' : '🚨 Coordinated pump/dump pattern!',
          isActive: true,
          riskLevel: highRiskDensity > 0.7 ? 'extreme' : 'critical'
        };
        setActiveVeryLargeActivity(newActivity);
        setVeryLargeActivities(prev => [newActivity, ...prev]);
        setVeryLargeActivityLog(prev => [`[${new Date().toLocaleTimeString()}] ALERT: ${newActivity.description}`, ...prev]);
      }
    } else if (activeVeryLargeActivity) {
      if (Date.now() - activeVeryLargeActivity.startTime > 30000) {
        setActiveVeryLargeActivity(null);
      }
    }
  }, [selectedSymbol, activeVeryLargeActivity]);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    const marketDataInterval = setInterval(() => fetchMarketData(), 30000);
    const orderInterval = setInterval(async () => {
      if (Math.random() > 0.7) {
        let newOrder: OrderData;
        if (marketData?.binanceData) {
          const enhancedOrders = await enhancedOrderFlowAnalyzer.generateEnhancedOrders(1, selectedSymbol, dualApiService);
          const enhancedOrder = enhancedOrders[0];
          newOrder = {
            id: enhancedOrder.id,
            symbol: enhancedOrder.symbol,
            timestamp: enhancedOrder.timestamp,
            side: (enhancedOrder as any).type || (enhancedOrder as any).side,
            size: (enhancedOrder as any).volume || (enhancedOrder as any).size,
            quantity: (enhancedOrder as any).volume || (enhancedOrder as any).size,
            price: enhancedOrder.price,
            orderId: enhancedOrder.id,
            venue: (enhancedOrder as any).source
          };
        } else {
          newOrder = orderFlowAnalyzer.generateMockOrders(selectedSymbol, 1)[0];
        }
        
        const flags = orderFlowAnalyzer.analyzeOrder(newOrder);
        const analyzedOrder: OrderFlowData = {
          symbol: newOrder.symbol,
          timestamp: newOrder.timestamp,
          orderType: newOrder.side,
          size: newOrder.size,
          price: newOrder.price,
          suspiciousFlags: flags.reasons || [],
          riskScore: flags.riskScore || 0,
          flags,
          marketSource: marketData?.dataSource
        };

        setOrderFlowData(prev => {
          const newData = [analyzedOrder, ...prev.slice(0, 99)];
          updateChartData(newData.slice(0, 50));
          detectVeryLargeActivity(newData.slice(0, 20));
          return newData;
        });
        
        const currentStats = orderFlowAnalyzer.getManipulationStats(selectedSymbol);
        setStats(currentStats);
        setHasHighRiskDetected(analyzedOrder.riskScore >= 8 && analyzedOrder.size > 10 || currentStats.averageRiskScore >= 7);
      }
    }, 2000);

    return () => {
      clearInterval(marketDataInterval);
      clearInterval(orderInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol, isMonitoring]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  const saveActivityLog = useCallback(() => {
    const logText = veryLargeActivityLog.join('\n');
    console.log('Saving activity log:', logText);
    alert('Log exported to console (simulated)');
  }, [veryLargeActivityLog]);

  // Effects
  useEffect(() => {
    loadMockData();
    fetchMarketData();
    generateTradingChartData();
    
    const interval = setInterval(() => {
      loadMockData();
      fetchMarketData();
      generateTradingChartData();
    }, 60000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol, selectedTimeInterval]);

  useEffect(() => {
    binanceWebSocketService.connect();
    binanceWebSocketService.onConnection(connected => setIsWebSocketConnected(connected));
    binanceWebSocketService.subscribeToAggTrades(selectedSymbol, (orderData) => {
      setRealTimeOrders(prev => [orderData, ...prev].slice(0, 1000));
      const analysisOrder: OrderData = {
        id: orderData.id,
        symbol: orderData.symbol,
        timestamp: orderData.timestamp,
        side: orderData.side,
        size: orderData.quantity,
        quantity: orderData.quantity,
        price: orderData.price,
        orderId: orderData.id,
        venue: 'binance-ws'
      };
      const analyzed = orderFlowAnalyzer.analyzeOrder(analysisOrder);
      const orderFlowItem: OrderFlowData = {
        symbol: orderData.symbol,
        timestamp: orderData.timestamp,
        orderType: orderData.side,
        size: orderData.quantity,
        price: orderData.price,
        suspiciousFlags: analyzed.reasons || [],
        riskScore: analyzed.riskScore || 0,
        flags: analyzed,
        marketSource: { coinApi: 'binance-ws', priceApi: 'binance-ws' }
      };
      setOrderFlowData(prev => [orderFlowItem, ...prev].slice(0, 500));
      const currentStats = orderFlowAnalyzer.getManipulationStats(selectedSymbol);
      setStats(currentStats);
      setHasHighRiskDetected(analyzed.riskScore >= 8 || currentStats.averageRiskScore >= 7);
    });
    
    return () => {
      binanceWebSocketService.unsubscribe(selectedSymbol);
    };
  }, [selectedSymbol]);

  useEffect(() => {
    if (isMonitoring) {
      const cleanup = startMonitoring();
      return cleanup;
    }
  }, [isMonitoring, startMonitoring]);

  useEffect(() => {
    return () => {
      binanceWebSocketService.disconnect();
    };
  }, []);

  // Analysis Helpers
  const helpers = useMemo(() => ({
    calculateMarketSentiment: () => {
      if (!stats || stats.totalOrders === 0) return 0.5;
      const recentOrders = orderFlowData.slice(-20);
      let buy = 0, sell = 0;
      recentOrders.forEach(o => { if (o.orderType === 'buy') buy++; else if (o.orderType === 'sell') sell++; });
      return (buy + sell === 0) ? 0.5 : buy / (buy + sell);
    },
    getMarketSentiment: () => {
      const sentiment = helpers.calculateMarketSentiment();
      return sentiment > 0.6 ? 'bullish' : sentiment < 0.4 ? 'bearish' : 'neutral';
    },
    getTradingSignal: () => {
      if (!stats) return { signal: 'wait', confidence: 0, reason: 'No data available' };
      const riskScore = stats.averageRiskScore;
      const sentiment = helpers.calculateMarketSentiment();
      if (riskScore > 7) return { signal: 'strong_sell', confidence: 90, reason: 'High manipulation risk detected!' };
      if (sentiment > 0.7 && riskScore < 4) return { signal: 'strong_buy', confidence: 85, reason: 'Strong bullish momentum with low risk' };
      if (sentiment > 0.6 && riskScore < 5) return { signal: 'buy', confidence: 70, reason: 'Positive sentiment and manageable risk' };
      if (sentiment < 0.4 || riskScore > 5) return { signal: 'sell', confidence: 65, reason: 'Negative sentiment or elevated risk' };
      return { signal: 'wait', confidence: 50, reason: 'Market is neutral or signals are conflicting' };
    },
    getVolumeIndicator: () => {
      const avgVolume = stats?.averageVolume || 0;
      if (avgVolume > 5) return '🔥';
      if (avgVolume > 2) return '📈';
      return '📊';
    },
    getVolumeDescription: () => {
      const avgVolume = stats?.averageVolume || 0;
      if (avgVolume > 5) return 'High Activity';
      if (avgVolume > 2) return 'Moderate Volume';
      return 'Normal Trading';
    },
    getVolumeExplanation: () => {
      const avgVolume = stats?.averageVolume || 0;
      if (avgVolume > 5) return 'Significantly higher than usual trading volume detected.';
      if (avgVolume > 2) return 'Above average trading volume at this time.';
      return 'Volume is within normal expected ranges.';
    },
    getRiskLevel: () => {
      const riskScore = stats?.averageRiskScore || 0;
      if (riskScore >= 7) return 'HIGH RISK';
      if (riskScore >= 4) return 'MEDIUM RISK';
      return 'LOW RISK';
    },
    getRiskLevelColor: () => {
      const riskScore = stats?.averageRiskScore || 0;
      if (riskScore >= 7) return 'text-red-600';
      if (riskScore >= 4) return 'text-yellow-600';
      return 'text-green-600';
    },
    getRiskExplanation: () => {
      const riskScore = stats?.averageRiskScore || 0;
      if (riskScore >= 7) return 'Critical manipulation patterns detected. Extreme caution advised.';
      if (riskScore >= 4) return 'Some suspicious activities detected. Monitor trades closely.';
      return 'No significant manipulation detected. Normal market conditions.';
    },
    getRecommendedActions: () => {
      const signal = helpers.getTradingSignal();
      const riskScore = stats?.averageRiskScore || 0;
      const actions = [];
      if (signal.signal.includes('buy')) actions.push({ title: 'Consider Buying', description: `Market shows ${signal.reason}` });
      if (signal.signal.includes('sell')) actions.push({ title: 'Consider Selling', description: `Warning: ${signal.reason}` });
      if (riskScore > 5) actions.push({ title: 'Reduce Risk', description: 'Elevated manipulation detected. Use tight stop losses.' });
      if (actions.length === 0) actions.push({ title: 'Hold / Wait', description: 'No clear signals at the moment.' });
      return actions;
    }
  }), [stats, orderFlowData]);

  return {
    orderFlowData,
    manipulationPatterns,
    isMonitoring,
    stats,
    hasHighRiskDetected,
    chartData,
    marketData,
    isWebSocketConnected,
    realTimeOrders,
    tradingChartData,
    veryLargeActivities,
    activeVeryLargeActivity,
    veryLargeActivityLog,
    buyOrderCount,
    sellOrderCount,
    setIsMonitoring,
    setSelectedSymbol: (s: string) => {}, // This is handled by parent for now
    startMonitoring,
    stopMonitoring,
    saveActivityLog,
    setOrderFlowData,
    updateChartData,
    ...helpers
  };
}
