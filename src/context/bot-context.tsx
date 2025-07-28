

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { HistoricalData, TradeSignal, LiveBotConfig, RankedTradeSignal, Position, LiveBotStateForAsset } from '@/lib/types';
import { getLatestKlinesByLimit, placeOrder, setLeverage, getOpenPositions } from "@/lib/binance-service";
import { getStrategyById } from "@/lib/strategies";
import { useApi } from './api-context';
import { RiskGuardian } from '@/lib/risk-guardian';
import { usePersistentState } from '@/hooks/use-persistent-state';

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
import { defaultSmiMfiScalpParams } from '@/lib/strategies/smi-mfi-scalp';
import { defaultOrderFlowScalpParams } from '@/lib/strategies/order-flow-scalp';
import { defaultForcedActionScalpParams } from '@/lib/strategies/forced-action-scalp';


type BotInstance = LiveBotConfig & {
    id: string;
};

type BotListType = 'live' | 'manual';

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
  closeTestPosition: (symbol: string) => void;
  
  // State for live and manual bots are now separate
  liveBotInstances: BotInstance[];
  manualBotInstances: BotInstance[];
  setBotInstances: (type: BotListType, instances: React.SetStateAction<BotInstance[]>) => void;
  addBotInstance: (type: BotListType, config?: Partial<LiveBotConfig>) => void;
  getBotInstances: (type: BotListType) => BotInstance[];
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
    'smi-mfi-scalp': defaultSmiMfiScalpParams,
    'order-flow-scalp': defaultOrderFlowScalpParams,
    'forced-action-scalp': defaultForcedActionScalpParams,
};

