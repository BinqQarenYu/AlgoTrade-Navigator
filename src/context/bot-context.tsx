
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { HistoricalData, TradeSignal, LiveBotConfig, ManualTraderConfig, MultiSignalConfig, MultiSignalState, SignalResult } from '@/lib/types';
import { predictMarket, type PredictMarketOutput } from "@/ai/flows/predict-market-flow";
import { getHistoricalKlines, getLatestKlinesByLimit } from "@/lib/binance-service";
import { addDays } from 'date-fns';
import { getStrategyById } from '@/lib/strategies';

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
  const manualReevalIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const manualConfigRef = useRef<ManualTraderConfig | null>(null);

  // --- Multi-Signal State ---
  const [multiSignalState, setMultiSignalState] = useState<MultiSignalState>({
    isRunning: false, config: null, results: {}, logs: []
  });
  const multiSignalIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const multiSignalRunningRef = useRef(false);
  const multiSignalConfigRef = useRef<MultiSignalConfig | null>(null);

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
  
  // --- Reusable Analysis Logic ---
  const analyzeAsset = useCallback(async (
    config: { symbol: string; interval: string; strategy: string; takeProfit: number; stopLoss: number; useAIPrediction: boolean },
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

        const dataWithSignals = await strategy.calculate(dataToAnalyze);
        const latestCandleWithSignal = [...dataWithSignals].reverse().find(d => d.buySignal || d.sellSignal);

        if (!latestCandleWithSignal) {
             return { status: 'no_signal', log: 'No actionable trade setup found. Waiting for market conditions to align with strategy rules.', signal: null };
        }
        
        const signalAge = (dataWithSignals.length - 1) - dataWithSignals.indexOf(latestCandleWithSignal);
        if (signalAge > 5) { // Only consider signals in the last 5 candles
            return { status: 'no_signal', log: 'A valid signal was found in the past, but the entry window has closed. The signal is now considered stale.', signal: null };
        }
        
        const strategySignal: 'BUY' | 'SELL' = latestCandleWithSignal.buySignal ? 'BUY' : 'SELL';

        const prediction = config.useAIPrediction ? await predictMarket({
            symbol: config.symbol,
            recentData: JSON.stringify(dataWithSignals.slice(-50).map(d => ({ t: d.time, o: d.open, h: d.high, l: d.low, c: d.close, v: d.volume }))),
            strategySignal
        }) : {
            prediction: strategySignal === 'BUY' ? 'UP' : 'DOWN',
            confidence: 1,
            reasoning: `Signal from '${config.strategy}' without AI validation.`
        };
        const aiConfirms = (prediction.prediction === 'UP' && strategySignal === 'BUY') || (prediction.prediction === 'DOWN' && strategySignal === 'SELL');
        
        if (aiConfirms) {
            const currentPrice = latestCandleWithSignal.close;
            const stopLossPrice = latestCandleWithSignal?.stopLossLevel ? latestCandleWithSignal.stopLossLevel : prediction.prediction === 'UP' ? currentPrice * (1 - (config.stopLoss / 100)) : currentPrice * (1 + (config.stopLoss / 100));
            const takeProfitPrice = prediction.prediction === 'UP' ? currentPrice * (1 + (config.takeProfit / 100)) : currentPrice * (1 - (config.takeProfit / 100));
            
            const newSignal: TradeSignal = {
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
  }, []);

  // --- Live Bot Logic ---
  const runLiveBotPrediction = useCallback(async () => {
    if (!liveBotState.isRunning || !liveBotState.config) return;

    setLiveBotState(prev => ({ ...prev, isPredicting: true, prediction: null }));
    
    const result = await analyzeAsset(liveBotState.config);
    
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

  }, [liveBotState, addLiveLog, analyzeAsset]);

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
        logs: [`[${new Date().toLocaleTimeString()}] Signal monitoring has been reset.`, ...prev.logs].slice(0, 100)
    }));
    toast({ title: "Signal Reset", description: "You can now run a new analysis." });
  }, [toast]);

  const setManualChartData = useCallback(async (symbol: string, interval: string) => {
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

      setManualTraderState(prev => {
        const newData = [...prev.chartData];
        let newChartData = prev.chartData;

        if (newData.length > 0) {
            const lastCandle = newData[newData.length - 1];
            if (lastCandle.time === newCandle.time) {
              newData[newData.length - 1] = newCandle;
            } else {
              newData.push(newCandle);
            }
             const sortedData = newData.sort((a, b) => a.time - b.time);
            newChartData = sortedData.filter((candle, index, self) => index === 0 || candle.time > self[index - 1].time).slice(-1500);
        } else {
            newData.push(newCandle);
            newChartData = newData;
        }

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
                  variant: "default"
                });
             }, 0);
            
            const timestamp = new Date().toLocaleTimeString();
            const newLog = `[${timestamp}] SIGNAL INVALIDATED: ${invalidationReason}`;
            const newLogs = [newLog, ...(prev.logs || [])].slice(0, 100);

            manualWsRef.current?.close();
            return { ...prev, signal: null, chartData: newChartData, logs: newLogs };
          }
        }
        
        return { ...prev, chartData: newChartData };
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

  const runManualAnalysis = useCallback(async (config: ManualTraderConfig) => {
    manualAnalysisCancelRef.current = false;
    manualConfigRef.current = config;
    setManualTraderState(prev => ({ ...prev, isAnalyzing: true, logs: [], signal: null }));
    addManualLog("Running analysis...");
    
    await setManualChartData(config.symbol, config.interval);

    setManualTraderState(async (currentState) => {
        const result = await analyzeAsset({ ...config }, currentState.chartData);

        if (manualAnalysisCancelRef.current) {
            addManualLog("Analysis canceled, results discarded.");
            return { ...currentState, isAnalyzing: false };
        }
        
        if (result.signal) {
            addManualLog(`NEW SIGNAL: ${result.signal.action} at $${result.signal.entryPrice.toFixed(4)}. SL: $${result.signal.stopLoss.toFixed(4)}, TP: $${result.signal.takeProfit.toFixed(4)}`);
            toast({ title: "Trade Signal Generated!", description: "Monitoring for invalidation and re-evaluation." });
            connectManualWebSocket(config.symbol, config.interval);

            // --- Re-evaluation Logic ---
            if (manualReevalIntervalRef.current) clearInterval(manualReevalIntervalRef.current);
            const reevalTime = intervalToMs(config.interval);
            addManualLog(`Signal found. Re-evaluating every ${config.interval}.`);
            
            manualReevalIntervalRef.current = setInterval(() => {
                const currentConfig = manualConfigRef.current;
                if (!currentConfig) return;

                addManualLog("Re-evaluating signal...");

                setManualTraderState(current => {
                    analyzeAsset({ ...currentConfig }, current.chartData).then(reevalResult => {
                        if (!manualReevalIntervalRef.current) return;
                        
                        if (reevalResult.signal) {
                            setManualTraderState(prev => ({ ...prev, signal: reevalResult.signal }));
                            addManualLog(`Signal updated. New entry: $${reevalResult.signal.entryPrice.toFixed(4)}`);
                        } else {
                            addManualLog(`Signal no longer valid. Reason: ${reevalResult.log}.`);
                            toast({ title: "Signal Invalidated", description: `Setup no longer valid: ${reevalResult.log}` });
                            resetManualSignal();
                        }
                    });
                    return current;
                });
            }, reevalTime);

            return { ...currentState, signal: result.signal, isAnalyzing: false };
        } else {
            addManualLog(result.log);
            if(result.status === 'error') {
                 setTimeout(() => toast({ title: "Analysis Failed", description: result.log, variant: "destructive" }), 0);
            } else {
                setTimeout(() => toast({ title: "No Signal Found", description: result.log }), 0);
            }
            return { ...currentState, isAnalyzing: false };
        }
    });

  }, [addManualLog, toast, connectManualWebSocket, analyzeAsset, setManualChartData, resetManualSignal]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
