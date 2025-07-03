
"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { TradingChart } from "@/components/trading-chart"
import { PineScriptEditor } from "@/components/pine-script-editor"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CalendarIcon, Loader2, Terminal, Bot } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format, addDays } from "date-fns"
import type { HistoricalData, BacktestResult, BacktestSummary, TradeSignal } from "@/lib/types"
import { calculateSMA, calculateEMA, calculateRSI } from "@/lib/indicators";
import { calculatePeakFormationFibSignals } from "@/lib/strategies/peak-formation-fib";
import { BacktestResults } from "@/components/backtest-results"
import { Switch } from "@/components/ui/switch"
import { predictMarket } from "@/ai/flows/predict-market-flow"
import { topAssetList } from "@/lib/assets"

interface DateRange {
  from?: Date;
  to?: Date;
}

export default function BacktestPage() {
  const { toast } = useToast()
  const { isConnected } = useApi();
  const { isTradingActive } = useBot();
  const [date, setDate] = useState<DateRange | undefined>()
  const [isClient, setIsClient] = useState(false)
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [chartData, setChartData] = useState<HistoricalData[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<string>("sma-crossover");
  const [interval, setInterval] = useState<string>("1h");
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [summaryStats, setSummaryStats] = useState<BacktestSummary | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<BacktestResult | null>(null);


  const [initialCapital, setInitialCapital] = useState<number>(100);
  const [leverage, setLeverage] = useState<number>(10);
  const [takeProfit, setTakeProfit] = useState<number>(5);
  const [stopLoss, setStopLoss] = useState<number>(2);
  const [fee, setFee] = useState<number>(0.04);
  const [useAIValidation, setUseAIValidation] = useState(false);
  const [maxAiValidations, setMaxAiValidations] = useState<number>(20);


  useEffect(() => {
    setIsClient(true)
    if (!date) {
        setDate({
            from: addDays(new Date(), -7),
            to: new Date(),
        })
    }
  }, [date])
  
  useEffect(() => {
    if (!isClient || isTradingActive) return;

    const fetchData = async () => {
        if (!isConnected || !date?.from || !date?.to) {
            setChartData([]);
            return;
        }
        setIsFetchingData(true);
        setChartData([]);
        setBacktestResults([]);
        setSummaryStats(null);
        setSelectedTrade(null);
        toast({ title: "Fetching Market Data...", description: `Loading ${interval} data for ${symbol}.`});
        try {
            const klines = await getHistoricalKlines(symbol, interval, date.from.getTime(), date.to.getTime());
            setChartData(klines);
            toast({ title: "Data Loaded", description: `Market data for ${symbol} is ready for backtesting.` });
        } catch (error: any)
{
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
  }, [symbol, date, interval, isConnected, isClient, toast, isTradingActive]);

  const handleRunBacktest = async (strategyOverride?: string) => {
    if (chartData.length === 0) {
       toast({
        title: "No Data",
        description: "Cannot run backtest without market data. Please connect your API and select a date range.",
        variant: "destructive",
      });
      return;
    }

    const strategyToRun = strategyOverride || selectedStrategy;
    if (!strategyToRun) {
      toast({
        title: "No Strategy Selected",
        description: "Please select a strategy or load a script before running a backtest.",
        variant: "destructive",
      });
      return;
    }

    setIsBacktesting(true)
    setBacktestResults([]);
    setSummaryStats(null);
    setSelectedTrade(null);
    toast({
      title: useAIValidation ? "AI Backtest Started" : "Backtest Started",
      description: useAIValidation 
        ? "AI is validating each signal. This may take time."
        : `Running ${strategyToRun} on ${interval} interval.`,
    })

    const closePrices = chartData.map(d => d.close);
    
    let dataWithSignals: HistoricalData[] = chartData.map(d => {
      const { 
        buySignal, sellSignal, 
        sma_short, sma_long, 
        ema_short, ema_long, 
        rsi, 
        stopLossLevel,
        ...rest 
      } = d as any;
      return rest;
    });

    switch (strategyToRun) {
      case "sma-crossover": {
        const shortPeriod = 20;
        const longPeriod = 50;
        const sma_short = calculateSMA(closePrices, shortPeriod);
        const sma_long = calculateSMA(closePrices, longPeriod);
        
        dataWithSignals = dataWithSignals.map((d, i) => {
          const point: HistoricalData = { ...d, sma_short: sma_short[i], sma_long: sma_long[i] };
          if (i > 0 && sma_short[i-1] && sma_long[i-1] && sma_short[i] && sma_long[i]) {
            if (sma_short[i-1] <= sma_long[i-1] && sma_short[i] > sma_long[i]) {
              point.buySignal = d.low;
            }
            if (sma_short[i-1] >= sma_long[i-1] && sma_short[i] < sma_long[i]) {
              point.sellSignal = d.high;
            }
          }
          return point;
        });
        break;
      }
      case "ema-crossover": {
        const shortPeriod = 12;
        const longPeriod = 26;
        const ema_short = calculateEMA(closePrices, shortPeriod);
        const ema_long = calculateEMA(closePrices, longPeriod);
        
        dataWithSignals = dataWithSignals.map((d, i) => {
          const point: HistoricalData = { ...d, ema_short: ema_short[i], ema_long: ema_long[i] };
           if (i > 0 && ema_short[i-1] && ema_long[i-1] && ema_short[i] && ema_long[i]) {
            if (ema_short[i-1] <= ema_long[i-1] && ema_short[i] > ema_long[i]) {
              point.buySignal = d.low;
            }
            if (ema_short[i-1] >= ema_long[i-1] && ema_short[i] < ema_long[i]) {
              point.sellSignal = d.high;
            }
          }
          return point;
        });
        break;
      }
      case "rsi-divergence": {
        const period = 14;
        const rsi = calculateRSI(closePrices, period);
        const oversold = 30;
        const overbought = 70;

        dataWithSignals = dataWithSignals.map((d, i) => {
          const point: HistoricalData = { ...d, rsi: rsi[i] };
           if (i > 0 && rsi[i-1] && rsi[i]) {
            if (rsi[i-1] <= oversold && rsi[i] > oversold) {
              point.buySignal = d.low;
            }
            if (rsi[i-1] >= overbought && rsi[i] < overbought) {
              point.sellSignal = d.high;
            }
          }
          return point;
        });
        break;
      }
       case "peak-formation-fib": {
        dataWithSignals = await calculatePeakFormationFibSignals(dataWithSignals);
        break;
      }
    }

    const trades: BacktestResult[] = [];
    const marginPerTrade = initialCapital;
    let positionType: 'long' | 'short' | null = null;
    let entryPrice = 0;
    let entryTime = 0;
    let stopLossPrice = 0;
    let takeProfitPrice = 0;
    let tradeQuantity = 0;
    let aiValidationCount = 0;
    let aiLimitReachedNotified = false;
    
    for (let i = 1; i < dataWithSignals.length; i++) {
        const d = dataWithSignals[i];

        // --- POSITION MANAGEMENT ---
        if (positionType === 'long') {
            let exitPrice: number | null = null;
            let closeReason: BacktestResult['closeReason'] | null = null;

            if (d.low <= stopLossPrice) {
                exitPrice = stopLossPrice;
                closeReason = 'stop-loss';
            } else if (d.high >= takeProfitPrice) {
                exitPrice = takeProfitPrice;
                closeReason = 'take-profit';
            } else if (d.sellSignal) {
                let closePosition = true;
                if (useAIValidation) {
                    if (aiValidationCount < maxAiValidations) {
                        if (i > 50) {
                            try {
                                aiValidationCount++;
                                const recentData = chartData.slice(i - 50, i);
                                const prediction = await predictMarket({
                                    symbol,
                                    recentData: JSON.stringify(recentData.map(k => ({t: k.time, o: k.open, h: k.high, l: k.low, c:k.close, v:k.volume}))),
                                    strategySignal: 'SELL'
                                });
                                if (prediction.prediction !== 'DOWN') {
                                    closePosition = false;
                                }
                            } catch (e: any) {
                               console.error("AI validation failed for sell signal", e);
                               setTimeout(() => toast({ title: "AI Validation Failed", description: "The backtest has been stopped. It's likely you have exceeded your daily API quota.", variant: "destructive" }), 0);
                               setIsBacktesting(false);
                               return;
                            }
                        } else { closePosition = false; }
                    } else {
                        if (!aiLimitReachedNotified) {
                            toast({
                                title: "AI Validation Limit Reached",
                                description: `Max validations (${maxAiValidations}) reached. Continuing with classic strategy signals.`,
                            });
                            aiLimitReachedNotified = true;
                        }
                    }
                }
                if (closePosition) {
                    exitPrice = d.close;
                    closeReason = 'signal';
                }
            }

            if (exitPrice !== null && closeReason !== null) {
                const entryFee = entryPrice * tradeQuantity * (fee / 100);
                const exitFee = exitPrice * tradeQuantity * (fee / 100);
                const totalFee = entryFee + exitFee;
                const pnl = (exitPrice - entryPrice) * tradeQuantity - totalFee;
                const pnlPercent = (pnl / marginPerTrade) * 100;

                trades.push({
                    id: `trade_${trades.length}`,
                    type: 'long', 
                    entryTime, 
                    entryPrice, 
                    exitTime: d.time, 
                    exitPrice, 
                    pnl, 
                    pnlPercent, 
                    closeReason,
                    stopLoss: stopLossPrice,
                    takeProfit: takeProfitPrice,
                    fee: totalFee
                });
                positionType = null;
                entryPrice = 0;
                tradeQuantity = 0;
            }
        } else if (positionType === 'short') {
            let exitPrice: number | null = null;
            let closeReason: BacktestResult['closeReason'] | null = null;

            if (d.high >= stopLossPrice) {
                exitPrice = stopLossPrice;
                closeReason = 'stop-loss';
            } else if (d.low <= takeProfitPrice) {
                exitPrice = takeProfitPrice;
                closeReason = 'take-profit';
            } else if (d.buySignal) {
                let closePosition = true;
                if (useAIValidation) {
                    if (aiValidationCount < maxAiValidations) {
                        if (i > 50) {
                            try {
                                aiValidationCount++;
                                const recentData = chartData.slice(i - 50, i);
                                const prediction = await predictMarket({
                                    symbol,
                                    recentData: JSON.stringify(recentData.map(k => ({t: k.time, o: k.open, h: k.high, l: k.low, c:k.close, v:k.volume}))),
                                    strategySignal: 'BUY'
                                });
                                if (prediction.prediction !== 'UP') {
                                    closePosition = false;
                                }
                            } catch (e: any) {
                                console.error("AI validation failed for buy signal", e);
                                setTimeout(() => toast({ title: "AI Validation Failed", description: "The backtest has been stopped. It's likely you have exceeded your daily API quota.", variant: "destructive" }), 0);
                                setIsBacktesting(false);
                                return;
                            }
                        } else { closePosition = false; }
                    } else {
                        if (!aiLimitReachedNotified) {
                            toast({
                                title: "AI Validation Limit Reached",
                                description: `Max validations (${maxAiValidations}) reached. Continuing with classic strategy signals.`,
                            });
                            aiLimitReachedNotified = true;
                        }
                    }
                }
                if (closePosition) {
                    exitPrice = d.close;
                    closeReason = 'signal';
                }
            }

            if (exitPrice !== null && closeReason !== null) {
                const entryFee = entryPrice * tradeQuantity * (fee / 100);
                const exitFee = exitPrice * tradeQuantity * (fee / 100);
                const totalFee = entryFee + exitFee;
                const pnl = (entryPrice - exitPrice) * tradeQuantity - totalFee;
                const pnlPercent = (pnl / marginPerTrade) * 100;
                
                trades.push({
                    id: `trade_${trades.length}`,
                    type: 'short', 
                    entryTime, 
                    entryPrice, 
                    exitTime: d.time, 
                    exitPrice, 
                    pnl, 
                    pnlPercent, 
                    closeReason,
                    stopLoss: stopLossPrice,
                    takeProfit: takeProfitPrice,
                    fee: totalFee
                });
                positionType = null;
                entryPrice = 0;
                tradeQuantity = 0;
            }
        }

        // --- ENTRY LOGIC ---
        if (positionType === null) {
            if (d.buySignal) {
                let openPosition = true;
                if (useAIValidation) {
                    if (aiValidationCount < maxAiValidations) {
                        if (i > 50) {
                            try {
                                aiValidationCount++;
                                const recentData = chartData.slice(i - 50, i);
                                const prediction = await predictMarket({
                                    symbol,
                                    recentData: JSON.stringify(recentData.map(k => ({t: k.time, o: k.open, h: k.high, l: k.low, c:k.close, v:k.volume}))),
                                    strategySignal: 'BUY'
                                });
                                if (prediction.prediction !== 'UP') {
                                    openPosition = false;
                                }
                            } catch (e: any) {
                                console.error("AI validation failed for buy signal", e);
                                setTimeout(() => toast({ title: "AI Validation Failed", description: "The backtest has been stopped. It's likely you have exceeded your daily API quota.", variant: "destructive" }), 0);
                                setIsBacktesting(false);
                                return;
                            }
                        } else { openPosition = false; }
                    } else {
                         if (!aiLimitReachedNotified) {
                            toast({
                                title: "AI Validation Limit Reached",
                                description: `Max validations (${maxAiValidations}) reached. Continuing with classic strategy signals.`,
                            });
                            aiLimitReachedNotified = true;
                        }
                    }
                }
                if (openPosition) {
                    positionType = 'long';
                    entryPrice = d.close;
                    entryTime = d.time;
                    if (strategyToRun === 'peak-formation-fib' && d.stopLossLevel) {
                        stopLossPrice = d.stopLossLevel;
                    } else {
                        stopLossPrice = entryPrice * (1 - (stopLoss || 0) / 100);
                    }
                    takeProfitPrice = entryPrice * (1 + (takeProfit || 0) / 100);
                    const positionValue = marginPerTrade * (leverage || 1);
                    tradeQuantity = positionValue / entryPrice;
                }
            } else if (d.sellSignal) {
                let openPosition = true;
                if (useAIValidation) {
                    if (aiValidationCount < maxAiValidations) {
                        if (i > 50) {
                            try {
                                aiValidationCount++;
                                const recentData = chartData.slice(i - 50, i);
                                const prediction = await predictMarket({
                                    symbol,
                                    recentData: JSON.stringify(recentData.map(k => ({t: k.time, o: k.open, h: k.high, l: k.low, c:k.close, v:k.volume}))),
                                    strategySignal: 'SELL'
                                });
                                if (prediction.prediction !== 'DOWN') {
                                    openPosition = false;
                                }
                            } catch (e: any) {
                                console.error("AI validation failed for sell signal", e);
                                setTimeout(() => toast({ title: "AI Validation Failed", description: "The backtest has been stopped. It's likely you have exceeded your daily API quota.", variant: "destructive" }), 0);
                                setIsBacktesting(false);
                                return;
                            }
                        } else { openPosition = false; }
                    } else {
                         if (!aiLimitReachedNotified) {
                            toast({
                                title: "AI Validation Limit Reached",
                                description: `Max validations (${maxAiValidations}) reached. Continuing with classic strategy signals.`,
                            });
                            aiLimitReachedNotified = true;
                        }
                    }
                }
                if (openPosition) {
                    positionType = 'short';
                    entryPrice = d.close;
                    entryTime = d.time;
                    if (strategyToRun === 'peak-formation-fib' && d.stopLossLevel) {
                        stopLossPrice = d.stopLossLevel;
                    } else {
                        stopLossPrice = entryPrice * (1 + (stopLoss || 0) / 100);
                    }
                    takeProfitPrice = entryPrice * (1 - (takeProfit || 0) / 100);
                    const positionValue = marginPerTrade * (leverage || 1);
                    tradeQuantity = positionValue / entryPrice;
                }
            }
        }
    }
    
    // Close any open position at the end of the data
    if (positionType !== null && dataWithSignals.length > 0) {
        const lastDataPoint = dataWithSignals[dataWithSignals.length - 1];
        const exitPrice = lastDataPoint.close;
        const entryFee = entryPrice * tradeQuantity * (fee / 100);
        const exitFee = exitPrice * tradeQuantity * (fee / 100);
        const totalFee = entryFee + exitFee;
        let pnl;
        
        if (positionType === 'long') {
            pnl = (exitPrice - entryPrice) * tradeQuantity - totalFee;
        } else { // short
            pnl = (entryPrice - exitPrice) * tradeQuantity - totalFee;
        }

        const pnlPercent = (pnl / marginPerTrade) * 100;
        trades.push({ 
            id: `trade_${trades.length}`,
            type: positionType, 
            entryTime, 
            entryPrice, 
            exitTime: lastDataPoint.time, 
            exitPrice, pnl, 
            pnlPercent, 
            closeReason: 'signal',
            stopLoss: stopLossPrice,
            takeProfit: takeProfitPrice,
            fee: totalFee
        });
    }

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalFees = trades.reduce((sum, t) => sum + t.fee, 0);
    const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = losses.reduce((sum, t) => sum + t.pnl, 0);
    const endingBalance = initialCapital + totalPnl;
    const totalReturnPercent = initialCapital > 0 ? (totalPnl / initialCapital) * 100 : 0;

    const summary: BacktestSummary = {
      totalTrades: trades.length,
      winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
      totalPnl: totalPnl,
      totalFees: totalFees,
      averageWin: wins.length > 0 ? totalWins / wins.length : 0,
      averageLoss: losses.length > 0 ? totalLosses / losses.length : 0,
      profitFactor: totalLosses !== 0 ? Math.abs(totalWins / totalLosses) : Infinity,
      initialCapital: initialCapital,
      endingBalance: endingBalance,
      totalReturnPercent: totalReturnPercent
    };

    setChartData(dataWithSignals);
    setBacktestResults(trades);
    setSummaryStats(summary);

    setIsBacktesting(false)
    toast({
      title: "Backtest Complete",
      description: "Strategy signals and results are now available.",
    })
  }

  const handleLoadScript = (script: string) => {
    const lowerScript = script.toLowerCase();
    let detectedStrategy: string | null = null;

    if (lowerScript.includes('ta.sma') && (lowerScript.includes('ta.crossover') || lowerScript.includes('ta.crossunder'))) {
        detectedStrategy = 'sma-crossover';
    } else if (lowerScript.includes('ta.ema') && (lowerScript.includes('ta.crossover') || lowerScript.includes('ta.crossunder'))) {
        detectedStrategy = 'ema-crossover';
    } else if (lowerScript.includes('ta.rsi')) {
        detectedStrategy = 'rsi-divergence';
    }

    if (detectedStrategy) {
        setSelectedStrategy(detectedStrategy);
        toast({
            title: "Strategy Loaded",
            description: "The strategy from the script has been selected. Click 'Run Backtest' to start.",
        });
    } else {
        toast({
            title: "Cannot Load Script",
            description: "This script is not supported for automatic backtesting. Please select a strategy from the dropdown.",
            variant: "destructive",
        });
    }
  };
  
  const anyLoading = isBacktesting || isFetchingData;

  const tradeSignalForChart = useMemo<TradeSignal | null>(() => {
    if (!selectedTrade) return null;
    return {
      action: selectedTrade.type === 'long' ? 'UP' : 'DOWN',
      entryPrice: selectedTrade.entryPrice,
      stopLoss: selectedTrade.stopLoss,
      takeProfit: selectedTrade.takeProfit,
      confidence: 1,
      reasoning: `Trade from backtest. Closed due to ${selectedTrade.closeReason}.`,
      timestamp: new Date(selectedTrade.entryTime),
      strategy: selectedStrategy,
    };
  }, [selectedTrade, selectedStrategy]);

  const handleSymbolChange = (newSymbol: string) => {
    setSymbol(newSymbol);
    setChartData([]); // Clear chart data on symbol change
    setBacktestResults([]);
    setSummaryStats(null);
    setSelectedTrade(null);
  }

  const handleIntervalChange = (newInterval: string) => {
    setInterval(newInterval);
    setChartData([]); // Clear chart data on interval change
    setBacktestResults([]);
    setSummaryStats(null);
    setSelectedTrade(null);
  };

  return (
    <div className="flex flex-col h-full">
    {!isConnected && (
        <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>API Disconnected</AlertTitle>
            <AlertDescription>
                Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> in the Settings page to load historical market data for backtesting.
            </AlertDescription>
        </Alert>
    )}
    {isTradingActive && (
        <Alert variant="default" className="mb-4 bg-primary/10 border-primary/20 text-primary">
            <Bot className="h-4 w-4" />
            <AlertTitle>Trading Session Active</AlertTitle>
            <AlertDescription>
                Backtesting is disabled to prioritize an active trading session. Check the <Link href="/live" className="font-bold underline">Live</Link>, <Link href="/manual" className="font-bold underline">Manual</Link>, or <Link href="/multi-signal" className="font-bold underline">Multi-Signal</Link> pages.
            </AlertDescription>
        </Alert>
    )}
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 flex flex-col h-[600px]">
        <TradingChart data={chartData} symbol={symbol} interval={interval} onIntervalChange={handleIntervalChange} tradeSignal={tradeSignalForChart} />
      </div>
      <div className="xl:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Backtest Controls</CardTitle>
            <CardDescription>Configure your backtesting parameters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Asset</Label>
                  <Select onValueChange={handleSymbolChange} value={symbol} disabled={!isConnected || anyLoading}>
                    <SelectTrigger id="symbol">
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {topAssetList.map(asset => (
                        <SelectItem key={asset} value={asset}>{asset.replace('USDT', '/USDT')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label htmlFor="interval">Interval</Label>
                  <Select onValueChange={handleIntervalChange} value={interval} disabled={anyLoading}>
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
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="initial-capital">Initial Capital ($)</Label>
                    <Input 
                        id="initial-capital" 
                        type="number" 
                        value={initialCapital}
                        onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)}
                        placeholder="10000"
                        disabled={anyLoading}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="leverage">Leverage (x)</Label>
                    <Input 
                        id="leverage" 
                        type="number" 
                        value={leverage}
                        onChange={(e) => setLeverage(parseInt(e.target.value, 10) || 1)}
                        placeholder="10"
                        min="1"
                        disabled={anyLoading}
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
                        disabled={anyLoading}
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
                        placeholder="2"
                        disabled={anyLoading}
                    />
                </div>
            </div>

            <div className="space-y-2">
              <Label>AI-Powered Analysis</Label>
              <div className="p-3 border rounded-md bg-muted/50 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="ai-validation" checked={useAIValidation} onCheckedChange={setUseAIValidation} disabled={anyLoading} />
                    <div className="flex flex-col">
                        <Label htmlFor="ai-validation" className="cursor-pointer">Enable AI Validation</Label>
                        <p className="text-xs text-muted-foreground">Let an AI validate each signal. This is more accurate but significantly slower.</p>
                    </div>
                  </div>
                  {useAIValidation && (
                      <>
                          <div className="border-b -mx-3"></div>
                          <div className="space-y-2 pt-4">
                          <Label htmlFor="max-ai-validations">Max Validations Per Run</Label>
                          <Input 
                              id="max-ai-validations" 
                              type="number" 
                              value={maxAiValidations}
                              onChange={(e) => setMaxAiValidations(parseInt(e.target.value, 10) || 0)}
                              placeholder="20"
                              disabled={anyLoading}
                          />
                          <p className="text-xs text-muted-foreground">Limits AI calls to prevent exceeding API quotas (e.g., free tier is 50/day).</p>
                          </div>
                      </>
                  )}
              </div>
            </div>

            <div className="space-y-2">
               <Label>Date range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                      disabled={!isConnected || anyLoading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {isClient && date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(date.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto flex p-0" align="start">
                    <div className="flex flex-col space-y-1 border-r p-3">
                        <div className="px-1 pb-1">
                            <h4 className="font-medium text-sm text-muted-foreground">Presets</h4>
                        </div>
                        <div className="flex flex-col items-start space-y-1">
                            <Button
                                variant="ghost"
                                className="w-full justify-start font-normal h-8 px-2"
                                onClick={() => setDate({ from: new Date(), to: new Date() })}
                            >
                                Today
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full justify-start font-normal h-8 px-2"
                                onClick={() => setDate({ from: addDays(new Date(), -7), to: new Date() })}
                            >
                                Last 7 Days
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full justify-start font-normal h-8 px-2"
                                onClick={() => setDate({ from: addDays(new Date(), -30), to: new Date() })}
                            >
                                Last 30 Days
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full justify-start font-normal h-8 px-2"
                                onClick={() => setDate({ from: date?.from, to: new Date() })}
                            >
                                Until Today
                            </Button>
                        </div>
                    </div>
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => handleRunBacktest()} disabled={anyLoading || !isConnected || chartData.length === 0 || isTradingActive}>
              {anyLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isTradingActive ? "Trading Active..." : isFetchingData ? "Fetching Data..." : isBacktesting ? "Running..." : "Run Backtest"}
            </Button>
          </CardFooter>
        </Card>
        <BacktestResults 
          results={backtestResults} 
          summary={summaryStats} 
          onSelectTrade={setSelectedTrade}
          selectedTradeId={selectedTrade?.id}
        />
        <PineScriptEditor onLoadScript={handleLoadScript} isLoading={anyLoading} />
      </div>
    </div>
    </div>
  )
}

    

    