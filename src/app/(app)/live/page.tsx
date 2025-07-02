
"use client"

import React, { useState, useEffect, useRef, useTransition } from "react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { TradingChart } from "@/components/trading-chart"
import { getHistoricalKlines } from "@/lib/binance-service"
import { useApi } from "@/context/api-context"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal, Bot, Play, StopCircle, Loader2, BrainCircuit, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { addDays, format } from "date-fns"
import type { HistoricalData } from "@/lib/types"
import { predictMarket, type PredictMarketOutput } from "@/ai/flows/predict-market-flow"
import { calculateEMA, calculateRSI, calculateSMA } from "@/lib/indicators"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

const assetList = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "SHIBUSDT", "AVAXUSDT", "TRXUSDT",
    "DOTUSDT", "LINKUSDT", "TONUSDT", "MATICUSDT", "ICPUSDT", "BCHUSDT", "LTCUSDT", "NEARUSDT", "UNIUSDT", "LEOUSDT",
    "KASUSDT", "OPUSDT", "ETCUSDT", "INJUSDT", "SUIUSDT", "FILUSDT", "OKBUSDT", "HBARUSDT", "STXUSDT", "VETUSDT",
    "APTUSDT", "IMXUSDT", "CROUSDT", "ARBUSDT", "MKRUSDT", "TIAUSDT", "GRTUSDT", "RNDRUSDT", "TAOUSDT", "FETUSDT",
    "LDOUSDT", "XLMUSDT", "ARUSDT", "SEIUSDT", "ATOMUSDT", "RUNEUSDT", "THETAUSDT", "FTMUSDT", "AAVEUSDT", "WLDUSDT",
    "AGIXUSDT", "BGBUSDT", "ALGOUSDT", "PEPEUSDT", "BONKUSDT", "JASMYUSDT", "ENAUSDT", "FLOKIUSDT", "WIFUSDT", "GALAUSDT",
    "BEAMUSDT", "SANDUSDT", "MANAUSDT", "AXSUSDT", "DYDXUSDT", "EGLDUSDT", "XTZUSDT", "GNOUSDT", "PYTHUSDT", "ENSUSDT",
    "NEOUSDT", "WOOUSDT", "MINAUSDT", "APEUSDT", "SNXUSDT", "XMRUSDT", "FLOWUSDT", "KCSUSDT", "SFPUSDT", "GMXUSDT",
    "CHZUSDT", "CRVUSDT", "XECUSDT", "FXSUSDT", "CAKEUSDT", "COMPUSDT", "EOSUSDT", "IOTAUSDT", "ZECUSDT", "KLAYUSDT",
    "MNTUSDT", "OCEANUSDT", "TWTUSDT", "JUPUSDT", "ORDIUSDT", "SATSUSDT", "DYMUSDT", "MANTAUSDT", "ZETAUSDT",
    "XAIUSDT", "ALTUSDT", "PENDLEUSDT", "ONDOUSDT", "STRKUSDT", "PIXELUSDT", "PORTALUSDT", "CYBERUSDT", "AEVOUSDT", "ETHFIUSDT",
    "GNSUSDT", "JTOUSDT", "GMTUSDT", "QTUMUSDT", "ROSEUSDT", "ONEUSDT", "ZILUSDT", "ICXUSDT", "KAVAUSDT", "CELOUSDT",
    "LPTUSDT", "DCRUSDT", "ANKRUSDT", "BATUSDT", "OMGUSDT", "HOTUSDT", "SKLUSDT", "STORJUSDT", "SUSHIUSDT", "1INCHUSDT",
    "YFIUSDT", "BALUSDT", "UMAUSDT", "ZRXUSDT", "KNCUSDT", "LRCUSDT", "RENUSDT", "BANDUSDT", "NMRUSDT", "REQUSDT",
    "ANTUSDT", "CVCUSDT", "DNTUSDT", "LOOMUSDT", "MTLUSDT", "POWRUSDT", "RLCUSDT", "TRBUSDT", "WAVESUSDT"
];

