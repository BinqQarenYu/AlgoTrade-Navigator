

"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { TradingChart } from "@/components/trading-chart"
import { PineScriptEditor } from "@/components/pine-script-editor"
import { getHistoricalKlines } from "@/lib/binance-service"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CalendarIcon, Loader2, Terminal, Bot, ChevronDown, BrainCircuit, Wand2, RotateCcw, GripHorizontal } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format, addDays } from "date-fns"
import type { HistoricalData, BacktestResult, BacktestSummary } from "@/lib/types"
import { BacktestResults } from "@/components/backtest-results"
import { Switch } from "@/components/ui/switch"
import { predictMarket, PredictMarketOutput } from "@/ai/flows/predict-market-flow"
import { topAssets, getAvailableQuotesForBase } from "@/lib/assets"
import { strategyMetadatas, getStrategyById, strategyIndicatorMap } from "@/lib/strategies"
import { optimizationConfigs, StrategyOptimizationConfig } from "@/lib/strategies/optimization"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"

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
}

// Helper to generate parameter combinations for auto-tuning
const generateCombinations = (config: StrategyOptimizationConfig): any[] => {
    const keys = Object.keys(config);
    if (keys.length === 0) return [];
    
    const ranges = keys.map(key => {
        const { min, max, step } = config[key];
        const values = [];
        // Handle floating point inaccuracies by fixing precision
        const precision = (String(step).split('.')[1] || '').length;
        for (let i = min; i <= max; i = parseFloat((i + step).toFixed(precision))) {
            values.push(i);
        }
        return values;
    });

    const combinations: any[] = [];
    const max = ranges.length - 1;

    function helper(arr: any[], i: number) {
        for (let j = 0, l = ranges[i].length; j < l; j++) {
            const a = arr.slice(0); // clone arr
            a.push(ranges[i][j]);
            if (i === max) {
                const combo: Record<string, number> = {};
                keys.forEach((key, index) => {
                    combo[key] = a[index];
                });
                // Validation for common crossover strategies
                if (combo.longPeriod && combo.shortPeriod && combo.longPeriod <= combo.shortPeriod) return;
                combinations.push(combo);
            } else {
                helper(a, i + 1);
            }
        }
    }
    helper([], 0);
    return combinations;
}

