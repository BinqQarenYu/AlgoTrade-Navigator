
"use client"

import React, { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { historicalData as mockHistoricalData } from "@/lib/mock-data"
import { TradingChart } from "@/components/trading-chart"
import { PineScriptEditor } from "@/components/pine-script-editor"
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
import { CalendarIcon, Loader2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format, addDays } from "date-fns"
import { loadSavedData } from "@/lib/data-service"
import type { HistoricalData, StreamedDataPoint, BacktestResult, BacktestSummary } from "@/lib/types"
import { calculateSMA, calculateEMA, calculateRSI } from "@/lib/indicators";
import { BacktestResults } from "@/components/backtest-results"

interface DateRange {
  from?: Date;
  to?: Date;
}

const resampleData = (data: HistoricalData[], intervalMinutes: number): HistoricalData[] => {
    if (!data || data.length === 0 || !intervalMinutes) return [];

    const intervalMillis = intervalMinutes * 60 * 1000;
    const resampled: { [key: number]: HistoricalData[] } = {};

    data.forEach(p => {
        const bucketTimestamp = Math.floor(p.time / intervalMillis) * intervalMillis;
        if (!resampled[bucketTimestamp]) {
            resampled[bucketTimestamp] = [];
        }
        resampled[bucketTimestamp].push(p);
    });

    return Object.keys(resampled).map(key => {
        const bucket = resampled[Number(key)];
        const first = bucket[0];
        const last = bucket[bucket.length - 1];

        return {
            time: Number(key),
            open: first.open,
            high: Math.max(...bucket.map(p => p.high)),
            low: Math.min(...bucket.map(p => p.low)),
            close: last.close,
            volume: parseFloat(bucket.reduce((sum, p) => sum + p.volume, 0).toFixed(2))
        };
    }).sort((a, b) => a.time - b.time);
};


export default function BacktestPage() {
  const { toast } = useToast()
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2024, 4, 27),
    to: new Date(2024, 4, 28),
  })
  const [isClient, setIsClient] = useState(false)
  const [baseChartData, setBaseChartData] = useState<HistoricalData[]>(mockHistoricalData);
  const [chartData, setChartData] = useState<HistoricalData[]>([]);
  const [isBacktesting, setIsBacktesting] = useState(false)
  const [symbol, setSymbol] = useState<string>("BTC/USDT");
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [interval, setInterval] = useState<string>("1h");
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [summaryStats, setSummaryStats] = useState<BacktestSummary | null>(null);

  // New state for advanced parameters
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [takeProfit, setTakeProfit] = useState<number>(5);
  const [stopLoss, setStopLoss] = useState<number>(2);


  useEffect(() => {
    setIsClient(true)
    const fetchChartData = async () => {
      try {
        const savedData: StreamedDataPoint[] = await loadSavedData()
        if (savedData && savedData.length > 0) {
          const transformedData: HistoricalData[] = savedData.map((point) => ({
            time: point.time,
            open: point.price,
            high: point.price,
            low: point.price,
            close: point.price,
            volume: point.volume,
          }))
          setBaseChartData(transformedData)
        } else {
          setBaseChartData(mockHistoricalData);
        }
      } catch (error) {
        console.error("Failed to load saved data for chart:", error)
        setBaseChartData(mockHistoricalData);
        toast({
          title: "Chart Data Error",
          description: "Could not load latest data, displaying default historical data instead.",
          variant: "destructive",
        })
      }
    }
    fetchChartData()
  }, [toast])

  useEffect(() => {
    const intervalMap: { [key: string]: number } = {
        "5m": 5,
        "15m": 15,
        "1h": 60,
        "4h": 240,
        "1d": 1440,
    };
    const intervalMinutes = intervalMap[interval];
    const resampled = resampleData(baseChartData, intervalMinutes);
    setChartData(resampled);
}, [baseChartData, interval]);

  const handleRunBacktest = () => {
    if (!selectedStrategy) {
      toast({
        title: "No Strategy Selected",
        description: "Please select a strategy before running a backtest.",
        variant: "destructive",
      });
      return;
    }

    setIsBacktesting(true)
    setBacktestResults([]);
    setSummaryStats(null);
    toast({
      title: "Backtest Started",
      description: `Running ${selectedStrategy} on ${interval} interval.`,
    })

    // Simulate backtesting logic based on strategy
    setTimeout(() => {
      const closePrices = chartData.map(d => d.close);
      
      // Clear old signals before running a new backtest
      let dataWithSignals: HistoricalData[] = chartData.map(d => {
        const { 
          buySignal, sellSignal, 
          sma_short, sma_long, 
          ema_short, ema_long, 
          rsi, 
          ...rest 
        } = d as any; // Use 'as any' to allow deleting optional props
        return rest;
      });

      switch (selectedStrategy) {
        case "sma-crossover": {
          const shortPeriod = 20;
          const longPeriod = 50;
          const sma_short = calculateSMA(closePrices, shortPeriod);
          const sma_long = calculateSMA(closePrices, longPeriod);
          
          dataWithSignals = dataWithSignals.map((d, i) => {
            const point: HistoricalData = { ...d, sma_short: sma_short[i], sma_long: sma_long[i] };
            if (i > 0 && sma_short[i-1] && sma_long[i-1] && sma_short[i] && sma_long[i]) {
              // Crossover (buy)
              if (sma_short[i-1] <= sma_long[i-1] && sma_short[i] > sma_long[i]) {
                point.buySignal = d.low;
              }
              // Crossunder (sell)
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
              // Crossover (buy)
              if (ema_short[i-1] <= ema_long[i-1] && ema_short[i] > ema_long[i]) {
                point.buySignal = d.low;
              }
              // Crossunder (sell)
              if (ema_short[i-1] >= ema_long[i-1] && ema_short[i] < ema_long[i]) {
                point.sellSignal = d.high;
              }
            }
            return point;
          });
          break;
        }
        case "rsi-divergence": { // Simplified to RSI overbought/oversold
          const period = 14;
          const rsi = calculateRSI(closePrices, period);
          const oversold = 30;
          const overbought = 70;

          dataWithSignals = dataWithSignals.map((d, i) => {
            const point: HistoricalData = { ...d, rsi: rsi[i] };
             if (i > 0 && rsi[i-1] && rsi[i]) {
              // Cross above oversold (buy)
              if (rsi[i-1] <= oversold && rsi[i] > oversold) {
                point.buySignal = d.low;
              }
              // Cross below overbought (sell)
              if (rsi[i-1] >= overbought && rsi[i] < overbought) {
                point.sellSignal = d.high;
              }
            }
            return point;
          });
          break;
        }
      }

      // --- Start of trade simulation logic ---
      const trades: BacktestResult[] = [];
      let inPosition = false;
      let entryPrice = 0;
      let entryTime = 0;
      let stopLossPrice = 0;
      let takeProfitPrice = 0;

      for (const d of dataWithSignals) {
          if (inPosition) {
              let exitPrice: number | null = null;
              let closeReason: BacktestResult['closeReason'] | null = null;

              // 1. Check for Stop Loss
              if (d.low <= stopLossPrice) {
                  exitPrice = stopLossPrice;
                  closeReason = 'stop-loss';
              }
              // 2. Check for Take Profit
              else if (d.high >= takeProfitPrice) {
                  exitPrice = takeProfitPrice;
                  closeReason = 'take-profit';
              }
              // 3. Check for Sell Signal
              else if (d.sellSignal) {
                  exitPrice = d.high; // Assume exit at high of signal candle
                  closeReason = 'signal';
              }

              if (exitPrice !== null && closeReason !== null) {
                  inPosition = false;
                  const pnl = exitPrice - entryPrice;
                  const pnlPercent = (pnl / entryPrice) * 100;
                  trades.push({
                      entryTime,
                      entryPrice,
                      exitTime: d.time,
                      exitPrice,
                      pnl,
                      pnlPercent,
                      closeReason,
                  });
                  entryPrice = 0;
              }
          }

          if (!inPosition && d.buySignal) {
              inPosition = true;
              entryPrice = d.low; // Assume entry at low of signal candle
              entryTime = d.time;
              stopLossPrice = entryPrice * (1 - (stopLoss || 0) / 100);
              takeProfitPrice = entryPrice * (1 + (takeProfit || 0) / 100);
          }
      }
      
      // If still in a position at the end of the data, close it with the last close price
      if (inPosition && dataWithSignals.length > 0) {
        const lastDataPoint = dataWithSignals[dataWithSignals.length - 1];
        const exitPrice = lastDataPoint.close;
        const pnl = exitPrice - entryPrice;
        const pnlPercent = (pnl / entryPrice) * 100;
        trades.push({
          entryTime,
          entryPrice,
          exitTime: lastDataPoint.time,
          exitPrice,
          pnl,
          pnlPercent,
          closeReason: 'signal' // End of data is like a signal to close
        });
      }

      // --- Start of summary calculation ---
      const wins = trades.filter(t => t.pnl > 0);
      const losses = trades.filter(t => t.pnl <= 0);
      const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
      const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
      const totalLosses = losses.reduce((sum, t) => sum + t.pnl, 0);
      const endingBalance = (initialCapital || 0) + totalPnl;
      const totalReturnPercent = totalPnl / (initialCapital || 1) * 100;


      const summary: BacktestSummary = {
        totalTrades: trades.length,
        winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
        totalPnl: totalPnl,
        averageWin: wins.length > 0 ? totalWins / wins.length : 0,
        averageLoss: losses.length > 0 ? totalLosses / losses.length : 0,
        profitFactor: totalLosses !== 0 ? Math.abs(totalWins / totalLosses) : Infinity,
        initialCapital: initialCapital || 0,
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
    }, 1500)
  }

  // This is a placeholder for the actual AI analysis logic
  const handleAnalyzeScript = (script: string) => {
    console.log("Analyzing script:", script);
    toast({
      title: "AI Analysis Started",
      description: "Your Pine Script is being analyzed for optimization.",
    });
    // In a real app, you would call the AI flow here.
    setTimeout(() => {
        toast({
            title: "AI Analysis Complete",
            description: "Suggestions are available on the Optimize page.",
            variant: "default",
        })
    }, 2000)
  };
  

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 h-full">
      <div className="xl:col-span-3 flex flex-col h-[600px] xl:h-auto">
        <TradingChart data={chartData} symbol={symbol} />
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
                  <Select onValueChange={setSymbol} value={symbol}>
                    <SelectTrigger id="symbol">
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                      <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                      <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                      <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
                      <SelectItem value="XRP/USDT">XRP/USDT</SelectItem>
                      <SelectItem value="ADA/USDT">ADA/USDT</SelectItem>
                      <SelectItem value="DOGE/USDT">DOGE/USDT</SelectItem>
                      <SelectItem value="AVAX/USDT">AVAX/USDT</SelectItem>
                      <SelectItem value="LINK/USDT">LINK/USDT</SelectItem>
                      <SelectItem value="DOT/USDT">DOT/USDT</SelectItem>
                      <SelectItem value="MATIC/USDT">MATIC/USDT</SelectItem>
                      <SelectItem value="SHIB/USDT">SHIB/USDT</SelectItem>
                      <SelectItem value="LTC/USDT">LTC/USDT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Select onValueChange={setSelectedStrategy} value={selectedStrategy ?? undefined}>
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
                  <Select onValueChange={setInterval} value={interval}>
                    <SelectTrigger id="interval">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5m">5 Minutes</SelectItem>
                      <SelectItem value="15m">15 Minutes</SelectItem>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="4h">4 Hours</SelectItem>
                      <SelectItem value="1d">1 Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="initial-capital">Initial Capital ($)</Label>
                <Input 
                    id="initial-capital" 
                    type="number" 
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(parseFloat(e.target.value))}
                    placeholder="10000"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="take-profit">Take Profit (%)</Label>
                    <Input 
                        id="take-profit" 
                        type="number" 
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(parseFloat(e.target.value))}
                        placeholder="5"
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="stop-loss">Stop Loss (%)</Label>
                    <Input 
                        id="stop-loss" 
                        type="number" 
                        value={stopLoss}
                        onChange={(e) => setStopLoss(parseFloat(e.target.value))}
                        placeholder="2"
                    />
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
            <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleRunBacktest} disabled={isBacktesting}>
              {isBacktesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isBacktesting ? "Running..." : "Run Backtest"}
            </Button>
          </CardFooter>
        </Card>
        <BacktestResults results={backtestResults} summary={summaryStats} />
        <PineScriptEditor onAnalyze={handleAnalyzeScript} isLoading={false} />
      </div>
    </div>
  )
}
