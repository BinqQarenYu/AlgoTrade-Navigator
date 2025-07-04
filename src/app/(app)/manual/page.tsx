
"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { TradingChart } from "@/components/trading-chart"
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
import { Terminal, Loader2, ClipboardCheck, Wand2, Activity, RotateCcw, Bot } from "lucide-react"
import type { HistoricalData } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { topAssets, getAvailableQuotesForBase } from "@/lib/assets"
import { strategies } from "@/lib/strategies"

export default function ManualTradingPage() {
  const { isConnected } = useApi();
  const { 
    manualTraderState,
    runManualAnalysis,
    cancelManualAnalysis,
    resetManualSignal,
    setManualChartData,
    isTradingActive
  } = useBot();

  const { isAnalyzing, logs, signal, chartData } = manualTraderState;
  
  // Local state for UI configuration
  const [baseAsset, setBaseAsset] = useState<string>("BTC");
  const [quoteAsset, setQuoteAsset] = useState<string>("USDT");
  const [availableQuotes, setAvailableQuotes] = useState<string[]>([]);
  const symbol = useMemo(() => `${baseAsset}${quoteAsset}`, [baseAsset, quoteAsset]);
  
  const [selectedStrategy, setSelectedStrategy] = useState<string>("peak-formation-fib");
  const [interval, setInterval] = useState<string>("1h");
  const [initialCapital, setInitialCapital] = useState<number>(100);
  const [leverage, setLeverage] = useState<number>(10);
  const [takeProfit, setTakeProfit] = useState<number>(2);
  const [stopLoss, setStopLoss] = useState<number>(1);
  const [fee, setFee] = useState<number>(0.04);
  const [useAIPrediction, setUseAIPrediction] = useState(false);
  
  useEffect(() => {
    const quotes = getAvailableQuotesForBase(baseAsset);
    setAvailableQuotes(quotes);
    if (!quotes.includes(quoteAsset)) {
      setQuoteAsset(quotes[0] || '');
    }
  }, [baseAsset, quoteAsset]);

  const handleRunAnalysis = useCallback(() => {
    runManualAnalysis({
        symbol,
        interval,
        strategy: selectedStrategy,
        initialCapital,
        leverage,
        takeProfit,
        stopLoss,
        useAIPrediction,
        fee
    });
  }, [runManualAnalysis, symbol, interval, selectedStrategy, initialCapital, leverage, takeProfit, stopLoss, useAIPrediction, fee]);

  const handleCancelAnalysis = useCallback(() => {
    cancelManualAnalysis();
  }, [cancelManualAnalysis]);

  const handleResetSignal = useCallback(() => {
    resetManualSignal();
  }, [resetManualSignal]);

  const handleIntervalChange = (newInterval: string) => {
    setInterval(newInterval);
  };

  const handleBaseAssetChange = (newBase: string) => {
    setBaseAsset(newBase);
  };
  
  const handleQuoteAssetChange = (newQuote: string) => {
    setQuoteAsset(newQuote);
  };

  useEffect(() => {
    if (isConnected && !manualTraderState.isAnalyzing && manualTraderState.signal === null && symbol) {
      setManualChartData(symbol, interval);
    }
  }, [isConnected, symbol, interval, setManualChartData, manualTraderState.isAnalyzing, manualTraderState.signal]);


  const hasActiveSignal = signal !== null;

  // Derived state for signal card
  const positionValue = initialCapital * leverage;
  let tradeQuantity = 0;
  let entryFee = 0;
  let exitFee = 0;
  let totalFee = 0;
  let grossPnl = 0;
  let netPnl = 0;

  if (signal) {
    tradeQuantity = positionValue / signal.entryPrice;
    entryFee = signal.entryPrice * tradeQuantity * (fee / 100);
    exitFee = signal.takeProfit * tradeQuantity * (fee / 100);
    totalFee = entryFee + exitFee;
    if (signal.action === 'UP') {
        grossPnl = (signal.takeProfit - signal.entryPrice) * tradeQuantity;
    } else {
        grossPnl = (signal.entryPrice - signal.takeProfit) * tradeQuantity;
    }
    netPnl = grossPnl - totalFee;
  }
  
  const isThisPageTrading = isAnalyzing || hasActiveSignal;

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
     {isTradingActive && !isThisPageTrading && (
        <Alert variant="default" className="mb-4 bg-primary/10 border-primary/20 text-primary">
            <Bot className="h-4 w-4" />
            <AlertTitle>Another Trading Session is Active</AlertTitle>
            <AlertDescription>
                Manual trading is disabled to prioritize another active trading session. Check the <Link href="/live" className="font-bold underline">Live Bot</Link> or <Link href="/multi-signal" className="font-bold underline">Multi-Signal</Link> page.
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
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base-asset">Base Asset</Label>
                  <Select onValueChange={handleBaseAssetChange} value={baseAsset} disabled={isAnalyzing || hasActiveSignal}>
                    <SelectTrigger id="base-asset"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {topAssets.map(asset => (
                        <SelectItem key={asset.ticker} value={asset.ticker}>{asset.ticker} - {asset.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="quote-asset">Quote Asset</Label>
                  <Select onValueChange={handleQuoteAssetChange} value={quoteAsset} disabled={isAnalyzing || hasActiveSignal || availableQuotes.length === 0}>
                    <SelectTrigger id="quote-asset"><SelectValue /></SelectTrigger>
                    <SelectContent>
                       {availableQuotes.map(asset => (
                        <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Interval</Label>
                  <Select onValueChange={handleIntervalChange} value={interval} disabled={isAnalyzing || hasActiveSignal}>
                    <SelectTrigger id="interval"><SelectValue /></SelectTrigger>
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
                <div className="space-y-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={isAnalyzing || hasActiveSignal}>
                    <SelectTrigger id="strategy"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {strategies.map(strategy => (
                        <SelectItem key={strategy.id} value={strategy.id}>{strategy.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
            </div>
             <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="initial-capital">Capital ($)</Label>
                    <Input 
                        id="initial-capital" 
                        type="number" 
                        value={initialCapital}
                        onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)}
                        placeholder="100"
                        disabled={isAnalyzing || hasActiveSignal}
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
                    disabled={isAnalyzing || hasActiveSignal}
                  />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="fee">Fee (%)</Label>
                    <Input 
                        id="fee" 
                        type="number" 
                        value={fee}
                        onChange={(e) => setFee(parseFloat(e.target.value) || 0)}
                        placeholder="0.04"
                        disabled={isAnalyzing || hasActiveSignal}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="take-profit">Take Profit (%)</Label>
                    <Input 
                        id="take-profit" 
                        type="number" 
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                        placeholder="2"
                        disabled={isAnalyzing || hasActiveSignal}
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
                        disabled={isAnalyzing || hasActiveSignal}
                    />
                </div>
            </div>
            <div className="space-y-2">
              <Label>AI-Powered Analysis</Label>
              <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                <Switch id="ai-prediction" checked={useAIPrediction} onCheckedChange={setUseAIPrediction} disabled={isAnalyzing || hasActiveSignal} />
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
                onClick={
                    isAnalyzing ? handleCancelAnalysis :
                    hasActiveSignal ? handleResetSignal : 
                    handleRunAnalysis
                }
                disabled={!isConnected || (isTradingActive && !isThisPageTrading)}
                variant={isAnalyzing || hasActiveSignal ? "destructive" : "default"}
            >
                {isAnalyzing ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancel Analysis
                    </>
                ) : hasActiveSignal ? (
                     <>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset Signal
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
                        <div className="grid gap-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Entry Price (approx.)</span>
                                <span className="font-mono">${signal.entryPrice.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Stop Loss</span>
                                <span className="font-mono text-red-500">${signal.stopLoss.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Take Profit</span>
                                <span className="font-mono text-green-500">${signal.takeProfit.toFixed(4)}</span>
                            </div>
                        </div>
                        <Separator/>
                        <div className="grid gap-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Est. Position Value</span>
                                <span className="font-mono">${positionValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Est. Total Fee</span>
                                <span className="font-mono">${totalFee.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Net PNL at TP</span>
                                <span className="font-mono font-semibold text-green-500">${netPnl.toFixed(4)}</span>
                            </div>
                        </div>
                        
                        <Separator />
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">{useAIPrediction ? "AI Analysis" : "Signal Rationale"}</h4>
                            {useAIPrediction && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Confidence</span>
                                    <span className="font-mono font-semibold">{(signal.confidence * 100).toFixed(1)}%</span>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground pt-1">{signal.reasoning}</p>
                        </div>
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
