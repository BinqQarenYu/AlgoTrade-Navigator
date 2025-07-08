
"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { TradingChart } from "@/components/trading-chart"
import { getHistoricalKlines, getLatestKlinesByLimit } from "@/lib/binance-service"
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
import { Terminal, Bot, Play, StopCircle, Loader2, BrainCircuit, Activity, ChevronDown, RotateCcw, GripHorizontal, TestTube } from "lucide-react"
import { cn } from "@/lib/utils"
import { addDays } from "date-fns"
import type { HistoricalData, SimulatedPosition } from "@/lib/types"
import { Switch } from "@/components/ui/switch"
import { topAssets, getAvailableQuotesForBase } from "@/lib/assets"
import { strategyMetadatas, getStrategyById } from "@/lib/strategies"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { BacktestResults } from "@/components/backtest-results"
import { formatPrice } from "@/lib/utils"

import { defaultAwesomeOscillatorParams } from "@/lib/strategies/awesome-oscillator"
import { defaultBollingerBandsParams } from "@/lib/strategies/bollinger-bands"
import { defaultCciReversionParams } from "@/lib/strategies/cci-reversion"
import { defaultChaikinMoneyFlowParams } from "@/lib/strategies/chaikin-money-flow"
import { defaultCoppockCurveParams } from "@/lib/strategies/coppock-curve"
import { defaultDonchianChannelsParams } from "@/lib/strategies/donchian-channels"
import { defaultElderRayIndexParams } from "@/lib/strategies/elder-ray-index"
import { defaultEmaCrossoverParams } from "@/lib/strategies/ema-crossover"
import { defaultHyperPFFParams } from "@/lib/strategies/hyper-peak-formation"
import { defaultIchimokuCloudParams } from "@/lib/strategies/ichimoku-cloud"
import { defaultKeltnerChannelsParams } from "@/lib/strategies/keltner-channels"
import { defaultMacdCrossoverParams } from "@/lib/strategies/macd-crossover"
import { defaultMomentumCrossParams } from "@/lib/strategies/momentum-cross"
import { defaultObvDivergenceParams } from "@/lib/strategies/obv-divergence"
import { defaultParabolicSarFlipParams } from "@/lib/strategies/parabolic-sar-flip"
import { defaultPffParams } from "@/lib/strategies/peak-formation-fib"
import { defaultPivotPointReversalParams } from "@/lib/strategies/pivot-point-reversal"
import { defaultReversePffParams } from "@/lib/strategies/reverse-pff"
import { defaultRsiDivergenceParams } from "@/lib/strategies/rsi-divergence"
import { defaultSmaCrossoverParams } from "@/lib/strategies/sma-crossover"
import { defaultStochasticCrossoverParams } from "@/lib/strategies/stochastic-crossover"
import { defaultSupertrendParams } from "@/lib/strategies/supertrend"
import { defaultVolumeDeltaParams } from "@/lib/strategies/volume-profile-delta"
import { defaultVwapCrossParams } from "@/lib/strategies/vwap-cross"
import { defaultWilliamsRParams } from "@/lib/strategies/williams-percent-r"
import { defaultLiquidityGrabParams } from "@/lib/strategies/liquidity-grab"
import { defaultLiquidityOrderFlowParams } from "@/lib/strategies/liquidity-order-flow"

const DEFAULT_PARAMS_MAP: Record<string, any> = {
    'awesome-oscillator': defaultAwesomeOscillatorParams,
    'bollinger-bands': defaultBollingerBandsParams,
    'cci-reversion': defaultCciReversionParams,
    'chaikin-money-flow': defaultChaikinMoneyFlowParams,
    'coppock-curve': defaultCoppockCurveParams,
    'donchian-channels': defaultDonchianChannelsParams,
    'elder-ray-index': defaultElderRayIndexParams,
    'ema-crossover': defaultEmaCrossoverParams,
    'hyper-peak-formation': defaultHyperPFFParams,
    'ichimoku-cloud': defaultIchimokuCloudParams,
    'keltner-channels': defaultKeltnerChannelsParams,
    'macd-crossover': defaultMacdCrossoverParams,
    'momentum-cross': defaultMomentumCrossParams,
    'obv-divergence': defaultObvDivergenceParams,
    'parabolic-sar-flip': defaultParabolicSarFlipParams,
    'peak-formation-fib': defaultPffParams,
    'pivot-point-reversal': defaultPivotPointReversalParams,
    'reverse-pff': defaultReversePffParams,
    'rsi-divergence': defaultRsiDivergenceParams,
    'sma-crossover': defaultSmaCrossoverParams,
    'stochastic-crossover': defaultStochasticCrossoverParams,
    'supertrend': defaultSupertrendParams,
    'volume-delta': defaultVolumeDeltaParams,
    'vwap-cross': defaultVwapCrossParams,
    'williams-r': defaultWilliamsRParams,
    'liquidity-grab': defaultLiquidityGrabParams,
    'liquidity-order-flow': defaultLiquidityOrderFlowParams,
}

