
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
import { predictMarket, PredictMarketOutput } from "@/ai/flows/predict-market-flow"
import { Badge } from "@/components/ui/badge"

const assetList = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", 
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
  const [leverage, setLeverage] = useState<number>(10);
  const [botLogs, setBotLogs] = useState<string[]>([]);
  const botIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPredicting, startTransition] = useTransition();
  const [prediction, setPrediction] = useState<PredictMarketOutput | null>(null);

  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Effect to fetch initial chart data
  useEffect(() => {
    if (!isClient) return;

    const fetchData = async () => {
        if (!isConnected) {
            setChartData([]);
            return;
        }
        setIsFetchingData(true);
        toast({ title: "Fetching Market Data...", description: `Loading initial 1-minute data for ${symbol}.`});
        try {
            const from = addDays(new Date(), -1).getTime();
            const to = new Date().getTime();
            const klines = await getHistoricalKlines(symbol, "1m", from, to);
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
  }, [symbol, interval, isConnected, isClient, toast]);
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setBotLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 100));
  }

  const runPrediction = async () => {
    if (chartData.length < 10) {
        toast({ title: "Not enough data for prediction", variant: "destructive" });
        return;
    }
    
    setPrediction(null);
    startTransition(async () => {
      try {
        const recentData = chartData.slice(-20); // Use last 20 data points
        const result = await predictMarket({
            symbol,
            recentData: JSON.stringify(recentData.map(d => ({t: d.time, o: d.open, h: d.high, l: d.low, c:d.close, v:d.volume}))),
        });
        setPrediction(result);
        addLog(`AI Prediction: ${result.prediction} (Confidence: ${(result.confidence * 100).toFixed(1)}%)`);
      } catch (error) {
         console.error("Prediction failed", error);
         toast({ title: "AI Prediction Failed", variant: "destructive" });
         addLog("Error: AI prediction failed.");
      }
    })
  }

  const handleBotToggle = () => {
    if (isBotRunning) {
        // Stop the bot
        setIsBotRunning(false);
        if (botIntervalRef.current) {
            clearInterval(botIntervalRef.current);
            botIntervalRef.current = null;
        }
        addLog("Bot stopped by user.");
    } else {
        // Start the bot
        if (!isConnected) {
            toast({ title: "Cannot start bot", description: "Please connect to the API first.", variant: "destructive"});
            return;
        }
        setIsBotRunning(true);
        setBotLogs([]);
        setPrediction(null);
        addLog(`Bot started for ${symbol} with ${selectedStrategy} at ${leverage}x leverage.`);
        
        // Initial prediction
        runPrediction();

        // Set interval for subsequent actions
        botIntervalRef.current = setInterval(() => {
            addLog("Running cycle: Fetching new data and making prediction...");
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
            <div className="grid grid-cols-3 gap-4">
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
                  <Label htmlFor="leverage">Leverage (x)</Label>
                  <Input
                    id="leverage"
                    type="number"
                    min="1"
                    value={leverage}
                    onChange={(e) => setLeverage(parseInt(e.target.value, 10) || 1)}
                    placeholder="10"
                    disabled={!isConnected || isBotRunning}
                  />
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
                 <CardDescription>AI-powered forecast of the next market movement.</CardDescription>
            </CardHeader>
            <CardContent>
                {isPredicting ? (
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
