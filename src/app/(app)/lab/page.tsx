

"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
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
import { Loader2, Terminal, ChevronDown, FlaskConical, Wand2, ShieldAlert, RotateCcw, BrainCircuit, GripHorizontal, Play, StopCircle, Settings, ShieldCheck, AreaChart, Trash2, CalendarIcon } from "lucide-react"
import { cn, formatPrice, formatLargeNumber, intervalToMs } from "@/lib/utils"
import type { HistoricalData, LiquidityEvent, LiquidityTarget, SpoofedWall, Wall, BacktestResult, BacktestSummary, PhysicsChartConfig } from "@/lib/types"
import { topAssets } from "@/lib/assets"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { generateMarketReport, GenerateMarketReportOutput } from "@/ai/flows/generate-market-report"
import { detectManipulation, DetectManipulationOutput } from "@/ai/flows/detect-manipulation-flow"
import { findLiquidityGrabs, findLiquidityTargets } from "@/lib/analysis/liquidity-analysis"
import { Skeleton } from "@/components/ui/skeleton"
import { MarketHeatmap } from "@/components/dashboard/market-heatmap"
import { OrderBook } from "@/components/order-book"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { saveReport, getLatestReport } from "@/lib/data-service"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { useSymbolManager } from "@/hooks/use-symbol-manager"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { generateProjectedCandles } from "@/lib/projection-service"
import { BacktestResults } from "@/components/backtest-results"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, addDays } from "date-fns"


import { useBot } from "@/context/bot-context"
import { strategyMetadatas, getStrategyById, strategyIndicatorMap } from "@/lib/strategies"
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
import { defaultLiquidityOrderFlowParams } from "@/lib/strategies/liquidity-order-flow"
import { defaultLiquidityGrabParams } from '@/lib/strategies/liquidity-grab';

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
    'liquidity-order-flow': defaultLiquidityOrderFlowParams,
    'liquidity-grab': defaultLiquidityGrabParams,
}

