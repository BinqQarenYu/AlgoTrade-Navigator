'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { HistoricalData, TradeSignal, RankedTradeSignal, Position, LiveBotStateForAsset, LiveBotConfig, SimulationState, SimulationConfig, SimulatedPosition } from '@/lib/types';
import { predictMarket, type PredictMarketOutput } from "@/ai/flows/predict-market-flow";
import { getLatestKlinesByLimit, placeOrder } from "@/lib/binance-service";
import { getStrategyById } from "@/lib/strategies";
import { useApi } from './api-context';
import { RiskGuardian } from '@/lib/risk-guardian';
import { usePersistentState } from '@/hooks/use-persistent-state';
import Decimal from 'decimal.js';

import { defaultAwesomeOscillatorParams } from "@/lib/strategies/awesome-oscillator";
import { defaultBollingerBandsParams } from "@/lib/strategies/bollinger-bands";
import { defaultCciReversionParams } from "@/lib/strategies/cci-reversion";
import { defaultChaikinMoneyFlowParams } from "@/lib/strategies/chaikin-money-flow";
import { defaultCoppockCurveParams } from "@/lib/strategies/coppock-curve";
import { defaultDonchianChannelsParams } from "@/lib/strategies/donchian-channels";
import { defaultElderRayIndexParams } from "@/lib/strategies/elder-ray-index";
import { defaultEmaCrossoverParams } from "@/lib/strategies/ema-crossover";
import { defaultHyperPFFParams } from "@/lib/strategies/hyper-peak-formation";
import { defaultIchimokuCloudParams } from "@/lib/strategies/ichimoku-cloud";
import { defaultKeltnerChannelsParams } from "@/lib/strategies/keltner-channels";
import { defaultMacdCrossoverParams } from "@/lib/strategies/macd-crossover";
import { defaultMomentumCrossParams } from "@/lib/strategies/momentum-cross";
import { defaultObvDivergenceParams } from "@/lib/strategies/obv-divergence";
import { defaultParabolicSarFlipParams } from "@/lib/strategies/parabolic-sar-flip";
import { defaultPffParams } from "@/lib/strategies/peak-formation-fib";
import { defaultPivotPointReversalParams } from "@/lib/strategies/pivot-point-reversal";
import { defaultRsiDivergenceParams } from "@/lib/strategies/rsi-divergence";
import { defaultSmaCrossoverParams } from "@/lib/strategies/sma-crossover";
import { defaultStochasticCrossoverParams } from "@/lib/strategies/stochastic-crossover";
import { defaultSupertrendParams } from "@/lib/strategies/supertrend";
import { defaultVolumeDeltaParams } from "@/lib/strategies/volume-delta";
import { defaultVwapCrossParams } from "@/lib/strategies/vwap-cross";
import { defaultWilliamsRParams } from "@/lib/strategies/williams-percent-r";
import { defaultLiquidityOrderFlowParams } from "@/lib/strategies/liquidity-order-flow";
import { defaultLiquidityGrabParams } from '@/lib/strategies/liquidity-grab';
import { defaultEmaCciMacdParams } from '@/lib/strategies/ema-cci-macd';
import { defaultCodeBasedConsensusParams } from '@/lib/strategies/code-based-consensus';
import { defaultMtfEngulfingParams } from '@/lib/strategies/mtf-engulfing';
import { defaultSmiMfiSupertrendParams } from '@/lib/strategies/smi-mfi-supertrend';
import { defaultAIHybridParams } from '@/lib/strategies/ai-hybrid';

type BotInstance = LiveBotConfig & {
    id: string;
};

interface BotContextType {
  liveBotState: { bots: Record<string, LiveBotStateForAsset> };
  strategyParams: Record<string, any>;
  setStrategyParams: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  isTradingActive: boolean;
  startBotInstance: (config: LiveBotConfig & { id: string, isManual?: boolean }) => void;
  stopBotInstance: (botId: string) => void;
  closePosition: (position: Position) => void;
  showRecommendation: boolean;
  strategyRecommendation: RankedTradeSignal | null;
  activateRecommendedStrategy: (strategyId: string) => void;
  dismissRecommendation: () => void;
  executeTestTrade: (symbol: string, side: 'BUY' | 'SELL', capital: number, leverage: number) => void;
  closeTestPosition: (symbol: string, capital: number, leverage: number) => void;
  botInstances: BotInstance[];
  setBotInstances: React.Dispatch<React.SetStateAction<BotInstance[]>>;
  addBotInstance: (config: Partial<LiveBotConfig>) => void;
  // Simulation properties
  simulationState: SimulationState;
  startSimulation: (config: SimulationConfig) => void;
  stopSimulation: () => void;
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
    'rsi-divergence': defaultRsiDivergenceParams,
    'sma-crossover': defaultSmaCrossoverParams,
    'stochastic-crossover': defaultStochasticCrossoverParams,
    'supertrend': defaultSupertrendParams,
    'volume-delta': defaultVolumeDeltaParams,
    'vwap-cross': defaultVwapCrossParams,
    'williams-r': defaultWilliamsRParams,
    'liquidity-order-flow': defaultLiquidityOrderFlowParams,
    'liquidity-grab': defaultLiquidityGrabParams,
    'ema-cci-macd': defaultEmaCciMacdParams,
    'code-based-consensus': defaultCodeBasedConsensusParams,
    'mtf-engulfing': defaultMtfEngulfingParams,
    'smi-mfi-supertrend': defaultSmiMfiSupertrendParams,
    'ai-hybrid': defaultAIHybridParams,
};

