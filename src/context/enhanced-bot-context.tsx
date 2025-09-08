'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { HistoricalData, TradeSignal, LiveBotConfig, RankedTradeSignal, Position, LiveBotStateForAsset } from '@/lib/types';
import { predictMarket, type PredictMarketOutput } from "@/ai/flows/predict-market-flow";
import { getLatestKlinesByLimit, placeOrder } from "@/lib/binance-service";
import { getStrategyById } from "@/lib/strategies";
import { useApi } from './api-context';
import { RiskGuardian } from '@/lib/risk-guardian';
import { usePersistentState } from '@/hooks/use-persistent-state';

// Import all new systems
import { logger } from '@/lib/logger';
import { TradingErrorHandler, withRetry, CircuitBreaker } from '@/lib/error-handler';
import { botPersistence } from '@/lib/bot-persistence';
import { ResilientWebSocket, wsManager } from '@/lib/websocket-manager';
import { TradingValidator } from '@/lib/trading-validator';
import { emergencyStop } from '@/lib/emergency-stop';
import { botMonitor } from '@/lib/bot-monitor';
import { analytics } from '@/lib/analytics';

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

type BotInstance = LiveBotConfig & {
    id: string;
};

interface EnhancedBotContextType {
  liveBotState: { bots: Record<string, LiveBotStateForAsset> };
  strategyParams: Record<string, any>;
  setStrategyParams: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  isTradingActive: boolean;
  startBotInstance: (config: LiveBotConfig & { id: string, isManual?: boolean }) => Promise<void>;
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
  
  // Enhanced features
  systemHealth: any;
  emergencyStopActive: boolean;
  performanceMetrics: any;
  recentAlerts: any[];
  restartBot: (botId: string) => Promise<void>;
  emergencyStopAll: (reason: string) => Promise<void>;
  getBotLogs: (botId: string) => any[];
  exportBotData: (botId: string) => string;
}

const EnhancedBotContext = createContext<EnhancedBotContextType | undefined>(undefined);

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
};

