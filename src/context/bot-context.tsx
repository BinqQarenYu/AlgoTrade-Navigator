

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { HistoricalData, TradeSignal, LiveBotConfig, ManualTraderConfig, MultiSignalConfig, MultiSignalState, SignalResult, ScreenerConfig, ScreenerState, RankedTradeSignal, FearAndGreedIndex, StrategyAnalysisInput, OrderSide, Position, PricePredictionOutput } from '@/lib/types';
import { predictMarket, type PredictMarketOutput } from "@/ai/flows/predict-market-flow";
import { getHistoricalKlines, getLatestKlinesByLimit, placeOrder } from "@/lib/binance-service";
import { getFearAndGreedIndex } from "@/lib/fear-greed-service";
import { addDays } from 'date-fns';
import { getStrategyById } from '@/lib/strategies';
import { useApi } from './api-context';

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
import { defaultLiquidityOrderFlowParams } from "@/lib/strategies/liquidity-order-flow"
import { defaultLiquidityGrabParams } from '@/lib/strategies/liquidity-grab';


// --- State Types ---
interface LiveBotState {
  isRunning: boolean;
  isPredicting: boolean;
  logs: string[];
  prediction: PredictMarketOutput | null;
  config: LiveBotConfig | null;
  chartData: HistoricalData[];
}

interface ManualTraderState {
  isAnalyzing: boolean;
  isExecuting: boolean;
  logs: string[];
  signal: TradeSignal | null;
  chartData: HistoricalData[];
}

// --- Context Type ---
interface BotContextType {
  liveBotState: LiveBotState;
  manualTraderState: ManualTraderState;
  multiSignalState: MultiSignalState;
  screenerState: ScreenerState;
  strategyParams: Record<string, any>;
  setStrategyParams: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  isTradingActive: boolean;
  startLiveBot: (config: LiveBotConfig) => void;
  stopLiveBot: () => void;
  runManualAnalysis: (config: ManualTraderConfig) => void;
  cancelManualAnalysis: () => void;
  resetManualSignal: () => void;
  cleanManualChart: () => void;
  executeManualTrade: (signal: TradeSignal, capital: number, leverage: number, isSimulation: boolean) => void;
  setManualChartData: (symbol: string, interval: string) => void;
  startMultiSignalMonitor: (config: MultiSignalConfig) => void;
  stopMultiSignalMonitor: () => void;
  startScreener: (config: ScreenerConfig) => void;
  stopScreener: () => void;
  closePosition: (position: Position) => void;
}

const BotContext = createContext<BotContextType | undefined>(undefined);

const DEFAULT_STRATEGY_PARAMS: Record<string, any> = {
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
    'liquidity-order-flow': defaultLiquidityOrderFlowParams,
    'liquidity-grab': defaultLiquidityGrabParams,
};

// Helper to convert interval string to milliseconds for timers
const intervalToMs = (interval: string): number => {
    const value = parseInt(interval.slice(0, -1), 10);
    const unit = interval.slice(-1);

    if (isNaN(value)) return 60000; // Default to 1 minute on error

    switch (unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 60000;
    }
}

const KNOWN_INDICATORS = [
    'sma_short', 'sma_long', 'ema_short', 'ema_long', 'rsi', 'stopLossLevel',
    'peakPrice', 'poc', 'volumeDelta', 'cumulativeVolumeDelta', 'bb_upper', 'bb_middle',
    'bb_lower', 'macd', 'macd_signal', 'macd_hist', 'supertrend', 'supertrend_direction',
    'atr', 'donchian_upper', 'donchian_middle', 'donchian_lower', 'tenkan_sen',
    'kijun_sen', 'senkou_a', 'senkou_b', 'chikou_span',
    // New indicators
    'stoch_k', 'stoch_d', 'keltner_upper', 'keltner_middle', 'keltner_lower', 'vwap',
    'psar', 'psar_direction', 'momentum', 'awesome_oscillator', 'williams_r', 'cci',
    'ha_close', 'pivot_point', 's1', 'r1', 'obv', 'cmf', 'coppock', 'bull_power', 'bear_power'
];

