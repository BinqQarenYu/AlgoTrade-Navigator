
"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { TradingChart } from "@/components/trading-chart"
import { getHistoricalKlines, getLatestKlinesByLimit } from "@/lib/binance-service"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CalendarIcon, Loader2, Terminal, ChevronDown, FlaskConical, Wand2, ShieldAlert, RotateCcw, BrainCircuit, GripHorizontal, Play, StopCircle, Brush, Settings, ShieldCheck } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { cn, formatPrice, formatLargeNumber, intervalToMs } from "@/lib/utils"
import { format, addDays } from "date-fns"
import type { HistoricalData, LiquidityEvent, LiquidityTarget, Wall, SpoofedWall } from "@/lib/types"
import { topAssets, getAvailableQuotesForBase, parseSymbolString } from "@/lib/assets"
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

import { useBot } from "@/context/bot-context"
import { strategyMetadatas, getStrategyById } from "@/lib/strategies"
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
import { defaultLiquidityGrabParams } from "@/lib/strategies/liquidity-grab"

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

const usePersistentState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
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

export default function LabPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const { isConnected, canUseAi, consumeAiCredit } = useApi();
  const { strategyParams, setStrategyParams } = useBot();
  const strategyParamsRef = useRef(strategyParams);
  useEffect(() => {
    strategyParamsRef.current = strategyParams;
  }, [strategyParams]);

  const [isReportPending, startReportTransition] = React.useTransition();
  const [isScanPending, startScanTransition] = React.useTransition();
  
  const [date, setDate] = usePersistentState<DateRange | undefined>('lab-date-range', undefined)
  const [baseAsset, setBaseAsset] = usePersistentState<string>("lab-base-asset","BTC");
  const [quoteAsset, setQuoteAsset] = usePersistentState<string>("lab-quote-asset","USDT");
  const [interval, setInterval] = usePersistentState<string>("lab-interval","1h");
  const [showWalls, setShowWalls] = usePersistentState<boolean>('lab-show-walls', true);
  const [showLiquidity, setShowLiquidity] = usePersistentState<boolean>('lab-show-liquidity', true);
  const [showTargets, setShowTargets] = usePersistentState<boolean>('lab-show-targets', true);
  const [selectedStrategy, setSelectedStrategy] = usePersistentState<string>('lab-selected-strategy', 'liquidity-order-flow');
  const [chartHeight, setChartHeight] = usePersistentState<number>('lab-chart-height', 600);
  const [lineWidth, setLineWidth] = usePersistentState<number>('lab-line-width', 2);
  const [selectedConsensusStrategies, setSelectedConsensusStrategies] = usePersistentState<string[]>('lab-consensus-strategies', ['peak-formation-fib', 'rsi-divergence', 'ema-crossover']);
  const [showAnalysis, setShowAnalysis] = usePersistentState<boolean>('lab-show-analysis', true);
  const [chartType, setChartType] = usePersistentState<'candlestick' | 'line'>('lab-chart-type', 'candlestick');
  const [scaleMode, setScaleMode] = usePersistentState<'linear' | 'logarithmic'>('lab-scale-mode', 'linear');
  
  const [isClient, setIsClient] = useState(false)
  const [availableQuotes, setAvailableQuotes] = useState<string[]>([]);
  const symbol = useMemo(() => `${baseAsset}${quoteAsset}`, [baseAsset, quoteAsset]);

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

  // Collapsible states
  const [isControlsOpen, setControlsOpen] = usePersistentState<boolean>('lab-controls-open', true);
  const [isParamsOpen, setParamsOpen] = usePersistentState<boolean>('lab-params-open', false);
  const [isReportOpen, setReportOpen] = usePersistentState<boolean>('lab-report-open', false);
  const [isConfirmingReport, setIsConfirmingReport] = useState(false);
  const [isConfirmingScan, setIsConfirmingScan] = useState(false);
  const [isConsensusStratOpen, setIsConsensusStratOpen] = usePersistentState<boolean>('lab-consensus-strat-open', false);
  const [isAnalysisToolsOpen, setIsAnalysisToolsOpen] = usePersistentState<boolean>('lab-analysis-tools-open', true);
  const [isManipulationCardOpen, setManipulationCardOpen] = usePersistentState<boolean>('lab-manipulation-card-open', true);
  
  const selectedConsensusStrategiesRef = useRef(selectedConsensusStrategies);
  useEffect(() => {
    selectedConsensusStrategiesRef.current = selectedConsensusStrategies;
  }, [selectedConsensusStrategies]);

  useEffect(() => {
    const symbolFromQuery = searchParams.get('symbol');
    if (symbolFromQuery) {
        const parsed = parseSymbolString(symbolFromQuery);
        if (parsed) {
            setBaseAsset(parsed.base);
            setQuoteAsset(parsed.quote);
            toast({
                title: "Asset Loaded from Heatmap",
                description: `Now analyzing ${parsed.base}/${parsed.quote}.`,
            });
        }
    }
  }, [searchParams, setBaseAsset, setQuoteAsset, toast]);

  const handleParamChange = (strategyId: string, paramName: string, value: string) => {
    const parsedValue = value.includes('.') ? parseFloat(value) : parseInt(value, 10);
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
    if (!date) {
        setDate({
            from: addDays(new Date(), -30),
            to: new Date(),
        })
    }
  }, [date, setDate]);

  useEffect(() => {
    const quotes = getAvailableQuotesForBase(baseAsset);
    setAvailableQuotes(quotes);
    if (!quotes.includes(quoteAsset)) {
      setQuoteAsset(quotes[0] || '');
    }
  }, [baseAsset, quoteAsset, setQuoteAsset]);

  // This effect loads the last manipulation scan for the current symbol.
  useEffect(() => {
    if (!isConnected || !symbol) return;
    
    // Clear old data when symbol changes
    setWalls([]);
    setSpoofedWalls([]);
    setConsensusResult(null);
    setManipulationResult(null);
    setReport(null);

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
      const dataWithIndicators = await strategy.calculate(currentChartData, paramsForStrategy);
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
  }, []);

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
  }, [symbol, quoteAsset, interval, isConnected, isClient, toast, isStreamActive]);
  
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
      console.error("Lab stream WebSocket error.");
      toast({ title: "Stream Error", variant: "destructive" });
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

  const anyLoading = isFetchingData || isReportPending || isScanning;
  const canAnalyze = !anyLoading && isConnected && chartData.length > 0;
  
  const renderParameterControls = () => {
    const params = strategyParams[selectedStrategy];
    if (!params) return <p className="text-sm text-muted-foreground">This strategy has no tunable parameters.</p>;

    const controls = Object.entries(params).map(([key, value]) => (
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

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 relative pb-4">
          <div className="flex flex-col" style={{ height: `${chartHeight}px` }}>
            <TradingChart
                data={dataWithIndicators}
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
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="base-asset">Base</Label>
                        <Select onValueChange={setBaseAsset} value={baseAsset} disabled={!isConnected || anyLoading || isStreamActive}>
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
                        <Select onValueChange={setQuoteAsset} value={quoteAsset} disabled={!isConnected || anyLoading || availableQuotes.length === 0 || isStreamActive}>
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
                            <Label htmlFor="show-analysis" className="flex-1 cursor-pointer font-semibold">Show All Analysis Drawings</Label>
                        </div>
                        {showAnalysis && (
                          <>
                            <div className="border-b -mx-3"></div>
                            <div className="pl-2 space-y-3 pt-2">
                                <div className="flex items-center space-x-2">
                                    <Switch id="show-walls" checked={showWalls} onCheckedChange={setShowWalls} />
                                    <Label htmlFor="show-walls" className="flex-1 cursor-pointer text-muted-foreground">Show Order Book Walls</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch id="show-liquidity" checked={showLiquidity} onCheckedChange={setShowLiquidity} />
                                    <Label htmlFor="show-liquidity" className="flex-1 cursor-pointer text-muted-foreground">Show Historical Grabs</Label>
                                </div>
                                 <div className="flex items-center space-x-2">
                                    <Switch id="show-targets" checked={showTargets} onCheckedChange={setShowTargets} />
                                    <Label htmlFor="show-targets" className="flex-1 cursor-pointer text-muted-foreground">Show Future Targets</Label>
                                 </div>
                            </div>
                          </>
                        )}
                    </div>
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

          <MarketHeatmap />

          <OrderBook symbol={symbol} onWallsUpdate={handleOrderBookUpdate} />

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

    