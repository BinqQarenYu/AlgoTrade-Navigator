"use client";

import { useState, useEffect } from "react";
import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  Shield, 
  Target,
  Timer,
  DollarSign,
  Users,
  Zap,
  RefreshCw,
  LayoutDashboard,
  HelpCircle,
  CheckCircle,
  XCircle,
  BarChart3
} from "lucide-react";
import { useApi } from "@/context/api-context";

// Mock implementations for missing services
const getTicker = async (symbol: string) => ({ price: Math.random() * 50000 + 20000 });
const getKlines = async (symbol: string, interval: string) => ([]);

// Mock types and interfaces
interface OrderData {
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

interface ManipulationFlags {
  spoofing: boolean;
  layering: boolean;
  washTrading: boolean;
  reasons?: string[];
  riskScore?: number;
  isPadding?: boolean;
  isScam?: boolean;
  isRag?: boolean;
}

interface EnhancedOrderFlowData {
  orders: OrderData[];
  manipulation: ManipulationFlags;
}

interface OrderFlowData {
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

interface BinanceOrderFlowData {
  id: string;
  timestamp: number;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  symbol: string;
}

// Mock services
const orderFlowAnalyzer = {
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
  analyzeOrder: (order: OrderData) => ({ 
    spoofing: false, 
    layering: false, 
    washTrading: false,
    reasons: ['Normal trading pattern'],
    riskScore: Math.random() * 10
  }),
  getManipulationStats: (symbol?: string) => ({ 
    total: 0, 
    spoofing: 0, 
    layering: 0, 
    washTrading: 0,
    averageRiskScore: 3,
    paddingCount: 0,
    scamCount: 0,
    ragCount: 0
  }),
  generateMockOrders: (symbolOrCount: string | number, count?: number) => {
    const actualCount = typeof symbolOrCount === 'number' ? symbolOrCount : (count || 10);
    const symbol = typeof symbolOrCount === 'string' ? symbolOrCount : 'BTCUSDT';
    return Array.from({ length: actualCount }, (_, i) => ({
      id: `order-${i}`,
      timestamp: Date.now() + i * 1000,
      price: Math.random() * 50000 + 20000,
      quantity: Math.random() * 10,
      side: Math.random() > 0.5 ? 'buy' as const : 'sell' as const,
      symbol: symbol,
      size: Math.random() * 10
    }));
  }
};

const enhancedOrderFlowAnalyzer = {
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
    source: 'binance'
  }))
};

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

interface VeryLargeActivity {
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

// Local lightweight Card replacement (fallback) to avoid missing module during build
const Card = ({ children, className = '', ...props }: any) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`} {...props}>
    {children}
  </div>
);
const CardHeader = ({ children, className = '', ...props }: any) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
    {children}
  </div>
);
const CardTitle = ({ children, className = '', ...props }: any) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);
const CardDescription = ({ children, className = '', ...props }: any) => (
  <p className={`text-sm text-muted-foreground ${className}`} {...props}>
    {children}
  </p>
);
const CardContent = ({ children, className = '', ...props }: any) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
);
// Local lightweight Button replacement (fallback) to avoid missing module during build
const Button = ({ children, className = '', variant, size, ...props }: any) => {
  const base = 'inline-flex items-center gap-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variantClass = variant === 'outline' ? 'border bg-white text-gray-800' : variant === 'destructive' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-800';
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-sm' : size === 'lg' ? 'px-4 py-2 text-lg' : 'px-3 py-2 text-sm';
  return (
    <button className={`${base} ${variantClass} ${sizeClass} ${className}`} {...props}>
      {children}
    </button>
  );
};
// Local lightweight Badge replacement (fallback) to avoid missing module during build
const Badge = ({ children, className = '', variant, ...props }: any) => {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors';
  const variantClass = variant === 'outline' ? 'border border-gray-300 text-gray-800' : variant === 'secondary' ? 'bg-gray-200 text-gray-800' : 'bg-gray-800 text-white';
  return (
    <span className={`${base} ${variantClass} ${className}`} {...props}>
      {children}
    </span>
  );
};
// Local lightweight Alert replacement (fallback) to avoid missing module during build
const Alert = ({ children, className = '', ...props }: any) => (
  <div className={`rounded-lg border p-4 ${className}`} {...props}>
    <div className="flex gap-3">
      {children}
    </div>
  </div>
);
const AlertTitle = ({ children, className = '', ...props }: any) => (
  <h5 className={`font-medium leading-none tracking-tight ${className}`} {...props}>
    {children}
  </h5>
);
const AlertDescription = ({ children, className = '', ...props }: any) => (
  <div className={`text-sm ${className}`} {...props}>
    {children}
  </div>
);
// Local lightweight Tabs replacement (fallback) to avoid missing module during build
const Tabs = ({ children, defaultValue, className = '', ...props }: any) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue);
  return (
    <div className={className} {...props} data-active-tab={activeTab}>
      {React.Children.map(children, child => 
        React.isValidElement(child) ? React.cloneElement(child as any, { activeTab, setActiveTab }) : child
      )}
    </div>
  );
};
const TabsList = ({ children, className = '', ...props }: any) => (
  <div className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`} {...props}>
    {children}
  </div>
);
const TabsTrigger = ({ children, value, className = '', activeTab, setActiveTab, ...props }: any) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
      activeTab === value ? 'bg-background text-foreground shadow-sm' : ''
    } ${className}`}
    onClick={() => setActiveTab && setActiveTab(value)}
    {...props}
  >
    {children}
  </button>
);
const TabsContent = ({ children, value, className = '', activeTab, ...props }: any) => (
  activeTab === value ? (
    <div className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`} {...props}>
      {children}
    </div>
  ) : null
);
// Local lightweight Progress replacement (fallback) to avoid missing module during build
const Progress = ({ value = 0, className = '', ...props }: any) => (
  <div className={`relative w-full bg-gray-200 rounded-full overflow-hidden ${className}`} style={{ height: '8px' }} {...props}>
    <div
      className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-300"
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);

