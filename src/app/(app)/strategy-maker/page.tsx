
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/context/api-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, BrainCircuit, PlusCircle, Trash2, Save, X, GripHorizontal, ChevronDown, Recycle, Play, StopCircle, CheckCircle, Hourglass } from "lucide-react";
import type { DisciplineParams, HistoricalData, Strategy } from "@/lib/types";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { Switch } from "@/components/ui/switch";
import { DisciplineSettings } from "@/components/trading-discipline/DisciplineSettings";
import { availableIndicators, getIndicatorParams } from "@/lib/strategies/indicator-configs";
import { generateStrategy } from "@/ai/flows/generate-strategy-flow";
import { useSymbolManager } from "@/hooks/use-symbol-manager";
import { useDataManager } from "@/context/data-manager-context";
import { TradingChart } from "@/components/trading-chart";
import { strategies as allStrategies, strategyMetadatas } from "@/lib/strategies";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLab } from "@/context/lab-context";
import { topAssets } from "@/lib/assets";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { generateProjectedCandles } from "@/lib/projection-service";
import { Badge } from "@/components/ui/badge";

interface Rule {
  id: string;
  indicator1: string;
  condition: 'crosses_above' | 'crosses_below' | 'is_above' | 'is_below';
  value: string; // Can be another indicator name or a static value
}

interface StrategyConfig {
  name: string;
  description: string;
  indicators: Record<string, any>; // { indicatorId: { param1: value1 } }
  entryConditions: Rule[];
  exitConditions: Rule[];
  discipline: DisciplineParams;
  reverse: boolean;
}

const defaultDiscipline: DisciplineParams = {
  enableDiscipline: true,
  maxConsecutiveLosses: 4,
  cooldownPeriodMinutes: 15,
  dailyDrawdownLimit: 10,
  onFailure: 'Cooldown',
};

