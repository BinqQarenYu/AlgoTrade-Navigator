"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  XCircle
} from "lucide-react";
import { orderFlowAnalyzer, OrderData, ManipulationFlags } from "@/lib/order-flow-analyzer";

interface OrderFlowData {
  symbol: string;
  timestamp: number;
  orderType: 'buy' | 'sell';
  size: number;
  price: number;
  suspiciousFlags: string[];
  riskScore: number;
  flags: ManipulationFlags;
}

interface ManipulationPattern {
  type: 'padding' | 'scam' | 'rag';
  description: string;
  severity: 'low' | 'medium' | 'high';
  count: number;
  examples: OrderFlowData[];
}

export default function OrderFlowPage() {
  const [orderFlowData, setOrderFlowData] = useState<OrderFlowData[]>([]);
  const [manipulationPatterns, setManipulationPatterns] = useState<ManipulationPattern[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTCUSDT");
  const [stats, setStats] = useState<any>(null);
  const [hasHighRiskDetected, setHasHighRiskDetected] = useState(false);

  // Initialize with mock data and start analysis
  useEffect(() => {
    loadMockData();
  }, [selectedSymbol]);

  const loadMockData = () => {
    // Generate mock orders
    const mockOrders = orderFlowAnalyzer.generateMockOrders(selectedSymbol, 100);
    
    // Analyze each order
    const analyzedOrders: OrderFlowData[] = mockOrders.map(order => {
      const flags = orderFlowAnalyzer.analyzeOrder(order);
      return {
        symbol: order.symbol,
        timestamp: order.timestamp,
        orderType: order.side,
        size: order.size,
        price: order.price,
        suspiciousFlags: flags.reasons,
        riskScore: flags.riskScore,
        flags
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
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    // Simulate real-time order flow updates
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance of new order
        const newOrder = orderFlowAnalyzer.generateMockOrders(selectedSymbol, 1)[0];
        const flags = orderFlowAnalyzer.analyzeOrder(newOrder);
        
        const analyzedOrder: OrderFlowData = {
          symbol: newOrder.symbol,
          timestamp: newOrder.timestamp,
          orderType: newOrder.side,
          size: newOrder.size,
          price: newOrder.price,
          suspiciousFlags: flags.reasons,
          riskScore: flags.riskScore,
          flags
        };

        setOrderFlowData(prev => [analyzedOrder, ...prev.slice(0, 99)]);
        
        // Update stats
        const currentStats = orderFlowAnalyzer.getManipulationStats(selectedSymbol);
        setStats(currentStats);
        
        // Check for high risk during monitoring
        const hasLargeOrderManipulation = analyzedOrder.riskScore >= 8 && analyzedOrder.size > 10;
        const hasHighOverallRisk = currentStats.averageRiskScore >= 7;
        
        setHasHighRiskDetected(hasLargeOrderManipulation || hasHighOverallRisk);
      }
    }, 2000);

    // Store interval ID for cleanup
    (window as any).orderFlowInterval = interval;
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    if ((window as any).orderFlowInterval) {
      clearInterval((window as any).orderFlowInterval);
      (window as any).orderFlowInterval = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ((window as any).orderFlowInterval) {
        clearInterval((window as any).orderFlowInterval);
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
          <Button
            variant="outline"
            size="sm"
            onClick={loadMockData}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
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
                  orderFlowData.slice(0, 10).map((order, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      order.riskScore >= 7 ? 'bg-red-50 border-red-200' :
                      order.riskScore >= 4 ? 'bg-yellow-50 border-yellow-200' :
                      'bg-green-50 border-green-200'
                    }`}>
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
                    </div>
                  ))
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
      </Tabs>
    </div>
    </TooltipProvider>
  );
}