interface VeryLargeActivity {
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

interface ManipulationPattern {
  type: 'padding' | 'scam' | 'rag';
  description: string;
  severity: 'low' | 'medium' | 'high';
  count: number;
  examples: OrderFlowData[];
}

export default function OrderFlowPage() {
  const { coingeckoApiKey, coinmarketcapApiKey } = useApi();
  
  const [orderFlowData, setOrderFlowData] = useState<OrderFlowData[]>([]);
  const [manipulationPatterns, setManipulationPatterns] = useState<ManipulationPattern[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTCUSDT");
  const [stats, setStats] = useState<any>(null);
  const [hasHighRiskDetected, setHasHighRiskDetected] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedTimeInterval, setSelectedTimeInterval] = useState<string>("30s");
  const [marketData, setMarketData] = useState<any>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [realTimeOrders, setRealTimeOrders] = useState<BinanceOrderFlowData[]>([]);
  
  // Initialize dual API service
  const dualApiService = createDualApiService(coingeckoApiKey, coinmarketcapApiKey);
  
  // Very Large Activity tracking
  const [veryLargeActivities, setVeryLargeActivities] = useState<VeryLargeActivity[]>([]);
  const [activeVeryLargeActivity, setActiveVeryLargeActivity] = useState<VeryLargeActivity | null>(null);
  const [veryLargeActivityLog, setVeryLargeActivityLog] = useState<string[]>([]);

  // Initialize with mock data and start analysis
  useEffect(() => {
    loadMockData();
    fetchMarketData();
  }, [selectedSymbol, selectedTimeInterval]);

  // WebSocket connection and real-time order flow management
  useEffect(() => {
    console.log(`🔗 Setting up WebSocket connection for ${selectedSymbol}`);
    
    // Connect to Binance WebSocket
    binanceWebSocketService.connect();
    
    // Set up connection status callback
    binanceWebSocketService.onConnection((connected) => {
      setIsWebSocketConnected(connected);
      console.log(`📡 Binance WebSocket ${connected ? 'connected' : 'disconnected'}`);
    });
    
    // Set up error callback
    binanceWebSocketService.onError((error) => {
      console.error('❌ Binance WebSocket error:', error);
    });
    
    // Subscribe to trade stream for the selected symbol
    binanceWebSocketService.subscribeToAggTrades(selectedSymbol, (orderData) => {
      console.log(`📊 New order received:`, orderData);
      
      // Add to real-time orders list (keep last 1000 orders)
      setRealTimeOrders(prev => {
        const updated = [orderData, ...prev];
        return updated.slice(0, 1000); // Keep only last 1000 orders
      });
      
      // Convert to OrderData format for analysis
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
      
      // Analyze the new order
      const analyzed = orderFlowAnalyzer.analyzeOrder(analysisOrder);
      
      // Create OrderFlowData object combining order and analysis
      const orderFlowItem: OrderFlowData = {
        symbol: orderData.symbol,
        timestamp: orderData.timestamp,
        orderType: orderData.side,
        size: orderData.quantity,
        price: orderData.price,
        suspiciousFlags: analyzed.reasons,
        riskScore: analyzed.riskScore,
        flags: analyzed,
        marketSource: {
          coinApi: 'binance-ws',
          priceApi: 'binance-ws'
        }
      };
      
      // Update order flow data with the new analyzed order
      setOrderFlowData(prev => {
        const updated = [orderFlowItem, ...prev];
        const limited = updated.slice(0, 500); // Keep last 500 analyzed orders
        
        // Update stats based on new data
        setTimeout(() => {
          const currentStats = orderFlowAnalyzer.getManipulationStats(selectedSymbol);
          setStats(currentStats);
          
          // Check for high risk
          const hasHighRisk = analyzed.riskScore >= 8 || currentStats.averageRiskScore >= 7;
          setHasHighRiskDetected(hasHighRisk);
        }, 100);
        
        return limited;
      });
    });
    
    // Cleanup function
    return () => {
      console.log(`🔌 Cleaning up WebSocket for ${selectedSymbol}`);
      binanceWebSocketService.unsubscribe(selectedSymbol);
    };
  }, [selectedSymbol]);

  // Cleanup WebSocket on component unmount
  useEffect(() => {
    return () => {
      binanceWebSocketService.disconnect();
    };
  }, []);

  // Fetch real market data from APIs
  const fetchMarketData = async () => {
    try {
      console.log(`🔍 Fetching market data for ${selectedSymbol} using multi-API approach...`);
      
      // Fetch coin details from dual API service (CoinGecko/CoinMarketCap with fallback)
      const ticker = selectedSymbol.replace('USDT', '').toLowerCase();
      const coinDetails = await dualApiService.getCoinDetails(ticker);
      
      // Fetch price data from Binance API
      let binanceData = null;
      try {
        console.log(`📡 Fetching ${selectedSymbol} ticker from Binance...`);
        const tickerData = await getTicker(selectedSymbol);
        binanceData = tickerData;
        
        // Track Binance usage (ticker requests typically have weight of 1)
        dualApiService.trackBinanceUsage(1);
        
        console.log(`✅ Binance ticker data received for ${selectedSymbol}`);
      } catch (binanceError) {
        console.warn(`⚠️ Binance API failed for ${selectedSymbol}:`, binanceError);
      }
      
      // Combine market data
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
      console.log(`🎯 Market data fetched:`, combinedMarketData);
      
    } catch (error) {
      console.error('❌ Error fetching market data:', error);
    }
  };

  const loadMockData = async () => {
    // Generate enhanced mock orders using the dual API service analyzer
    let mockOrders: OrderData[];
    
    if (marketData?.binanceData) {
      // Use real market data to generate more realistic mock orders
      console.log('📊 Generating enhanced mock orders with real market data...');
      const enhancedOrders = await enhancedOrderFlowAnalyzer.generateEnhancedOrders(
        100, 
        selectedSymbol, 
        dualApiService
      );
      // Convert enhanced orders to standard OrderData format
      mockOrders = enhancedOrders.map(order => ({
        id: order.id,
        symbol: order.symbol,
        timestamp: order.timestamp,
        side: order.type,
        size: order.volume,
        quantity: order.volume,
        price: order.price,
        orderId: order.id,
        venue: order.source
      }));
    } else {
      // Fallback to standard mock orders
      console.log('📊 Generating standard mock orders...');
      mockOrders = orderFlowAnalyzer.generateMockOrders(selectedSymbol, 100);
    }
    
    // Analyze each order using the appropriate analyzer
    const analyzedOrders: OrderFlowData[] = mockOrders.map(order => {
      let flags: ManipulationFlags;
      
      if (marketData?.binanceData && 'enhancedFlags' in order) {
        // Use enhanced analysis for orders with market data
        flags = (order as any).enhancedFlags;
      } else {
        // Use standard analysis
        flags = orderFlowAnalyzer.analyzeOrder(order);
      }
      
      return {
        symbol: order.symbol,
        timestamp: order.timestamp,
        orderType: order.side,
        size: order.size,
        price: order.price,
        suspiciousFlags: flags.reasons || [],
        riskScore: flags.riskScore || 0,
        flags,
        marketSource: marketData?.dataSource // Add data source info
      };
    });

    setOrderFlowData(analyzedOrders);

    // Get manipulation statistics
    const currentStats = orderFlowAnalyzer.getManipulationStats(selectedSymbol);
    setStats(currentStats);

    // Check for high risk large order manipulation
    const hasLargeOrderManipulation = analyzedOrders.some(order => 
      order.riskScore >= 8 && order.size > 10 // Large size with high risk
    );
    const hasHighOverallRisk = currentStats.averageRiskScore >= 7;
    
    setHasHighRiskDetected(hasLargeOrderManipulation || hasHighOverallRisk);

    // Create pattern summaries
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

    // Generate chart data for order flow visualization
    updateChartData(analyzedOrders);
  };

  const updateChartData = (orders: OrderFlowData[]) => {
    // Get interval duration in milliseconds based on selected time interval
    const getIntervalMs = (interval: string) => {
      switch (interval) {
        case '30s': return 30000; // 30 seconds
        case '5m': return 300000; // 5 minutes
        case '1h': return 3600000; // 1 hour
        case '4h': return 14400000; // 4 hours
        default: return 30000;
      }
    };

    const intervalMs = getIntervalMs(selectedTimeInterval);
    const timeGroups: { [key: number]: { buyVolume: number; sellVolume: number; buyCount: number; sellCount: number; avgRisk: number; timestamp: number } } = {};
    
    orders.forEach(order => {
      // Round timestamp to selected intervals
      const intervalTime = Math.floor(order.timestamp / intervalMs) * intervalMs;
      
      if (!timeGroups[intervalTime]) {
        timeGroups[intervalTime] = {
          buyVolume: 0,
          sellVolume: 0,
          buyCount: 0,
          sellCount: 0,
          avgRisk: 0,
          timestamp: intervalTime
        };
      }
      
      if (order.orderType === 'buy') {
        timeGroups[intervalTime].buyVolume += order.size;
        timeGroups[intervalTime].buyCount += 1;
      } else {
        timeGroups[intervalTime].sellVolume += order.size;
        timeGroups[intervalTime].sellCount += 1;
      }
      
      timeGroups[intervalTime].avgRisk = (timeGroups[intervalTime].avgRisk + order.riskScore) / 2;
    });

    // Convert to array and sort by time
    const chartDataArray = Object.entries(timeGroups)
      .map(([timestampStr, data]) => ({
        time: parseInt(timestampStr), // Use timestamp as time key
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
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-20); // Keep last 20 data points

    setChartData(chartDataArray);
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    
    // Fetch market data more frequently when monitoring
    const marketDataInterval = setInterval(() => {
      fetchMarketData();
    }, 30000); // Update market data every 30 seconds
    
    // Simulate real-time order flow updates
    const orderInterval = setInterval(async () => {
      if (Math.random() > 0.7) { // 30% chance of new order
        let newOrder: OrderData;
        
        if (marketData?.binanceData) {
          // Generate enhanced order with real market data
          const enhancedOrders = await enhancedOrderFlowAnalyzer.generateEnhancedOrders(
            1,
            selectedSymbol,
            dualApiService
          );
          // Convert enhanced order to standard OrderData format
          const enhancedOrder = enhancedOrders[0];
          newOrder = {
            id: enhancedOrder.id,
            symbol: enhancedOrder.symbol,
            timestamp: enhancedOrder.timestamp,
            side: enhancedOrder.type,
            size: enhancedOrder.volume,
            quantity: enhancedOrder.volume,
            price: enhancedOrder.price,
            orderId: enhancedOrder.id,
            venue: enhancedOrder.source
          };
        } else {
          // Generate standard mock order
          newOrder = orderFlowAnalyzer.generateMockOrders(selectedSymbol, 1)[0];
        }
        
        const flags = orderFlowAnalyzer.analyzeOrder(newOrder);
        
        const analyzedOrder: OrderFlowData = {
          symbol: newOrder.symbol,
          timestamp: newOrder.timestamp,
          orderType: newOrder.side,
          size: newOrder.size,
          price: newOrder.price,
          suspiciousFlags: flags.reasons,
          riskScore: flags.riskScore,
          flags,
          marketSource: marketData?.dataSource // Add data source info
        };

        setOrderFlowData(prev => {
          const newData = [analyzedOrder, ...prev.slice(0, 99)];
          // Update chart data with new order flow
          updateChartData(newData.slice(0, 50)); // Use last 50 orders for chart
          
          // Check for very large activity
          detectVeryLargeActivity(newData.slice(0, 20)); // Check last 20 orders
          
          return newData;
        });
        
        // Update stats
        const currentStats = orderFlowAnalyzer.getManipulationStats(selectedSymbol);
        setStats(currentStats);
        
        // Check for high risk during monitoring
        const hasLargeOrderManipulation = analyzedOrder.riskScore >= 8 && analyzedOrder.size > 10;
        const hasHighOverallRisk = currentStats.averageRiskScore >= 7;
        
        setHasHighRiskDetected(hasLargeOrderManipulation || hasHighOverallRisk);
      }
    }, 2000);

    // Store interval IDs for cleanup
    (window as any).orderFlowInterval = orderInterval;
    (window as any).marketDataInterval = marketDataInterval;
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    if ((window as any).orderFlowInterval) {
      clearInterval((window as any).orderFlowInterval);
      (window as any).orderFlowInterval = null;
    }
    if ((window as any).marketDataInterval) {
      clearInterval((window as any).marketDataInterval);
      (window as any).marketDataInterval = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ((window as any).orderFlowInterval) {
        clearInterval((window as any).orderFlowInterval);
      }
      if ((window as any).marketDataInterval) {
        clearInterval((window as any).marketDataInterval);
      }
    };
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500 hover:bg-red-600';
      case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'low': return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'padding': return <Target className="h-4 w-4" />;
      case 'scam': return <AlertTriangle className="h-4 w-4" />;
      case 'rag': return <Zap className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  // Calculate trading signal based on order flow analysis
  const getTradingSignal = () => {
    if (!stats) return { signal: 'wait', confidence: 0, reason: 'No data available' };

    const riskScore = stats.averageRiskScore;
    const scamCount = stats.scamCount;
    const paddingCount = stats.paddingCount;
    const ragCount = stats.ragCount;
    
    // Calculate buy/sell pressure
    const recentOrders = orderFlowData.slice(0, 20);
    const buyOrders = recentOrders.filter(o => o.orderType === 'buy').length;
    const sellOrders = recentOrders.filter(o => o.orderType === 'sell').length;
    const buyPressure = buyOrders / (buyOrders + sellOrders || 1);

    // Strong BUY conditions
    if (riskScore <= 2 && scamCount === 0 && paddingCount <= 2 && buyPressure > 0.6) {
      return {
        signal: 'strong_buy',
        confidence: 95,
        reason: 'Low risk, no manipulation, strong buy pressure'
      };
    }

    // BUY conditions
    if (riskScore <= 3 && scamCount === 0 && paddingCount <= 5) {
      return {
        signal: 'buy',
        confidence: 85 - (riskScore * 5),
        reason: 'Low risk environment with minimal manipulation'
      };
    }

    // Strong SELL conditions
    if (riskScore >= 8 || scamCount > 3 || (ragCount > 10 && paddingCount > 15)) {
      return {
        signal: 'strong_sell',
        confidence: 90,
        reason: 'High manipulation risk detected across multiple patterns'
      };
    }

    // SELL conditions
    if (riskScore >= 7 || scamCount > 2 || buyPressure < 0.3) {
      return {
        signal: 'sell',
        confidence: 75,
        reason: 'Elevated risk with selling pressure'
      };
    }

    // Default WAIT
    return {
      signal: 'wait',
      confidence: 60,
      reason: 'Mixed signals - wait for clearer conditions'
    };
  };

  // Get market sentiment based on order flow
  const getMarketSentiment = () => {
    if (!stats) return 'neutral';
    
    const signal = getTradingSignal();
    const recentOrders = orderFlowData.slice(0, 10);
    const highRiskOrders = recentOrders.filter(o => o.riskScore >= 7).length;
    
    if (signal.signal.includes('buy') && highRiskOrders === 0) return 'bullish';
    if (signal.signal.includes('sell') || highRiskOrders > 3) return 'bearish';
    return 'neutral';
  };

  // Very Large Activity Detection System
  function detectVeryLargeActivity(recentOrders: OrderFlowData[]) {
    const currentTime = Date.now();
    const timeWindow = 30000; // 30 second window
    const windowOrders = recentOrders.filter(order => 
      currentTime - order.timestamp < timeWindow
    );

    // Define thresholds for very large activity
    const totalVolume = windowOrders.reduce((sum, order) => sum + order.size, 0);
    const averageOrderSize = totalVolume / Math.max(windowOrders.length, 1);
    const maxOrderSize = Math.max(...windowOrders.map(o => o.size), 0);
    const buyOrders = windowOrders.filter(o => o.orderType === 'buy');
    const sellOrders = windowOrders.filter(o => o.orderType === 'sell');
    
    // Very Large Activity Criteria
    const isVeryLargeVolume = totalVolume > 50; // Extremely high volume
    const isWhaleActivity = maxOrderSize > 25; // Single very large order
    const isMassiveBuying = buyOrders.length > 8 && buyOrders.reduce((s, o) => s + o.size, 0) > 40;
    const isMassiveSelling = sellOrders.length > 8 && sellOrders.reduce((s, o) => s + o.size, 0) > 40;
    const isCoordinatedAttack = windowOrders.length > 12 && windowOrders.filter(o => o.riskScore >= 7).length > 6;

    // Check if we should start a new very large activity
    if (!activeVeryLargeActivity && (isVeryLargeVolume || isWhaleActivity || isMassiveBuying || isMassiveSelling || isCoordinatedAttack)) {
      let activityType: VeryLargeActivity['type'] = 'whale_activity';
      let description = '';
      let riskLevel: 'extreme' | 'critical' = 'critical';

      if (isCoordinatedAttack) {
        activityType = 'coordinated_attack';
        description = `🚨 COORDINATED ATTACK DETECTED! ${windowOrders.length} orders with ${windowOrders.filter(o => o.riskScore >= 7).length} high-risk orders in 30 seconds`;
        riskLevel = 'extreme';
      } else if (isMassiveBuying) {
        activityType = 'massive_buy';
        description = `🐋 MASSIVE BUYING SPREE! ${buyOrders.length} buy orders totaling ${buyOrders.reduce((s, o) => s + o.size, 0).toFixed(2)} ${selectedSymbol.replace('USDT', '')}`;
        riskLevel = 'extreme';
      } else if (isMassiveSelling) {
        activityType = 'massive_sell';
        description = `📉 MASSIVE SELLING PRESSURE! ${sellOrders.length} sell orders totaling ${sellOrders.reduce((s, o) => s + o.size, 0).toFixed(2)} ${selectedSymbol.replace('USDT', '')}`;
        riskLevel = 'extreme';
      } else if (isWhaleActivity) {
        activityType = 'whale_activity';
        description = `🐋 WHALE ACTIVITY! Single order of ${maxOrderSize.toFixed(2)} ${selectedSymbol.replace('USDT', '')}`;
      } else {
        description = `⚡ VERY HIGH VOLUME! ${totalVolume.toFixed(2)} ${selectedSymbol.replace('USDT', '')} traded in 30 seconds`;
      }

      const newActivity: VeryLargeActivity = {
        id: `vla-${currentTime}`,
        startTime: currentTime,
        symbol: selectedSymbol,
        type: activityType,
        totalVolume: totalVolume,
        orderCount: windowOrders.length,
        avgPrice: windowOrders.reduce((sum, o) => sum + o.price, 0) / windowOrders.length,
        maxOrderSize: maxOrderSize,
        description: description,
        isActive: true,
        riskLevel: riskLevel
      };

      setActiveVeryLargeActivity(newActivity);
      setVeryLargeActivities(prev => [newActivity, ...prev.slice(0, 9)]); // Keep last 10
      
      // Log the start
      const startLog = `🚨 ${new Date().toLocaleTimeString()} - VERY LARGE ACTIVITY STARTED: ${description}`;
      setVeryLargeActivityLog(prev => [startLog, ...prev.slice(0, 49)]); // Keep last 50 logs
      
      console.log(startLog);
    }

    // Check if current activity should end (no significant activity for 10 seconds)
    if (activeVeryLargeActivity && !isVeryLargeVolume && !isWhaleActivity && !isMassiveBuying && !isMassiveSelling && !isCoordinatedAttack) {
      const inactiveTime = currentTime - activeVeryLargeActivity.startTime;
      if (inactiveTime > 10000) { // 10 seconds of low activity
        const updatedActivity = {
          ...activeVeryLargeActivity,
          endTime: currentTime,
          isActive: false
        };

        setActiveVeryLargeActivity(null);
        setVeryLargeActivities(prev => prev.map(act => 
          act.id === updatedActivity.id ? updatedActivity : act
        ));

        // Log the end
        const duration = ((updatedActivity.endTime! - updatedActivity.startTime) / 1000).toFixed(1);
        const endLog = `✅ ${new Date().toLocaleTimeString()} - VERY LARGE ACTIVITY ENDED: Duration ${duration}s, Total Volume: ${updatedActivity.totalVolume.toFixed(2)}`;
        setVeryLargeActivityLog(prev => [endLog, ...prev.slice(0, 49)]);
        
        console.log(endLog);
      }
    }
  };

  // Save very large activity log
  const saveActivityLog = () => {
    const logData = {
      timestamp: new Date().toISOString(),
      symbol: selectedSymbol,
      activities: veryLargeActivities,
      logs: veryLargeActivityLog
    };
    
    const dataStr = JSON.stringify(logData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `very-large-activity-log-${selectedSymbol}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            🔍 Order Flow Analysis
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-5 w-5 text-muted-foreground hover:text-primary cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  This tool monitors trading activity in real-time to detect suspicious patterns that might indicate market manipulation.
                </p>
              </TooltipContent>
            </Tooltip>
          </h1>
          <p className="text-muted-foreground">
            Real-time detection of suspicious trading patterns • Protect yourself from market manipulation
          </p>
          <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              High Risk (7-10)
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              Medium Risk (4-6)
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Low Risk (0-3)
            </span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          
          {/* Market Data Status */}
          {marketData && (
            <div className="text-xs mr-4">
              <span className="font-semibold">📊 Data Sources:</span>
              <div className="text-muted-foreground">
                Coin: {marketData.dataSource?.coinApi || 'None'} | 
                Price: {marketData.dataSource?.priceApi || 'None'}
              </div>
            </div>
          )}
          
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select Symbol" />
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              {/* Top 20 Cryptocurrencies */}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                🏆 Top 20 Cryptocurrencies
              </div>
              <SelectItem value="BTCUSDT">BTC/USDT - Bitcoin</SelectItem>
              <SelectItem value="ETHUSDT">ETH/USDT - Ethereum</SelectItem>
              <SelectItem value="BNBUSDT">BNB/USDT - Binance Coin</SelectItem>
              <SelectItem value="XRPUSDT">XRP/USDT - Ripple</SelectItem>
              <SelectItem value="SOLUSDT">SOL/USDT - Solana</SelectItem>
              <SelectItem value="ADAUSDT">ADA/USDT - Cardano</SelectItem>
              <SelectItem value="AVAXUSDT">AVAX/USDT - Avalanche</SelectItem>
              <SelectItem value="DOTUSDT">DOT/USDT - Polkadot</SelectItem>
              <SelectItem value="LINKUSDT">LINK/USDT - Chainlink</SelectItem>
              <SelectItem value="MATICUSDT">MATIC/USDT - Polygon</SelectItem>
              <SelectItem value="UNIUSDT">UNI/USDT - Uniswap</SelectItem>
              <SelectItem value="LTCUSDT">LTC/USDT - Litecoin</SelectItem>
              <SelectItem value="NEARUSDT">NEAR/USDT - Near Protocol</SelectItem>
              <SelectItem value="ATOMUSDT">ATOM/USDT - Cosmos</SelectItem>
              <SelectItem value="FILUSDT">FIL/USDT - Filecoin</SelectItem>
              <SelectItem value="APTUSDT">APT/USDT - Aptos</SelectItem>
              <SelectItem value="ARBUSDT">ARB/USDT - Arbitrum</SelectItem>
              <SelectItem value="OPUSDT">OP/USDT - Optimism</SelectItem>
              <SelectItem value="INJUSDT">INJ/USDT - Injective</SelectItem>
              <SelectItem value="SUIUSDT">SUI/USDT - Sui</SelectItem>

              {/* Top 10 Meme Coins */}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 border-t">
                🐸 Top 10 Meme Coins
              </div>
              <SelectItem value="DOGEUSDT">DOGE/USDT - Dogecoin</SelectItem>
              <SelectItem value="SHIBUSDT">SHIB/USDT - Shiba Inu</SelectItem>
              <SelectItem value="PEPEUSDT">PEPE/USDT - Pepe</SelectItem>
              <SelectItem value="FLOKIUSDT">FLOKI/USDT - Floki</SelectItem>
              <SelectItem value="WIFUSDT">WIF/USDT - Dogwifhat</SelectItem>
              <SelectItem value="BONKUSDT">BONK/USDT - Bonk</SelectItem>
              <SelectItem value="1000RATSUSDT">1000RATS/USDT - Rats</SelectItem>
              <SelectItem value="BOMEUSDT">BOME/USDT - Book of Meme</SelectItem>
              <SelectItem value="MEMEUSDT">MEME/USDT - Memecoin</SelectItem>
              <SelectItem value="BABYDOGEUSDT">BABYDOGE/USDT - Baby Doge</SelectItem>

              {/* Top 10 New Assets */}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 border-t">
                ✨ Top 10 New Assets
              </div>
              <SelectItem value="WLDUSDT">WLD/USDT - Worldcoin</SelectItem>
              <SelectItem value="TIAUSDT">TIA/USDT - Celestia</SelectItem>
              <SelectItem value="SELUSDT">SEL/USDT - Sei</SelectItem>
              <SelectItem value="JUPUSDT">JUP/USDT - Jupiter</SelectItem>
              <SelectItem value="ALTUSDT">ALT/USDT - AltLayer</SelectItem>
              <SelectItem value="JITOUSDT">JITO/USDT - Jito</SelectItem>
              <SelectItem value="DYMUSDT">DYM/USDT - Dymension</SelectItem>
              <SelectItem value="AIUSDT">AI/USDT - Sleepless AI</SelectItem>
              <SelectItem value="PIXELUSDT">PIXEL/USDT - Pixels</SelectItem>
              <SelectItem value="STRKUSDT">STRK/USDT - Starknet</SelectItem>

              {/* Top 10 Layer 1 Networks */}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 border-t">
                🌐 Top 10 Layer 1 Networks
              </div>
              <SelectItem value="BTCUSDT">BTC/USDT - Bitcoin</SelectItem>
              <SelectItem value="ETHUSDT">ETH/USDT - Ethereum</SelectItem>
              <SelectItem value="BNBUSDT">BNB/USDT - BNB Chain</SelectItem>
              <SelectItem value="SOLUSDT">SOL/USDT - Solana</SelectItem>
              <SelectItem value="ADAUSDT">ADA/USDT - Cardano</SelectItem>
              <SelectItem value="AVAXUSDT">AVAX/USDT - Avalanche</SelectItem>
              <SelectItem value="DOTUSDT">DOT/USDT - Polkadot</SelectItem>
              <SelectItem value="NEARUSDT">NEAR/USDT - Near Protocol</SelectItem>
              <SelectItem value="ATOMUSDT">ATOM/USDT - Cosmos</SelectItem>
              <SelectItem value="ALGOUSDT">ALGO/USDT - Algorand</SelectItem>
            </SelectContent>
          </Select>
          
          {/* WebSocket Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            isWebSocketConnected 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isWebSocketConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="font-medium">
              {isWebSocketConnected ? '🔴 Live Stream' : '🔌 Disconnected'}
            </span>
            {isWebSocketConnected && (
              <span className="text-xs opacity-75">
                {realTimeOrders.length} orders
              </span>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadMockData();
              fetchMarketData();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
          <Button
            variant={isMonitoring ? "destructive" : "default"}
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
          >
            {isMonitoring ? (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Stop Monitoring
              </>
            ) : (
              <>
                <Activity className="mr-2 h-4 w-4" />
                Start Monitoring
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Very Large Activity Alert */}
      {activeVeryLargeActivity && (
        <Alert className={`border-2 animate-pulse ${
          activeVeryLargeActivity.riskLevel === 'extreme' 
            ? 'border-red-500 bg-red-50' 
            : 'border-orange-500 bg-orange-50'
        }`}>
          <AlertTriangle className={`h-6 w-6 animate-bounce ${
            activeVeryLargeActivity.riskLevel === 'extreme' ? 'text-red-600' : 'text-orange-600'
          }`} />
          <AlertTitle className={`text-lg font-bold ${
            activeVeryLargeActivity.riskLevel === 'extreme' ? 'text-red-800' : 'text-orange-800'
          }`}>
            🚨 VERY LARGE ACTIVITY DETECTED!
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className={`font-semibold ${
              activeVeryLargeActivity.riskLevel === 'extreme' ? 'text-red-700' : 'text-orange-700'
            }`}>
              {activeVeryLargeActivity.description}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Duration:</span> {
                  Math.floor((Date.now() - activeVeryLargeActivity.startTime) / 1000)
                }s
              </div>
              <div>
                <span className="font-medium">Total Volume:</span> {activeVeryLargeActivity.totalVolume.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Order Count:</span> {activeVeryLargeActivity.orderCount}
              </div>
              <div>
                <span className="font-medium">Risk Level:</span> 
                <Badge className={`ml-1 ${
                  activeVeryLargeActivity.riskLevel === 'extreme' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-orange-600 text-white'
                }`}>
                  {activeVeryLargeActivity.riskLevel.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={saveActivityLog}>
                💾 Save Log
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                navigator.clipboard.writeText(activeVeryLargeActivity.description);
              }}>
                📋 Copy Alert
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Status Alert */}
      {isMonitoring && (
        <Alert className="bg-green-50 border-green-200">
          <Activity className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">🟢 Live Monitoring Active</AlertTitle>
          <AlertDescription className="text-green-700">
            Scanning {selectedSymbol} for suspicious trading patterns in real-time. New orders appear automatically below.
          </AlertDescription>
        </Alert>
      )}

      {!isMonitoring && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-blue-800">What is Order Flow Analysis?</h3>
              </div>
              <p className="text-sm text-blue-700">
                This tool watches trading activity to spot when someone might be trying to manipulate the market. 
                It helps protect you from fake trading patterns.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-green-800">How It Protects You</h3>
              </div>
              <p className="text-sm text-green-700">
                By identifying suspicious patterns early, you can avoid making trades based on fake signals 
                and protect your investments from manipulation.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-purple-800">How to Use</h3>
              </div>
              <p className="text-sm text-purple-700">
                Select a trading pair, start monitoring, and watch for alerts. Red scores (7-10) mean high risk, 
                green scores (0-3) are normal activity.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="chart" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Flow Chart
          </TabsTrigger>
          <TabsTrigger value="signals" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Buy/Sell Signals
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Threat Patterns
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Orders
          </TabsTrigger>
          <TabsTrigger value="whale" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            🐋 Whale Activity
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alerts
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Statistics Summary */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">📊 Total Orders Analyzed</CardTitle>
                  <Activity className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">Orders scanned in last hour</p>
                  <div className="mt-2 text-xs text-blue-600">
                    ✅ System actively monitoring
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">🚨 High Risk Orders</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">{stats.highRiskCount}</div>
                  <p className="text-xs text-muted-foreground">Risk score 7 or higher</p>
                  <div className="mt-2 text-xs">
                    {stats.highRiskCount === 0 ? (
                      <span className="text-green-600">🟢 Low threat level</span>
                    ) : stats.highRiskCount < 5 ? (
                      <span className="text-yellow-600">🟡 Moderate concern</span>
                    ) : (
                      <span className="text-red-600">🔴 High alert status</span>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">📈 Risk Score Average</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.averageRiskScore.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">Out of 10 maximum</p>
                  <div className="mt-2">
                    <Progress 
                      value={stats.averageRiskScore * 10} 
                      className="w-full h-2" 
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">🎯 Currently Monitoring</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedSymbol}</div>
                  <p className="text-xs text-muted-foreground">Active trading pair</p>
                  <div className="mt-2 text-xs">
                    {isMonitoring ? (
                      <span className="text-green-600">🟢 Live monitoring</span>
                    ) : (
                      <span className="text-gray-600">⏸️ Monitoring paused</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Summarized Analysis */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <BarChart3 className="h-5 w-5" />
                📊 Market Analysis Summary
              </CardTitle>
              <CardDescription>
                Intuitive overview of what's happening in the {selectedSymbol} order flow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Market Sentiment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    {calculateMarketSentiment() > 0.6 ? '🟢' : calculateMarketSentiment() < 0.4 ? '🔴' : '🟡'}
                    Market Sentiment
                  </h4>
                  <div className="text-lg font-bold mb-1">
                    {calculateMarketSentiment() > 0.6 ? 'Bullish 📈' : 
                     calculateMarketSentiment() < 0.4 ? 'Bearish 📉' : 'Neutral ⚖️'}
                  </div>
                  <p className="text-sm text-gray-600">
                    {calculateMarketSentiment() > 0.6 ? 
                      'Strong buying pressure detected. More buy orders than sell orders.' :
                      calculateMarketSentiment() < 0.4 ? 
                      'Heavy selling pressure. Sell orders dominating the market.' :
                      'Balanced market with roughly equal buy/sell activity.'}
                  </p>
                  <Progress 
                    value={calculateMarketSentiment() * 100} 
                    className="mt-2 h-2"
                  />
                </div>

                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    {getVolumeIndicator()} Volume Activity
                  </h4>
                  <div className="text-lg font-bold mb-1">
                    {getVolumeDescription()}
                  </div>
                  <p className="text-sm text-gray-600">
                    {getVolumeExplanation()}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{width: `${Math.min(100, (stats?.averageVolume || 0) * 10)}%`}}
                      />
                    </div>
                    <span className="text-xs text-gray-600">
                      {(stats?.averageVolume || 0).toFixed(2)} avg
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  🛡️ Risk Assessment
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getRiskLevelColor()}`}>
                      {getRiskLevel()}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Overall Risk</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {isWebSocketConnected ? '🟢 LIVE' : '🔴 OFFLINE'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Data Source</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats?.highRiskCount === 0 ? '✅ SAFE' : '⚠️ ALERT'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Threat Status</div>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                  <strong>💡 What this means:</strong> {getRiskExplanation()}
                </div>
              </div>

              {/* Key Insights */}
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  ⚡ Key Insights
                </h4>
                <div className="space-y-2">
                  {getKeyInsights().map((insight, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span className="text-gray-700">{insight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  🎯 Recommended Actions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getRecommendedActions().map((action, index) => (
                    <div key={index} className="bg-white p-3 rounded border border-green-200 text-sm">
                      <div className="font-semibold text-green-800 mb-1">{action.title}</div>
                      <div className="text-gray-700">{action.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Manipulation Patterns */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold">🚨 Threat Detection</h3>
              <div className="text-sm text-muted-foreground">
                Click on each card to learn more about these manipulation tactics
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {manipulationPatterns.map((pattern, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
                      {getPatternIcon(pattern.type)}
                      {pattern.type === 'padding' ? '🎯 Order Padding' : 
                       pattern.type === 'scam' ? '⚠️ Scam Activity' : 
                       '⚡ Rag Pulling'}
                    </CardTitle>
                    <Badge className={getSeverityColor(pattern.severity)}>
                      {pattern.severity.toUpperCase()}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2 flex items-center gap-2">
                      {pattern.count}
                      <span className="text-sm font-normal text-muted-foreground">detected</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {pattern.type === 'padding' ? 'Fake volume from tiny orders to mislead traders' :
                       pattern.type === 'scam' ? 'Suspicious patterns indicating potential fraud' :
                       'Aggressive trades to manipulate prices rapidly'}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      {pattern.severity === 'high' ? 
                        <><XCircle className="h-3 w-3 text-red-500" /> High Threat</> :
                        pattern.severity === 'medium' ? 
                        <><AlertTriangle className="h-3 w-3 text-yellow-500" /> Moderate Risk</> :
                        <><CheckCircle className="h-3 w-3 text-green-500" /> Low Risk</>
                      }
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Flow Chart Tab */}
        <TabsContent value="chart" className="space-y-4">
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">📊 Order Flow Visualization</h3>
            <p className="text-sm text-gray-700">
              Real-time charts showing buy/sell flow, volume patterns, and risk levels for {selectedSymbol}
            </p>
          </div>

          {/* Time Interval Selector */}
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-indigo-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-indigo-800">⏰ Time Interval:</label>
                <select 
                  value={selectedTimeInterval}
                  onChange={(e) => setSelectedTimeInterval(e.target.value)}
                  className="px-3 py-2 border-2 border-indigo-400 rounded-md bg-white text-gray-800 text-sm font-bold shadow-lg hover:border-indigo-500 hover:shadow-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  style={{ 
                    color: '#1f2937', 
                    backgroundColor: '#ffffff',
                    fontWeight: '600'
                  }}
                >
                  <option value="30s" className="text-gray-800 font-semibold bg-white">30 Seconds</option>
                  <option value="5m" className="text-gray-800 font-semibold bg-white">5 Minutes</option>
                  <option value="1h" className="text-gray-800 font-semibold bg-white">1 Hour</option>
                  <option value="4h" className="text-gray-800 font-semibold bg-white">4 Hours</option>
                </select>
              </div>
              <span className="text-xs text-indigo-700 font-bold bg-indigo-100 px-3 py-1 rounded-full border border-indigo-300">
                Charts update automatically on interval change
              </span>
            </div>
          </Card>

          {/* Order Flow Chart */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                📈 Buy vs Sell Flow Over Time
                {isMonitoring && (
                  <Badge className="bg-green-500 animate-pulse text-xs">LIVE</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Green areas show buying pressure, red areas show selling pressure
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Chart Guide */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="font-semibold">Green Area ↑</span>
                    </div>
                    <span className="text-muted-foreground">High buying pressure = Bullish sentiment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="font-semibold">Red Area ↓</span>
                    </div>
                    <span className="text-muted-foreground">High selling pressure = Bearish sentiment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-blue-500" />
                      <span className="font-semibold">Look for:</span>
                    </div>
                    <span className="text-muted-foreground">Green &gt; Red for buy signals</span>
                  </div>
                </div>
              </div>

              <div className="h-80 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(value) => {
                        // Format X-axis based on selected time interval using timestamp
                        const date = new Date(value);
                        
                        if (selectedTimeInterval === '30s') {
                          return date.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false 
                          });
                        } else if (selectedTimeInterval === '5m') {
                          return date.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          });
                        } else if (selectedTimeInterval === '1h') {
                          // For 1h, show date and hour
                          return date.toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            day: '2-digit' 
                          }) + ' ' + date.toLocaleTimeString('en-US', { 
                            hour: '2-digit',
                            hour12: false 
                          }) + 'h';
                        } else if (selectedTimeInterval === '4h') {
                          // For 4h, show date and hour
                          return date.toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            day: '2-digit' 
                          }) + ' ' + date.toLocaleTimeString('en-US', { 
                            hour: '2-digit',
                            hour12: false 
                          }) + 'h';
                        }
                        return date.toLocaleTimeString();
                      }}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      label={{ 
                        value: `Volume (${selectedSymbol.replace('USDT', '')})`, 
                        angle: -90, 
                        position: 'insideLeft', 
                        style: { textAnchor: 'middle' } 
                      }}
                      tickFormatter={(value) => {
                        // Format Y-axis volume based on magnitude
                        if (value >= 1000000) {
                          return `${(value / 1000000).toFixed(1)}M`;
                        } else if (value >= 1000) {
                          return `${(value / 1000).toFixed(1)}K`;
                        } else if (value >= 1) {
                          return value.toFixed(1);
                        } else {
                          return value.toFixed(3);
                        }
                      }}
                    />
                    <RechartsTooltip 
                      contentStyle={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: any, name: any) => {
                        const formattedValue = Number(value) >= 1000000 
                          ? `${(Number(value) / 1000000).toFixed(2)}M`
                          : Number(value) >= 1000 
                          ? `${(Number(value) / 1000).toFixed(2)}K`
                          : Number(value).toFixed(2);
                        
                        return [
                          `${formattedValue} ${selectedSymbol.replace('USDT', '')}`,
                          name === 'buyVolume' ? '🟢 Buy Volume (Bullish)' :
                          name === 'sellVolume' ? '🔴 Sell Volume (Bearish)' : name
                        ];
                      }}
                      labelFormatter={(label) => {
                        // Format tooltip label using the timestamp
                        const date = new Date(label);
                        
                        if (selectedTimeInterval === '30s') {
                          return `Time: ${date.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false 
                          })}`;
                        } else if (selectedTimeInterval === '5m') {
                          return `Time: ${date.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })}`;
                        } else {
                          return `${date.toLocaleDateString('en-US')} ${date.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })}`;
                        }
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '10px' }}
                      formatter={(value) => value === 'buyVolume' ? '🟢 Buy Pressure (Good for Entry)' : '🔴 Sell Pressure (Consider Exit)'}
                    />
                    <Area
                      type="monotone"
                      dataKey="buyVolume"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="buyVolume"
                    />
                    <Area
                      type="monotone"
                      dataKey="sellVolume"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.6}
                      name="sellVolume"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                
                {/* Floating annotations */}
                {chartData.length > 0 && (
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg border text-xs text-gray-800">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="font-semibold">Current Trend ({selectedTimeInterval}):</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">
                        {chartData[chartData.length - 1]?.buyVolume > chartData[chartData.length - 1]?.sellVolume ? 
                          '📈 Bullish (More Buying)' : 
                          '📉 Bearish (More Selling)'}
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">Buy Volume:</span> {
                          (() => {
                            const vol = chartData[chartData.length - 1]?.buyVolume || 0;
                            return vol >= 1000000 ? `${(vol / 1000000).toFixed(1)}M` :
                                   vol >= 1000 ? `${(vol / 1000).toFixed(1)}K` :
                                   vol.toFixed(2);
                          })()
                        } {selectedSymbol.replace('USDT', '')}
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">Sell Volume:</span> {
                          (() => {
                            const vol = chartData[chartData.length - 1]?.sellVolume || 0;
                            return vol >= 1000000 ? `${(vol / 1000000).toFixed(1)}M` :
                                   vol >= 1000 ? `${(vol / 1000).toFixed(1)}K` :
                                   vol.toFixed(2);
                          })()
                        } {selectedSymbol.replace('USDT', '')}
                      </div>
                      <div className="text-xs border-t pt-1 mt-1">
                        <span className="font-medium">Interval:</span> {
                          selectedTimeInterval === '30s' ? '30 Seconds' :
                          selectedTimeInterval === '5m' ? '5 Minutes' :
                          selectedTimeInterval === '1h' ? '1 Hour' :
                          selectedTimeInterval === '4h' ? '4 Hours' : selectedTimeInterval
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Quick Analysis */}
              <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-red-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Quick Analysis Guide
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-semibold">✅ Buy Signal:</span>
                      <span>Green area consistently above red</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 font-semibold">❌ Sell Signal:</span>
                      <span>Red area dominates over green</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600 font-semibold">⚠️ Caution:</span>
                      <span>Equal areas = sideways market</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 font-semibold">💡 Tip:</span>
                      <span>Watch for trend changes at peaks</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Level Chart */}
          <Card className="border-2 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                ⚠️ Risk Level Tracking
              </CardTitle>
              <CardDescription>
                Average risk score over time intervals (0-10 scale)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Risk Guide */}
              <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="font-semibold">0-3 Safe ✅</span>
                    </div>
                    <span className="text-muted-foreground">Low manipulation risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span className="font-semibold">4-6 Caution ⚠️</span>
                    </div>
                    <span className="text-muted-foreground">Moderate risk - be careful</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded animate-pulse"></div>
                      <span className="font-semibold">7-10 Danger 🚨</span>
                    </div>
                    <span className="text-muted-foreground">High risk - avoid trading</span>
                  </div>
                </div>
              </div>

              <div className="h-60 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    {/* Risk zone backgrounds */}
                    <defs>
                      <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.1} />
                        <stop offset="30%" stopColor="#f59e0b" stopOpacity={0.1} />
                        <stop offset="70%" stopColor="#10b981" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fecaca" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        if (selectedTimeInterval === '30s' || selectedTimeInterval === '5m') {
                          return date.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          });
                        } else {
                          return date.toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            day: '2-digit' 
                          }) + ' ' + date.toLocaleTimeString('en-US', { 
                            hour: '2-digit',
                            hour12: false 
                          });
                        }
                      }}
                    />
                    <YAxis 
                      domain={[0, 10]}
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      label={{ value: 'Risk Score', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                    />
                    <RechartsTooltip 
                      contentStyle={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: any) => {
                        const score = Number(value);
                        const level = score <= 3 ? '🟢 Safe' : score <= 6 ? '🟡 Caution' : '🔴 Danger';
                        return [`${score.toFixed(1)}/10 (${level})`, 'Risk Level'];
                      }}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return `Time: ${date.toLocaleDateString('en-US')} ${date.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false 
                        })}`;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgRisk"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#dc2626' }}
                    />
                    {/* Risk threshold lines */}
                    <Line
                      type="monotone"
                      dataKey={() => 3}
                      stroke="#10b981"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey={() => 7}
                      stroke="#ef4444"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                
                {/* Risk level indicator */}
                {chartData.length > 0 && (
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg border text-xs text-gray-800">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        chartData[chartData.length - 1]?.avgRisk <= 3 ? 'bg-green-500' :
                        chartData[chartData.length - 1]?.avgRisk <= 6 ? 'bg-yellow-500' :
                        'bg-red-500 animate-pulse'
                      }`}></div>
                      <span className="font-semibold">Current Risk:</span>
                    </div>
                    <div className="text-muted-foreground">
                      {chartData[chartData.length - 1]?.avgRisk <= 3 ? '🟢 Safe to Trade' :
                       chartData[chartData.length - 1]?.avgRisk <= 6 ? '🟡 Use Caution' :
                       '🔴 High Risk - Avoid'}
                    </div>
                  </div>
                )}
                
                {/* Risk threshold annotations */}
                <div className="absolute left-16 top-12 text-xs text-red-600 font-semibold">
                  ← Danger Zone (7+)
                </div>
                <div className="absolute left-16 bottom-16 text-xs text-green-600 font-semibold">
                  ← Safe Zone (0-3)
                </div>
              </div>
              
              {/* Risk Analysis Guide */}
              <div className="mt-4 p-3 bg-gradient-to-r from-red-50 to-green-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Risk Analysis Guide
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-semibold">🟢 Safe (0-3):</span>
                      <span>Normal trading, low manipulation</span>
                    </div>
                    <div className="text-muted-foreground">Good time to enter positions</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600 font-semibold">🟡 Caution (4-6):</span>
                      <span>Some suspicious activity detected</span>
                    </div>
                    <div className="text-muted-foreground">Reduce position sizes, monitor closely</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 font-semibold">🔴 Danger (7-10):</span>
                      <span>High manipulation risk</span>
                    </div>
                    <div className="text-muted-foreground">Exit positions, avoid new trades</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Count and Net Flow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  📊 Order Count Distribution
                </CardTitle>
                <CardDescription>
                  Number of buy vs sell orders per time interval
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Order Count Guide */}
                <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="font-semibold">Green Bars ↑</span>
                      </div>
                      <span className="text-muted-foreground">More buy orders = Bullish interest</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span className="font-semibold">Red Bars ↓</span>
                      </div>
                      <span className="text-muted-foreground">More sell orders = Bearish pressure</span>
                    </div>
                  </div>
                </div>

                <div className="h-60 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          if (selectedTimeInterval === '30s' || selectedTimeInterval === '5m') {
                            return date.toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: false 
                            });
                          } else {
                            return date.toLocaleDateString('en-US', { 
                              month: '2-digit', 
                              day: '2-digit' 
                            }) + ' ' + date.toLocaleTimeString('en-US', { 
                              hour: '2-digit',
                              hour12: false 
                            });
                          }
                        }}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        label={{ value: 'Order Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: '#faf5ff',
                          border: '1px solid #e9d5ff',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: any, name: any) => [
                          value,
                          name === 'buyCount' ? '🟢 Buy Orders (Demand)' : '🔴 Sell Orders (Supply)'
                        ]}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      <Legend 
                        formatter={(value) => value === 'buyCount' ? '🟢 Buy Orders (Demand)' : '🔴 Sell Orders (Supply)'}
                      />
                      <Bar dataKey="buyCount" fill="#10b981" name="buyCount" />
                      <Bar dataKey="sellCount" fill="#ef4444" name="sellCount" />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Order imbalance indicator */}
                  {chartData.length > 0 && (
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg border text-xs text-gray-800">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${
                          (chartData[chartData.length - 1]?.buyCount || 0) > (chartData[chartData.length - 1]?.sellCount || 0) ? 
                          'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="font-semibold">Order Flow:</span>
                      </div>
                      <div className="text-muted-foreground">
                        {(chartData[chartData.length - 1]?.buyCount || 0) > (chartData[chartData.length - 1]?.sellCount || 0) ? 
                          '🟢 Buy Dominated' : 
                          '🔴 Sell Dominated'}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Order Analysis */}
                <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Order Flow Analysis
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 font-semibold">🟢 High Green Bars:</span>
                        <span>Strong buying interest</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-semibold">🔴 High Red Bars:</span>
                        <span>Heavy selling pressure</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 font-semibold">📊 Equal Bars:</span>
                        <span>Balanced market</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-600 font-semibold">💡 Watch:</span>
                        <span>Sudden changes indicate shifts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-indigo-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-800">
                  🌊 Net Order Flow
                </CardTitle>
                <CardDescription>
                  Net flow (buy volume - sell volume) over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Net Flow Guide */}
                <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-blue-500" />
                        <span className="font-semibold">Above Zero ↑</span>
                      </div>
                      <span className="text-muted-foreground">More buying volume = Bullish flow</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-blue-500" />
                        <span className="font-semibold">Below Zero ↓</span>
                      </div>
                      <span className="text-muted-foreground">More selling volume = Bearish flow</span>
                    </div>
                  </div>
                </div>

                <div className="h-60 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="netFlowGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          if (selectedTimeInterval === '30s' || selectedTimeInterval === '5m') {
                            return date.toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: false 
                            });
                          } else {
                            return date.toLocaleDateString('en-US', { 
                              month: '2-digit', 
                              day: '2-digit' 
                            }) + ' ' + date.toLocaleTimeString('en-US', { 
                              hour: '2-digit',
                              hour12: false 
                            });
                          }
                        }}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        label={{ value: 'Net Flow', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: '#f0f9ff',
                          border: '1px solid #e0e7ff',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: any) => {
                          const flow = Number(value);
                          const trend = flow > 0 ? '🟢 Bullish' : '🔴 Bearish';
                          return [`${flow.toFixed(2)} (${trend})`, 'Net Flow'];
                        }}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      {/* Zero line reference */}
                      <Area
                        type="monotone"
                        dataKey={() => 0}
                        stroke="#6b7280"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        fill="transparent"
                      />
                      <Area
                        type="monotone"
                        dataKey="netFlow"
                        stroke="#3b82f6"
                        fill="url(#netFlowGradient)"
                        name="Net Flow"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  
                  {/* Flow direction indicator */}
                  {chartData.length > 0 && (
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg border text-xs text-gray-800">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${
                          (chartData[chartData.length - 1]?.netFlow || 0) > 0 ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="font-semibold">Current Flow:</span>
                      </div>
                      <div className="text-muted-foreground">
                        {(chartData[chartData.length - 1]?.netFlow || 0) > 0 ? 
                          '🟢 Bullish Flow' : 
                          '🔴 Bearish Flow'}
                      </div>
                    </div>
                  )}
                  
                  {/* Zero line annotation */}
                  <div className="absolute left-16 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-semibold">
                    ← Zero Line (Neutral)
                  </div>
                </div>
                
                {/* Net Flow Analysis */}
                <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Net Flow Trading Guide
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 font-semibold">🟢 Positive Flow:</span>
                        <span>Buy volume &gt; Sell volume</span>
                      </div>
                      <div className="text-muted-foreground">Indicates bullish sentiment, consider buying</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-semibold">🔴 Negative Flow:</span>
                        <span>Sell volume &gt; Buy volume</span>
                      </div>
                      <div className="text-muted-foreground">Indicates bearish sentiment, consider selling</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart Analytics Summary */}
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                📊 Flow Analytics Summary
                <Badge variant="outline" className="text-xs">
                  Real-time Analysis
                </Badge>
              </CardTitle>
              <CardDescription>
                Key metrics and trading insights from order flow analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                    {chartData.reduce((sum, d) => sum + d.buyVolume, 0).toFixed(1)}
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-semibold">Total Buy Volume</div>
                  <div className="text-xs text-muted-foreground">
                    Last {chartData.length} intervals
                  </div>
                  <div className="text-xs text-green-600 mt-1 font-semibold">
                    💪 Buying Power
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                    {chartData.reduce((sum, d) => sum + d.sellVolume, 0).toFixed(1)}
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-semibold">Total Sell Volume</div>
                  <div className="text-xs text-muted-foreground">
                    Last {chartData.length} intervals
                  </div>
                  <div className="text-xs text-red-600 mt-1 font-semibold">
                    📉 Selling Pressure
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${
                    chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 ? '+' : ''}{chartData.reduce((sum, d) => sum + d.netFlow, 0).toFixed(1)}
                    {chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 ? 
                      <TrendingUp className="w-4 h-4" /> : 
                      <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div className="text-sm font-semibold">Net Flow</div>
                  <div className="text-xs text-muted-foreground">
                    {chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 ? 'Bullish' : 'Bearish'}
                  </div>
                  <div className={`text-xs mt-1 font-semibold ${
                    chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 ? '🚀 Momentum Up' : '⬇️ Momentum Down'}
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${
                    chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 3 ? 'text-green-600' :
                    chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 6 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1)).toFixed(1)}
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-semibold">Avg Risk Score</div>
                  <div className="text-xs text-muted-foreground">
                    {chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 3 ? 'Low Risk' :
                     chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 6 ? 'Medium Risk' : 'High Risk'}
                  </div>
                  <div className={`text-xs mt-1 font-semibold ${
                    chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 3 ? 'text-green-600' :
                    chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 6 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 3 ? '✅ Safe Zone' :
                     chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 6 ? '⚠️ Caution Zone' : '🚨 Danger Zone'}
                  </div>
                </div>
              </div>
              
              {/* Trading Decision Box */}
              <div className="mt-6 p-4 bg-white rounded-lg border-2 border-dashed border-green-300">
                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2 text-green-800">
                  🎯 Current Trading Decision
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`text-center p-3 rounded-lg border-2 ${
                    chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 && 
                    chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 4 ?
                    'bg-green-100 border-green-300' : 'bg-gray-100 border-gray-300'
                  }`}>
                    <div className="text-2xl mb-2">🟢</div>
                    <div className="font-semibold text-green-800">BUY SIGNAL</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Positive net flow + Low risk
                    </div>
                    {chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 && 
                     chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 4 && (
                      <Badge className="bg-green-600 mt-2 text-xs">ACTIVE</Badge>
                    )}
                  </div>
                  <div className={`text-center p-3 rounded-lg border-2 ${
                    Math.abs(chartData.reduce((sum, d) => sum + d.netFlow, 0)) <= 5 ||
                    (chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) > 4 &&
                     chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 6) ?
                    'bg-yellow-100 border-yellow-300' : 'bg-gray-100 border-gray-300'
                  }`}>
                    <div className="text-2xl mb-2">🟡</div>
                    <div className="font-semibold text-yellow-800">WAIT</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Neutral flow or medium risk
                    </div>
                    {(Math.abs(chartData.reduce((sum, d) => sum + d.netFlow, 0)) <= 5 ||
                      (chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) > 4 &&
                       chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 6)) && (
                      <Badge className="bg-yellow-600 mt-2 text-xs">ACTIVE</Badge>
                    )}
                  </div>
                  <div className={`text-center p-3 rounded-lg border-2 ${
                    chartData.reduce((sum, d) => sum + d.netFlow, 0) < -5 || 
                    chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) > 6 ?
                    'bg-red-100 border-red-300' : 'bg-gray-100 border-gray-300'
                  }`}>
                    <div className="text-2xl mb-2">🔴</div>
                    <div className="font-semibold text-red-800">SELL SIGNAL</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Negative net flow or high risk
                    </div>
                    {(chartData.reduce((sum, d) => sum + d.netFlow, 0) < -5 || 
                      chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) > 6) && (
                      <Badge className="bg-red-600 mt-2 text-xs">ACTIVE</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Buy/Sell Signals Tab */}
        <TabsContent value="signals" className="space-y-4">
          <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-red-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">📈 Trading Decision Helper</h3>
            <p className="text-sm text-gray-700">
              Based on order flow analysis, here are the current buy/sell recommendations for {selectedSymbol}
            </p>
          </div>

          {/* Current Market Signal */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                🎯 Current Market Signal for {selectedSymbol}
                <Badge className={`${
                  getTradingSignal().signal.includes('sell') ? 'bg-red-500 hover:bg-red-600' :
                  getTradingSignal().signal.includes('buy') ? 'bg-green-500 hover:bg-green-600' :
                  'bg-yellow-500 hover:bg-yellow-600'
                }`}>
                  {getMarketSentiment() === 'bullish' ? '� BULLISH' :
                   getMarketSentiment() === 'bearish' ? '� BEARISH' :
                   '� NEUTRAL'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getTradingSignal().confidence}% confidence
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Buy Signal */}
                <div className={`p-4 rounded-lg border-2 ${
                  getTradingSignal().signal.includes('buy') ? 
                  'bg-green-100 border-green-300' : 
                  'bg-gray-100 border-gray-300'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className={`h-6 w-6 ${
                      getTradingSignal().signal.includes('buy') ? 'text-green-600' : 'text-gray-500'
                    }`} />
                    <h4 className={`font-bold text-lg ${
                      getTradingSignal().signal.includes('buy') ? 'text-green-800' : 'text-gray-600'
                    }`}>
                      BUY SIGNAL
                    </h4>
                    {getTradingSignal().signal === 'strong_buy' && (
                      <Badge className="bg-green-600 hover:bg-green-700 text-xs">STRONG</Badge>
                    )}
                  </div>
                  
                  {getTradingSignal().signal.includes('buy') ? (
                    <div className="space-y-2">
                      <p className="text-green-700 font-semibold">
                        {getTradingSignal().signal === 'strong_buy' ? '🚀 STRONG BUY' : '✅ GOOD TO BUY'}
                      </p>
                      <ul className="text-sm text-green-600 space-y-1">
                        <li>• {getTradingSignal().reason}</li>
                        <li>• Risk Score: {stats?.averageRiskScore.toFixed(1)}/10</li>
                        <li>• Buy Pressure: {((orderFlowData.filter(o => o.orderType === 'buy').length / Math.max(orderFlowData.length, 1)) * 100).toFixed(0)}%</li>
                        <li>• Market Sentiment: {getMarketSentiment().toUpperCase()}</li>
                      </ul>
                      <div className="mt-3 p-2 bg-green-200 rounded text-xs text-green-800">
                        <strong>Confidence:</strong> {getTradingSignal().confidence}% • <strong>Action:</strong> Consider entering position
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-gray-600 font-semibold">⏸️ WAIT FOR BETTER ENTRY</p>
                      <ul className="text-sm text-gray-500 space-y-1">
                        <li>• {getTradingSignal().reason}</li>
                        <li>• Risk Score: {stats?.averageRiskScore.toFixed(1)}/10</li>
                        <li>• Current Signal: {getTradingSignal().signal.toUpperCase()}</li>
                      </ul>
                      <div className="mt-3 p-2 bg-gray-200 rounded text-xs text-gray-600">
                        <strong>Recommendation:</strong> Monitor for improved conditions
                      </div>
                    </div>
                  )}
                </div>

                {/* Sell Signal */}
                <div className={`p-4 rounded-lg border-2 ${
                  getTradingSignal().signal.includes('sell') ? 
                  'bg-red-100 border-red-300' : 
                  'bg-gray-100 border-gray-300'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className={`h-6 w-6 ${
                      getTradingSignal().signal.includes('sell') ? 'text-red-600' : 'text-gray-500'
                    }`} />
                    <h4 className={`font-bold text-lg ${
                      getTradingSignal().signal.includes('sell') ? 'text-red-800' : 'text-gray-600'
                    }`}>
                      SELL SIGNAL
                    </h4>
                    {getTradingSignal().signal === 'strong_sell' && (
                      <Badge className="bg-red-600 hover:bg-red-700 text-xs">URGENT</Badge>
                    )}
                  </div>
                  
                  {getTradingSignal().signal.includes('sell') ? (
                    <div className="space-y-2">
                      <p className="text-red-700 font-semibold">
                        {getTradingSignal().signal === 'strong_sell' ? '🚨 URGENT SELL' : '❌ CONSIDER SELLING'}
                      </p>
                      <ul className="text-sm text-red-600 space-y-1">
                        <li>• {getTradingSignal().reason}</li>
                        <li>• Scam Patterns: {stats?.scamCount} detected</li>
                        <li>• Manipulation Risk: {stats?.averageRiskScore.toFixed(1)}/10</li>
                        <li>• Market Sentiment: {getMarketSentiment().toUpperCase()}</li>
                      </ul>
                      <div className="mt-3 p-2 bg-red-200 rounded text-xs text-red-800">
                        <strong>Confidence:</strong> {getTradingSignal().confidence}% • <strong>Action:</strong> {getTradingSignal().signal === 'strong_sell' ? 'Exit immediately' : 'Consider reducing position'}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-gray-600 font-semibold">📊 HOLD POSITION</p>
                      <ul className="text-sm text-gray-500 space-y-1">
                        <li>• No immediate sell signals</li>
                        <li>• Risk Level: {stats?.averageRiskScore.toFixed(1)}/10</li>
                        <li>• Current Signal: {getTradingSignal().signal.toUpperCase()}</li>
                      </ul>
                      <div className="mt-3 p-2 bg-gray-200 rounded text-xs text-gray-600">
                        <strong>Recommendation:</strong> Continue monitoring market conditions
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Flow Analysis Concepts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📊 Volume Analysis
                  <Badge variant="outline">Key Concept</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Natural Volume:</span>
                    <span className={`font-bold ${stats?.paddingCount === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats?.paddingCount === 0 ? '✅ HEALTHY' : '❌ PADDED'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stats?.paddingCount === 0 ? 
                      'Trading volume appears genuine with normal order sizes' :
                      `${stats?.paddingCount} instances of artificial volume padding detected`
                    }
                  </div>
                  <div className="bg-blue-50 p-3 rounded text-xs">
                    <strong>💡 Trading Tip:</strong> {stats?.paddingCount === 0 ? 
                      'Genuine volume indicates real market interest - good for entry/exit' :
                      'Padded volume can mislead - wait for natural price action'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ⚡ Order Aggressiveness
                  <Badge variant="outline">Key Concept</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Market Aggression:</span>
                    <span className={`font-bold ${stats?.ragCount <= 2 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats?.ragCount <= 2 ? '🟢 CALM' : '🔴 AGGRESSIVE'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stats?.ragCount <= 2 ? 
                      'Order flow shows normal trading behavior' :
                      `${stats?.ragCount} instances of aggressive manipulation detected`
                    }
                  </div>
                  <div className="bg-purple-50 p-3 rounded text-xs">
                    <strong>💡 Trading Tip:</strong> {stats?.ragCount <= 2 ? 
                      'Calm markets are better for planned entries and exits' :
                      'Aggressive manipulation often precedes major price swings'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🎯 Order Flow Momentum
                  <Badge variant="outline">Key Concept</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Buy/Sell Pressure:</span>
                    <span className="font-bold text-blue-600">
                      {orderFlowData.filter(o => o.orderType === 'buy').length > 
                       orderFlowData.filter(o => o.orderType === 'sell').length ? 
                       '📈 BUYING' : '📉 SELLING'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Recent orders: {orderFlowData.filter(o => o.orderType === 'buy').length} buys vs {orderFlowData.filter(o => o.orderType === 'sell').length} sells
                  </div>
                  <div className="bg-green-50 p-3 rounded text-xs">
                    <strong>💡 Trading Tip:</strong> {
                      orderFlowData.filter(o => o.orderType === 'buy').length > 
                      orderFlowData.filter(o => o.orderType === 'sell').length ? 
                      'More buying pressure suggests potential upward momentum' :
                      'More selling pressure may indicate downward momentum'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🛡️ Risk Assessment
                  <Badge variant="outline">Key Concept</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Overall Risk:</span>
                    <span className={`font-bold ${
                      stats?.averageRiskScore <= 3 ? 'text-green-600' :
                      stats?.averageRiskScore <= 6 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {stats?.averageRiskScore <= 3 ? '🟢 LOW' :
                       stats?.averageRiskScore <= 6 ? '🟡 MEDIUM' : '🔴 HIGH'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Average manipulation risk: {stats?.averageRiskScore.toFixed(1)}/10
                  </div>
                  <div className="bg-orange-50 p-3 rounded text-xs">
                    <strong>💡 Trading Tip:</strong> {
                      stats?.averageRiskScore <= 3 ? 
                      'Low risk environment - good for position building' :
                      stats?.averageRiskScore <= 6 ?
                      'Moderate risk - use smaller position sizes' :
                      'High risk - consider reducing exposure or exiting'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Signal Monitor */}
          <Card className="border-2 border-indigo-200 bg-indigo-50">
            <CardHeader>
              <CardTitle className="text-indigo-800 flex items-center gap-2">
                📡 Live Signal Monitor
                {isMonitoring && (
                  <Badge className="bg-green-500 animate-pulse">LIVE</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    getTradingSignal().signal.includes('buy') ? 'text-green-600' :
                    getTradingSignal().signal.includes('sell') ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {getTradingSignal().signal.includes('buy') ? '📈' :
                     getTradingSignal().signal.includes('sell') ? '📉' : '⏸️'}
                  </div>
                  <div className="text-sm font-semibold">
                    {getTradingSignal().signal.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getTradingSignal().confidence}% confidence
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {((orderFlowData.filter(o => o.orderType === 'buy').length / Math.max(orderFlowData.length, 1)) * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm font-semibold">Buy Pressure</div>
                  <div className="text-xs text-muted-foreground">
                    {orderFlowData.filter(o => o.orderType === 'buy').length} buy orders
                  </div>
                </div>
                
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    stats?.averageRiskScore <= 3 ? 'text-green-600' :
                    stats?.averageRiskScore <= 6 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {stats?.averageRiskScore.toFixed(1)}
                  </div>
                  <div className="text-sm font-semibold">Risk Level</div>
                  <div className="text-xs text-muted-foreground">
                    out of 10.0
                  </div>
                </div>
                
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    getMarketSentiment() === 'bullish' ? 'text-green-600' :
                    getMarketSentiment() === 'bearish' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {getMarketSentiment() === 'bullish' ? '🐂' :
                     getMarketSentiment() === 'bearish' ? '🐻' : '😐'}
                  </div>
                  <div className="text-sm font-semibold">Sentiment</div>
                  <div className="text-xs text-muted-foreground">
                    {getMarketSentiment()}
                  </div>
                </div>
              </div>
              
              {isMonitoring && (
                <div className="mt-4 p-3 bg-white rounded-lg border">
                  <div className="text-xs text-muted-foreground mb-2">
                    <strong>Last Update:</strong> {new Date().toLocaleTimeString()} • 
                    <strong> Next Update:</strong> In {Math.floor(Math.random() * 15) + 5} seconds
                  </div>
                  <div className="text-sm">
                    <strong>Current Recommendation:</strong> {getTradingSignal().reason}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Recommendations */}
          <Card className="border-2 border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="text-purple-800 flex items-center gap-2">
                🎯 Trading Decision Framework
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`text-center p-4 rounded-lg border-2 ${
                  getTradingSignal().signal.includes('buy') ? 'bg-green-100 border-green-300' : 'bg-white border-gray-200'
                }`}>
                  <div className="text-2xl mb-2">🟢</div>
                  <h4 className="font-semibold text-green-800 mb-2">BUY CONDITIONS</h4>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>• Risk score below 4/10 ✓</li>
                    <li>• No scam patterns {stats?.scamCount === 0 ? '✓' : '❌'}</li>
                    <li>• Natural volume flow {stats?.paddingCount <= 5 ? '✓' : '❌'}</li>
                    <li>• Strong buy pressure {((orderFlowData.filter(o => o.orderType === 'buy').length / Math.max(orderFlowData.length, 1)) * 100) > 60 ? '✓' : '❌'}</li>
                  </ul>
                  {getTradingSignal().signal.includes('buy') && (
                    <div className="mt-2 text-xs font-semibold text-green-800 bg-green-200 rounded p-1">
                      CONDITIONS MET
                    </div>
                  )}
                </div>
                <div className={`text-center p-4 rounded-lg border-2 ${
                  getTradingSignal().signal === 'wait' ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-gray-200'
                }`}>
                  <div className="text-2xl mb-2">🟡</div>
                  <h4 className="font-semibold text-yellow-800 mb-2">WAIT CONDITIONS</h4>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• Risk score 4-6/10 {stats?.averageRiskScore >= 4 && stats?.averageRiskScore <= 6 ? '✓' : '❌'}</li>
                    <li>• Minor manipulation {stats?.paddingCount > 5 && stats?.paddingCount <= 10 ? '✓' : '❌'}</li>
                    <li>• Mixed signals {getTradingSignal().confidence < 80 ? '✓' : '❌'}</li>
                    <li>• Unclear momentum {Math.abs((orderFlowData.filter(o => o.orderType === 'buy').length - orderFlowData.filter(o => o.orderType === 'sell').length)) <= 2 ? '✓' : '❌'}</li>
                  </ul>
                  {getTradingSignal().signal === 'wait' && (
                    <div className="mt-2 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded p-1">
                      CONDITIONS MET
                    </div>
                  )}
                </div>
                <div className={`text-center p-4 rounded-lg border-2 ${
                  getTradingSignal().signal.includes('sell') ? 'bg-red-100 border-red-300' : 'bg-white border-gray-200'
                }`}>
                  <div className="text-2xl mb-2">🔴</div>
                  <h4 className="font-semibold text-red-800 mb-2">SELL CONDITIONS</h4>
                  <ul className="text-xs text-red-700 space-y-1">
                    <li>• Risk score above 7/10 {stats?.averageRiskScore > 7 ? '✓' : '❌'}</li>
                    <li>• Multiple scam patterns {stats?.scamCount > 2 ? '✓' : '❌'}</li>
                    <li>• Artificial volume {stats?.paddingCount > 10 ? '✓' : '❌'}</li>
                    <li>• Aggressive manipulation {stats?.ragCount > 8 ? '✓' : '❌'}</li>
                  </ul>
                  {getTradingSignal().signal.includes('sell') && (
                    <div className="mt-2 text-xs font-semibold text-red-800 bg-red-200 rounded p-1">
                      CONDITIONS MET
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">🎓 Understanding Market Manipulation</h3>
            <p className="text-sm text-blue-700">
              These patterns help identify when someone might be trying to manipulate the market. Higher numbers mean more suspicious activity.
            </p>
          </div>
          
          <div className="space-y-4">
            {manipulationPatterns.map((pattern, index) => (
              <Card key={index} className="border-l-4" style={{
                borderLeftColor: pattern.severity === 'high' ? '#ef4444' : 
                                pattern.severity === 'medium' ? '#f59e0b' : '#10b981'
              }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getPatternIcon(pattern.type)}
                      <div>
                        <CardTitle className="capitalize flex items-center gap-2">
                          {pattern.type === 'padding' ? '🎯 Order Padding' : 
                           pattern.type === 'scam' ? '⚠️ Scam Activity' : 
                           '⚡ Rag Pulling'}
                          <span className="text-sm font-normal text-muted-foreground">
                            ({pattern.count} instances)
                          </span>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {pattern.type === 'padding' ? 
                            'Someone is placing many tiny orders to create fake trading volume. This makes the coin look more popular than it really is.' :
                           pattern.type === 'scam' ? 
                            'Detected suspicious trading patterns that might indicate fraudulent activity or coordinated manipulation.' :
                            'Rapid aggressive trades designed to quickly move the price up or down to mislead other traders.'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getSeverityColor(pattern.severity)}>
                        {pattern.severity === 'high' ? '🔴 HIGH RISK' : 
                         pattern.severity === 'medium' ? '🟡 MEDIUM' : 
                         '🟢 LOW RISK'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">Threat Level:</span>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={pattern.severity === 'high' ? 85 : pattern.severity === 'medium' ? 55 : 25} 
                          className="w-24 h-2" 
                        />
                        <span className="font-mono text-xs">
                          {pattern.severity === 'high' ? '85%' : pattern.severity === 'medium' ? '55%' : '25%'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Detection Count:</span>
                      <span className="font-medium">{pattern.count} times in last hour</span>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        <strong>What this means:</strong> {
                          pattern.type === 'padding' ? 'Be cautious of artificially inflated volume numbers.' :
                          pattern.type === 'scam' ? 'Exercise extreme caution when trading this asset.' :
                          'Price movements may not reflect genuine market sentiment.'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Order Flow Tab */}
        <TabsContent value="orders" className="space-y-4">
          <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-2">📊 Live Order Stream</h3>
            <p className="text-sm text-purple-700">
              Watch orders as they happen. Red scores (7-10) indicate suspicious activity. Green scores (0-3) are normal.
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Trading Activity
                  </CardTitle>
                  <CardDescription>
                    Live orders with risk analysis • Most recent orders appear first
                  </CardDescription>
                </div>
                <div className="flex gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    BUY
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    SELL
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orderFlowData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No orders yet. Start monitoring to see live data.</p>
                  </div>
                ) : (
                  orderFlowData.slice(0, 10).map((order, index) => {
                    // Check if this order is part of very large activity
                    const isVeryLargeOrder = activeVeryLargeActivity && 
                      (order.size > 25 || // Whale order
                       (activeVeryLargeActivity.startTime <= order.timestamp && 
                        order.timestamp <= Date.now() && 
                        Date.now() - activeVeryLargeActivity.startTime < 30000)); // Within 30s window

                    return (
                    <div key={index} className={`relative flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isVeryLargeOrder ? 
                        'bg-gradient-to-r from-purple-100 to-indigo-100 border-purple-400 border-2 animate-pulse shadow-lg' :
                      order.riskScore >= 7 ? 'bg-red-50 border-red-200' :
                      order.riskScore >= 4 ? 'bg-yellow-50 border-yellow-200' :
                      'bg-green-50 border-green-200'
                    } ${isVeryLargeOrder ? 'animate-pulse' : ''}`}>
                      <div className="flex items-center gap-4">
                        <Badge variant={order.orderType === 'buy' ? 'default' : 'secondary'} 
                               className={`${order.orderType === 'buy' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 
                                          'bg-red-100 text-red-800 hover:bg-red-200'} font-mono`}>
                          {order.orderType === 'buy' ? 
                            <><TrendingUp className="h-3 w-3 mr-1" /> BUY</> : 
                            <><TrendingDown className="h-3 w-3 mr-1" /> SELL</>}
                        </Badge>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {order.symbol}
                            <span className="text-sm font-normal text-muted-foreground">
                              {order.size.toFixed(order.size < 1 ? 6 : 3)} @ ${order.price.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.suspiciousFlags.length > 0 ? (
                              <span className="text-amber-600">🚩 {order.suspiciousFlags.join(', ')}</span>
                            ) : (
                              <span className="text-green-600">✅ Normal activity</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold font-mono ${
                          order.riskScore >= 7 ? 'text-red-600' :
                          order.riskScore >= 4 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {order.riskScore}/10
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(order.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      {/* Very Large Activity Indicator */}
                      {isVeryLargeOrder && (
                        <div className="absolute -top-1 -right-1">
                          <Badge className="bg-purple-600 text-white text-xs animate-bounce">
                            🐋 WHALE
                          </Badge>
                        </div>
                      )}
                    </div>
                    );
                  })
                )}
              </div>
              {orderFlowData.length > 10 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Showing latest 10 orders • {orderFlowData.length} total orders tracked
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">🚨 Active Alerts</h3>
            <p className="text-sm text-red-700">
              These alerts warn you about detected suspicious activities. Take extra caution when trading during these alerts.
            </p>
          </div>
          
          <div className="space-y-4">
            {hasHighRiskDetected && (
              <Alert className="border-red-200 bg-red-50 animate-pulse">
                <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />
                <AlertTitle className="text-red-800 animate-pulse">🔴 HIGH RISK: Large Order Manipulation Detected</AlertTitle>
                <AlertDescription className="text-red-700">
                  <div className="space-y-2">
                    <p>Unusually large order detected on {selectedSymbol} with high manipulation risk score (8/10).</p>
                    <div className="text-xs">
                      <strong>What to do:</strong> Avoid trading until this alert clears. Large orders can artificially move prices.
                    </div>
                    <div className="text-xs text-red-600 flex items-center gap-2">
                      <span className="animate-bounce">🚨</span>
                      ⏰ Active for 2 minutes • 🎯 Detected: {new Date().toLocaleTimeString()}
                      <span className="animate-bounce">🚨</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            <Alert className="border-yellow-200 bg-yellow-50">
              <Timer className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">🟡 MEDIUM RISK: Wash Trading Suspected</AlertTitle>
              <AlertDescription className="text-yellow-700">
                <div className="space-y-2">
                  <p>Repeated back-and-forth trading detected on {selectedSymbol} - possible fake volume creation.</p>
                  <div className="text-xs">
                    <strong>What to do:</strong> Be cautious with volume indicators. Trading volume may be artificially inflated.
                  </div>
                  <div className="text-xs text-yellow-600">
                    ⏰ Active for 5 minutes • 🎯 Risk Score: 7/10
                  </div>
                </div>
              </AlertDescription>
            </Alert>
            
            <Alert className="border-orange-200 bg-orange-50">
              <Target className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800">🟠 LOW RISK: Order Padding Activity</AlertTitle>
              <AlertDescription className="text-orange-700">
                <div className="space-y-2">
                  <p>Multiple small orders creating artificial volume on {selectedSymbol}. Risk score: 3/10</p>
                  <div className="text-xs">
                    <strong>What to do:</strong> Monitor closely but trading can continue. Volume may appear higher than actual interest.
                  </div>
                  <div className="text-xs text-orange-600">
                    ⏰ Active for 12 minutes • 📊 {manipulationPatterns.find(p => p.type === 'padding')?.count || 0} instances detected
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {manipulationPatterns.every(p => p.count === 0) && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">✅ All Clear</AlertTitle>
                <AlertDescription className="text-green-700">
                  No suspicious activities detected for {selectedSymbol}. Trading appears normal with low manipulation risk.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>

        {/* Whale Activity Tab */}
        <TabsContent value="whale" className="space-y-4">
          <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-800 mb-2">🐋 Very Large Activity Monitor</h3>
            <p className="text-sm text-purple-700">
              Track whale movements, massive order flows, and coordinated attacks. All activities are logged with timestamps.
            </p>
          </div>

          {/* Current Active Activity */}
          {activeVeryLargeActivity && (
            <Card className="border-2 border-purple-400 bg-gradient-to-r from-purple-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Zap className="h-5 w-5 animate-pulse" />
                  🚨 ACTIVE VERY LARGE ACTIVITY
                </CardTitle>
                <CardDescription>
                  Live monitoring of current whale activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border animate-pulse">
                    <div className="text-lg font-bold text-purple-800 mb-2">
                      {activeVeryLargeActivity.description}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Type:</span> {activeVeryLargeActivity.type.replace('_', ' ').toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span> {
                          Math.floor((Date.now() - activeVeryLargeActivity.startTime) / 1000)
                        }s
                      </div>
                      <div>
                        <span className="font-medium">Total Volume:</span> {activeVeryLargeActivity.totalVolume.toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium">Order Count:</span> {activeVeryLargeActivity.orderCount}
                      </div>
                      <div>
                        <span className="font-medium">Max Order Size:</span> {activeVeryLargeActivity.maxOrderSize.toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium">Risk Level:</span> 
                        <Badge className={`ml-1 ${
                          activeVeryLargeActivity.riskLevel === 'extreme' 
                            ? 'bg-red-600 text-white animate-bounce' 
                            : 'bg-orange-600 text-white'
                        }`}>
                          {activeVeryLargeActivity.riskLevel.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity History */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="h-5 w-5" />
                    Activity History
                  </CardTitle>
                  <CardDescription>
                    Recent very large activities • {veryLargeActivities.length} total tracked
                  </CardDescription>
                </div>
                <Button size="sm" onClick={saveActivityLog} disabled={veryLargeActivities.length === 0}>
                  💾 Export Log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {veryLargeActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No very large activities detected yet.</p>
                  </div>
                ) : (
                  veryLargeActivities.map((activity, index) => (
                    <div key={activity.id} className={`p-4 rounded-lg border ${
                      activity.isActive 
                        ? 'bg-gradient-to-r from-purple-100 to-indigo-100 border-purple-400 border-2' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={`${
                            activity.riskLevel === 'extreme' 
                              ? 'bg-red-600 text-white' 
                              : 'bg-orange-600 text-white'
                          }`}>
                            {activity.riskLevel.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {activity.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {activity.isActive && (
                            <Badge className="bg-green-600 text-white animate-pulse">
                              ACTIVE
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(activity.startTime).toLocaleString()}
                          {activity.endTime && (
                            <> - {new Date(activity.endTime).toLocaleTimeString()}</>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm font-medium mb-2">
                        {activity.description}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Volume:</span> {activity.totalVolume.toFixed(2)}
                        </div>
                        <div>
                          <span className="font-medium">Orders:</span> {activity.orderCount}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {
                            activity.endTime 
                              ? `${((activity.endTime - activity.startTime) / 1000).toFixed(1)}s`
                              : `${Math.floor((Date.now() - activity.startTime) / 1000)}s (ongoing)`
                          }
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📝 Activity Log
              </CardTitle>
              <CardDescription>
                Detailed log of all very large activity events • {veryLargeActivityLog.length} entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {veryLargeActivityLog.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No log entries yet.</p>
                ) : (
                  veryLargeActivityLog.map((logEntry, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-xs font-mono border">
                      {logEntry}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </TooltipProvider>
  );

  // Helper functions for market analysis summary
  function calculateMarketSentiment(): number {
    if (!stats || stats.totalOrders === 0) return 0.5;
    
    const recentOrders = orderFlowData.slice(-20); // Last 20 orders
    const buyOrders = recentOrders.filter(order => order.orderType === 'buy').length;
    const sellOrders = recentOrders.filter(order => order.orderType === 'sell').length;
    
    if (buyOrders + sellOrders === 0) return 0.5;
    return buyOrders / (buyOrders + sellOrders);
  }

  function getVolumeIndicator(): string {
    const avgVolume = stats?.averageVolume || 0;
    if (avgVolume > 5) return '🔥';
    if (avgVolume > 2) return '📈';
    return '📊';
  }

  function getVolumeDescription(): string {
    const avgVolume = stats?.averageVolume || 0;
    if (avgVolume > 5) return 'Very High 🚀';
    if (avgVolume > 2) return 'High 📈';
    if (avgVolume > 1) return 'Moderate 📊';
    return 'Low 📉';
  }

  function getVolumeExplanation(): string {
    const avgVolume = stats?.averageVolume || 0;
    if (avgVolume > 5) return 'Exceptionally high trading volume suggests major market events or institutional activity.';
    if (avgVolume > 2) return 'Above-average volume indicates increased market interest and potential price movements.';
    if (avgVolume > 1) return 'Normal trading volume with standard market participation.';
    return 'Below-average volume suggests quiet market conditions with low trader interest.';
  }

  function getRiskLevel(): string {
    const riskScore = stats?.averageRiskScore || 0;
    if (riskScore > 7) return 'HIGH ⚠️';
    if (riskScore > 4) return 'MEDIUM 🟡';
    return 'LOW 🟢';
  }

  function getRiskLevelColor(): string {
    const riskScore = stats?.averageRiskScore || 0;
    if (riskScore > 7) return 'text-red-600';
    if (riskScore > 4) return 'text-yellow-600';
    return 'text-green-600';
  }

  function getRiskExplanation(): string {
    const riskScore = stats?.averageRiskScore || 0;
    const highRiskCount = stats?.highRiskCount || 0;
    
    if (riskScore > 7 || highRiskCount > 5) {
      return 'High manipulation risk detected. Multiple suspicious patterns found. Exercise extreme caution and consider avoiding trades until conditions improve.';
    } else if (riskScore > 4 || highRiskCount > 2) {
      return 'Moderate risk environment with some concerning patterns. Monitor closely and use smaller position sizes. Wait for clearer market conditions.';
    } else {
      return 'Low risk environment with normal trading patterns. Market appears healthy with minimal manipulation signs. Good conditions for trading.';
    }
  }

  function getKeyInsights(): string[] {
    const insights: string[] = [];
    const sentiment = calculateMarketSentiment();
    const avgVolume = stats?.averageVolume || 0;
    const riskScore = stats?.averageRiskScore || 0;
    const highRiskCount = stats?.highRiskCount || 0;

    // Sentiment insights
    if (sentiment > 0.7) {
      insights.push('Strong bullish sentiment with ' + Math.round(sentiment * 100) + '% buy orders dominating');
    } else if (sentiment < 0.3) {
      insights.push('Bearish sentiment with ' + Math.round((1-sentiment) * 100) + '% sell orders in control');
    } else {
      insights.push('Balanced market with roughly equal buy/sell pressure (' + Math.round(sentiment * 100) + '% buys)');
    }

    // Volume insights
    if (avgVolume > 5) {
      insights.push('Extremely high volume activity suggests major market events or whale movements');
    } else if (avgVolume < 1) {
      insights.push('Low volume indicates quiet market conditions - breakouts may be more significant');
    }

    // Risk insights
    if (highRiskCount === 0) {
      insights.push('No high-risk manipulation patterns detected - market appears clean');
    } else if (highRiskCount > 3) {
      insights.push(highRiskCount + ' suspicious patterns detected - be cautious of potential manipulation');
    }

    // Data source insight
    if (isWebSocketConnected) {
      insights.push('Real-time Binance data feed active - analysis based on live market data');
    } else {
      insights.push('Using simulated data - connect to live feed for real market insights');
    }

    return insights.length > 0 ? insights : ['Market analysis updating... Please wait for more data.'];
  }

  function getRecommendedActions(): Array<{title: string, description: string}> {
    const actions: Array<{title: string, description: string}> = [];
    const sentiment = calculateMarketSentiment();
    const riskScore = stats?.averageRiskScore || 0;
    const highRiskCount = stats?.highRiskCount || 0;

    // Risk-based actions
    if (riskScore > 7 || highRiskCount > 5) {
      actions.push({
        title: '🛑 Avoid Trading',
        description: 'High manipulation risk detected. Wait for market conditions to improve before entering positions.'
      });
      actions.push({
        title: '📊 Monitor Closely',
        description: 'Keep watching the order flow for signs of manipulation clearing up before considering trades.'
      });
    } else if (riskScore > 4 || highRiskCount > 2) {
      actions.push({
        title: '⚖️ Use Smaller Positions',
        description: 'Moderate risk detected. Reduce position sizes and use tight stop losses if trading.'
      });
      actions.push({
        title: '⏰ Wait for Confirmation',
        description: 'Look for additional confirmation signals before entering trades in this environment.'
      });
    } else {
      // Sentiment-based actions for low risk
      if (sentiment > 0.7) {
        actions.push({
          title: '📈 Consider Long Positions',
          description: 'Strong buying pressure suggests potential upward movement. Look for entry opportunities.'
        });
      } else if (sentiment < 0.3) {
        actions.push({
          title: '📉 Consider Short Positions',
          description: 'Heavy selling pressure suggests potential downward movement. Look for short opportunities.'
        });
      } else {
        actions.push({
          title: '⚖️ Wait for Direction',
          description: 'Balanced market conditions. Wait for clear directional signals before entering trades.'
        });
      }

      actions.push({
        title: '✅ Safe to Trade',
        description: 'Low manipulation risk detected. Normal trading strategies can be applied safely.'
      });
    }

    return actions;
  }
}