export default function StrategyMakerPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { canUseAi, consumeAiCredit, isConnected } = useApi();
  const { getChartData, isLoading: isFetchingData } = useDataManager();
  const { symbol, baseAsset, quoteAsset, availableQuotes, handleBaseAssetChange, handleQuoteAssetChange } = useSymbolManager('strategy-maker', 'BTC', 'USDT');
  const { strategyParams, setStrategyParams } = useLab();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isProjecting, setIsProjecting] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generatedStrategies, setGeneratedStrategies] = usePersistentState<any[]>('sm-generated-strategies', []);
  const generationAbortController = useRef<AbortController | null>(null);

  const [config, setConfig] = usePersistentState<StrategyConfig>('strategy-maker-config', {
    name: "My Custom Strategy",
    description: "A strategy created with the visual strategy maker.",
    indicators: {},
    entryConditions: [],
    exitConditions: [],
    discipline: defaultDiscipline,
    reverse: false,
  });

  // Chart related state
  const [chartData, setChartData] = useState<HistoricalData[]>([]);
  const [chartDataWithIndicators, setChartDataWithIndicators] = useState<HistoricalData[]>([]);
  const [interval, setInterval] = usePersistentState<string>('strategy-maker-interval', "1h");
  const [chartHeight, setChartHeight] = usePersistentState<number>('strategy-maker-chart-height', 600);
  const [isParamsOpen, setIsParamsOpen] = usePersistentState<boolean>('sm-params-open', false);
  const [isProjectionOpen, setIsProjectionOpen] = usePersistentState<boolean>('sm-projection-open', true);
  const [isApprovedOpen, setIsApprovedOpen] = usePersistentState<boolean>('sm-approved-open', false);
  const [isFinalizeOpen, setIsFinalizeOpen] = usePersistentState<boolean>('sm-finalize-open', true);
  const [projectedData, setProjectedData] = useState<HistoricalData[]>([]);
  
  // New state for live updates
  const [isStreamActive, setIsStreamActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Projection config
  const [projectionMode, setProjectionMode] = usePersistentState<'upward' | 'downward' | 'neutral' | 'random' | 'frankenstein'>('sm-projection-mode', 'frankenstein');
  const [projectionDuration, setProjectionDuration] = usePersistentState<'1d' | '3d' | '7d' | '1m'>('sm-projection-duration', '7d');

  // Fetch data for the chart
  useEffect(() => {
    if (!isConnected || !symbol || isStreamActive) {
        if (!isStreamActive) setChartData([]);
        return;
    }
    const fetchData = async () => {
        const data = await getChartData(symbol, interval);
        if (data) {
            setChartData(data);
        }
    };
    fetchData();
  }, [isConnected, symbol, interval, getChartData, isStreamActive]);
  
  // Combine historical and projected data for indicator calculation
  const combinedData = useMemo(() => {
    return [...chartData, ...projectedData];
  }, [chartData, projectedData]);

  // Calculate indicators for the chart when config or combined data changes
  useEffect(() => {
    const calculateIndicators = async () => {
      if (combinedData.length === 0) {
        setChartDataWithIndicators([]);
        return;
      }
      if (Object.keys(config.indicators).length === 0) {
        setChartDataWithIndicators(combinedData);
        return;
      }

      // Dynamically build a temporary strategy to calculate all selected indicators
      const tempStrategy: Strategy = {
        id: 'temp-visualizer',
        name: 'Temp Visualizer',
        description: '',
        calculate: async (data, params) => {
          let dataWithInd = JSON.parse(JSON.stringify(data));
          
          for (const indicatorId of Object.keys(params)) {
             // Find any strategy that implements the required indicator calculation
             const providingStrategy = allStrategies.find(s => {
                const indicatorName = indicatorId.split('_')[0];
                return s.id.includes(indicatorName);
             });

             if (providingStrategy) {
                // Combine the default params for the indicator with any user-overrides.
                const indicatorParams = { ...(getIndicatorParams(indicatorId)), ...params[indicatorId] };
                try {
                    dataWithInd = await providingStrategy.calculate(dataWithInd, indicatorParams, symbol);
                } catch (e) {
                    console.error(`Error calculating indicator ${indicatorId} via strategy ${providingStrategy.id}`, e);
                }
             }
          }
          return dataWithInd;
        }
      };
      
      const calculatedData = await tempStrategy.calculate(combinedData, config.indicators);
      setChartDataWithIndicators(calculatedData);
    };

    calculateIndicators();
  }, [combinedData, config.indicators, symbol]);

  // Effect for live data stream
  useEffect(() => {
    if (!isStreamActive || !symbol || !interval) {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        return;
    }

    wsRef.current = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`);

    wsRef.current.onopen = () => {
      toast({ title: "Live Updates Started", description: `Updating chart for ${symbol}.` });
    };

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.e !== 'kline') return;

      const klineData = message.k;
      const newCandle: HistoricalData = {
        time: klineData.t,
        open: parseFloat(klineData.o),
        high: parseFloat(klineData.h),
        low: parseFloat(klineData.l),
        close: parseFloat(klineData.c),
        volume: parseFloat(klineData.v),
      };

      setChartData(prevData => {
        const updatedData = [...prevData];
        const lastCandle = updatedData[updatedData.length - 1];
        if (lastCandle && lastCandle.time === newCandle.time) {
          updatedData[updatedData.length - 1] = newCandle;
        } else {
          updatedData.push(newCandle);
        }
        return updatedData.slice(-1000); // Keep buffer size manageable
      });
    };

    wsRef.current.onerror = () => {
      toast({ 
          title: "Stream Error",
          description: `Could not connect to live data for ${symbol}.`,
          variant: "destructive" 
      });
      setIsStreamActive(false);
    };
    
    const currentWs = wsRef.current;
    return () => {
      if (currentWs) {
        currentWs.close();
      }
    };
  }, [isStreamActive, symbol, interval, toast]);


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


  const handleConfigChange = <K extends keyof StrategyConfig>(field: K, value: StrategyConfig[K]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleAddIndicator = (indicatorId: string) => {
    if (!config.indicators[indicatorId]) {
      const defaultParams = getIndicatorParams(indicatorId);
      setConfig(prev => ({
        ...prev,
        indicators: { ...prev.indicators, [indicatorId]: defaultParams }
      }));
    }
  };

  const handleRemoveIndicator = (indicatorId: string) => {
    const newIndicators = { ...config.indicators };
    delete newIndicators[indicatorId];
    setConfig(prev => ({
      ...prev,
      indicators: newIndicators,
      entryConditions: prev.entryConditions.filter(r => r.indicator1 !== indicatorId && r.value !== indicatorId),
      exitConditions: prev.exitConditions.filter(r => r.indicator1 !== indicatorId && r.value !== indicatorId),
    }));
  };

  const handleIndicatorParamChange = (indicatorId: string, paramName: string, value: string) => {
    const parsedValue = String(value).includes('.') ? parseFloat(value) : parseInt(value, 10);
    setConfig(prev => ({
      ...prev,
      indicators: {
        ...prev.indicators,
        [indicatorId]: {
          ...prev.indicators[indicatorId],
          [paramName]: isNaN(parsedValue) ? 0 : parsedValue
        }
      }
    }));
  };
  
  const handleAddRule = (type: 'entry' | 'exit') => {
    const newRule: Rule = {
      id: `rule_${Date.now()}`,
      indicator1: '',
      condition: 'crosses_above',
      value: '0'
    };
    const key = type === 'entry' ? 'entryConditions' : 'exitConditions';
    setConfig(prev => ({ ...prev, [key]: [...prev[key], newRule] }));
  };
  
  const handleUpdateRule = (type: 'entry' | 'exit', ruleId: string, field: keyof Omit<Rule, 'id'>, value: string) => {
    const key = type === 'entry' ? 'entryConditions' : 'exitConditions';
    setConfig(prev => ({
      ...prev,
      [key]: prev[key].map(rule => rule.id === ruleId ? { ...rule, [field]: value } : rule)
    }));
  };

  const handleRemoveRule = (type: 'entry' | 'exit', ruleId: string) => {
    const key = type === 'entry' ? 'entryConditions' : 'exitConditions';
    setConfig(prev => ({ ...prev, [key]: prev[key].filter(rule => rule.id !== ruleId) }));
  };

  const handleGenerateStrategy = async () => {
    if (generationAbortController.current) return;
    if (!canUseAi()) {
      toast({ title: "AI Quota Reached", description: "Cannot generate strategy.", variant: "destructive" });
      return;
    }
    
    setIsGenerating(true);
    setGenerationStatus("Checking for duplicates...");
    generationAbortController.current = new AbortController();
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (generationAbortController.current.signal.aborted) throw new Error("Cancelled");
      
      const configString = JSON.stringify(config);
      const isDuplicate = generatedStrategies.some(s => s.config === configString);
      
      if (isDuplicate) {
        toast({ title: "Duplicate Strategy", description: "This exact configuration has already been approved." });
        setGenerationStatus("Duplicate found. Halting.");
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsGenerating(false);
        generationAbortController.current = null;
        return;
      }
      
      setGenerationStatus("Generating strategy code with AI...");
      consumeAiCredit();
      const generatedCode = await generateStrategy({ config: configString });
      
      if (generationAbortController.current.signal.aborted) throw new Error("Cancelled");
      
      // Override name with "Bingkl XXX"
      const strategyNumber = 101 + generatedStrategies.length;
      const newName = `Bingkl ${strategyNumber}`;
      const newFileName = `bingkl_${strategyNumber}_strategy.ts`;

      // Replace the name in the generated code as well. This is a simple string replacement.
      // A more robust solution might use an AST, but this is sufficient for a controlled template.
      const updatedCode = generatedCode.code.replace(
          `name: '${config.name}'`,
          `name: '${newName}'`
      );

      setGenerationStatus("Strategy approved and saved!");
      const newStrategy = {
        fileName: newFileName,
        code: updatedCode,
        config: configString,
        displayName: newName // Store the new display name
      };

      setGeneratedStrategies(prev => [...prev, newStrategy]);
      
      toast({ title: "Strategy Generated!", description: `The strategy "${newName}" is ready and has been added to the approved list.` });
      
      setTimeout(() => router.push('/backtest'), 1000);

    } catch (error: any) {
      if (error.message !== "Cancelled") {
        toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Generation Cancelled" });
      }
    } finally {
      setIsGenerating(false);
      setGenerationStatus(null);
      generationAbortController.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (generationAbortController.current) {
        generationAbortController.current.abort();
    }
  };

  const handleProjectAndTest = () => {
    if (chartData.length === 0) {
      toast({ title: "No Data", description: "Please load market data before projecting.", variant: "destructive" });
      return;
    }
    
    setIsProjecting(true);
    toast({ title: "Generating Projection..." });

    setTimeout(() => {
        try {
            const newProjectedCandles = generateProjectedCandles(chartData, projectionMode, projectionDuration, interval);
            setProjectedData(newProjectedCandles);
            toast({ title: "Projection Generated", description: "Forward testing your strategy on the new data." });
        } catch(e: any) {
            toast({ title: "Projection Failed", description: e.message, variant: "destructive" });
        } finally {
            setIsProjecting(false);
        }
    }, 50);
  };
  
  const renderRuleEditor = (type: 'entry' | 'exit') => {
    const rules = type === 'entry' ? config.entryConditions : config.exitConditions;
    const selectedIndicators = Object.keys(config.indicators);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">Step 2: Logic & Rules</CardTitle>
           <CardDescription>Define the rules for when to {type === 'entry' ? 'enter a buy or sell' : 'exit a position'}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.map(rule => (
            <div key={rule.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center p-2 border rounded-md bg-muted/50">
              <Select value={rule.indicator1} onValueChange={(val) => handleUpdateRule(type, rule.id, 'indicator1', val)}>
                <SelectTrigger><SelectValue placeholder="Indicator" /></SelectTrigger>
                <SelectContent>{selectedIndicators.map(id => <SelectItem key={id} value={id}>{availableIndicators[id]?.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={rule.condition} onValueChange={(val) => handleUpdateRule(type, rule.id, 'condition', val)}>
                <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="crosses_above">Crosses Above</SelectItem>
                    <SelectItem value="crosses_below">Crosses Below</SelectItem>
                    <SelectItem value="is_above">Is Above</SelectItem>
                    <SelectItem value="is_below">Is Below</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                placeholder="Value or Indicator..." 
                value={rule.value} 
                onChange={(e) => handleUpdateRule(type, rule.id, 'value', e.target.value)}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveRule(type, rule.id)}><Trash2/></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => handleAddRule(type)}><PlusCircle className="mr-2"/> Add {type === 'entry' ? 'Entry' : 'Exit'} Rule</Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
       <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <BrainCircuit size={32}/> Strategy Maker
          </h1>
          <p className="text-muted-foreground mt-2">
              Visually build, configure, and generate your own trading strategies with AI.
          </p>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
        <div className="xl:col-span-3 relative pb-4">
            <div className="flex flex-col" style={{ height: `${chartHeight}px` }}>
                <TradingChart 
                    data={chartDataWithIndicators.filter(d => !d.isProjected)} 
                    projectedData={chartDataWithIndicators.filter(d => d.isProjected)}
                    symbol={symbol} 
                    interval={interval}
                    onIntervalChange={setInterval}
                />
            </div>
            <div onMouseDown={startChartResize} className="absolute bottom-0 left-0 w-full h-4 flex items-center justify-center cursor-ns-resize group">
                <GripHorizontal className="h-5 w-5 text-muted-foreground/30 transition-colors group-hover:text-primary" />
            </div>
        </div>
        <div className="xl:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Step 1: General Configuration</CardTitle>
                    <CardDescription>Set the basic properties and select indicators to visualize and use in your logic.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="base-asset">Base</Label>
                          <Select onValueChange={handleBaseAssetChange} value={baseAsset} disabled={isGenerating}>
                            <SelectTrigger id="base-asset"><SelectValue/></SelectTrigger>
                            <SelectContent>
                              {topAssets.map(asset => (
                                <SelectItem key={asset.ticker} value={asset.ticker}>{asset.ticker}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quote-asset">Quote</Label>
                          <Select onValueChange={handleQuoteAssetChange} value={quoteAsset} disabled={isGenerating || availableQuotes.length === 0}>
                            <SelectTrigger id="quote-asset"><SelectValue/></SelectTrigger>
                            <SelectContent>
                              {availableQuotes.map(asset => (
                                <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="strategy-name">Strategy Name</Label>
                        <Input id="strategy-name" value={config.name} onChange={(e) => handleConfigChange('name', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="strategy-desc">Description</Label>
                        <Input id="strategy-desc" value={config.description} onChange={(e) => handleConfigChange('description', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label>Select Indicators</Label>
                        <Select onValueChange={handleAddIndicator}>
                            <SelectTrigger><SelectValue placeholder="Add an indicator to use..."/></SelectTrigger>
                            <SelectContent>
                                {Object.entries(availableIndicators).map(([id, {name}]) => (
                                    <SelectItem key={id} value={id} disabled={!!config.indicators[id]}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                      onClick={() => setIsStreamActive(prev => !prev)}
                      variant={isStreamActive ? "destructive" : "outline"}
                      className="w-full"
                      disabled={!isConnected}
                    >
                      {isStreamActive ? <StopCircle className="mr-2" /> : <Play className="mr-2" />}
                      {isStreamActive ? "Stop Live Updates" : "Start Live Updates"}
                    </Button>
                </CardContent>
            </Card>

            {Object.keys(config.indicators).length > 0 && (
                <Card>
                    <Collapsible open={isParamsOpen} onOpenChange={setIsParamsOpen}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Indicator Parameters</CardTitle>
                             <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", isParamsOpen && "rotate-180")} />
                                </Button>
                            </CollapsibleTrigger>
                        </CardHeader>
                        <CollapsibleContent>
                            <CardContent className="space-y-4">
                                {Object.entries(config.indicators).map(([id, params]) => (
                                    <div key={id} className="p-3 border rounded-md">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-semibold text-sm">{availableIndicators[id]?.name}</h4>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveIndicator(id)}><X/></Button>
                                        </div>
                                        {Object.keys(params).map(paramName => (
                                            <div key={paramName} className="flex items-center justify-between gap-4 my-1">
                                                <Label className="text-xs capitalize text-muted-foreground">{paramName.replace(/([A-Z])/g, ' $1').trim()}</Label>
                                                <Input
                                                    type="number"
                                                    value={params[paramName]}
                                                    onChange={(e) => handleIndicatorParamChange(id, paramName, e.target.value)}
                                                    className="h-8 w-24"
                                                    step={String(params[paramName]).includes('.') ? 0.01 : 1}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>
            )}

            <div className="space-y-6">
                {renderRuleEditor('entry')}
                {renderRuleEditor('exit')}
            </div>

            <Card>
              <Collapsible open={isProjectionOpen} onOpenChange={setIsProjectionOpen}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Step 3: Frankenstein Forward-Testing</CardTitle>
                    <CardDescription>Stress-test your logic against varied future-simulated data.</CardDescription>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isProjectionOpen && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <RadioGroup value={projectionMode} onValueChange={(v) => setProjectionMode(v as any)} className="grid grid-cols-2 gap-4" disabled={isProjecting}>
                        <div className="col-span-2"><RadioGroupItem value="frankenstein" id="frankenstein" /><Label htmlFor="frankenstein" className="ml-2 font-semibold">Frankenstein (Recommended)</Label></div>
                        <div><RadioGroupItem value="upward" id="upward" /><Label htmlFor="upward" className="ml-2">Upward Trend</Label></div>
                        <div><RadioGroupItem value="downward" id="downward" /><Label htmlFor="downward" className="ml-2">Downward Trend</Label></div>
                        <div><RadioGroupItem value="neutral" id="neutral" /><Label htmlFor="neutral" className="ml-2">Neutral</Label></div>
                        <div><RadioGroupItem value="random" id="random" /><Label htmlFor="random" className="ml-2">Random</Label></div>
                    </RadioGroup>
                    <div>
                        <Label>Projection Duration</Label>
                        <RadioGroup value={projectionDuration} onValueChange={(v) => setProjectionDuration(v as any)} className="grid grid-cols-4 gap-2 mt-2" disabled={isProjecting}>
                            <div><RadioGroupItem value="1d" id="1d" /><Label htmlFor="1d" className="ml-2">1D</Label></div>
                            <div><RadioGroupItem value="3d" id="3d" /><Label htmlFor="3d" className="ml-2">3D</Label></div>
                            <div><RadioGroupItem value="7d" id="7d" /><Label htmlFor="7d" className="ml-2">7D</Label></div>
                            <div><RadioGroupItem value="1m" id="1m" /><Label htmlFor="1m" className="ml-2">1M</Label></div>
                        </RadioGroup>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-2">
                    <Button className="w-full" onClick={handleProjectAndTest} disabled={isProjecting || chartData.length === 0}>
                        {isProjecting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                        {isProjecting ? 'Generating...' : 'Project & Test'}
                    </Button>
                    <Button className="w-full" variant="outline" onClick={() => setProjectedData([])} disabled={projectedData.length === 0 || isProjecting}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear Projection
                    </Button>
                  </CardFooter>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            <Card>
              <Collapsible open={isFinalizeOpen} onOpenChange={setIsFinalizeOpen}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Step 4: Finalize & Generate</CardTitle>
                     <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronDown className={cn("h-4 w-4 transition-transform", isFinalizeOpen && "rotate-180")} />
                        </Button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <DisciplineSettings 
                          params={config.discipline}
                          onParamChange={(key, value) => handleConfigChange('discipline', { ...config.discipline, [key]: value })}
                      />
                       <div className="flex items-center space-x-2 pt-4">
                          <Switch id="reverse" checked={config.reverse} onCheckedChange={(val) => handleConfigChange('reverse', val)} />
                          <Label htmlFor="reverse">Reverse (Contrarian) Mode</Label>
                      </div>
                      {isGenerating && (
                        <div className="flex items-center text-sm text-muted-foreground animate-pulse">
                            <Hourglass className="mr-2 h-4 w-4" />
                            <span>{generationStatus || "Starting generation..."}</span>
                        </div>
                      )}
                      {generatedStrategies.length > 0 && (
                          <div className="space-y-2">
                              <Label>Approved this session:</Label>
                               <div className="p-3 border rounded-md space-y-1">
                                {generatedStrategies.map(s => (
                                    <Badge key={s.fileName} variant="secondary">{s.displayName || s.fileName}</Badge>
                                ))}
                              </div>
                          </div>
                      )}
                  </CardContent>
                  <CardFooter>
                      {isGenerating ? (
                           <Button className="w-full" variant="destructive" onClick={handleStopGeneration}>
                                <StopCircle className="mr-2"/> Stop Generation
                           </Button>
                      ) : (
                          <Button className="w-full" onClick={handleGenerateStrategy} disabled={isGenerating}>
                              <Save className="mr-2"/> Generate & Save Strategy
                          </Button>
                      )}
                  </CardFooter>
              </Collapsible>
            </Card>

            <Card>
              <Collapsible open={isApprovedOpen} onOpenChange={setIsApprovedOpen}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Strategies Already Approved</CardTitle>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isApprovedOpen && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">A list of pre-built and validated strategies.</p>
                    <div className="p-3 border rounded-md max-h-48 overflow-y-auto">
                      <ul className="space-y-1">
                        {strategyMetadatas.slice(0, 10).map(strategy => ( // Show first 10 as an example
                          <li key={strategy.id} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>{strategy.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
        </div>
      </div>
    </div>
  );
}
