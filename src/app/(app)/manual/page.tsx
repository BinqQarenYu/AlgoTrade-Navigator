
"use client"

import React, { useState, useEffect, useTransition } from "react"
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
import { Terminal, Bot, Loader2, BrainCircuit, ClipboardCheck } from "lucide-react"
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
  const [interval, setInterval] = useState<string>("15m");
  
  const [takeProfit, setTakeProfit] = useState<number>(2);
  const [stopLoss, setStopLoss] = useState<number>(1);
  const [useAIPrediction, setUseAIPrediction] = useState(true);

  const [isAnalyzing, startTransition] = useTransition();
  const [tradeSignal, setTradeSignal] = useState<TradeSignal | null>(null);

  useEffect(() => {
    setIsClient(true)
  }, [])
  
  useEffect(() => {
    if (!isClient || !isConnected) {
        setChartData([]);
        return;
    }

    const fetchData = async () => {
        setIsFetchingData(true);
        setTradeSignal(null);
        toast({ title: "Fetching Market Data...", description: `Loading ${interval} data for ${symbol}.`});
        try {
            const from = addDays(new Date(), -3).getTime();
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
  }, [symbol, interval, isConnected, isClient, toast]);

  const handleGetSignal = async () => {
    if (chartData.length < 50) {
        toast({ title: "Not enough data", description: "Waiting for more market data to accumulate.", variant: "destructive" });
        return;
    }
    
    setTradeSignal(null);
    
    let strategySignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    const closePrices = chartData.map(d => d.close);

    switch (selectedStrategy) {
        case 'sma-crossover': {
            const shortPeriod = 20; const longPeriod = 50;
            const sma_short = calculateSMA(closePrices, shortPeriod); const sma_long = calculateSMA(closePrices, longPeriod);
            const last_sma_short = sma_short[sma_short.length - 1]; const prev_sma_short = sma_short[sma_short.length - 2];
            const last_sma_long = sma_long[sma_long.length - 1]; const prev_sma_long = sma_long[sma_long.length - 2];
            if (prev_sma_short && prev_sma_long && last_sma_short && last_sma_long) {
                if (prev_sma_short <= prev_sma_long && last_sma_short > last_sma_long) strategySignal = 'BUY';
                else if (prev_sma_short >= prev_sma_long && last_sma_short < last_sma_long) strategySignal = 'SELL';
            }
            break;
        }
        case 'ema-crossover': {
            const shortPeriod = 12; const longPeriod = 26;
            const ema_short = calculateEMA(closePrices, shortPeriod); const ema_long = calculateEMA(closePrices, longPeriod);
            const last_ema_short = ema_short[ema_short.length - 1]; const prev_ema_short = ema_short[ema_short.length - 2];
            const last_ema_long = ema_long[ema_long.length - 1]; const prev_ema_long = ema_long[ema_long.length - 2];
            if (prev_ema_short && prev_ema_long && last_ema_short && last_ema_long) {
                if (prev_ema_short <= prev_ema_long && last_ema_short > last_ema_long) strategySignal = 'BUY';
                else if (prev_ema_short >= prev_ema_long && last_ema_short < last_ema_long) strategySignal = 'SELL';
            }
            break;
        }
        case 'rsi-divergence': {
            const period = 14; const rsi = calculateRSI(closePrices, period);
            const last_rsi = rsi[rsi.length - 1]; const prev_rsi = rsi[rsi.length - 2];
            const oversold = 30; const overbought = 70;
            if (prev_rsi && last_rsi) {
                if (prev_rsi <= oversold && last_rsi > oversold) strategySignal = 'BUY';
                else if (prev_rsi >= overbought && last_rsi < overbought) strategySignal = 'SELL';
            }
            break;
        }
        case 'peak-formation-fib': {
            const dataWithSignals = await calculatePeakFormationFibSignals(chartData);
            const lastSignal = dataWithSignals.slice(-5).find(d => d.buySignal || d.sellSignal);
            if (lastSignal?.buySignal) strategySignal = 'BUY';
            else if (lastSignal?.sellSignal) strategySignal = 'SELL';
            break;
        }
    }
    
    if (strategySignal === 'HOLD') {
        toast({ title: "No Signal Generated", description: "The selected strategy found no trading opportunities on the latest data." });
        return;
    }
    
    let prediction: PredictMarketOutput;

    startTransition(async () => {
        try {
            if (useAIPrediction) {
                toast({ title: "Analyzing Signal...", description: `Asking AI to validate the ${strategySignal} signal from ${selectedStrategy}.`});
                const recentData = chartData.slice(-50);
                prediction = await predictMarket({
                    symbol,
                    recentData: JSON.stringify(recentData.map(d => ({t: d.time, o: d.open, h: d.high, l: d.low, c:d.close, v:d.volume}))),
                    strategySignal
                });
            } else {
                 prediction = {
                    prediction: strategySignal === 'BUY' ? 'UP' : 'DOWN',
                    confidence: 1,
                    reasoning: `Signal generated directly from the '${selectedStrategy}' strategy without AI validation.`
                };
            }
          
            const aiConfirms = (prediction.prediction === 'UP' && strategySignal === 'BUY') || (prediction.prediction === 'DOWN' && strategySignal === 'SELL');
            
            if (aiConfirms) {
                const currentPrice = chartData[chartData.length - 1].close;
                const stopLossPrice = prediction.prediction === 'UP' ? currentPrice * (1 - (stopLoss / 100)) : currentPrice * (1 + (stopLoss / 100));
                const takeProfitPrice = prediction.prediction === 'UP' ? currentPrice * (1 + (takeProfit / 100)) : currentPrice * (1 - (takeProfit / 100));

                setTradeSignal({
                    action: prediction.prediction,
                    entryPrice: currentPrice,
                    stopLoss: stopLossPrice,
                    takeProfit: takeProfitPrice,
                    confidence: prediction.confidence,
                    reasoning: prediction.reasoning,
                    timestamp: new Date(),
                    strategy: selectedStrategy
                });
                 toast({ title: "Trade Signal Generated!", description: "Review the signal details in the card below." });
            } else {
                toast({ title: "Signal Invalidated by AI", description: `The AI suggested ${prediction.prediction} against the strategy's ${strategySignal} signal. No trade advised.`, variant: "destructive" });
            }

        } catch (error) {
           console.error("Analysis failed", error);
           toast({ title: "AI Analysis Failed", description: "Could not get a response from the AI. Please try again.", variant: "destructive" });
        }
    });
  }

  const anyLoading = isFetchingData || isAnalyzing;

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
                  <Select onValueChange={setSymbol} value={symbol} disabled={anyLoading}>
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
                  <Select onValueChange={setInterval} value={interval} disabled={anyLoading}>
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
                  <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={anyLoading}>
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
                        disabled={anyLoading}
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
                        disabled={anyLoading}
                    />
                </div>
            </div>
            <div className="space-y-2">
              <Label>AI-Powered Analysis</Label>
              <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                <Switch id="ai-prediction" checked={useAIPrediction} onCheckedChange={setUseAIPrediction} disabled={anyLoading} />
                <div className="flex flex-col">
                    <Label htmlFor="ai-prediction">Enable AI Validation</Label>
                    <p className="text-xs text-muted-foreground">Let an AI validate the strategy's signal before providing a recommendation.</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleGetSignal} disabled={anyLoading || !isConnected || chartData.length === 0}>
                {anyLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isAnalyzing ? "Analyzing..." : "Fetching Data..."}
                    </>
                ) : (
                    <>
                        <BrainCircuit/>
                        Analyze for Signal
                    </>
                )}
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
                {isAnalyzing ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        <span>{useAIPrediction ? "AI is analyzing..." : "Generating signal..."}</span>
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
                    <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                         <p>Click "Analyze for Signal" to get the latest recommendation.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
    </div>
  )
}