const getCodeBasedPrediction = (
    inputs: StrategyAnalysisInput[], 
    currentPrice: number
): PricePredictionOutput => {
    if (inputs.length === 0) {
        return {
            predictedPrice: currentPrice,
            predictedDirection: 'NEUTRAL',
            confidence: 0,
            reasoning: 'No strategies were provided for analysis.'
        };
    }

    let score = 0;
    let buySignals = 0;
    let sellSignals = 0;
    let holdSignals = 0;

    for (const input of inputs) {
        if (input.signal === 'BUY') {
            score++;
            buySignals++;
        } else if (input.signal === 'SELL') {
            score--;
            sellSignals++;
        } else {
            holdSignals++;
        }
    }

    const totalSignals = inputs.length;
    const confidence = totalSignals > 0 ? Math.abs(score) / totalSignals : 0;
    let predictedDirection: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    let predictedPrice = currentPrice;
    
    const threshold = Math.max(1, totalSignals * 0.2); // Require at least 1 or 20% of signals to agree

    if (score > threshold) {
        predictedDirection = 'UP';
        predictedPrice = currentPrice * (1 + (confidence * 0.001)); // Predict small move up based on confidence
    } else if (score < -threshold) {
        predictedDirection = 'DOWN';
        predictedPrice = currentPrice * (1 - (confidence * 0.001)); // Predict small move down
    }

    const reasoning = `Analysis of ${totalSignals} strategies. Score: ${score} (Buys: ${buySignals}, Sells: ${sellSignals}, Holds: ${holdSignals}). The consensus suggests a ${predictedDirection.toLowerCase()} direction with ${(confidence*100).toFixed(1)}% confidence.`;

    return {
        predictedPrice,
        predictedDirection,
        confidence,
        reasoning
    };
};


