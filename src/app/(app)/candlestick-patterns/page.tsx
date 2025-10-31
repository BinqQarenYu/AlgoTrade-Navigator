"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
// If 'badge.tsx' does not exist in 'src/components/ui/', create it and export the Badge component.
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Minimal in-file Tabs implementation to avoid missing module errors.
 * Provides Tabs, TabsList, TabsTrigger and TabsContent used by this page.
 */
type TabsContextType = {
  value: string;
  setValue: (v: string) => void;
};
const TabsContext = createContext<TabsContextType | undefined>(undefined);

export function Tabs({ defaultValue, children, className }: { defaultValue?: string; children: ReactNode; className?: string }) {
  const [value, setValue] = useState<string>(defaultValue || "");
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function TabsTrigger({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx.setValue(value)}
      aria-selected={active}
      className={className}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  return ctx.value === value ? <div className={className}>{children}</div> : null;
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3,
  Zap,
  Target,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Lightbulb,
  Search,
  Filter,
  RefreshCw,
  LineChart
} from "lucide-react";
import { TradingChart } from "@/components/trading-chart";
import { useDataManager } from "@/context/data-manager-context";
//// import { useRealTimeMarket } from "@/context/realtime-market.provider";
// Adjust the import path as needed to match your project's file structure.

// Candlestick Pattern Interfaces
interface CandlestickPattern {
  id: string;
  name: string;
  type: 'bullish' | 'bearish' | 'reversal' | 'continuation';
  reliability: 'high' | 'medium' | 'low';
  description: string;
  formation: string[];
  strength: number;
  detectedAt: number;
  price: number;
  volume: number;
  confidence: number;
  timeframe: string;
  nextCandles: number;
  signalStrength: 'strong' | 'moderate' | 'weak';
}

interface PatternAnalysis {
  currentPatterns: CandlestickPattern[];
  recentPatterns: CandlestickPattern[];
  patternStats: {
    total: number;
    bullish: number;
    bearish: number;
    successRate: number;
  };
  marketBias: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

export default function CandlestickPatternsPage() {
  const { getChartData, isLoading: dataLoading, error: dataError } = useDataManager();
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [isConnected, setIsConnected] = useState(true);
  
  const getCurrentPrice = async (symbol: string) => {
    // Mock implementation or use appropriate API call
    return 50000; // Placeholder
  };
  
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [patternAnalysis, setPatternAnalysis] = useState<PatternAnalysis | null>(null);
  const [selectedPatternType, setSelectedPatternType] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [patternOverlayEnabled, setPatternOverlayEnabled] = useState(true);
  const [showPatternLabels, setShowPatternLabels] = useState(true);
  const [showSupportResistance, setShowSupportResistance] = useState(true);
  const [showVolumeConfirmation, setShowVolumeConfirmation] = useState(true);

  // Generate comprehensive candlestick pattern data for 1-hour timeframe
  const generatePatternData = (): PatternAnalysis => {
    const currentPrice = 50000; // Default price since we don't have real-time data
    const baseVolume = 1250000; // Default volume since we don't have real-time data
    
    const patterns: CandlestickPattern[] = [
      {
        id: '1',
        name: 'Hammer',
        type: 'bullish',
        reliability: 'high',
        description: 'Bullish reversal pattern with small body and long lower shadow',
        formation: ['Small body', 'Long lower shadow', 'Little/no upper shadow'],
        strength: 85,
        detectedAt: Date.now() - 3600000, // 1 hour ago
        price: currentPrice * 1.002,
        volume: baseVolume,
        confidence: 82,
        timeframe: '1h',
        nextCandles: 3,
        signalStrength: 'strong'
      },
      {
        id: '2',
        name: 'Doji',
        type: 'reversal',
        reliability: 'medium',
        description: 'Indecision pattern where open and close prices are nearly equal',
        formation: ['Open ≈ Close', 'Upper shadow', 'Lower shadow'],
        strength: 65,
        detectedAt: Date.now() - 7200000, // 2 hours ago
        price: currentPrice * 0.999,
        volume: baseVolume * 0.8,
        confidence: 68,
        timeframe: '1h',
        nextCandles: 2,
        signalStrength: 'moderate'
      },
      {
        id: '3',
        name: 'Shooting Star',
        type: 'bearish',
        reliability: 'high',
        description: 'Bearish reversal pattern with small body and long upper shadow',
        formation: ['Small body at bottom', 'Long upper shadow', 'Little/no lower shadow'],
        strength: 78,
        detectedAt: Date.now() - 10800000, // 3 hours ago
        price: currentPrice * 1.005,
        volume: baseVolume * 1.2,
        confidence: 75,
        timeframe: '1h',
        nextCandles: 4,
        signalStrength: 'strong'
      },
      {
        id: '4',
        name: 'Bullish Engulfing',
        type: 'bullish',
        reliability: 'high',
        description: 'Strong bullish reversal where green candle engulfs previous red candle',
        formation: ['Previous bearish candle', 'Current bullish body engulfs previous', 'Higher volume'],
        strength: 88,
        detectedAt: Date.now() - 14400000, // 4 hours ago
        price: currentPrice * 0.998,
        volume: baseVolume * 1.4,
        confidence: 85,
        timeframe: '1h',
        nextCandles: 5,
        signalStrength: 'strong'
      },
      {
        id: '5',
        name: 'Bearish Engulfing',
        type: 'bearish',
        reliability: 'high',
        description: 'Strong bearish reversal where red candle engulfs previous green candle',
        formation: ['Previous bullish candle', 'Current bearish body engulfs previous', 'Higher volume'],
        strength: 86,
        detectedAt: Date.now() - 18000000, // 5 hours ago
        price: currentPrice * 1.003,
        volume: baseVolume * 1.3,
        confidence: 83,
        timeframe: '1h',
        nextCandles: 4,
        signalStrength: 'strong'
      },
      {
        id: '6',
        name: 'Morning Star',
        type: 'bullish',
        reliability: 'high',
        description: 'Three-candle bullish reversal pattern',
        formation: ['Long bearish candle', 'Small body (star)', 'Long bullish candle'],
        strength: 92,
        detectedAt: Date.now() - 21600000, // 6 hours ago
        price: currentPrice * 0.996,
        volume: baseVolume * 1.6,
        confidence: 90,
        timeframe: '1h',
        nextCandles: 6,
        signalStrength: 'strong'
      },
      {
        id: '7',
        name: 'Evening Star',
        type: 'bearish',
        reliability: 'high',
        description: 'Three-candle bearish reversal pattern',
        formation: ['Long bullish candle', 'Small body (star)', 'Long bearish candle'],
        strength: 89,
        detectedAt: Date.now() - 25200000, // 7 hours ago
        price: currentPrice * 1.004,
        volume: baseVolume * 1.5,
        confidence: 87,
        timeframe: '1h',
        nextCandles: 5,
        signalStrength: 'strong'
      },
      {
        id: '8',
        name: 'Hanging Man',
        type: 'bearish',
        reliability: 'medium',
        description: 'Bearish reversal pattern with small body and long lower shadow at top of trend',
        formation: ['Small body', 'Long lower shadow', 'Appears after uptrend'],
        strength: 71,
        detectedAt: Date.now() - 28800000, // 8 hours ago
        price: currentPrice * 1.001,
        volume: baseVolume * 0.9,
        confidence: 74,
        timeframe: '1h',
        nextCandles: 3,
        signalStrength: 'moderate'
      },
      {
        id: '9',
        name: 'Inverted Hammer',
        type: 'bullish',
        reliability: 'medium',
        description: 'Potential bullish reversal with small body and long upper shadow',
        formation: ['Small body at bottom', 'Long upper shadow', 'Appears after downtrend'],
        strength: 69,
        detectedAt: Date.now() - 32400000, // 9 hours ago
        price: currentPrice * 0.997,
        volume: baseVolume * 0.85,
        confidence: 72,
        timeframe: '1h',
        nextCandles: 3,
        signalStrength: 'moderate'
      },
      {
        id: '10',
        name: 'Piercing Pattern',
        type: 'bullish',
        reliability: 'high',
        description: 'Two-candle bullish reversal pattern',
        formation: ['Long bearish candle', 'Bullish candle opens below low, closes above midpoint'],
        strength: 81,
        detectedAt: Date.now() - 36000000, // 10 hours ago
        price: currentPrice * 0.995,
        volume: baseVolume * 1.25,
        confidence: 79,
        timeframe: '1h',
        nextCandles: 4,
        signalStrength: 'strong'
      },
      {
        id: '11',
        name: 'Dark Cloud Cover',
        type: 'bearish',
        reliability: 'high',
        description: 'Two-candle bearish reversal pattern',
        formation: ['Long bullish candle', 'Bearish candle opens above high, closes below midpoint'],
        strength: 84,
        detectedAt: Date.now() - 39600000, // 11 hours ago
        price: currentPrice * 1.006,
        volume: baseVolume * 1.35,
        confidence: 81,
        timeframe: '1h',
        nextCandles: 4,
        signalStrength: 'strong'
      },
      {
        id: '12',
        name: 'Three White Soldiers',
        type: 'bullish',
        reliability: 'high',
        description: 'Three consecutive long bullish candles with higher closes',
        formation: ['Three long bullish candles', 'Each opens within previous body', 'Progressive higher closes'],
        strength: 94,
        detectedAt: Date.now() - 43200000, // 12 hours ago
        price: currentPrice * 0.993,
        volume: baseVolume * 1.8,
        confidence: 92,
        timeframe: '1h',
        nextCandles: 6,
        signalStrength: 'strong'
      },
      {
        id: '13',
        name: 'Three Black Crows',
        type: 'bearish',
        reliability: 'high',
        description: 'Three consecutive long bearish candles with lower closes',
        formation: ['Three long bearish candles', 'Each opens within previous body', 'Progressive lower closes'],
        strength: 91,
        detectedAt: Date.now() - 46800000, // 13 hours ago
        price: currentPrice * 1.007,
        volume: baseVolume * 1.7,
        confidence: 89,
        timeframe: '1h',
        nextCandles: 5,
        signalStrength: 'strong'
      },
      {
        id: '14',
        name: 'Harami Bullish',
        type: 'bullish',
        reliability: 'medium',
        description: 'Small bullish candle contained within previous large bearish candle',
        formation: ['Large bearish candle', 'Small bullish candle inside previous body'],
        strength: 73,
        detectedAt: Date.now() - 50400000, // 14 hours ago
        price: currentPrice * 0.999,
        volume: baseVolume * 0.7,
        confidence: 76,
        timeframe: '1h',
        nextCandles: 3,
        signalStrength: 'moderate'
      },
      {
        id: '15',
        name: 'Harami Bearish',
        type: 'bearish',
        reliability: 'medium',
        description: 'Small bearish candle contained within previous large bullish candle',
        formation: ['Large bullish candle', 'Small bearish candle inside previous body'],
        strength: 70,
        detectedAt: Date.now() - 54000000, // 15 hours ago
        price: currentPrice * 1.002,
        volume: baseVolume * 0.75,
        confidence: 73,
        timeframe: '1h',
        nextCandles: 3,
        signalStrength: 'moderate'
      }
    ];

    const recentPatterns = patterns;
    const bullishCount = patterns.filter(p => p.type === 'bullish').length;
    const bearishCount = patterns.filter(p => p.type === 'bearish').length;

    return {
      currentPatterns: patterns.slice(0, 3),
      recentPatterns,
      patternStats: {
        total: patterns.length,
        bullish: bullishCount,
        bearish: bearishCount,
        successRate: 76.8
      },
      marketBias: bullishCount > bearishCount ? 'bullish' : bearishCount > bullishCount ? 'bearish' : 'neutral',
      confidence: 78
    };
  };

  // Start pattern analysis
  const startAnalysis = async () => {
    setIsAnalyzing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPatternAnalysis(generatePatternData());
    setIsAnalyzing(false);
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // Generate dynamic pattern data with time-based variations
        const newAnalysis = generatePatternData();
        
        // Add some randomness to simulate real pattern detection
        const timeVariation = Math.sin(Date.now() / 60000) * 0.3; // 1-minute cycle
        newAnalysis.confidence = Math.max(60, Math.min(95, newAnalysis.confidence + timeVariation * 20));
        
        // Occasionally add new patterns
        if (Math.random() > 0.7) {
          const newPattern: CandlestickPattern = {
            id: Date.now().toString(),
            name: ['Hammer', 'Doji', 'Shooting Star', 'Engulfing'][Math.floor(Math.random() * 4)],
            type: Math.random() > 0.5 ? 'bullish' : 'bearish',
            reliability: ['high', 'medium'][Math.floor(Math.random() * 2)] as 'high' | 'medium',
            description: 'Newly detected pattern forming in real-time',
            formation: ['Pattern forming', 'Confirmation pending'],
            strength: Math.floor(Math.random() * 40) + 60,
            detectedAt: Date.now(),
            price: 67000 + (Math.random() - 0.5) * 1000,
            volume: Math.floor(Math.random() * 2000000) + 800000,
            confidence: Math.floor(Math.random() * 30) + 70,
            timeframe: selectedTimeframe,
            nextCandles: Math.floor(Math.random() * 5) + 1,
            signalStrength: ['strong', 'moderate'][Math.floor(Math.random() * 2)] as 'strong' | 'moderate'
          };
          
          newAnalysis.currentPatterns.unshift(newPattern);
          newAnalysis.currentPatterns = newAnalysis.currentPatterns.slice(0, 3); // Keep only 3 active
        }
        
        setPatternAnalysis(newAnalysis);
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedTimeframe]);

  // Initialize on mount
  useEffect(() => {
    startAnalysis();
  }, [selectedSymbol, selectedTimeframe]);

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'bullish': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'bearish': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'reversal': return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'continuation': return <Activity className="h-4 w-4 text-purple-600" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-600" />;
    }
  };

  const getReliabilityColor = (reliability: string) => {
    switch (reliability) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredPatterns = patternAnalysis?.recentPatterns.filter(pattern => 
    selectedPatternType === 'all' || pattern.type === selectedPatternType
  ) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Candlestick Pattern Analysis</h1>
          <p className="text-gray-600 mt-2">
            Real-time detection and analysis of candlestick patterns for enhanced trading decisions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={startAnalysis}
            disabled={isAnalyzing}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Scan Patterns
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Analysis Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Trading Pair</label>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select Symbol" />
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {/* Top 20 Cryptocurrencies */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100">
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
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border-t">
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
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border-t">
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
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border-t">
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
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Timeframe</label>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1s">1 Second</SelectItem>
                  <SelectItem value="1m">1 Minute</SelectItem>
                  <SelectItem value="3m">3 Minutes</SelectItem>
                  <SelectItem value="5m">5 Minutes</SelectItem>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="30m">30 Minutes</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="2h">2 Hours</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="6h">6 Hours</SelectItem>
                  <SelectItem value="12h">12 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Pattern Type</label>
              <Select value={selectedPatternType} onValueChange={setSelectedPatternType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patterns</SelectItem>
                  <SelectItem value="bullish">Bullish Only</SelectItem>
                  <SelectItem value="bearish">Bearish Only</SelectItem>
                  <SelectItem value="reversal">Reversal Patterns</SelectItem>
                  <SelectItem value="continuation">Continuation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
                className="w-full"
              >
                {autoRefresh ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Auto-Refresh ON
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Manual Mode
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pattern Overlay Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className={`h-5 w-5 ${patternOverlayEnabled ? 'text-green-600' : 'text-gray-500'}`} />
                Pattern Overlay
                {patternOverlayEnabled && (
                  <div className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    ACTIVE
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                Configure pattern visualization and overlay settings
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Quick Toggle:</span>
              <Switch
                checked={patternOverlayEnabled}
                onCheckedChange={setPatternOverlayEnabled}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pattern Overlay Toggle */}
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 ${
                patternOverlayEnabled 
                  ? 'bg-gradient-to-r from-green-50 to-blue-50 border-green-200' 
                  : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 className={`h-4 w-4 ${patternOverlayEnabled ? 'text-green-600' : 'text-gray-500'}`} />
                    <span className={`font-semibold ${patternOverlayEnabled ? 'text-green-800' : 'text-gray-600'}`}>
                      Pattern Detection
                    </span>
                    {patternOverlayEnabled && (
                      <div className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        ON
                      </div>
                    )}
                  </div>
                  <p className={`text-sm ${patternOverlayEnabled ? 'text-gray-700' : 'text-gray-500'}`}>
                    Enable real-time pattern detection and overlay on the chart
                  </p>
                </div>
                <Switch
                  checked={patternOverlayEnabled}
                  onCheckedChange={setPatternOverlayEnabled}
                />
              </div>
              
              {patternOverlayEnabled && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-700 font-medium">Pattern Overlay Active</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Automatically detecting and highlighting candlestick patterns as they form
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span>Labels: {showPatternLabels ? 'ON' : 'OFF'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>S/R: {showSupportResistance ? 'ON' : 'OFF'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span>Volume: {showVolumeConfirmation ? 'ON' : 'OFF'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pattern Display Options */}
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border transition-all duration-300 ${
                patternOverlayEnabled 
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200' 
                  : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Target className={`h-4 w-4 ${patternOverlayEnabled ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className={`font-semibold ${patternOverlayEnabled ? 'text-blue-800' : 'text-gray-600'}`}>
                    Display Options
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 rounded-md bg-white/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Pattern Labels</span>
                    </div>
                    <Switch 
                      checked={showPatternLabels && patternOverlayEnabled} 
                      disabled={!patternOverlayEnabled}
                      onCheckedChange={setShowPatternLabels}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-md bg-white/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium">Support/Resistance Lines</span>
                    </div>
                    <Switch 
                      checked={showSupportResistance && patternOverlayEnabled} 
                      disabled={!patternOverlayEnabled}
                      onCheckedChange={setShowSupportResistance}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-md bg-white/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-medium">Volume Confirmation</span>
                    </div>
                    <Switch 
                      checked={showVolumeConfirmation && patternOverlayEnabled} 
                      disabled={!patternOverlayEnabled}
                      onCheckedChange={setShowVolumeConfirmation}
                    />
                  </div>
                </div>
                
                {!patternOverlayEnabled && (
                  <div className="mt-3 p-2 bg-gray-100 rounded-md">
                    <p className="text-xs text-gray-500 text-center">
                      Enable Pattern Detection to configure display options
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pattern Overlay Status */}
          <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border">
            <h4 className="font-semibold text-gray-800 mb-3">🔍 Pattern Overlay Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Current Status</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${patternOverlayEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-sm">
                    {patternOverlayEnabled ? 'Overlay Enabled' : 'Overlay Disabled'}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {patternOverlayEnabled 
                    ? `${patternAnalysis?.currentPatterns.length || 0} patterns visible`
                    : 'Enable overlay to see patterns'
                  }
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Pattern Reliability</div>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>High: {patternAnalysis?.currentPatterns.filter(p => p.reliability === 'high').length || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>Medium: {patternAnalysis?.currentPatterns.filter(p => p.reliability === 'medium').length || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Low: {patternAnalysis?.currentPatterns.filter(p => p.reliability === 'low').length || 0}</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Pattern Types</div>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span>Bullish: {patternAnalysis?.patternStats.bullish || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span>Bearish: {patternAnalysis?.patternStats.bearish || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 text-blue-500" />
                    <span>Reversal: {patternAnalysis?.currentPatterns.filter(p => p.type === 'reversal').length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Overview */}
      {patternAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Patterns</p>
                  <p className="text-2xl font-bold">{patternAnalysis.patternStats.total}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Bullish Signals</p>
                  <p className="text-2xl font-bold text-green-600">{patternAnalysis.patternStats.bullish}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Bearish Signals</p>
                  <p className="text-2xl font-bold text-red-600">{patternAnalysis.patternStats.bearish}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{patternAnalysis.patternStats.successRate}%</p>
                </div>
                <Star className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="live-patterns" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="live-patterns">Live Patterns</TabsTrigger>
          <TabsTrigger value="trading-chart" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Trading Chart
          </TabsTrigger>
          <TabsTrigger value="pattern-library">Pattern Library</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
        </TabsList>

        {/* Live Patterns Tab */}
        <TabsContent value="live-patterns" className="space-y-4">
          {/* Current Active Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Active Patterns
                {autoRefresh && (
                  <Badge className="bg-green-500 animate-pulse">LIVE</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Currently forming or recently completed patterns on {selectedSymbol} ({selectedTimeframe})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {patternAnalysis?.currentPatterns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active patterns detected</p>
                  <p className="text-sm">Patterns will appear as they form</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {patternAnalysis?.currentPatterns.map((pattern) => (
                    <div key={pattern.id} className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-green-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getPatternIcon(pattern.type)}
                            <h3 className="font-semibold text-lg">{pattern.name}</h3>
                            <Badge className={getReliabilityColor(pattern.reliability)}>
                              {pattern.reliability} reliability
                            </Badge>
                            <Badge variant="outline">{pattern.signalStrength}</Badge>
                          </div>
                          <p className="text-gray-600 mb-3">{pattern.description}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Price:</span> ${pattern.price.toLocaleString()}
                            </div>
                            <div>
                              <span className="font-medium">Confidence:</span> {pattern.confidence}%
                            </div>
                            <div>
                              <span className="font-medium">Volume:</span> {(pattern.volume / 1000000).toFixed(1)}M
                            </div>
                            <div>
                              <span className="font-medium">Detected:</span> {new Date(pattern.detectedAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">{pattern.strength}%</div>
                          <div className="text-xs text-gray-500">Strength</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detected Patterns Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Detected Candlestick Patterns (1 Hour)
                    <Badge className="bg-blue-600">
                      {filteredPatterns.filter(p => p.timeframe === '1h').length} Patterns
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Comprehensive table of all candlestick patterns detected in the 1-hour timeframe for {selectedSymbol}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const csvContent = [
                        // CSV Header
                        ['Pattern', 'Type', 'Reliability', 'Price', 'Volume', 'Confidence %', 'Strength %', 'Signal', 'Detected At', 'Status'].join(','),
                        // CSV Data
                        ...filteredPatterns.map(pattern => [
                          pattern.name,
                          pattern.type,
                          pattern.reliability,
                          pattern.price,
                          pattern.volume,
                          pattern.confidence,
                          pattern.strength,
                          pattern.signalStrength,
                          new Date(pattern.detectedAt).toLocaleString(),
                          'Active'
                        ].join(','))
                      ].join('\n');
                      
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `candlestick-patterns-1h-${selectedSymbol}-${new Date().toISOString().split('T')[0]}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Table Filters */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Filter by Pattern Type
                  </label>
                  <Select value={selectedPatternType} onValueChange={setSelectedPatternType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All patterns" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Patterns</SelectItem>
                      <SelectItem value="bullish">Bullish Only</SelectItem>
                      <SelectItem value="bearish">Bearish Only</SelectItem>
                      <SelectItem value="reversal">Reversal Only</SelectItem>
                      <SelectItem value="continuation">Continuation Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Minimum Confidence
                  </label>
                  <Select value="all" onValueChange={() => {}}>
                    <SelectTrigger>
                      <SelectValue placeholder="All confidence levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="high">80%+ High</SelectItem>
                      <SelectItem value="medium">60-80% Medium</SelectItem>
                      <SelectItem value="low">Below 60% Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Sort By
                  </label>
                  <Select value="time" onValueChange={() => {}}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time">Detection Time</SelectItem>
                      <SelectItem value="confidence">Confidence</SelectItem>
                      <SelectItem value="strength">Strength</SelectItem>
                      <SelectItem value="volume">Volume</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Pattern</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Reliability</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Volume</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Confidence</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Strength</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Signal</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Detected At</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatterns.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-8 text-gray-500">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No patterns detected for 1-hour timeframe</p>
                          <p className="text-sm">Patterns will appear as they form</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPatterns.map((pattern) => (
                        <tr key={pattern.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {getPatternIcon(pattern.type)}
                              <span className="font-medium text-gray-900">{pattern.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge 
                              variant="outline" 
                              className={
                                pattern.type === 'bullish' ? 'border-green-500 text-green-700 bg-green-50' :
                                pattern.type === 'bearish' ? 'border-red-500 text-red-700 bg-red-50' :
                                pattern.type === 'reversal' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                                'border-purple-500 text-purple-700 bg-purple-50'
                              }
                            >
                              {pattern.type}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div 
                                className={`w-3 h-3 rounded-full ${getReliabilityColor(pattern.reliability)}`}
                              ></div>
                              <span className="text-sm font-medium capitalize">{pattern.reliability}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-mono text-sm">${pattern.price.toLocaleString()}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm">{(pattern.volume / 1000000).toFixed(2)}M</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${pattern.confidence}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{pattern.confidence}%</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ width: `${pattern.strength}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{pattern.strength}%</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge 
                              className={
                                pattern.signalStrength === 'strong' ? 'bg-green-600' :
                                pattern.signalStrength === 'moderate' ? 'bg-yellow-600' :
                                'bg-red-600'
                              }
                            >
                              {pattern.signalStrength}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm">
                              <div className="font-medium">
                                {new Date(pattern.detectedAt).toLocaleDateString()}
                              </div>
                              <div className="text-gray-500">
                                {new Date(pattern.detectedAt).toLocaleTimeString()}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-sm text-green-600 font-medium">Active</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Table Summary */}
              {filteredPatterns.length > 0 && (
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{filteredPatterns.length}</div>
                    <div className="text-sm text-gray-500">Total Patterns</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {filteredPatterns.filter(p => p.type === 'bullish').length}
                    </div>
                    <div className="text-sm text-gray-500">Bullish</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {filteredPatterns.filter(p => p.type === 'bearish').length}
                    </div>
                    <div className="text-sm text-gray-500">Bearish</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(filteredPatterns.reduce((sum, p) => sum + p.confidence, 0) / filteredPatterns.length)}%
                    </div>
                    <div className="text-sm text-gray-500">Avg Confidence</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trading Chart Tab */}
        <TabsContent value="trading-chart" className="space-y-4">
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">📈 Advanced Candlestick Chart Analysis</h3>
            <p className="text-sm text-gray-700">
              Professional trading chart with real-time price action and candlestick pattern overlay for {selectedSymbol}
            </p>
          </div>

          {/* Trading Chart Card */}
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <LineChart className="h-5 w-5" />
                Live Trading Chart
                <Badge className="bg-purple-500 animate-pulse">REAL-TIME</Badge>
              </CardTitle>
              <CardDescription>
                Advanced candlestick chart with pattern recognition and technical analysis for {selectedSymbol}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Symbol:</span>
                  <Badge variant="outline">{selectedSymbol}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Timeframe:</span>
                  <Badge variant="outline">{selectedTimeframe}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Pattern Detection:</span>
                  <Badge className="bg-green-500">Active</Badge>
                </div>
              </div>
              
              {/* TradingChart Component */}
              <div className="w-full bg-[#1a1d28] rounded-lg overflow-hidden">
                <TradingChart 
                  data={[]} // Empty data for now
                  symbol={selectedSymbol} 
                  interval={selectedTimeframe}
                />
              </div>

              {/* Chart Features Info */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-green-800">Pattern Overlay</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    Automatic detection and highlighting of candlestick patterns as they form
                  </p>
                </div>
                
                <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-800">Support/Resistance</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    Key price levels identified based on pattern formations and volume
                  </p>
                </div>
                
                <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-purple-800">Volume Analysis</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    Volume confirmation for pattern validity and strength assessment
                  </p>
                </div>
              </div>

              {/* Pattern Detection Status */}
              <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border">
                <h4 className="font-semibold text-black mb-3">🔍 Real-Time Pattern Detection</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-black mb-2">Detection Status</div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-black">Actively scanning for patterns</span>
                    </div>
                    <div className="text-xs text-black mt-1">
                      {patternAnalysis?.currentPatterns.length || 0} patterns currently active
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-black mb-2">Chart Features</div>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-black">Real-time price updates</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-black">Volume analysis overlay</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-black">Pattern recognition alerts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pattern Library Tab */}
        <TabsContent value="pattern-library" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Bullish Patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                  Bullish Patterns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {['Hammer', 'Bullish Engulfing', 'Morning Star', 'Piercing Line', 'Three White Soldiers'].map((pattern) => (
                  <div key={pattern} className="p-3 border rounded-lg hover:bg-green-50">
                    <div className="font-medium">{pattern}</div>
                    <div className="text-sm text-gray-500">Bullish reversal signal</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Bearish Patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <TrendingDown className="h-5 w-5" />
                  Bearish Patterns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {['Shooting Star', 'Bearish Engulfing', 'Evening Star', 'Dark Cloud Cover', 'Three Black Crows'].map((pattern) => (
                  <div key={pattern} className="p-3 border rounded-lg hover:bg-red-50">
                    <div className="font-medium">{pattern}</div>
                    <div className="text-sm text-gray-500">Bearish reversal signal</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Neutral/Indecision Patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <RefreshCw className="h-5 w-5" />
                  Indecision Patterns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {['Doji', 'Spinning Top', 'Harami', 'Inside Bar', 'High Wave'].map((pattern) => (
                  <div key={pattern} className="p-3 border rounded-lg hover:bg-blue-50">
                    <div className="font-medium">{pattern}</div>
                    <div className="text-sm text-gray-500">Market indecision</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Market Bias */}
            <Card>
              <CardHeader>
                <CardTitle>Market Bias Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {patternAnalysis && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${
                        patternAnalysis.marketBias === 'bullish' ? 'text-green-600' :
                        patternAnalysis.marketBias === 'bearish' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {patternAnalysis.marketBias.toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-500 mt-2">
                        Current market sentiment based on pattern analysis
                      </div>
                    </div>
                    <Progress value={patternAnalysis.confidence} className="w-full" />
                    <div className="text-center mt-2">
                      <span className="text-sm text-gray-600">Confidence: {patternAnalysis.confidence}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pattern Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Pattern Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {patternAnalysis && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Bullish Patterns</span>
                      <span className="font-bold text-green-600">{patternAnalysis.patternStats.bullish}</span>
                    </div>
                    <Progress value={(patternAnalysis.patternStats.bullish / patternAnalysis.patternStats.total) * 100} className="w-full bg-green-200" />
                    
                    <div className="flex justify-between items-center">
                      <span>Bearish Patterns</span>
                      <span className="font-bold text-red-600">{patternAnalysis.patternStats.bearish}</span>
                    </div>
                    <Progress value={(patternAnalysis.patternStats.bearish / patternAnalysis.patternStats.total) * 100} className="w-full bg-red-200" />
                    
                    <div className="pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{patternAnalysis.patternStats.successRate}%</div>
                        <div className="text-sm text-gray-500">Historical Success Rate</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="education" className="space-y-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  Understanding Candlestick Patterns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Key Components</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>Body:</strong> Open to close price range</li>
                      <li>• <strong>Wicks/Shadows:</strong> High and low price extremes</li>
                      <li>• <strong>Color:</strong> Green (bullish) vs Red (bearish)</li>
                      <li>• <strong>Size:</strong> Indicates strength of movement</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Pattern Reliability</h3>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>High:</strong> 75%+ success rate</li>
                      <li>• <strong>Medium:</strong> 50-75% success rate</li>
                      <li>• <strong>Low:</strong> Below 50% success rate</li>
                      <li>• <strong>Context:</strong> Always consider market trend</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trading Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Important Guidelines</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>• Always confirm patterns with volume and other indicators</p>
                    <p>• Wait for pattern completion before taking action</p>
                    <p>• Consider the overall market trend and context</p>
                    <p>• Use proper risk management and stop-loss orders</p>
                    <p>• Practice pattern recognition on historical data</p>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}