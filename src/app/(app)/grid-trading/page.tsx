
"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { TradingChart } from "@/components/trading-chart"
import { getLatestKlinesByLimit } from "@/lib/binance-service"
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
import { Terminal, Bot, Play, StopCircle, Loader2, GripHorizontal, TestTube, ChevronDown, BarChart2, Grid3x3, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn, formatPrice } from "@/lib/utils"
import type { HistoricalData, GridTrade, MatchedGridTrade } from "@/lib/types"
import { topAssets } from "@/lib/assets"
import { useSymbolManager } from "@/hooks/use-symbol-manager"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { GridBacktestReport } from "@/components/grid-backtest-report"


export default function GridTradingPage() {
  const { toast } = useToast()
  const { isConnected } = useApi();
  const { 
    isTradingActive, 
    gridState, 
    startGridSimulation, 
    stopGridSimulation, 
    runGridBacktest,
    gridBacktestState,
  } = useBot();
  const { isRunning, chartData: botChartData, grid, trades, summary } = gridState;
  const { isBacktesting, backtestSummary, backtestTrades, unmatchedTrades } = gridBacktestState;


  // UI State & Config
  const { baseAsset, quoteAsset, symbol, availableQuotes, handleBaseAssetChange, handleQuoteAssetChange } = useSymbolManager('grid', 'BTC', 'USDT');
  const [interval, setInterval] = usePersistentState<string>('grid-interval', "1h");
  const [lowerPrice, setLowerPrice] = usePersistentState<number>('grid-lower-price', 0);
  const [upperPrice, setUpperPrice] = usePersistentState<number>('grid-upper-price', 0);
  const [gridCount, setGridCount] = usePersistentState<number>('grid-count', 10);
  const [leverage, setLeverage] = usePersistentState<number>('grid-leverage', 10);
  const [mode, setMode] = usePersistentState<'arithmetic' | 'geometric'>('grid-mode', 'arithmetic');
  const [direction, setDirection] = usePersistentState<'neutral' | 'long' | 'short'>('grid-direction', 'neutral');
  const [investment, setInvestment] = usePersistentState<number>('grid-investment', 1000);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [chartData, setChartData] = useState<HistoricalData[]>([]);

  // Advanced Trailing and Exit conditions
  const [trailingUp, setTrailingUp] = usePersistentState<boolean>('grid-trailing-up', false);
  const [trailingDown, setTrailingDown] = usePersistentState<boolean>('grid-trailing-down', false);
  const [trailingUpTriggerPrice, setTrailingUpTriggerPrice] = usePersistentState<number>('grid-trailing-up-trigger', 0);
  const [trailingDownTriggerPrice, setTrailingDownTriggerPrice] = usePersistentState<number>('grid-trailing-down-trigger', 0);
  const [stopLossPrice, setStopLossPrice] = usePersistentState<number>('grid-stop-loss', 0);
  const [takeProfitPrice, setTakeProfitPrice] = usePersistentState<number>('grid-take-profit', 0);
  const [backtestDays, setBacktestDays] = usePersistentState<number>('grid-backtest-days', 7);
  
  // Layout State
  const [chartHeight, setChartHeight] = usePersistentState<number>('grid-chart-height', 600);
  const [isConfigOpen, setConfigOpen] = usePersistentState<boolean>('grid-config-open', true);

  const [selectedTrade, setSelectedTrade] = useState<MatchedGridTrade | null>(null);

  const startChartResize = useCallback((mouseDownEvent: React.MouseEvent<HTMLDivElement>) => {
    mouseDownEvent.preventDefault();
    const startHeight = chartHeight;
    const startPosition = mouseDownEvent.clientY;
    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const newHeight = startHeight + mouseMoveEvent.clientY - startPosition;
      if (newHeight >= 400 && newHeight <= 1200) setChartHeight(newHeight);
    };
    const onMouseUp = () => {
      document.body.style.cursor = 'default';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    document.body.style.cursor = 'ns-resize';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, { once: true });
  }, [chartHeight, setChartHeight]);


  useEffect(() => {
    if (isRunning) {
        setChartData(botChartData);
    } else {
        const fetchInitialData = async () => {
            if (!isConnected || !symbol) {
                setChartData([]);
                return;
            };
            setIsFetchingData(true);
            setChartData([]);
            try {
                const [klines, dailyKlines] = await Promise.all([
                    getLatestKlinesByLimit(symbol, interval, 500),
                    getLatestKlinesByLimit(symbol, '1d', 30) // Fetch last 30 days for support/resistance
                ]);

                if (klines.length > 0) {
                    setChartData(klines);
                    
                    // Set default grid boundaries and trailing triggers if they haven't been set by the user
                    if (lowerPrice === 0 && upperPrice === 0) {
                        const latestPrice = klines[klines.length - 1].close;
                        const supportPrice = dailyKlines.length > 0 ? Math.min(...dailyKlines.map(k => k.low)) : latestPrice * 0.9;
                        setUpperPrice(latestPrice);
                        setLowerPrice(supportPrice);
                    }
                    if (trailingDownTriggerPrice === 0 && dailyKlines.length > 0) {
                        setTrailingDownTriggerPrice(Math.min(...dailyKlines.map(k => k.low)));
                    }
                    if (trailingUpTriggerPrice === 0 && dailyKlines.length > 0) {
                        setTrailingUpTriggerPrice(Math.max(...dailyKlines.map(k => k.high)));
                    }
                }

            } catch (e: any) {
                toast({ title: "Error fetching data", description: e.message, variant: "destructive" });
                setChartData([]);
            } finally {
                setIsFetchingData(false);
            }
        };
        fetchInitialData();
    }
  }, [symbol, interval, isConnected, isRunning, botChartData, toast]);

  const validateGridConfig = () => {
    if (upperPrice <= lowerPrice) {
        toast({ title: "Invalid Grid", description: "Upper price must be greater than lower price.", variant: "destructive"});
        return false;
    }
    if (gridCount < 2) {
        toast({ title: "Invalid Grid", description: "You must have at least 2 grids.", variant: "destructive"});
        return false;
    }
    return true;
  }

  const handleToggleSimulation = () => {
    if (isRunning) {
        stopGridSimulation();
    } else {
        if (!validateGridConfig()) return;
        startGridSimulation({
            symbol,
            interval,
            lowerPrice,
            upperPrice,
            gridCount,
            leverage,
            mode,
            direction,
            investment,
            trailingUp,
            trailingDown,
            trailingUpTriggerPrice: trailingUpTriggerPrice > 0 ? trailingUpTriggerPrice : undefined,
            trailingDownTriggerPrice: trailingDownTriggerPrice > 0 ? trailingDownTriggerPrice : undefined,
            stopLossPrice: stopLossPrice > 0 ? stopLossPrice : undefined,
            takeProfitPrice: takeProfitPrice > 0 ? takeProfitPrice : undefined,
        });
    }
  };

  const handleRunBacktest = () => {
    if (!validateGridConfig()) return;
    runGridBacktest({
        symbol,
        interval,
        lowerPrice,
        upperPrice,
        gridCount,
        leverage,
        mode,
        direction,
        investment,
        trailingUp,
        trailingDown,
        trailingUpTriggerPrice: trailingUpTriggerPrice > 0 ? trailingUpTriggerPrice : undefined,
        trailingDownTriggerPrice: trailingDownTriggerPrice > 0 ? trailingDownTriggerPrice : undefined,
        stopLossPrice: stopLossPrice > 0 ? stopLossPrice : undefined,
        takeProfitPrice: takeProfitPrice > 0 ? takeProfitPrice : undefined,
        backtestDays,
    });
  }

  const calculatedGridLevels = useMemo(() => {
    if (isRunning) return grid?.levels ?? [];
    if (upperPrice <= lowerPrice || gridCount < 2) return [];

    const levels: number[] = [];
    if (mode === 'arithmetic') {
        const priceStep = (upperPrice - lowerPrice) / (gridCount - 1);
        for (let i = 0; i < gridCount; i++) {
            levels.push(lowerPrice + i * priceStep);
        }
    } else { // Geometric
        const ratio = Math.pow(upperPrice / lowerPrice, 1 / (gridCount - 1));
        for (let i = 0; i < gridCount; i++) {
            const price = lowerPrice * Math.pow(ratio, i);
            levels.push(price);
        }
    }
    return levels;
  }, [isRunning, lowerPrice, upperPrice, gridCount, mode, grid]);

  return (
    <div className="space-y-6">
        <div className="text-left">
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                <Grid3x3 size={32}/> Live Grid Simulation
            </h1>
            <p className="text-muted-foreground mt-2">
                Configure and simulate a grid trading strategy against a live, tick-by-tick market data feed.
            </p>
        </div>

        {!isConnected && (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>API Disconnected</AlertTitle>
                <AlertDescription>
                    Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> to enable the live data feed for simulation.
                </AlertDescription>
            </Alert>
        )}
        {isTradingActive && !isRunning && (
            <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
                <Bot className="h-4 w-4" />
                <AlertTitle>Another Trading Session is Active</AlertTitle>
                <AlertDescription>
                    The Grid Simulator is disabled to prioritize another active session.
                </AlertDescription>
            </Alert>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
            <div className="xl:col-span-3 relative pb-4">
                <div className="flex flex-col" style={{ height: `${chartHeight}px` }}>
                    <TradingChart 
                        data={chartData} 
                        symbol={symbol} 
                        interval={interval} 
                        gridLevels={calculatedGridLevels}
                        gridTrades={trades}
                        matchedGridTrades={backtestTrades}
                        unmatchedGridTrades={unmatchedTrades}
                        highlightedTrade={selectedTrade}
                    />
                </div>
                <div onMouseDown={startChartResize} className="absolute bottom-0 left-0 w-full h-4 flex items-center justify-center cursor-ns-resize group">
                    <GripHorizontal className="h-5 w-5 text-muted-foreground/30 transition-colors group-hover:text-primary" />
                </div>
            </div>

            <div className="xl:col-span-2 space-y-6">
                <Card>
                    <Collapsible open={isConfigOpen} onOpenChange={setConfigOpen}>
                        <CardHeader className="flex flex-row items-center justify-between">
                             <div>
                                <CardTitle className="flex items-center gap-2"><Bot/> Grid Configuration</CardTitle>
                                <CardDescription>Set up and launch your grid simulation.</CardDescription>
                            </div>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", isConfigOpen && "rotate-180")} />
                                </Button>
                            </CollapsibleTrigger>
                        </CardHeader>
                        <CollapsibleContent>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="base-asset">Base</Label>
                                        <Select onValueChange={handleBaseAssetChange} value={baseAsset} disabled={isRunning}>
                                            <SelectTrigger id="base-asset"><SelectValue /></SelectTrigger>
                                            <SelectContent>{topAssets.map(asset => (<SelectItem key={asset.ticker} value={asset.ticker}>{asset.ticker}</SelectItem>))}</SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="quote-asset">Quote</Label>
                                        <Select onValueChange={handleQuoteAssetChange} value={quoteAsset} disabled={isRunning || availableQuotes.length === 0}>
                                            <SelectTrigger id="quote-asset"><SelectValue /></SelectTrigger>
                                            <SelectContent>{availableQuotes.map(asset => (<SelectItem key={asset} value={asset}>{asset}</SelectItem>))}</SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="lower-price">Lower Price</Label>
                                        <Input id="lower-price" type="number" value={lowerPrice} onChange={e => setLowerPrice(parseFloat(e.target.value) || 0)} disabled={isRunning} />
                                    </div>
                                    <div>
                                        <Label htmlFor="upper-price">Upper Price</Label>
                                        <Input id="upper-price" type="number" value={upperPrice} onChange={e => setUpperPrice(parseFloat(e.target.value) || 0)} disabled={isRunning} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Grid Mode</Label>
                                        <RadioGroup onValueChange={(v) => setMode(v as any)} value={mode} className="flex gap-4" disabled={isRunning}>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="arithmetic" id="arithmetic" />
                                                <Label htmlFor="arithmetic" className="font-normal">Arithmetic</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="geometric" id="geometric" />
                                                <Label htmlFor="geometric" className="font-normal">Geometric</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Direction</Label>
                                        <RadioGroup onValueChange={(v) => setDirection(v as any)} value={direction} className="flex gap-x-4 gap-y-2" disabled={isRunning}>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="neutral" id="neutral" /><Label htmlFor="neutral" className="font-normal flex items-center gap-1"><Minus/>Neutral</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="long" id="long" /><Label htmlFor="long" className="font-normal flex items-center gap-1"><TrendingUp/>Long</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="short" id="short" /><Label htmlFor="short" className="font-normal flex items-center gap-1"><TrendingDown/>Short</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                </div>
                                 <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label htmlFor="grid-count">Grids</Label>
                                        <Input id="grid-count" type="number" value={gridCount} onChange={e => setGridCount(parseInt(e.target.value, 10) || 0)} min={2} max={150} disabled={isRunning} />
                                    </div>
                                    <div>
                                        <Label htmlFor="investment">Investment (USDT)</Label>
                                        <Input id="investment" type="number" value={investment} onChange={e => setInvestment(parseFloat(e.target.value) || 0)} disabled={isRunning} />
                                    </div>
                                    <div>
                                        <Label htmlFor="leverage">Leverage (x)</Label>
                                        <Input id="leverage" type="number" value={leverage} onChange={e => setLeverage(parseInt(e.target.value, 10) || 1)} min={1} max={100} disabled={isRunning} />
                                    </div>
                                </div>
                                 <div className="space-y-3 pt-2">
                                    <Label>Advanced Options</Label>
                                    <div className="p-3 border rounded-md bg-muted/50 space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <Switch id="trailing-up" checked={trailingUp} onCheckedChange={setTrailingUp} disabled={isRunning} />
                                            <Label htmlFor="trailing-up" className="font-normal flex-1">Trailing Up</Label>
                                            <Input placeholder="Trigger Price" type="number" value={trailingUpTriggerPrice || ''} onChange={e => setTrailingUpTriggerPrice(parseFloat(e.target.value))} className="h-8 w-32" disabled={isRunning}/>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch id="trailing-down" checked={trailingDown} onCheckedChange={setTrailingDown} disabled={isRunning} />
                                            <Label htmlFor="trailing-down" className="font-normal flex-1">Trailing Down</Label>
                                             <Input placeholder="Trigger Price" type="number" value={trailingDownTriggerPrice || ''} onChange={e => setTrailingDownTriggerPrice(parseFloat(e.target.value))} className="h-8 w-32" disabled={isRunning}/>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div>
                                                <Label htmlFor="stop-loss-price">Stop Loss Price</Label>
                                                <Input id="stop-loss-price" type="number" placeholder="Optional" value={stopLossPrice || ''} onChange={e => setStopLossPrice(parseFloat(e.target.value))} disabled={isRunning} />
                                            </div>
                                            <div>
                                                <Label htmlFor="take-profit-price">Take Profit Price</Label>
                                                <Input id="take-profit-price" type="number" placeholder="Optional" value={takeProfitPrice || ''} onChange={e => setTakeProfitPrice(parseFloat(e.target.value))} disabled={isRunning} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-2">
                                    <Label>Backtesting</Label>
                                    <div className="p-3 border rounded-md bg-muted/50 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 space-y-1">
                                                <Label htmlFor="backtest-days">Days to Backtest</Label>
                                                <Input id="backtest-days" type="number" value={backtestDays} onChange={e => setBacktestDays(parseInt(e.target.value, 10) || 7)} min={1} max={500} disabled={isRunning || isBacktesting} />
                                            </div>
                                            <Button onClick={handleRunBacktest} disabled={isRunning || isBacktesting || isFetchingData || !isConnected}>
                                                {isBacktesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart2 />}
                                                {isBacktesting ? "Running..." : "Backtest"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                             <CardFooter>
                                <Button className="w-full" onClick={handleToggleSimulation} disabled={isFetchingData || !isConnected || (isTradingActive && !isRunning) || isBacktesting} variant={isRunning ? "destructive" : "default"}>
                                    {isFetchingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isRunning ? <StopCircle /> : <Play />}
                                    {isFetchingData ? "Loading..." : isRunning ? "Stop Live Simulation" : "Start Live Simulation"}
                                </Button>
                            </CardFooter>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Grid Details</CardTitle>
                        <CardDescription>Details of the active or last run simulation.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {summary ? (
                             <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Total PNL</p>
                                    <p className={cn("font-semibold", summary.totalPnl >= 0 ? "text-green-500" : "text-red-500")}>
                                        ${summary.totalPnl.toFixed(4)}
                                    </p>
                                </div>
                                 <div className="space-y-1">
                                    <p className="text-muted-foreground">Grid PNL</p>
                                    <p className={cn("font-semibold", summary.gridPnl >= 0 ? "text-green-500" : "text-red-500")}>
                                        ${summary.gridPnl.toFixed(4)}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Total Trades</p>
                                    <p className="font-semibold">{summary.totalTrades}</p>
                                </div>
                                 <div className="space-y-1">
                                    <p className="text-muted-foreground">Profit/Grid</p>
                                    <p className="font-semibold">${grid?.profitPerGrid.toFixed(4)}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">Run a simulation to see the results.</p>
                        )}

                        <h4 className="text-sm font-medium text-muted-foreground pt-4">Completed Trades</h4>
                        <div className="h-48 border rounded-md overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Side</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {trades && trades.length > 0 ? (
                                        trades.map(trade => (
                                            <TableRow 
                                                key={trade.id}
                                                className="cursor-pointer hover:bg-muted/80"
                                            >
                                                <TableCell className="text-xs font-mono">{new Date(trade.time).toLocaleTimeString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'} className={trade.side === 'buy' ? 'bg-green-600' : 'bg-red-600'}>{trade.side.toUpperCase()}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">${formatPrice(trade.price)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No trades executed yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
                {backtestSummary && <GridBacktestReport summary={backtestSummary} trades={backtestTrades} onSelectTrade={setSelectedTrade} />}
            </div>
        </div>
    </div>
  )
}
