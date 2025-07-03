
"use client"

import React, { useState, useEffect, useCallback } from "react"
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
import { Terminal, Loader2, ClipboardCheck, Wand2, Activity } from "lucide-react"
import type { HistoricalData } from "@/lib/types"
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
  const { isConnected } = useApi();
  const { 
    manualTraderState,
    runManualAnalysis,
    cancelManualAnalysis,
    setManualChartData
  } = useBot();

  const { isAnalyzing, logs, signal, chartData } = manualTraderState;
  
  // Local state for UI configuration
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [selectedStrategy, setSelectedStrategy] = useState<string>("peak-formation-fib");
  const [interval, setInterval] = useState<string>("1m");
  const [takeProfit, setTakeProfit] = useState<number>(2);
  const [stopLoss, setStopLoss] = useState<number>(1);
  const [useAIPrediction, setUseAIPrediction] = useState(true);

  const handleRunAnalysis = () => {
    runManualAnalysis({
        symbol,
        interval,
        strategy: selectedStrategy,
        takeProfit,
        stopLoss,
        useAIPrediction,
    });
  };

  const handleCancelAnalysis = () => {
    cancelManualAnalysis();
  }

  const handleIntervalChange = useCallback((newInterval: string) => {
    setInterval(newInterval);
    // When interval changes, we might want to refetch data if not monitoring
    if (signal === null) {
      setManualChartData(symbol, newInterval, true);
    }
  }, [setManualChartData, signal, symbol]);

  const handleSymbolChange = useCallback((newSymbol: string) => {
    setSymbol(newSymbol);
    if (signal === null) {
      setManualChartData(newSymbol, interval, true);
    }
  }, [interval, setManualChartData, signal]);

  // Initial data fetch and when dependencies change while not monitoring
  useEffect(() => {
    if (isConnected && signal === null) {
        setManualChartData(symbol, interval, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, symbol, interval]);


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
        <TradingChart 
            data={chartData} 
            symbol={symbol} 
            interval={interval} 
            tradeSignal={signal} 
            onIntervalChange={handleIntervalChange} />
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
                  <Select onValueChange={handleSymbolChange} value={symbol} disabled={isAnalyzing || signal !== null}>
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
                  <Select onValueChange={handleIntervalChange} value={interval} disabled={isAnalyzing || signal !== null}>
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
                  <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={isAnalyzing || signal !== null}>
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
                        disabled={isAnalyzing || signal !== null}
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
                        disabled={isAnalyzing || signal !== null}
                    />
                </div>
            </div>
            <div className="space-y-2">
              <Label>AI-Powered Analysis</Label>
              <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                <Switch id="ai-prediction" checked={useAIPrediction} onCheckedChange={setUseAIPrediction} disabled={isAnalyzing || signal !== null} />
                <div className="flex flex-col">
                    <Label htmlFor="ai-prediction">Enable AI Validation</Label>
                    <p className="text-xs text-muted-foreground">Let an AI validate the strategy's signal before providing a recommendation.</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
                className="w-full"
                onClick={isAnalyzing ? handleCancelAnalysis : handleRunAnalysis}
                disabled={!isAnalyzing && (!isConnected || signal !== null)}
                variant={isAnalyzing ? "destructive" : "default"}
            >
                {isAnalyzing ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancel Analysis
                    </>
                ) : (
                    <>
                        <Wand2 className="mr-2 h-4 w-4" />
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
                    {signal ? `Signal for ${symbol} generated at ${signal.timestamp.toLocaleTimeString()}` : "Signals will appear here after analysis."}
                </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[240px]">
                {isAnalyzing ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        <span>Searching for a trade setup...</span>
                    </div>
                ) : signal ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Recommended Action</span>
                            <Badge variant={signal.action === 'UP' ? 'default' : 'destructive'} className="text-base px-4 py-1">
                                {signal.action === 'UP' ? 'BUY / LONG' : 'SELL / SHORT'}
                            </Badge>
                        </div>
                        <Separator/>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Entry Price (approx.)</span>
                            <span className="font-mono text-base">${signal.entryPrice.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Stop Loss Target</span>
                            <span className="font-mono text-base text-red-500">${signal.stopLoss.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Take Profit Target</span>
                            <span className="font-mono text-base text-green-500">${signal.takeProfit.toFixed(4)}</span>
                        </div>
                        {useAIPrediction && (
                            <>
                                <Separator />
                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium">AI Analysis</h4>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Confidence</span>
                                        <span className="font-semibold">{(signal.confidence * 100).toFixed(1)}%</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground pt-1">{signal.reasoning}</p>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                     <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                         <p>Click "Analyze for Signal" to get a recommendation.</p>
                    </div>
                )}
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity/> Analysis Logs</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="bg-muted/50 p-3 rounded-md h-48 overflow-y-auto">
                    {logs.length > 0 ? (
                        <pre className="text-xs whitespace-pre-wrap font-mono">
                            {logs.join('\n')}
                        </pre>
                    ) : (
                         <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>Logs from the analysis will appear here.</p>
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
