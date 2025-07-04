
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { HistoricalData, TradeSignal, LiveBotConfig, ManualTraderConfig, MultiSignalConfig, MultiSignalState, SignalResult, ScreenerConfig, ScreenerState, RankedTradeSignal, FearAndGreedIndex } from '@/lib/types';
import { predictMarket, type PredictMarketOutput } from "@/ai/flows/predict-market-flow";
import { rankSignals } from "@/ai/flows/rank-signals-flow";
import { getHistoricalKlines, getLatestKlinesByLimit } from "@/lib/binance-service";
import { getFearAndGreedIndex } from "@/lib/fear-greed-service";
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
  screenerState: ScreenerState;
  isTradingActive: boolean;
  startLiveBot: (config: LiveBotConfig) => void;
  stopLiveBot: () => void;
  runManualAnalysis: (config: ManualTraderConfig) => void;
  cancelManualAnalysis: () => void;
  resetManualSignal: () => void;
  setManualChartData: (symbol: string, interval: string) => void;
  startMultiSignalMonitor: (config: MultiSignalConfig) => void;
  stopMultiSignalMonitor: () => void;
  startScreener: (config: ScreenerConfig) => void;
  stopScreener: () => void;
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


/**
 * Ranks signals using a code-based scoring model instead of AI.
 * @param signals - The array of signals to rank.
 * @param fngIndex - The current Fear & Greed Index data.
 * @returns A sorted array of ranked signals.
 */
const rankSignalsWithCode = (signals: TradeSignal[], fngIndex: FearAndGreedIndex | null): RankedTradeSignal[] => {
    if (signals.length === 0) return [];

    const scoredSignals = signals.map(signal => {
        let score = 50; // Base score for any valid signal
        let justification = ['Base score for valid signal.'];

        // Confluence scoring
        const confluenceCount = signals.filter(s => 
            s.asset === signal.asset && 
            s.action === signal.action &&
            s.strategy !== signal.strategy
        ).length;

        if (confluenceCount > 0) {
            score += confluenceCount * 25;
            justification.push(`Confluence with ${confluenceCount} other strategy/strategies.`);
        }

        // Fear & Greed Index scoring
        if (fngIndex) {
            if (signal.action === 'UP' && fngIndex.value <= 25) {
                score += 15;
                justification.push('Contrarian signal in Extreme Fear market.');
            } else if (signal.action === 'DOWN' && fngIndex.value >= 75) {
                score += 15;
                justification.push('Contrarian signal in Extreme Greed market.');
            } else if (signal.action === 'UP' && fngIndex.value >= 75) {
                score -= 10;
                justification.push('Risky signal in Extreme Greed market.');
            } else if (signal.action === 'DOWN' && fngIndex.value <= 25) {
                score -= 10;
                justification.push('Risky signal in Extreme Fear market.');
            }
        }
        
        return {
            ...signal,
            score,
            justification: justification.join(' '),
        }
    });

    // Sort by score descending
    scoredSignals.sort((a, b) => b.score - a.score);

    // Assign rank
    return scoredSignals.map((s, index) => ({
        ...s,
        rank: index + 1,
    }));
};


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

  // --- Screener State ---
  const [screenerState, setScreenerState] = useState<ScreenerState>({
    isRunning: false, config: null, results: [], logs: []
  });
  const screenerRunningRef = useRef(false);

  // --- Global Trading State ---
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
  }, []);

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

  // --- AI Screener Logic ---
  const startScreener = useCallback(async (config: ScreenerConfig) => {
    screenerRunningRef.current = true;
    setScreenerState({ isRunning: true, config, results: [], logs: [] });
    addScreenerLog(`Starting screener for ${config.assets.length} assets and ${config.strategies.length} strategies.`);
    toast({ title: "AI Screener Started", description: "Scanning markets... This may take a while." });
    
    const foundSignals: TradeSignal[] = [];

    const tasks = config.assets.flatMap(asset => 
        config.strategies.map(strategy => ({ asset, strategy }))
    );

    for (const task of tasks) {
        if (!screenerRunningRef.current) break;
        
        addScreenerLog(`Analyzing ${task.asset} with ${task.strategy}...`);
        
        const result = await analyzeAsset({
            symbol: task.asset,
            interval: config.interval,
            strategy: task.strategy,
            takeProfit: 2,
            stopLoss: 1,
            useAIPrediction: config.useAiRanking,
            fee: 0.04
        });

        if (result.signal) {
            foundSignals.push(result.signal);
            addScreenerLog(`Signal found for ${task.asset} via ${task.strategy}.`);
        }
    }

    if (!screenerRunningRef.current) {
        addScreenerLog("Screener stopped by user.");
        setScreenerState(prev => ({...prev, isRunning: false, logs: prev.logs || [] }));
        return;
    }

    addScreenerLog(`Screening complete. Found ${foundSignals.length} potential signals.`);
    
    if (foundSignals.length > 0) {
        const fng = await getFearAndGreedIndex();
        
        if (config.useAiRanking) {
            const marketContext = fng ? `The current Fear & Greed Index is ${fng.value} (${fng.valueClassification}).` : "Market context is neutral.";
            addScreenerLog(`Ranking ${foundSignals.length} signals with AI Head Trader...`);
            try {
                const rankedResult = await rankSignals({
                    signals: foundSignals,
                    marketContext
                });
                
                const rankedSignals = rankedResult.rankedSignals.sort((a,b) => a.rank - b.rank);
                
                setScreenerState(prev => ({...prev, results: rankedSignals as RankedTradeSignal[]}));
                addScreenerLog(`AI ranking complete. Displaying top signals.`);
                toast({ title: "Screener Finished", description: `Found and ranked ${rankedSignals.length} high-potential signals.` });
            } catch (e: any) {
                addScreenerLog(`AI ranking failed: ${e.message}`);
                toast({ title: "AI Ranking Failed", description: "Displaying unranked signals.", variant: "destructive" });
                const unrankedSignals = foundSignals.map(s => ({...s, rank: 99, justification: "AI ranking failed."}));
                setScreenerState(prev => ({...prev, results: unrankedSignals }));
            }
        } else {
            // Use code-based ranking
            addScreenerLog(`Ranking ${foundSignals.length} signals with code-based logic...`);
            const rankedSignals = rankSignalsWithCode(foundSignals, fng);
            setScreenerState(prev => ({...prev, results: rankedSignals }));
            addScreenerLog(`Code-based ranking complete.`);
            toast({ title: "Screener Finished", description: `Found and ranked ${rankedSignals.length} signals.` });
        }
    } else {
        addScreenerLog('No actionable signals found across all assets and strategies.');
        toast({ title: "Screener Finished", description: "No actionable signals were found." });
    }

    setScreenerState(prev => ({...prev, isRunning: false, logs: prev.logs || [] }));
    screenerRunningRef.current = false;
  }, [addScreenerLog, analyzeAsset, toast]);

  const stopScreener = useCallback(() => {
    addScreenerLog("Stopping screener...");
    screenerRunningRef.current = false;
  }, [addScreenerLog]);


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
      isTradingActive,
      startLiveBot,
      stopLiveBot,
      runManualAnalysis,
      cancelManualAnalysis,
      resetManualSignal,
      setManualChartData,
      startMultiSignalMonitor,
      stopMultiSignalMonitor,
      startScreener,
      stopScreener,
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
 
