
"use client"

import React, { useState, useEffect, useRef } from "react"
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
import { Terminal, Loader2, ClipboardCheck, Play, StopCircle, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { addDays } from "date-fns"
import type { HistoricalData, TradeSignal } from "@/lib/types"
import { predictMarket, type PredictMarketOutput } from "@/ai/flows/predict-market-flow"
import { calculateEMA, calculateRSI, calculateSMA } from "@/lib/indicators"
import { calculatePeakFormationFibSignals } from "@/lib/strategies/peak-formation-fib"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

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

export default function ManualTradingPage() {
  const { toast } = useToast()
  const { isConnected } = useApi();
  const [isClient, setIsClient] = useState(false)
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [chartData, setChartData] = useState<HistoricalData[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>("sma-crossover");
  const [interval, setInterval] = useState<string>("1m");
  
  const [takeProfit, setTakeProfit] = useState<number>(2);
  const [stopLoss, setStopLoss] = useState<number>(1);
  const [useAIPrediction, setUseAIPrediction] = useState(true);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tradeSignal, setTradeSignal] = useState<TradeSignal | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true)
  }, [])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 100));
  }

  const fetchInitialData = async () => {
    if (!isConnected) return;
    setIsFetchingData(true);
    addLog(`Fetching initial ${interval} data for ${symbol}...`);
    try {
        const from = addDays(new Date(), -1).getTime(); // Fetch last day for context
        const to = new Date().getTime();
        const klines = await getHistoricalKlines(symbol, interval, from, to);
        setChartData(klines);
        addLog(`Successfully loaded ${klines.length} historical candles.`);
    } catch (error: any) {
        handleFetchError(error);
    } finally {
        setIsFetchingData(false);
    }
  };
  
  const handleFetchError = (error: any) => {
      console.error("Failed to fetch historical data:", error);
      toast({
          title: "Failed to Load Data",
          description: error.message || "Could not retrieve historical data from Binance.",
          variant: "destructive"
      });
      addLog(`Error fetching data: ${error.message}`);
      setChartData([]);
  }

  useEffect(() => {
    if (!isClient || !isConnected) {
        setChartData([]);
        return;
    }
    fetchInitialData();
    setTradeSignal(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval, isConnected, isClient]);


  const runAnalysisCycle = async (currentData: HistoricalData[]) => {
    addLog("Running analysis cycle...");
    if (currentData.length < 50) {
      addLog("Not enough data to analyze. Waiting...");
      return;
    }

    const latestCandle = currentData[currentData.length - 1];

    if (tradeSignal) {
        if (tradeSignal.action === 'UP' && latestCandle.low <= tradeSignal.stopLoss) {
            addLog(`ALERT: Stop Loss triggered at $${tradeSignal.stopLoss.toFixed(4)}. Trade setup invalidated.`);
            toast({ title: "Trade Invalidated", description: "The Stop Loss level was breached.", variant: "destructive" });
            setTradeSignal(null); return;
        }
        if (tradeSignal.action === 'DOWN' && latestCandle.high >= tradeSignal.stopLoss) {
             addLog(`ALERT: Stop Loss triggered at $${tradeSignal.stopLoss.toFixed(4)}. Trade setup invalidated.`);
             toast({ title: "Trade Invalidated", description: "The Stop Loss level was breached.", variant: "destructive" });
             setTradeSignal(null); return;
        }
        if (tradeSignal.action === 'UP' && latestCandle.high >= tradeSignal.takeProfit) {
            addLog(`INFO: Take Profit level reached at $${tradeSignal.takeProfit.toFixed(4)}. Consider closing position.`);
            toast({ title: "Target Reached", description: "The Take Profit level was hit." });
            setTradeSignal(null); return;
        }
        if (tradeSignal.action === 'DOWN' && latestCandle.low <= tradeSignal.takeProfit) {
             addLog(`INFO: Take Profit level reached at $${tradeSignal.takeProfit.toFixed(4)}. Consider closing position.`);
             toast({ title: "Target Reached", description: "The Take Profit level was hit." });
             setTradeSignal(null); return;
        }
        addLog("Signal active. Monitoring SL/TP levels...");
        return;
    }

    addLog("No active signal. Searching for a new setup...");
    let strategySignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    const closePrices = currentData.map(d => d.close);
    switch (selectedStrategy) { /* Strategy logic remains the same */ }

    if (strategySignal === 'HOLD') {
        addLog("No signal generated by the strategy.");
        return;
    }
    
    addLog(`Strategy '${selectedStrategy}' generated a ${strategySignal} signal. Validating with AI...`);
    try {
        const prediction = useAIPrediction ? await predictMarket({
            symbol,
            recentData: JSON.stringify(currentData.slice(-50).map(d => ({t: d.time, o: d.open, h: d.high, l: d.low, c:d.close, v:d.volume}))),
            strategySignal
        }) : {
             prediction: strategySignal === 'BUY' ? 'UP' : 'DOWN',
             confidence: 1,
             reasoning: `Signal generated directly from the '${selectedStrategy}' strategy without AI validation.`
         };
      
        const aiConfirms = (prediction.prediction === 'UP' && strategySignal === 'BUY') || (prediction.prediction === 'DOWN' && strategySignal === 'SELL');
        
        if (aiConfirms) {
            const currentPrice = currentData[currentData.length - 1].close;
            const stopLossPrice = prediction.prediction === 'UP' ? currentPrice * (1 - (stopLoss / 100)) : currentPrice * (1 + (stopLoss / 100));
            const takeProfitPrice = prediction.prediction === 'UP' ? currentPrice * (1 + (takeProfit / 100)) : currentPrice * (1 - (takeProfit / 100));

            const newSignal: TradeSignal = {
                action: prediction.prediction, entryPrice: currentPrice,
                stopLoss: stopLossPrice, takeProfit: takeProfitPrice,
                confidence: prediction.confidence, reasoning: prediction.reasoning,
                timestamp: new Date(), strategy: selectedStrategy
            };
            setTradeSignal(newSignal);
            addLog(`NEW SIGNAL: ${newSignal.action} at $${newSignal.entryPrice.toFixed(4)}. SL: $${newSignal.stopLoss.toFixed(4)}, TP: $${newSignal.takeProfit.toFixed(4)}`);
            toast({ title: "Trade Signal Generated!", description: "Review the signal details. Now actively monitoring." });
        } else {
            addLog(`AI invalidated signal. Strategy said ${strategySignal}, AI said ${prediction.prediction}. No trade.`);
            toast({ title: "Signal Invalidated by AI", description: `The AI suggested ${prediction.prediction} against the strategy's ${strategySignal} signal.`, variant: "destructive" });
        }
    } catch (error) {
       console.error("Analysis failed", error);
       addLog(`Error: AI analysis failed.`);
       toast({ title: "AI Analysis Failed", variant: "destructive" });
    }
  }

  const requestWakeLock = async () => { /* Remains the same */ };
  const releaseWakeLock = async () => { /* Remains the same */ };

  const handleToggleAnalysis = async () => {
    if (isAnalyzing) {
        setIsAnalyzing(false);
    } else {
        if (!isConnected) {
            toast({ title: "Cannot start", description: "Please connect to the API first.", variant: "destructive"});
            return;
        }
        setIsAnalyzing(true);
        setLogs([]);
        setTradeSignal(null);
        addLog(`Continuous analysis started for ${symbol} on ${interval}.`);
        await requestWakeLock();
    }
  }

  // Effect to manage WebSocket connection
  useEffect(() => {
    if (isAnalyzing && isConnected) {
      addLog("Connecting to WebSocket stream...");
      wsRef.current = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`);

      wsRef.current.onopen = () => addLog("WebSocket connection established.");
      wsRef.current.onerror = (err) => {
          console.error("WebSocket Error:", err);
          addLog("WebSocket error. Connection lost.");
      };
      wsRef.current.onclose = () => {
        addLog("WebSocket connection closed.");
        // If analysis is still supposed to be running, try to reconnect? For now, just log.
        if (isAnalyzing) {
             setIsAnalyzing(false);
             addLog("Analysis stopped due to connection closure.");
        }
      };

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.e === 'kline') {
          const kline = message.k;
          const newCandle: HistoricalData = {
            time: kline.t, open: parseFloat(kline.o), high: parseFloat(kline.h),
            low: parseFloat(kline.l), close: parseFloat(kline.c), volume: parseFloat(kline.v),
          };

          setChartData(prevData => {
            const newData = [...prevData];
            const lastCandle = newData[newData.length - 1];

            if (lastCandle && lastCandle.time === newCandle.time) {
              // Update the last candle
              newData[newData.length - 1] = newCandle;
            } else {
              // Append a new candle
              newData.push(newCandle);
            }
            
            // Only run analysis when a candle closes
            if (kline.x) {
                runAnalysisCycle(newData);
            }

            return newData;
          });
        }
      };
      
      return () => {
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        releaseWakeLock();
      };
    } else {
         if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnalyzing, isConnected, symbol, interval]);

  return (
    <div className="flex flex-col h-full">
    {!isConnected && (
        <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>API Disconnected</AlertTitle>
            <AlertDescription>
                Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> to load market data.
            </AlertDescription>
        </Alert>
    )}
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 flex flex-col h-[600px]">
        <TradingChart data={chartData} symbol={symbol} interval={interval} tradeSignal={tradeSignal} onIntervalChange={setInterval} />
      </div>
      <div className="xl:col-span-2 space-y-6">
        <Card>
          <CardHeader>
             <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2"><ClipboardCheck/> Manual Signal Generator</div>
            </CardTitle>
            <CardDescription>Configure and generate a trade signal for manual execution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Asset</Label>
                  <Select onValueChange={setSymbol} value={symbol} disabled={isAnalyzing}>
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
                  <Label htmlFor="interval">Interval</Label>
                  <Select onValueChange={setInterval} value={interval} disabled={isAnalyzing}>
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
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={isAnalyzing}>
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
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="take-profit">Take Profit (%)</Label>
                    <Input 
                        id="take-profit" 
                        type="number" 
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                        placeholder="2"
                        disabled={isAnalyzing}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="stop-loss">Stop Loss (%)</Label>
                    <Input 
                        id="stop-loss" 
                        type="number" 
                        value={stopLoss}
                        onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                        placeholder="1"
                        disabled={isAnalyzing}
                    />
                </div>
            </div>
            <div className="space-y-2">
              <Label>AI-Powered Analysis</Label>
              <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                <Switch id="ai-prediction" checked={useAIPrediction} onCheckedChange={setUseAIPrediction} disabled={isAnalyzing} />
                <div className="flex flex-col">
                    <Label htmlFor="ai-prediction">Enable AI Validation</Label>
                    <p className="text-xs text-muted-foreground">Let an AI validate the strategy's signal before providing a recommendation.</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleToggleAnalysis} disabled={isFetchingData || !isConnected} variant={isAnalyzing ? "destructive" : "default"}>
                {isFetchingData ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isAnalyzing ? (
                    <StopCircle />
                ) : (
                    <Play/>
                )}
                {isFetchingData ? "Loading History..." : isAnalyzing ? "Stop Analysis" : "Start Analysis"}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Trade Signal</CardTitle>
                 <CardDescription>
                    {tradeSignal ? `Signal for ${symbol} generated at ${tradeSignal.timestamp.toLocaleTimeString()}` : "Signals will appear here after analysis."}
                </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[240px]">
                {!isAnalyzing && !tradeSignal ? (
                     <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                         <p>Start the analysis to get a recommendation.</p>
                    </div>
                ) : tradeSignal ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Recommended Action</span>
                            <Badge variant={tradeSignal.action === 'UP' ? 'default' : 'destructive'} className="text-base px-4 py-1">
                                {tradeSignal.action === 'UP' ? 'BUY / LONG' : 'SELL / SHORT'}
                            </Badge>
                        </div>
                        <Separator/>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Entry Price (approx.)</span>
                            <span className="font-mono text-base">${tradeSignal.entryPrice.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Stop Loss Target</span>
                            <span className="font-mono text-base text-red-500">${tradeSignal.stopLoss.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Take Profit Target</span>
                            <span className="font-mono text-base text-green-500">${tradeSignal.takeProfit.toFixed(4)}</span>
                        </div>
                        {useAIPrediction && (
                            <>
                                <Separator />
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium">AI Analysis</h4>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Confidence</span>
                                        <span className="font-semibold">{(tradeSignal.confidence * 100).toFixed(1)}%</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground pt-1">{tradeSignal.reasoning}</p>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                         <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        <span>Waiting for next candle close...</span>
                    </div>
                )}
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity/> Analysis Logs</CardTitle>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                    Status: 
                    <span className={cn(
                        "font-semibold",
                        isAnalyzing ? "text-green-500" : "text-red-500"
                    )}>
                        {isAnalyzing ? "Running" : "Idle"}
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
                            <p>Logs will appear here when analysis is running.</p>
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

    