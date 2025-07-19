

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
import { Loader2, Terminal, Bot, ChevronDown, BrainCircuit, Wand2, RotateCcw, GripHorizontal, GitCompareArrows, Play, Pause, StepForward, StepBack, History, CalendarIcon, Send, Trash2, TestTube, ShieldAlert, AreaChart } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HistoricalData, BacktestResult, BacktestSummary, DisciplineParams, Trade, Strategy } from "@/lib/types"
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
import { TradeHistory } from "@/components/dashboard/trade-history"
import { getTradeHistory } from "@/lib/binance-service";
import { Separator } from "@/components/ui/separator"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { detectOverfitting, type OverfittingResult } from "@/lib/analysis/overfitting-analysis"
import { generateProjectedCandles } from "@/lib/projection-service"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"


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
import { defaultVolumeDeltaParams } from "@/lib/strategies/volume-profile-delta"
import { defaultVwapCrossParams } from "@/lib/strategies/vwap-cross"
import { defaultWilliamsRParams } from "@/lib/strategies/williams-percent-r"
import { defaultLiquidityGrabParams } from "@/lib/strategies/liquidity-grab"
import { defaultLiquidityOrderFlowParams } from "@/lib/strategies/liquidity-order-flow"
import { defaultEmaCciMacdParams } from "@/lib/strategies/ema-cci-macd"
import { defaultCodeBasedConsensusParams } from "@/lib/strategies/code-based-consensus"
import { defaultMtfEngulfingParams } from "@/lib/strategies/mtf-engulfing"
import { defaultSmiMfiSupertrendParams } from "@/lib/strategies/smi-mfi-supertrend"

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

