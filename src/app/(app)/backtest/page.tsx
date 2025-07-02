
"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { TradingChart } from "@/components/trading-chart"
import { PineScriptEditor } from "@/components/pine-script-editor"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CalendarIcon, Loader2, Terminal } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format, addDays } from "date-fns"
import type { HistoricalData, BacktestResult, BacktestSummary } from "@/lib/types"
import { calculateSMA, calculateEMA, calculateRSI } from "@/lib/indicators";
import { BacktestResults } from "@/components/backtest-results"

interface DateRange {
  from?: Date;
  to?: Date;
}

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

export default function BacktestPage() {
  const { toast } = useToast()
  const { isConnected } = useApi();
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

  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [leverage, setLeverage] = useState<number>(10);
  const [takeProfit, setTakeProfit] = useState<number>(5);
  const [stopLoss, setStopLoss] = useState<number>(2);


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
    if (!isClient) return;

    const fetchData = async () => {
        if (!isConnected || !date?.from || !date?.to) {
            setChartData([]);
            return;
        }
        setIsFetchingData(true);
        setBacktestResults([]);
        setSummaryStats(null);
        toast({ title: "Fetching Market Data...", description: `Loading ${interval} data for ${symbol}.`});
        try {
            const klines = await getHistoricalKlines(symbol, interval, date.from.getTime(), date.to.getTime());
            setChartData(klines);
            toast({ title: "Data Loaded", description: `Market data for ${symbol} is ready for backtesting.` });
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
  }, [symbol, date, interval, isConnected, isClient, toast]);

  const handleRunBacktest = (strategyOverride?: string) => {
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
    toast({
      title: "Backtest Started",
      description: `Running ${strategyToRun} on ${interval} interval.`,
    })

    setTimeout(() => {
      const closePrices = chartData.map(d => d.close);
      
      let dataWithSignals: HistoricalData[] = chartData.map(d => {
        const { 
          buySignal, sellSignal, 
          sma_short, sma_long, 
          ema_short, ema_long, 
          rsi, 
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
      }

      const trades: BacktestResult[] = [];
      let inPosition = false;
      let entryPrice = 0;
      let entryTime = 0;
      let stopLossPrice = 0;
      let takeProfitPrice = 0;
      let tradeQuantity = 0;

      for (const d of dataWithSignals) {
          if (inPosition) {
              let exitPrice: number | null = null;
              let closeReason: BacktestResult['closeReason'] | null = null;

              if (d.low <= stopLossPrice) {
                  exitPrice = stopLossPrice;
                  closeReason = 'stop-loss';
              }
              else if (d.high >= takeProfitPrice) {
                  exitPrice = takeProfitPrice;
                  closeReason = 'take-profit';
              }
              else if (d.sellSignal) {
                  exitPrice = d.high;
                  closeReason = 'signal';
              }

              if (exitPrice !== null && closeReason !== null) {
                  inPosition = false;
                  const pnl = (exitPrice - entryPrice) * tradeQuantity;
                  const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
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
                  tradeQuantity = 0;
              }
          }

          if (!inPosition && d.buySignal) {
              inPosition = true;
              entryPrice = d.low;
              entryTime = d.time;
              stopLossPrice = entryPrice * (1 - (stopLoss || 0) / 100);
              takeProfitPrice = entryPrice * (1 + (takeProfit || 0) / 100);

              const positionValue = (initialCapital || 1) * (leverage || 1);
              tradeQuantity = positionValue / entryPrice;
          }
      }
      
      if (inPosition && dataWithSignals.length > 0) {
        const lastDataPoint = dataWithSignals[dataWithSignals.length - 1];
        const exitPrice = lastDataPoint.close;
        const pnl = (exitPrice - entryPrice) * tradeQuantity;
        const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
        trades.push({
          entryTime,
          entryPrice,
          exitTime: lastDataPoint.time,
          exitPrice,
          pnl,
          pnlPercent,
          closeReason: 'signal'
        });
      }

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
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 flex flex-col h-[600px]">
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
                  <Select onValueChange={setSymbol} value={symbol} disabled={!isConnected || anyLoading}>
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
                  <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={anyLoading}>
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
                  <Select onValueChange={setInterval} value={interval} disabled={anyLoading}>
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
            <div className="grid grid-cols-2 gap-4">
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
            <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => handleRunBacktest()} disabled={anyLoading || !isConnected || chartData.length === 0}>
              {anyLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isFetchingData ? "Fetching Data..." : isBacktesting ? "Running..." : "Run Backtest"}
            </Button>
          </CardFooter>
        </Card>
        <BacktestResults results={backtestResults} summary={summaryStats} />
        <PineScriptEditor onLoadScript={handleLoadScript} isLoading={anyLoading} />
      </div>
    </div>
    </div>
  )
}