const usePersistentState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        // Special handling for date ranges, as they need to be rehydrated as Date objects
        if (key.endsWith('-date-range') && parsed) {
          if (parsed.from) parsed.from = new Date(parsed.from);
          if (parsed.to) parsed.to = new Date(parsed.to);
        }
        if (isMounted) {
          setState(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to parse stored state', e);
      localStorage.removeItem(key);
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


export default function BacktestPage() {
  const { toast } = useToast()
  const { isConnected, canUseAi, consumeAiCredit } = useApi();
  const { isTradingActive, strategyParams, setStrategyParams } = useBot();

  const [date, setDate] = usePersistentState<DateRange | undefined>('backtest-date-range', undefined);
  const [isClient, setIsClient] = useState(false)
  const [baseAsset, setBaseAsset] = usePersistentState<string>("backtest-base-asset", "BTC");
  const [quoteAsset, setQuoteAsset] = usePersistentState<string>("backtest-quote-asset", "USDT");
  const [availableQuotes, setAvailableQuotes] = useState<string[]>([]);
  const [chartHeight, setChartHeight] = usePersistentState<number>('backtest-chart-height', 600);

  const symbol = useMemo(() => `${baseAsset}${quoteAsset}`, [baseAsset, quoteAsset]);

  const [chartData, setChartData] = useState<HistoricalData[]>([]);
  const [dataWithIndicators, setDataWithIndicators] = useState<HistoricalData[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = usePersistentState<string>('backtest-strategy', strategyMetadatas[0].id);
  const [interval, setInterval] = usePersistentState<string>('backtest-interval', "1h");
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([]);
  const [summaryStats, setSummaryStats] = useState<BacktestSummary | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<BacktestResult | null>(null);

  const [initialCapital, setInitialCapital] = usePersistentState<number>('backtest-initial-capital', 100);
  const [leverage, setLeverage] = usePersistentState<number>('backtest-leverage', 10);
  const [takeProfit, setTakeProfit] = usePersistentState<number>('backtest-tp', 5);
  const [stopLoss, setStopLoss] = usePersistentState<number>('backtest-sl', 2);
  const [fee, setFee] = usePersistentState<number>('backtest-fee', 0.04);
  const [useAIValidation, setUseAIValidation] = usePersistentState<boolean>('backtest-ai-validation', false);
  const [maxAiValidations, setMaxAiValidations] = usePersistentState<number>('backtest-max-validations', 20);
  const [isControlsOpen, setControlsOpen] = usePersistentState<boolean>('backtest-controls-open', true);
  const [isParamsOpen, setParamsOpen] = usePersistentState<boolean>('backtest-params-open', false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleParamChange = (strategyId: string, paramName: string, value: string | string[] | boolean) => {
    if (typeof value === 'boolean') {
      setStrategyParams(prev => ({
            ...prev,
            [strategyId]: { ...prev[strategyId], [paramName]: value }
      }));
    } else if (Array.isArray(value)) {
       setStrategyParams(prev => ({
            ...prev,
            [strategyId]: { ...prev[strategyId], [paramName]: value }
        }));
    } else {
        const parsedValue = value.includes('.') ? parseFloat(value) : parseInt(value, 10);
        setStrategyParams(prev => ({
            ...prev,
            [strategyId]: { ...prev[strategyId], [paramName]: isNaN(parsedValue) ? 0 : parsedValue }
        }));
    }
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
    if (!date) {
        setDate({
            from: addDays(new Date(), -7),
            to: new Date(),
        })
    }
  }, [date, setDate])

  useEffect(() => {
    const quotes = getAvailableQuotesForBase(baseAsset);
    setAvailableQuotes(quotes);
    if (!quotes.includes(quoteAsset)) {
      setQuoteAsset(quotes[0] || '');
    }
  }, [baseAsset, quoteAsset, setQuoteAsset]);
  
  // Effect to fetch raw data from the API
  useEffect(() => {
    if (!isClient || isTradingActive || !symbol || !quoteAsset) return;

    const fetchData = async () => {
        if (!isConnected || !date?.from || !date?.to) {
            setChartData([]);
            return;
        }
        setIsFetchingData(true);
        setChartData([]);
        setDataWithIndicators([]);
        setBacktestResults([]);
        setSummaryStats(null);
        setSelectedTrade(null);
        toast({ title: "Fetching Market Data...", description: `Loading ${interval} data for ${symbol}.`});
        try {
            const klines = await getHistoricalKlines(symbol, interval, date.from.getTime(), date.to.getTime());
            setChartData(klines); // This triggers the indicator calculation effect
            toast({ title: "Data Loaded", description: `Market data for ${symbol} is ready.` });
        } catch (error: any)
{
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
  }, [symbol, quoteAsset, date, interval, isConnected, isClient, toast, isTradingActive]);

  // Effect to calculate and display indicators when strategy or data changes
  useEffect(() => {
    const calculateAndSetIndicators = async () => {
      if (chartData.length === 0) {
        setDataWithIndicators([]);
        return;
      }
      
      const strategy = getStrategyById(selectedStrategy);
      let dataWithInd: HistoricalData[];

      if (strategy) {
          const paramsForStrategy = strategyParams[selectedStrategy] || {};
          dataWithInd = await strategy.calculate(chartData, paramsForStrategy);
      } else {
          dataWithInd = chartData;
      }

      // Clear signals for display, we only want to see indicators, not past signals
      const dataWithoutSignals = dataWithInd.map(d => ({...d, buySignal: undefined, sellSignal: undefined}));
      setDataWithIndicators(dataWithoutSignals);
    };
    
    calculateAndSetIndicators();
  }, [chartData, selectedStrategy, strategyParams]);

  const runSilentBacktest = async (data: HistoricalData[], params: any): Promise<{summary: BacktestSummary | null, dataWithSignals: HistoricalData[]}> => {
    const { strategyId, strategyParams, initialCapital, leverage, takeProfit, stopLoss, fee } = params;
    const strategy = getStrategyById(strategyId);
    if (!strategy) return { summary: null, dataWithSignals: data };

    const dataWithSignals = await strategy.calculate(JSON.parse(JSON.stringify(data)), strategyParams);
    
    const trades: BacktestResult[] = [];
    let positionType: 'long' | 'short' | null = null;
    let entryPrice = 0;
    let entryTime = 0;
    let stopLossPrice = 0;
    let takeProfitPrice = 0;
    let tradeQuantity = 0;
    
    for (let i = 1; i < dataWithSignals.length; i++) {
        const d = dataWithSignals[i];

        if (positionType === 'long') {
            let exitPrice: number | null = null;
            if (d.low <= stopLossPrice) exitPrice = stopLossPrice;
            else if (d.high >= takeProfitPrice) exitPrice = takeProfitPrice;
            else if (d.sellSignal) exitPrice = d.close;

            if (exitPrice !== null) {
                const entryFee = entryPrice * tradeQuantity * (fee / 100);
                const exitFee = exitPrice * tradeQuantity * (fee / 100);
                const pnl = (exitPrice - entryPrice) * tradeQuantity - (entryFee + exitFee);
                trades.push({ type: 'long', entryTime, entryPrice, exitTime: d.time, exitPrice, pnl } as BacktestResult);
                positionType = null;
            }
        } else if (positionType === 'short') {
            let exitPrice: number | null = null;
            if (d.high >= stopLossPrice) exitPrice = stopLossPrice;
            else if (d.low <= takeProfitPrice) exitPrice = takeProfitPrice;
            else if (d.buySignal) exitPrice = d.close;

            if (exitPrice !== null) {
                const entryFee = entryPrice * tradeQuantity * (fee / 100);
                const exitFee = exitPrice * tradeQuantity * (fee / 100);
                const pnl = (entryPrice - exitPrice) * tradeQuantity - (entryFee + exitFee);
                trades.push({ type: 'short', entryTime, entryPrice, exitTime: d.time, exitPrice, pnl } as BacktestResult);
                positionType = null;
            }
        }

        if (positionType === null) {
            if (d.buySignal) {
                positionType = 'long';
                entryPrice = d.close;
                entryTime = d.time;
                stopLossPrice = d.stopLossLevel ?? (entryPrice * (1 - (stopLoss || 0) / 100));
                takeProfitPrice = entryPrice * (1 + (takeProfit || 0) / 100);
                tradeQuantity = (initialCapital * (leverage || 1)) / entryPrice;
            } else if (d.sellSignal) {
                positionType = 'short';
                entryPrice = d.close;
                entryTime = d.time;
                stopLossPrice = d.stopLossLevel ?? (entryPrice * (1 + (stopLoss || 0) / 100));
                takeProfitPrice = entryPrice * (1 - (takeProfit || 0) / 100);
                tradeQuantity = (initialCapital * (leverage || 1)) / entryPrice;
            }
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
    return { summary, dataWithSignals };
  }

  const handleRunBacktestClick = () => {
    if (useAIValidation) {
        if (canUseAi()) {
            setIsConfirming(true);
        }
    } else {
        runBacktest();
    }
  };

  const runBacktest = async () => {
    if (chartData.length === 0) {
      toast({
        title: "No Data",
        description: "Cannot run backtest without market data. Please connect your API and select a date range.",
        variant: "destructive",
      });
      return;
    }

    setIsBacktesting(true);
    setBacktestResults([]);
    setSummaryStats(null);
    setSelectedTrade(null);

    const strategy = getStrategyById(selectedStrategy);
    if (!strategy) {
      toast({ title: "No Strategy Selected", variant: "destructive" });
      setIsBacktesting(false);
      return;
    }

    toast({
      title: "Backtest Started",
      description: `Running ${strategy.name} on ${symbol} (${interval}).`,
    });

    const paramsForStrategy = strategyParams[selectedStrategy] || {};
    let dataWithSignals = await strategy.calculate(JSON.parse(JSON.stringify(chartData)), paramsForStrategy);
    
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
      if (positionType === 'long') {
        let exitPrice: number | null = null;
        let closeReason: BacktestResult['closeReason'] = 'signal';
        if (d.low <= stopLossPrice) { exitPrice = stopLossPrice; closeReason = 'stop-loss'; }
        else if (d.high >= takeProfitPrice) { exitPrice = takeProfitPrice; closeReason = 'take-profit'; }
        else if (d.sellSignal) { exitPrice = d.close; closeReason = 'signal'; }

        if (exitPrice !== null) {
          const entryFeeValue = entryPrice * tradeQuantity * (fee / 100);
          const exitFeeValue = exitPrice * tradeQuantity * (fee / 100);
          const pnl = (exitPrice - entryPrice) * tradeQuantity - (entryFeeValue + exitFeeValue);
          trades.push({
            id: `trade-${trades.length}`, type: 'long', entryTime, entryPrice, exitTime: d.time, exitPrice, pnl,
            pnlPercent: (pnl / initialCapital) * 100, closeReason, stopLoss: stopLossPrice, takeProfit: takeProfitPrice,
            fee: entryFeeValue + exitFeeValue, reasoning: entryReasoning, confidence: entryConfidence, peakPrice: entryPeakPrice
          });
          positionType = null;
        }
      } else if (positionType === 'short') {
        let exitPrice: number | null = null;
        let closeReason: BacktestResult['closeReason'] = 'signal';
        if (d.high >= stopLossPrice) { exitPrice = stopLossPrice; closeReason = 'stop-loss'; }
        else if (d.low <= takeProfitPrice) { exitPrice = takeProfitPrice; closeReason = 'signal'; }
        else if (d.buySignal) { exitPrice = d.close; closeReason = 'signal'; }

        if (exitPrice !== null) {
          const entryFeeValue = entryPrice * tradeQuantity * (fee / 100);
          const exitFeeValue = exitPrice * tradeQuantity * (fee / 100);
          const pnl = (entryPrice - exitPrice) * tradeQuantity - (entryFeeValue + exitFeeValue);
          trades.push({
            id: `trade-${trades.length}`, type: 'short', entryTime, entryPrice, exitTime: d.time, exitPrice, pnl,
            pnlPercent: (pnl / initialCapital) * 100, closeReason, stopLoss: stopLossPrice, takeProfit: takeProfitPrice,
            fee: entryFeeValue + exitFeeValue, reasoning: entryReasoning, confidence: entryConfidence, peakPrice: entryPeakPrice
          });
          positionType = null;
        }
      }

      // --- Entry Logic (Only if not in a position) ---
      if (positionType === null) {
        const potentialSignal: 'BUY' | 'SELL' | null = d.buySignal ? 'BUY' : d.sellSignal ? 'SELL' : null;
        if (potentialSignal) {
          let isValidSignal = false;
          let prediction: PredictMarketOutput | null = null;
          
          if (useAIValidation) {
            if (aiValidationCount < maxAiValidations) {
              if (canUseAi()) {
                aiValidationCount++;
                try {
                  prediction = await predictMarket({
                      symbol: symbol,
                      recentData: JSON.stringify(dataWithSignals.slice(Math.max(0, i-50), i).map(k => ({t: k.time, o: k.open, h: k.high, l:k.low, c:k.close, v:k.volume}))),
                      strategySignal: potentialSignal
                  });
                   // Only consume credit after a successful response
                  consumeAiCredit();
                  if ((prediction.prediction === 'UP' && potentialSignal === 'BUY') || (prediction.prediction === 'DOWN' && potentialSignal === 'SELL')) {
                    isValidSignal = true;
                  }
                } catch(e) {
                  console.error("AI validation failed", e);
                  isValidSignal = false; // Fail safe
                }
              } else {
                toast({ title: "AI Quota Reached", description: "Skipping AI validation for this trade." });
                isValidSignal = true; // Fallback to non-AI validation
              }
            } else if (!aiLimitReachedNotified) {
              toast({ title: "AI Limit Reached", description: `Max ${maxAiValidations} AI validations performed. Subsequent trades will not be AI-validated.` });
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

    setDataWithIndicators(dataWithSignals);
    setBacktestResults(trades);
    setSummaryStats(summary);

    setIsBacktesting(false);
    toast({
      title: "Backtest Complete",
      description: "Strategy signals and results are now available.",
    });
  };


  const handleAutoTune = async () => {
    const optimizationConfig = optimizationConfigs[selectedStrategy];
    if (!optimizationConfig) {
        toast({ title: "Not Supported", description: "Auto-tuning is not configured for this strategy.", variant: "destructive" });
        return;
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
        const { summary } = await runSilentBacktest(chartData, {
            strategyId: selectedStrategy,
            strategyParams: params,
            initialCapital, leverage, takeProfit, stopLoss, fee
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
  
  const anyLoading = isBacktesting || isFetchingData || isOptimizing;

  const handleIntervalChange = (newInterval: string) => {
    setInterval(newInterval);
    setChartData([]); // Clear raw data on interval change
  };

  const renderParameterControls = () => {
    const params = strategyParams[selectedStrategy] || {};

    // Special UI for code-based-consensus
    if (selectedStrategy === 'code-based-consensus') {
      const selectedSubStrategies = params.strategies || [];
      const consensusStrategies = strategyMetadatas.filter(s => s.id !== 'code-based-consensus');

      const handleConsensusStrategyToggle = (strategyId: string) => {
        const newSelection = selectedSubStrategies.includes(strategyId)
            ? selectedSubStrategies.filter((s: string) => s !== strategyId)
            : [...selectedSubStrategies, strategyId];
        handleParamChange(selectedStrategy, 'strategies', newSelection);
      };

      const isReversed = params.reverse || false;

      return (
        <div className="space-y-4">
          <div>
              <Label>Ensemble Strategies</Label>
              <p className="text-xs text-muted-foreground">Select the strategies to include in the consensus calculation. A signal is generated when a majority agree.</p>
              <ScrollArea className="h-40 w-full rounded-md border p-4 mt-2">
                <div className="space-y-2">
                    {consensusStrategies.map((strategy) => (
                        <div key={strategy.id} className="flex items-center space-x-2">
                            <Checkbox 
                                id={`consensus-${strategy.id}`} 
                                checked={selectedSubStrategies.includes(strategy.id)}
                                onCheckedChange={() => handleConsensusStrategyToggle(strategy.id)}
                                disabled={anyLoading}
                            />
                            <Label htmlFor={`consensus-${strategy.id}`} className="font-normal text-muted-foreground">{strategy.name}</Label>
                        </div>
                    ))}
                </div>
              </ScrollArea>
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="reverse-logic"
              checked={isReversed}
              onCheckedChange={(checked) => handleParamChange(selectedStrategy, 'reverse', checked)}
              disabled={anyLoading}
            />
            <div className="flex flex-col">
              <Label htmlFor="reverse-logic" className="cursor-pointer">Reverse Logic (Contrarian Mode)</Label>
              <p className="text-xs text-muted-foreground">Trade against the consensus. BUY on a SELL signal and vice-versa.</p>
            </div>
          </div>
        </div>
      );
    }
    
    // Filter out 'strategies' and 'reverse' from the regular parameter display
    const filteredParams = Object.fromEntries(Object.entries(params).filter(([key]) => key !== 'strategies' && key !== 'reverse'));
    const isReversed = params.reverse || false;


    if (Object.keys(filteredParams).length === 0 && selectedStrategy !== 'none') {
        return (
             <div className="flex items-center space-x-2 pt-2">
                <Switch
                    id="reverse-logic"
                    checked={isReversed}
                    onCheckedChange={(checked) => handleParamChange(selectedStrategy, 'reverse', checked)}
                    disabled={anyLoading}
                />
                <div className="flex flex-col">
                    <Label htmlFor="reverse-logic" className="cursor-pointer">Reverse Logic (Contrarian Mode)</Label>
                    <p className="text-xs text-muted-foreground">Trade against the strategy's signals.</p>
                </div>
            </div>
        );
    }

    if (Object.keys(params).length === 0) {
        return <p className="text-sm text-muted-foreground">This strategy has no tunable parameters.</p>;
    }


    const controls = Object.entries(filteredParams).map(([key, value]) => (
      <div key={key} className="space-y-2">
        <Label htmlFor={key} className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
        <Input 
          id={key}
          type="number"
          value={value as number}
          onChange={(e) => handleParamChange(selectedStrategy, key, e.target.value)}
          step={String(value).includes('.') ? '0.001' : '1'}
          disabled={anyLoading}
        />
      </div>
    ));

    const canOptimize = !!optimizationConfigs[selectedStrategy];
    const canReset = !!DEFAULT_PARAMS_MAP[selectedStrategy];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">{controls}</div>
         <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="reverse-logic"
              checked={isReversed}
              onCheckedChange={(checked) => handleParamChange(selectedStrategy, 'reverse', checked)}
              disabled={anyLoading}
            />
            <div className="flex flex-col">
              <Label htmlFor="reverse-logic" className="cursor-pointer">Reverse Logic (Contrarian Mode)</Label>
              <p className="text-xs text-muted-foreground">Trade against the strategy's signals.</p>
            </div>
          </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
            {canReset && (
                <Button onClick={handleResetParams} disabled={anyLoading} variant="secondary" className="w-full">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset to Default
                </Button>
            )}
            {canOptimize && (
              <Button onClick={handleAutoTune} disabled={anyLoading} variant="outline" className="w-full">
                {isOptimizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                {isOptimizing ? "Optimizing..." : "Auto-Tune Parameters"}
              </Button>
            )}
        </div>
      </div>
    );
  };


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
    {isTradingActive && (
        <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
            <Bot className="h-4 w-4" />
            <AlertTitle>Trading Session Active</AlertTitle>
            <AlertDescription>
                Backtesting is disabled to prioritize an active trading session. Check the <Link href="/live" className="font-bold underline">Live</Link>, <Link href="/manual" className="font-bold underline">Manual</Link>, or <Link href="/multi-signal" className="font-bold underline">Multi-Signal</Link> pages.
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
      <div className="xl:col-span-3 relative pb-4">
        <div className="flex flex-col" style={{ height: `${chartHeight}px` }}>
            <TradingChart data={dataWithIndicators} symbol={symbol} interval={interval} onIntervalChange={handleIntervalChange} highlightedTrade={selectedTrade} />
        </div>
        <div
            onMouseDown={startChartResize}
            className="absolute bottom-0 left-0 w-full h-4 flex items-center justify-center cursor-ns-resize group"
        >
            <GripHorizontal className="h-5 w-5 text-muted-foreground/30 transition-colors group-hover:text-primary" />
        </div>
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
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="base-asset">Base</Label>
                      <Select onValueChange={setBaseAsset} value={baseAsset} disabled={!isConnected || anyLoading}>
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
                      <Select onValueChange={setQuoteAsset} value={quoteAsset} disabled={!isConnected || anyLoading || availableQuotes.length === 0}>
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
                    <div className="space-y-2 col-span-2 md:col-span-4">
                        <Label htmlFor="strategy">Strategy</Label>
                        <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={anyLoading}>
                            <SelectTrigger id="strategy">
                            <SelectValue placeholder="Select strategy" />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="none">None (Candles Only)</SelectItem>
                            {strategyMetadatas.map(strategy => (
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
                      <Select onValueChange={handleIntervalChange} value={interval} disabled={anyLoading}>
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

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
                        <Label htmlFor="fee">Fee (%)</Label>
                        <Input 
                            id="fee" 
                            type="number" 
                            value={fee}
                            onChange={(e) => setFee(parseFloat(e.target.value) || 0)}
                            placeholder="0.04"
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
                  <Label>AI-Powered Analysis</Label>
                  <div className="p-3 border rounded-md bg-muted/50 space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch id="ai-validation" checked={useAIValidation} onCheckedChange={setUseAIValidation} disabled={anyLoading || selectedStrategy === 'code-based-consensus'} />
                        <div className="flex flex-col">
                            <Label htmlFor="ai-validation" className="cursor-pointer">Enable AI Validation</Label>
                            <p className="text-xs text-muted-foreground">Let an AI validate each signal. This is more accurate but significantly slower.</p>
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
                                  disabled={anyLoading}
                              />
                              <p className="text-xs text-muted-foreground">Limits AI calls to prevent exceeding API quotas (e.g., free tier is 50/day).</p>
                              </div>
                          </>
                      )}
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
                <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleRunBacktestClick} disabled={anyLoading || !isConnected || chartData.length === 0 || isTradingActive || selectedStrategy === 'none'}>
                  {anyLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isTradingActive ? "Trading Active..." : isFetchingData ? "Fetching Data..." : isOptimizing ? "Optimizing..." : isBacktesting ? "Running..." : "Run Backtest"}
                </Button>
              </CardFooter>
            </CollapsibleContent>
          </Collapsible>
        </Card>
        <BacktestResults 
          results={backtestResults} 
          summary={summaryStats} 
          onSelectTrade={setSelectedTrade}
          selectedTradeId={selectedTrade?.id}
        />
        <PineScriptEditor onLoadScript={handleLoadScript} isLoading={anyLoading} />
      </div>
    </div>
    </div>
  )
}
