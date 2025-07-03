
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { HistoricalData, TradeSignal, LiveBotConfig, ManualTraderConfig, MultiSignalConfig, MultiSignalState, SignalResult } from '@/lib/types';
import { predictMarket, type PredictMarketOutput } from "@/ai/flows/predict-market-flow";
import { getHistoricalKlines } from "@/lib/binance-service";
import { calculateEMA, calculateRSI, calculateSMA } from "@/lib/indicators"
import { calculatePeakFormationFibSignals } from "@/lib/strategies/peak-formation-fib"
import { addDays } from 'date-fns';

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
  logs: string[];
  signal: TradeSignal | null;
  chartData: HistoricalData[];
}

// --- Context Type ---
interface BotContextType {
  liveBotState: LiveBotState;
  manualTraderState: ManualTraderState;
  multiSignalState: MultiSignalState;
  isTradingActive: boolean;
  startLiveBot: (config: LiveBotConfig) => void;
  stopLiveBot: () => void;
  runManualAnalysis: (config: ManualTraderConfig) => void;
  cancelManualAnalysis: () => void;
  resetManualSignal: () => void;
  setManualChartData: (symbol: string, interval: string) => void;
  startMultiSignalMonitor: (config: MultiSignalConfig) => void;
  stopMultiSignalMonitor: () => void;
}

const BotContext = createContext<BotContextType | undefined>(undefined);