// --- Provider Component ---
export const BotProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { apiKey, secretKey, activeProfile, canUseAi } = useApi();
  
  // --- Live Bot State ---
  const [liveBotState, setLiveBotState] = useState<LiveBotState>({
    isRunning: false, isPredicting: false, logs: [], prediction: null, config: null, chartData: []
  });
  const liveBotIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Manual Trader State ---
  const [manualTraderState, setManualTraderState] = useState<ManualTraderState>({
    isAnalyzing: false, isExecuting: false, logs: [], signal: null, chartData: []
  });
  const manualWsRef = useRef<WebSocket | null>(null);
  const manualAnalysisCancelRef = useRef(false);
  const manualReevalIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const manualConfigRef = useRef<ManualTraderConfig | null>(null);

  // --- Multi-Signal State ---
  const [multiSignalState, setMultiSignalState] = useState<MultiSignalState>({
    isRunning: false, config: null, results: {}, logs: []
  });
  const multiSignalIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const multiSignalRunningRef = useRef(false);
  const multiSignalConfigRef = useRef<MultiSignalConfig | null>(null);

  // --- Screener State ---
  const [screenerState, setScreenerState] = useState<ScreenerState>({
    isRunning: false, config: null, prediction: null, strategyInputs: [], logs: []
  });
  const screenerRunningRef = useRef(false);

  // --- Global State ---
  const [strategyParams, setStrategyParams] = useState<Record<string, any>>(DEFAULT_STRATEGY_PARAMS);
  const [isTradingActive, setIsTradingActive] = useState(false);

  useEffect(() => {
    const live = liveBotState.isRunning;
    const manual = manualTraderState.isAnalyzing || manualTraderState.signal !== null;
    const multi = multiSignalState.isRunning;
    const screener = screenerState.isRunning;
    setIsTradingActive(live || manual || multi || screener);
  }, [liveBotState.isRunning, manualTraderState.isAnalyzing, manualTraderState.signal, multiSignalState.isRunning, screenerState.isRunning]);


  // --- Helper Functions ---
  const addLog = useCallback((setter: React.Dispatch<React.SetStateAction<any>>, message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    // Defensive check to prevent crash if logs array becomes undefined
    setter((prev: any) => ({ ...prev, logs: [`[${timestamp}] ${message}`, ...(prev.logs || [])].slice(0, 100) }));
  }, []);

  const addLiveLog = useCallback((message: string) => addLog(setLiveBotState, message), [addLog]);
  const addManualLog = useCallback((message: string) => addLog(setManualTraderState, message), [addLog]);
  const addMultiLog = useCallback((message: string) => addLog(setMultiSignalState, message), [addLog]);
  const addScreenerLog = useCallback((message: string) => addLog(setScreenerState, message), [addLog]);
  
  const cleanManualChart = useCallback(() => {
    setManualTraderState(prev => {
        if (!prev.chartData) return prev;
        const cleaned = prev.chartData.map(({ time, open, high, low, close, volume }) => ({ time, open, high, low, close, volume }));
        return { ...prev, chartData: cleaned };
    });
    addManualLog("Cleared indicators from chart.");
  }, [addManualLog]);

  // --- Reusable Analysis Logic ---
  const analyzeAsset = useCallback(async (
    config: { symbol: string; interval: string; strategy: string; strategyParams: any; takeProfit: number; stopLoss: number; useAIPrediction: boolean },
    existingData?: HistoricalData[]
  ): Promise<SignalResult> => {
    try {
        const dataToAnalyze = existingData && existingData.length > 50 
            ? existingData
            : await getLatestKlinesByLimit(config.symbol, config.interval, 500);

        if (dataToAnalyze.length < 50) {
            return { status: 'error', log: 'Not enough data.', signal: null };
        }

        const strategy = getStrategyById(config.strategy);
        if (!strategy) {
          return { status: 'error', log: `Strategy '${config.strategy}' not found.`, signal: null };
        }

        const dataWithSignals = await strategy.calculate(dataToAnalyze, config.strategyParams);
        const latestCandleWithSignal = [...dataWithSignals].reverse().find(d => d.buySignal || d.sellSignal);

        if (!latestCandleWithSignal) {
             return { status: 'no_signal', log: 'No actionable trade setup found. Waiting for market conditions to align with strategy rules.', signal: null };
        }
        
        const signalAge = (dataWithSignals.length - 1) - dataWithSignals.indexOf(latestCandleWithSignal);
        if (signalAge > 5) { // Only consider signals in the last 5 candles
            return { status: 'no_signal', log: 'A valid signal was found in the past, but the entry window has closed. The signal is now considered stale.', signal: null };
        }
        
        const strategySignal: 'BUY' | 'SELL' = latestCandleWithSignal.buySignal ? 'BUY' : 'SELL';

        const prediction = config.useAIPrediction ? (
            canUseAi() ? await predictMarket({
                symbol: config.symbol,
                recentData: JSON.stringify(dataWithSignals.slice(-50).map(d => ({ t: d.time, o: d.open, h: d.high, l: d.low, c: d.close, v: d.volume }))),
                strategySignal
            }) : null
        ) : {
            prediction: strategySignal === 'BUY' ? 'UP' : 'DOWN',
            confidence: 1,
            reasoning: `Signal from '${config.strategy}' without AI validation.`
        };

        if (!prediction) { // This will be true if canUseAi returned false
            return { status: 'no_signal', log: 'AI quota reached, cannot validate signal.', signal: null };
        }
        
        const aiConfirms = (prediction.prediction === 'UP' && strategySignal === 'BUY') || (prediction.prediction === 'DOWN' && strategySignal === 'SELL');
        
        if (aiConfirms) {
            const currentPrice = latestCandleWithSignal.close;
            const stopLossPrice = latestCandleWithSignal?.stopLossLevel ? latestCandleWithSignal.stopLossLevel : prediction.prediction === 'UP' ? currentPrice * (1 - (config.stopLoss / 100)) : currentPrice * (1 + (config.stopLoss / 100));
            const takeProfitPrice = prediction.prediction === 'UP' ? currentPrice * (1 + (config.takeProfit / 100)) : currentPrice * (1 - (config.takeProfit / 100));
            
            const newSignal: TradeSignal = {
                asset: config.symbol,
                action: prediction.prediction as 'UP' | 'DOWN', entryPrice: currentPrice,
                stopLoss: stopLossPrice, takeProfit: takeProfitPrice,
                confidence: prediction.confidence, reasoning: prediction.reasoning,
                timestamp: new Date(latestCandleWithSignal.time), strategy: config.strategy,
                peakPrice: latestCandleWithSignal?.peakPrice
            };
            return { status: 'monitoring', log: 'Signal found.', signal: newSignal };
        } else {
            return { status: 'no_signal', log: `AI invalidated signal (${prediction.prediction}).`, signal: null };
        }
    } catch (e: any) {
        console.error(`Analysis failed for ${config.symbol}:`, e);
        return { status: 'error', log: e.message || 'Unknown error', signal: null };
    }
  }, [canUseAi]);

  // --- Live Bot Logic ---
  const runLiveBotPrediction = useCallback(async () => {
    const currentConfig = liveBotState.config;
    if (!liveBotState.isRunning || !currentConfig) return;

    setLiveBotState(prev => ({ ...prev, isPredicting: true, prediction: null }));
    
    const result = await analyzeAsset(currentConfig);
    
    if (result.signal) {
        const aiPrediction: PredictMarketOutput = {
            prediction: result.signal.action,
            confidence: result.signal.confidence,
            reasoning: result.signal.reasoning,
        };
        setLiveBotState(prev => ({ ...prev, prediction: aiPrediction }));
        addLiveLog(`AI Prediction: ${aiPrediction.prediction} (Confidence: ${(aiPrediction.confidence * 100).toFixed(1)}%).`);
    } else {
        addLiveLog(`No actionable signal found. Reason: ${result.log}`);
    }

    setLiveBotState(prev => ({ ...prev, isPredicting: false }));

  }, [liveBotState.isRunning, liveBotState.config, addLiveLog, analyzeAsset]);

  const startLiveBot = async (config: LiveBotConfig) => {
    addLiveLog("Starting bot...");
    
    setLiveBotState(prev => ({...prev, isRunning: true, config, logs: [`[${new Date().toLocaleTimeString()}] Bot starting...`], chartData: []}));
    try {
      const klines = await getLatestKlinesByLimit(config.symbol, config.interval, 500);
      setLiveBotState(prev => ({ ...prev, chartData: klines }));
      addLiveLog(`Loaded ${klines.length} initial candles for ${config.symbol}.`);
      
      runLiveBotPrediction(); // Initial run
      liveBotIntervalRef.current = setInterval(runLiveBotPrediction, 30000); // 30 seconds
      toast({ title: "Live Bot Started", description: `Monitoring ${config.symbol} on the ${config.interval} interval.`});

    } catch (error: any) {
        addLiveLog(`Error starting bot: ${error.message}`);
        toast({ title: "Failed to Start Bot", description: error.message, variant: "destructive"});
        stopLiveBot();
    }
  };

  const stopLiveBot = () => {
    if (liveBotIntervalRef.current) {
        clearInterval(liveBotIntervalRef.current);
        liveBotIntervalRef.current = null;
    }
    setLiveBotState({ isRunning: false, isPredicting: false, logs: [], prediction: null, config: null, chartData: [] });
    addLiveLog("Bot stopped by user.");
    toast({ title: "Live Bot Stopped" });
  };
  

  // --- Manual Trader Logic ---
  const resetManualSignal = useCallback(() => {
    if (manualWsRef.current) {
        manualWsRef.current.close(1000, "Signal reset by user");
        manualWsRef.current = null;
    }
    if (manualReevalIntervalRef.current) { // Clear interval on reset
        clearInterval(manualReevalIntervalRef.current);
        manualReevalIntervalRef.current = null;
    }
    manualConfigRef.current = null; // Clear stored config
    setManualTraderState(prev => ({
        ...prev,
        isAnalyzing: false,
        signal: null,
        logs: [`[${new Date().toLocaleTimeString()}] Signal monitoring has been reset.`, ...(prev.logs || [])].slice(0, 100)
    }));
    toast({ title: "Signal Reset", description: "You can now run a new analysis." });
  }, [toast]);

  const executeManualTrade = useCallback(async (signal: TradeSignal, capital: number, leverage: number, isSimulation: boolean) => {
    if (!activeProfile || !apiKey || !secretKey) {
      toast({ title: "Execution Failed", description: "An active API profile is required.", variant: "destructive" });
      return;
    }
    if (!signal) {
        toast({ title: "Execution Failed", description: "No valid signal to execute.", variant: "destructive" });
        return;
    }

    setManualTraderState(prev => ({ ...prev, isExecuting: true }));

    if (isSimulation) {
        addManualLog(`SIMULATION: Starting simulated trade for ${signal.asset}...`);
        toast({
            title: "Simulation Started",
            description: "The signal will remain on the chart. Dismiss it manually when you're done."
        });
        setManualTraderState(prev => ({ ...prev, isExecuting: false }));
        return; // End here for simulation
    }

    // --- Real Execution Logic ---
    if (activeProfile.permissions === 'ReadOnly') {
        addManualLog(`Read-only key detected. Simulating trade locally for ${signal.asset}...`);
        toast({
            title: "Read-Only API Key",
            description: "Simulating trade execution locally. No real order will be placed."
        });
    } else {
        addManualLog(`Futures key detected. Executing ${signal.action === 'UP' ? 'BUY' : 'SELL'} order for ${signal.asset}...`);
    }

    try {
        const positionValue = capital * leverage;
        const quantity = positionValue / signal.entryPrice;
        const side = signal.action === 'UP' ? 'BUY' : 'SELL';

        const orderResult = await placeOrder(signal.asset, side, quantity, apiKey, secretKey);
        
        toast({
            title: "Order Placed (Simulated)",
            description: `${side} order for ${orderResult.quantity.toFixed(5)} ${signal.asset} submitted. Order ID: ${orderResult.orderId}`
        });

        // Reset the signal only after successful REAL execution
        resetManualSignal();

    } catch (e: any) {
        toast({ title: "Execution Failed", description: e.message || "An unknown error occurred.", variant: "destructive" });
        addManualLog(`Execution failed: ${e.message}`);
    } finally {
        setManualTraderState(prev => ({ ...prev, isExecuting: false }));
    }
  }, [apiKey, secretKey, toast, addManualLog, resetManualSignal, activeProfile]);

  const setManualChartData = useCallback(async (symbol: string, interval: string) => {
    // This function is for loading the initial chart data on the manual page.
    setManualTraderState(prev => ({...prev, logs: [], chartData: []}));
    addManualLog(`Fetching chart data for ${symbol} (${interval})...`);
    try {
        const klines = await getLatestKlinesByLimit(symbol, interval, 500);
        setManualTraderState(prev => ({ ...prev, chartData: klines, logs: [`[${new Date().toLocaleTimeString()}] Loaded ${klines.length} historical candles.`] }));
    } catch (error: any) {
        toast({ title: "Failed to load data", description: error.message, variant: "destructive" });
        addManualLog(`Error loading data: ${error.message}`);
    }
  }, [addManualLog, toast]);

  const connectManualWebSocket = useCallback((symbol: string, interval: string) => {
    if (manualWsRef.current) manualWsRef.current.close();
    
    addManualLog("Connecting to WebSocket for live invalidation monitoring...");
    const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`);
    manualWsRef.current = ws;

    ws.onopen = () => addManualLog("Monitoring connection established.");

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.e !== 'kline') return;

      const kline = message.k;
      const newCandle: HistoricalData = {
        time: kline.t, open: parseFloat(kline.o), high: parseFloat(kline.h),
        low: parseFloat(kline.l), close: parseFloat(kline.c), volume: parseFloat(kline.v),
      };

      setManualTraderState(current => {
        const currentLogs = current.logs || [];
        let newChartData = current.chartData;

        if (newChartData.length > 0) {
            const lastCandle = newChartData[newChartData.length - 1];
            if (lastCandle.time === newCandle.time) {
              newChartData[newChartData.length - 1] = newCandle;
            } else {
              newChartData.push(newCandle);
            }
            const sortedData = newChartData.sort((a, b) => a.time - b.time);
            newChartData = sortedData.filter((candle, index, self) => index === 0 || candle.time > self[index - 1].time).slice(-1500);
        } else {
            newChartData = [newCandle];
        }

        if (current.signal && current.signal.peakPrice) {
          let invalidated = false;
          let invalidationReason = '';
          if (current.signal.action === 'DOWN' && newCandle.high > current.signal.peakPrice) {
            invalidated = true;
            invalidationReason = `Price (${newCandle.high.toFixed(4)}) broke above the structural peak high of ${current.signal.peakPrice.toFixed(4)}.`;
          } else if (current.signal.action === 'UP' && newCandle.low < current.signal.peakPrice) {
            invalidated = true;
            invalidationReason = `Price (${newCandle.low.toFixed(4)}) broke below the structural peak low of ${current.signal.peakPrice.toFixed(4)}.`;
          }

          if (invalidated) {
             setTimeout(() => {
                toast({
                  title: "Trade Signal Invalidated",
                  description: "Market structure has changed. The trade idea is now void.",
                  variant: "default"
                });
             }, 0);
            
            const timestamp = new Date().toLocaleTimeString();
            const newLog = `[${timestamp}] SIGNAL INVALIDATED: ${invalidationReason}`;
            const newLogs = [newLog, ...currentLogs].slice(0, 100);

            manualWsRef.current?.close();
            return { ...current, signal: null, chartData: newChartData, logs: newLogs };
          }
        }
        
        return { ...current, chartData: newChartData, logs: currentLogs };
      });
    };
    
    ws.onclose = (event) => {
        const reason = event.reason || 'No reason given';
        const code = event.wasClean ? `(Code: ${event.code})` : `(Code: ${event.code}, unclean closure)`;
        addManualLog(`Monitoring WebSocket closed. ${reason} ${code}`);
        manualWsRef.current = null;
    }

    ws.onerror = () => {
        addManualLog("WebSocket error occurred. See browser console for details.");
    };
  }, [addManualLog, toast]);

  const cancelManualAnalysis = useCallback(() => {
    manualAnalysisCancelRef.current = true;
    addManualLog("Analysis canceled by user.");
    setManualTraderState(prev => ({ ...prev, isAnalyzing: false, logs: prev.logs || [] }));
  }, [addManualLog]);

  const runManualAnalysis = useCallback(async (config: ManualTraderConfig) => {
    manualAnalysisCancelRef.current = false;
    manualConfigRef.current = config;
    // 1. Set analyzing state and clear previous data
    setManualTraderState(prev => ({ ...prev, isAnalyzing: true, logs: [], signal: null, chartData: [] }));
    addManualLog("Running analysis...");
    
    // 2. Perform all async operations first
    let chartDataForAnalysis: HistoricalData[];
    try {
        addManualLog(`Fetching chart data for ${config.symbol}...`);
        chartDataForAnalysis = await getLatestKlinesByLimit(config.symbol, config.interval, 500);
    } catch (e: any) {
        addManualLog(`Failed to load chart data: ${e.message}`);
        setManualTraderState(prev => ({ ...prev, isAnalyzing: false, logs: prev.logs || [] })); // End analysis on error
        toast({ title: "Analysis Failed", description: "Could not load market data.", variant: "destructive" });
        return;
    }

    // Update state with fetched chart data
    setManualTraderState(prev => ({ ...prev, chartData: chartDataForAnalysis, logs: prev.logs || [] }));
    addManualLog(`Loaded ${chartDataForAnalysis.length} historical candles.`);

    if (manualAnalysisCancelRef.current) {
        addManualLog("Analysis canceled before execution.");
        setManualTraderState(prev => ({ ...prev, isAnalyzing: false, logs: prev.logs || [] }));
        return;
    }

    const result = await analyzeAsset({ ...config }, chartDataForAnalysis);

    if (manualAnalysisCancelRef.current) {
        addManualLog("Analysis canceled, results discarded.");
        setManualTraderState(prev => ({ ...prev, isAnalyzing: false, logs: prev.logs || [] }));
        return;
    }
    
    // 3. Update state based on async result
    if (result.signal) {
        addManualLog(`NEW SIGNAL: ${result.signal.action} at $${result.signal.entryPrice.toFixed(4)}. SL: $${result.signal.stopLoss.toFixed(4)}, TP: $${result.signal.takeProfit.toFixed(4)}`);
        toast({ title: "Trade Signal Generated!", description: "Monitoring for invalidation and re-evaluation." });
        connectManualWebSocket(config.symbol, config.interval);

        // Re-evaluation Logic
        if (manualReevalIntervalRef.current) clearInterval(manualReevalIntervalRef.current);
        const reevalTime = intervalToMs(config.interval);
        addManualLog(`Signal found. Re-evaluating every ${config.interval}.`);
        
        manualReevalIntervalRef.current = setInterval(() => {
            const currentConfig = manualConfigRef.current;
            if (!currentConfig) return;

            addManualLog("Re-evaluating signal...");
            setManualTraderState(current => {
                const preservedLogs = current.logs || [];
                const originalSignal = current.signal;
                if (!originalSignal) {
                    if (manualReevalIntervalRef.current) clearInterval(manualReevalIntervalRef.current);
                    return { ...current, logs: preservedLogs };
                }
                analyzeAsset({ ...currentConfig }, current.chartData).then(reevalResult => {
                    if (!manualReevalIntervalRef.current) return;
                    if (reevalResult.signal) {
                        if (reevalResult.signal.action !== originalSignal.action) {
                            addManualLog(`SIGNAL REVERSED: Original was ${originalSignal.action}, new analysis suggests ${reevalResult.signal.action}.`);
                            setTimeout(() => {
                                toast({
                                    title: "CANCEL TRADE: Signal Reversed",
                                    description: "Market conditions have changed, and the analysis now suggests the opposite direction.",
                                    variant: "destructive",
                                });
                            }, 0);
                            resetManualSignal();
                        } else {
                            setManualTraderState(prev => ({ ...prev, signal: reevalResult.signal, logs: prev.logs || [] }));
                            addManualLog(`Signal updated. New entry: $${reevalResult.signal.entryPrice.toFixed(4)}`);
                        }
                    } else {
                        addManualLog(`Signal no longer valid. Reason: ${reevalResult.log}.`);
                        setTimeout(() => {
                           toast({ title: "Signal Invalidated", description: `Setup no longer valid: ${reevalResult.log}` });
                        }, 0);
                        resetManualSignal();
                    }
                });
                return { ...current, logs: preservedLogs };
            });
        }, reevalTime);

        setManualTraderState(prev => ({ ...prev, signal: result.signal, isAnalyzing: false, logs: prev.logs || [] }));
    } else {
        addManualLog(result.log);
        if(result.status === 'error') {
             setTimeout(() => toast({ title: "Analysis Failed", description: result.log, variant: "destructive" }), 0);
        } else {
            setTimeout(() => toast({ title: "No Signal Found", description: result.log }), 0);
        }
        setManualTraderState(prev => ({ ...prev, isAnalyzing: false, logs: prev.logs || [] }));
    }
  }, [addManualLog, toast, connectManualWebSocket, analyzeAsset, resetManualSignal]);

  // --- Multi-Signal Monitor Logic ---
  const runMultiSignalCheck = useCallback(async () => {
    if (!multiSignalRunningRef.current || !multiSignalConfigRef.current) return;
    const config = multiSignalConfigRef.current;
    
    addMultiLog("Running sequential analysis for all assets...");

    for (const asset of config.assets) {
        if (!multiSignalRunningRef.current) {
            addMultiLog("Monitor stopped during cycle. Aborting.");
            break;
        }

        setMultiSignalState(prev => ({
            ...prev,
            results: { ...prev.results, [asset]: { ...prev.results[asset], status: 'analyzing' } }
        }));

        try {
            const result = await analyzeAsset({ ...config, symbol: asset });
            
            if (!multiSignalRunningRef.current) break;

            setMultiSignalState(prev => ({
                ...prev,
                results: { ...prev.results, [asset]: result }
            }));

        } catch (e: any) {
            console.error(`Unhandled error analyzing ${asset}:`, e);
            if (!multiSignalRunningRef.current) break;
            setMultiSignalState(prev => ({
                ...prev,
                results: { ...prev.results, [asset]: { status: 'error', log: 'An unexpected error occurred.', signal: null } }
            }));
        }
    }

    if (multiSignalRunningRef.current) {
        addMultiLog("Analysis cycle complete.");
    }
  }, [analyzeAsset, addMultiLog]);


  const startMultiSignalMonitor = useCallback((config: MultiSignalConfig) => {
    if (multiSignalIntervalRef.current) {
        clearInterval(multiSignalIntervalRef.current);
    }
    
    multiSignalRunningRef.current = true;
    multiSignalConfigRef.current = config;
    addMultiLog("Starting multi-signal monitor...");
    
    const initialResults: Record<string, SignalResult> = {};
    config.assets.forEach(asset => {
        initialResults[asset] = { status: 'monitoring', log: 'Waiting for first cycle.', signal: null };
    });

    setMultiSignalState({ isRunning: true, config, results: initialResults, logs: [] });
    
    runMultiSignalCheck(); // Initial run
    multiSignalIntervalRef.current = setInterval(runMultiSignalCheck, 60000); // 1 minute interval

    toast({ title: "Multi-Signal Monitor Started", description: `Monitoring ${config.assets.length} assets.` });
  }, [addMultiLog, toast, runMultiSignalCheck]);

  const stopMultiSignalMonitor = useCallback(() => {
    multiSignalRunningRef.current = false;
    multiSignalConfigRef.current = null;
    if (multiSignalIntervalRef.current) {
        clearInterval(multiSignalIntervalRef.current);
        multiSignalIntervalRef.current = null;
    }
    setMultiSignalState({ isRunning: false, config: null, results: {}, logs: [] });
    addMultiLog("Multi-signal monitor stopped by user.");
    toast({ title: "Multi-Signal Monitor Stopped" });
  }, [addMultiLog, toast]);

  // --- Screener Logic ---
  const startScreener = useCallback(async (config: ScreenerConfig) => {
    screenerRunningRef.current = true;
    setScreenerState({ isRunning: true, config, prediction: null, logs: [], strategyInputs: [] });
    addScreenerLog(`Starting consensus analysis for ${config.asset}...`);
    toast({ title: "Consensus Analysis Started", description: "This is a code-based process and does not use AI tokens." });
    
    try {
        addScreenerLog("Fetching historical data...");
        const data = await getLatestKlinesByLimit(config.asset, config.interval, 500);

        if (!screenerRunningRef.current) return;
        
        const lastCandle = data[data.length - 1];
        if (!lastCandle) {
            throw new Error('Could not get latest candle to determine current price.');
        }

        addScreenerLog(`Analyzing with ${config.strategies.length} strategies...`);
        const strategyOutputs: StrategyAnalysisInput[] = [];

        for (const strategyId of config.strategies) {
             if (!screenerRunningRef.current) break;
            const strategy = getStrategyById(strategyId);
            if (!strategy) continue;

            const paramsForStrategy = config.strategyParams[strategyId];
            const dataWithIndicators = await strategy.calculate(data, paramsForStrategy);
            const lastCandleWithIndicators = dataWithIndicators[dataWithIndicators.length - 1];
            
            let signal: string | null = null;
            if (lastCandleWithIndicators.buySignal) signal = 'BUY';
            else if (lastCandleWithIndicators.sellSignal) signal = 'SELL';
            else signal = 'HOLD';

            const indicators: Record<string, any> = {};
            for (const key of KNOWN_INDICATORS) {
                if (key in lastCandleWithIndicators && lastCandleWithIndicators[key as keyof HistoricalData] !== null && lastCandleWithIndicators[key as keyof HistoricalData] !== undefined) {
                    indicators[key] = lastCandleWithIndicators[key as keyof HistoricalData];
                }
            }

            strategyOutputs.push({ name: strategy.name, signal, indicators });
            setScreenerState(prev => ({...prev, strategyInputs: [...strategyOutputs]}));
        }
        
        if (!screenerRunningRef.current) return;

        addScreenerLog("All strategies analyzed. Calculating code-based prediction...");
        
        const prediction = getCodeBasedPrediction(strategyOutputs, lastCandle.close);

        if (!screenerRunningRef.current) return;
        
        setScreenerState(prev => ({...prev, prediction, isRunning: false}));
        addScreenerLog(`Code-based prediction received: ${prediction.predictedDirection}`);
        toast({ title: "Prediction Complete", description: `The code-based consensus predicts a direction of ${prediction.predictedDirection}.` });

    } catch (e: any) {
        addScreenerLog(`Analysis failed: ${e.message}`);
        toast({ title: "Analysis Failed", description: e.message, variant: "destructive" });
        setScreenerState(prev => ({...prev, isRunning: false}));
    } finally {
        screenerRunningRef.current = false;
    }

  }, [addScreenerLog, toast]);

  const stopScreener = useCallback(() => {
    addScreenerLog("Stopping analysis...");
    screenerRunningRef.current = false;
    setScreenerState(prev => ({...prev, isRunning: false}));
  }, [addScreenerLog]);
  
  const closePosition = useCallback(async (position: Position) => {
    if (!activeProfile || !apiKey || !secretKey) {
      toast({ title: "Execution Failed", description: "An active API profile is required.", variant: "destructive" });
      return;
    }
    if (activeProfile.permissions === 'ReadOnly') {
      toast({ title: "Action Disabled", description: "Your active API key is Read-Only.", variant: "destructive" });
      return;
    }

    const side: OrderSide = position.side === 'LONG' ? 'SELL' : 'BUY';
    const symbol = position.symbol;
    const quantity = position.size;

    toast({ title: `Submitting close order...`, description: `${side} ${quantity} ${symbol}` });

    try {
        const orderResult = await placeOrder(symbol, side, quantity, apiKey, secretKey);
        
        toast({
            title: "Close Order Submitted (Simulated)",
            description: `${side} order for ${orderResult.quantity.toFixed(5)} ${symbol} submitted. Positions will update on next fetch.`
        });
    } catch (e: any) {
        toast({ title: "Close Order Failed", description: e.message || "An unknown error occurred.", variant: "destructive" });
    }
  }, [apiKey, secretKey, toast, activeProfile]);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      screenerRunningRef.current = false;
      multiSignalRunningRef.current = false;
      if (liveBotIntervalRef.current) clearInterval(liveBotIntervalRef.current);
      if (manualWsRef.current) manualWsRef.current.close();
      if (multiSignalIntervalRef.current) clearInterval(multiSignalIntervalRef.current);
      if (manualReevalIntervalRef.current) clearInterval(manualReevalIntervalRef.current);
    }
  }, []);

  return (
    <BotContext.Provider value={{ 
      liveBotState, 
      manualTraderState,
      multiSignalState,
      screenerState,
      strategyParams,
      setStrategyParams,
      isTradingActive,
      startLiveBot,
      stopLiveBot,
      runManualAnalysis,
      cancelManualAnalysis,
      resetManualSignal,
      cleanManualChart,
      executeManualTrade,
      setManualChartData,
      startMultiSignalMonitor,
      stopMultiSignalMonitor,
      startScreener,
      stopScreener,
      closePosition,
    }}>
      {children}
    </BotContext.Provider>
  );
};

export const useBot = () => {
  const context = useContext(BotContext);
  if (context === undefined) {
    throw new Error('useBot must be used within a BotProvider');
  }
  return context;
};