export const BotProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { activeProfile } = useApi();
  
  const [liveBotState, setLiveBotState] = useState<{ bots: Record<string, LiveBotStateForAsset> }>({ bots: {} });
  const liveWsRefs = useRef<Record<string, WebSocket | null>>({});
  const riskGuardianRefs = useRef<Record<string, RiskGuardian | null>>({});
  const dataBufferRef = useRef<Record<string, HistoricalData[]>>({});
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [showRecommendation, setShowRecommendation] = useState(false);
  const [strategyRecommendation, setStrategyRecommendation] = useState<RankedTradeSignal | null>(null);

  const dismissRecommendation = () => { setShowRecommendation(false); setStrategyRecommendation(null); };
  const activateRecommendedStrategy = (strategyId: string) => { console.log(`Activating recommended strategy: ${strategyId}`); dismissRecommendation(); };
  
  const [strategyParams, setStrategyParams] = useState<Record<string, any>>(DEFAULT_STRATEGY_PARAMS);
  const [isTradingActive, setIsTradingActive] = useState(false);

  // --- SEPARATED BOT INSTANCE STATE ---
  const [liveBotInstances, setLiveBotInstances] = usePersistentState<BotInstance[]>('live-bot-instances', []);
  const [manualBotInstances, setManualBotInstances] = usePersistentState<BotInstance[]>('manual-bot-instances', []);

  const getBotInstances = (type: BotListType) => {
    return type === 'live' ? liveBotInstances : manualBotInstances;
  }
  
  const setBotInstances = (type: BotListType, instances: React.SetStateAction<BotInstance[]>) => {
    if (type === 'live') {
      setLiveBotInstances(instances);
    } else {
      setManualBotInstances(instances);
    }
  }

  const addBotInstance = useCallback((type: BotListType, config?: Partial<LiveBotConfig>) => {
    const newId = `bot_${Date.now()}`;
    const newBot: BotInstance = {
      id: newId,
      asset: config?.asset || 'BTCUSDT',
      interval: config?.interval || '1h',
      capital: config?.capital || 100,
      leverage: config?.leverage || 10,
      takeProfit: config?.takeProfit || 1.5,
      stopLoss: config?.stopLoss || 1,
      strategy: config?.strategy || 'ema-crossover',
      strategyParams: config?.strategyParams || defaultEmaCrossoverParams,
      isManual: type === 'manual',
    };
    
    const setter = type === 'live' ? setLiveBotInstances : setManualBotInstances;
    setter(prev => [...prev, newBot]);
  }, [setLiveBotInstances, setManualBotInstances]);
  
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
  
  const stopBotInstance = useCallback((botId: string) => {
    if (liveWsRefs.current[botId]) {
      liveWsRefs.current[botId]?.close();
      delete liveWsRefs.current[botId];
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
  
  const runLiveBotCycle = useCallback(async (botId: string, isCandleClose: boolean = false) => {
    const botState = liveBotState.bots[botId];
    const data = dataBufferRef.current[botId];
  
    if (!botState || !data || (botState.status !== 'running' && botState.status !== 'position_open')) return;
    if (!activeProfile) return;
  
    const config = botState.config;
    let currentPosition = botState.activePosition;
    const strategy = getStrategyById(config.strategy);
    if (!strategy) return;
  
    const riskGuardian = riskGuardianRefs.current[botId];
  
    try {
        const latestCandle = data[data.length - 1];
  
        // --- EXIT LOGIC (runs on every tick) ---
        if (currentPosition) {
            let closePosition = false;
            let closeReason = '';
            const currentPrice = latestCandle.close;
  
            if (currentPosition.action === 'UP') {
                if (currentPrice <= currentPosition.stopLoss) { closePosition = true; closeReason = 'Stop Loss'; }
                else if (currentPrice >= currentPosition.takeProfit) { closePosition = true; closeReason = 'Take Profit'; }
            } else { // DOWN
                if (currentPrice >= currentPosition.stopLoss) { closePosition = true; closeReason = 'Stop Loss'; }
                else if (currentPrice <= currentPosition.takeProfit) { closePosition = true; closeReason = 'Take Profit'; }
            }
  
            if (closePosition) {
                addLiveLog(botId, `Exit signal: ${closeReason} hit at price ${currentPrice}.`);
                if (!config.isManual) {
                    const side = currentPosition.action === 'UP' ? 'SELL' : 'BUY';
                    const quantity = (config.capital * config.leverage) / currentPosition.entryPrice;
                    const orderResult = await placeOrder(config.asset, side, quantity, { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey }, true);
                    toast({ title: "Position Closed (Live)", description: `${side} order for ${orderResult.quantity.toFixed(5)} ${config.asset} placed.` });
                    const pnl = side === 'SELL' ? (orderResult.price - currentPosition.entryPrice) * orderResult.quantity : (currentPosition.entryPrice - orderResult.price) * orderResult.quantity;
                    riskGuardian?.registerTrade(pnl);
                }
                setLiveBotState(prev => ({ ...prev, bots: { ...prev.bots, [botId]: { ...prev.bots[botId], activePosition: null, status: 'running' } } }));
                return; // Exit cycle after closing position
            }
        }
  
        // --- ENTRY LOGIC (runs ONLY on candle close) ---
        if (isCandleClose && !currentPosition) {
            if (riskGuardian) {
                const { allowed, reason } = riskGuardian.canTrade();
                if (!allowed) {
                  addLiveLog(botId, `Discipline action: ${reason}`);
                  setLiveBotState(prev => ({ ...prev, bots: { ...prev.bots, [botId]: { ...prev.bots[botId], status: 'cooldown' } } }));
                  return;
                }
            }
            const dataWithIndicators = await strategy.calculate(JSON.parse(JSON.stringify(data)), config.strategyParams, config.asset);
            const signalCandle = dataWithIndicators[dataWithIndicators.length - 2]; // The candle that just closed
  
            const isBullishEvent = !!signalCandle.bullish_event;
            const isBearishEvent = !!signalCandle.bearish_event;

            let strategySignal: 'BUY' | 'SELL' | null = null;
            if (config.strategyParams.reverse) {
                if (isBullishEvent) strategySignal = 'SELL';
                if (isBearishEvent) strategySignal = 'BUY';
            } else {
                if (isBullishEvent) strategySignal = 'BUY';
                if (isBearishEvent) strategySignal = 'SELL';
            }
  
            if (strategySignal) {
                const signalAction = strategySignal === 'BUY' ? 'UP' : 'DOWN';
                const currentPrice = signalCandle.close; // Use the closing price of the signal candle
                
                const stopLossPrice = signalCandle.stopLossLevel || (signalAction === 'UP' ? currentPrice * (1 - (config.stopLoss / 100)) : currentPrice * (1 + (config.stopLoss / 100)));
                const takeProfitPrice = signalCandle.takeProfitLevel || (signalAction === 'UP' ? currentPrice * (1 + (config.takeProfit / 100)) : currentPrice * (1 - (config.takeProfit / 100)));
                
                const newSignal: TradeSignal = {
                  asset: config.asset,
                  action: signalAction,
                  entryPrice: currentPrice,
                  stopLoss: stopLossPrice,
                  takeProfit: takeProfitPrice,
                  confidence: 1,
                  reasoning: `Signal from '${config.strategy}' on candle close.`,
                  timestamp: signalCandle.time,
                  strategy: config.strategy,
                  peakPrice: signalCandle.peakPrice,
                };
  
                addLiveLog(botId, `New trade signal: ${newSignal.action} at ${newSignal.entryPrice}`);
                if (!config.isManual) {
                    const side = newSignal.action === 'UP' ? 'BUY' : 'SELL';
                    const quantity = (config.capital * config.leverage) / newSignal.entryPrice;
                    await placeOrder(config.asset, side, quantity, { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey });
                    toast({ title: "Position Opened (Live)", description: `${side} order for ${quantity.toFixed(5)} ${config.asset} placed.` });
                }
                setLiveBotState(prev => ({ ...prev, bots: { ...prev.bots, [botId]: { ...prev.bots[botId], activePosition: newSignal, status: 'position_open' } } }));
            }
        }
    } catch (e: any) {
        addLiveLog(botId, `CRITICAL ERROR: ${e.message}`);
        setLiveBotState(prev => ({ ...prev, bots: { ...prev.bots, [botId]: { ...prev.bots[botId], status: 'error' } } }));
        if (e.message.includes('-2015') || e.message.toLowerCase().includes('invalid api-key')) {
            toast({ title: "API Key Failed!", description: "Bot stopped for safety.", variant: "destructive" });
            stopBotInstance(botId);
        }
    }
  }, [liveBotState.bots, addLiveLog, toast, stopBotInstance, activeProfile]);

  const startBotInstance = useCallback(async (config: LiveBotConfig & { id: string, isManual?: boolean }) => {
    const botId = config.id;
    if (!activeProfile) {
        toast({ title: "Bot Start Failed", description: "No active API profile found.", variant: "destructive" });
        return;
    }
    addLiveLog(botId, `Starting bot for ${config.asset}...`);
    riskGuardianRefs.current[botId] = new RiskGuardian(config.strategyParams.discipline, config.capital);
    
    setLiveBotState(prev => ({
        ...prev, bots: { ...prev.bots, [botId]: { status: 'running', config, logs: [`[${new Date().toLocaleTimeString()}] Bot starting...`], chartData: [], activePosition: null } }
    }));

    if (!updateIntervalRef.current) {
        updateIntervalRef.current = setInterval(() => {
            setLiveBotState(prev => {
                const updatedBots = { ...prev.bots };
                Object.keys(dataBufferRef.current).forEach(id => {
                    if (updatedBots[id]) updatedBots[id] = { ...updatedBots[id], chartData: dataBufferRef.current[id] };
                });
                return { bots: updatedBots };
            });
        }, 1000);
    }

    try {
      if (!config.isManual) {
        await setLeverage(config.asset, config.leverage, { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey });
        addLiveLog(botId, `Leverage set to ${config.leverage}x for ${config.asset}.`);
      }

      const klines = await getLatestKlinesByLimit(config.asset, config.interval, 1000);
      dataBufferRef.current[botId] = klines;
      addLiveLog(botId, `Loaded ${klines.length} initial candles for ${config.asset}.`);
      
      runLiveBotCycle(botId, true);
      
      if (liveWsRefs.current[botId]) liveWsRefs.current[botId]?.close();
      const ws = new WebSocket(`wss://fstream.binance.com/ws/${config.asset.toLowerCase()}@kline_${config.interval}`);
      liveWsRefs.current[botId] = ws;
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.e === 'kline') {
          const newCandle: HistoricalData = { time: data.k.t, open: parseFloat(data.k.o), high: parseFloat(data.k.h), low: parseFloat(data.k.l), close: parseFloat(data.k.c), volume: parseFloat(data.k.v) };
          const buffer = dataBufferRef.current[botId] || [];
          
          const isCandleClose = data.k.x;

          if (buffer.length > 0 && buffer[buffer.length - 1].time === newCandle.time) {
            buffer[buffer.length - 1] = newCandle;
          } else {
             buffer.push(newCandle);
          }
          dataBufferRef.current[botId] = buffer.slice(-1000);
          
          runLiveBotCycle(botId, isCandleClose); 
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
  }, [addLiveLog, toast, stopBotInstance, runLiveBotCycle, activeProfile]);
  
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
    
    // Find a running bot for this symbol to check its RiskGuardian
    const runningBotId = Object.keys(liveBotState.bots).find(id => liveBotState.bots[id].config.asset === symbol && liveBotState.bots[id].status !== 'idle');
    if (runningBotId) {
        const riskGuardian = riskGuardianRefs.current[runningBotId];
        if (riskGuardian) {
            const { allowed, reason } = riskGuardian.canTrade();
            if (!allowed) {
                toast({ title: "Manual Trade Blocked", description: `Discipline rules for the running ${symbol} bot prevent this action: ${reason}`, variant: "destructive", duration: 5000 });
                return;
            }
        }
    }
    
    const logId = 'test-trade';
    addLiveLog(logId, `Executing manual order: ${side} ${capital}x${leverage} on ${symbol}...`);
    
    try {
        await setLeverage(symbol, leverage, { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey });
        const klines = await getLatestKlinesByLimit(symbol, '1m', 1);
        if (klines.length === 0) throw new Error("Could not fetch current price.");
        
        const currentPrice = klines[0].close;
        const quantity = (capital * leverage) / currentPrice;
        const orderResult = await placeOrder(symbol, side, quantity, { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey });
        toast({ title: "Manual Order Placed", description: `${side} order for ${orderResult.quantity} ${symbol} submitted.` });
        addLiveLog(logId,`Manual order successful. ID: ${orderResult.orderId}`);
    } catch (e: any) {
        toast({ title: "Manual Order Failed", description: e.message, variant: "destructive" });
        addLiveLog(logId, `Manual order failed: ${e.message}`);
    }
  }, [addLiveLog, toast, activeProfile, liveBotState.bots]);

  const closeTestPosition = useCallback(async (symbol: string) => {
    if (!activeProfile) {
      toast({ title: "Action Failed", description: "An active API profile is required.", variant: "destructive" });
      return;
    }
    
    const logId = 'test-trade';
    addLiveLog(logId, `Attempting to close any open position for ${symbol}...`);
    
    const keys = { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey };

    try { 
      const {data: positions} = await getOpenPositions(keys);
      const openPosition = positions.find(p => p.symbol === symbol);

      if (openPosition) {
        const side = openPosition.side === 'LONG' ? 'SELL' : 'BUY';
        await placeOrder(symbol, side, openPosition.size, keys, true); 
        toast({title: "Close Signal Sent", description: `Sent ${side} order for ${openPosition.size} ${symbol}.`}); 
        addLiveLog(logId, `Close order for ${symbol} sent successfully.`);
      } else {
        toast({title: "No Position Found", description: `No open position found for ${symbol} to close.`});
        addLiveLog(logId, `No position found for ${symbol}.`);
      }
    } catch (e: any) { 
      toast({title: "Close Failed", description: `Failed to close position: ${e.message}`, variant: "destructive"});
      addLiveLog(logId, `Failed to close position for ${symbol}: ${e.message}`);
    }
  }, [addLiveLog, toast, activeProfile]);

  useEffect(() => {
    return () => {
      Object.values(liveWsRefs.current).forEach(ws => ws?.close());
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    }
  }, []);

  return (
    <BotContext.Provider value={{ 
      liveBotState, strategyParams, setStrategyParams, isTradingActive,
      startBotInstance, stopBotInstance, closePosition,
      showRecommendation, strategyRecommendation, activateRecommendedStrategy, dismissRecommendation,
      executeTestTrade, closeTestPosition,
      liveBotInstances, manualBotInstances, addBotInstance, setBotInstances, getBotInstances,
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