// --- Provider Component ---
export const BotProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  
  // --- Live Bot State ---
  const [liveBotState, setLiveBotState] = useState<LiveBotState>({
    isRunning: false, isPredicting: false, logs: [], prediction: null, config: null, chartData: []
  });
  const liveBotIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Manual Trader State ---
  const [manualTraderState, setManualTraderState] = useState<ManualTraderState>({
    isAnalyzing: false, logs: [], signal: null, chartData: []
  });
  const manualWsRef = useRef<WebSocket | null>(null);
  const manualAnalysisCancelRef = useRef(false);

  // --- Multi-Signal State ---
  const [multiSignalState, setMultiSignalState] = useState<MultiSignalState>({
    isRunning: false, config: null, results: {}, logs: []
  });
  const multiSignalIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Global Trading State ---
  const [isTradingActive, setIsTradingActive] = useState(false);

  useEffect(() => {
    const live = liveBotState.isRunning;
    const manual = manualTraderState.isAnalyzing || manualTraderState.signal !== null;
    const multi = multiSignalState.isRunning;
    setIsTradingActive(live || manual || multi);
  }, [liveBotState.isRunning, manualTraderState.isAnalyzing, manualTraderState.signal, multiSignalState.isRunning]);


  // --- Helper Functions ---
  const addLog = useCallback((setter: React.Dispatch<React.SetStateAction<any>>, message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setter((prev: any) => ({ ...prev, logs: [`[${timestamp}] ${message}`, ...prev.logs].slice(0, 100) }));
  }, []);

  const addLiveLog = useCallback((message: string) => addLog(setLiveBotState, message), [addLog]);
  const addManualLog = useCallback((message: string) => addLog(setManualTraderState, message), [addLog]);
  const addMultiLog = useCallback((message: string) => addLog(setMultiSignalState, message), [addLog]);
  
  // --- Live Bot Logic ---
  const runLiveBotPrediction = useCallback(async () => {
    if (!liveBotState.isRunning || !liveBotState.config) return;

    const { config, chartData } = liveBotState;
    
    if (chartData.length < 50) {
      addLiveLog("Waiting for more market data to accumulate...");
      return;
    }

    setLiveBotState(prev => ({ ...prev, isPredicting: true, prediction: null }));

    let strategySignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    const closePrices = chartData.map(d => d.close);
    switch (config.strategy) {
       case 'sma-crossover': {
            const shortPeriod = 20; const longPeriod = 50;
            const sma_short = calculateSMA(closePrices, shortPeriod); const sma_long = calculateSMA(closePrices, longPeriod);
            const last_sma_short = sma_short.slice(-1)[0]; const prev_sma_short = sma_short.slice(-2)[0];
            const last_sma_long = sma_long.slice(-1)[0]; const prev_sma_long = sma_long.slice(-2)[0];
            if (prev_sma_short && prev_sma_long && last_sma_short && last_sma_long) {
                if (prev_sma_short <= prev_sma_long && last_sma_short > last_sma_long) strategySignal = 'BUY';
                else if (prev_sma_short >= prev_sma_long && last_sma_short < last_sma_long) strategySignal = 'SELL';
            }
            break;
        }
        case 'ema-crossover': {
            const shortPeriod = 12; const longPeriod = 26;
            const ema_short = calculateEMA(closePrices, shortPeriod); const ema_long = calculateEMA(closePrices, longPeriod);
            const last_ema_short = ema_short.slice(-1)[0]; const prev_ema_short = ema_short.slice(-2)[0];
            const last_ema_long = ema_long.slice(-1)[0]; const prev_ema_long = ema_long.slice(-2)[0];
            if (prev_ema_short && prev_ema_long && last_ema_short && last_ema_long) {
                if (prev_ema_short <= prev_ema_long && last_ema_short > last_ema_long) strategySignal = 'BUY';
                else if (prev_ema_short >= prev_ema_long && last_ema_short < last_ema_long) strategySignal = 'SELL';
            }
            break;
        }
        case 'rsi-divergence': {
            const rsi = calculateRSI(closePrices, 14);
            const last_rsi = rsi.slice(-1)[0]; const prev_rsi = rsi.slice(-2)[0];
            if (prev_rsi && last_rsi) {
                if (prev_rsi <= 30 && last_rsi > 30) strategySignal = 'BUY';
                else if (prev_rsi >= 70 && last_rsi < 70) strategySignal = 'SELL';
            }
            break;
        }
        case 'peak-formation-fib': {
            const dataWithSignals = await calculatePeakFormationFibSignals(chartData);
            const lastSignal = dataWithSignals.slice(-5).find(d => d.buySignal || d.sellSignal);
            if (lastSignal?.buySignal) strategySignal = 'BUY';
            else if (lastSignal?.sellSignal) strategySignal = 'SELL';
            break;
        }
    }
    
    addLiveLog(`Strategy '${config.strategy}' generated a ${strategySignal} signal. Asking AI for validation...`);
    
    try {
        const recentData = chartData.slice(-50);
        const result = config.useAIPrediction ? await predictMarket({
            symbol: config.symbol,
            recentData: JSON.stringify(recentData.map(d => ({t: d.time, o: d.open, h: d.high, l: d.low, c:d.close, v:d.volume}))),
            strategySignal
        }) : {
             prediction: strategySignal === 'BUY' ? 'UP' : strategySignal === 'SELL' ? 'DOWN' : 'NEUTRAL',
             confidence: 0.99,
             reasoning: `AI is disabled. The prediction is based directly on the '${config.strategy}' signal.`
        };
        setLiveBotState(prev => ({ ...prev, prediction: result, isPredicting: false }));
        addLiveLog(`AI Prediction: ${result.prediction} (Confidence: ${(result.confidence * 100).toFixed(1)}%). Reason: ${result.reasoning}`);
    } catch (error) {
       console.error("Prediction failed", error);
       toast({ title: "AI Prediction Failed", variant: "destructive" });
       addLiveLog("Error: AI prediction failed.");
       setLiveBotState(prev => ({ ...prev, isPredicting: false }));
    }
  }, [liveBotState, addLiveLog, toast]);

  const startLiveBot = async (config: LiveBotConfig) => {
    addLiveLog("Starting bot...");
    
    // Fetch initial data
    setLiveBotState(prev => ({...prev, isRunning: true, config, logs: [], chartData: []}));
    try {
      const from = addDays(new Date(), -1).getTime();
      const to = new Date().getTime();
      const klines = await getHistoricalKlines(config.symbol, config.interval, from, to);
      setLiveBotState(prev => ({ ...prev, chartData: klines }));
      addLiveLog(`Loaded ${klines.length} initial candles for ${config.symbol}.`);
      
      // Start the interval
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
  
  // --- Reusable Analysis Logic ---
  const analyzeAsset = useCallback(async (
    config: { symbol: string; interval: string; strategy: string; takeProfit: number; stopLoss: number; useAIPrediction: boolean }
  ): Promise<SignalResult> => {
    try {
        const from = addDays(new Date(), -3).getTime();
        const to = new Date().getTime();
        const dataToAnalyze = await getHistoricalKlines(config.symbol, config.interval, from, to);

        if (dataToAnalyze.length < 50) {
            return { status: 'error', log: 'Not enough data.', signal: null };
        }

        let strategySignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let signalCandle: HistoricalData | null = null;
        let dataWithSignals = [...dataToAnalyze];

        switch (config.strategy) {
            case "sma-crossover":
            case "ema-crossover": {
                const closePrices = dataToAnalyze.map(d => d.close);
                const isSMA = config.strategy === 'sma-crossover';
                const shortPeriod = isSMA ? 20 : 12;
                const longPeriod = isSMA ? 50 : 26;
                const indicatorFunc = isSMA ? calculateSMA : calculateEMA;
                const shortMA = indicatorFunc(closePrices, shortPeriod);
                const longMA = indicatorFunc(closePrices, longPeriod);
                let lastSignalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
                let lastSignalIndex = -1;
                for (let i = longPeriod; i < dataToAnalyze.length; i++) {
                    if (!shortMA[i - 1] || !longMA[i - 1] || !shortMA[i] || !longMA[i]) continue;
                    if (shortMA[i - 1]! <= longMA[i - 1]! && shortMA[i]! > longMA[i]!) {
                        lastSignalType = 'BUY';
                        lastSignalIndex = i;
                    }
                    if (shortMA[i - 1]! >= longMA[i - 1]! && shortMA[i]! < longMA[i]!) {
                        lastSignalType = 'SELL';
                        lastSignalIndex = i;
                    }
                }
                if (lastSignalIndex !== -1 && (dataToAnalyze.length - 1 - lastSignalIndex) < 5) {
                    strategySignal = lastSignalType;
                    signalCandle = dataToAnalyze[lastSignalIndex];
                }
                break;
            }
            case "rsi-divergence": {
                const closePrices = dataToAnalyze.map(d => d.close);
                const rsi = calculateRSI(closePrices, 14);
                let lastSignalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
                let lastSignalIndex = -1;
                for (let i = 14; i < dataToAnalyze.length; i++) {
                    if (!rsi[i - 1] || !rsi[i]) continue;
                    if (rsi[i - 1]! <= 30 && rsi[i]! > 30) {
                        lastSignalType = 'BUY';
                        lastSignalIndex = i;
                    }
                    if (rsi[i - 1]! >= 70 && rsi[i]! < 70) {
                        lastSignalType = 'SELL';
                        lastSignalIndex = i;
                    }
                }
                if (lastSignalIndex !== -1 && (dataToAnalyze.length - 1 - lastSignalIndex) < 5) {
                    strategySignal = lastSignalType;
                    signalCandle = dataToAnalyze[lastSignalIndex];
                }
                break;
            }
            case "peak-formation-fib": {
                dataWithSignals = await calculatePeakFormationFibSignals(dataToAnalyze);
                let lastSignalIndex = -1;
                let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
                for (let i = dataWithSignals.length - 1; i >= 0; i--) {
                    const candle = dataWithSignals[i];
                    if (candle.buySignal || candle.sellSignal) {
                        lastSignalIndex = i;
                        signalType = candle.buySignal ? 'BUY' : 'SELL';
                        break;
                    }
                }
                if (lastSignalIndex !== -1 && (dataWithSignals.length - 1 - lastSignalIndex) < 10) {
                    strategySignal = signalType;
                    signalCandle = dataWithSignals[lastSignalIndex];
                }
                break;
            }
        }

        if (strategySignal === 'HOLD' || !signalCandle) {
            return { status: 'no_signal', log: 'No recent signal.', signal: null };
        }

        const prediction = config.useAIPrediction ? await predictMarket({
            symbol: config.symbol,
            recentData: JSON.stringify(dataToAnalyze.slice(-50).map(d => ({ t: d.time, o: d.open, h: d.high, l: d.low, c: d.close, v: d.volume }))),
            strategySignal
        }) : {
            prediction: strategySignal === 'BUY' ? 'UP' : 'DOWN',
            confidence: 1,
            reasoning: `Signal from '${config.strategy}' without AI validation.`
        };
        const aiConfirms = (prediction.prediction === 'UP' && strategySignal === 'BUY') || (prediction.prediction === 'DOWN' && strategySignal === 'SELL');
        
        if (aiConfirms) {
            const latestCandle = signalCandle;
            const currentPrice = latestCandle.close;
            const stopLossPrice = latestCandle?.stopLossLevel ? latestCandle.stopLossLevel : prediction.prediction === 'UP' ? currentPrice * (1 - (config.stopLoss / 100)) : currentPrice * (1 + (config.stopLoss / 100));
            const takeProfitPrice = prediction.prediction === 'UP' ? currentPrice * (1 + (config.takeProfit / 100)) : currentPrice * (1 - (config.takeProfit / 100));
            
            const newSignal: TradeSignal = {
                action: prediction.prediction as 'UP' | 'DOWN', entryPrice: currentPrice,
                stopLoss: stopLossPrice, takeProfit: takeProfitPrice,
                confidence: prediction.confidence, reasoning: prediction.reasoning,
                timestamp: new Date(), strategy: config.strategy,
                peakPrice: latestCandle?.peakPrice
            };
            return { status: 'monitoring', log: 'Signal found.', signal: newSignal };
        } else {
            return { status: 'no_signal', log: `AI invalidated signal (${prediction.prediction}).`, signal: null };
        }
    } catch (e: any) {
        console.error(`Analysis failed for ${config.symbol}:`, e);
        return { status: 'error', log: e.message || 'Unknown error', signal: null };
    }
  }, []);

  // --- Manual Trader Logic ---
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

      setManualTraderState(prev => {
        const newData = [...prev.chartData];
        if (newData.length > 0) {
            const lastCandle = newData[newData.length - 1];
            if (lastCandle.time === newCandle.time) {
              newData[newData.length - 1] = newCandle;
            } else {
              newData.push(newCandle);
            }
        } else {
            newData.push(newCandle);
        }
        const sortedData = newData.sort((a, b) => a.time - b.time);
        const updatedChartData = sortedData.filter((candle, index, self) => index === 0 || candle.time > self[index - 1].time).slice(-1500);

        if (prev.signal && prev.signal.peakPrice) {
          let invalidated = false;
          let invalidationReason = '';
          if (prev.signal.action === 'DOWN' && newCandle.high > prev.signal.peakPrice) {
            invalidated = true;
            invalidationReason = `Price (${newCandle.high.toFixed(4)}) broke above the structural peak high of ${prev.signal.peakPrice.toFixed(4)}.`;
          } else if (prev.signal.action === 'UP' && newCandle.low < prev.signal.peakPrice) {
            invalidated = true;
            invalidationReason = `Price (${newCandle.low.toFixed(4)}) broke below the structural peak low of ${prev.signal.peakPrice.toFixed(4)}.`;
          }

          if (invalidated) {
             setTimeout(() => {
                toast({
                  title: "Trade Signal Invalidated",
                  description: "Market structure has changed. The trade idea is now void.",
                  variant: "destructive"
                });
             }, 0);
            addManualLog(`SIGNAL INVALIDATED: ${invalidationReason}`);
            manualWsRef.current?.close();
            return { ...prev, signal: null, chartData: updatedChartData };
          }
        }
        
        return { ...prev, chartData: updatedChartData };
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
    setManualTraderState(prev => ({ ...prev, isAnalyzing: false }));
  }, [addManualLog]);

  const resetManualSignal = useCallback(() => {
    if (manualWsRef.current) {
        manualWsRef.current.close(1000, "Signal reset by user");
        manualWsRef.current = null;
    }
    setManualTraderState(prev => ({
        ...prev,
        isAnalyzing: false,
        signal: null,
        logs: [`[${new Date().toLocaleTimeString()}] Signal monitoring has been reset.`, ...prev.logs].slice(0, 100)
    }));
    toast({ title: "Signal Reset", description: "You can now run a new analysis." });
  }, [addManualLog, toast]);

  const runManualAnalysis = useCallback(async (config: ManualTraderConfig) => {
    manualAnalysisCancelRef.current = false;
    setManualTraderState(prev => ({ ...prev, isAnalyzing: true, logs: [], signal: null }));
    addManualLog("Running analysis...");
    
    const result = await analyzeAsset(config);

    if (manualAnalysisCancelRef.current) {
        addManualLog("Analysis canceled, results discarded.");
        setManualTraderState(prev => ({ ...prev, isAnalyzing: false }));
        return;
    }
    
    if (result.signal) {
        setManualTraderState(prev => ({ ...prev, signal: result.signal, isAnalyzing: false }));
        addManualLog(`NEW SIGNAL: ${result.signal.action} at $${result.signal.entryPrice.toFixed(4)}. SL: $${result.signal.stopLoss.toFixed(4)}, TP: $${result.signal.takeProfit.toFixed(4)}`);
        toast({ title: "Trade Signal Generated!", description: "Monitoring for invalidation." });
        connectManualWebSocket(config.symbol, config.interval);
    } else {
        addManualLog(result.log);
        if(result.status === 'error') {
            toast({ title: "Analysis Failed", description: result.log, variant: "destructive" });
        } else {
            toast({ title: "No Signal Found", description: result.log });
        }
        setManualTraderState(prev => ({ ...prev, isAnalyzing: false }));
    }

  }, [addManualLog, toast, connectManualWebSocket, analyzeAsset]);

  const setManualChartData = useCallback(async (symbol: string, interval: string) => {
    if (manualTraderState.isAnalyzing || manualTraderState.signal !== null) return;
    
    if (manualWsRef.current) {
        manualWsRef.current.close(1000, "New data fetch requested");
    }
    setManualTraderState(prev => ({...prev, logs: [], chartData: []}));
    
    addManualLog(`Fetching chart data for ${symbol} (${interval})...`);
    try {
        const from = addDays(new Date(), -3).getTime();
        const to = new Date().getTime();
        const klines = await getHistoricalKlines(symbol, interval, from, to);
        setManualTraderState(prev => ({ ...prev, chartData: klines, logs: [`[${new Date().toLocaleTimeString()}] Loaded ${klines.length} historical candles.`] }));
    } catch (error: any) {
        toast({ title: "Failed to load data", description: error.message, variant: "destructive" });
        addManualLog(`Error loading data: ${error.message}`);
    }
  }, [addManualLog, manualTraderState.isAnalyzing, manualTraderState.signal, toast]);

  // --- Multi-Signal Monitor Logic ---
  const runMultiSignalCheck = useCallback(async () => {
    const { isRunning, config } = multiSignalState;
    if (!isRunning || !config) return;

    addMultiLog("Running analysis cycle for all assets...");

    const analysisPromises = config.assets.map(asset => {
      setMultiSignalState(prev => ({
        ...prev,
        results: { ...prev.results, [asset]: { ...prev.results[asset], status: 'analyzing' } }
      }));
      return analyzeAsset({ ...config, symbol: asset });
    });

    const settledResults = await Promise.allSettled(analysisPromises);

    const newResults: Record<string, SignalResult> = {};
    settledResults.forEach((result, index) => {
      const asset = config.assets[index];
      if (result.status === 'fulfilled') {
        newResults[asset] = result.value;
      } else {
        console.error(`Unhandled promise rejection for ${asset}:`, result.reason);
        newResults[asset] = { status: 'error', log: 'An unexpected error occurred.', signal: null };
      }
    });
    
    setMultiSignalState(prev => ({ ...prev, results: { ...prev.results, ...newResults } }));
    addMultiLog("Analysis cycle complete.");

  }, [multiSignalState, analyzeAsset, addMultiLog]);


  const startMultiSignalMonitor = useCallback((config: MultiSignalConfig) => {
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
    if (multiSignalIntervalRef.current) {
        clearInterval(multiSignalIntervalRef.current);
        multiSignalIntervalRef.current = null;
    }
    setMultiSignalState({ isRunning: false, config: null, results: {}, logs: [] });
    addMultiLog("Multi-signal monitor stopped by user.");
    toast({ title: "Multi-Signal Monitor Stopped" });
  }, [addMultiLog, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (liveBotIntervalRef.current) clearInterval(liveBotIntervalRef.current);
      if (manualWsRef.current) manualWsRef.current.close();
      if (multiSignalIntervalRef.current) clearInterval(multiSignalIntervalRef.current);
    }
  }, []);

  return (
    <BotContext.Provider value={{ 
      liveBotState, 
      manualTraderState,
      multiSignalState,
      isTradingActive,
      startLiveBot,
      stopLiveBot,
      runManualAnalysis,
      cancelManualAnalysis,
      resetManualSignal,
      setManualChartData,
      startMultiSignalMonitor,
      stopMultiSignalMonitor,
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
