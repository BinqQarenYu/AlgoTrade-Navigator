

"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { TradingChart } from "@/components/trading-chart"
import { useDataManager } from "@/context/data-manager-context"
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
import { Loader2, Terminal, Bot, ChevronDown, BrainCircuit, Wand2, RotateCcw, GripHorizontal, GitCompareArrows, Play, Pause, StepForward, StepBack, History, CalendarIcon, Send, Trash2, TestTube, ShieldAlert, AreaChart, BarChart2, TrendingUp, DollarSign, Settings, ShieldCheck, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HistoricalData, BacktestResult, BacktestSummary, DisciplineParams, Trade } from "@/lib/types"
import { BacktestResults } from "@/components/backtest-results"
import { Switch } from "@/components/ui/switch"
import { predictMarket, PredictMarketOutput } from "@/ai/flows/predict-market-flow"
import { topAssets, getAvailableQuotesForBase } from "@/lib/assets"
import { strategyMetadatas, getStrategyById as getStaticStrategyById, strategyIndicatorMap } from "@/lib/strategies"
import { optimizationConfigs, StrategyOptimizationConfig } from "@/lib/strategies/optimization"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { DisciplineSettings } from "@/components/trading-discipline/DisciplineSettings"
import { RiskGuardian } from "@/lib/risk-guardian"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, addDays } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { detectOverfitting, type OverfittingResult } from "@/lib/analysis/overfitting-analysis"
import { generateProjectedCandles } from "@/lib/projection-service"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


// Import default parameters from all strategies to enable reset functionality
import { defaultAwesomeOscillatorParams } from "@/lib/strategies/awesome-oscillator"
import { defaultBollingerBandsParams } from "@/lib/strategies/bollinger-bands"
import { defaultCciReversionParams } from "@/lib/strategies/cci-reversion"
import { defaultChaikinMoneyFlowParams } from "@/lib/strategies/chaikin-money-flow"
import { defaultCoppockCurveParams } from "@/lib/strategies/coppock-curve"
import { defaultDonchianChannelsParams } from "@/lib/strategies/donchian-channels"
import { defaultElderRayIndexParams } from "@/lib/strategies/elder-ray-index"
import { defaultEmaCrossoverParams } from "@/lib/strategies/ema-crossover"
import { defaultHyperPFFParams } from "@/lib/strategies/hyper-peak-formation"
import { defaultOldHyperPFFParams } from "@/lib/strategies/hyper-peak-formation-old"
import { defaultIchimokuCloudParams } from "@/lib/strategies/ichimoku-cloud"
import { defaultKeltnerChannelsParams } from "@/lib/strategies/keltner-channels"
import { defaultMacdCrossoverParams } from "@/lib/strategies/macd-crossover"
import { defaultMomentumCrossParams } from "@/lib/strategies/momentum-cross"
import { defaultObvDivergenceParams } from "@/lib/strategies/obv-divergence"
import { defaultParabolicSarFlipParams } from "@/lib/strategies/parabolic-sar-flip"
import { defaultPffParams } from "@/lib/strategies/peak-formation-fib"
import { defaultPivotPointReversalParams } from "@/lib/strategies/pivot-point-reversal"
import { defaultRsiDivergenceParams } from "@/lib/strategies/rsi-divergence"
import { defaultSmaCrossoverParams } from "@/lib/strategies/sma-crossover"
import { defaultStochasticCrossoverParams } from "@/lib/strategies/stochastic-crossover"
import { defaultSupertrendParams } from "@/lib/strategies/supertrend"
import { defaultVolumeDeltaParams } from "@/lib/strategies/volume-delta"
import { defaultVwapCrossParams } from "@/lib/strategies/vwap-cross"
import { defaultWilliamsRParams } from "@/lib/strategies/williams-percent-r"
import { defaultLiquidityGrabParams } from "@/lib/strategies/liquidity-grab"
import { defaultLiquidityOrderFlowParams } from "@/lib/strategies/liquidity-order-flow"
import { defaultEmaCciMacdParams } from "@/lib/strategies/ema-cci-macd"
import { defaultCodeBasedConsensusParams } from "@/lib/strategies/code-based-consensus"
import { defaultMtfEngulfingParams } from "@/lib/strategies/mtf-engulfing"
import { defaultSmiMfiSupertrendParams } from "@/lib/strategies/smi-mfi-supertrend"
import { defaultSmiMfiScalpParams } from "@/lib/strategies/smi-mfi-scalp"
import { defaultOrderFlowScalpParams } from "@/lib/strategies/order-flow-scalp"
import { defaultForcedActionScalpParams } from "@/lib/strategies/forced-action-scalp"
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface DateRange {
  from?: Date;
  to?: Date;
}


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
    'hyper-peak-formation-old': defaultOldHyperPFFParams,
    'ichimoku-cloud': defaultIchimokuCloudParams,
    'keltner-channels': defaultKeltnerChannelsParams,
    'macd-crossover': defaultMacdCrossoverParams,
    'momentum-cross': defaultMomentumCrossParams,
    'obv-divergence': defaultObvDivergenceParams,
    'parabolic-sar-flip': defaultParabolicSarFlipParams,
    'peak-formation-fib': defaultPffParams,
    'pivot-point-reversal': defaultPivotPointReversalParams,
    'rsi-divergence': defaultRsiDivergenceParams,
    'sma-crossover': defaultSmaCrossoverParams,
    'stochastic-crossover': defaultStochasticCrossoverParams,
    'supertrend': defaultSupertrendParams,
    'volume-delta': defaultVolumeDeltaParams,
    'vwap-cross': defaultVwapCrossParams,
    'williams-r': defaultWilliamsRParams,
    'liquidity-grab': defaultLiquidityGrabParams,
    'liquidity-order-flow': defaultLiquidityOrderFlowParams,
    'ema-cci-macd': defaultEmaCciMacdParams,
    'code-based-consensus': defaultCodeBasedConsensusParams,
    'mtf-engulfing': defaultMtfEngulfingParams,
    'smi-mfi-supertrend': defaultSmiMfiSupertrendParams,
    'smi-mfi-scalp': defaultSmiMfiScalpParams,
    'order-flow-scalp': defaultOrderFlowScalpParams,
    'forced-action-scalp': defaultForcedActionScalpParams,
}

const defaultDisciplineParams: DisciplineParams = {
    enableDiscipline: true,
    maxConsecutiveLosses: 4,
    cooldownPeriodMinutes: 15,
    dailyDrawdownLimit: 10,
    onFailure: 'Cooldown',
};

// Helper to generate parameter combinations for auto-tuning
const generateCombinations = (config: StrategyOptimizationConfig): any[] => {
    const keys = Object.keys(config);
    if (keys.length === 0) return [];
    
    const ranges = keys.map(key => {
        const { min, max, step } = config[key];
        const values = [];
        // Handle floating point inaccuracies by fixing precision
        const precision = (String(step).split('.')[1] || '').length;
        for (let i = min; i <= max; i += step) {
            values.push(parseFloat(i.toFixed(precision)));
        }
        return values;
    });

    const combinations: any[] = [];
    const maxIndex = ranges.length - 1;

    function helper(arr: any[], i: number) {
        for (let j = 0, l = ranges[i].length; j < l; j++) {
            const a = arr.slice(0); // clone arr
            a.push(ranges[i][j]);
            if (i === maxIndex) {
                const combo: Record<string, number | string> = {};
                keys.forEach((key, index) => {
                    combo[key] = a[index];
                });
                combinations.push(combo);
            } else {
                helper(a, i + 1);
            }
        }
    }
    helper([], 0);
    return combinations;
}

