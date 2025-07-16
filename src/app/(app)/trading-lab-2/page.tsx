
"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { TradingChart } from "@/components/trading-chart"
import { getLatestKlinesByLimit, getHistoricalKlines } from "@/lib/binance-service"
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
import { Loader2, Terminal, ChevronDown, GripHorizontal, Play, StopCircle, Settings, Sigma, CalendarIcon, TrendingUp, ArrowUp, ArrowDown } from "lucide-react"
import { cn, intervalToMs, formatPrice } from "@/lib/utils"
import type { HistoricalData, LiquidityEvent, LiquidityTarget, SpoofedWall, Wall, PhysicsChartConfig, QuantumFieldData, QuantumPredictionSummary, OrderBookData } from "@/lib/types"
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
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { calculatePressure, calculateStiffness, calculateDepthImbalance } from '@/lib/analysis/physics-analysis'

interface DateRange {
  from?: Date;
  to?: Date;
}

const generateMockQuantumField = (historicalData: HistoricalData[], interval: string): { field: QuantumFieldData[], summary: QuantumPredictionSummary } => {
    if (historicalData.length === 0) return { field: [], summary: { trend: '---', target: 0, confidence: 0, sigma: 0, range: {min: 0, max: 0} } };

    const lastCandle = historicalData[historicalData.length - 1];
    const intervalMs = intervalToMs(interval);
    const recentData = historicalData.slice(-50); // Analyze last 50 candles for volatility
    const avgVolatility = recentData.reduce((acc, c) => acc + (c.high - c.low), 0) / recentData.length;

    const field: QuantumFieldData[] = [];

    for (let t = 1; t <= 7; t++) {
        const time = lastCandle.time + t * intervalMs;
        const priceLevels: QuantumFieldData['priceLevels'] = [];
        const centerPrice = lastCandle.close + (Math.random() - 0.45) * avgVolatility * t * 0.5; // Slight bullish drift

        for (let p = -7; p <= 7; p++) {
            const price = centerPrice + p * (avgVolatility / 4);
            const probability = Math.exp(-Math.pow(p, 2) / (2 * Math.pow(t, 0.8))) / (Math.sqrt(2 * Math.PI) * Math.pow(t, 0.8));
            priceLevels.push({ price, probability });
        }
        
        // Calculate mean for this time step (for the channel visualization)
        const mean = priceLevels.reduce((acc, level) => acc + level.price * level.probability, 0);
        const variance = priceLevels.reduce((acc, level) => acc + Math.pow(level.price - mean, 2) * level.probability, 0);
        const sigma = Math.sqrt(variance);

        field.push({ time, priceLevels, mean, sigma });
    }

    // Calculate final summary from the t=7 distribution
    const lastTimeStep = field[field.length - 1];
    const mean = lastTimeStep.mean!;
    const sigma = lastTimeStep.sigma!;
    const peak = lastTimeStep.priceLevels.reduce((max, p) => p.probability > max.probability ? p : max, lastTimeStep.priceLevels[0]);
    
    let trend: 'BULLISH' | 'BEARISH' | 'RANGING' = 'RANGING';
    if (mean > lastCandle.close * 1.002) trend = 'BULLISH';
    else if (mean < lastCandle.close * 0.998) trend = 'BEARISH';
    
    const confidence = peak.probability * 100 * 2.5; // Scale for display

    const summary: QuantumPredictionSummary = {
        trend,
        target: mean,
        confidence: Math.min(100, confidence),
        sigma: sigma,
        range: {
            min: mean - sigma,
            max: mean + sigma,
        }
    };
    
    return { field, summary };
};