const BacktestPageContent = () => {
  const { toast } = useToast()
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected, canUseAi, consumeAiCredit, apiKey, secretKey } = useApi();
  const { isTradingActive, strategyParams, setStrategyParams, addBotInstance, setSimulationConfigForNextLoad } = useBot();
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
  const [maxAiValidations, setMaxAiValidations] = usePersistentState<number>('backtest-max-validations', 20);
  const [isControlsOpen, setControlsOpen] = usePersistentState<boolean>('backtest-controls-open', true);
  const [isParamsOpen, setParamsOpen] = usePersistentState<boolean>('backtest-params-open', false);
  const [isDisciplineOpen, setDisciplineOpen] = usePersistentState<boolean>('backtest-discipline-open', false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  
  // New state for Replay Mode
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(500); // ms per candle. 1000=slow, 500=medium, 200=fast
  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleParamChange = (strategyId: string, paramName: string, value: any) => {
    let parsedValue = value;
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      setStrategyParams(prev => ({
          ...prev,
          [strategyId]: {
              ...prev[strategyId],
              [paramName]: value,
          }
      }));
      return;
    }
    if (typeof value !== 'boolean') {
        parsedValue = (value === '' || isNaN(value as number))
            ? 0
            : String(value).includes('.') ? parseFloat(value) : parseInt(value, 10);
    }
    
    setStrategyParams(prev => ({
        ...prev,
        [strategyId]: {
            ...prev[strategyId],
            [paramName]: isNaN(parsedValue as number) && typeof parsedValue !== 'boolean' ? 0 : parsedValue,
        }
    }));
  };

  const handleDisciplineParamChange = (paramName: keyof DisciplineParams, value: any) => {
      handleParamChange(selectedStrategy, 'discipline', {
        ...(strategyParams[selectedStrategy]?.discipline || defaultDisciplineParams),
        [paramName]: value,
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
        if (apiKey && secretKey) {
            const { data: history } = await getTradeHistory(symbol, apiKey, secretKey);
            setTradeHistory(history);
        }
    };

    fetchData();

  }, [symbol, quoteAsset, interval, isConnected, isClient, date, getChartData, apiKey, secretKey]);

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
          const paramsForStrategy = strategyParams[selectedStrategy] || {};
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

    const dataWithSignals = await strategy.calculate(JSON.parse(JSON.stringify(data)), strategyParams, symbol);
    
    const trades: BacktestResult[] = [];
    let positionType: 'long' | 'short' | null = null;
    let entryPrice = 0;
    
    for (let i = 1; i < dataWithSignals.length; i++) {
        const d = dataWithSignals[i];

        if (positionType === 'long') {
            let exitPrice: number | null = null;
            const slPrice = entryPrice * (1 - (stopLoss || 0) / 100);
            const tpPrice = entryPrice * (1 + (takeProfit || 0) / 100);

            if (d.low <= slPrice) exitPrice = slPrice;
            else if (d.high >= tpPrice) exitPrice = tpPrice;
            else if (d.sellSignal) exitPrice = d.close;

            if (exitPrice !== null) {
                const quantity = (initialCapital * (leverage || 1)) / entryPrice;
                const grossPnl = (exitPrice - entryPrice) * quantity;
                const totalFee = (entryPrice * quantity + exitPrice * quantity) * (fee / 100);
                trades.push({ id: `silent-trade-${i}`, type: 'long', entryPrice, exitPrice, pnl: grossPnl - totalFee, fee: totalFee } as BacktestResult);
                positionType = null;
            }
        } else if (positionType === 'short') {
            let exitPrice: number | null = null;
            const slPrice = entryPrice * (1 + (stopLoss || 0) / 100);
            const tpPrice = entryPrice * (1 - (takeProfit || 0) / 100);

            if (d.high >= slPrice) exitPrice = slPrice;
            else if (d.low <= tpPrice) exitPrice = tpPrice;
            else if (d.buySignal) exitPrice = d.close;

            if (exitPrice !== null) {
                const quantity = (initialCapital * (leverage || 1)) / entryPrice;
                const grossPnl = (entryPrice - exitPrice) * quantity;
                const totalFee = (entryPrice * quantity + exitPrice * quantity) * (fee / 100);
                trades.push({ id: `silent-trade-${i}`, type: 'short', entryPrice, exitPrice, pnl: grossPnl - totalFee, fee: totalFee } as BacktestResult);
                positionType = null;
            }
        }

        if (positionType === null) {
            if (d.buySignal) { positionType = 'long'; entryPrice = d.close; } 
            else if (d.sellSignal) { positionType = 'short'; entryPrice = d.close; }
        }
    }
    
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalFees = trades.reduce((sum, t) => sum + (t.fee || 0), 0);
    const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = losses.reduce((sum, t) => sum + t.pnl, 0);

    const summary: BacktestSummary = {
      totalTrades: trades.length,
      winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
      totalPnl: totalPnl,
      totalFees,
      averageWin: wins.length > 0 ? totalWins / wins.length : 0,
      averageLoss: losses.length > 0 ? Math.abs(totalLosses / losses.length) : 0,
      profitFactor: totalLosses !== 0 ? Math.abs(totalWins / totalLosses) : Infinity,
      initialCapital,
      endingBalance: initialCapital + totalPnl,
      totalReturnPercent: initialCapital > 0 ? (totalPnl / initialCapital) * 100 : 0
    };
    return { summary, dataWithSignals, trades };
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

  const handleClearReport = () => {
    setBacktestResults([]);
    setSummaryStats(null);
    setOverfittingResult(null);
    setOutlierTradeIds([]);
    setContrarianResults(null);
    setContrarianSummary(null);
    setSelectedTrade(null);
    handleClearProjection();
    toast({ title: "Report Cleared", description: "The backtest results have been cleared from view." });
  };

  const runBacktest = async (contrarian = false) => {
    if (fullChartData.length === 0) {
      toast({
        title: "No Data",
        description: "Cannot run backtest without market data. Please connect your API and select a date range.",
        variant: "destructive",
      });
      return;
    }
    
    if (isReplaying) {
        console.warn("Attempted to run backtest while replay is active. This should be handled by stopAndRunBacktest.");
        return;
    }

    if (!contrarian) {
        setIsBacktesting(true);
        setBacktestResults([]);
        setSummaryStats(null);
        setOverfittingResult(null);
        setOutlierTradeIds([]);
        setContrarianResults(null);
        setContrarianSummary(null);
        setSelectedTrade(null);
        setProjectedData([]);
        setForwardTestTrades([]);
        setForwardTestSummary(null);
    }
    
    const strategy = getStrategyById(selectedStrategy);
    if (!strategy) {
      toast({ title: "No Strategy Selected", variant: "destructive" });
      setIsBacktesting(false);
      return;
    }

    toast({
      title: contrarian ? "Running Contrarian Analysis..." : "Backtest Started",
      description: `Running ${strategy.name} on ${symbol} (${interval}).`,
    });
    
    const baseParams = strategyParams[selectedStrategy] || {};
    const paramsForStrategy = contrarian ? { ...baseParams, reverse: !baseParams.reverse } : baseParams;

    const disciplineConfig = paramsForStrategy.discipline || defaultDisciplineParams;
    const riskGuardian = new RiskGuardian(disciplineConfig, initialCapital);

    let dataWithSignals = await strategy.calculate(JSON.parse(JSON.stringify(fullChartData)), paramsForStrategy, symbol);
    
    const trades: BacktestResult[] = [];
    let positionType: 'long' | 'short' | null = null;
    let entryPrice = 0;
    let entryTime = 0;
    let stopLossPrice = 0;
    let takeProfitPrice = 0;
    let tradeQuantity = 0;
    let entryReasoning: string | undefined;
    let entryConfidence: number | undefined;
    let entryPeakPrice: number | undefined;
    let aiValidationCount = 0;
    let aiLimitReachedNotified = false;

    // --- Main Backtesting Loop ---
    for (let i = 1; i < dataWithSignals.length; i++) {
      const d = dataWithSignals[i];

      // --- Exit Logic ---
      if (positionType !== null) {
        let exitPrice: number | null = null;
        let closeReason: BacktestResult['closeReason'] = 'signal';
        if (positionType === 'long') {
            if (d.low <= stopLossPrice) { exitPrice = stopLossPrice; closeReason = 'stop-loss'; }
            else if (d.high >= takeProfitPrice) { exitPrice = takeProfitPrice; closeReason = 'take-profit'; }
            else if (d.sellSignal) { exitPrice = d.close; closeReason = 'signal'; }
        } else { // short
            if (d.high >= stopLossPrice) { exitPrice = stopLossPrice; closeReason = 'stop-loss'; }
            else if (d.low <= takeProfitPrice) { exitPrice = takeProfitPrice; closeReason = 'take-profit'; }
            else if (d.buySignal) { exitPrice = d.close; closeReason = 'signal'; }
        }

        if (exitPrice !== null) {
          const entryValue = entryPrice * tradeQuantity;
          const exitValue = exitPrice * tradeQuantity;
          const totalFee = (entryValue + exitValue) * (fee / 100);
          const grossPnl = positionType === 'long' 
            ? exitValue - entryValue
            : entryValue - exitValue;
          const netPnl = grossPnl - totalFee;

          riskGuardian.registerTrade(netPnl);

          trades.push({
            id: `trade-${trades.length}`, type: positionType, entryTime, entryPrice, exitTime: d.time, exitPrice, pnl: netPnl,
            pnlPercent: (netPnl / initialCapital) * 100, closeReason, stopLoss: stopLossPrice, takeProfit: takeProfitPrice,
            fee: totalFee, reasoning: entryReasoning, confidence: entryConfidence, peakPrice: entryPeakPrice
          });
          positionType = null;
        }
      }

      // --- Entry Logic (Only if not in a position) ---
      if (positionType === null) {
        const potentialSignal: 'BUY' | 'SELL' | null = d.buySignal ? 'BUY' : d.sellSignal ? 'SELL' : null;
        
        const { allowed, reason } = riskGuardian.canTrade();
        if (!allowed) {
            if (!contrarian) {
                toast({ title: "Discipline Action", description: reason, variant: "destructive" });
            }
            continue; 
        }

        if (potentialSignal) {
          let isValidSignal = false;
          let prediction: PredictMarketOutput | null = null;
          
          if (useAIValidation && !contrarian) {
            if (aiValidationCount < maxAiValidations) {
              if (canUseAi()) {
                aiValidationCount++;
                try {
                  prediction = await predictMarket({
                      symbol: symbol,
                      recentData: JSON.stringify(dataWithSignals.slice(Math.max(0, i-50), i).map(k => ({t: k.time, o: k.open, h: k.high, l:k.low, c:k.close, v:k.volume}))),
                      strategySignal: potentialSignal
                  });
                  consumeAiCredit();
                  if ((prediction.prediction === 'UP' && potentialSignal === 'BUY') || (prediction.prediction === 'DOWN' && potentialSignal === 'SELL')) {
                    isValidSignal = true;
                  }
                } catch(e) {
                  console.error("AI validation failed", e);
                  isValidSignal = false; 
                }
              } else {
                toast({ title: "AI Quota Reached", description: "Skipping AI validation for this trade." });
                isValidSignal = true;
              }
            } else if (!aiLimitReachedNotified) {
              toast({ title: "AI Limit Reached", description: `Max ${maxAiValidations} AI validations performed.` });
              aiLimitReachedNotified = true;
              isValidSignal = true;
            } else {
              isValidSignal = true;
            }
          } else {
            isValidSignal = true;
          }
          
          if (isValidSignal) {
            entryPrice = d.close;
            entryTime = d.time;
            entryReasoning = prediction?.reasoning ?? 'Classic strategy signal.';
            entryConfidence = prediction?.confidence ?? 1;
            entryPeakPrice = d.peakPrice;
            tradeQuantity = (initialCapital * leverage) / entryPrice;

            if (potentialSignal === 'BUY') {
              positionType = 'long';
              stopLossPrice = d.stopLossLevel ?? (entryPrice * (1 - (stopLoss || 0) / 100));
              takeProfitPrice = entryPrice * (1 + (takeProfit || 0) / 100);
            } else {
              positionType = 'short';
              stopLossPrice = d.stopLossLevel ?? (entryPrice * (1 + (stopLoss || 0) / 100));
              takeProfitPrice = entryPrice * (1 - (takeProfit || 0) / 100);
            }
          }
        }
      }
    }

    // --- Summary Calculation ---
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalFees = trades.reduce((sum, t) => sum + (t.fee || 0), 0);
    const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = losses.reduce((sum, t) => sum + t.pnl, 0);

    const summary: BacktestSummary = {
      totalTrades: trades.length,
      winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
      totalPnl: totalPnl,
      totalFees,
      averageWin: wins.length > 0 ? totalWins / wins.length : 0,
      averageLoss: losses.length > 0 ? Math.abs(totalLosses / losses.length) : 0,
      profitFactor: totalLosses !== 0 ? Math.abs(totalWins / totalLosses) : Infinity,
      initialCapital,
      endingBalance: initialCapital + totalPnl,
      totalReturnPercent: initialCapital > 0 ? (totalPnl / initialCapital) * 100 : 0
    };
    
    if (contrarian) {
        setContrarianResults(trades);
        setContrarianSummary(summary);
    } else {
        setFullChartData(dataWithSignals);
        setBacktestResults(trades);
        setSummaryStats(summary);
        
        // Run overfitting analysis
        if (summary.totalTrades > 0) {
            const overfittingCheck = detectOverfitting(summary, fullChartData.length, trades);
            setOverfittingResult(overfittingCheck);
            setOutlierTradeIds(overfittingCheck.outlierTradeIds);
        }

        toast({
          title: "Backtest Complete",
          description: "Strategy signals and results are now available.",
        });

        await runBacktest(true);
        setIsBacktesting(false);
    }
  };


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
    const paramsForStrategy = strategyParams[selectedStrategy] || {};
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
  
  const anyLoading = isBacktesting || isFetchingData || isOptimizing || isProjecting;

  const handleIntervalChange = (newInterval: string) => {
    setInterval(newInterval);
    setFullChartData([]);
  };

  const handleExport = (targetPage: 'live' | 'manual' | 'simulation') => {
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

    let pageName = "";
    let route = "";

    switch (targetPage) {
        case 'live':
            addBotInstance({ ...currentConfig, isManual: false });
            pageName = "Live Trading";
            route = "/live";
            break;
        case 'manual':
            addBotInstance({ ...currentConfig, isManual: true });
            pageName = "Manual Trading";
            route = "/manual";
            break;
        case 'simulation':
            setSimulationConfigForNextLoad(currentConfig);
            pageName = "Paper Trading";
            route = "/simulation";
            break;
    }

    toast({
        title: `Exported to ${pageName}`,
        description: `Configuration for ${symbol} with ${getStrategyById(selectedStrategy)?.name} strategy has been sent to the ${pageName} page.`
    });
    router.push(route);
};


  const handleClearTradeHistory = () => {
    setTradeHistory([]);
    toast({
        title: "Trade History Cleared",
        description: "Your trade history has been cleared from view. It will reappear on the next data fetch."
    })
  }

  const handleProjectAndTest = async () => {
    if (fullChartData.length === 0) {
      toast({ title: "No Data", description: "Please load market data before projecting.", variant: "destructive" });
      return;
    }
    
    setIsProjecting(true);
    setForwardTestSummary(null);
    setForwardTestTrades([]);
    toast({ title: "Generating Projection..." });

    // Use a timeout to allow the UI to update before the potentially blocking generation starts
    setTimeout(async () => {
      try {
        const newProjectedCandles = generateProjectedCandles(fullChartData, projectionMode, projectionDuration, interval);
        
        const strategyToTest = getStrategyById(selectedStrategy);
        if (!strategyToTest) {
            setProjectedData(newProjectedCandles);
            toast({ title: "Projection Generated", description: "No strategy selected to forward-test." });
            setIsProjecting(false);
            return;
        }

        const paramsForStrategy = { ...(strategyParams[selectedStrategy] || {}), reverse: false }; // Forward test always uses standard logic
        
        const { summary: fwdSummary, trades: fwdTrades, dataWithSignals: fwdData } = await runSilentBacktest(newProjectedCandles, {
            strategyId: selectedStrategy,
            strategyParams: paramsForStrategy,
            initialCapital, leverage, takeProfit, stopLoss, fee, symbol
        });
        
        setProjectedData(fwdData);
        setForwardTestTrades(fwdTrades);
        setForwardTestSummary(fwdSummary);
        
        toast({ title: "Forward Test Complete", description: "Strategy performance on the projected data is now available." });
      } catch (e: any) {
        toast({ title: "Projection Failed", description: e.message, variant: "destructive" });
      } finally {
        setIsProjecting(false);
      }
    }, 50);
  };
  
  const handleClearProjection = () => {
    setProjectedData([]);
    setForwardTestSummary(null);
    setForwardTestTrades([]);
    setSelectedForwardTrade(null);
    toast({ title: "Projection Cleared", description: "The chart and report have been reset." });
  };


  const renderParameterControls = () => {
    const params = strategyParams[selectedStrategy] || {};

    // Special UI for hyper-peak-formation
    if (selectedStrategy === 'hyper-peak-formation' || selectedStrategy === 'hyper-peak-formation-old') {
      const isOld = selectedStrategy === 'hyper-peak-formation-old';
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="peakLookaround">Peak Lookaround</Label>
              <Input id="peakLookaround" type="number" value={params.peakLookaround || 0} onChange={(e) => handleParamChange(selectedStrategy, 'peakLookaround', e.target.value)} disabled={anyLoading || isReplaying} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="swingLookaround">Swing Lookaround</Label>
              <Input id="swingLookaround" type="number" value={params.swingLookaround || 0} onChange={(e) => handleParamChange(selectedStrategy, 'swingLookaround', e.target.value)} disabled={anyLoading || isReplaying} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emaShortPeriod">EMA Short</Label>
              <Input id="emaShortPeriod" type="number" value={params.emaShortPeriod || 0} onChange={(e) => handleParamChange(selectedStrategy, 'emaShortPeriod', e.target.value)} disabled={anyLoading || isReplaying} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emaLongPeriod">EMA Long</Label>
              <Input id="emaLongPeriod" type="number" value={params.emaLongPeriod || 0} onChange={(e) => handleParamChange(selectedStrategy, 'emaLongPeriod', e.target.value)} disabled={anyLoading || isReplaying} />
            </div>
            {isOld ? (
                 <div className="space-y-2">
                    <Label htmlFor="maxLookahead">Max Lookahead (Repainting)</Label>
                    <Input id="maxLookahead" type="number" value={params.maxLookahead || 0} onChange={(e) => handleParamChange(selectedStrategy, 'maxLookahead', e.target.value)} disabled={anyLoading || isReplaying} />
                </div>
            ) : (
                <div className="space-y-2">
                    <Label htmlFor="signalStaleness">Signal Staleness</Label>
                    <Input id="signalStaleness" type="number" value={params.signalStaleness || 0} onChange={(e) => handleParamChange(selectedStrategy, 'signalStaleness', e.target.value)} disabled={anyLoading || isReplaying} />
                </div>
            )}
          </div>
          <div className="flex items-center space-x-2 pt-4">
            <Switch
              id="reverse-logic-hpf"
              checked={params.reverse || false}
              onCheckedChange={(checked) => handleParamChange(selectedStrategy, 'reverse', checked)}
              disabled={anyLoading || isReplaying}
            />
            <div className="flex flex-col">
              <Label htmlFor="reverse-logic-hpf" className="cursor-pointer">Reverse Logic (Contrarian Mode)</Label>
              <p className="text-xs text-muted-foreground">Trade against the strategy's signals.</p>
            </div>
          </div>
        </div>
      );
    }

    // Special UI for code-based-consensus
    if (selectedStrategy === 'code-based-consensus') {
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

      return (
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
           <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="reverse-logic-consensus"
                  checked={params.reverse || false}
                  onCheckedChange={(checked) => handleParamChange(selectedStrategy, 'reverse', checked)}
                  disabled={anyLoading || isReplaying}
                />
                <div className="flex flex-col">
                  <Label htmlFor="reverse-logic-consensus" className="cursor-pointer">Reverse Logic (Contrarian Mode)</Label>
                  <p className="text-xs text-muted-foreground">Trade against the consensus signal.</p>
                </div>
            </div>
        </div>
      );
    }
    
    // Special UI for MTF Engulfing
    if (selectedStrategy === 'mtf-engulfing') {
        return (
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
                    <div className="space-y-2">
                        <Label htmlFor="emaLength">EMA Length</Label>
                        <Input id="emaLength" type="number" value={params.emaLength || 0} onChange={(e) => handleParamChange(selectedStrategy, 'emaLength', e.target.value)} disabled={anyLoading || isReplaying} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="atrLength">ATR Length</Label>
                        <Input id="atrLength" type="number" value={params.atrLength || 0} onChange={(e) => handleParamChange(selectedStrategy, 'atrLength', e.target.value)} disabled={anyLoading || isReplaying} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="slAtrMultiplier">SL ATR Multiplier</Label>
                        <Input id="slAtrMultiplier" type="number" step="0.1" value={params.slAtrMultiplier || 0} onChange={(e) => handleParamChange(selectedStrategy, 'slAtrMultiplier', e.target.value)} disabled={anyLoading || isReplaying} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rrRatio">Risk/Reward Ratio</Label>
                        <Input id="rrRatio" type="number" step="0.1" value={params.rrRatio || 0} onChange={(e) => handleParamChange(selectedStrategy, 'rrRatio', e.target.value)} disabled={anyLoading || isReplaying} />
                    </div>
                </div>
                 <div className="flex items-center space-x-2 pt-2">
                    <Switch
                    id="reverse-logic"
                    checked={params.reverse || false}
                    onCheckedChange={(checked) => handleParamChange(selectedStrategy, 'reverse', checked)}
                    disabled={anyLoading || isReplaying}
                    />
                    <div className="flex flex-col">
                    <Label htmlFor="reverse-logic" className="cursor-pointer">Reverse Logic (Contrarian Mode)</Label>
                    <p className="text-xs text-muted-foreground">Trade against the strategy's signals.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (selectedStrategy === 'smi-mfi-supertrend') {
        const canOptimize = !!optimizationConfigs[selectedStrategy];
        const canReset = !!DEFAULT_PARAMS_MAP[selectedStrategy];
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="supertrendPeriod">Supertrend Period</Label>
                        <Input id="supertrendPeriod" type="number" value={params.supertrendPeriod || 0} onChange={(e) => handleParamChange(selectedStrategy, 'supertrendPeriod', e.target.value)} disabled={anyLoading || isReplaying} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="supertrendMultiplier">Supertrend Multiplier</Label>
                        <Input id="supertrendMultiplier" type="number" step="0.1" value={params.supertrendMultiplier || 0} onChange={(e) => handleParamChange(selectedStrategy, 'supertrendMultiplier', e.target.value)} disabled={anyLoading || isReplaying} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mfiPeriod">MFI Period</Label>
                        <Input id="mfiPeriod" type="number" value={params.mfiPeriod || 0} onChange={(e) => handleParamChange(selectedStrategy, 'mfiPeriod', e.target.value)} disabled={anyLoading || isReplaying} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="smiPeriod">SMI Period</Label>
                        <Input id="smiPeriod" type="number" value={params.smiPeriod || 0} onChange={(e) => handleParamChange(selectedStrategy, 'smiPeriod', e.target.value)} disabled={anyLoading || isReplaying} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="smiEmaPeriod">SMI EMA Period</Label>
                        <Input id="smiEmaPeriod" type="number" value={params.smiEmaPeriod || 0} onChange={(e) => handleParamChange(selectedStrategy, 'smiEmaPeriod', e.target.value)} disabled={anyLoading || isReplaying} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="overbought">Overbought Level</Label>
                        <Input id="overbought" type="number" value={params.overbought || 0} onChange={(e) => handleParamChange(selectedStrategy, 'overbought', e.target.value)} disabled={anyLoading || isReplaying} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="oversold">Oversold Level</Label>
                        <Input id="oversold" type="number" value={params.oversold || 0} onChange={(e) => handleParamChange(selectedStrategy, 'oversold', e.target.value)} disabled={anyLoading || isReplaying} />
                    </div>
                </div>
                 <div className="flex items-center space-x-2 pt-2">
                    <Switch
                    id="reverse-logic"
                    checked={params.reverse || false}
                    onCheckedChange={(checked) => handleParamChange(selectedStrategy, 'reverse', checked)}
                    disabled={anyLoading || isReplaying}
                    />
                    <div className="flex flex-col">
                    <Label htmlFor="reverse-logic" className="cursor-pointer">Reverse Logic (Contrarian Mode)</Label>
                    <p className="text-xs text-muted-foreground">Trade against the strategy's signals.</p>
                    </div>
                </div>
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
    }
    
    // Filter out 'strategies' from the regular parameter display
    const filteredParams = Object.fromEntries(Object.entries(params).filter(([key]) => key !== 'strategies' && key !== 'reverse' && key !== 'discipline'));

    if (Object.keys(filteredParams).length === 0 && selectedStrategy !== 'none') {
        return (
            <div className="flex items-center space-x-2 pt-2">
                <Switch
                    id="reverse-logic"
                    checked={params.reverse || false}
                    onCheckedChange={(checked) => handleParamChange(selectedStrategy, 'reverse', checked)}
                    disabled={anyLoading || isReplaying}
                />
                <div className="flex flex-col">
                  <Label htmlFor="reverse-logic" className="cursor-pointer">Reverse Logic (Contrarian Mode)</Label>
                  <p className="text-xs text-muted-foreground">Trade against the strategy's signals.</p>
                </div>
            </div>
        );
    }
    
    if (Object.keys(filteredParams).length === 0) {
        return <p className="text-sm text-muted-foreground">This strategy has no tunable parameters.</p>;
    }

    const controls = Object.entries(filteredParams).map(([key, value]) => {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key} className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
          <Input 
            id={key}
            type="number"
            value={value as number || 0}
            onChange={(e) => handleParamChange(selectedStrategy, key, e.target.value)}
            step={String(value).includes('.') ? '0.001' : '1'}
            disabled={anyLoading || isReplaying}
          />
        </div>
      );
    });

    const canOptimize = !!optimizationConfigs[selectedStrategy];
    const canReset = !!DEFAULT_PARAMS_MAP[selectedStrategy];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">{controls}</div>
         <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="reverse-logic"
              checked={params.reverse || false}
              onCheckedChange={(checked) => handleParamChange(selectedStrategy, 'reverse', checked)}
              disabled={anyLoading || isReplaying}
            />
            <div className="flex flex-col">
              <Label htmlFor="reverse-logic" className="cursor-pointer">Reverse Logic (Contrarian Mode)</Label>
              <p className="text-xs text-muted-foreground">Trade against the strategy's signals.</p>
            </div>
          </div>
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
        <div className="relative pb-4">
            <div className="flex flex-col" style={{ height: `${chartHeight}px` }}>
                <TradingChart data={visibleChartData} projectedData={projectedData} symbol={symbol} interval={interval} onIntervalChange={handleIntervalChange} highlightedTrade={selectedTrade || selectedForwardTrade} />
            </div>
            <div
                onMouseDown={startChartResize}
                className="absolute bottom-0 left-0 w-full h-4 flex items-center justify-center cursor-ns-resize group"
            >
                <GripHorizontal className="h-5 w-5 text-muted-foreground/30 transition-colors group-hover:text-primary" />
            </div>
        </div>
        {summaryStats && <BacktestResults 
          results={backtestResults} 
          summary={summaryStats} 
          onSelectTrade={setSelectedTrade}
          selectedTradeId={selectedTrade?.id}
          outlierTradeIds={outlierTradeIds}
        />}

        {summaryStats && overfittingResult && (
            <OverfittingAnalysisCard result={overfittingResult} />
        )}

        {forwardTestSummary && <BacktestResults 
            results={forwardTestTrades} 
            summary={forwardTestSummary} 
            onSelectTrade={setSelectedForwardTrade}
            selectedTradeId={selectedForwardTrade?.id}
            title="Forward Test Report"
        />}

        {summaryStats && summaryStats.totalPnl < 0 && contrarianSummary && contrarianSummary.totalPnl > 0 && (
            <BacktestResults 
                results={contrarianResults || []} 
                summary={contrarianSummary} 
                onSelectTrade={() => {}} // Contrarian trades not selectable on chart
                title="Contrarian Report"
            />
        )}
      </div>
      <div className="xl:col-span-2 space-y-6">
        <Card>
          <Collapsible open={isControlsOpen} onOpenChange={setControlsOpen}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Backtest Controls</CardTitle>
                <CardDescription>Configure your backtesting parameters.</CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isControlsOpen && "rotate-180")} />
                      <span className="sr-only">Toggle</span>
                  </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <Separator className="my-0" />
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="base-asset">Base</Label>
                      <Select onValueChange={setBaseAsset} value={baseAsset} disabled={!isConnected || anyLoading || isReplaying}>
                        <SelectTrigger id="base-asset">
                          <SelectValue placeholder="Select asset" />
                        </SelectTrigger>
                        <SelectContent>
                          {topAssets.map(asset => (
                            <SelectItem key={asset.ticker} value={asset.ticker}>{asset.ticker} - {asset.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quote-asset">Quote</Label>
                      <Select onValueChange={setQuoteAsset} value={quoteAsset} disabled={!isConnected || anyLoading || availableQuotes.length === 0 || isReplaying}>
                        <SelectTrigger id="quote-asset">
                          <SelectValue placeholder="Select asset" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableQuotes.map(asset => (
                            <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                          disabled={anyLoading || isReplaying}
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
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto flex p-0" align="start">
                         <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={date?.from}
                          selected={date}
                          onSelect={setDate}
                          numberOfMonths={1}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                <div className="space-y-2">
                    <Label htmlFor="strategy">Strategy</Label>
                    <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={anyLoading || isReplaying}>
                        <SelectTrigger id="strategy">
                        <SelectValue placeholder="Select strategy" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="none">None (Candles Only)</SelectItem>
                        {activeStrategies.map(strategy => (
                            <SelectItem key={strategy.id} value={strategy.id}>{strategy.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    {selectedStrategy !== 'none' && (
                        <div className="flex flex-wrap gap-1 pt-1">
                            {(strategyIndicatorMap[selectedStrategy] || []).map(indicator => (
                                <Badge key={indicator} variant="secondary">{indicator}</Badge>
                            ))}
                        </div>
                    )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Interval</Label>
                  <Select onValueChange={handleIntervalChange} value={interval} disabled={anyLoading || isReplaying}>
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

                <Collapsible open={isParamsOpen} onOpenChange={setParamsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <BrainCircuit className="mr-2 h-4 w-4" />
                      <span>Strategy Parameters</span>
                      <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", isParamsOpen && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 border rounded-md bg-muted/50 space-y-4">
                    {renderParameterControls()}
                  </CollapsibleContent>
                </Collapsible>
                
                 <DisciplineSettings 
                    params={strategyParams[selectedStrategy]?.discipline || defaultDisciplineParams}
                    onParamChange={handleDisciplineParamChange}
                    isDisabled={anyLoading || isReplaying}
                />
                
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="initial-capital">Initial Capital ($)</Label>
                        <Input 
                            id="initial-capital" 
                            type="number" 
                            value={initialCapital}
                            onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)}
                            placeholder="10000"
                            disabled={anyLoading || isReplaying}
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
                            disabled={anyLoading || isReplaying}
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
                            disabled={anyLoading || isReplaying}
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
                            disabled={anyLoading || isReplaying}
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
                            disabled={anyLoading || isReplaying}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                  <Label>Analysis Tools</Label>
                  <div className="p-3 border rounded-md bg-muted/50 space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch id="ai-validation" checked={useAIValidation} onCheckedChange={setUseAIValidation} disabled={anyLoading || isReplaying || selectedStrategy === 'code-based-consensus'} />
                        <div className="flex flex-col">
                            <Label htmlFor="ai-validation" className="cursor-pointer">Enable AI Validation</Label>
                            <p className="text-xs text-muted-foreground">Let an AI validate each signal. Slower but more accurate.</p>
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
                                  disabled={anyLoading || isReplaying}
                              />
                              <p className="text-xs text-muted-foreground">Limits AI calls to prevent exceeding API quotas.</p>
                              </div>
                          </>
                      )}
                  </div>
                </div>
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
                          <Send className="mr-2 h-4 w-4"/>
                          Export Strategy
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport('live')}>
                        <Bot className="mr-2 h-4 w-4"/>
                        Export to Live Trading
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('manual')}>
                        <Bot className="mr-2 h-4 w-4"/>
                        Export to Manual Trading
                      </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => handleExport('simulation')}>
                        <TestTube className="mr-2 h-4 w-4"/>
                        Export to Paper Trading
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex w-full gap-2">
                    <Button className="w-full" variant="outline" onClick={isReplaying ? handleStopReplayAndRunBacktest : startReplay} disabled={anyLoading || fullChartData.length < 50}>
                        {isReplaying ? <History className="mr-2 h-4 w-4"/> : <Play className="mr-2 h-4 w-4"/>}
                        {isReplaying ? "View Full Report" : "Start Replay"}
                    </Button>
                    <Button className="w-full" variant="destructive" onClick={handleClearReport} disabled={anyLoading || !summaryStats}>
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Clear Report
                    </Button>
                </div>
                 {isReplaying && (
                    <Card>
                        <CardHeader className="p-4">
                            <CardTitle className="text-base">Replay Controls ({replayIndex + 1} / {fullChartData.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="flex items-center justify-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleReplayStep('backward')} disabled={isPlaying || replayIndex <= 50}><StepBack/></Button>
                                <Button variant="outline" size="icon" onClick={togglePlayPause}>{isPlaying ? <Pause/> : <Play/>}</Button>
                                <Button variant="ghost" size="icon" onClick={() => handleReplayStep('forward')} disabled={isPlaying || replayIndex >= fullChartData.length -1}><StepForward/></Button>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <Button size="sm" variant={replaySpeed === 1000 ? 'default' : 'outline'} onClick={() => setReplaySpeed(1000)}>Slow</Button>
                              <Button size="sm" variant={replaySpeed === 500 ? 'default' : 'outline'} onClick={() => setReplaySpeed(500)}>Medium</Button>
                              <Button size="sm" variant={replaySpeed === 200 ? 'default' : 'outline'} onClick={() => setReplaySpeed(200)}>Fast</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
              </CardFooter>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><AreaChart/> Future Projection &amp; Forward Testing</CardTitle>
                <CardDescription>Stress-test your strategy against hypothetical future data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label>Projection Mode</Label>
                    <RadioGroup value={projectionMode} onValueChange={(v) => setProjectionMode(v as any)} className="grid grid-cols-2 gap-4 mt-2" disabled={isProjecting}>
                        <div className="col-span-2"><RadioGroupItem value="frankenstein" id="frankenstein" /><Label htmlFor="frankenstein" className="ml-2 font-semibold">Frankenstein (Recommended)</Label></div>
                        <div><RadioGroupItem value="upward" id="upward" /><Label htmlFor="upward" className="ml-2">Upward Trend</Label></div>
                        <div><RadioGroupItem value="downward" id="downward" /><Label htmlFor="downward" className="ml-2">Downward Trend</Label></div>
                        <div><RadioGroupItem value="neutral" id="neutral" /><Label htmlFor="neutral" className="ml-2">Neutral</Label></div>
                        <div><RadioGroupItem value="random" id="random" /><Label htmlFor="random" className="ml-2">Random</Label></div>
                    </RadioGroup>
                </div>
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
                <Button className="w-full" onClick={handleProjectAndTest} disabled={anyLoading || fullChartData.length === 0}>
                    {isProjecting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                    {isProjecting ? 'Generating...' : 'Project & Test'}
                </Button>
                <Button className="w-full" variant="outline" onClick={handleClearProjection} disabled={projectedData.length === 0 || anyLoading}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Projection
                </Button>
            </CardFooter>
        </Card>

      </div>
    </div>
    <div className="mt-6">
        <TradeHistory trades={tradeHistory} onClear={handleClearTradeHistory} />
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

    