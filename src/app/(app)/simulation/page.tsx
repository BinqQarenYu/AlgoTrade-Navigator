
"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
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
import { Terminal, Bot, Play, StopCircle, Loader2, BrainCircuit, Activity, ChevronDown, RotateCcw, GripHorizontal, TestTube, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HistoricalData, SimulatedPosition, LiquidityEvent, LiquidityTarget, SimulatedTrade, BacktestResult, DisciplineParams } from "@/lib/types"
import { Switch } from "@/components/ui/switch"
import { topAssets } from "@/lib/assets"
import { strategyMetadatas, getStrategyById, strategyIndicatorMap } from "@/lib/strategies"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { BacktestResults } from "@/components/backtest-results"
import { formatPrice } from "@/lib/utils"
import { findLiquidityGrabs, findLiquidityTargets } from "@/lib/analysis/liquidity-analysis"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { useSymbolManager } from "@/hooks/use-symbol-manager"
import { DisciplineSettings } from "@/components/trading-discipline/DisciplineSettings"
import { defaultSmaCrossoverParams } from "@/lib/strategies/sma-crossover" // For default discipline
import { useDataManager } from "@/context/data-manager-context"

const OpenPositionsCard = ({
    positions,
    onSelectPosition,
    selectedPositionId
}: {
    positions: SimulatedPosition[],
    onSelectPosition: (pos: SimulatedPosition) => void,
    selectedPositionId?: string | null,
}) => {
    const [isOpen, setIsOpen] = usePersistentState('sim-positions-open', true);

    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Open Simulated Positions</CardTitle>
                        <CardDescription>Positions currently active in the simulation. Click to view on chart.</CardDescription>
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
                                        <TableRow
                                            key={pos.id}
                                            onClick={() => onSelectPosition(pos)}
                                            className={cn(
                                                "cursor-pointer hover:bg-muted/80",
                                                selectedPositionId === pos.id && "bg-primary/20 hover:bg-primary/20"
                                            )}
                                        >
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
  const { getChartData, isLoading: isFetchingData, error: dataError } = useDataManager();
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
  
  const { symbol, baseAsset, quoteAsset, availableQuotes, handleBaseAssetChange, handleQuoteAssetChange } = useSymbolManager('sim', 'BTC', 'USDT');
  const [selectedStrategy, setSelectedStrategy] = usePersistentState<string>('sim-strategy', strategyMetadatas[0].id);
  const [interval, setInterval] = usePersistentState<string>('sim-interval', "1m");
  const [initialCapital, setInitialCapital] = usePersistentState<number>('sim-initial-capital', 100);
  const [leverage, setLeverage] = usePersistentState<number>('sim-leverage', 10);
  const [takeProfit, setTakeProfit] = usePersistentState<number>('sim-tp', 1.5);
  const [stopLoss, setStopLoss] = usePersistentState<number>('sim-sl', 1);
  const [fee] = usePersistentState<number>('sim-fee', 0.04);
  const [useReverseLogic, setUseReverseLogic] = usePersistentState<boolean>('sim-reverse-logic', false);
  const [chartHeight, setChartHeight] = usePersistentState<number>('sim-chart-height', 600);

  // Local chart data management
  const [rawChartData, setRawChartData] = useState<HistoricalData[]>([]);
  const [chartDataWithIndicators, setChartDataWithIndicators] = useState<HistoricalData[]>([]);

  // Analysis State
  const [showAnalysis, setShowAnalysis] = usePersistentState<boolean>('sim-show-analysis', true);
  const [liquidityEvents, setLiquidityEvents] = useState<LiquidityEvent[]>([]);
  const [liquidityTargets, setLiquidityTargets] = useState<LiquidityTarget[]>([]);
  
  // State for selections
  const [selectedTrade, setSelectedTrade] = useState<SimulatedTrade | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<SimulatedPosition | null>(null);

  // Collapsible states
  const [isControlsOpen, setControlsOpen] = usePersistentState<boolean>('sim-controls-open', true);
  const [isDisciplineOpen, setDisciplineOpen] = usePersistentState<boolean>('sim-discipline-open', false);
  
  const handleSelectTrade = (trade: SimulatedTrade) => {
    setSelectedTrade(trade);
    setSelectedPosition(null);
  };

  const handleSelectPosition = (position: SimulatedPosition) => {
    setSelectedPosition(position);
    setSelectedTrade(null);
  };
  
  const highlightedTradeForChart = useMemo<BacktestResult | null>(() => {
    if (selectedTrade) {
      return selectedTrade;
    }
    if (selectedPosition) {
      // Convert SimulatedPosition to a BacktestResult-like object for the chart
      const lastTime = chartDataWithIndicators.length > 0 ? chartDataWithIndicators[chartDataWithIndicators.length - 1].time : selectedPosition.entryTime;
      const lastClose = chartDataWithIndicators.length > 0 ? chartDataWithIndicators[chartDataWithIndicators.length - 1].close : selectedPosition.entryPrice;
      const pnl = selectedPosition.side === 'long' 
        ? (lastClose - selectedPosition.entryPrice) * selectedPosition.size
        : (selectedPosition.entryPrice - lastClose) * selectedPosition.size;
      
      return {
        id: selectedPosition.id,
        type: selectedPosition.side,
        entryTime: selectedPosition.entryTime,
        entryPrice: selectedPosition.entryPrice,
        exitTime: lastTime, // Highlight up to the latest candle
        exitPrice: lastClose,
        pnl: pnl,
        pnlPercent: 0, // Not relevant for this temporary object
        closeReason: 'signal', // placeholder
        stopLoss: selectedPosition.stopLoss,
        takeProfit: selectedPosition.takeProfit,
        fee: 0,
      };
    }
    return null;
  }, [selectedTrade, selectedPosition, chartDataWithIndicators]);

  const startChartResize = useCallback((mouseDownEvent: React.MouseEvent<HTMLDivElement>) => {
    mouseDownEvent.preventDefault();
    const startHeight = chartHeight;
    const startPosition = mouseDownEvent.clientY;
    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const newHeight = startHeight + mouseMoveEvent.clientY - startPosition;
      if (newHeight >= 400 && newHeight <= 800) setChartHeight(newHeight);
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
  
  const refreshChartAnalysis = useCallback(async (currentChartData: HistoricalData[]) => {
    if (!showAnalysis || currentChartData.length < 20) {
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
  }, [interval, showAnalysis]);

  useEffect(() => {
    if (chartDataWithIndicators.length > 0) {
      refreshChartAnalysis(chartDataWithIndicators);
    }
  }, [chartDataWithIndicators, refreshChartAnalysis]);

  // Effect to calculate and display indicators when data or strategy changes
  useEffect(() => {
    if (isRunning) {
        setChartDataWithIndicators(botChartData);
        return;
    }
    const calculateAndSetIndicators = async () => {
      if (rawChartData.length === 0) {
        setChartDataWithIndicators([]);
        return;
      }
      
      const strategy = getStrategyById(selectedStrategy);
      if (strategy) {
          const paramsForStrategy = strategyParams[selectedStrategy] || {};
          const calculatedData = await strategy.calculate(rawChartData, paramsForStrategy, symbol);
          setChartDataWithIndicators(calculatedData);
      } else {
          setChartDataWithIndicators(rawChartData);
      }
    };
    calculateAndSetIndicators();
  }, [rawChartData, selectedStrategy, strategyParams, isRunning, botChartData, symbol]);

  const handleDisciplineParamChange = (paramName: keyof DisciplineParams, value: any) => {
    setStrategyParams(prev => ({
      ...prev,
      [selectedStrategy]: {
        ...(prev[selectedStrategy] || {}),
        discipline: {
          ...(prev[selectedStrategy]?.discipline || defaultSmaCrossoverParams.discipline),
          [paramName]: value
        }
      }
    }));
  };

  useEffect(() => {
    if (isRunning) return;

    const fetchData = async () => {
        const data = await getChartData(symbol, interval);
        if (data) {
            setRawChartData(data);
        }
    };

    fetchData();
  }, [symbol, interval, isRunning, getChartData]);
  
  useEffect(() => {
    if (dataError) {
        toast({
            title: "Failed to Load Data",
            description: dataError,
            variant: "destructive"
        });
    }
  }, [dataError, toast]);

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
            strategyParams: { ...(strategyParams[selectedStrategy] || {}), reverse: useReverseLogic },
            initialCapital, leverage, takeProfit, stopLoss, useAIPrediction: false, fee
        });
    }
  }

  const anyLoading = isFetchingData;

  return (
    <div className="space-y-6">
      <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <TestTube size={32}/> Paper Trading Simulation
          </h1>
          <p className="text-muted-foreground mt-2">
              Forward-test your strategies against a live market data feed using simulated funds.
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
            <AlertTitle>Trading Session Active</AlertTitle>
            <AlertDescription>
                Paper Trading is disabled to prioritize an active trading session.
            </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 relative pb-4">
          <div className="flex flex-col" style={{ height: `${chartHeight}px` }}>
              <TradingChart 
                data={chartDataWithIndicators} 
                symbol={symbol} 
                interval={interval} 
                liquidityEvents={liquidityEvents}
                liquidityTargets={liquidityTargets}
                showAnalysis={showAnalysis}
                highlightedTrade={highlightedTradeForChart}
              />
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
                      <Select onValueChange={handleBaseAssetChange} value={baseAsset} disabled={isRunning}><SelectTrigger id="base-asset"><SelectValue /></SelectTrigger>
                        <SelectContent>{topAssets.map(asset => (<SelectItem key={asset.ticker} value={asset.ticker}>{asset.ticker}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="quote-asset">Quote</Label>
                      <Select onValueChange={handleQuoteAssetChange} value={quoteAsset} disabled={isRunning}><SelectTrigger id="quote-asset"><SelectValue /></SelectTrigger>
                        <SelectContent>{availableQuotes.map(asset => (<SelectItem key={asset} value={asset}>{asset}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="strategy">Strategy</Label>
                    <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={isRunning}><SelectTrigger id="strategy"><SelectValue /></SelectTrigger>
                      <SelectContent>{strategyMetadatas.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="interval">Interval</Label>
                    <Select onValueChange={setInterval} value={interval} disabled={isRunning}>
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
                  
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><Label htmlFor="initial-capital">Initial Capital ($)</Label><Input id="initial-capital" type="number" value={initialCapital} onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)} disabled={isRunning}/></div>
                    <div><Label htmlFor="leverage">Leverage (x)</Label><Input id="leverage" type="number" min="1" value={leverage} onChange={(e) => setLeverage(parseInt(e.target.value, 10) || 1)} disabled={isRunning}/></div>
                    <div><Label htmlFor="fee">Fee (%)</Label><Input id="fee" type="number" value={fee} disabled={true}/></div>
                    <div><Label htmlFor="take-profit">Take Profit (%)</Label><Input id="take-profit" type="number" value={takeProfit} onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)} disabled={isRunning}/></div>
                    <div><Label htmlFor="stop-loss">Stop Loss (%)</Label><Input id="stop-loss" type="number" value={stopLoss} onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)} disabled={isRunning}/></div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2"><Switch id="reverse-logic" checked={useReverseLogic} onCheckedChange={setUseReverseLogic} disabled={isRunning} /><Label htmlFor="reverse-logic">Reverse Logic (Contrarian Mode)</Label></div>
                  <div className="flex items-center space-x-2 pt-2"><Switch id="show-analysis" checked={showAnalysis} onCheckedChange={setShowAnalysis} /><Label htmlFor="show-analysis">Show Liquidity Analysis</Label></div>
                  
                  <DisciplineSettings
                    params={strategyParams[selectedStrategy]?.discipline || defaultSmaCrossoverParams.discipline}
                    onParamChange={handleDisciplineParamChange}
                    isCollapsed={isDisciplineOpen}
                    onCollapseChange={setDisciplineOpen}
                    isDisabled={isRunning}
                  />
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
          
          <BacktestResults 
            results={tradeHistory} 
            summary={summary} 
            onSelectTrade={handleSelectTrade}
            selectedTradeId={selectedTrade?.id}
          />
          <OpenPositionsCard 
            positions={openPositions} 
            onSelectPosition={handleSelectPosition} 
            selectedPositionId={selectedPosition?.id}
          />
          
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
