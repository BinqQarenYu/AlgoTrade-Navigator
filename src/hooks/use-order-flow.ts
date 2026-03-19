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

import { createDualApiService } from "@/lib/dual-coin-api-service";
import { getRecentTrades } from "@/lib/binance-service";
import { wsManager } from "@/lib/websocket-manager";
import { backfillEngine } from "@/lib/lazy-backfill-worker";

const binanceWebSocketService = {
  connectionCallback: null as ((connected: boolean) => void) | null,
  errorCallback: null as ((error: Error) => void) | null,
  ws: null as any,
  
  onConnection: function(callback: (connected: boolean) => void) {
    this.connectionCallback = callback;
  },
  
  onError: function(callback: (error: Error) => void) {
    this.errorCallback = callback;
  },
  
  subscribeToAggTrades: function(symbol: string, callback: (orderData: BinanceOrderFlowData) => void) {
    const url = `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@aggTrade`;
    this.ws = wsManager.createConnection(`orderFlow-${symbol}`, { url });
    
    this.ws.addEventListener('open', () => {
      if (this.connectionCallback) this.connectionCallback(true);
    });
    
    this.ws.addEventListener('close', () => {
      if (this.connectionCallback) this.connectionCallback(false);
    });
    
    this.ws.addEventListener('message', (data: any) => {
      if (data.e === 'aggTrade') {
        const orderData: BinanceOrderFlowData = {
          id: data.a.toString(),
          timestamp: data.T,
          price: parseFloat(data.p),
          quantity: parseFloat(data.q),
          side: data.m ? 'sell' : 'buy',
          symbol: data.s.toUpperCase()
        };
        callback(orderData);
      }
    });
    
    this.ws.connect(url).catch((err: Error) => {
      if (this.errorCallback) this.errorCallback(err);
    });
  },
  
  connect: function() {},
  unsubscribe: function(symbol?: string) {
    if (this.ws && symbol) wsManager.removeConnection(`orderFlow-${symbol}`);
  },
  disconnect: function() {}
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
  
  // Use a ref to track if a whale alert is currently active to prevent duplicates during rapid updates
  const activeWhaleRef = React.useRef<string | null>(null);


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
      // Intentionally intentionally leave 0s instead of filling with mock data
      if (!group.buyVolume) group.buyVolume = 0;
      if (!group.sellVolume) group.sellVolume = 0;
      if (!group.buyCount) group.buyCount = 0;
      if (!group.sellCount) group.sellCount = 0;
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

  const generateTradingChartData = useCallback(async () => {
    const intervalMs = getIntervalMs(selectedTimeInterval);
    const binanceInterval = selectedTimeInterval === '30s' ? '1m' : selectedTimeInterval;
    
    try {
      const historicalData = await dualApiService.getHistoricalData(selectedSymbol, binanceInterval, 50);
      
      if (!historicalData || historicalData.length === 0) {
        return;
      }
      
      let prevEma12 = historicalData[0].close;
      let prices: number[] = [];

      const tradingData = historicalData.map((kline) => {
        const timestamp = kline.time;
        prices.push(kline.close);
        
        // Simple SMA20
        const sma20 = prices.slice(Math.max(prices.length - 20, 0)).reduce((a, b) => a + b, 0) / Math.min(prices.length, 20);
        
        // Simple EMA12
        const k = 2 / (12 + 1);
        const ema12 = (kline.close * k) + (prevEma12 * (1 - k));
        prevEma12 = ema12;
        
        const bVol = orderFlowData.filter(o => Math.abs(o.timestamp - timestamp) < intervalMs && o.orderType === 'buy').reduce((a, b) => a + b.size, 0);
        const sVol = orderFlowData.filter(o => Math.abs(o.timestamp - timestamp) < intervalMs && o.orderType === 'sell').reduce((a, b) => a + b.size, 0);
        
        return {
          timestamp,
          time: timestamp,
          open: Number(kline.open.toFixed(2)),
          high: Number(kline.high.toFixed(2)),
          low: Number(kline.low.toFixed(2)),
          close: Number(kline.close.toFixed(2)),
          volume: Number(kline.volume.toFixed(2)),
          sma20: Number(sma20.toFixed(2)),
          ema12: Number(ema12.toFixed(2)),
          buyPressure: orderFlowData.filter(o => Math.abs(o.timestamp - timestamp) < intervalMs && o.orderType === 'buy').length,
          sellPressure: orderFlowData.filter(o => Math.abs(o.timestamp - timestamp) < intervalMs && o.orderType === 'sell').length,
          manipulationRisk: bVol > 0 || sVol > 0 ? ((bVol > sVol * 3 || sVol > bVol * 3) ? 8 : 2) : 0,
          resistance: Number((kline.high * 1.005).toFixed(2)),
          support: Number((kline.low * 0.995).toFixed(2))
        };
      });
      
      setTradingChartData(tradingData);
    } catch (e) {
      console.warn("Failed to generate real trading chart data", e);
    }
  }, [selectedSymbol, selectedTimeInterval, orderFlowData, dualApiService, getIntervalMs]);

  const fetchMarketData = useCallback(async () => {
    try {
      const ticker = selectedSymbol.replace('USDT', '').toLowerCase();
      const coinDetails = await dualApiService.getCoinDetails(ticker);
      
      let binanceData = null;
      try {
        const tickerData = await dualApiService.getRealTimePrice(selectedSymbol);
        binanceData = tickerData;
      } catch (binanceError) {
        console.warn(`⚠️ Binance API price fetch failed for ${selectedSymbol}:`, binanceError);
      }
      
      const apiStatus = dualApiService.getApiStatus();
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

  const loadInitialOrderData = useCallback(async () => {
    let mockOrders: OrderData[] = [];
    
    try {
      const trades = await getRecentTrades(selectedSymbol, 100);
      if (trades && trades.length > 0) {
        mockOrders = trades.map((t: any) => ({
          id: t.id.toString(),
          symbol: selectedSymbol,
          timestamp: t.time,
          side: t.isBuyerMaker ? 'sell' : 'buy',
          size: parseFloat(t.qty),
          quantity: parseFloat(t.qty),
          price: parseFloat(t.price),
          orderId: t.id.toString(),
          venue: 'binance-rest'
        }));
      } else {
        mockOrders = orderFlowAnalyzer.generateMockOrders(selectedSymbol, 100);
      }
    } catch (error) {
      console.warn("Failed to fetch initial real trades, falling back to mock", error);
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
    const currentStats = orderFlowAnalyzer.getManipulationStats(analyzedOrders);
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
      if (!activeWhaleRef.current) {
        const timestamp = Date.now();
        const uniqueId = `whale-${timestamp}-${Math.random().toString(36).substring(2, 9)}`;
        
        const newActivity: VeryLargeActivity = {
          id: uniqueId,
          startTime: timestamp,
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
        
        activeWhaleRef.current = uniqueId;
        setActiveVeryLargeActivity(newActivity);
        setVeryLargeActivities(prev => [newActivity, ...prev]);
        setVeryLargeActivityLog(prev => [`[${new Date().toLocaleTimeString()}] ALERT: ${newActivity.description}`, ...prev]);
      }
    } else if (activeWhaleRef.current) {
      // Find the active activity to check its start time
      if (activeVeryLargeActivity && Date.now() - activeVeryLargeActivity.startTime > 30000) {
        activeWhaleRef.current = null;
        setActiveVeryLargeActivity(null);
      }
    }
  }, [selectedSymbol, activeVeryLargeActivity]);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    const marketDataInterval = setInterval(() => fetchMarketData(), 30000);

    return () => {
      clearInterval(marketDataInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol]);

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
    loadInitialOrderData();
    fetchMarketData();
    generateTradingChartData();
    
    // Only fetch market data based on interval here.
    // This avoids overlapping with the 30s interval inside startMonitoring.
    const interval = setInterval(() => {
      if (!isMonitoring) {
        fetchMarketData();
        generateTradingChartData();
      }
    }, 60000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol, selectedTimeInterval, isMonitoring]);

  // Batching references to optimize updates
  const bufferRef = React.useRef<BinanceOrderFlowData[]>([]);

  useEffect(() => {
    binanceWebSocketService.connect();
    binanceWebSocketService.onConnection(connected => setIsWebSocketConnected(connected));
    binanceWebSocketService.subscribeToAggTrades(selectedSymbol, (orderData) => {
      // Accumulate rapidly in mutable ref instead of triggering React
      bufferRef.current.push(orderData);
    });

    const batchInterval = setInterval(() => {
      const bufferedTrades = bufferRef.current;
      if (bufferedTrades.length === 0) return;

      // Clear buffer atomically
      bufferRef.current = [];

      // Process real time orders state
      setRealTimeOrders(prev => [...bufferedTrades, ...prev].slice(0, 1000));

      // Analyze all buffered trades
      const newOrderFlowItems: OrderFlowData[] = bufferedTrades.map(orderData => {
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
        return {
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
      });

      // Single react state update
      setOrderFlowData(prev => {
        const newData = [...newOrderFlowItems.reverse(), ...prev].slice(0, 500);
        updateChartData(newData.slice(0, 50));
        detectVeryLargeActivity(newData.slice(0, 20));

        const currentStats = orderFlowAnalyzer.getManipulationStats(newData);
        setStats(currentStats);

        // Check for high risk in newly processed batch
        const latestMaxRisk = Math.max(...newOrderFlowItems.map(item => item.riskScore), 0);
        setHasHighRiskDetected(latestMaxRisk >= 8 || currentStats.averageRiskScore >= 7);

        return newData;
      });

      // Throttled single DB save
      fetch('/api/db/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              source: 'LIVE',
              symbol: selectedSymbol,
              data: bufferedTrades
          })
      }).catch(e => console.error("Failed to write batched Live Stream to DB", e));

    }, 500); // 500ms batching interval
    
    // Spawn Background Gap Analysis and Fetch
    backfillEngine.init(selectedSymbol, (progress) => {
       console.log(`[Backfill Engine] ${selectedSymbol}: ${progress.toFixed(2)}% Complete`);
    });
    backfillEngine.start();
    
    return () => {
      clearInterval(batchInterval);
      binanceWebSocketService.unsubscribe(selectedSymbol);
      backfillEngine.pause();
    };
  }, [selectedSymbol, detectVeryLargeActivity, updateChartData]);

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