export const EnhancedBotProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { activeProfile, canUseAi, consumeAiCredit } = useApi();
  
  const [liveBotState, setLiveBotState] = useState<{ bots: Record<string, LiveBotStateForAsset> }>({ bots: {} });
  const riskGuardianRefs = useRef<Record<string, RiskGuardian | null>>({});
  const dataBufferRef = useRef<Record<string, HistoricalData[]>>({});
  const circuitBreakers = useRef<Record<string, CircuitBreaker>>({});
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [showRecommendation, setShowRecommendation] = useState(false);
  const [strategyRecommendation, setStrategyRecommendation] = useState<RankedTradeSignal | null>(null);
  const [systemHealth, setSystemHealth] = useState<any>({});
  const [emergencyStopActive, setEmergencyStopActive] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  const dismissRecommendation = () => { setShowRecommendation(false); setStrategyRecommendation(null); };
  const activateRecommendedStrategy = (strategyId: string) => { 
    logger.info(`Activating recommended strategy: ${strategyId}`, { strategyId }, undefined, 'bot-context');
    dismissRecommendation(); 
  };
  
  const [strategyParams, setStrategyParams] = useState<Record<string, any>>(DEFAULT_STRATEGY_PARAMS);
  const [isTradingActive, setIsTradingActive] = useState(false);
  const [botInstances, setBotInstances] = usePersistentState<BotInstance[]>('live-bot-instances', []);
  
  const addBotInstance = useCallback((config: Partial<LiveBotConfig>) => {
    const newId = `bot_${Date.now()}`;
    
    // Validate configuration
    const fullConfig: LiveBotConfig = {
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

    const validation = TradingValidator.validateBotConfig(fullConfig);
    if (!validation.isValid) {
      toast({
        title: "Configuration Error",
        description: validation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    const newBot: BotInstance = {
      id: newId,
      ...fullConfig
    };
    
    setBotInstances(prev => [...prev, newBot]);
    logger.info('New bot instance added', { botId: newId, config: fullConfig }, newId, 'bot-context');
  }, [setBotInstances, toast]);

  // Monitor system health
  useEffect(() => {
    const healthUnsubscribe = botMonitor.subscribeToHealth((health) => {
      setSystemHealth(health);
    });

    const alertUnsubscribe = botMonitor.subscribeToAlerts((alert) => {
      setRecentAlerts(prev => [alert, ...prev.slice(0, 19)]); // Keep last 20 alerts
    });

    const emergencyUnsubscribe = emergencyStop.subscribe((event) => {
      setEmergencyStopActive(emergencyStop.isEmergencyActive());
      toast({
        title: "Emergency Stop Activated",
        description: event.message,
        variant: "destructive"
      });
    });

    return () => {
      healthUnsubscribe();
      alertUnsubscribe();
      emergencyUnsubscribe();
    };
  }, [toast]);

  // Update trading active state
  useEffect(() => {
    const liveBotRunning = Object.values(liveBotState.bots).some(bot => 
      !bot.config.isManual && bot.status !== 'idle' && bot.status !== 'error'
    );
    setIsTradingActive(liveBotRunning);
  }, [liveBotState.bots]);

  // Enhanced logging function
  const addLog = useCallback((setter: React.Dispatch<React.SetStateAction<any>>, message: string, botId?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    if (botId) {
      setter((prev: any) => ({
        ...prev, 
        bots: { 
          ...prev.bots, 
          [botId]: { 
            ...prev.bots[botId], 
            logs: [`[${timestamp}] ${message}`, ...(prev.bots[botId]?.logs || [])].slice(0, 100) 
          } 
        }
      }));
      
      // Also log to centralized logger
      logger.info(message, { timestamp }, botId, 'bot-activity');
    }
  }, []);

  const addLiveLog = useCallback((botId: string, message: string) => 
    addLog(setLiveBotState, message, botId), [addLog]);
  
  // Enhanced analyze asset function with error handling and retry
  const analyzeAsset = useCallback(async (
    config: { 
      symbol: string; 
      interval: string; 
      strategy: string; 
      strategyParams: any; 
      takeProfit: number; 
      stopLoss: number; 
      useAIPrediction: boolean; 
      reverse: boolean; 
    },
    existingData?: HistoricalData[]
  ) => {
    const botId = `temp_${config.symbol}`;
    
    try {
      return await withRetry(async () => {
        const dataToAnalyze = existingData && existingData.length > 50 ? 
          existingData : 
          await getLatestKlinesByLimit(config.symbol, config.interval, 1000);
          
        if (dataToAnalyze.length < 50) {
          throw new Error('Not enough historical data available');
        }

        const strategy = getStrategyById(config.strategy);
        if (!strategy) {
          throw new Error(`Strategy '${config.strategy}' not found`);
        }

        const dataWithIndicators = await strategy.calculate(
          JSON.parse(JSON.stringify(dataToAnalyze)), 
          config.strategyParams, 
          config.symbol
        );
        
        const lastCandle = dataWithIndicators[dataWithIndicators.length - 1];

        if (!lastCandle || (!lastCandle.buySignal && !lastCandle.sellSignal)) {
          return { status: 'no_signal', log: 'No actionable trade setup found.', signal: null };
        }
        
        let strategySignal: 'BUY' | 'SELL' | null = lastCandle.buySignal ? 'BUY' : 'SELL';
        if (config.reverse) strategySignal = strategySignal === 'BUY' ? 'SELL' : 'BUY';
        
        const prediction = config.useAIPrediction ? (
          canUseAi() ? 
          await predictMarket({ 
            symbol: config.symbol, 
            recentData: JSON.stringify(dataWithIndicators.slice(-50).map(d => ({ 
              t: d.time, o: d.open, h: d.high, l: d.low, c: d.close, v: d.volume 
            }))), 
            strategySignal: strategySignal 
          }) : null 
        ) : { 
          prediction: strategySignal === 'BUY' ? 'UP' : 'DOWN', 
          confidence: 1, 
          reasoning: `Signal from '${config.strategy}' (${config.reverse ? 'Reversed' : 'Standard'}).` 
        };

        if (!prediction) {
          return { status: 'no_signal', log: 'AI quota reached, cannot validate signal.', signal: null };
        }
        
        const aiConfirms = (prediction.prediction === 'UP' && strategySignal === 'BUY') || 
                          (prediction.prediction === 'DOWN' && strategySignal === 'SELL');
        
        if (aiConfirms) {
          if (config.useAIPrediction) consumeAiCredit();
          
          const currentPrice = lastCandle.close;
          const stopLossPrice = lastCandle?.stopLossLevel ? lastCandle.stopLossLevel : 
            prediction.prediction === 'UP' ? 
            currentPrice * (1 - (config.stopLoss / 100)) : 
            currentPrice * (1 + (config.stopLoss / 100));
          const takeProfitPrice = prediction.prediction === 'UP' ? 
            currentPrice * (1 + (config.takeProfit / 100)) : 
            currentPrice * (1 - (config.takeProfit / 100));
          
          const newSignal: TradeSignal = { 
            asset: config.symbol, 
            action: prediction.prediction as 'UP' | 'DOWN', 
            entryPrice: currentPrice, 
            stopLoss: stopLossPrice, 
            takeProfit: takeProfitPrice, 
            confidence: prediction.confidence, 
            reasoning: prediction.reasoning, 
            timestamp: lastCandle.time, 
            strategy: config.strategy, 
            peakPrice: lastCandle?.peakPrice 
          };
          
          // Validate the signal
          const signalValidation = TradingValidator.validateTradeSignal(newSignal);
          if (!signalValidation.isValid) {
            throw new Error(`Invalid signal: ${signalValidation.errors.join(', ')}`);
          }
          
          logger.logSignal(botId, newSignal.action === 'UP' ? 'BUY' : 'SELL', config.symbol, config.strategy, newSignal.confidence, newSignal.reasoning);
          
          return { status: 'monitoring', log: 'Signal found.', signal: newSignal };
        } else {
          return { status: 'no_signal', log: `AI invalidated signal (${prediction.prediction}).`, signal: null };
        }
      }, `analyze_asset_${config.symbol}`, { symbol: config.symbol, strategy: config.strategy });
    } catch (e: any) {
      const error = TradingErrorHandler.createError(e.message || 'Unknown analysis error', e, { 
        symbol: config.symbol, 
        strategy: config.strategy 
      });
      
      logger.error(`Analysis failed for ${config.symbol}: ${error.message}`, { error: error.message }, botId, 'bot-context');
      emergencyStop.recordError('analysis_error', botId);
      
      return { status: 'error', log: error.message, signal: null };
    }
  }, [canUseAi, consumeAiCredit]);

  // Enhanced stop bot function
  const stopBotInstance = useCallback(async (botId: string) => {
    try {
      logger.info(`Stopping bot instance: ${botId}`, { botId }, botId, 'bot-context');
      
      // Stop WebSocket connection
      wsManager.removeConnection(botId);
      
      // Clean up references
      delete riskGuardianRefs.current[botId];
      delete circuitBreakers.current[botId];
      delete dataBufferRef.current[botId];

      // Update bot state
      setLiveBotState(prev => {
        const newBots = { ...prev.bots };
        if (newBots[botId]) {
          newBots[botId] = { 
            ...newBots[botId], 
            status: 'idle', 
            activePosition: null, 
            logs: [`[${new Date().toLocaleTimeString()}] Bot stopped.`] 
          };
        }
        return { bots: newBots };
      });

      // Save state and unregister from monitoring
      await botPersistence.saveState(botId, liveBotState.bots[botId]);
      botMonitor.unregisterBot(botId);
      
      toast({ title: `Bot ${botId} Stopped` });
      
    } catch (error: any) {
      logger.error(`Failed to stop bot ${botId}: ${error.message}`, { error: error.message }, botId, 'bot-context');
      toast({ title: "Stop Failed", description: error.message, variant: "destructive" });
    }
  }, [toast, liveBotState.bots]);
  
  // Enhanced bot cycle with circuit breaker
  const runLiveBotCycle = useCallback(async (botId: string, isNewCandle: boolean = false) => {
    const botState = liveBotState.bots[botId];
    const data = dataBufferRef.current[botId];

    if (!botState || !data || (botState.status !== 'running' && botState.status !== 'analyzing' && botState.status !== 'position_open')) {
      return;
    }
    
    if (!activeProfile) return;
    
    // Check emergency stop
    if (emergencyStop.isEmergencyActive()) {
      addLiveLog(botId, 'Emergency stop is active, suspending operations');
      return;
    }
    
    const config = botState.config;
    let currentPosition = botState.activePosition;
    
    const riskGuardian = riskGuardianRefs.current[botId];
    const { allowed, reason } = riskGuardian?.canTrade() ?? { allowed: true, reason: '' };
    
    if (!allowed) {
      addLiveLog(botId, `Risk management action: ${reason}`);
      logger.logRisk(botId, 'COOLDOWN', reason);
      setLiveBotState(prev => ({
        ...prev, 
        bots: {
          ...prev.bots, 
          [botId]: {
            ...prev.bots[botId], 
            status: 'cooldown'
          }
        }
      }));
      return; 
    }

    // Use circuit breaker for bot operations
    const circuitBreaker = circuitBreakers.current[botId] || new CircuitBreaker();
    circuitBreakers.current[botId] = circuitBreaker;

    try {
      await circuitBreaker.execute(async () => {
        const startTime = Date.now();
        
        if (currentPosition && isNewCandle) {
          const latestCandle = data[data.length - 1];
          let closePosition = false;
          let closeReason = '';
          
          if (currentPosition.action === 'UP' && latestCandle.low <= currentPosition.stopLoss) { 
            closePosition = true; 
            closeReason = 'Stop Loss'; 
          } else if (currentPosition.action === 'UP' && latestCandle.high >= currentPosition.takeProfit) { 
            closePosition = true; 
            closeReason = 'Take Profit'; 
          } else if (currentPosition.action === 'DOWN' && latestCandle.high >= currentPosition.stopLoss) { 
            closePosition = true; 
            closeReason = 'Stop Loss'; 
          } else if (currentPosition.action === 'DOWN' && latestCandle.low <= currentPosition.takeProfit) { 
            closePosition = true; 
            closeReason = 'Take Profit'; 
          }

          if (closePosition) {
            addLiveLog(botId, `Exit signal: ${closeReason} hit.`);
            
            if (config.isManual) {
              toast({ title: `Manual Exit Signal: ${config.asset}`, description: `Reason: ${closeReason}.` });
            } else {
              const side = currentPosition.action === 'UP' ? 'SELL' : 'BUY';
              const quantity = (config.capital * config.leverage) / currentPosition.entryPrice;
              
              // Validate order before placing
              const orderValidation = TradingValidator.validateOrderParams(config.asset, side, quantity);
              if (!orderValidation.isValid) {
                throw new Error(`Invalid order: ${orderValidation.errors.join(', ')}`);
              }
              
              const orderResult = await placeOrder(
                config.asset, 
                side, 
                quantity, 
                { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey }, 
                true
              );
              
              const executionTime = Date.now() - startTime;
              const pnl = side === 'SELL' ? 
                (orderResult.price - currentPosition.entryPrice) * orderResult.quantity : 
                (currentPosition.entryPrice - orderResult.price) * orderResult.quantity;
              
              // Record trade and performance
              const tradeRecord = {
                botId,
                symbol: config.asset,
                strategy: config.strategy,
                entryTime: currentPosition.timestamp,
                exitTime: Date.now(),
                entryPrice: currentPosition.entryPrice,
                exitPrice: orderResult.price,
                quantity: orderResult.quantity,
                side: currentPosition.action === 'UP' ? 'LONG' as const : 'SHORT' as const,
                pnl,
                pnlPercent: (pnl / (currentPosition.entryPrice * orderResult.quantity)) * 100,
                fees: 0, // Would need to calculate based on exchange fees
                status: 'closed' as const,
                closeReason: closeReason.toLowerCase().replace(' ', '_') as any,
                confidence: currentPosition.confidence,
                reasoning: currentPosition.reasoning,
              };
              
              analytics.recordTrade(tradeRecord);
              botMonitor.recordTrade(botId, currentPosition, true, executionTime, pnl);
              logger.logPosition(botId, 'CLOSE', config.asset, currentPosition.action === 'UP' ? 'LONG' : 'SHORT', orderResult.quantity, orderResult.price, pnl);
              
              riskGuardian?.registerTrade(pnl);
              
              toast({ 
                title: "Position Closed (Live)", 
                description: `${side} order for ${orderResult.quantity.toFixed(5)} ${config.asset} placed.` 
              });
            }
            
            setLiveBotState(prev => ({
              ...prev, 
              bots: {
                ...prev.bots, 
                [botId]: {
                  ...prev.bots[botId], 
                  activePosition: null, 
                  status: 'running'
                }
              }
            }));
          }
          return;
        }

        if (!currentPosition) {
          setLiveBotState(prev => ({
            ...prev, 
            bots: {
              ...prev.bots, 
              [botId]: {
                ...prev.bots[botId], 
                status: 'analyzing'
              }
            }
          }));
          
          const { signal, log } = await analyzeAsset({
            symbol: config.asset,
            interval: config.interval,
            strategy: config.strategy,
            strategyParams: config.strategyParams,
            takeProfit: config.takeProfit,
            stopLoss: config.stopLoss,
            useAIPrediction: config.useAIPrediction || false,
            reverse: config.reverse || false,
          }, data);
          
          if (signal) {
            addLiveLog(botId, `New trade signal: ${signal.action} at ${signal.entryPrice}`);
            
            if (config.isManual) {
              toast({ 
                title: `Manual Entry Signal: ${config.asset}`, 
                description: `Action: ${signal.action}, Entry: ${signal.entryPrice.toFixed(4)}` 
              });
            } else {
              const side = signal.action === 'UP' ? 'BUY' : 'SELL';
              const quantity = (config.capital * config.leverage) / signal.entryPrice;
              
              // Validate order before placing
              const orderValidation = TradingValidator.validateOrderParams(config.asset, side, quantity, signal.entryPrice);
              if (!orderValidation.isValid) {
                throw new Error(`Invalid order: ${orderValidation.errors.join(', ')}`);
              }
              
              const orderResult = await placeOrder(
                config.asset, 
                side, 
                quantity, 
                { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey }
              );
              
              const executionTime = Date.now() - startTime;
              
              // Record trade opening
              botMonitor.recordTrade(botId, signal, true, executionTime);
              logger.logPosition(botId, 'OPEN', config.asset, signal.action === 'UP' ? 'LONG' : 'SHORT', orderResult.quantity, orderResult.price);
              
              toast({ 
                title: "Position Opened (Live)", 
                description: `${side} order for ${quantity.toFixed(5)} ${config.asset} placed.` 
              });
            }
            
            setLiveBotState(prev => ({
              ...prev, 
              bots: {
                ...prev.bots, 
                [botId]: {
                  ...prev.bots[botId], 
                  activePosition: signal, 
                  status: 'position_open'
                }
              }
            }));
          } else {
            addLiveLog(botId, `No signal found: ${log}`);
            setLiveBotState(prev => ({
              ...prev, 
              bots: {
                ...prev.bots, 
                [botId]: {
                  ...prev.bots[botId], 
                  status: 'running'
                }
              }
            }));
          }
        }
      });
    } catch (e: any) {
      const error = TradingErrorHandler.createError(e.message || 'Unknown bot cycle error', e, { botId });
      
      addLiveLog(botId, `CRITICAL ERROR: ${error.message}`);
      logger.error(`Bot cycle error: ${error.message}`, { error: error.message }, botId, 'bot-context');
      
      botMonitor.recordError(botId, error.message, error.severity === 'critical' ? 'critical' : 'warning');
      emergencyStop.recordError('bot_cycle_error', botId);
      
      const action = TradingErrorHandler.getErrorAction(error);
      
      if (action === 'emergency_stop') {
        await emergencyStop.triggerEmergencyStop('SYSTEM_ERROR', error.message, [botId]);
      } else if (action === 'stop_bot') {
        setLiveBotState(prev => ({
          ...prev, 
          bots: {
            ...prev.bots, 
            [botId]: {
              ...prev.bots[botId], 
              status: 'error'
            }
          }
        }));
        
        if (error.message.includes('-2015') || error.message.toLowerCase().includes('invalid api-key')) {
          toast({ title: "API Key Failed!", description: "Bot stopped for safety.", variant: "destructive" });
          await stopBotInstance(botId);
        }
      }
    }
  }, [liveBotState.bots, addLiveLog, analyzeAsset, toast, stopBotInstance, activeProfile]);

  // Enhanced start bot function
  const startBotInstance = useCallback(async (config: LiveBotConfig & { id: string, isManual?: boolean }) => {
    const botId = config.id;
    
    try {
      logger.info(`Starting enhanced bot instance: ${botId}`, { config }, botId, 'bot-context');
      
      // Validate configuration and API profile
      if (activeProfile) {
        const validation = TradingValidator.validateBotStart(config, activeProfile);
        if (!validation.isValid) {
          throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
        }
        
        if (validation.warnings.length > 0) {
          toast({
            title: "Configuration Warnings",
            description: validation.warnings.join(', '),
            variant: "default"
          });
        }
      }
      
      // Initialize systems
      riskGuardianRefs.current[botId] = new RiskGuardian(config.strategyParams.discipline, config.capital);
      circuitBreakers.current[botId] = new CircuitBreaker();
      
      // Register with monitoring
      botMonitor.registerBot(botId, config);
      
      // Set initial state
      setLiveBotState(prev => ({
        ...prev, 
        bots: { 
          ...prev.bots, 
          [botId]: { 
            status: 'analyzing', 
            config, 
            logs: [`[${new Date().toLocaleTimeString()}] Enhanced bot starting...`], 
            chartData: [], 
            activePosition: null 
          } 
        }
      }));

      addLiveLog(botId, `Starting enhanced bot for ${config.asset}...`);

      if (!updateIntervalRef.current) {
        updateIntervalRef.current = setInterval(() => {
          setLiveBotState(prev => {
            const updatedBots = { ...prev.bots };
            Object.keys(dataBufferRef.current).forEach(id => {
              if (updatedBots[id]) {
                updatedBots[id] = { ...updatedBots[id], chartData: dataBufferRef.current[id] };
                // Update monitoring
                botMonitor.updateBotState(id, updatedBots[id]);
              }
            });
            return { bots: updatedBots };
          });
        }, 1000);
      }

      // Load historical data
      const klines = await getLatestKlinesByLimit(config.asset, config.interval, 1000);
      dataBufferRef.current[botId] = klines;
      addLiveLog(botId, `Loaded ${klines.length} initial candles for ${config.asset}.`);
      
      // Start analysis
      await runLiveBotCycle(botId, true);
      
      // Setup resilient WebSocket connection
      const ws = wsManager.createConnection(botId);
      const wsUrl = `wss://fstream.binance.com/ws/${config.asset.toLowerCase()}@kline_${config.interval}`;
      
      ws.addEventListener('open', () => {
        addLiveLog(botId, "Enhanced WebSocket connection established");
        logger.logWebSocket(botId, 'CONNECT', 'Connection established');
      });
      
      ws.addEventListener('error', (error: any) => {
        addLiveLog(botId, "WebSocket connection error");
        logger.logWebSocket(botId, 'ERROR', 'Connection error', { error });
        botMonitor.recordError(botId, 'WebSocket connection error');
      });
      
      ws.addEventListener('close', () => {
        addLiveLog(botId, "WebSocket connection closed");
        logger.logWebSocket(botId, 'DISCONNECT', 'Connection closed');
      });
      
      ws.addEventListener('kline', (candle: any, isClosed: boolean) => {
        const buffer = dataBufferRef.current[botId] || [];
        
        if (buffer.length > 0 && buffer[buffer.length - 1].time === candle.time) {
          buffer[buffer.length - 1] = candle;
        } else {
          buffer.push(candle);
        }
        
        dataBufferRef.current[botId] = buffer.slice(-1000);
        
        if (isClosed) {
          runLiveBotCycle(botId, true);
        }
      });
      
      // Connect WebSocket
      await ws.connect(wsUrl);
      
      // Save initial state
      await botPersistence.saveState(botId, liveBotState.bots[botId]);
      
      toast({ title: "Enhanced Bot Started", description: `Monitoring ${config.asset} on ${config.interval} with advanced features.`});
      
    } catch (error: any) {
      const tradingError = TradingErrorHandler.createError(error.message || 'Failed to start bot', error);
      
      addLiveLog(botId, `Error starting enhanced bot: ${tradingError.message}`);
      logger.error(`Failed to start enhanced bot ${botId}: ${tradingError.message}`, { error: tradingError }, botId, 'bot-context');
      
      toast({ title: "Failed to Start Enhanced Bot", description: tradingError.message, variant: "destructive"});
      
      // Clean up on failure
      await stopBotInstance(botId);
    }
  }, [addLiveLog, toast, stopBotInstance, runLiveBotCycle, activeProfile, liveBotState.bots]);
  
  // Enhanced position closing
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

    // Validate order
    const validation = TradingValidator.validateOrderParams(symbol, side, quantity);
    if (!validation.isValid) {
      toast({ title: "Invalid Order", description: validation.errors.join(', '), variant: "destructive" });
      return;
    }

    toast({ title: `Submitting close order...`, description: `${side} ${quantity} ${symbol}` });

    try {
      const orderResult = await withRetry(
        () => placeOrder(symbol, side, quantity, { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey }, true),
        'close_position',
        { symbol, side, quantity }
      );
      
      logger.logTrade('manual', side, symbol, orderResult.quantity, orderResult.price, orderResult.orderId);
      
      toast({ 
        title: "Close Order Submitted", 
        description: `${side} order for ${orderResult.quantity.toFixed(5)} ${symbol} submitted. ID: ${orderResult.orderId}` 
      });
    } catch (error: any) {
      const tradingError = TradingErrorHandler.createError(error.message || 'Failed to close position', error);
      logger.error(`Close position failed: ${tradingError.message}`, { error: tradingError }, undefined, 'bot-context');
      toast({ title: "Close Order Failed", description: tradingError.message, variant: "destructive" });
    }
  }, [toast, activeProfile]);
  
  // Enhanced test trade execution
  const executeTestTrade = useCallback(async (symbol: string, side: 'BUY' | 'SELL', capital: number, leverage: number) => {
    if (!activeProfile) {
      toast({ title: "Execution Failed", description: "An active API profile is required.", variant: "destructive" });
      return;
    }
    if (activeProfile.permissions !== 'FuturesTrading') {
      toast({ title: "Permission Denied", description: "Active API key does not have Futures Trading permission.", variant: "destructive" });
      return;
    }
    
    const testBotId = `test_${symbol}`;
    addLiveLog(testBotId, `Executing enhanced test order: ${side} ${capital}x${leverage} on ${symbol}...`);
    
    try {
      const klines = await getLatestKlinesByLimit(symbol, '1m', 1);
      if (klines.length === 0) throw new Error("Could not fetch current price.");
      
      const currentPrice = klines[0].close;
      const quantity = (capital * leverage) / currentPrice;
      
      // Validate before execution
      const orderValidation = TradingValidator.validateOrderParams(symbol, side, quantity, currentPrice);
      const positionValidation = TradingValidator.validatePositionSize(capital * leverage, capital, leverage);
      
      if (!orderValidation.isValid) {
        throw new Error(`Order validation failed: ${orderValidation.errors.join(', ')}`);
      }
      
      if (!positionValidation.isValid) {
        throw new Error(`Position validation failed: ${positionValidation.errors.join(', ')}`);
      }
      
      const orderResult = await withRetry(
        () => placeOrder(symbol, side, quantity, { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey }),
        'test_trade',
        { symbol, side, quantity, capital, leverage }
      );
      
      logger.logTrade(testBotId, side, symbol, orderResult.quantity, orderResult.price, orderResult.orderId);
      
      toast({ 
        title: "Enhanced Test Order Placed", 
        description: `${side} order for ${orderResult.quantity} ${symbol} submitted with validation.` 
      });
      
      addLiveLog(testBotId, `Enhanced test order successful. ID: ${orderResult.orderId}`);
    } catch (error: any) {
      const tradingError = TradingErrorHandler.createError(error.message || 'Test trade failed', error);
      
      logger.error(`Test trade failed: ${tradingError.message}`, { error: tradingError }, testBotId, 'bot-context');
      toast({ title: "Enhanced Test Order Failed", description: tradingError.message, variant: "destructive" });
      addLiveLog(testBotId, `Enhanced test order failed: ${tradingError.message}`);
    }
  }, [addLiveLog, toast, activeProfile]);

  // Enhanced close test position
  const closeTestPosition = useCallback(async (symbol: string, capital: number, leverage: number) => {
    if (!activeProfile) {
      toast({ title: "Action Failed", description: "An active API profile is required.", variant: "destructive" });
      return;
    }
    
    const testBotId = `test_${symbol}`;
    addLiveLog(testBotId, `Attempting to close enhanced test position for ${symbol}...`);
    
    try {
      const klines = await getLatestKlinesByLimit(symbol, '1m', 1);
      if (klines.length === 0) {
        throw new Error("Could not fetch current price.");
      }
      
      const currentPrice = klines[0].close;
      const quantity = (capital * leverage) / currentPrice;
      
      const keys = { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey };

      // Try to close both directions with enhanced error handling
      try { 
        await withRetry(
          () => placeOrder(symbol, 'SELL', quantity, keys, true),
          'close_long_test',
          { symbol, quantity }
        );
        
        logger.logTrade(testBotId, 'SELL', symbol, quantity, currentPrice);
        toast({title: "Close Signal Sent", description: `Sent SELL order for ${symbol}.`}); 
      } catch (e: any) { 
        addLiveLog(testBotId, `Could not close LONG (may not exist): ${e.message}`); 
      }
      
      try { 
        await withRetry(
          () => placeOrder(symbol, 'BUY', quantity, keys, true),
          'close_short_test', 
          { symbol, quantity }
        );
        
        logger.logTrade(testBotId, 'BUY', symbol, quantity, currentPrice);
        toast({title: "Close Signal Sent", description: `Sent BUY order for ${symbol}.`}); 
      } catch (e: any) { 
        addLiveLog(testBotId, `Could not close SHORT (may not exist): ${e.message}`); 
      }
      
    } catch (error: any) {
      const tradingError = TradingErrorHandler.createError(error.message || 'Close test position failed', error);
      
      logger.error(`Close test position failed: ${tradingError.message}`, { error: tradingError }, testBotId, 'bot-context');
      toast({ title: "Close Test Position Failed", description: tradingError.message, variant: "destructive" });
    }
  }, [addLiveLog, toast, activeProfile]);

  // New enhanced functions
  const restartBot = useCallback(async (botId: string) => {
    const bot = botInstances.find(b => b.id === botId);
    if (!bot) return;

    await stopBotInstance(botId);
    
    // Wait a moment before restarting
    setTimeout(() => {
      startBotInstance(bot);
    }, 2000);
    
    logger.info(`Bot restart initiated: ${botId}`, { botId }, botId, 'bot-context');
  }, [botInstances, stopBotInstance, startBotInstance]);

  const emergencyStopAll = useCallback(async (reason: string) => {
    logger.critical(`Emergency stop all bots: ${reason}`, { reason }, undefined, 'bot-context');
    
    const activeBotIds = Object.keys(liveBotState.bots);
    await emergencyStop.triggerEmergencyStop('MANUAL_STOP', reason, activeBotIds);
    
    // Stop all bots
    for (const botId of activeBotIds) {
      await stopBotInstance(botId);
    }
    
    toast({ title: "Emergency Stop Activated", description: `All bots stopped: ${reason}`, variant: "destructive" });
  }, [liveBotState.bots, stopBotInstance, toast]);

  const getBotLogs = useCallback((botId: string) => {
    return logger.getLogsByBot(botId);
  }, []);

  const exportBotData = useCallback((botId: string) => {
    const botData = {
      config: botInstances.find(b => b.id === botId),
      state: liveBotState.bots[botId],
      performance: analytics.getBotPerformance(botId),
      trades: analytics.getBotTrades(botId),
      logs: logger.getLogsByBot(botId),
      exportedAt: new Date().toISOString(),
    };
    
    return JSON.stringify(botData, null, 2);
  }, [botInstances, liveBotState.bots]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
      wsManager.destroyAll();
      
      // Save all bot states before cleanup
      Object.keys(liveBotState.bots).forEach(async (botId) => {
        await botPersistence.saveState(botId, liveBotState.bots[botId]);
      });
    };
  }, [liveBotState.bots]);

  return (
    <EnhancedBotContext.Provider value={{ 
      liveBotState, 
      strategyParams, 
      setStrategyParams, 
      isTradingActive,
      startBotInstance, 
      stopBotInstance, 
      closePosition,
      showRecommendation, 
      strategyRecommendation, 
      activateRecommendedStrategy, 
      dismissRecommendation,
      executeTestTrade, 
      closeTestPosition,
      botInstances, 
      setBotInstances, 
      addBotInstance,
      
      // Enhanced features
      systemHealth,
      emergencyStopActive,
      performanceMetrics,
      recentAlerts,
      restartBot,
      emergencyStopAll,
      getBotLogs,
      exportBotData,
    }}>
      {children}
    </EnhancedBotContext.Provider>
  );
};

export const useEnhancedBot = () => {
  const context = useContext(EnhancedBotContext);
  if (context === undefined) {
    throw new Error('useEnhancedBot must be used within an EnhancedBotProvider');
  }
  return context;
};

// Also export the original interface for backward compatibility
export { useBot } from './bot-context';