export default function LabPage() {
  const { toast } = useToast()
  const { isConnected, canUseAi, consumeAiCredit } = useApi();
  const { strategyParams, setStrategyParams } = useBot();
  const strategyParamsRef = useRef(strategyParams);
  useEffect(() => {
    strategyParamsRef.current = strategyParams;
  }, [strategyParams]);

  const [isReportPending, startReportTransition] = React.useTransition();
  const [isScanPending, startScanTransition] = React.useTransition();
  
  const { baseAsset, quoteAsset, symbol, availableQuotes, handleBaseAssetChange, handleQuoteAssetChange } = useSymbolManager('lab', 'BTC', 'USDT');
  const [interval, setInterval] = usePersistentState<string>("lab-interval","1h");
  const [showWalls, setShowWalls] = usePersistentState<boolean>('lab-show-walls', true);
  const [showLiquidity, setShowLiquidity] = usePersistentState<boolean>('lab-show-liquidity', true);
  const [showTargets, setShowTargets] = usePersistentState<boolean>('lab-show-targets', true);
  const [selectedStrategy, setSelectedStrategy] = usePersistentState<string>('lab-selected-strategy', 'liquidity-order-flow');
  const [chartHeight, setChartHeight] = usePersistentState<number>('lab-chart-height', 600);
  const [lineWidth, setLineWidth] = usePersistentState<number>('lab-line-width', 2);
  const [selectedConsensusStrategies, setSelectedConsensusStrategies] = usePersistentState<string[]>('lab-consensus-strategies', ['peak-formation-fib', 'rsi-divergence', 'ema-crossover']);
  const [showAnalysis, setShowAnalysis] = usePersistentState<boolean>('lab-show-analysis', true);
  const [showManipulationOverlay, setShowManipulationOverlay] = usePersistentState<boolean>('lab-show-manipulation', true);
  const [chartType, setChartType] = usePersistentState<'candlestick' | 'line'>('lab-chart-type', 'candlestick');
  const [scaleMode, setScaleMode] = usePersistentState<'linear' | 'logarithmic'>('lab-scale-mode', 'linear');
  
  // States ported from backtest page
  const [initialCapital, setInitialCapital] = usePersistentState<number>('lab-initial-capital', 100);
  const [leverage, setLeverage] = usePersistentState<number>('lab-leverage', 10);
  const [takeProfit, setTakeProfit] = usePersistentState<number>('lab-tp', 5);
  const [stopLoss, setStopLoss] = usePersistentState<number>('lab-sl', 2);
  const [fee, setFee] = usePersistentState<number>('lab-fee', 0.04);
  const [date, setDate] = usePersistentState<DateRange | undefined>('lab-date-range', undefined);
  const [useReverseLogic, setUseReverseLogic] = usePersistentState<boolean>('lab-reverse-logic', false);

  const [isClient, setIsClient] = useState(false)
  const [chartData, setChartData] = useState<HistoricalData[]>([]);
  const [dataWithIndicators, setDataWithIndicators] = useState<HistoricalData[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [report, setReport] = useState<GenerateMarketReportOutput | null>(null);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [spoofedWalls, setSpoofedWalls] = useState<SpoofedWall[]>([]);
  const [liquidityEvents, setLiquidityEvents] = useState<LiquidityEvent[]>([]);
  const [liquidityTargets, setLiquidityTargets] = useState<LiquidityTarget[]>([]);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [consensusResult, setConsensusResult] = useState<{ price: number; direction: 'UP' | 'DOWN' } | null>(null);
  const [isConsensusRunning, setIsConsensusRunning] = useState(false);
  const [manipulationResult, setManipulationResult] = useState<DetectManipulationOutput | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Projection State
  const [isProjecting, setIsProjecting] = useState(false);
  const [projectionMode, setProjectionMode] = usePersistentState<'upward' | 'downward' | 'neutral' | 'random'>('lab-projection-mode', 'neutral');
  const [projectionDuration, setProjectionDuration] = usePersistentState<'1d' | '3d' | '7d' | '1m'>('lab-projection-duration', '7d');
  const [projectedData, setProjectedData] = useState<HistoricalData[]>([]);
  const [forwardTestSummary, setForwardTestSummary] = useState<BacktestSummary | null>(null);
  const [forwardTestTrades, setForwardTestTrades] = useState<BacktestResult[]>([]);
  const [selectedForwardTrade, setSelectedForwardTrade] = useState<BacktestResult | null>(null);

  // New Physics Chart Config State
  const [physicsChartConfig, setPhysicsChartConfig] = usePersistentState<PhysicsChartConfig>('lab-physics-chart-config', {
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
  const [isControlsOpen, setControlsOpen] = usePersistentState<boolean>('lab-controls-open', true);
  const [isParamsOpen, setParamsOpen] = usePersistentState<boolean>('lab-params-open', false);
  const [isReportOpen, setReportOpen] = usePersistentState<boolean>('lab-report-open', false);
  const [isConfirmingReport, setIsConfirmingReport] = useState(false);
  const [isConfirmingScan, setIsConfirmingScan] = useState(false);
  const [isConsensusStratOpen, setIsConsensusStratOpen] = usePersistentState<boolean>('lab-consensus-strat-open', false);
  const [isAnalysisToolsOpen, setIsAnalysisToolsOpen] = usePersistentState<boolean>('lab-analysis-tools-open', true);
  const [isPhysicsPanelsOpen, setIsPhysicsPanelsOpen] = usePersistentState<boolean>('lab-physics-panels-open', true);
  const [isManipulationCardOpen, setManipulationCardOpen] = usePersistentState<boolean>('lab-manipulation-card-open', true);
  const [isProjectionCardOpen, setProjectionCardOpen] = usePersistentState<boolean>('lab-projection-card-open', true);
  
  const selectedConsensusStrategiesRef = useRef(selectedConsensusStrategies);
  useEffect(() => {
    selectedConsensusStrategiesRef.current = selectedConsensusStrategies;
  }, [selectedConsensusStrategies]);


  const handleParamChange = (strategyId: string, paramName: string, value: any) => {
    const parsedValue = String(value).includes('.') ? parseFloat(value) : parseInt(value, 10);
    setStrategyParams(prev => ({
        ...prev,
        [strategyId]: {
            ...prev[strategyId],
            [paramName]: isNaN(parsedValue) ? 0 : parsedValue,
        }
    }));
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
  }, []);

  // This effect loads the last manipulation scan for the current symbol.
  useEffect(() => {
    if (!isConnected || !symbol) return;
    
    // Clear old data when symbol changes
    setWalls([]);
    setSpoofedWalls([]);
    setConsensusResult(null);
    setManipulationResult(null);
    setReport(null);
    setForwardTestSummary(null);
    setForwardTestTrades([]);
    setProjectedData([]);

    const loadLastReports = async () => {
        try {
            const [lastScan, lastReport] = await Promise.all([
                getLatestReport('manipulation-scan', symbol),
                getLatestReport('market-report', symbol)
            ]);
    
            if (lastScan) {
                setManipulationResult(lastScan.output as DetectManipulationOutput);
                setManipulationCardOpen(true);
            }
            if (lastReport) {
                setReport(lastReport.output as GenerateMarketReportOutput);
                setReportOpen(true);
            }
        } catch (e) {
            console.error("Failed to load saved reports:", e);
        }
    };
    
    loadLastReports();
  }, [symbol, isConnected]); // Re-run when symbol or connection status changes

  const runConsensus = useCallback(async (currentChartData: HistoricalData[]) => {
    const strategiesToRun = selectedConsensusStrategiesRef.current;
    if (currentChartData.length < 50 || strategiesToRun.length === 0) {
      return; // Not enough data or no strategies selected
    }
    setIsConsensusRunning(true);
    setConsensusResult(null);

    const buyPrices: number[] = [];
    const sellPrices: number[] = [];

    for (const strategyId of strategiesToRun) {
      const strategy = getStrategyById(strategyId);
      if (!strategy) continue;

      const paramsForStrategy = strategyParamsRef.current[strategyId] || {};
      const dataWithIndicators = await strategy.calculate(currentChartData, paramsForStrategy, symbol);
      const lastCandle = dataWithIndicators[dataWithIndicators.length - 1];

      if (lastCandle) {
        if (lastCandle.buySignal) buyPrices.push(lastCandle.buySignal);
        if (lastCandle.sellSignal) sellPrices.push(lastCandle.sellSignal);
      }
    }

    if (buyPrices.length > sellPrices.length) {
      const avgPrice = buyPrices.reduce((a, b) => a + b, 0) / buyPrices.length;
      setConsensusResult({ price: avgPrice, direction: 'UP' });
    } else if (sellPrices.length > buyPrices.length) {
      const avgPrice = sellPrices.reduce((a, b) => a + b, 0) / sellPrices.length;
      setConsensusResult({ price: avgPrice, direction: 'DOWN' });
    } else {
      setConsensusResult(null);
    }
    setIsConsensusRunning(false);
  }, [symbol]);

  const refreshChartAnalysis = useCallback(async (currentChartData: HistoricalData[]) => {
    if (currentChartData.length < 20) {
      setDataWithIndicators([]);
      setLiquidityEvents([]);
      setLiquidityTargets([]);
      return;
    }

    // Liquidity Analysis
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

    // Indicator Calculation
    const strategy = getStrategyById(selectedStrategy);
    if (strategy) {
        const paramsForStrategy = strategyParams[selectedStrategy] || {};
        const calculatedData = await strategy.calculate(currentChartData, paramsForStrategy);
        setDataWithIndicators(calculatedData);
    } else {
        setDataWithIndicators(currentChartData);
    }
  }, [interval, selectedStrategy, strategyParams]);
  
  // Effect to run analysis when data changes
  useEffect(() => {
    const fullChartData = [...chartData, ...projectedData];
    if (fullChartData.length > 0) {
      refreshChartAnalysis(fullChartData);
    }
  }, [chartData, projectedData, refreshChartAnalysis]);

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
            setProjectedData([]); // Clear projections on new data fetch
            toast({ title: "Fetching Market Data...", description: `Loading ${interval} data for ${symbol}.`});
        }
        try {
            const klines = await getLatestKlinesByLimit(symbol, interval, 500); // Always get 500 for analysis
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
  }, [symbol, quoteAsset, interval, isConnected, isClient, isStreamActive]);
  
  // Effect for live data stream
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (!isStreamActive || !symbol || !interval) return;

    wsRef.current = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`);

    wsRef.current.onopen = () => {
      console.log(`Lab stream connected for ${symbol}`);
      toast({ title: "Live Update Started", description: `Continuously updating analysis for ${symbol}.` });
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
        const finalData = updatedData.slice(-1000);

        // If the candle just closed, re-run the consensus analysis
        if (klineData.x) { // 'x' is true if the candle is closed
            toast({ title: "New Candle", description: `Re-running consensus for ${symbol}.` });
            runConsensus(finalData);
        }

        return finalData;
      });
    };

    wsRef.current.onerror = () => {
      toast({ 
          title: "Stream Error",
          description: `Could not connect to live data for ${symbol}. The symbol may not be supported for streaming.`,
          variant: "destructive" 
      });
      setIsStreamActive(false);
    };

    wsRef.current.onclose = () => {
      console.log("Lab stream disconnected.");
    };
    
    const currentWs = wsRef.current;
    return () => {
      if (currentWs) {
        currentWs.close();
      }
    };
  }, [isStreamActive, symbol, interval, runConsensus, toast]);

  const handleGenerateReportClick = () => {
    if (chartData.length < 20) {
      toast({ title: "Not Enough Data", description: "Please load more market data to generate a report.", variant: "destructive" });
      return;
    }
    if (canUseAi()) {
        setIsConfirmingReport(true);
    }
  };

  const runGenerateReport = () => {
    consumeAiCredit();
    setReport(null);
    startReportTransition(async () => {
      try {
        const reportInput = {
          symbol,
          interval,
          historicalData: JSON.stringify(chartData.slice(-200).map(k => ({t: k.time, o: k.open, h: k.high, l: k.low, c:k.close, v:k.volume}))), // Use last 200 candles
        };
        const reportData = await generateMarketReport(reportInput);
        
        await saveReport({
            type: 'market-report',
            timestamp: Date.now(),
            input: { symbol, interval },
            output: reportData
        });
        
        setReport(reportData);
        setReportOpen(true);
        toast({ title: "Report Generated", description: "AI market analysis is complete and saved to the Data page." });
      } catch (error: any) {
        console.error("Error generating report:", error);
        toast({
          title: "Report Failed",
          description: error.message || "An error occurred while generating the AI report.",
          variant: "destructive",
        });
      }
    });
  };

  const handleScanClick = () => {
    if (chartData.length < 50) {
      toast({ title: "Not Enough Data", description: "Please ensure at least 50 candles are loaded to scan for manipulation.", variant: "destructive" });
      return;
    }
    if (canUseAi()) {
        setIsConfirmingScan(true);
    }
  }

  const runManipulationScan = () => {
      consumeAiCredit();
      setManipulationResult(null); // Clear old results immediately
      setIsScanning(true);
      startScanTransition(async () => {
        try {
          const scanInput = {
            symbol,
            historicalData: JSON.stringify(chartData.map(k => ({t: k.time, o: k.open, h: k.high, l: k.low, c:k.close, v:k.volume}))),
          };
          const result = await detectManipulation(scanInput);
          
          await saveReport({
              type: 'manipulation-scan',
              timestamp: Date.now(),
              input: { symbol, interval: 'N/A' },
              output: result
          });

          setManipulationResult(result);
          setManipulationCardOpen(true);
          toast({ title: "Manipulation Scan Complete", description: "AI analysis is ready and saved to the Data page." });
        } catch (error: any) {
          console.error("Error scanning for manipulation:", error);
          toast({ title: "Scan Failed", description: error.message || "An error occurred during the analysis.", variant: "destructive" });
        } finally {
          setIsScanning(false);
        }
      });
  };

  const handleToggleStream = () => {
    if (!isConnected) {
        toast({ title: "API Disconnected", description: "Cannot start stream.", variant: "destructive" });
        return;
    }
    const willBeActive = !isStreamActive;
    setIsStreamActive(willBeActive);

    if (!willBeActive) {
      toast({ title: "Live Update Stopped", description: "The chart will no longer receive live data." });
    } else {
      // Run consensus once when starting the stream
      runConsensus(chartData);
    }
  };

  const handleConsensusStrategyToggle = (strategyId: string) => {
    setSelectedConsensusStrategies(prev => 
        prev.includes(strategyId) ? prev.filter(s => s !== strategyId) : [...prev, strategyId]
    );
  };

  const handleShowAnalysisChange = (checked: boolean) => {
    setShowAnalysis(checked);
    if (checked) {
      refreshChartAnalysis(chartData);
      runConsensus(chartData);
    } else {
      setConsensusResult(null);
    }
  };
  
  const handleOrderBookUpdate = useCallback(({ walls, spoofs }: { walls: Wall[]; spoofs: SpoofedWall[] }) => {
    setWalls(walls);
    if (spoofs.length > 0) {
      setSpoofedWalls(prev => [...prev, ...spoofs]);
    }
  }, []);

  const anyLoading = isFetchingData || isReportPending || isScanning || isProjecting;
  const canAnalyze = !anyLoading && isConnected && chartData.length > 0;
  
  const renderParameterControls = () => {
    const params = strategyParams[selectedStrategy];
    if (!params) return <p className="text-sm text-muted-foreground">This strategy has no tunable parameters.</p>;

    const filteredParams = Object.fromEntries(Object.entries(params).filter(([key]) => key !== 'reverse' && key !== 'discipline'));

    if (Object.keys(filteredParams).length === 0) {
        return (
             <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="reverse-logic"
                  checked={useReverseLogic}
                  onCheckedChange={setUseReverseLogic}
                  disabled={anyLoading}
                />
                <div className="flex flex-col">
                  <Label htmlFor="reverse-logic" className="cursor-pointer">Reverse Logic (Contrarian Mode)</Label>
                  <p className="text-xs text-muted-foreground">Trade against the strategy's signals.</p>
                </div>
            </div>
        );
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

    const canReset = !!DEFAULT_PARAMS_MAP[selectedStrategy];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">{controls}</div>
        <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="reverse-logic"
              checked={useReverseLogic}
              onCheckedChange={setUseReverseLogic}
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
        </div>
      </div>
    );
  };

  const handleProjectAndTest = async () => {
    if (chartData.length === 0) {
      toast({ title: "No Data", description: "Please load market data before projecting.", variant: "destructive" });
      return;
    }
    
    setIsProjecting(true);
    setForwardTestSummary(null);
    setForwardTestTrades([]);
    toast({ title: "Generating Projection..." });

    setTimeout(async () => {
      try {
        const newProjectedCandles = generateProjectedCandles(chartData, projectionMode, projectionDuration, interval);
        
        const strategyToTest = getStrategyById(selectedStrategy);
        if (!strategyToTest) {
            setProjectedData(newProjectedCandles);
            toast({ title: "Projection Generated", description: "No strategy selected to forward-test." });
            setIsProjecting(false);
            return;
        }

        const combinedData = [...chartData, ...newProjectedCandles];
        const paramsForStrategy = { ...(strategyParams[selectedStrategy] || {}), reverse: useReverseLogic };
        
        const dataWithSignals = await strategyToTest.calculate(combinedData, paramsForStrategy);
        const testedProjectedData = dataWithSignals.slice(chartData.length);
        
        setProjectedData(testedProjectedData);

        const trades: BacktestResult[] = [];
        let positionType: 'long' | 'short' | null = null;
        let entryTime = 0;
        let entryPrice = 0;
        let stopLossPrice = 0;
        let takeProfitPrice = 0;
        
        for (let i = 0; i < testedProjectedData.length; i++) {
          const d = testedProjectedData[i];

          // Check for exits first
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
                  const tradeQuantity = (initialCapital * leverage) / entryPrice;
                  const entryValue = entryPrice * tradeQuantity;
                  const exitValue = exitPrice * tradeQuantity;
                  const totalFee = (entryValue + exitValue) * (fee / 100);

                  const grossPnl = positionType === 'long' 
                      ? (exitValue - entryValue)
                      : (entryValue - exitValue);
                  const netPnl = grossPnl - totalFee;

                  trades.push({
                      id: `fwd-${trades.length}`, type: positionType, entryTime, entryPrice,
                      exitTime: d.time, exitPrice, pnl: netPnl, pnlPercent: (netPnl / initialCapital) * 100,
                      closeReason, stopLoss: stopLossPrice, takeProfit: takeProfitPrice,
                      fee: totalFee, reasoning: 'Projected Trade'
                  });
                  positionType = null;
              }
          }
          
          // Check for new entries
          if (positionType === null) {
              if (d.buySignal) {
                  positionType = 'long';
                  entryPrice = d.close;
                  entryTime = d.time;
                  stopLossPrice = d.stopLossLevel ?? (entryPrice * (1 - (stopLoss || 0) / 100));
                  takeProfitPrice = entryPrice * (1 + (takeProfit || 0) / 100);
              } else if (d.sellSignal) {
                  positionType = 'short';
                  entryPrice = d.close;
                  entryTime = d.time;
                  stopLossPrice = d.stopLossLevel ?? (entryPrice * (1 + (stopLoss || 0) / 100));
                  takeProfitPrice = entryPrice * (1 - (takeProfit || 0) / 100);
              }
          }
        }

        // Close any open position at the end of the projection
        if (positionType !== null) {
            const lastCandle = testedProjectedData[testedProjectedData.length - 1];
            const exitPrice = lastCandle.close;
            const tradeQuantity = (initialCapital * leverage) / entryPrice;
            const entryValue = entryPrice * tradeQuantity;
            const exitValue = exitPrice * tradeQuantity;
            const totalFee = (entryValue + exitValue) * (fee / 100);

            const grossPnl = positionType === 'long' 
                ? (exitValue - entryValue)
                : (entryValue - exitValue);
            const netPnl = grossPnl - totalFee;

            trades.push({
                id: `fwd-${trades.length}`, type: positionType, entryTime, entryPrice,
                exitTime: lastCandle.time, exitPrice, pnl: netPnl, pnlPercent: (netPnl / initialCapital) * 100,
                closeReason: 'signal', stopLoss: stopLossPrice, takeProfit: takeProfitPrice,
                fee: totalFee, reasoning: 'Closed at end of projection'
            });
        }
        
        if (trades.length > 0) {
          const wins = trades.filter(t => t.pnl > 0);
          const losses = trades.filter(t => t.pnl <= 0);
          const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
          const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
          const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));

          const summary: BacktestSummary = {
            totalTrades: trades.length,
            winRate: (wins.length / trades.length) * 100,
            totalPnl: totalPnl,
            averageWin: wins.length > 0 ? totalWins / wins.length : 0,
            averageLoss: losses.length > 0 ? totalLosses / losses.length : 0,
            profitFactor: totalLosses > 0 ? totalWins / totalLosses : Infinity,
            initialCapital, endingBalance: initialCapital + totalPnl, totalReturnPercent: (totalPnl/initialCapital)*100, totalFees: trades.reduce((s,t) => s + (t.fee || 0), 0)
          };
          setForwardTestSummary(summary);
          setForwardTestTrades(trades);
        }
        
        toast({ title: "Forward Test Complete", description: "Strategy signals have been applied to the projected data." });
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

  return (
    <div className="space-y-6">
       <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <FlaskConical size={32}/> Trading Lab
          </h1>
          <p className="text-muted-foreground mt-2">
              Experiment, simulate, and oversee market data with AI-powered analysis tools.
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

      <AlertDialog open={isConfirmingReport} onOpenChange={setIsConfirmingReport}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm AI Action</AlertDialogTitle>
                <AlertDialogDescription>
                    This action will use one AI credit to generate the market report. Are you sure you want to proceed?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setIsConfirmingReport(false); runGenerateReport(); }}>Confirm & Generate</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmingScan} onOpenChange={setIsConfirmingScan}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm AI Action</AlertDialogTitle>
                <AlertDialogDescription>
                    This action will use one AI credit to scan the chart for manipulation patterns. Are you sure?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setIsConfirmingScan(false); runManipulationScan(); }}>Confirm & Scan</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 relative pb-4">
            <div className="flex flex-col" style={{ height: `${chartHeight}px` }}>
              <TradingChart
                  data={dataWithIndicators}
                  projectedData={projectedData}
                  symbol={symbol}
                  interval={interval}
                  onIntervalChange={setInterval}
                  wallLevels={showAnalysis && showWalls ? walls : []}
                  spoofedWalls={showAnalysis ? spoofedWalls : []}
                  liquidityEvents={showAnalysis && showLiquidity ? liquidityEvents : []}
                  liquidityTargets={showAnalysis && showTargets ? liquidityTargets : []}
                  lineWidth={lineWidth}
                  consensusResult={showAnalysis ? consensusResult : null}
                  showAnalysis={showAnalysis}
                  chartType={chartType}
                  scaleMode={scaleMode}
                  manipulationResult={manipulationResult}
                  showManipulationOverlay={showManipulationOverlay}
                  highlightedTrade={selectedForwardTrade}
                  physicsConfig={physicsChartConfig}
              />
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
                    <CardTitle>Lab Controls</CardTitle>
                    <CardDescription>Configure your dataset and analysis.</CardDescription>
                  </div>
                  <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronDown className={cn("h-4 w-4 transition-transform", isControlsOpen && "rotate-180")} />
                      </Button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="base-asset">Base</Label>
                          <Select onValueChange={handleBaseAssetChange} value={baseAsset} disabled={!isConnected || anyLoading || isStreamActive}>
                            <SelectTrigger id="base-asset"><SelectValue/></SelectTrigger>
                            <SelectContent>
                              {topAssets.map(asset => (
                                <SelectItem key={asset.ticker} value={asset.ticker}>{asset.ticker} - {asset.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quote-asset">Quote</Label>
                          <Select onValueChange={handleQuoteAssetChange} value={quoteAsset} disabled={!isConnected || anyLoading || availableQuotes.length === 0 || isStreamActive}>
                            <SelectTrigger id="quote-asset"><SelectValue/></SelectTrigger>
                            <SelectContent>
                              {availableQuotes.map(asset => (
                                <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                              ))}
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
                    
                    <div className="space-y-2">
                      <Label htmlFor="strategy">Strategy to Visualize</Label>
                      <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={anyLoading}>
                        <SelectTrigger id="strategy"><SelectValue /></SelectTrigger>
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

                    <Collapsible open={isParamsOpen} onOpenChange={setParamsOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          <BrainCircuit className="mr-2 h-4 w-4" />
                          <span>Visual Strategy Parameters</span>
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

                    <Collapsible open={isConsensusStratOpen} onOpenChange={setIsConsensusStratOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          <BrainCircuit className="mr-2 h-4 w-4" />
                          <span>Consensus Strategy Selection</span>
                          <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", isConsensusStratOpen && "rotate-180")} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="p-4 border rounded-md bg-muted/50 space-y-4">
                        <ScrollArea className="h-40 w-full">
                            <div className="space-y-2">
                            {strategyMetadatas.map((strategy) => (
                                <div key={strategy.id} className="flex items-center space-x-2">
                                    <Checkbox id={`strat-${strategy.id}`} checked={selectedConsensusStrategies.includes(strategy.id)} onCheckedChange={() => handleConsensusStrategyToggle(strategy.id)} disabled={isConsensusRunning}/>
                                    <Label htmlFor={`strat-${strategy.id}`} className="font-normal text-muted-foreground">{strategy.name}</Label>
                                </div>
                            ))}
                            </div>
                        </ScrollArea>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <Button onClick={handleToggleStream} variant={isStreamActive ? "destructive" : "default"} className="w-full">
                          {isStreamActive ? <StopCircle /> : <Play />}
                          {isStreamActive ? "Stop Continuous Update" : "Start Continuous Update"}
                      </Button>
                      <div className="flex w-full gap-2">
                        <Button className="w-full" variant="outline" onClick={handleGenerateReportClick} disabled={!canAnalyze || isStreamActive}>
                          {isReportPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                          {isReportPending ? "Generating..." : "AI Report"}
                        </Button>
                        <Button className="w-full" variant="outline" onClick={handleScanClick} disabled={!canAnalyze || isStreamActive}>
                          {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                          {isScanning ? "Scanning..." : "Scan for Manipulation"}
                        </Button>
                      </div>
                  </CardFooter>
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
                    <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronDown className={cn("h-4 w-4 transition-transform", isAnalysisToolsOpen && "rotate-180")} />
                          </Button>
                      </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <Label htmlFor="chart-type">Chart Type</Label>
                              <Select value={chartType} onValueChange={(v) => setChartType(v as any)}>
                                  <SelectTrigger id="chart-type"><SelectValue/></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="candlestick">Candlestick</SelectItem>
                                      <SelectItem value="line">Line</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="scale-mode">Price Scale</Label>
                              <Select value={scaleMode} onValueChange={(v) => setScaleMode(v as any)}>
                                  <SelectTrigger id="scale-mode"><SelectValue/></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="linear">Linear</SelectItem>
                                      <SelectItem value="logarithmic">Logarithmic</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                      </div>
                      <Separator/>
                      <div className="p-3 border rounded-md bg-muted/50 space-y-4">
                          <div className="flex items-center space-x-2">
                              <Switch id="show-analysis" checked={showAnalysis} onCheckedChange={handleShowAnalysisChange} />
                              <Label htmlFor="show-analysis" className="flex-1 cursor-pointer font-semibold">Show Overlays</Label>
                          </div>
                          {showAnalysis && (
                            <>
                              <div className="border-b -mx-3"></div>
                              <div className="pl-2 space-y-3 pt-2">
                                  <div className="flex items-center space-x-2">
                                      <Switch id="show-walls" checked={showWalls} onCheckedChange={setShowWalls} />
                                      <Label htmlFor="show-walls" className="flex-1 cursor-pointer text-muted-foreground">Order Book Walls</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                      <Switch id="show-liquidity" checked={showLiquidity} onCheckedChange={setShowLiquidity} />
                                      <Label htmlFor="show-liquidity" className="flex-1 cursor-pointer text-muted-foreground">Historical Grabs</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                      <Switch id="show-targets" checked={showTargets} onCheckedChange={setShowTargets} />
                                      <Label htmlFor="show-targets" className="flex-1 cursor-pointer text-muted-foreground">Future Targets</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                      <Switch id="show-manipulation-overlay" checked={showManipulationOverlay} onCheckedChange={setShowManipulationOverlay} />
                                      <Label htmlFor="show-manipulation-overlay" className="flex-1 cursor-pointer text-muted-foreground">Manipulation Overlay</Label>
                                  </div>
                              </div>
                            </>
                          )}
                      </div>
                       <Separator/>
                        <Collapsible open={isPhysicsPanelsOpen} onOpenChange={setIsPhysicsPanelsOpen} className="p-3 border rounded-md bg-muted/50 space-y-4">
                          <CollapsibleTrigger asChild>
                              <div className="flex w-full items-center justify-between cursor-pointer">
                                <Label className="flex-1 font-semibold">Physics Panels</Label>
                                <ChevronDown className={cn("h-4 w-4 transition-transform", isPhysicsPanelsOpen && "rotate-180")} />
                              </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-4 space-y-3">
                              <div className="border-b -mx-3"></div>
                              <div className="pl-2 space-y-3 pt-2">
                                  <div className="flex items-center space-x-2">
                                      <Switch id="show-depth" checked={physicsChartConfig.showDepth} onCheckedChange={(c) => handlePhysicsConfigChange('showDepth', c)} />
                                      <Label htmlFor="show-depth" className="flex-1 cursor-pointer text-muted-foreground">Depth Panel</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                      <Switch id="show-imbalance" checked={physicsChartConfig.showImbalance} onCheckedChange={(c) => handlePhysicsConfigChange('showImbalance', c)} />
                                      <Label htmlFor="show-imbalance" className="flex-1 cursor-pointer text-muted-foreground">Imbalance Panel</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                      <Switch id="show-stiffness" checked={physicsChartConfig.showStiffness} onCheckedChange={(c) => handlePhysicsConfigChange('showStiffness', c)} />
                                      <Label htmlFor="show-stiffness" className="flex-1 cursor-pointer text-muted-foreground">Stiffness Panel</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                      <Switch id="show-pressure" checked={physicsChartConfig.showPressure} onCheckedChange={(c) => handlePhysicsConfigChange('showPressure', c)} />
                                      <Label htmlFor="show-pressure" className="flex-1 cursor-pointer text-muted-foreground">Pressure Panel</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                      <Switch id="show-bpi" checked={physicsChartConfig.showBPI} onCheckedChange={(c) => handlePhysicsConfigChange('showBPI', c)} />
                                      <Label htmlFor="show-bpi" className="flex-1 cursor-pointer text-muted-foreground">BPI Panel</Label>
                                  </div>
                                  <div className="space-y-2 pt-2">
                                      <Label htmlFor="bpi-threshold">BPI Threshold</Label>
                                      <Input id="bpi-threshold" type="number" step="0.1" value={physicsChartConfig.bpiThreshold} onChange={(e) => handlePhysicsConfigChange('bpiThreshold', parseFloat(e.target.value) || 0)} />
                                  </div>
                              </div>
                          </CollapsibleContent>
                        </Collapsible>
                      <div className="space-y-2">
                          <Label htmlFor="line-width">Line Thickness</Label>
                          <Slider
                              id="line-width"
                              min={1}
                              max={5}
                              step={1}
                              value={[lineWidth]}
                              onValueChange={(value) => setLineWidth(value[0])}
                              disabled={anyLoading}
                          />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
              </Collapsible>
            </Card>
            
            <Card>
              <Collapsible open={isProjectionCardOpen} onOpenChange={setProjectionCardOpen}>
                  <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                          <CardTitle className="flex items-center gap-2"><AreaChart/> Future Projection &amp; Forward Testing</CardTitle>
                          <CardDescription>Generate random future candles to stress-test your strategy.</CardDescription>
                      </div>
                      <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronDown className={cn("h-4 w-4 transition-transform", isProjectionCardOpen && "rotate-180")} />
                          </Button>
                      </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                      <CardContent className="space-y-4">
                          <div>
                              <Label>Projection Mode</Label>
                              <RadioGroup value={projectionMode} onValueChange={(v) => setProjectionMode(v as any)} className="grid grid-cols-2 gap-4 mt-2" disabled={isProjecting}>
                                  <div><RadioGroupItem value="upward" id="upward" /><Label htmlFor="upward" className="ml-2">Upward Trend</Label></div>
                                  <div><RadioGroupItem value="downward" id="downward" /><Label htmlFor="downward" className="ml-2">Downward Trend</Label></div>
                                  <div><RadioGroupItem value="neutral" id="neutral" /><Label htmlFor="neutral" className="ml-2">Neutral</Label></div>
                                  <div><RadioGroupItem value="random" id="random" /><Label htmlFor="random" className="ml-2">Random</Label></div>
                              </RadioGroup>
                          </div>
                          <div>
                              <Label>Projection Duration</Label>
                              <RadioGroup value={projectionDuration} onValueChange={(v) => setProjectionDuration(v as any)} className="grid grid-cols-2 gap-4 mt-2" disabled={isProjecting}>
                                  <div><RadioGroupItem value="1d" id="1d" /><Label htmlFor="1d" className="ml-2">1 Day</Label></div>
                                  <div><RadioGroupItem value="3d" id="3d" /><Label htmlFor="3d" className="ml-2">3 Days</Label></div>
                                  <div><RadioGroupItem value="7d" id="7d" /><Label htmlFor="7d" className="ml-2">7 Days</Label></div>
                                  <div><RadioGroupItem value="1m" id="1m" /><Label htmlFor="1m" className="ml-2">1 Month</Label></div>
                              </RadioGroup>
                          </div>
                      </CardContent>
                      <CardFooter className="flex-col gap-2">
                          <Button className="w-full" onClick={handleProjectAndTest} disabled={anyLoading || chartData.length === 0}>
                              {isProjecting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                              {isProjecting ? 'Generating...' : 'Project & Test Strategy'}
                          </Button>
                          <Button className="w-full" variant="outline" onClick={handleClearProjection} disabled={projectedData.length === 0 || anyLoading}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Clear Projection
                          </Button>
                      </CardFooter>
                  </CollapsibleContent>
              </Collapsible>
            </Card>

            <OrderBook 
              symbol={symbol} 
              isStreamActive={isStreamActive}
              onWallsUpdate={handleOrderBookUpdate}
            />
          </div>
        </div>
        
        {forwardTestSummary && (
          <div className="mt-6">
            <BacktestResults 
              results={forwardTestTrades} 
              summary={forwardTestSummary} 
              onSelectTrade={setSelectedForwardTrade}
              selectedTradeId={selectedForwardTrade?.id}
              title="Forward Test Report"
            />
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <Collapsible open={isReportOpen} onOpenChange={setReportOpen}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>AI Market Report</CardTitle>
                  <CardDescription>A detailed analysis of the market data.</CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isReportOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  {isReportPending ? (
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  ) : report ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                        <h3>{report.title}</h3>
                        <p><strong>Summary:</strong> {report.summary}</p>
                        <p><strong>Trend:</strong> {report.trendAnalysis}</p>
                        <p><strong>Volatility:</strong> {report.volatilityAnalysis}</p>
                        <p><strong>Key Levels:</strong> {report.keyLevels}</p>
                        <p><strong>Outlook:</strong> {report.outlook}</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md">
                      <p>Generate a report to see the AI analysis here.</p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
          
          <Card>
            <Collapsible open={isManipulationCardOpen} onOpenChange={setManipulationCardOpen}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Manipulation Scan Results</CardTitle>
                  <CardDescription>AI-powered scan for pump & dump patterns.</CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isManipulationCardOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  {isScanning ? (
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  ) : manipulationResult ? (
                    <div className="space-y-4 prose prose-sm dark:prose-invert max-w-none">
                      {manipulationResult.isManipulationSuspected ? (
                          <Alert variant="destructive">
                            <ShieldAlert className="h-4 w-4" />
                            <AlertTitle>High Suspicion of Manipulation!</AlertTitle>
                            <AlertDescription>
                              Confidence: {(manipulationResult.confidence * 100).toFixed(1)}%. Current Phase: {manipulationResult.currentPhase}.
                            </AlertDescription>
                        </Alert>
                      ) : (
                          <Alert>
                            <ShieldCheck className="h-4 w-4" />
                            <AlertTitle>No Clear Manipulation Detected</AlertTitle>
                            <AlertDescription>
                              The AI did not find a strong pump & dump pattern in the provided data.
                            </AlertDescription>
                        </Alert>
                      )}
                      <p><strong>Reasoning:</strong> {manipulationResult.reasoning}</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md">
                      <p>Scan the chart to see manipulation analysis here.</p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>
      </div>
    </div>
  )
}