const OverfittingAnalysisCard = ({ result }: { result: OverfittingResult }) => {
    const riskVariant = {
        'Low': 'default',
        'Moderate': 'default',
        'High': 'destructive',
        'Very High': 'destructive'
    }[result.riskLevel] as 'default' | 'destructive';
    
    const riskBgColor = {
        'Low': 'bg-green-500/10 border-green-500/20 text-green-500',
        'Moderate': 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
        'High': 'bg-orange-500/10 border-orange-500/20 text-orange-500',
        'Very High': 'bg-red-500/10 border-red-500/20 text-red-500'
    }[result.riskLevel];

    return (
        <Alert variant={riskVariant} className={cn("mt-4", riskBgColor)}>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Overfitting Analysis: {result.riskLevel} Risk</AlertTitle>
            <AlertDescription>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    {result.feedback.map((item, index) => (
                        <li key={index}>{item}</li>
                    ))}
                </ul>
            </AlertDescription>
        </Alert>
    );
};

const ParameterControl = ({ label, value, onChange, disabled, defaultValue, optimizationRange }: {
    label: string;
    value: number | string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    defaultValue?: number;
    optimizationRange?: { min: number, max: number };
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={label} className="capitalize">{label.replace(/([A-Z])/g, ' $1').trim()}</Label>
      <Input 
        id={label}
        type="number"
        value={value}
        onChange={onChange}
        step={String(value).includes('.') ? '0.001' : '1'}
        disabled={disabled}
      />
      <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 cursor-help">
                        <Info className="h-3 w-3" />
                        Default: <span className="font-mono">{defaultValue ?? 'N/A'}</span>
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>The strategy's default value for this parameter.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
        {optimizationRange && (
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 cursor-help">
                            <Wand2 className="h-3 w-3" />
                            Opt. Range: <span className="font-mono">{optimizationRange.min}-{optimizationRange.max}</span>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>The range used by the "Auto-Tune" feature.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )}
      </div>
    </div>
  );
};


