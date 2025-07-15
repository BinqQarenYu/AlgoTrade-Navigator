
"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { TradingChart } from "@/components/trading-chart"
import { getLatestKlinesByLimit } from "@/lib/binance-service"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Terminal, ChevronDown, GripHorizontal, Play, StopCircle, Settings, Sigma, CalendarIcon } from "lucide-react"
import { cn, intervalToMs } from "@/lib/utils"
import type { HistoricalData, LiquidityEvent, LiquidityTarget, SpoofedWall, Wall, PhysicsChartConfig } from "@/lib/types"
import { topAssets } from "@/lib/assets"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { OrderBook } from "@/components/order-book"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { useSymbolManager } from "@/hooks/use-symbol-manager"
import { findLiquidityGrabs, findLiquidityTargets } from "@/lib/analysis/liquidity-analysis"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, addDays } from "date-fns"

interface DateRange {
  from?: Date;
  to?: Date;
}

export default function TradingLab2Page() {
  const { toast } = useToast()
  const { isConnected } = useApi();
  
  const { baseAsset, quoteAsset, symbol, availableQuotes, handleBaseAssetChange, handleQuoteAssetChange } = useSymbolManager('lab2', 'BTC', 'USDT');
  const [interval, setInterval] = usePersistentState<string>("lab2-interval","1h");
  
  const [chartHeight, setChartHeight] = usePersistentState<number>('lab2-chart-height', 600);
  const [lineWidth, setLineWidth] = usePersistentState<number>('lab2-line-width', 2);
  const [showAnalysis, setShowAnalysis] = usePersistentState<boolean>('lab2-show-analysis', true);
  const [chartType, setChartType] = usePersistentState<'candlestick' | 'line'>('lab2-chart-type', 'candlestick');
  const [scaleMode, setScaleMode] = usePersistentState<'linear' | 'logarithmic'>('lab2-scale-mode', 'linear');
  
  const [date, setDate] = usePersistentState<DateRange | undefined>('lab2-date-range', undefined);
  
  const [isClient, setIsClient] = useState(false)
  const [chartData, setChartData] = useState<HistoricalData[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [spoofedWalls, setSpoofedWalls] = useState<SpoofedWall[]>([]);
  const [liquidityEvents, setLiquidityEvents] = useState<LiquidityEvent[]>([]);
  const [liquidityTargets, setLiquidityTargets] = useState<LiquidityTarget[]>([]);
  const [isStreamActive, setIsStreamActive] = useState(false);

  const [physicsChartConfig, setPhysicsChartConfig] = usePersistentState<PhysicsChartConfig>('lab2-physics-chart-config', {
    showDepth: true,
    showImbalance: true,
    showStiffness: true,
    showPressure: true,
    showBPI: true,
    showSentiment: true,
    bpiThreshold: 2.5,
  });

  const handlePhysicsConfigChange = <K extends keyof PhysicsChartConfig>(key: K, value: PhysicsChartConfig[K]) => {
    setPhysicsChartConfig(prev => ({ ...prev, [key]: value }));
  };

  // Collapsible states
  const [isControlsOpen, setControlsOpen] = usePersistentState<boolean>('lab2-controls-open', true);
  const [isAnalysisToolsOpen, setIsAnalysisToolsOpen] = usePersistentState<boolean>('lab2-analysis-tools-open', true);
  const [isPhysicsPanelsOpen, setIsPhysicsPanelsOpen] = usePersistentState<boolean>('lab2-physics-panels-open', true);
  
  const startChartResize = useCallback((mouseDownEvent: React.MouseEvent<HTMLDivElement>) => {
    mouseDownEvent.preventDefault();
    const startHeight = chartHeight;
    const startPosition = mouseDownEvent.clientY;

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const newHeight = startHeight + mouseMoveEvent.clientY - startPosition;
      if (newHeight >= 400 && newHeight <= 1200) {
        setChartHeight(newHeight);
      }
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
    setIsClient(true)
  }, []);

  const refreshChartAnalysis = useCallback(async (currentChartData: HistoricalData[]) => {
    if (currentChartData.length < 20) {
      setLiquidityEvents([]);
      setLiquidityTargets([]);
      return;
    }

    const getDynamicParams = () => {
        switch(interval) {
            case '1m': return { lookaround: 15, confirmationCandles: 2, maxLookahead: 50 };
            case '5m': return { lookaround: 15, confirmationCandles: 3, maxLookahead: 60 };
            case '15m': return { lookaround: 10, confirmationCandles: 3, maxLookahead: 75 };
            case '1h': return { lookaround: 10, confirmationCandles: 3, maxLookahead: 90 };
            case '4h': return { lookaround: 12, confirmationCandles: 2, maxLookahead: 120 };
            case '1d': return { lookaround: 15, confirmationCandles: 2, maxLookahead: 150 };
            default: return { lookaround: 8, confirmationCandles: 3, maxLookahead: 75 };
        }
    }
    try {
        const dynamicParams = getDynamicParams();
        const [resultEvents, targetEvents] = await Promise.all([
            findLiquidityGrabs(currentChartData, dynamicParams),
            findLiquidityTargets(currentChartData, dynamicParams.lookaround)
        ]);
        setLiquidityEvents(resultEvents);
        setLiquidityTargets(targetEvents);
    } catch (error: any) {
        console.error("Error analyzing liquidity automatically:", error);
    }
  }, [interval]);
  
  useEffect(() => {
    if (chartData.length > 0) {
      refreshChartAnalysis(chartData);
    }
  }, [chartData, refreshChartAnalysis]);

  useEffect(() => {
    if (!isClient || !symbol || !quoteAsset || isStreamActive) return;

    const fetchData = async () => {
        if (!isConnected) {
            if(!isStreamActive) setChartData([]);
            return;
        }
        setIsFetchingData(true);
        if(!isStreamActive) {
            setChartData([]);
            toast({ title: "Fetching Market Data...", description: `Loading ${interval} data for ${symbol}.`});
        }
        try {
            const klines = await getLatestKlinesByLimit(symbol, interval, 500); 
            if(!isStreamActive) {
                setChartData(klines);
                toast({ title: "Data Loaded", description: `${klines.length} candles for ${symbol} are ready.` });
            }
        } catch (error: any) {
            console.error("Failed to fetch historical data:", error);
            if(!isStreamActive) {
                toast({
                    title: "Failed to Load Data",
                    description: error.message || "Could not retrieve historical data from Binance.",
                    variant: "destructive"
                });
                setChartData([]);
            }
        } finally {
            setIsFetchingData(false);
        }
    };

    fetchData();
  }, [symbol, quoteAsset, interval, isConnected, isClient, isStreamActive, toast]);
  
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (!isStreamActive || !symbol || !interval) return;

    wsRef.current = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`);

    wsRef.current.onopen = () => toast({ title: "Live Update Started", description: `Continuously updating analysis for ${symbol}.` });
    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.e !== 'kline') return;

      const klineData = message.k;
      const newCandle: HistoricalData = {
        time: klineData.t, open: parseFloat(klineData.o), high: parseFloat(klineData.h),
        low: parseFloat(klineData.l), close: parseFloat(klineData.c), volume: parseFloat(klineData.v),
      };

      setChartData(prevData => {
        const updatedData = [...prevData];
        const lastCandle = updatedData[updatedData.length - 1];
        if (lastCandle && lastCandle.time === newCandle.time) {
          updatedData[updatedData.length - 1] = newCandle;
        } else {
          updatedData.push(newCandle);
        }
        return updatedData.slice(-1000);
      });
    };
    wsRef.current.onerror = () => toast({ title: "Stream Error", description: `Could not connect to live data for ${symbol}.`, variant: "destructive" });

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [isStreamActive, symbol, interval, toast]);

  const handleToggleStream = () => setIsStreamActive(!isStreamActive);
  const handleOrderBookUpdate = useCallback((events: { walls: Wall[]; spoofs: SpoofedWall[] }) => {
    setWalls(events.walls);
    if (events.spoofs.length > 0) {
      setSpoofedWalls(prev => [...prev, ...events.spoofs]);
    }
  }, []);

  const anyLoading = isFetchingData;

  return (
    <div className="space-y-6">
       <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <Sigma size={32}/> Trading Lab II
          </h1>
          <p className="text-muted-foreground mt-2">
              A dedicated workspace for market physics analysis.
          </p>
      </div>

      {!isConnected && (
          <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>API Disconnected</AlertTitle>
              <AlertDescription>
                  Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> in the Settings page to load market data.
              </AlertDescription>
          </Alert>
      )}
      
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <div className="relative pb-4">
            <div className="flex flex-col" style={{ height: `${chartHeight}px` }}>
              <TradingChart
                  data={chartData}
                  symbol={symbol}
                  interval={interval}
                  onIntervalChange={setInterval}
                  wallLevels={showAnalysis ? walls : []}
                  spoofedWalls={showAnalysis ? spoofedWalls : []}
                  liquidityEvents={showAnalysis ? liquidityEvents : []}
                  liquidityTargets={showAnalysis ? liquidityTargets : []}
                  lineWidth={lineWidth}
                  showAnalysis={showAnalysis}
                  chartType={chartType}
                  scaleMode={scaleMode}
                  physicsConfig={physicsChartConfig}
              />
            </div>
            <div onMouseDown={startChartResize} className="absolute bottom-0 left-0 w-full h-4 flex items-center justify-center cursor-ns-resize group">
                <GripHorizontal className="h-5 w-5 text-muted-foreground/30 transition-colors group-hover:text-primary" />
            </div>
          </div>
          <OrderBook 
            symbol="ADAUSDT"
            isStreamActive={isStreamActive}
            onWallsUpdate={handleOrderBookUpdate}
          />
        </div>

        <div className="xl:col-span-2 space-y-6">
          <Card>
            <Collapsible open={isControlsOpen} onOpenChange={setControlsOpen}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Lab II Controls</CardTitle>
                  <CardDescription>Configure your dataset and analysis.</CardDescription>
                </div>
                <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><ChevronDown className={cn("h-4 w-4 transition-transform", isControlsOpen && "rotate-180")} /></Button></CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="base-asset">Base</Label>
                        <Select onValueChange={handleBaseAssetChange} value={baseAsset} disabled={anyLoading || isStreamActive}><SelectTrigger id="base-asset"><SelectValue/></SelectTrigger>
                          <SelectContent>{topAssets.map(asset => (<SelectItem key={asset.ticker} value={asset.ticker}>{asset.ticker}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quote-asset">Quote</Label>
                        <Select onValueChange={handleQuoteAssetChange} value={quoteAsset} disabled={anyLoading || availableQuotes.length === 0 || isStreamActive}><SelectTrigger id="quote-asset"><SelectValue/></SelectTrigger>
                          <SelectContent>{availableQuotes.map(asset => (<SelectItem key={asset} value={asset}>{asset}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="interval">Interval</Label>
                        <Select onValueChange={setInterval} value={interval} disabled={anyLoading}><SelectTrigger id="interval"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1m">1m</SelectItem><SelectItem value="5m">5m</SelectItem><SelectItem value="15m">15m</SelectItem>
                            <SelectItem value="1h">1h</SelectItem><SelectItem value="4h">4h</SelectItem><SelectItem value="1d">1d</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Date range</Label>
                    <Popover><PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")} disabled={anyLoading}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {isClient && date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>) : (format(date.from, "LLL dd, y"))) : (<span>Pick a date</span>)}
                      </Button>
                    </PopoverTrigger><PopoverContent className="w-auto flex p-0" align="start">
                      <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
                    </PopoverContent></Popover>
                  </div>
                </CardContent>
                <CardFooter><Button onClick={handleToggleStream} variant={isStreamActive ? "destructive" : "default"} className="w-full" disabled={anyLoading || !isConnected}>
                    {anyLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : isStreamActive ? <StopCircle /> : <Play />}
                    {anyLoading ? "Loading Data..." : isStreamActive ? "Stop Live Feed" : "Start Live Feed"}
                </Button></CardFooter>
              </CollapsibleContent>
            </Collapsible>
          </Card>
          <Card>
            <Collapsible open={isAnalysisToolsOpen} onOpenChange={setIsAnalysisToolsOpen}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Settings/> Chart Settings</CardTitle>
                    <CardDescription>Control chart appearance and analysis visibility.</CardDescription>
                  </div>
                  <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><ChevronDown className={cn("h-4 w-4 transition-transform", isAnalysisToolsOpen && "rotate-180")} /></Button></CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="chart-type">Chart Type</Label><Select value={chartType} onValueChange={(v) => setChartType(v as any)}><SelectTrigger id="chart-type"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="candlestick">Candlestick</SelectItem><SelectItem value="line">Line</SelectItem></SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="scale-mode">Price Scale</Label><Select value={scaleMode} onValueChange={(v) => setScaleMode(v as any)}><SelectTrigger id="scale-mode"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="linear">Linear</SelectItem><SelectItem value="logarithmic">Logarithmic</SelectItem></SelectContent></Select></div>
                    </div>
                    <Separator/>
                    <div className="p-3 border rounded-md bg-muted/50 space-y-4">
                        <div className="flex items-center space-x-2"><Switch id="show-analysis" checked={showAnalysis} onCheckedChange={setShowAnalysis} /><Label htmlFor="show-analysis" className="flex-1 cursor-pointer font-semibold">Show Liquidity Overlays</Label></div>
                    </div>
                    <Collapsible open={isPhysicsPanelsOpen} onOpenChange={setIsPhysicsPanelsOpen} className="p-3 border rounded-md bg-muted/50 space-y-4">
                      <CollapsibleTrigger asChild><div className="flex w-full items-center justify-between cursor-pointer"><Label className="flex-1 font-semibold">Physics Panels</Label><ChevronDown className={cn("h-4 w-4 transition-transform", isPhysicsPanelsOpen && "rotate-180")} /></div></CollapsibleTrigger>
                      <CollapsibleContent className="pt-4 space-y-3">
                          <div className="border-b -mx-3"></div>
                          <div className="pl-2 space-y-3 pt-2">
                            <div className="flex items-center space-x-2"><Switch id="show-depth" checked={physicsChartConfig.showDepth} onCheckedChange={(c) => handlePhysicsConfigChange('showDepth', c)} /><Label htmlFor="show-depth" className="flex-1 cursor-pointer text-muted-foreground">Depth Panel</Label></div>
                            <div className="flex items-center space-x-2"><Switch id="show-imbalance" checked={physicsChartConfig.showImbalance} onCheckedChange={(c) => handlePhysicsConfigChange('showImbalance', c)} /><Label htmlFor="show-imbalance" className="flex-1 cursor-pointer text-muted-foreground">Imbalance Panel</Label></div>
                            <div className="flex items-center space-x-2"><Switch id="show-stiffness" checked={physicsChartConfig.showStiffness} onCheckedChange={(c) => handlePhysicsConfigChange('showStiffness', c)} /><Label htmlFor="show-stiffness" className="flex-1 cursor-pointer text-muted-foreground">Stiffness Panel</Label></div>
                            <div className="flex items-center space-x-2"><Switch id="show-pressure" checked={physicsChartConfig.showPressure} onCheckedChange={(c) => handlePhysicsConfigChange('showPressure', c)} /><Label htmlFor="show-pressure" className="flex-1 cursor-pointer text-muted-foreground">Pressure Panel</Label></div>
                            <div className="flex items-center space-x-2"><Switch id="show-bpi" checked={physicsChartConfig.showBPI} onCheckedChange={(c) => handlePhysicsConfigChange('showBPI', c)} /><Label htmlFor="show-bpi" className="flex-1 cursor-pointer text-muted-foreground">BPI Panel</Label></div>
                            <div className="space-y-2 pt-2"><Label htmlFor="bpi-threshold">BPI Threshold</Label><Input id="bpi-threshold" type="number" step="0.1" value={physicsChartConfig.bpiThreshold} onChange={(e) => handlePhysicsConfigChange('bpiThreshold', parseFloat(e.target.value) || 0)} /></div>
                          </div>
                      </CollapsibleContent>
                    </Collapsible>
                    <div className="space-y-2"><Label htmlFor="line-width">Line Thickness</Label><Slider id="line-width" min={1} max={5} step={1} value={[lineWidth]} onValueChange={(v) => setLineWidth(v[0])}/></div>
                  </CardContent>
                </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>
      </div>
    </div>
  )
}

    