export default function LiveTradingPage() {
  const { toast } = useToast()
  const { isConnected } = useApi();
  const [isClient, setIsClient] = useState(false)
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [chartData, setChartData] = useState<HistoricalData[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>("sma-crossover");
  const [interval, setInterval] = useState<string>("1m");
  const [isBotRunning, setIsBotRunning] = useState(false);
  
  const [initialCapital, setInitialCapital] = useState<number>(100);
  const [leverage, setLeverage] = useState<number>(10);
  const [takeProfit, setTakeProfit] = useState<number>(5);
  const [stopLoss, setStopLoss] = useState<number>(2);
  const [marginType, setMarginType] = useState<string>("isolated");
  const [useAIPrediction, setUseAIPrediction] = useState(true);

  const [botLogs, setBotLogs] = useState<string[]>([]);
  const botIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);
  const [isPredicting, startTransition] = useTransition();
  const [prediction, setPrediction] = useState<PredictMarketOutput | null>(null);

  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Effect to fetch initial chart data
  useEffect(() => {
    if (!isClient || !isConnected) {
        setChartData([]);
        return;
    }

    const fetchData = async () => {
        setIsFetchingData(true);
        toast({ title: "Fetching Market Data...", description: `Loading ${interval} data for ${symbol}.`});
        try {
            const from = addDays(new Date(), -1).getTime();
            const to = new Date().getTime();
            const klines = await getHistoricalKlines(symbol, interval, from, to);
            setChartData(klines);
            toast({ title: "Data Loaded", description: `Market data for ${symbol} is ready.` });
        } catch (error: any) {
            console.error("Failed to fetch historical data:", error);
            toast({
                title: "Failed to Load Data",
                description: error.message || "Could not retrieve historical data from Binance.",
                variant: "destructive"
            });
            setChartData([]);
        } finally {
            setIsFetchingData(false);
        }
    };

    fetchData();
  }, [symbol, isConnected, isClient, toast, interval]);
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setBotLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 100));
  }
  
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        addLog("Screen wake lock active to prevent sleeping.");
        wakeLockRef.current.addEventListener('release', () => {
          addLog('Screen wake lock was released by the system.');
          wakeLockRef.current = null;
        });
      } catch (err: any) {
        // The Wake Lock API can fail for various reasons (e.g., permissions policy).
        // This is not a critical error, so we'll just log a warning to the bot UI.
        addLog(`Warning: Could not acquire screen wake lock. The app may not prevent your device from sleeping.`);
      }
    } else {
      addLog("Warning: Wake Lock API not supported. The app may not prevent your device from sleeping.");
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      addLog("Screen wake lock released.");
    }
  };

  const runPrediction = async () => {
    if (chartData.length < 50) { // Need enough data for indicators
        toast({ title: "Not enough data for prediction", description: "Waiting for more market data to accumulate.", variant: "destructive" });
        return;
    }
    
    setPrediction(null);
    
    // 1. Generate signal from the selected classic strategy
    let strategySignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    const closePrices = chartData.map(d => d.close);

    switch (selectedStrategy) {
        case 'sma-crossover': {
            const shortPeriod = 20;
            const longPeriod = 50;
            const sma_short = calculateSMA(closePrices, shortPeriod);
            const sma_long = calculateSMA(closePrices, longPeriod);
            const last_sma_short = sma_short[sma_short.length - 1];
            const prev_sma_short = sma_short[sma_short.length - 2];
            const last_sma_long = sma_long[sma_long.length - 1];
            const prev_sma_long = sma_long[sma_long.length - 2];
            if (prev_sma_short && prev_sma_long && last_sma_short && last_sma_long) {
                if (prev_sma_short <= prev_sma_long && last_sma_short > last_sma_long) strategySignal = 'BUY';
                else if (prev_sma_short >= prev_sma_long && last_sma_short < last_sma_long) strategySignal = 'SELL';
            }
            break;
        }
        case 'ema-crossover': {
            const shortPeriod = 12;
            const longPeriod = 26;
            const ema_short = calculateEMA(closePrices, shortPeriod);
            const ema_long = calculateEMA(closePrices, longPeriod);
            const last_ema_short = ema_short[ema_short.length - 1];
            const prev_ema_short = ema_short[ema_short.length - 2];
            const last_ema_long = ema_long[ema_long.length - 1];
            const prev_ema_long = ema_long[ema_long.length - 2];
            if (prev_ema_short && prev_ema_long && last_ema_short && last_ema_long) {
                if (prev_ema_short <= prev_ema_long && last_ema_short > last_ema_long) strategySignal = 'BUY';
                else if (prev_ema_short >= prev_ema_long && last_ema_short < last_ema_long) strategySignal = 'SELL';
            }
            break;
        }
        case 'rsi-divergence': {
            const period = 14;
            const rsi = calculateRSI(closePrices, period);
            const last_rsi = rsi[rsi.length - 1];
            const prev_rsi = rsi[rsi.length - 2];
            const oversold = 30;
            const overbought = 70;
            if (prev_rsi && last_rsi) {
                if (prev_rsi <= oversold && last_rsi > oversold) strategySignal = 'BUY';
                else if (prev_rsi >= overbought && last_rsi < overbought) strategySignal = 'SELL';
            }
            break;
        }
    }
    
    if (useAIPrediction) {
      addLog(`Strategy '${selectedStrategy}' generated a ${strategySignal} signal. Asking AI for validation...`);
      // Pass the signal to the AI for validation
      startTransition(async () => {
        try {
          const recentData = chartData.slice(-50); // Use last 50 data points for context
          const result = await predictMarket({
              symbol,
              recentData: JSON.stringify(recentData.map(d => ({t: d.time, o: d.open, h: d.high, l: d.low, c:d.close, v:d.volume}))),
              strategySignal
          });
          setPrediction(result);
          addLog(`AI Prediction: ${result.prediction} (Confidence: ${(result.confidence * 100).toFixed(1)}%). Reason: ${result.reasoning}`);
        } catch (error) {
           console.error("Prediction failed", error);
           toast({ title: "AI Prediction Failed", variant: "destructive" });
           addLog("Error: AI prediction failed.");
        }
      });
    } else {
        addLog(`Strategy '${selectedStrategy}' generated a ${strategySignal} signal. AI validation is disabled.`);
        // When AI is disabled, we could still show a mock prediction based on the signal
        const mockPrediction: PredictMarketOutput = {
            prediction: strategySignal === 'BUY' ? 'UP' : strategySignal === 'SELL' ? 'DOWN' : 'NEUTRAL',
            confidence: 0.99,
            reasoning: `AI is disabled. The prediction is based directly on the '${selectedStrategy}' signal.`
        };
        setPrediction(mockPrediction);
    }
  }

  const handleBotToggle = async () => {
    if (isBotRunning) {
        // Stop the bot
        setIsBotRunning(false);
        if (botIntervalRef.current) {
            clearInterval(botIntervalRef.current);
            botIntervalRef.current = null;
        }
        addLog("Bot stopped by user.");
        await releaseWakeLock();
    } else {
        // Start the bot
        if (!isConnected) {
            toast({ title: "Cannot start bot", description: "Please connect to the API first.", variant: "destructive"});
            return;
        }
        setIsBotRunning(true);
        setBotLogs([]);
        setPrediction(null);
        addLog(`Bot started for ${symbol} on ${interval} interval. Margin: ${marginType}, Capital: $${initialCapital}, Leverage: ${leverage}x, TP: ${takeProfit}%, SL: ${stopLoss}%`);
        
        await requestWakeLock();

        // Initial prediction
        runPrediction();

        // Set interval for subsequent actions
        botIntervalRef.current = setInterval(() => {
            addLog("Running new cycle...");
            runPrediction();
            // In a real scenario, you'd fetch new k-lines and execute trades here.
        }, 30000); // Run every 30 seconds
    }
  }

  // Cleanup effect
  useEffect(() => {
    return () => {
        if (botIntervalRef.current) {
            clearInterval(botIntervalRef.current);
        }
        releaseWakeLock();
    }
  }, []);

  const anyLoading = isFetchingData || isPredicting;
  const getPredictionBadgeVariant = (pred: string) => {
    switch (pred) {
        case 'UP': return 'default';
        case 'DOWN': return 'destructive';
        default: return 'secondary';
    }
  }

  return (
    <div className="flex flex-col h-full">
    {!isConnected && (
        <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>API Disconnected</AlertTitle>
            <AlertDescription>
                Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> to enable live trading features.
            </AlertDescription>
        </Alert>
    )}
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 flex flex-col h-[600px]">
        <TradingChart data={chartData} symbol={symbol} />
      </div>
      <div className="xl:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot/> Live Bot Controls</CardTitle>
            <CardDescription>Configure and manage your live trading bot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Asset</Label>
                  <Select onValueChange={setSymbol} value={symbol} disabled={!isConnected || isBotRunning}>
                    <SelectTrigger id="symbol">
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetList.map(asset => (
                        <SelectItem key={asset} value={asset}>{asset.replace('USDT', '/USDT')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={isBotRunning}>
                    <SelectTrigger id="strategy">
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sma-crossover">SMA Crossover</SelectItem>
                      <SelectItem value="ema-crossover">EMA Crossover</SelectItem>
                      <SelectItem value="rsi-divergence">RSI Divergence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Interval</Label>
                  <Select onValueChange={setInterval} value={interval} disabled={isBotRunning}>
                    <SelectTrigger id="interval">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">1 Minute</SelectItem>
                      <SelectItem value="5m">5 Minutes</SelectItem>
                      <SelectItem value="15m">15 Minutes</SelectItem>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="4h">4 Hours</SelectItem>
                      <SelectItem value="1d">1 Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="initial-capital">Initial Capital ($)</Label>
                    <Input 
                        id="initial-capital" 
                        type="number" 
                        value={initialCapital}
                        onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)}
                        placeholder="100"
                        disabled={isBotRunning}
                    />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leverage">Leverage (x)</Label>
                  <Input
                    id="leverage"
                    type="number"
                    min="1"
                    value={leverage}
                    onChange={(e) => setLeverage(parseInt(e.target.value, 10) || 1)}
                    placeholder="10"
                    disabled={isBotRunning}
                  />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="take-profit">Take Profit (%)</Label>
                    <Input 
                        id="take-profit" 
                        type="number" 
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                        placeholder="5"
                        disabled={isBotRunning}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="stop-loss">Stop Loss (%)</Label>
                    <Input 
                        id="stop-loss" 
                        type="number" 
                        value={stopLoss}
                        onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                        placeholder="2"
                        disabled={isBotRunning}
                    />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margin-type">Margin Type</Label>
                  <Select onValueChange={setMarginType} value={marginType} disabled={isBotRunning}>
                    <SelectTrigger id="margin-type">
                      <SelectValue placeholder="Select margin type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="isolated">Isolated</SelectItem>
                      <SelectItem value="cross">Cross</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </div>
            <div className="space-y-2">
              <Label>AI-Powered Analysis</Label>
              <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                <Switch id="ai-prediction" checked={useAIPrediction} onCheckedChange={setUseAIPrediction} disabled={isBotRunning} />
                <div className="flex flex-col">
                    <Label htmlFor="ai-prediction">Enable AI Prediction</Label>
                    <p className="text-xs text-muted-foreground">Let an AI validate each signal. Disabling this runs the classic strategy only.</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleBotToggle} disabled={!isConnected || isFetchingData} variant={isBotRunning ? "destructive" : "default"}>
              {isBotRunning ? <StopCircle /> : <Play />}
              {isBotRunning ? "Stop Bot" : "Start Bot"}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit/> AI Market Prediction</CardTitle>
                 <CardDescription>AI-powered validation of the strategy's signal.</CardDescription>
            </CardHeader>
            <CardContent>
                {!useAIPrediction ? (
                     <div className="flex items-center justify-center h-24 text-muted-foreground">
                        <p>AI Prediction is disabled.</p>
                    </div>
                ) : isPredicting ? (
                    <div className="flex items-center justify-center h-24 text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        <span>Analyzing market data...</span>
                    </div>
                ) : prediction ? (
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Prediction</span>
                            <Badge variant={getPredictionBadgeVariant(prediction.prediction)} className="text-lg px-4 py-1">
                                {prediction.prediction}
                            </Badge>
                        </div>
                         <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Confidence</span>
                            <span className="font-semibold">{(prediction.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                             <p className="text-sm text-muted-foreground mt-2">{prediction.reasoning}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-24 text-muted-foreground">
                         <p>{isBotRunning ? 'Waiting for next cycle...' : 'Start the bot to get predictions.'}</p>
                    </div>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity/> Bot Status & Logs</CardTitle>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                    Status: 
                    <span className={cn(
                        "font-semibold",
                        isBotRunning ? "text-green-500" : "text-red-500"
                    )}>
                        {isBotRunning ? "Running" : "Idle"}
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="bg-muted/50 p-3 rounded-md h-48 overflow-y-auto">
                    {botLogs.length > 0 ? (
                        <pre className="text-xs whitespace-pre-wrap font-mono">
                            {botLogs.join('\n')}
                        </pre>
                    ) : (
                         <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>Logs will appear here when the bot is running.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

      </div>
    </div>
    </div>
  )
}