const BacktestPageContent = () => {
  const { toast } = useToast()
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected, canUseAi, consumeAiCredit, apiKey, secretKey } = useApi();
  const { isTradingActive, addBotInstance } = useBot();
  const [strategyParams, setStrategyParams] = usePersistentState<Record<string, any>>('backtest-strategy-params', {});
  const { getChartData, isLoading: isFetchingData, error: dataError } = useDataManager();

  const [activeStrategies, setActiveStrategies] = useState<{ id: string; name: string }[]>(strategyMetadatas);
  const getStrategyById = getStaticStrategyById;

  const [isClient, setIsClient] = useState(false)
  const [baseAsset, setBaseAsset] = usePersistentState<string>("backtest-base-asset", "BTC");
  const [quoteAsset, setQuoteAsset] = usePersistentState<string>("backtest-quote-asset", "USDT");
  const [availableQuotes, setAvailableQuotes] = useState<string[]>([]);
  const [chartHeight, setChartHeight] = usePersistentState<number>('backtest-chart-height', 600);
  const [date, setDate] = usePersistentState<DateRange | undefined>('backtest-date-range', undefined);

  const symbol = useMemo(() => `${baseAsset}${quoteAsset}`, [baseAsset, quoteAsset]);

  const [fullChartData, setFullChartData] = useState<HistoricalData[]>([]);
  const [visibleChartData, setVisibleChartData] = useState<HistoricalData[]>([]);
  const [isBacktesting, setIsBacktesting] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isProjecting, setIsProjecting] = useState(false);
  const [isTestingOnProjection, setIsTestingOnProjection] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = usePersistentState<string>('backtest-strategy', strategyMetadatas[0].id);
  const [interval, setInterval] = usePersistentState<string>('backtest-interval', "1h");
  
  // State for backtest results
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [summaryStats, setSummaryStats] = useState<BacktestSummary | null>(null);
  const [overfittingResult, setOverfittingResult] = useState<OverfittingResult | null>(null);
  const [outlierTradeIds, setOutlierTradeIds] = useState<string[]>([]);
  const [contrarianResults, setContrarianResults] = useState<BacktestResult[] | null>(null);
  const [contrarianSummary, setContrarianSummary] = useState<BacktestSummary | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<BacktestResult | null>(null);

  // Projection State
  const [projectionMode, setProjectionMode] = usePersistentState<'upward' | 'downward' | 'neutral' | 'random' | 'frankenstein'>('backtest-projection-mode', 'frankenstein');
  const [projectionDuration, setProjectionDuration] = usePersistentState<'1d' | '3d' | '7d' | '1m'>('backtest-projection-duration', '7d');
  const [projectedData, setProjectedData] = useState<HistoricalData[]>([]);
  const [forwardTestSummary, setForwardTestSummary] = useState<BacktestSummary | null>(null);
  const [forwardTestTrades, setForwardTestTrades] = useState<BacktestResult[]>([]);
  const [selectedForwardTrade, setSelectedForwardTrade] = useState<BacktestResult | null>(null);

  const [initialCapital, setInitialCapital] = usePersistentState<number>('backtest-initial-capital', 100);
  const [leverage, setLeverage] = usePersistentState<number>('backtest-leverage', 10);
  const [takeProfit, setTakeProfit] = usePersistentState<number>('backtest-tp', 5);
  const [stopLoss, setStopLoss] = usePersistentState<number>('backtest-sl', 2);
  const [fee, setFee] = usePersistentState<number>('backtest-fee', 0.04);
  const [useAIValidation, setUseAIValidation] = usePersistentState<boolean>('backtest-ai-validation', false);
  const [useContrarian, setUseContrarian] = usePersistentState<boolean>('backtest-contrarian', false);
  const [maxAiValidations, setMaxAiValidations] = usePersistentState<number>('backtest-max-validations', 20);
  const [isConfirming, setIsConfirming] = useState(false);
  
  // New state for Replay Mode
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(500); // ms per candle. 1000=slow, 500=medium, 200=fast
  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isProjectionCardOpen, setProjectionCardOpen] = usePersistentState<boolean>('backtest-projection-card-open', false);
  const [activeTab, setActiveTab] = useState("chart");
  const [isConfigOpen, setIsConfigOpen] = usePersistentState<boolean>('backtest-config-open', true);
  const [isChartOpen, setIsChartOpen] = usePersistentState<boolean>('backtest-chart-open', true);


  const handleParamChange = (strategyId: string, paramName: string, value: any) => {
    setStrategyParams(prev => {
        const currentParams = prev[strategyId] || {};
        let parsedValue = value;
        // Keep objects as is (for discipline settings)
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            // No parsing needed
        } else if (typeof value !== 'boolean') {
            parsedValue = (value === '' || isNaN(value as number))
                ? 0
                : String(value).includes('.') ? parseFloat(value) : parseInt(value, 10);
        }
        
        return {
            ...prev,
            [strategyId]: {
                ...currentParams,
                [paramName]: isNaN(parsedValue as number) && typeof parsedValue !== 'boolean' && typeof parsedValue !== 'object' ? 0 : parsedValue,
            }
        };
    });
  };

  const handleDisciplineParamChange = (paramName: keyof DisciplineParams, value: any) => {
    setStrategyParams(prev => {
        const currentParams = prev[selectedStrategy] || {};
        const currentDisciplineParams = currentParams.discipline || defaultDisciplineParams;
        return {
            ...prev,
            [selectedStrategy]: {
                ...currentParams,
                discipline: {
                    ...currentDisciplineParams,
                    [paramName]: value
                }
            }
        };
    });
  };
  
  const handleResetParams = () => {
    const defaultParams = DEFAULT_PARAMS_MAP[selectedStrategy];
    if (defaultParams) {
        setStrategyParams(prev => ({...prev, [selectedStrategy]: defaultParams}));
        const strategyName = getStrategyById(selectedStrategy)?.name || 'the strategy';
        toast({ title: "Parameters Reset", description: `The parameters for ${strategyName} have been reset to their default values.`});
    }
  }

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
  }, [])

  useEffect(() => {
    const quotes = getAvailableQuotesForBase(baseAsset);
    setAvailableQuotes(quotes);
    if (!quotes.includes(quoteAsset)) {
      setQuoteAsset(quotes[0] || '');
    }
  }, [baseAsset, quoteAsset, setQuoteAsset]);
  
  // Effect to fetch raw data using the DataManager context
  useEffect(() => {
    if (!isClient || !symbol || !quoteAsset || !isConnected) {
        setFullChartData([]);
        return;
    };
    
    const fetchData = async () => {
        const data = await getChartData(symbol, interval, date);
        if (data) {
            setFullChartData(data);
        }
    };

    fetchData();

  }, [symbol, quoteAsset, interval, isConnected, isClient, date, getChartData]);

  // Effect to handle data errors from the context
  useEffect(() => {
    if (dataError) {
        toast({
            title: "Failed to Load Data",
            description: dataError,
            variant: "destructive"
        });
    }
  }, [dataError, toast]);


  // Effect to calculate and display indicators
  useEffect(() => {
    const calculateAndSetIndicators = async () => {
      if (fullChartData.length === 0) {
        setVisibleChartData([]);
        return;
      }
      
      const strategy = getStrategyById(selectedStrategy);
      let dataWithInd: HistoricalData[];

      const combinedData = [...fullChartData, ...projectedData];

      if (strategy) {
          const paramsForStrategy = { ...DEFAULT_PARAMS_MAP[selectedStrategy], ...(strategyParams[selectedStrategy] || {}) };
          dataWithInd = await strategy.calculate(combinedData, paramsForStrategy, symbol);
      } else {
          dataWithInd = [...combinedData];
      }
      
      const sliceEnd = isReplaying ? replayIndex + 1 : dataWithInd.length;
      const finalVisibleData = dataWithInd.slice(0, sliceEnd);
      setVisibleChartData(finalVisibleData);
    };
    
    calculateAndSetIndicators();
  }, [fullChartData, projectedData, selectedStrategy, strategyParams, symbol, isReplaying, replayIndex, getStrategyById]);


  const runSilentBacktest = async (data: HistoricalData[], params: any): Promise<{summary: BacktestSummary | null, dataWithSignals: HistoricalData[], trades: BacktestResult[]}> => {
    const { strategyId, strategyParams, initialCapital, leverage, takeProfit, stopLoss, fee, symbol } = params;
    const strategy = getStrategyById(strategyId);
    if (!strategy) return { summary: null, dataWithSignals: data, trades: [] };

    const dataWithEvents = await strategy.calculate(JSON.parse(JSON.stringify(data)), strategyParams, symbol);
    
    const { summary, trades } = await executeTradesFromEvents(dataWithEvents, {
        isContrarian: false,
        initialCapital,
        leverage,
        takeProfit,
        stopLoss,
        fee,
        disciplineParams: strategyParams.discipline || defaultDisciplineParams
    });

    return { summary, dataWithSignals: dataWithEvents, trades };
  }

  const handleRunBacktestClick = () => {
    if (isReplaying) {
      handleStopReplayAndRunBacktest();
      return;
    }
    if (useAIValidation) {
        if (canUseAi()) {
            setIsConfirming(true);
        }
    } else {
        runBacktest();
    }
  };
  
  const handleClearProjection = useCallback(() => {
    setProjectedData([]);
    setForwardTestSummary(null);
    setForwardTestTrades([]);
    setSelectedForwardTrade(null);
    if (!isBacktesting) { // Only toast if not in the middle of a full report clear
        toast({ title: "Projection Cleared" });
    }
  }, [isBacktesting, toast]);

  const handleClearReport = useCallback(() => {
    setBacktestResults([]);
    setSummaryStats(null);
    setOverfittingResult(null);
    setOutlierTradeIds([]);
    setContrarianResults(null);
    setContrarianSummary(null);
    setSelectedTrade(null);
    handleClearProjection();
    toast({ title: "Report Cleared", description: "The backtest results have been reset." });
  }, [toast, handleClearProjection]);

  const runBacktest = async () => {
    if (fullChartData.length === 0) {
      toast({ title: "No Data", description: "Cannot run backtest without market data.", variant: "destructive" });
      return;
    }
    if (isReplaying) {
      console.warn("Attempted to run backtest while replay is active.");
      return;
    }

    setIsBacktesting(true);
    handleClearReport();
    
    const strategy = getStrategyById(selectedStrategy);
    if (!strategy) {
      toast({ title: "No Strategy Selected", variant: "destructive" });
      setIsBacktesting(false);
      return;
    }

    toast({ title: "Backtest Started", description: `Running ${strategy.name} on ${symbol} (${interval})...` });

    // --- SINGLE PASS for Neutral Events ---
    const paramsForStrategy = { ...DEFAULT_PARAMS_MAP[selectedStrategy], ...(strategyParams[selectedStrategy] || {}) };
    const dataWithNeutralEvents = await strategy.calculate(JSON.parse(JSON.stringify(fullChartData)), paramsForStrategy, symbol);
    
    const tradeParams = {
        initialCapital,
        leverage,
        takeProfit,
        stopLoss,
        fee,
        disciplineParams: paramsForStrategy.discipline || defaultDisciplineParams
    };

    // --- CENTRALIZED EXECUTION from Events ---
    const { summary: standardSummary, trades: standardTrades } = await executeTradesFromEvents(dataWithNeutralEvents, {...tradeParams, isContrarian: useContrarian });
    
    setBacktestResults(standardTrades);
    setSummaryStats(standardSummary);
    
    // Calculate Contrarian results if toggled, without re-running the strategy calculation.
    if (useContrarian) {
        const { summary: contraSummary, trades: contraTrades } = await executeTradesFromEvents(dataWithNeutralEvents, {...tradeParams, isContrarian: false });
        setContrarianResults(contraTrades);
        setContrarianSummary(contraSummary);
    } else {
        setContrarianResults(null);
        setContrarianSummary(null);
    }

    if (standardSummary && standardSummary.totalTrades > 0) {
        const overfittingCheck = detectOverfitting(standardSummary, fullChartData.length, standardTrades);
        setOverfittingResult(overfittingCheck);
        setOutlierTradeIds(overfittingCheck.outlierTradeIds);
    }

    toast({ title: "Backtest Complete", description: "Strategy signals and results are now available." });
    setIsBacktesting(false);
  };
  
  const executeTradesFromEvents = async (
    data: HistoricalData[], 
    params: {
        isContrarian: boolean;
        initialCapital: number;
        leverage: number;
        takeProfit: number;
        stopLoss: number;
        fee: number;
        disciplineParams: DisciplineParams;
    }
  ) => {
    const { isContrarian, initialCapital, leverage, takeProfit, stopLoss, fee, disciplineParams } = params;
    
    const riskGuardian = new RiskGuardian(disciplineParams, initialCapital);
    const trades: BacktestResult[] = [];
    let positionType: 'long' | 'short' | null = null;
    let entryPrice = 0;
    let entryTime = 0;
    let entryIndex = -1;
    
    for (let i = 1; i < data.length; i++) {
        const d = data[i];
        const isBullishEvent = !!d.bullish_event;
        const isBearishEvent = !!d.bearish_event;
        
        let signal: 'BUY' | 'SELL' | null = null;
        if (isContrarian) {
            if (isBullishEvent) signal = 'SELL';
            if (isBearishEvent) signal = 'BUY';
        } else {
            if (isBullishEvent) signal = 'BUY';
            if (isBearishEvent) signal = 'SELL';
        }

        if (positionType) {
            let exitPrice: number | null = null;
            const slPrice = data[entryIndex].stopLossLevel || (entryPrice * (1 - (positionType === 'long' ? stopLoss : -stopLoss) / 100));
            const tpPrice = data[entryIndex].takeProfitLevel || (entryPrice * (1 + (positionType === 'long' ? takeProfit : -takeProfit) / 100));

            let closeReason: BacktestResult['closeReason'] = 'signal';

            if (positionType === 'long') {
                if (d.low <= slPrice) { exitPrice = slPrice; closeReason = 'stop-loss'; }
                else if (d.high >= tpPrice) { exitPrice = tpPrice; closeReason = 'take-profit'; }
                else if (signal === 'SELL') { exitPrice = d.close; closeReason = 'signal'; }
            } else if (positionType === 'short') {
                if (d.high >= slPrice) { exitPrice = slPrice; closeReason = 'stop-loss'; }
                else if (d.low <= tpPrice) { exitPrice = tpPrice; closeReason = 'take-profit'; }
                else if (signal === 'BUY') { exitPrice = d.close; closeReason = 'signal'; }
            }

            if (exitPrice !== null) {
                const quantity = (initialCapital * leverage) / entryPrice;
                const pnl = (positionType === 'long' ? exitPrice - entryPrice : entryPrice - exitPrice) * quantity;
                const totalFee = (entryPrice * quantity + exitPrice * quantity) * (fee / 100);
                const finalPnl = pnl - totalFee;

                riskGuardian.registerTrade(finalPnl);

                trades.push({ 
                    id: `trade-${trades.length}`, 
                    type: positionType, 
                    entryTime, 
                    entryPrice, 
                    exitTime: d.time, 
                    exitPrice, 
                    pnl: finalPnl, 
                    fee: totalFee,
                    closeReason,
                    stopLoss: slPrice,
                    takeProfit: tpPrice,
                } as BacktestResult);
                positionType = null;
            }
        }

        if (positionType === null && signal) {
            const { allowed, reason } = riskGuardian.canTrade();
            if (!allowed) {
                // Log discipline action if needed, e.g., toast(reason)
                continue; // Skip trade if not allowed
            }

            positionType = signal === 'BUY' ? 'long' : 'short';
            entryPrice = d.close;
            entryTime = d.time;
            entryIndex = i;
        }
    }
    
    const wins = trades.filter(t => t.pnl > 0);
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalFees = trades.reduce((sum, t) => sum + t.fee, 0);
    const totalWins = wins.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0);
    
    const summary: BacktestSummary = {
      totalTrades: trades.length,
      winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
      totalPnl,
      totalFees,
      averageWin: wins.length > 0 ? totalWins / wins.length : 0,
      averageLoss: trades.length > wins.length ? Math.abs(totalLosses / (trades.length - wins.length)) : 0,
      profitFactor: totalLosses !== 0 ? Math.abs(totalWins / totalLosses) : Infinity,
      initialCapital,
      endingBalance: initialCapital + totalPnl,
      totalReturnPercent: (totalPnl / initialCapital) * 100
    };
    
    return { summary, trades };
  }


  const handleAutoTune = async () => {
    const optimizationConfig = optimizationConfigs[selectedStrategy];
    if (!optimizationConfig) {
        toast({ title: "Not Supported", description: "Auto-tuning is not configured for this strategy.", variant: "destructive" });
        return;
    }
    if (isReplaying) {
      stopReplay();
      await runBacktest();
    }
    setIsOptimizing(true);
    toast({ title: "Starting Auto-Tune...", description: "This may take a moment. The UI may be unresponsive." });

    const combinations = generateCombinations(optimizationConfig);
    if (combinations.length === 0) {
        toast({ title: "No combinations to test.", variant: "destructive" });
        setIsOptimizing(false);
        return;
    }

    let bestParams: any | null = null;
    let bestProfitFactor = -Infinity;

    const testCombinations = combinations.slice(0, 50); // Limit to 50 combinations to prevent browser freeze
    if(combinations.length > 50) {
        toast({ title: "Warning", description: `Testing first 50 of ${combinations.length} possible combinations.` });
    }

    for (const params of testCombinations) {
        const { summary } = await runSilentBacktest(fullChartData, {
            strategyId: selectedStrategy,
            strategyParams: params,
            initialCapital, leverage, takeProfit, stopLoss, fee,
            symbol: symbol
        });

        if (summary && summary.profitFactor > bestProfitFactor) {
            bestProfitFactor = summary.profitFactor;
            bestParams = params;
        }
    }

    if (bestParams) {
        setStrategyParams(prev => ({ ...prev, [selectedStrategy]: bestParams }));
        toast({ title: "Auto-Tune Complete!", description: `Found best parameters with profit factor ${bestProfitFactor.toFixed(2)}.` });
    } else {
        toast({ title: "Auto-Tune Failed", description: "No profitable combination found.", variant: "destructive" });
    }

    setIsOptimizing(false);
  };
  
  // --- REPLAY MODE LOGIC ---
  const startReplay = async () => {
    if (fullChartData.length < 50) {
      toast({ title: 'Not Enough Data', description: 'Load at least 50 candles to start replay.', variant: 'destructive' });
      return;
    }
    setIsBacktesting(true); // Show a loading state
    
    // First, run the backtest silently on the full dataset to get all signals
    const strategy = getStrategyById(selectedStrategy);
    if (!strategy) {
      setIsBacktesting(false);
      return;
    }
    const paramsForStrategy = { ...DEFAULT_PARAMS_MAP[selectedStrategy], ...(strategyParams[selectedStrategy] || {}) };
    const calculatedData = await strategy.calculate(JSON.parse(JSON.stringify(fullChartData)), paramsForStrategy, symbol);
    setFullChartData(calculatedData); // Store data with all signals pre-calculated
    setBacktestResults([]);
    setSummaryStats(null);
    setContrarianResults(null);
    setContrarianSummary(null);
    setSelectedTrade(null);
    
    setReplayIndex(50); // Start replay after first 50 candles for indicator warmup
    setIsReplaying(true);
    setIsBacktesting(false);
    toast({ title: 'Replay Mode Started', description: 'Use the controls to step through the backtest.' });
  };

  const stopReplay = () => {
    setIsReplaying(false);
    setIsPlaying(false);
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
  };

  const handleStopReplayAndRunBacktest = () => {
    stopReplay();
    runBacktest();
  };

  const handleReplayStep = (direction: 'forward' | 'backward') => {
    setReplayIndex(prev => {
      const newIndex = direction === 'forward' ? prev + 1 : prev - 1;
      if (newIndex >= fullChartData.length || newIndex < 50) {
        setIsPlaying(false); // Stop playing at the end
        return prev;
      }
      return newIndex;
    });
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (isPlaying && isReplaying) {
      replayIntervalRef.current = setInterval(() => {
        handleReplayStep('forward');
      }, replaySpeed);
    } else {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
        replayIntervalRef.current = null;
      }
    }

    return () => {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
      }
    };
  }, [isPlaying, isReplaying, replaySpeed]);
  
  const anyLoading = isBacktesting || isFetchingData || isOptimizing || isProjecting || isTestingOnProjection;

  const handleIntervalChange = (newInterval: string) => {
    setInterval(newInterval);
    setFullChartData([]);
  };

  const handleExport = (targetPage: 'live' | 'manual') => {
    if (!symbol || !selectedStrategy || selectedStrategy === 'none') {
        toast({ title: "Incomplete Configuration", description: "Please select an asset and a strategy before exporting.", variant: "destructive" });
        return;
    }

    const currentConfig = {
        asset: symbol,
        interval,
        capital: initialCapital,
        leverage,
        takeProfit,
        stopLoss,
        strategy: selectedStrategy,
        strategyParams: strategyParams[selectedStrategy] || {},
    };

    addBotInstance(targetPage, currentConfig);
    
    const pageName = targetPage === 'live' ? "Live Trading" : "Manual Trading";
    toast({
        title: `Exported to ${pageName}`,
        description: `Configuration for ${symbol} with ${getStrategyById(selectedStrategy)?.name} strategy has been sent to the ${pageName} page.`
    });
    router.push(`/${targetPage}`);
  };


  const handleGenerateProjection = () => {
    if (fullChartData.length === 0) {
      toast({ title: "No Data", description: "Please load market data before projecting.", variant: "destructive" });
      return;
    }
    
    setIsProjecting(true);
    setForwardTestSummary(null);
    setForwardTestTrades([]);
    toast({ title: "Generating Projection..." });

    // Use a timeout to allow the UI to update before the potentially blocking generation starts
    setTimeout(() => {
      try {
        const newProjectedCandles = generateProjectedCandles(fullChartData, projectionMode, projectionDuration, interval);
        setProjectedData(newProjectedCandles);
        toast({ title: "Projection Generated", description: "Hypothetical future candles added to chart." });
      } catch (e: any) {
        toast({ title: "Projection Failed", description: e.message, variant: "destructive" });
      } finally {
        setIsProjecting(false);
      }
    }, 50);
  };
  
  const handleTestOnProjection = async () => {
      if (projectedData.length === 0) {
        toast({ title: "No Projection Data", description: "Please generate a projection before testing.", variant: "destructive" });
        return;
      }

      setIsTestingOnProjection(true);
      setForwardTestSummary(null);
      setForwardTestTrades([]);
      toast({ title: "Forward Test Started..." });
      
       setTimeout(async () => {
          try {
            const strategyToTest = getStrategyById(selectedStrategy);
            if (!strategyToTest) {
                toast({ title: "No Strategy Selected", description: "Please select a strategy to test.", variant: "destructive" });
                setIsTestingOnProjection(false);
                return;
            }

            const paramsForStrategy = { ...(strategyParams[selectedStrategy] || {}), reverse: false }; // Forward test always uses standard logic
            
            const { summary: fwdSummary, trades: fwdTrades, dataWithSignals: fwdData } = await runSilentBacktest(projectedData, {
                strategyId: selectedStrategy,
                strategyParams: paramsForStrategy,
                initialCapital, leverage, takeProfit, stopLoss, fee, symbol
            });
            
            // Update the projected data with the signals from the test
            const originalDataLength = fullChartData.length;
            const updatedProjectedData = fwdData.slice(originalDataLength);
            setProjectedData(fwdData); // Update the state with data including signals

            setForwardTestTrades(fwdTrades);
            setForwardTestSummary(fwdSummary);
            
            toast({ title: "Forward Test Complete", description: "Strategy performance on the projected data is now available." });
          } catch (e: any) {
            toast({ title: "Forward Test Failed", description: e.message, variant: "destructive" });
          } finally {
            setIsTestingOnProjection(false);
          }
       }, 50);
  };


  const renderParameterControls = () => {
    const params = strategyParams[selectedStrategy] || {};
    const defaultParams = DEFAULT_PARAMS_MAP[selectedStrategy] || {};
    const optimizationConfig = optimizationConfigs[selectedStrategy];

    // Filter out complex or non-numeric params from the main display
    const filteredParamKeys = Object.keys(defaultParams).filter(
      key => typeof defaultParams[key] === 'number' || typeof defaultParams[key] === 'boolean'
    );
    
    let parameterInputs;

    // Special UI for hyper-peak-formation
    if (selectedStrategy === 'hyper-peak-formation' || selectedStrategy === 'hyper-peak-formation-old') {
      const isOld = selectedStrategy === 'hyper-peak-formation-old';
      parameterInputs = (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ParameterControl label="peakLookaround" value={params.peakLookaround ?? 0} onChange={(e) => handleParamChange(selectedStrategy, 'peakLookaround', e.target.value)} disabled={anyLoading || isReplaying} defaultValue={defaultParams.peakLookaround} optimizationRange={optimizationConfig?.peakLookaround} />
            <ParameterControl label="swingLookaround" value={params.swingLookaround ?? 0} onChange={(e) => handleParamChange(selectedStrategy, 'swingLookaround', e.target.value)} disabled={anyLoading || isReplaying} defaultValue={defaultParams.swingLookaround} optimizationRange={optimizationConfig?.swingLookaround} />
            <ParameterControl label="emaShortPeriod" value={params.emaShortPeriod ?? 0} onChange={(e) => handleParamChange(selectedStrategy, 'emaShortPeriod', e.target.value)} disabled={anyLoading || isReplaying} defaultValue={defaultParams.emaShortPeriod} optimizationRange={optimizationConfig?.emaShortPeriod} />
            <ParameterControl label="emaLongPeriod" value={params.emaLongPeriod ?? 0} onChange={(e) => handleParamChange(selectedStrategy, 'emaLongPeriod', e.target.value)} disabled={anyLoading || isReplaying} defaultValue={defaultParams.emaLongPeriod} optimizationRange={optimizationConfig?.emaLongPeriod} />
             {isOld ? (
                 <ParameterControl label="maxLookahead" value={params.maxLookahead ?? 0} onChange={(e) => handleParamChange(selectedStrategy, 'maxLookahead', e.target.value)} disabled={anyLoading || isReplaying} defaultValue={defaultParams.maxLookahead} optimizationRange={optimizationConfig?.maxLookahead} />
            ) : (
                <ParameterControl label="signalStaleness" value={params.signalStaleness ?? 0} onChange={(e) => handleParamChange(selectedStrategy, 'signalStaleness', e.target.value)} disabled={anyLoading || isReplaying} defaultValue={defaultParams.signalStaleness} optimizationRange={optimizationConfig?.signalStaleness} />
            )}
          </div>
        </div>
      );
    } else if (selectedStrategy === 'code-based-consensus') {
      const selectedSubStrategies = params.strategies || [];
      const consensusStrategies = strategyMetadatas.filter(s => s.id !== 'code-based-consensus');
      const allStrategyIds = consensusStrategies.map(s => s.id);

      const handleConsensusStrategyToggle = (strategyId: string) => {
        const newSelection = selectedSubStrategies.includes(strategyId)
            ? selectedSubStrategies.filter((s: string) => s !== strategyId)
            : [...selectedSubStrategies, strategyId];
        handleParamChange(selectedStrategy, 'strategies', newSelection);
      };

      const handleSelectAll = (selectAll: boolean) => {
          handleParamChange(selectedStrategy, 'strategies', selectAll ? allStrategyIds : []);
      }

      parameterInputs = (
        <div className="space-y-4">
          <div>
              <div className="flex justify-between items-center mb-1">
                <Label>Ensemble Strategies</Label>
                <div className="flex gap-2">
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => handleSelectAll(true)}>Select All</Button>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => handleSelectAll(false)}>Deselect All</Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Select the strategies to include in the consensus calculation. A signal is generated when a majority agree.</p>
              <ScrollArea className="h-40 w-full rounded-md border p-4 mt-2">
                <div className="space-y-2">
                    {consensusStrategies.map((strategy) => (
                        <div key={strategy.id} className="flex items-center space-x-2">
                            <Checkbox 
                                id={`consensus-${strategy.id}`} 
                                checked={selectedSubStrategies.includes(strategy.id)}
                                onCheckedChange={() => handleConsensusStrategyToggle(strategy.id)}
                                disabled={anyLoading || isReplaying}
                            />
                            <Label htmlFor={`consensus-${strategy.id}`} className="font-normal text-muted-foreground">{strategy.name}</Label>
                        </div>
                    ))}
                </div>
              </ScrollArea>
          </div>
        </div>
      );
    } else if (selectedStrategy === 'mtf-engulfing') {
        parameterInputs = (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="htf">Higher Timeframe (HTF)</Label>
                    <Select
                        value={params.htf || '1D'}
                        onValueChange={(value) => handleParamChange(selectedStrategy, 'htf', value)}
                        disabled={anyLoading || isReplaying}
                    >
                        <SelectTrigger id="htf"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1D">1 Day</SelectItem>
                            <SelectItem value="4h">4 Hours</SelectItem>
                            <SelectItem value="1h">1 Hour</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <ParameterControl label="emaLength" value={params.emaLength ?? 0} onChange={(e) => handleParamChange(selectedStrategy, 'emaLength', e.target.value)} disabled={anyLoading || isReplaying} defaultValue={defaultParams.emaLength} optimizationRange={optimizationConfig?.emaLength} />
                    <ParameterControl label="atrLength" value={params.atrLength ?? 0} onChange={(e) => handleParamChange(selectedStrategy, 'atrLength', e.target.value)} disabled={anyLoading || isReplaying} defaultValue={defaultParams.atrLength} optimizationRange={optimizationConfig?.atrLength} />
                    <ParameterControl label="slAtrMultiplier" value={params.slAtrMultiplier ?? 0} onChange={(e) => handleParamChange(selectedStrategy, 'slAtrMultiplier', e.target.value)} disabled={anyLoading || isReplaying} defaultValue={defaultParams.slAtrMultiplier} optimizationRange={optimizationConfig?.slAtrMultiplier} />
                    <ParameterControl label="rrRatio" value={params.rrRatio ?? 0} onChange={(e) => handleParamChange(selectedStrategy, 'rrRatio', e.target.value)} disabled={anyLoading || isReplaying} defaultValue={defaultParams.rrRatio} optimizationRange={optimizationConfig?.rrRatio} />
                </div>
            </div>
        );
    } else {
        const numericParamKeys = Object.keys(defaultParams).filter(key => typeof defaultParams[key] === 'number');
        if (numericParamKeys.length === 0 && selectedStrategy !== 'none') {
            parameterInputs = <p className="text-sm text-muted-foreground">This strategy has no tunable parameters.</p>;
        } else {
             const controls = numericParamKeys.map((key) => (
                <ParameterControl
                    key={key}
                    label={key}
                    value={params[key] ?? 0}
                    onChange={(e) => handleParamChange(selectedStrategy, key, e.target.value)}
                    disabled={anyLoading || isReplaying}
                    defaultValue={defaultParams[key]}
                    optimizationRange={optimizationConfig?.[key]}
                />
            ));
             parameterInputs = <div className="grid grid-cols-2 gap-4">{controls}</div>;
        }
    }

    const canOptimize = !!optimizationConfigs[selectedStrategy];
    const canReset = !!DEFAULT_PARAMS_MAP[selectedStrategy];

    return (
      <div className="space-y-4">
        {parameterInputs}
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
            {canReset && (
                <Button onClick={handleResetParams} disabled={anyLoading || isReplaying} variant="secondary" className="w-full">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset to Default
                </Button>
            )}
            {canOptimize && (
              <Button onClick={handleAutoTune} disabled={anyLoading || isReplaying} variant="outline" className="w-full">
                {isOptimizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                {isOptimizing ? "Optimizing..." : "Auto-Tune Parameters"}
              </Button>
            )}
        </div>
      </div>
    );
  };


  return (
    <div className="space-y-6">
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
        <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
            <Bot className="h-4 w-4" />
            <AlertTitle>Trading Session Active</AlertTitle>
            <AlertDescription>
                Backtesting is disabled to prioritize an active trading session.
            </AlertDescription>
        </Alert>
    )}
    <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm AI-Powered Backtest</AlertDialogTitle>
                <AlertDialogDescription>
                    This backtest will use AI to validate trade signals. This may consume multiple AI credits from your daily quota, up to the maximum you have set ({maxAiValidations}). Are you sure you want to proceed?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setIsConfirming(false); runBacktest(); }}>
                    Confirm & Run
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 space-y-6">
        <Collapsible open={isChartOpen} onOpenChange={setIsChartOpen}>
            <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isChartOpen && "rotate-180")} />
                        </Button>
                    </CollapsibleTrigger>
                    <h3 className="text-lg font-semibold">Visual Analysis Chart</h3>
                </div>
            </div>
            <CollapsibleContent>
                <div className="relative pb-4">
                    <div className="flex flex-col" style={{ height: `${chartHeight}px` }}>
                        <TradingChart data={visibleChartData} symbol={symbol} interval={interval} onIntervalChange={handleIntervalChange} highlightedTrade={selectedTrade} />
                    </div>
                    <div
                        onMouseDown={startChartResize}
                        className="absolute bottom-0 left-0 w-full h-4 flex items-center justify-center cursor-ns-resize group"
                    >
                        <GripHorizontal className="h-5 w-5 text-muted-foreground/30 transition-colors group-hover:text-primary" />
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
        <Tabs defaultValue="reports" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="reports">
                     <TrendingUp className="mr-2 h-4 w-4"/> Backtest Reports
                </TabsTrigger>
                 <TabsTrigger value="forward_test">
                     <AreaChart className="mr-2 h-4 w-4"/> Forward Test
                </TabsTrigger>
            </TabsList>
            <TabsContent value="reports" className="mt-4 space-y-4">
                {summaryStats && <BacktestResults 
                    results={backtestResults} 
                    summary={summaryStats} 
                    onSelectTrade={(trade) => { setSelectedTrade(trade); setIsChartOpen(true); }}
                    selectedTradeId={selectedTrade?.id}
                    outlierTradeIds={outlierTradeIds}
                    title={useContrarian ? "Contrarian Backtest" : "Standard Backtest"}
                />}
                 {summaryStats && useContrarian && contrarianSummary && (
                    <BacktestResults 
                        results={contrarianResults || []} 
                        summary={contrarianSummary} 
                        onSelectTrade={() => {}} // Contrarian trades not selectable
                        title="Contrarian Report (For Comparison)"
                    />
                )}
                 {!summaryStats && (
                    <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md">
                        <p>Run a backtest to see reports here.</p>
                    </div>
                )}
                 {summaryStats && overfittingResult && (
                    <OverfittingAnalysisCard result={overfittingResult} />
                )}
            </TabsContent>
             <TabsContent value="forward_test" className="mt-4 space-y-4">
                 {forwardTestSummary && <BacktestResults 
                    results={forwardTestTrades} 
                    summary={forwardTestSummary} 
                    onSelectTrade={(trade) => { setSelectedForwardTrade(trade); setIsChartOpen(true); }}
                    selectedTradeId={selectedForwardTrade?.id}
                    title="Forward Test Report"
                />}
                 {!forwardTestSummary && (
                    <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md">
                        <p>Generate a projection and run a test to see results here.</p>
                    </div>
                )}
             </TabsContent>
        </Tabs>
      </div>
      <div className="xl:col-span-2 space-y-6">
        <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Configuration</CardTitle>
                    <CardDescription>Configure your backtesting parameters.</CardDescription>
                  </div>
                   <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronDown className={cn("h-4 w-4 transition-transform", isConfigOpen && "rotate-180")} />
                      </Button>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                     <CardContent>
                        <Tabs defaultValue="strategy" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="strategy"><BrainCircuit/>Strategy</TabsTrigger>
                                <TabsTrigger value="core"><Settings/>Core</TabsTrigger>
                                <TabsTrigger value="risk"><ShieldCheck/>Risk & AI</TabsTrigger>
                            </TabsList>
                            <TabsContent value="strategy" className="pt-4 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="base-asset">Asset</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Select onValueChange={setBaseAsset} value={baseAsset} disabled={anyLoading}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>{topAssets.map(asset => (<SelectItem key={asset.ticker} value={asset.ticker}>{asset.ticker}</SelectItem>))}</SelectContent>
                                        </Select>
                                        <Select onValueChange={setQuoteAsset} value={quoteAsset} disabled={anyLoading || availableQuotes.length === 0}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>{availableQuotes.map(asset => (<SelectItem key={asset} value={asset}>{asset}</SelectItem>))}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="interval">Interval</Label>
                                    <Select onValueChange={handleIntervalChange} value={interval} disabled={anyLoading}><SelectTrigger id="interval"><SelectValue/></SelectTrigger>
                                        <SelectContent><SelectItem value="1m">1m</SelectItem><SelectItem value="5m">5m</SelectItem><SelectItem value="15m">15m</SelectItem><SelectItem value="1h">1h</SelectItem><SelectItem value="4h">4h</SelectItem><SelectItem value="1d">1d</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="strategy">Strategy</Label>
                                    <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={anyLoading}><SelectTrigger id="strategy"><SelectValue /></SelectTrigger>
                                        <SelectContent>{activeStrategies.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                                    </Select>
                                </div>
                                {renderParameterControls()}
                            </TabsContent>
                            <TabsContent value="core" className="pt-4 space-y-4">
                                <div className="space-y-2">
                                    <Label>Date Range</Label>
                                    <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal",!date && "text-muted-foreground")} disabled={anyLoading}><CalendarIcon className="mr-2 h-4 w-4"/>{isClient && date?.from?(date.to?(`${format(date.from,"LLL dd, y")} - ${format(date.to,"LLL dd, y")}`):format(date.from,"LLL dd, y")):<span>Pick a date range</span>}</Button></PopoverTrigger><PopoverContent className="w-auto flex p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={1}/></PopoverContent></Popover>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label htmlFor="initial-capital">Capital ($)</Label><Input id="initial-capital" type="number" value={initialCapital} onChange={e=>setInitialCapital(parseFloat(e.target.value)||0)} disabled={anyLoading}/></div>
                                    <div className="space-y-2"><Label htmlFor="leverage">Leverage (x)</Label><Input id="leverage" type="number" value={leverage} onChange={e=>setLeverage(parseInt(e.target.value,10)||1)} disabled={anyLoading}/></div>
                                    <div className="space-y-2"><Label htmlFor="take-profit">Take Profit (%)</Label><Input id="take-profit" type="number" value={takeProfit} onChange={e=>setTakeProfit(parseFloat(e.target.value)||0)} disabled={anyLoading}/></div>
                                    <div className="space-y-2"><Label htmlFor="stop-loss">Stop Loss (%)</Label><Input id="stop-loss" type="number" value={stopLoss} onChange={e=>setStopLoss(parseFloat(e.target.value)||0)} disabled={anyLoading}/></div>
                                </div>
                                 <div className="space-y-2"><Label htmlFor="fee">Fee (%)</Label><Input id="fee" type="number" value={fee} onChange={e=>setFee(parseFloat(e.target.value)||0)} disabled={anyLoading}/></div>
                                  <div className="flex items-center space-x-2 pt-2">
                                    <Switch
                                    id="reverse-logic"
                                    checked={useContrarian}
                                    onCheckedChange={setUseContrarian}
                                    disabled={anyLoading || isReplaying}
                                    />
                                    <div className="flex flex-col">
                                    <Label htmlFor="reverse-logic" className="cursor-pointer">Contrarian Mode</Label>
                                    <p className="text-xs text-muted-foreground">Trade against the strategy's signals.</p>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="risk" className="pt-4 space-y-4">
                                <DisciplineSettings params={strategyParams[selectedStrategy]?.discipline||defaultDisciplineParams} onParamChange={handleDisciplineParamChange} isDisabled={anyLoading}/>
                                <Separator/>
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2"><Switch id="ai-validation" checked={useAIValidation} onCheckedChange={setUseAIValidation} disabled={anyLoading||selectedStrategy==='code-based-consensus'}/><Label htmlFor="ai-validation" className="cursor-pointer">Enable AI Validation</Label></div>
                                    <p className="text-xs text-muted-foreground">Let an AI validate each signal. Slower but more accurate.</p>
                                </div>
                                {useAIValidation && <div className="space-y-2 pl-2"><Label htmlFor="max-ai-validations">Max Validations Per Run</Label><Input id="max-ai-validations" type="number" value={maxAiValidations} onChange={e=>setMaxAiValidations(parseInt(e.target.value,10)||0)} disabled={anyLoading}/><p className="text-xs text-muted-foreground">Limits AI calls to prevent exceeding API quotas.</p></div>}
                            </TabsContent>
                        </Tabs>
                     </CardContent>
                     <CardFooter className="flex-col gap-2">
                        <div className="flex w-full gap-2">
                          <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleRunBacktestClick} disabled={anyLoading || !isConnected || fullChartData.length === 0 || isTradingActive || selectedStrategy === 'none'}>
                            {anyLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isTradingActive ? "Trading Active..." : isFetchingData ? "Fetching Data..." : isOptimizing ? "Optimizing..." : isBacktesting ? "Running..." : "Run Full Backtest"}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button className="w-full" variant="secondary" disabled={anyLoading || !isConnected || isTradingActive || selectedStrategy === 'none'}>
                                  <Send className="mr-2 h-4 w-4"/>Export
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleExport('live')}><Bot className="mr-2 h-4 w-4"/>To Live Trading</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExport('manual')}><Bot className="mr-2 h-4 w-4"/>To Manual Trading</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex w-full gap-2">
                            <Button className="w-full" variant="outline" onClick={isReplaying ? handleStopReplayAndRunBacktest : startReplay} disabled={anyLoading || fullChartData.length < 50}>
                                {isReplaying ? <History className="mr-2 h-4 w-4"/> : <Play className="mr-2 h-4 w-4"/>}
                                {isReplaying ? "View Full Report" : "Start Replay"}
                            </Button>
                            <Button className="w-full" variant="destructive" onClick={handleClearReport} disabled={anyLoading || !summaryStats}>
                                <Trash2 className="mr-2 h-4 w-4"/>Clear Report
                            </Button>
                        </div>
                     </CardFooter>
                </CollapsibleContent>
            </Card>
        </Collapsible>
        
        {isReplaying && (
            <Card>
                <CardHeader className="p-4">
                    <CardTitle className="text-base">Replay Controls ({replayIndex + 1} / {fullChartData.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleReplayStep('backward')} disabled={isPlaying || replayIndex <= 50}><StepBack/></Button>
                        <Button variant="outline" size="icon" onClick={togglePlayPause}>{isPlaying ? <Pause/> : <Play/>}</Button>
                        <Button variant="ghost" size="icon" onClick={() => handleReplayStep('forward')} disabled={isPlaying}><StepForward/></Button>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Button size="sm" variant={replaySpeed === 1000 ? 'default' : 'outline'} onClick={() => setReplaySpeed(1000)}>Slow</Button>
                      <Button size="sm" variant={replaySpeed === 500 ? 'default' : 'outline'} onClick={() => setReplaySpeed(500)}>Medium</Button>
                      <Button size="sm" variant={replaySpeed === 200 ? 'default' : 'outline'} onClick={() => setReplaySpeed(200)}>Fast</Button>
                    </div>
                </CardContent>
            </Card>
        )}

        <Collapsible open={isProjectionCardOpen} onOpenChange={setProjectionCardOpen}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div><CardTitle className="flex items-center gap-2"><AreaChart/> Future Projection &amp; Forward Testing</CardTitle><CardDescription>Stress-test your strategy against hypothetical future data.</CardDescription></div>
                     <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><ChevronDown className={cn("h-4 w-4 transition-transform", isProjectionCardOpen && "rotate-180")} /></Button></CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="space-y-4">
                        <div><Label>Projection Mode</Label><RadioGroup value={projectionMode} onValueChange={(v) => setProjectionMode(v as any)} className="grid grid-cols-2 gap-4 mt-2" disabled={isProjecting}><div className="col-span-2"><RadioGroupItem value="frankenstein" id="frankenstein" /><Label htmlFor="frankenstein" className="ml-2 font-semibold">Frankenstein (Recommended)</Label></div><div><RadioGroupItem value="upward" id="upward" /><Label htmlFor="upward" className="ml-2">Upward Trend</Label></div><div><RadioGroupItem value="downward" id="downward" /><Label htmlFor="downward" className="ml-2">Downward Trend</Label></div><div><RadioGroupItem value="neutral" id="neutral" /><Label htmlFor="neutral" className="ml-2">Neutral</Label></div><div><RadioGroupItem value="random" id="random" /><Label htmlFor="random" className="ml-2">Random</Label></div></RadioGroup></div>
                        <div><Label>Projection Duration</Label><RadioGroup value={projectionDuration} onValueChange={(v) => setProjectionDuration(v as any)} className="grid grid-cols-4 gap-2 mt-2" disabled={isProjecting}><div><RadioGroupItem value="1d" id="1d" /><Label htmlFor="1d" className="ml-2">1D</Label></div><div><RadioGroupItem value="3d" id="3d" /><Label htmlFor="3d" className="ml-2">3D</Label></div><div><RadioGroupItem value="7d" id="7d" /><Label htmlFor="7d" className="ml-2">7D</Label></div><div><RadioGroupItem value="1m" id="1m" /><Label htmlFor="1m" className="ml-2">1M</Label></div></RadioGroup></div>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <div className="flex w-full gap-2">
                            <Button className="w-full" onClick={handleGenerateProjection} disabled={anyLoading || fullChartData.length === 0}>{isProjecting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}{isProjecting ? 'Generating...' : 'Generate Projection'}</Button>
                            <Button className="w-full" variant="secondary" onClick={handleTestOnProjection} disabled={anyLoading || projectedData.length === 0}>{isTestingOnProjection ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <TestTube className="mr-2 h-4 w-4" />}{isTestingOnProjection ? 'Testing...' : 'Test on Projection'}</Button>
                        </div>
                        <Button className="w-full" variant="outline" onClick={handleClearProjection} disabled={projectedData.length === 0 || anyLoading}><Trash2 className="mr-2 h-4 w-4" />Clear Projection</Button>
                    </CardFooter>
                </CollapsibleContent>
            </Card>
        </Collapsible>
      </div>
    </div>
    </div>
  )
}


export default function BacktestPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <BacktestPageContent />
        </React.Suspense>
    )
}