export default function TradingLab2Page() {
  const { toast } = useToast()
  const { isConnected } = useApi();
  
  const { baseAsset, quoteAsset, symbol, availableQuotes, handleBaseAssetChange, handleQuoteAssetChange } = useSymbolManager('lab2', 'BTC', 'USDT');
  const [interval, setInterval] = usePersistentState<string>("lab2-interval","1h");
  
  const [chartHeight, setChartHeight] = usePersistentState<number>('lab2-chart-height', 600);
  const [lineWidth, setLineWidth] = usePersistentState<number>('lab2-line-width', 2);
  const [showAnalysis, setShowAnalysis] = usePersistentState<boolean>('lab2-show-analysis', true);
  const [showQuantumField, setShowQuantumField] = usePersistentState<boolean>('lab2-show-quantum', true);
  const [chartType, setChartType] = usePersistentState<'candlestick' | 'line'>('lab2-chart-type', 'candlestick');
  const [scaleMode, setScaleMode] = usePersistentState<'linear' | 'logarithmic'>('lab2-scale-mode', 'linear');
  
  const [date, setDate] = usePersistentState<DateRange | undefined>('lab2-date-range', undefined);
  
  const [isClient, setIsClient] = useState(false)
  const [rawChartData, setRawChartData] = useState<HistoricalData[]>([]);
  const [chartDataWithAnalysis, setChartDataWithAnalysis] = useState<HistoricalData[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(null);
  const [liquidityEvents, setLiquidityEvents] = useState<LiquidityEvent[]>([]);
  const [liquidityTargets, setLiquidityTargets] = useState<LiquidityTarget[]>([]);
  const [quantumFieldData, setQuantumFieldData] = useState<QuantumFieldData[]>([]);
  const [predictionSummary, setPredictionSummary] = useState<QuantumPredictionSummary | null>(null);

  const [physicsConfig, setPhysicsChartConfig] = usePersistentState<PhysicsChartConfig>('lab2-physics-chart-config', {
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
  const [isQuantumCardOpen, setIsQuantumCardOpen] = usePersistentState<boolean>('lab2-quantum-card-open', true);
  
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

  const runFullAnalysis = useCallback(async (
    klineData: HistoricalData[], 
    bookData: OrderBookData | null
  ) => {
      if (klineData.length === 0) {
        setChartDataWithAnalysis([]);
        setLiquidityEvents([]);
        setLiquidityTargets([]);
        return;
      }
      
      let dataToProcess = JSON.parse(JSON.stringify(klineData)) as HistoricalData[];
      
      // Physics Analysis
      if (bookData) {
        const [pressureData, stiffnessData, imbalanceRatio] = await Promise.all([
            calculatePressure(dataToProcess, bookData.totalDepth),
            calculateStiffness(dataToProcess),
            calculateDepthImbalance(bookData)
        ]);
        
        // Merge the results. Since pressure & stiffness add a property to each candle,
        // we can just use the result of the last one.
        dataToProcess = stiffnessData.map((candle, index) => ({
            ...candle,
            pressure_depth: pressureData[index]?.pressure_depth,
            depth_imbalance_ratio: imbalanceRatio // Apply same ratio to all candles for now
        }));
      }

      // Liquidity Analysis
      const getDynamicParams = () => ({ lookaround: 10 }); // Simplified for this example
      try {
          const [grabEvents, targetEvents] = await Promise.all([
            findLiquidityGrabs(dataToProcess, { lookaround: 5, confirmationCandles: 3, maxLookahead: 50 }),
            findLiquidityTargets(dataToProcess, getDynamicParams().lookaround),
          ]);
          setLiquidityEvents(grabEvents);
          setLiquidityTargets(targetEvents);
      } catch (error) {
          console.error("Error analyzing liquidity:", error);
      }

      setChartDataWithAnalysis(dataToProcess);
  }, []);


  useEffect(() => {
    runFullAnalysis(rawChartData, orderBookData);
  }, [rawChartData, orderBookData, runFullAnalysis]);


  useEffect(() => {
    if (!isClient || !symbol || !quoteAsset) return;

    const fetchData = async () => {
        if (!isConnected) {
            setRawChartData([]);
            return;
        }
        setIsFetchingData(true);
        setRawChartData([]);
        setQuantumFieldData([]); // Clear old projection
        setPredictionSummary(null);
        toast({ title: "Fetching Market Data...", description: `Loading ${interval} data for ${symbol}.`});
        
        try {
            const klines = await getLatestKlinesByLimit(symbol, interval, 500); 
            setRawChartData(klines);
            toast({ title: "Data Loaded", description: `${klines.length} candles for ${symbol} are ready.` });
        } catch (error: any) {
            console.error("Failed to fetch historical data:", error);
            toast({
                title: "Failed to Load Data",
                description: error.message || "Could not retrieve historical data from Binance.",
                variant: "destructive"
            });
            setRawChartData([]);
        } finally {
            setIsFetchingData(false);
        }
    };

    fetchData();
  }, [symbol, quoteAsset, interval, isConnected, isClient, toast]);
  
  const handleOrderBookUpdate = useCallback((bookData: OrderBookData) => {
    setOrderBookData(bookData);
  }, []);

  const handleRunForecast = () => {
      if (rawChartData.length < 50) {
          toast({ title: "Not Enough Data", description: "At least 50 historical candles are needed to run a forecast.", variant: "destructive" });
          return;
      }
      const { field, summary } = generateMockQuantumField(rawChartData, interval);
      setQuantumFieldData(field);
      setPredictionSummary(summary);
      toast({ title: "Forecast Generated", description: "Quantum field simulation complete." });
  };
  
  const densityData = useMemo(() => {
      if (quantumFieldData.length === 0) return [];
      const lastTimeStep = quantumFieldData[quantumFieldData.length - 1];
      return lastTimeStep.priceLevels.map(level => ({
          price: level.price,
          probability: level.probability
      })).sort((a,b) => a.price - b.price);
  }, [quantumFieldData]);

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
                  data={chartDataWithAnalysis}
                  symbol={symbol}
                  interval={interval}
                  onIntervalChange={setInterval}
                  liquidityEvents={showAnalysis ? liquidityEvents : []}
                  liquidityTargets={showAnalysis ? liquidityTargets : []}
                  lineWidth={lineWidth}
                  showAnalysis={showAnalysis}
                  chartType={chartType}
                  scaleMode={scaleMode}
                  physicsConfig={physicsConfig}
                  quantumFieldData={showQuantumField ? quantumFieldData : []}
              />
            </div>
            <div onMouseDown={startChartResize} className="absolute bottom-0 left-0 w-full h-4 flex items-center justify-center cursor-ns-resize group">
                <GripHorizontal className="h-5 w-5 text-muted-foreground/30 transition-colors group-hover:text-primary" />
            </div>
          </div>
          <OrderBook 
            symbol={symbol}
            onUpdate={handleOrderBookUpdate}
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
                        <Select onValueChange={handleBaseAssetChange} value={baseAsset} disabled={anyLoading}><SelectTrigger id="base-asset"><SelectValue/></SelectTrigger>
                          <SelectContent>{topAssets.map(asset => (<SelectItem key={asset.ticker} value={asset.ticker}>{asset.ticker}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quote-asset">Quote</Label>
                        <Select onValueChange={handleQuoteAssetChange} value={quoteAsset} disabled={anyLoading || availableQuotes.length === 0}><SelectTrigger id="quote-asset"><SelectValue/></SelectTrigger>
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
                        <div className="flex items-center space-x-2"><Switch id="show-quantum-field" checked={showQuantumField} onCheckedChange={setShowQuantumField} /><Label htmlFor="show-quantum-field" className="flex-1 cursor-pointer font-semibold">Show Quantum Field</Label></div>
                    </div>
                    <Collapsible open={isPhysicsPanelsOpen} onOpenChange={setIsPhysicsPanelsOpen} className="p-3 border rounded-md bg-muted/50 space-y-4">
                      <CollapsibleTrigger asChild><div className="flex w-full items-center justify-between cursor-pointer"><Label className="flex-1 font-semibold">Physics Panels</Label><ChevronDown className={cn("h-4 w-4 transition-transform", isPhysicsPanelsOpen && "rotate-180")} /></div></CollapsibleTrigger>
                      <CollapsibleContent className="pt-4 space-y-3">
                          <div className="border-b -mx-3"></div>
                          <div className="pl-2 space-y-3 pt-2">
                            <div className="flex items-center space-x-2"><Switch id="show-depth" checked={physicsConfig.showDepth} onCheckedChange={(c) => handlePhysicsConfigChange('showDepth', c)} /><Label htmlFor="show-depth" className="flex-1 cursor-pointer text-muted-foreground">Depth Panel</Label></div>
                            <div className="flex items-center space-x-2"><Switch id="show-imbalance" checked={physicsConfig.showImbalance} onCheckedChange={(c) => handlePhysicsConfigChange('showImbalance', c)} /><Label htmlFor="show-imbalance" className="flex-1 cursor-pointer text-muted-foreground">Imbalance Panel</Label></div>
                            <div className="flex items-center space-x-2"><Switch id="show-stiffness" checked={physicsConfig.showStiffness} onCheckedChange={(c) => handlePhysicsConfigChange('showStiffness', c)} /><Label htmlFor="show-stiffness" className="flex-1 cursor-pointer text-muted-foreground">Stiffness Panel</Label></div>
                            <div className="flex items-center space-x-2"><Switch id="show-pressure" checked={physicsConfig.showPressure} onCheckedChange={(c) => handlePhysicsConfigChange('showPressure', c)} /><Label htmlFor="show-pressure" className="flex-1 cursor-pointer text-muted-foreground">Pressure Panel</Label></div>
                            <div className="flex items-center space-x-2"><Switch id="show-bpi" checked={physicsConfig.showBPI} onCheckedChange={(c) => handlePhysicsConfigChange('showBPI', c)} /><Label htmlFor="show-bpi" className="flex-1 cursor-pointer text-muted-foreground">BPI Panel</Label></div>
                            <div className="space-y-2 pt-2"><Label htmlFor="bpi-threshold">BPI Threshold</Label><Input id="bpi-threshold" type="number" step="0.1" value={physicsConfig.bpiThreshold} onChange={(e) => handlePhysicsConfigChange('bpiThreshold', parseFloat(e.target.value) || 0)} /></div>
                          </div>
                      </CollapsibleContent>
                    </Collapsible>
                    <div className="space-y-2"><Label htmlFor="line-width">Line Thickness</Label><Slider id="line-width" min={1} max={5} step={1} value={[lineWidth]} onValueChange={(v) => setLineWidth(v[0])}/></div>
                  </CardContent>
                </CollapsibleContent>
            </Collapsible>
          </Card>
          <Card>
              <Collapsible open={isQuantumCardOpen} onOpenChange={setIsQuantumCardOpen}>
                  <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                          <CardTitle>Quantum Market Forecaster</CardTitle>
                          <CardDescription>Forward-looking probability map of future price action.</CardDescription>
                      </div>
                      <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronDown className={cn("h-4 w-4 transition-transform", isQuantumCardOpen && "rotate-180")} />
                          </Button>
                      </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                      <CardContent className="space-y-6">
                           <div>
                              <Label className="text-xs text-muted-foreground">Prediction Summary</Label>
                              {predictionSummary ? (
                                <div className="p-4 rounded-lg bg-muted/50 border space-y-3 mt-1">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Probable Trend</span>
                                        <span className={cn("flex items-center gap-2 font-semibold", 
                                          predictionSummary.trend === 'BULLISH' && 'text-green-500',
                                          predictionSummary.trend === 'BEARISH' && 'text-red-500',
                                        )}>
                                            {predictionSummary.trend}
                                            {predictionSummary.trend === 'BULLISH' && <ArrowUp className="h-4 w-4" />}
                                            {predictionSummary.trend === 'BEARISH' && <ArrowDown className="h-4 w-4" />}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Price Target (μ)</span>
                                        <span className="font-semibold font-mono">${formatPrice(predictionSummary.target)}</span>
                                    </div>
                                     <div className="flex justify-between items-center">
                                        <span className="font-medium">1-Sigma Range (68%)</span>
                                        <span className="font-semibold font-mono text-xs">${formatPrice(predictionSummary.range.min)} - ${formatPrice(predictionSummary.range.max)}</span>
                                    </div>
                                     <div className="flex justify-between items-center">
                                        <span className="font-medium">Accuracy (σ)</span>
                                        <span className="font-semibold font-mono">${predictionSummary.sigma.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">Confidence</span>
                                        <span className="font-semibold">{predictionSummary.confidence.toFixed(1)}%</span>
                                    </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-40 text-muted-foreground border border-dashed rounded-md">
                                    <p>Run a forecast to see the summary.</p>
                                </div>
                              )}
                          </div>

                          <div>
                              <Label className="text-xs text-muted-foreground">Probability Density at t=7</Label>
                              <div className="h-40 mt-1">
                                {densityData.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={densityData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                                          <Bar dataKey="probability" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}/>
                                          <XAxis dataKey="price" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`} />
                                          <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}/>
                                      </BarChart>
                                  </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground border border-dashed rounded-md">
                                        <p>Run forecast for density graph.</p>
                                    </div>
                                )}
                              </div>
                          </div>
                      </CardContent>
                      <CardFooter>
                          <Button className="w-full" disabled={anyLoading || !isConnected} onClick={handleRunForecast}>
                            <Play className="mr-2 h-4 w-4" />
                            Run Forecast
                          </Button>
                      </CardFooter>
                  </CollapsibleContent>
              </Collapsible>
          </Card>
        </div>
      </div>
    </div>
  )
}
