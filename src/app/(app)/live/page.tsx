
"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { TradingChart } from "@/components/trading-chart"
import { getHistoricalKlines } from "@/lib/binance-service"
import { useApi } from "@/context/api-context"
import { useBot } from "@/context/bot-context"
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
import { addDays } from "date-fns"
import type { HistoricalData } from "@/lib/types"
import type { PredictMarketOutput } from "@/ai/flows/predict-market-flow"
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
  const { 
    liveBotState, 
    startLiveBot, 
    stopLiveBot 
  } = useBot();

  const { isRunning, logs, prediction, isPredicting, chartData: botChartData } = liveBotState;
  
  const [isClient, setIsClient] = useState(false)
  
  // Local state for configuration UI
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [selectedStrategy, setSelectedStrategy] = useState<string>("sma-crossover");
  const [interval, setInterval] = useState<string>("1m");
  const [initialCapital, setInitialCapital] = useState<number>(100);
  const [leverage, setLeverage] = useState<number>(10);
  const [takeProfit, setTakeProfit] = useState<number>(5);
  const [stopLoss, setStopLoss] = useState<number>(2);
  const [marginType, setMarginType] = useState<string>("isolated");
  const [useAIPrediction, setUseAIPrediction] = useState(true);

  // Local state for chart data, separate from the bot's data
  const [chartData, setChartData] = useState<HistoricalData[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);

  const [ipAddress, setIpAddress] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true)
    const fetchIp = async () => {
        try {
        const response = await fetch('/api/ip');
        const data = await response.json();
        setIpAddress(data.ip);
        } catch (error) {
        console.error("Could not fetch IP address:", error);
        setIpAddress("Unavailable");
        }
    };
    fetchIp();
  }, [])

  // Sync local chart with bot's chart data when running
  useEffect(() => {
    if (isRunning) {
        setChartData(botChartData);
    }
  }, [isRunning, botChartData]);
  
  // Effect to fetch initial chart data when bot is NOT running
  useEffect(() => {
    if (!isClient || !isConnected || isRunning) {
        if (!isRunning) setChartData([]);
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
  }, [symbol, interval, isConnected, isClient, toast, isRunning]);
  
  const handleBotToggle = async () => {
    if (isRunning) {
        stopLiveBot();
    } else {
        if (!isConnected) {
            toast({ title: "Cannot start bot", description: "Please connect to the API first.", variant: "destructive"});
            return;
        }
        startLiveBot({
            symbol,
            interval,
            strategy: selectedStrategy,
            initialCapital,
            leverage,
            takeProfit,
            stopLoss,
            marginType,
            useAIPrediction
        });
    }
  }

  const anyLoading = isFetchingData;
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
        <TradingChart data={isRunning ? botChartData : chartData} symbol={symbol} interval={interval} onIntervalChange={setInterval} />
      </div>
      <div className="xl:col-span-2 space-y-6">
        <Card>
          <CardHeader>
             <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Bot/> Live Bot Controls</div>
                <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                    <span className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      isConnected ? "bg-green-500" : "bg-red-500"
                    )} />
                    <span>IP: {ipAddress || "Loading..."}</span>
                </div>
            </CardTitle>
            <CardDescription>Configure and manage your live trading bot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Asset</Label>
                  <Select onValueChange={setSymbol} value={symbol} disabled={isRunning}>
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
                  <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={isRunning}>
                    <SelectTrigger id="strategy">
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sma-crossover">SMA Crossover</SelectItem>
                      <SelectItem value="ema-crossover">EMA Crossover</SelectItem>
                      <SelectItem value="rsi-divergence">RSI Divergence</SelectItem>
                      <SelectItem value="peak-formation-fib">Peak Formation Fib</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Interval</Label>
                  <Select onValueChange={setInterval} value={interval} disabled={isRunning}>
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
                        disabled={isRunning}
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
                    disabled={isRunning}
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
                        disabled={isRunning}
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
                        disabled={isRunning}
                    />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margin-type">Margin Type</Label>
                  <Select onValueChange={setMarginType} value={marginType} disabled={isRunning}>
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
                <Switch id="ai-prediction" checked={useAIPrediction} onCheckedChange={setUseAIPrediction} disabled={isRunning} />
                <div className="flex flex-col">
                    <Label htmlFor="ai-prediction">Enable AI Prediction</Label>
                    <p className="text-xs text-muted-foreground">Let an AI validate each signal. Disabling this runs the classic strategy only.</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleBotToggle} disabled={anyLoading || !isConnected} variant={isRunning ? "destructive" : "default"}>
              {isRunning ? <StopCircle /> : <Play />}
              {isRunning ? "Stop Bot" : "Start Bot"}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit/> AI Market Prediction</CardTitle>
                 <CardDescription>AI-powered validation of the strategy's signal.</CardDescription>
            </CardHeader>
            <CardContent>
                {!useAIPrediction && isRunning ? (
                     <div className="flex items-center justify-center h-24 text-muted-foreground">
                        <p>AI Prediction is disabled for this session.</p>
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
                         <p>{isRunning ? 'Waiting for next cycle...' : 'Start the bot to get predictions.'}</p>
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
                        isRunning ? "text-green-500" : "text-red-500"
                    )}>
                        {isRunning ? "Running" : "Idle"}
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="bg-muted/50 p-3 rounded-md h-48 overflow-y-auto">
                    {logs.length > 0 ? (
                        <pre className="text-xs whitespace-pre-wrap font-mono">
                            {logs.join('\n')}
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