export const BotProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { activeProfile, canUseAi, consumeAiCredit } = useApi();
  
  const [liveBotState, setLiveBotState] = useState<{ bots: Record<string, LiveBotStateForAsset> }>({ bots: {} });
  const liveWsRefs = useRef<Record<string, WebSocket | null>>({});
  const riskGuardianRefs = useRef<Record<string, RiskGuardian | null>>({});
  const dataBufferRef = useRef<Record<string, HistoricalData[]>>({});
  const analysisIntervals = useRef<Record<string, NodeJS.Timeout>>({});

  const [showRecommendation, setShowRecommendation] = useState(false);
  const [strategyRecommendation, setStrategyRecommendation] = useState<RankedTradeSignal | null>(null);

  const dismissRecommendation = () => { setShowRecommendation(false); setStrategyRecommendation(null); };
  const activateRecommendedStrategy = (strategyId: string) => { console.log(`Activating recommended strategy: ${strategyId}`); dismissRecommendation(); };
  
  const [strategyParams, setStrategyParams] = useState<Record<string, any>>(DEFAULT_STRATEGY_PARAMS);
  const [isTradingActive, setIsTradingActive] = useState(false);
  const [botInstances, setBotInstances] = usePersistentState<BotInstance[]>('live-bot-instances', []);
  
  // Simulation state
  const [simulationState, setSimulationState] = useState<SimulationState>({
    isRunning: false,
    logs: [],
    portfolio: {
      totalValue: 100,
      availableBalance: 100,
      unrealizedPnl: 0,
      totalPnl: 0,
    },
    openPositions: [],
    tradeHistory: [],
    summary: {
      totalTrades: 0,
      winRate: 0,
      totalPnl: 0,
      maxDrawdown: 0,
    },
    chartData: null,
  });
  
  const addBotInstance = useCallback((config: Partial<LiveBotConfig>) => {
    const newId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newBot: BotInstance = {
      id: newId,
      asset: config.asset || 'BTCUSDT',
      interval: config.interval || '1h',
      capital: config.capital || 100,
      leverage: config.leverage || 10,
      takeProfit: config.takeProfit || 1.5,
      stopLoss: config.stopLoss || 1,
      strategy: config.strategy || 'ema-crossover',
      strategyParams: config.strategyParams || defaultEmaCrossoverParams,
      isManual: config.isManual || false,
    };
    setBotInstances(prev => [...prev, newBot]);
  }, [setBotInstances]);

  useEffect(() => {
    const liveBotRunning = Object.values(liveBotState.bots).some(bot => !bot.config.isManual && bot.status !== 'idle' && bot.status !== 'error');
    setIsTradingActive(liveBotRunning);
  }, [liveBotState.bots]);

  const addLog = useCallback((setter: React.Dispatch<React.SetStateAction<any>>, message: string, botId?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    if (botId) {
        setter((prev: any) => ({
            ...prev, bots: { ...prev.bots, [botId]: { ...prev.bots[botId], logs: [`[${timestamp}] ${message}`, ...(prev.bots[botId]?.logs || [])].slice(0, 100) } }
        }));
    }
  }, []);

  const addLiveLog = useCallback((botId: string, message: string) => addLog(setLiveBotState, message, botId), [addLog]);
  
  const analyzeAsset = useCallback(async (
    config: { symbol: string; interval: string; strategy: string; strategyParams: any; takeProfit: number; stopLoss: number; useAIPrediction: boolean; reverse: boolean; },
    existingData?: HistoricalData[]
  ) => {
    try {
        const dataToAnalyze = existingData && existingData.length > 50 ? existingData : await getLatestKlinesByLimit(config.symbol, config.interval, 1000);
        if (dataToAnalyze.length < 50) return { status: 'error', log: 'Not enough data.', signal: null };

        const strategy = getStrategyById(config.strategy);
        if (!strategy) return { status: 'error', log: `Strategy '${config.strategy}' not found.`, signal: null };

        const dataWithIndicators = await strategy.calculate(JSON.parse(JSON.stringify(dataToAnalyze)), config.strategyParams, config.symbol);
        const lastCandle = dataWithIndicators[dataWithIndicators.length - 1];

        if (!lastCandle || (!lastCandle.buySignal && !lastCandle.sellSignal)) {
             return { status: 'no_signal', log: 'No actionable trade setup found.', signal: null };
        }
        
        let strategySignal: 'BUY' | 'SELL' | null = lastCandle.buySignal ? 'BUY' : 'SELL';
        if (config.reverse) strategySignal = strategySignal === 'BUY' ? 'SELL' : 'BUY';
        
        const aiData = config.useAIPrediction ? ( canUseAi() ? await predictMarket({ symbol: config.symbol, recentData: JSON.stringify(dataWithIndicators.slice(-50).map(d => ({ t: d.time, o: d.open, h: d.high, l: d.low, c: d.close, v: d.volume }))), strategySignal: strategySignal }) : null ) : { aggressive: { prediction: strategySignal === 'BUY' ? 'UP' : 'DOWN', confidence: 1, reasoning: `Signal from '${config.strategy}' (${config.reverse ? 'Reversed' : 'Standard'}).`, recommendation: 'Standard' } };

        if (!aiData) return { status: 'no_signal', log: 'AI quota reached, cannot validate signal.', signal: null };
        
        const prediction = aiData.aggressive;
        
        const aiConfirms = (prediction.prediction === 'UP' && strategySignal === 'BUY') || (prediction.prediction === 'DOWN' && strategySignal === 'SELL');
        
        if (aiConfirms) {
            if (config.useAIPrediction) consumeAiCredit();
            const currentPrice = lastCandle.close;
            const stopLossPrice = lastCandle?.stopLossLevel ? lastCandle.stopLossLevel : prediction.prediction === 'UP' ? currentPrice * (1 - (config.stopLoss / 100)) : currentPrice * (1 + (config.stopLoss / 100));
            const takeProfitPrice = prediction.prediction === 'UP' ? currentPrice * (1 + (config.takeProfit / 100)) : currentPrice * (1 - (config.takeProfit / 100));
            
            const newSignal: TradeSignal = { asset: config.symbol, action: prediction.prediction as 'UP' | 'DOWN', entryPrice: currentPrice, stopLoss: stopLossPrice, takeProfit: takeProfitPrice, confidence: prediction.confidence, reasoning: prediction.reasoning, timestamp: lastCandle.time, strategy: config.strategy, peakPrice: lastCandle?.peakPrice };
            return { status: 'monitoring', log: 'Signal found.', signal: newSignal };
        } else {
            return { status: 'no_signal', log: `AI invalidated signal (${prediction.prediction}).`, signal: null };
        }
    } catch (e: any) {
        console.error(`Analysis failed for ${config.symbol}:`, e);
        return { status: 'error', log: e.message || 'Unknown error', signal: null };
    }
  }, [canUseAi, consumeAiCredit]);

  const stopBotInstance = useCallback((botId: string) => {
    if (liveWsRefs.current[botId]) {
      liveWsRefs.current[botId]?.close();
      delete liveWsRefs.current[botId];
    }
    if (analysisIntervals.current[botId]) {
      clearInterval(analysisIntervals.current[botId]);
      delete analysisIntervals.current[botId];
    }
    delete riskGuardianRefs.current[botId];
    delete dataBufferRef.current[botId];

    setLiveBotState(prev => {
        const newBots = { ...prev.bots };
        if (newBots[botId]) {
            newBots[botId] = { ...newBots[botId], status: 'idle', activePosition: null, logs: [`[${new Date().toLocaleTimeString()}] Bot stopped.`] };
        }
        return { bots: newBots };
    });
    toast({ title: `Bot ${botId} Stopped` });
  }, [toast]);
  
  const runLiveBotCycle = useCallback(async (botId: string, isNewCandle: boolean = false) => {
    const botState = liveBotState.bots[botId];
    const data = dataBufferRef.current[botId];

    if (!botState || !data || (botState.status !== 'running' && botState.status !== 'analyzing' && botState.status !== 'position_open')) return;
    if (!activeProfile) return;
    
    const config = botState.config as LiveBotConfig;
    let currentPosition = botState.activePosition;
    
    const riskGuardian = riskGuardianRefs.current[botId];
    const { allowed, reason } = riskGuardian?.canTrade(Date.now()) ?? { allowed: true, reason: '', mode: 'none' as const };
    if (!allowed) {
      addLiveLog(botId, `Discipline action: ${reason}`);
      setLiveBotState(prev => ({...prev, bots: {...prev.bots, [botId]: {...prev.bots[botId], status: 'cooldown'}}}));
      return; 
    }

    try {
        if (currentPosition && isNewCandle) {
            const latestCandle = data[data.length - 1];
            let closePosition = false;
            let closeReason = '';
            
            if (currentPosition.action === 'UP' && latestCandle.low <= currentPosition.stopLoss) { closePosition = true; closeReason = 'Stop Loss'; } 
            else if (currentPosition.action === 'UP' && latestCandle.high >= currentPosition.takeProfit) { closePosition = true; closeReason = 'Take Profit'; } 
            else if (currentPosition.action === 'DOWN' && latestCandle.high >= currentPosition.stopLoss) { closePosition = true; closeReason = 'Stop Loss'; } 
            else if (currentPosition.action === 'DOWN' && latestCandle.low <= currentPosition.takeProfit) { closePosition = true; closeReason = 'Take Profit'; }

            if (closePosition) {
                addLiveLog(botId, `Exit signal: ${closeReason} hit.`);
                if (config.isManual) {
                    toast({ title: `Manual Exit Signal: ${config.asset}`, description: `Reason: ${closeReason}.` });
                } else {
                    const side = currentPosition.action === 'UP' ? 'SELL' : 'BUY';
                    const quantity = new Decimal(config.capital).mul(config.leverage).div(currentPosition.entryPrice).toNumber();
                    const orderResult = await placeOrder(config.asset, side, quantity, { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey }, true);
                    toast({ title: "Position Closed (Live)", description: `${side} order for ${orderResult.quantity.toFixed(5)} ${config.asset} placed.` });
                    const pnl = side === 'SELL' 
                        ? new Decimal(orderResult.price).minus(currentPosition.entryPrice).mul(orderResult.quantity).toNumber()
                        : new Decimal(currentPosition.entryPrice).minus(orderResult.price).mul(orderResult.quantity).toNumber();
                    riskGuardian?.registerTrade(pnl);
                }
                setLiveBotState(prev => ({...prev, bots: {...prev.bots, [botId]: {...prev.bots[botId], activePosition: null, status: 'running'}}}));
            }
            return;
        }

        if (!currentPosition) {
          setLiveBotState(prev => ({...prev, bots: {...prev.bots, [botId]: {...prev.bots[botId], status: 'analyzing'}}}));
          const { signal, log } = await analyzeAsset({
            symbol: config.asset,
            interval: config.interval,
            strategy: config.strategy,
            strategyParams: config.strategyParams,
            takeProfit: config.takeProfit,
            stopLoss: config.stopLoss,
            useAIPrediction: config.useAIPrediction ?? false,
            reverse: config.reverse ?? false,
          }, data);
          
          if (signal) {
              addLiveLog(botId, `New trade signal: ${signal.action} at ${signal.entryPrice}`);
              if (config.isManual) {
                 toast({ title: `Manual Entry Signal: ${config.asset}`, description: `Action: ${signal.action}, Entry: ${signal.entryPrice.toFixed(4)}` });
              } else {
                  const side = signal.action === 'UP' ? 'BUY' : 'SELL';
                  const quantity = new Decimal(config.capital).mul(config.leverage).div(signal.entryPrice).toNumber();
                  await placeOrder(config.asset, side, quantity, { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey });
                  toast({ title: "Position Opened (Live)", description: `${side} order for ${quantity.toFixed(5)} ${config.asset} placed.` });
              }
              setLiveBotState(prev => ({...prev, bots: {...prev.bots, [botId]: {...prev.bots[botId], activePosition: signal, status: 'position_open'}}}));
          } else {
              addLiveLog(botId, `No signal found: ${log}`);
              setLiveBotState(prev => ({...prev, bots: {...prev.bots, [botId]: {...prev.bots[botId], status: 'running'}}}));
          }
        }
    } catch (e: any) {
        addLiveLog(botId, `CRITICAL ERROR: ${e.message}`);
        setLiveBotState(prev => ({...prev, bots: {...prev.bots, [botId]: {...prev.bots[botId], status: 'error'}}}));
        if (e.message.includes('-2015') || e.message.toLowerCase().includes('invalid api-key')) {
            toast({ title: "API Key Failed!", description: "Bot stopped for safety.", variant: "destructive" });
            stopBotInstance(botId);
        }
    }
  }, [liveBotState.bots, addLiveLog, analyzeAsset, toast, stopBotInstance, activeProfile]);

  const startBotInstance = useCallback(async (config: LiveBotConfig & { id: string, isManual?: boolean }) => {
    const botId = config.id;
    addLiveLog(botId, `Starting bot for ${config.asset}...`);
    riskGuardianRefs.current[botId] = new RiskGuardian(config.strategyParams.discipline, config.capital);
    
    setLiveBotState(prev => ({
        ...prev, bots: { ...prev.bots, [botId]: { status: 'analyzing', config, logs: [`[${new Date().toLocaleTimeString()}] Bot starting...`], chartData: [], activePosition: null } }
    }));

    try {
      const klines = await getLatestKlinesByLimit(config.asset, config.interval, 1000);
      dataBufferRef.current[botId] = klines;
      addLiveLog(botId, `Loaded ${klines.length} initial candles for ${config.asset}.`);
      
      runLiveBotCycle(botId, true);
      analysisIntervals.current[botId] = setInterval(() => runLiveBotCycle(botId, false), 15000);
      
      if (liveWsRefs.current[botId]) liveWsRefs.current[botId]?.close();
      const ws = new WebSocket(`wss://fstream.binance.com/ws/${config.asset.toLowerCase()}@kline_${config.interval}`);
      liveWsRefs.current[botId] = ws;
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.e === 'kline') {
          const newCandle: HistoricalData = { time: data.k.t, open: parseFloat(data.k.o), high: parseFloat(data.k.h), low: parseFloat(data.k.l), close: parseFloat(data.k.c), volume: parseFloat(data.k.v) };
          const buffer = dataBufferRef.current[botId] || [];
          if (buffer.length > 0 && buffer[buffer.length - 1].time === newCandle.time) buffer[buffer.length - 1] = newCandle;
          else buffer.push(newCandle);
          dataBufferRef.current[botId] = buffer.slice(-1000);

          // Real-time synchronization for frontend Live Price display (zero-lag)
          // Keep chartData small in React state to avoid UI freezing
          setLiveBotState(prev => {
              if (!prev.bots[botId]) return prev;
              return {
                  ...prev,
                  bots: {
                      ...prev.bots,
                      [botId]: { ...prev.bots[botId], chartData: [newCandle] }
                  }
              };
          });

          if (data.k.x) runLiveBotCycle(botId, true);
        }
      };
      
      ws.onopen = () => addLiveLog(botId, "Live data stream connected.");
      ws.onerror = () => addLiveLog(botId, "Live data stream error.");
      ws.onclose = () => addLiveLog(botId, "Live data stream closed.");
      
      toast({ title: "Bot Started", description: `Monitoring ${config.asset} on ${config.interval}.`});
    } catch (error: any) {
        addLiveLog(botId, `Error starting bot: ${error.message}`);
        toast({ title: "Failed to Start Bot", description: error.message, variant: "destructive"});
        stopBotInstance(botId);
    }
  }, [addLiveLog, toast, stopBotInstance, runLiveBotCycle]);
  
  const closePosition = useCallback(async (position: Position) => {
    if (!activeProfile) {
      toast({ title: "Execution Failed", description: "An active API profile is required.", variant: "destructive" });
      return;
    }
    if (activeProfile.permissions === 'ReadOnly') {
      toast({ title: "Action Disabled", description: "Your active API key is Read-Only.", variant: "destructive" });
      return;
    }

    const side = position.side === 'LONG' ? 'SELL' : 'BUY';
    const symbol = position.symbol;
    const quantity = position.size;

    toast({ title: `Submitting close order...`, description: `${side} ${quantity} ${symbol}` });

    try {
        const orderResult = await placeOrder(symbol, side, quantity, { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey }, true);
        toast({ title: "Close Order Submitted", description: `${side} order for ${orderResult.quantity.toFixed(5)} ${symbol} submitted. ID: ${orderResult.orderId}` });
    } catch (e: any) {
        toast({ title: "Close Order Failed", description: e.message || "An unknown error.", variant: "destructive" });
    }
  }, [toast, activeProfile]);
  
  const executeTestTrade = useCallback(async (symbol: string, side: 'BUY' | 'SELL', capital: number, leverage: number) => {
    if (!activeProfile) {
        toast({ title: "Execution Failed", description: "An active API profile is required.", variant: "destructive" });
        return;
    }
     if (activeProfile.permissions !== 'FuturesTrading') {
        toast({ title: "Permission Denied", description: "Active API key does not have Futures Trading permission.", variant: "destructive" });
        return;
    }
    
    addLiveLog(symbol, `Executing test order: ${side} ${capital}x${leverage} on ${symbol}...`);
    try {
        const klines = await getLatestKlinesByLimit(symbol, '1m', 1);
        if (klines.length === 0) throw new Error("Could not fetch current price.");
        
        const currentPrice = klines[0].close;
        const quantity = new Decimal(capital).mul(leverage).div(currentPrice).toNumber();
        const orderResult = await placeOrder(symbol, side, quantity, { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey });
        toast({ title: "Test Order Placed", description: `${side} order for ${orderResult.quantity} ${symbol} submitted.` });
        addLiveLog(symbol, `Test order successful. ID: ${orderResult.orderId}`);
    } catch (e: any) {
        toast({ title: "Test Order Failed", description: e.message, variant: "destructive" });
        addLiveLog(symbol, `Test order failed: ${e.message}`);
    }
  }, [addLiveLog, toast, activeProfile]);

  const closeTestPosition = useCallback(async (symbol: string, capital: number, leverage: number) => {
    if (!activeProfile) {
      toast({ title: "Action Failed", description: "An active API profile is required.", variant: "destructive" });
      return;
    }
    
    addLiveLog(symbol, `Attempting to close test position for ${symbol}...`);
    
    const klines = await getLatestKlinesByLimit(symbol, '1m', 1);
    if (klines.length === 0) {
      toast({ title: "Close Failed", description: "Could not fetch current price.", variant: "destructive" });
      return;
    }
    const currentPrice = klines[0].close;
    const quantity = new Decimal(capital).mul(leverage).div(currentPrice).toNumber();
    
    const keys = { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey };

    try { 
      await placeOrder(symbol, 'SELL', quantity, keys, true); 
      toast({title: "Close Signal Sent", description: `Sent SELL order for ${symbol}.`}); 
    } catch (e: any) { 
      addLiveLog(symbol, `Could not close LONG (may not exist): ${e.message}`); 
    }
    try { 
      await placeOrder(symbol, 'BUY', quantity, keys, true); 
      toast({title: "Close Signal Sent", description: `Sent BUY order for ${symbol}.`}); 
    } catch (e: any) { 
      addLiveLog(symbol, `Could not close SHORT (may not exist): ${e.message}`); 
    }
  }, [addLiveLog, toast, activeProfile]);

  // Simulation state and refs
  const simWsRef = useRef<WebSocket | null>(null);
  const simBufferRef = useRef<HistoricalData[]>([]);
  const simConfigRef = useRef<SimulationConfig | null>(null);

  const stopSimulation = useCallback(() => {
    if (simWsRef.current) {
      simWsRef.current.close();
      simWsRef.current = null;
    }
    const timestamp = new Date().toLocaleTimeString();
    setSimulationState(prev => ({
      ...prev,
      isRunning: false,
      logs: [`[${timestamp}] Paper trading simulation stopped.`, ...prev.logs].slice(0, 100),
    }));
    
    toast({
      title: "Simulation Stopped",
      description: "Paper trading simulation has been stopped.",
    });
  }, [toast]);

  const startSimulation = useCallback(async (config: SimulationConfig) => {
    if (simWsRef.current) {
      simWsRef.current.close();
      simWsRef.current = null;
    }

    simConfigRef.current = config;
    const timestamp = new Date().toLocaleTimeString();
    const initialLog = `[${timestamp}] Initializing simulation for ${config.symbol} (${config.interval}) using '${config.strategy}'...`;

    setSimulationState({
      isRunning: true,
      logs: [initialLog],
      portfolio: {
        totalValue: config.initialCapital,
        availableBalance: config.initialCapital,
        unrealizedPnl: 0,
        totalPnl: 0,
      },
      openPositions: [],
      tradeHistory: [],
      summary: {
        totalTrades: 0,
        winRate: 0,
        totalPnl: 0,
        maxDrawdown: 0,
      },
      chartData: null,
    });

    try {
      const rawKlines = await getLatestKlinesByLimit(config.symbol, config.interval, 500);
      const strategy = getStrategyById(config.strategy);
      if (!strategy) {
        throw new Error(`Strategy '${config.strategy}' not found.`);
      }

      const calculatedData = await strategy.calculate(rawKlines, config.strategyParams, config.symbol);
      simBufferRef.current = calculatedData;

      setSimulationState(prev => ({
        ...prev,
        chartData: calculatedData,
        logs: [`[${new Date().toLocaleTimeString()}] Loaded ${calculatedData.length} historical candles. Connecting stream...`, ...prev.logs],
      }));

      const ws = new WebSocket(`wss://fstream.binance.com/ws/${config.symbol.toLowerCase()}@kline_${config.interval}`);
      simWsRef.current = ws;

      ws.onopen = () => {
        const timeStr = new Date().toLocaleTimeString();
        setSimulationState(prev => ({
          ...prev,
          logs: [`[${timeStr}] Live stream connected. Monitoring for signals...`, ...prev.logs],
        }));
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.e !== 'kline') return;

        const newCandle: HistoricalData = {
          time: data.k.t,
          open: parseFloat(data.k.o),
          high: parseFloat(data.k.h),
          low: parseFloat(data.k.l),
          close: parseFloat(data.k.c),
          volume: parseFloat(data.k.v),
        };

        const buffer = [...simBufferRef.current];
        if (buffer.length > 0 && buffer[buffer.length - 1].time === newCandle.time) {
          buffer[buffer.length - 1] = newCandle;
        } else {
          buffer.push(newCandle);
        }

        const updatedData = await strategy.calculate(buffer.slice(-500), config.strategyParams, config.symbol);
        simBufferRef.current = updatedData;
        const currentCandle = updatedData[updatedData.length - 1];
        const currentPrice = newCandle.close;

        setSimulationState(prev => {
          if (!prev.isRunning) return prev;

          let availableBalance = new Decimal(prev.portfolio.availableBalance);
          let unrealizedPnl = new Decimal(0);
          let realizedPnl = new Decimal(prev.portfolio.totalPnl);
          const currentPositions = [...prev.openPositions];
          const updatedTradeHistory = [...prev.tradeHistory];
          const newLogs = [...prev.logs];
          const isClosedCandle = data.k.x;

          // 1. Process Open Positions with Decimal math
          const remainingPositions: typeof currentPositions = [];

          for (const pos of currentPositions) {
            const entryPrice = new Decimal(pos.entryPrice);
            const size = new Decimal(pos.size);
            const price = new Decimal(currentPrice);
            
            let posPnl = new Decimal(0);
            if (pos.side === 'LONG') {
              posPnl = price.minus(entryPrice).mul(size);
            } else {
              posPnl = entryPrice.minus(price).mul(size);
            }

            let shouldClose = false;
            let closeReason = '';

            if (pos.stopLoss && ((pos.side === 'LONG' && currentCandle.low <= pos.stopLoss) || (pos.side === 'SHORT' && currentCandle.high >= pos.stopLoss))) {
              shouldClose = true;
              closeReason = 'Stop Loss';
            } else if (pos.takeProfit && ((pos.side === 'LONG' && currentCandle.high >= pos.takeProfit) || (pos.side === 'SHORT' && currentCandle.low <= pos.takeProfit))) {
              shouldClose = true;
              closeReason = 'Take Profit';
            }

            if (shouldClose) {
              const exitPrice = pos.side === 'LONG'
                ? (closeReason === 'Stop Loss' ? Math.min(currentPrice, pos.stopLoss!) : Math.max(currentPrice, pos.takeProfit!))
                : (closeReason === 'Stop Loss' ? Math.max(currentPrice, pos.stopLoss!) : Math.min(currentPrice, pos.takeProfit!));
              
              const exitPriceDec = new Decimal(exitPrice);
              const finalPnl = pos.side === 'LONG' ? exitPriceDec.minus(entryPrice).mul(size) : entryPrice.minus(exitPriceDec).mul(size);
              const feeDec = exitPriceDec.mul(size).mul(new Decimal(config.fee).div(100));
              const netPnl = finalPnl.minus(feeDec);

              realizedPnl = realizedPnl.plus(netPnl);
              const returnedCapital = size.mul(entryPrice).div(config.leverage).plus(netPnl);
              availableBalance = availableBalance.plus(returnedCapital);

              const timeStr = new Date().toLocaleTimeString();
              newLogs.unshift(`[${timeStr}] Closed ${pos.side} at $${exitPrice.toFixed(2)} (${closeReason}). Net PnL: ${netPnl.gte(0) ? '+' : ''}$${netPnl.toFixed(2)}`);

              updatedTradeHistory.unshift({
                id: `sim_exit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                symbol: config.symbol,
                side: pos.side === 'LONG' ? 'SELL' : 'BUY',
                size: size.toNumber(),
                price: exitPrice,
                time: timeStr,
                timestamp: Date.now(),
                pnl: netPnl.toNumber(),
                fee: feeDec.toNumber(),
                type: 'exit',
              });
            } else {
              unrealizedPnl = unrealizedPnl.plus(posPnl);
              remainingPositions.push({
                ...pos,
                currentPrice: currentPrice,
                pnl: posPnl.toNumber(),
                percentage: entryPrice.gt(0) ? posPnl.div(size.mul(entryPrice).div(config.leverage)).mul(100).toNumber() : 0,
              });
            }
          }

          // 2. Check for New Entry Signal on Closed Candle
          if (isClosedCandle && remainingPositions.length === 0) {
            let signalType: 'LONG' | 'SHORT' | null = null;
            if (currentCandle.buySignal) signalType = config.strategyParams?.reverse ? 'SHORT' : 'LONG';
            else if (currentCandle.sellSignal) signalType = config.strategyParams?.reverse ? 'LONG' : 'SHORT';

            if (signalType) {
              const entryPriceDec = new Decimal(currentPrice);
              const allocatedCapital = availableBalance.mul(0.95); // Use 95% of available balance
              const positionValue = allocatedCapital.mul(config.leverage);
              const sizeDec = positionValue.div(entryPriceDec);

              if (sizeDec.gt(0)) {
                const slPercent = new Decimal(config.stopLoss).div(100);
                const tpPercent = new Decimal(config.takeProfit).div(100);
                const stopLossPrice = signalType === 'LONG' 
                  ? entryPriceDec.mul(new Decimal(1).minus(slPercent)).toNumber() 
                  : entryPriceDec.mul(new Decimal(1).plus(slPercent)).toNumber();
                const takeProfitPrice = signalType === 'LONG' 
                  ? entryPriceDec.mul(new Decimal(1).plus(tpPercent)).toNumber() 
                  : entryPriceDec.mul(new Decimal(1).minus(tpPercent)).toNumber();

                availableBalance = availableBalance.minus(allocatedCapital);
                const timeStr = new Date().toLocaleTimeString();
                
                newLogs.unshift(`[${timeStr}] Opened ${signalType} at $${currentPrice.toFixed(2)} (${config.leverage}x leverage). SL: $${stopLossPrice.toFixed(2)}, TP: $${takeProfitPrice.toFixed(2)}`);

                const newPosition: SimulatedPosition = {
                  id: `sim_pos_${Date.now()}`,
                  symbol: config.symbol,
                  asset: config.symbol,
                  side: signalType,
                  size: sizeDec.toNumber(),
                  entryPrice: currentPrice,
                  currentPrice: currentPrice,
                  pnl: 0,
                  percentage: 0,
                  entryTime: Date.now(),
                  leverage: config.leverage,
                  status: 'open',
                  stopLoss: stopLossPrice,
                  takeProfit: takeProfitPrice,
                };

                remainingPositions.push(newPosition);

                const feeDec = entryPriceDec.mul(sizeDec).mul(new Decimal(config.fee).div(100));
                updatedTradeHistory.unshift({
                  id: `sim_entry_${Date.now()}`,
                  symbol: config.symbol,
                  side: signalType === 'LONG' ? 'BUY' : 'SELL',
                  size: sizeDec.toNumber(),
                  price: currentPrice,
                  time: timeStr,
                  timestamp: Date.now(),
                  fee: feeDec.toNumber(),
                  type: 'entry',
                });
              }
            }
          }

          // 3. Compute Summary Statistics using Decimal
          const totalValueDec = availableBalance.plus(unrealizedPnl);
          const closedTrades = updatedTradeHistory.filter(t => t.type === 'exit');
          const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
          const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

          return {
            ...prev,
            chartData: updatedData,
            openPositions: remainingPositions,
            tradeHistory: updatedTradeHistory,
            logs: newLogs.slice(0, 100),
            portfolio: {
              totalValue: totalValueDec.toNumber(),
              availableBalance: availableBalance.toNumber(),
              unrealizedPnl: unrealizedPnl.toNumber(),
              totalPnl: realizedPnl.toNumber(),
            },
            summary: {
              totalTrades: closedTrades.length,
              winRate: Math.round(winRate * 10) / 10,
              totalPnl: realizedPnl.toNumber(),
              maxDrawdown: prev.summary.maxDrawdown,
            },
          };
        });
      };

      ws.onerror = (err) => {
        console.error("Simulation WebSocket error:", err);
        setSimulationState(prev => ({
          ...prev,
          logs: [`[${new Date().toLocaleTimeString()}] Live stream error. Reconnecting...`, ...prev.logs],
        }));
      };

      ws.onclose = () => {
        setSimulationState(prev => ({
          ...prev,
          logs: [`[${new Date().toLocaleTimeString()}] Stream connection closed.`, ...prev.logs],
        }));
      };

      toast({
        title: "Simulation Active",
        description: `Live paper trading stream connected for ${config.symbol}.`,
      });
    } catch (error: any) {
      console.error("Simulation start failed:", error);
      stopSimulation();
      toast({
        title: "Simulation Failed",
        description: error.message || "Failed to initialize simulation stream.",
        variant: "destructive",
      });
    }
  }, [getStrategyById, toast, stopSimulation]);

  useEffect(() => {
    return () => {
      if (simWsRef.current) simWsRef.current.close();
      Object.values(liveWsRefs.current).forEach(ws => ws?.close());
      Object.values(analysisIntervals.current).forEach(clearInterval);
    }
  }, []);

  return (
    <BotContext.Provider value={{ 
      liveBotState, strategyParams, setStrategyParams, isTradingActive,
      startBotInstance, stopBotInstance, closePosition,
      showRecommendation, strategyRecommendation, activateRecommendedStrategy, dismissRecommendation,
      executeTestTrade, closeTestPosition,
      botInstances, setBotInstances, addBotInstance,
      simulationState, startSimulation, stopSimulation,
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