const usePersistentState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        if (isMounted) {
          setState(JSON.parse(item));
        }
      }
    } catch (e) {
      console.error('Failed to parse stored state', e);
    } finally {
      if (isMounted) {
        setIsHydrated(true);
      }
    }
    return () => { isMounted = false; };
  }, [key]);

  useEffect(() => {
    if (isHydrated) {
      window.localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state, isHydrated]);

  return [isHydrated ? state : defaultValue, setState];
};

const OpenPositionsCard = ({ positions }: { positions: SimulatedPosition[] }) => {
    const [isOpen, setIsOpen] = usePersistentState('sim-positions-open', true);

    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Open Simulated Positions</CardTitle>
                        <CardDescription>Positions currently active in the simulation.</CardDescription>
                    </div>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Symbol</TableHead>
                                    <TableHead>Side</TableHead>
                                    <TableHead>Entry Price</TableHead>
                                    <TableHead className="text-right">Size</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {positions.length > 0 ? (
                                    positions.map((pos) => (
                                        <TableRow key={pos.id}>
                                            <TableCell>{pos.asset}</TableCell>
                                            <TableCell>
                                                <Badge variant={pos.side === 'long' ? "default" : "destructive"}>
                                                    {pos.side.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>${formatPrice(pos.entryPrice)}</TableCell>
                                            <TableCell className="text-right">{pos.size.toFixed(5)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            No open positions.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
};

export default function SimulationPage() {
  const { toast } = useToast()
  const { isConnected } = useApi();
  const { 
    simulationState, 
    startSimulation, 
    stopSimulation,
    isTradingActive,
    strategyParams,
    setStrategyParams,
  } = useBot();

  const { isRunning, logs, portfolio, openPositions, tradeHistory, summary } = simulationState;
  const botChartData = simulationState.chartData;
  
  // Local state for configuration UI
  const [baseAsset, setBaseAsset] = usePersistentState<string>('sim-base-asset', "BTC");
  const [quoteAsset, setQuoteAsset] = usePersistentState<string>('sim-quote-asset', "USDT");
  const [availableQuotes, setAvailableQuotes] = useState<string[]>([]);
  const symbol = useMemo(() => `${baseAsset}${quoteAsset}`, [baseAsset, quoteAsset]);

  const [selectedStrategy, setSelectedStrategy] = usePersistentState<string>('sim-strategy', strategyMetadatas[0].id);
  const [interval, setInterval] = usePersistentState<string>('sim-interval', "1m");
  const [initialCapital, setInitialCapital] = usePersistentState<number>('sim-initial-capital', 100);
  const [leverage, setLeverage] = usePersistentState<number>('sim-leverage', 10);
  const [takeProfit, setTakeProfit] = usePersistentState<number>('sim-tp', 1.5);
  const [stopLoss, setStopLoss] = usePersistentState<number>('sim-sl', 1);
  const [fee] = usePersistentState<number>('sim-fee', 0.04);
  const [useAIPrediction, setUseAIPrediction] = usePersistentState<boolean>('sim-ai-prediction', false);
  const [chartHeight, setChartHeight] = usePersistentState<number>('sim-chart-height', 600);

  // Local chart data management
  const [chartData, setChartData] = useState<HistoricalData[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Collapsible states
  const [isControlsOpen, setControlsOpen] = usePersistentState<boolean>('sim-controls-open', true);
  const [isParamsOpen, setParamsOpen] = usePersistentState<boolean>('sim-params-open', false);
  
  const handleParamChange = (strategyId: string, paramName: string, value: string) => {
    const parsedValue = value.includes('.') ? parseFloat(value) : parseInt(value, 10);
    setStrategyParams(prev => ({
        ...prev,
        [strategyId]: { ...prev[strategyId], [paramName]: isNaN(parsedValue) ? 0 : parsedValue }
    }));
  };
  
  const handleResetParams = () => {
    const defaultParams = DEFAULT_PARAMS_MAP[selectedStrategy];
    if (defaultParams) {
        setStrategyParams(prev => ({...prev, [selectedStrategy]: defaultParams}));
        toast({ title: "Parameters Reset", description: `The parameters for ${getStrategyById(selectedStrategy)?.name} have been reset.`});
    }
  }

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
      document.body.style.userSelect = 'auto';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, { once: true });
  }, [chartHeight, setChartHeight]);
  
  useEffect(() => {
    setIsClient(true)
  }, []);

  useEffect(() => {
    if (isRunning) {
      setChartData(botChartData);
    }
  }, [isRunning, botChartData]);

  useEffect(() => {
    if (!isClient || !isConnected || isRunning || !symbol) {
        if (!isRunning) setChartData([]);
        return;
    }

    const fetchData = async () => {
        setIsFetchingData(true);
        setChartData([]);
        toast({ title: "Fetching Market Data...", description: `Loading ${interval} data for ${symbol}.`});
        try {
            const from = addDays(new Date(), -1).getTime();
            const to = new Date().getTime();
            const klines = await getLatestKlinesByLimit(symbol, interval, 500);
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
  }, [symbol, interval, isConnected, isClient, toast, isRunning]);

  useEffect(() => {
    const quotes = getAvailableQuotesForBase(baseAsset);
    setAvailableQuotes(quotes);
    if (!quotes.includes(quoteAsset)) setQuoteAsset(quotes[0] || '');
  }, [baseAsset, quoteAsset, setQuoteAsset]);

  const handleBotToggle = async () => {
    if (isRunning) {
        stopSimulation();
    } else {
        if (selectedStrategy === 'none') {
            toast({ title: "No Strategy Selected", description: "Please select a strategy to run the simulation.", variant: "destructive"});
            return;
        }
        if (!isConnected) {
            toast({ title: "Cannot start simulation", description: "Please connect to the API first.", variant: "destructive"});
            return;
        }
        startSimulation({
            symbol, interval, strategy: selectedStrategy,
            strategyParams: strategyParams[selectedStrategy],
            initialCapital, leverage, takeProfit, stopLoss, useAIPrediction, fee
        });
    }
  }

  const renderParameterControls = () => {
    const params = strategyParams[selectedStrategy];
    if (!params) return <p className="text-sm text-muted-foreground">This strategy has no tunable parameters.</p>;

    const controls = Object.entries(params).map(([key, value]) => (
      <div key={key} className="space-y-2">
        <Label htmlFor={key} className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
        <Input id={key} type="number" value={value as number} onChange={(e) => handleParamChange(selectedStrategy, key, e.target.value)}
          step={String(value).includes('.') ? '0.001' : '1'} disabled={isRunning}/>
      </div>
    ));

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">{controls}</div>
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
            {DEFAULT_PARAMS_MAP[selectedStrategy] && (
                <Button onClick={handleResetParams} disabled={isRunning} variant="secondary" className="w-full">
                    <RotateCcw className="mr-2 h-4 w-4" /> Reset to Default
                </Button>
            )}
        </div>
      </div>
    );
  };
  
  const anyLoading = isFetchingData;

  return (
    <div className="space-y-6">
      <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <TestTube size={32}/> Live Simulation
          </h1>
          <p className="text-muted-foreground mt-2">
              Forward-test your strategies against live market data using simulated funds.
          </p>
      </div>

      {!isConnected && (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>API Disconnected</AlertTitle>
            <AlertDescription>
                Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> to enable the live data feed for simulations.
            </AlertDescription>
        </Alert>
      )}
     {isTradingActive && !isRunning && (
        <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
            <Bot className="h-4 w-4" />
            <AlertTitle>Another Trading Session is Active</AlertTitle>
            <AlertDescription>
                Live Simulation is disabled to prioritize another active session.
            </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 relative pb-4">
          <div className="flex flex-col" style={{ height: `${chartHeight}px` }}>
              <TradingChart data={chartData} symbol={symbol} interval={interval} />
          </div>
          <div onMouseDown={startChartResize} className="absolute bottom-0 left-0 w-full h-4 flex items-center justify-center cursor-ns-resize group">
              <GripHorizontal className="h-5 w-5 text-muted-foreground/30 transition-colors group-hover:text-primary" />
          </div>
        </div>
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <Collapsible open={isControlsOpen} onOpenChange={setControlsOpen}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Bot/> Simulation Controls</CardTitle>
                  <CardDescription>Configure and manage your simulation.</CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isControlsOpen && "rotate-180")} />
                    </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="base-asset">Base</Label>
                      <Select onValueChange={setBaseAsset} value={baseAsset} disabled={isRunning}><SelectTrigger id="base-asset"><SelectValue /></SelectTrigger>
                        <SelectContent>{topAssets.map(asset => (<SelectItem key={asset.ticker} value={asset.ticker}>{asset.ticker}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="quote-asset">Quote</Label>
                      <Select onValueChange={setQuoteAsset} value={quoteAsset} disabled={isRunning || availableQuotes.length === 0}><SelectTrigger id="quote-asset"><SelectValue /></SelectTrigger>
                        <SelectContent>{availableQuotes.map(asset => (<SelectItem key={asset} value={asset}>{asset}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="strategy">Strategy</Label>
                      <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={isRunning}><SelectTrigger id="strategy"><SelectValue /></SelectTrigger>
                        <SelectContent>{strategyMetadatas.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="interval">Interval</Label>
                      <Select onValueChange={setInterval} value={interval} disabled={isRunning}><SelectTrigger id="interval"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1m">1m</SelectItem><SelectItem value="5m">5m</SelectItem><SelectItem value="15m">15m</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Collapsible open={isParamsOpen} onOpenChange={setParamsOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full"><BrainCircuit />Strategy Parameters<ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", isParamsOpen && "rotate-180")} /></Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-4 border rounded-md bg-muted/50 space-y-4">
                      {renderParameterControls()}
                    </CollapsibleContent>
                  </Collapsible>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><Label htmlFor="initial-capital">Initial Capital ($)</Label><Input id="initial-capital" type="number" value={initialCapital} onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)} disabled={isRunning}/></div>
                    <div><Label htmlFor="leverage">Leverage (x)</Label><Input id="leverage" type="number" min="1" value={leverage} onChange={(e) => setLeverage(parseInt(e.target.value, 10) || 1)} disabled={isRunning}/></div>
                    <div><Label htmlFor="fee">Fee (%)</Label><Input id="fee" type="number" value={fee} disabled={true}/></div>
                    <div><Label htmlFor="take-profit">Take Profit (%)</Label><Input id="take-profit" type="number" value={takeProfit} onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)} disabled={isRunning}/></div>
                    <div><Label htmlFor="stop-loss">Stop Loss (%)</Label><Input id="stop-loss" type="number" value={stopLoss} onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)} disabled={isRunning}/></div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2"><Switch id="ai-prediction" checked={useAIPrediction} onCheckedChange={setUseAIPrediction} disabled={isRunning} /><Label htmlFor="ai-prediction">Enable AI Validation</Label></div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={handleBotToggle} disabled={anyLoading || !isConnected || (isTradingActive && !isRunning)} variant={isRunning ? "destructive" : "default"}>
                    {anyLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isFetchingData ? "Fetching Data..." : isRunning ? <><StopCircle /> Stop Simulation</> : <><Play /> Start Simulation</>}
                  </Button>
                </CardFooter>
              </CollapsibleContent>
            </Collapsible>
          </Card>
          
          <BacktestResults results={tradeHistory} summary={summary} onSelectTrade={() => {}} />
          <OpenPositionsCard positions={openPositions} />
          
          <Card>
             <CardHeader>
                <CardTitle>Simulation Logs</CardTitle>
                <CardDescription>Status: {isRunning ? "Running" : "Idle"}</CardDescription>
             </CardHeader>
             <CardContent>
                <div className="bg-muted/50 p-3 rounded-md h-48 overflow-y-auto">
                    {logs.length > 0 ? (
                        <pre className="text-xs whitespace-pre-wrap font-mono">{logs.join('\n')}</pre>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground"><p>Logs will appear here.</p></div>
                    )}
                </div>
             </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
