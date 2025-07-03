
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { HistoricalData, TradeSignal, LiveBotConfig, ManualTraderConfig } from '@/lib/types';
import { predictMarket, type PredictMarketOutput } from "@/ai/flows/predict-market-flow";
import { getHistoricalKlines } from '@/lib/binance-service';
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
  startLiveBot: (config: LiveBotConfig) => void;
  stopLiveBot: () => void;
  runManualAnalysis: (config: ManualTraderConfig) => void;
  cancelManualAnalysis: () => void;
  resetManualSignal: () => void;
  setManualChartData: (symbol: string, interval: string, force: boolean) => void;
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

  // --- Helper Functions ---
  const addLiveLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLiveBotState(prev => ({ ...prev, logs: [`[${timestamp}] ${message}`, ...prev.logs].slice(0, 100) }));
  }, []);

  const addManualLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setManualTraderState(prev => ({ ...prev, logs: [`[${timestamp}] ${message}`, ...prev.logs].slice(0, 100) }));
  }, []);
  
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
  
  // --- Manual Trader Logic ---
  const cancelManualAnalysis = () => {
    manualAnalysisCancelRef.current = true;
    addManualLog("Analysis canceled by user.");
    setManualTraderState(prev => ({ ...prev, isAnalyzing: false }));
  };

  const resetManualSignal = () => {
    if (manualWsRef.current) {
        manualWsRef.current.close(1000, "Signal reset by user"); // Close with normal code
        manualWsRef.current = null;
    }
    setManualTraderState(prev => ({
        ...prev,
        isAnalyzing: false,
        signal: null,
        logs: [`[${new Date().toLocaleTimeString()}] Signal monitoring has been reset.`, ...prev.logs].slice(0, 100)
    }));
    toast({ title: "Signal Reset", description: "You can now run a new analysis." });
  };

  const runManualAnalysis = async (config: ManualTraderConfig) => {
    manualAnalysisCancelRef.current = false;
    setManualTraderState(prev => ({ ...prev, isAnalyzing: true, logs: [], signal: null }));
    addManualLog("Running analysis...");

    let dataToAnalyze = manualTraderState.chartData;
    if (dataToAnalyze.length === 0) {
        addManualLog("Fetching initial data for analysis...");
        try {
            const from = addDays(new Date(), -1).getTime();
            const to = new Date().getTime();
            dataToAnalyze = await getHistoricalKlines(config.symbol, config.interval, from, to);
            setManualTraderState(prev => ({ ...prev, chartData: dataToAnalyze }));
        } catch (error: any) {
             addManualLog(`Error fetching data: ${error.message}`);
             setManualTraderState(prev => ({ ...prev, isAnalyzing: false }));
             return;
        }
    }

    if (dataToAnalyze.length < 50) {
      addManualLog("Not enough data to analyze.");
      setManualTraderState(prev => ({ ...prev, isAnalyzing: false }));
      return;
    }

    addManualLog(`Searching for a new setup with '${config.strategy}'...`);
    let strategySignal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let dataWithSignals = [...dataToAnalyze];
    let signalCandle: HistoricalData | null = null;
    
    if (config.strategy === "peak-formation-fib") {
        dataWithSignals = await calculatePeakFormationFibSignals(dataToAnalyze);
        const lastCandleWithSignal = dataWithSignals[dataWithSignals.length - 1];
        if(lastCandleWithSignal.buySignal) {
            strategySignal = 'BUY';
            signalCandle = lastCandleWithSignal;
        } else if (lastCandleWithSignal.sellSignal) {
            strategySignal = 'SELL';
            signalCandle = lastCandleWithSignal;
        }
    } else {
        addManualLog("Only 'Peak Formation Fib' is currently supported for manual analysis.");
        setManualTraderState(prev => ({ ...prev, isAnalyzing: false }));
        return;
    }


    if (strategySignal === 'HOLD') {
        addManualLog("No signal generated by the strategy.");
        setManualTraderState(prev => ({ ...prev, isAnalyzing: false }));
        return;
    }
    
    if (manualAnalysisCancelRef.current) {
        addManualLog("Analysis canceled before AI validation.");
        return;
    }
    addManualLog(`Strategy generated a ${strategySignal} signal. Validating with AI...`);
    try {
        const prediction = config.useAIPrediction ? await predictMarket({
            symbol: config.symbol,
            recentData: JSON.stringify(dataToAnalyze.slice(-50).map(d => ({t: d.time, o: d.open, h: d.high, l: d.low, c:d.close, v:d.volume}))),
            strategySignal
        }) : {
             prediction: strategySignal === 'BUY' ? 'UP' : 'DOWN',
             confidence: 1,
             reasoning: `Signal generated directly from the '${config.strategy}' strategy without AI validation.`
         };
      
        if (manualAnalysisCancelRef.current) {
            addManualLog("Analysis canceled, results discarded.");
            return;
        }

        const aiConfirms = (prediction.prediction === 'UP' && strategySignal === 'BUY') || (prediction.prediction === 'DOWN' && strategySignal === 'SELL');
        
        if (aiConfirms) {
            const latestCandle = dataToAnalyze[dataToAnalyze.length - 1];
            const currentPrice = latestCandle.close;
            const stopLossPrice = signalCandle?.stopLossLevel 
                ? signalCandle.stopLossLevel
                : prediction.prediction === 'UP' 
                    ? currentPrice * (1 - (config.stopLoss / 100)) 
                    : currentPrice * (1 + (config.stopLoss / 100));

            const takeProfitPrice = prediction.prediction === 'UP' ? currentPrice * (1 + (config.takeProfit / 100)) : currentPrice * (1 - (config.takeProfit / 100));

            const newSignal: TradeSignal = {
                action: prediction.prediction === 'UP' ? 'UP' : 'DOWN', entryPrice: currentPrice,
                stopLoss: stopLossPrice, takeProfit: takeProfitPrice,
                confidence: prediction.confidence, reasoning: prediction.reasoning,
                timestamp: new Date(), strategy: config.strategy,
                peakPrice: signalCandle?.peakPrice
            };
            setManualTraderState(prev => ({ ...prev, signal: newSignal, isAnalyzing: false }));
            addManualLog(`NEW SIGNAL: ${newSignal.action} at $${newSignal.entryPrice.toFixed(4)}. SL: $${newSignal.stopLoss.toFixed(4)}, TP: $${newSignal.takeProfit.toFixed(4)}`);
            toast({ title: "Trade Signal Generated!", description: "Monitoring for invalidation." });
            // Start monitoring
            connectManualWebSocket(config.symbol, config.interval);
        } else {
            addManualLog(`AI invalidated signal. Strategy said ${strategySignal}, AI said ${prediction.prediction}. No trade.`);
            toast({ title: "Signal Invalidated by AI", description: `The AI suggested ${prediction.prediction} against the strategy's ${strategySignal} signal.`, variant: "destructive" });
            setManualTraderState(prev => ({ ...prev, isAnalyzing: false }));
        }
    } catch (error) {
       if (manualAnalysisCancelRef.current) {
            addManualLog("Analysis canceled, error discarded.");
            return;
        }
       console.error("Analysis failed", error);
       addManualLog(`Error: AI analysis failed.`);
       toast({ title: "AI Analysis Failed", variant: "destructive" });
       setManualTraderState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const connectManualWebSocket = (symbol: string, interval: string) => {
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
        // Invalidation Logic
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
            toast({
              title: "Trade Signal Invalidated",
              description: "Market structure has changed. The trade idea is now void.",
              variant: "destructive"
            });
            addManualLog(`SIGNAL INVALIDATED: ${invalidationReason}`);
            manualWsRef.current?.close(); // Stop monitoring
            return { ...prev, signal: null };
          }
        }
        
        // Update chart data
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
        const uniqueData = sortedData.filter((candle, index, self) => index === 0 || candle.time > self[index - 1].time);
        return { ...prev, chartData: uniqueData.slice(-1500) };
      });
    };
    
    ws.onclose = (event) => {
        const reason = event.reason || 'No reason given';
        const code = event.wasClean ? `(Code: ${event.code})` : `(Code: ${event.code}, unclean closure)`;
        addManualLog(`Monitoring WebSocket closed. ${reason} ${code}`);
        manualWsRef.current = null;
    }

    ws.onerror = (event) => {
        console.error("A WebSocket error occurred:", event);
        addManualLog("WebSocket error occurred. See browser console for details.");
    };
  };

  const setManualChartData = useCallback(async (symbol: string, interval: string, force: boolean) => {
    if (manualTraderState.signal !== null && !force) return;

    if (force) {
        if (manualTraderState.signal !== null) {
            setManualTraderState(prev => ({...prev, signal: null}));
        }
        if (manualWsRef.current) {
            manualWsRef.current.close(1000, "New data fetch requested");
        }
        setManualTraderState(prev => ({...prev, logs: []}));
    }
    
    addManualLog(`Fetching chart data for ${symbol} (${interval})...`);
    try {
        const from = addDays(new Date(), -1).getTime();
        const to = new Date().getTime();
        const klines = await getHistoricalKlines(symbol, interval, from, to);
        setManualTraderState(prev => ({ ...prev, chartData: klines, logs: [`[${new Date().toLocaleTimeString()}] Loaded ${klines.length} historical candles.`] }));
        connectManualWebSocket(symbol, interval);
    } catch (error: any) {
        toast({ title: "Failed to load data", description: error.message, variant: "destructive" });
        addManualLog(`Error loading data: ${error.message}`);
    }
  }, [addManualLog, manualTraderState.signal, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (liveBotIntervalRef.current) clearInterval(liveBotIntervalRef.current);
      if (manualWsRef.current) manualWsRef.current.close();
    }
  }, []);

  return (
    <BotContext.Provider value={{ 
      liveBotState, 
      manualTraderState,
      startLiveBot,
      stopLiveBot,
      runManualAnalysis,
      cancelManualAnalysis,
      resetManualSignal,
      setManualChartData,
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
