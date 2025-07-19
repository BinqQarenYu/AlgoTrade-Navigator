

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { HistoricalData, TradeSignal, LiveBotConfig, RankedTradeSignal, Position, SimulationState, SimulationConfig, GridState, GridConfig, GridBacktestConfig, GridBacktestSummary, MatchedGridTrade, LiveBotStateForAsset } from '@/lib/types';
import { predictMarket, type PredictMarketOutput } from "@/ai/flows/predict-market-flow";
import { getHistoricalKlines, getLatestKlinesByLimit, placeOrder } from "@/lib/binance-service";
import { addDays } from 'date-fns';
import { getStrategyById } from "@/lib/strategies";
import { useApi } from './api-context';
import { intervalToMs } from "@/lib/utils";
import { RiskGuardian } from '@/lib/risk-guardian';
import { sendTelegramMessage } from '@/lib/telegram-service';
import { usePersistentState } from '@/hooks/use-persistent-state';

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
import { defaultEmaCciMacdParams } from '@/lib/strategies/ema-cci-macd';
import { defaultCodeBasedConsensusParams } from '@/lib/strategies/code-based-consensus';
import { defaultMtfEngulfingParams } from '@/lib/strategies/mtf-engulfing';
import { defaultSmiMfiSupertrendParams } from '@/lib/strategies/smi-mfi-supertrend';

type BotInstance = LiveBotConfig & {
    id: string;
};

// --- State Types ---
interface LiveBotState {
  bots: Record<string, LiveBotStateForAsset>; // Keyed by bot instance ID
}

interface GridBacktestState {
    isBacktesting: boolean;
    backtestSummary: GridBacktestSummary | null;
    backtestTrades: MatchedGridTrade[];
    unmatchedTrades: any[];
}

// --- Context Type ---
interface BotContextType {
  liveBotState: LiveBotState;
  simulationState: SimulationState;
  gridState: GridState;
  gridBacktestState: GridBacktestState;
  strategyParams: Record<string, any>;
  setStrategyParams: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  isTradingActive: boolean;
  isAnalysisActive: boolean; // For non-trading, analysis-only processes
  startBotInstance: (config: LiveBotConfig & { id: string, isManual?: boolean }) => void;
  stopBotInstance: (botId: string) => void;
  closePosition: (position: Position) => void;
  startSimulation: (config: SimulationConfig) => void;
  stopSimulation: () => void;
  startGridSimulation: (config: GridConfig) => void;
  stopGridSimulation: () => void;
  runGridBacktest: (config: GridBacktestConfig) => void;
  // Discipline state
  showRecommendation: boolean;
  strategyRecommendation: RankedTradeSignal | null;
  activateRecommendedStrategy: (strategyId: string) => void;
  dismissRecommendation: () => void;
  // Test trade functions
  executeTestTrade: (symbol: string, side: 'BUY' | 'SELL', capital: number, leverage: number) => void;
  closeTestPosition: (symbol: string, capital: number, leverage: number) => void;
  // New bot instance management
  botInstances: BotInstance[];
  setBotInstances: React.Dispatch<React.SetStateAction<BotInstance[]>>;
  addBotInstance: (config: Partial<LiveBotConfig>) => void;
  // Config transfer
  simulationConfigForNextLoad: SimulationConfig | null;
  setSimulationConfigForNextLoad: (config: Omit<SimulationConfig, 'useAIPrediction' | 'fee'>) => void;
  clearSimulationConfig: () => void;
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
    'ema-cci-macd': defaultEmaCciMacdParams,
    'code-based-consensus': defaultCodeBasedConsensusParams,
    'mtf-engulfing': defaultMtfEngulfingParams,
    'smi-mfi-supertrend': defaultSmiMfiSupertrendParams,
};

// --- Provider Component ---
export const BotProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { apiKey, secretKey, activeProfile, profiles, setActiveProfile, canUseAi, consumeAiCredit, telegramBotToken, telegramChatId } = useApi();
  
  // --- Live Bot State ---
  const [liveBotState, setLiveBotState] = useState<LiveBotState>({ bots: {} });
  const liveWsRefs = useRef<Record<string, WebSocket | null>>({});
  const riskGuardianRefs = useRef<Record<string, RiskGuardian | null>>({});
  const dataBufferRef = useRef<Record<string, HistoricalData[]>>({});
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Discipline state ---
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [strategyRecommendation, setStrategyRecommendation] = useState<RankedTradeSignal | null>(null);

  const dismissRecommendation = () => {
    setShowRecommendation(false);
    setStrategyRecommendation(null);
  };
  
  const activateRecommendedStrategy = (strategyId: string) => {
    console.log(`Activating recommended strategy: ${strategyId}`);
    dismissRecommendation();
  };
  
  // --- Simulation State ---
   const [simulationState, setSimulationState] = useState<SimulationState>({
    isRunning: false, config: null, logs: [], chartData: [],
    portfolio: { initialCapital: 0, balance: 0, pnl: 0 },
    openPositions: [], tradeHistory: [], summary: null
  });
  const simulationWsRef = useRef<WebSocket | null>(null);
  const isAnalyzingSimRef = useRef(false);

  // --- Grid Trading State ---
  const [gridState, setGridState] = useState<GridState>({
    isRunning: false, config: null, chartData: [], grid: null, trades: [], openOrders: [], summary: null
  });
  const gridWsRef = useRef<WebSocket | null>(null);
  const currentCandleRef = useRef<Partial<HistoricalData> | null>(null);
  const candleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Grid Backtest State ---
  const [gridBacktestState, setGridBacktestState] = useState<GridBacktestState>({
    isBacktesting: false, backtestSummary: null, backtestTrades: [], unmatchedTrades: []
  });


  // --- Global State ---
  const [strategyParams, setStrategyParams] = useState<Record<string, any>>(DEFAULT_STRATEGY_PARAMS);
  const [isTradingActive, setIsTradingActive] = useState(false);
  const [isAnalysisActive, setIsAnalysisActive] = useState(false);
  const [botInstances, setBotInstances] = usePersistentState<BotInstance[]>('live-bot-instances', []);
  const [simulationConfigForNextLoad, setSimConfig] = useState<SimulationConfig | null>(null);
  
  const setSimulationConfigForNextLoad = (config: Omit<SimulationConfig, 'useAIPrediction' | 'fee'>) => {
    setSimConfig({ ...config, useAIPrediction: false, fee: 0.04 });
  };
  
  const clearSimulationConfig = () => {
      setSimConfig(null);
  };

  const addBotInstance = useCallback((config: Partial<LiveBotConfig>) => {
    const newId = `bot_${Date.now()}`;
    const newBot: BotInstance = {
      id: newId,
      asset: config.asset || '',
      interval: config.interval || '1h',
      capital: config.capital || 100,
      leverage: config.leverage || 10,
      takeProfit: config.takeProfit || 1.5,
      stopLoss: config.stopLoss || 1,
      strategy: config.strategy || '',
      strategyParams: config.strategyParams || {},
    };
    setBotInstances(prev => [...prev, newBot]);
  }, [setBotInstances]);

  useEffect(() => {
    // A live bot is active ONLY if it's not in manual mode
    const liveBotRunning = Object.values(liveBotState.bots).some(bot => 
      !bot.config.isManual && // This is the key change
      bot.status !== 'idle' && 
      bot.status !== 'error'
    );
    
    setIsTradingActive(liveBotRunning);
  }, [liveBotState.bots]);


  // --- Helper Functions ---
  const addLog = useCallback((setter: React.Dispatch<React.SetStateAction<any>>, message: string, botId?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    if (botId) {
        setter((prev: any) => ({
            ...prev,
            bots: {
                ...prev.bots,
                [botId]: {
                    ...prev.bots[botId],
                    logs: [`[${timestamp}] ${message}`, ...(prev.bots[botId]?.logs || [])].slice(0, 100),
                },
            },
        }));
    } else {
        setter((prev: any) => ({ ...prev, logs: [`[${timestamp}] ${message}`, ...(prev.logs || [])].slice(0, 100) }));
    }
  }, []);

  const addLiveLog = useCallback((botId: string, message: string) => addLog(setLiveBotState, message, botId), [addLog]);
  const addSimLog = useCallback((message: string) => addLog(setSimulationState, message), [addLog]);
  const addGridLog = useCallback((message: string) => addLog(setGridState, message), [addLog]);
  
  // --- Reusable Analysis Logic ---
  const analyzeAsset = useCallback(async (
    config: { symbol: string; interval: string; strategy: string; strategyParams: any; takeProfit: number; stopLoss: number; useAIPrediction: boolean; reverse: boolean; },
    existingData?: HistoricalData[]
  ) => {
    try {
        const dataToAnalyze = existingData && existingData.length > 50 
            ? existingData
            : await getLatestKlinesByLimit(config.symbol, config.interval, 1000);

        if (dataToAnalyze.length < 50) {
            return { status: 'error', log: 'Not enough data.', signal: null };
        }

        const strategy = getStrategyById(config.strategy);
        if (!strategy) {
          return { status: 'error', log: `Strategy '${config.strategy}' not found.`, signal: null };
        }

        const dataWithIndicators = await strategy.calculate(JSON.parse(JSON.stringify(dataToAnalyze)), config.strategyParams, config.symbol);
        const lastCandle = dataWithIndicators[dataWithIndicators.length - 1];

        if (!lastCandle || (!lastCandle.buySignal && !lastCandle.sellSignal)) {
             return { status: 'no_signal', log: 'No actionable trade setup found on the latest candle.', signal: null };
        }
        
        let strategySignal: 'BUY' | 'SELL' | null = lastCandle.buySignal ? 'BUY' : 'SELL';
        
        if (config.reverse) {
            strategySignal = strategySignal === 'BUY' ? 'SELL' : 'BUY';
        }
        
        const prediction = config.useAIPrediction ? (
            canUseAi() ? await predictMarket({
                symbol: config.symbol,
                recentData: JSON.stringify(dataWithIndicators.slice(-50).map(d => ({ t: d.time, o: d.open, h: d.high, l: d.low, c: d.close, v: d.volume }))),
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
        
        const aiConfirms = (prediction.prediction === 'UP' && strategySignal === 'BUY') || (prediction.prediction === 'DOWN' && strategySignal === 'SELL');
        
        if (aiConfirms) {
            if (config.useAIPrediction) consumeAiCredit(); // Consume credit only on confirmed signals
            const currentPrice = lastCandle.close;
            const stopLossPrice = lastCandle?.stopLossLevel ? lastCandle.stopLossLevel : prediction.prediction === 'UP' ? currentPrice * (1 - (config.stopLoss / 100)) : currentPrice * (1 + (config.stopLoss / 100));
            const takeProfitPrice = prediction.prediction === 'UP' ? currentPrice * (1 + (config.takeProfit / 100)) : currentPrice * (1 - (config.stopLoss / 100));
            
            const newSignal: TradeSignal = {
                asset: config.symbol,
                action: prediction.prediction as 'UP' | 'DOWN', entryPrice: currentPrice,
                stopLoss: stopLossPrice, takeProfit: takeProfitPrice,
                confidence: prediction.confidence, reasoning: prediction.reasoning,
                timestamp: lastCandle.time, strategy: config.strategy,
                peakPrice: lastCandle?.peakPrice
            };
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
    delete riskGuardianRefs.current[botId];
    delete dataBufferRef.current[botId];

    setLiveBotState(prev => {
        const newBots = { ...prev.bots };
        if (newBots[botId]) {
            newBots[botId] = { ...newBots[botId], status: 'idle', activePosition: null, logs: [`[${new Date().toLocaleTimeString()}] Bot stopped by user.`] };
        }
        return { bots: newBots };
    });

    toast({ title: `Bot ${botId} Stopped`, description: `The bot has been stopped.` });
  }, [toast]);
  
  const runLiveBotCycle = useCallback(async (botId: string, isNewCandle: boolean = false) => {
    // This function now relies on data being present in dataBufferRef
    const botState = liveBotState.bots[botId];
    const data = dataBufferRef.current[botId];

    if (!botState || !data || (botState.status !== 'running' && botState.status !== 'analyzing' && botState.status !== 'position_open')) return;
    if (!apiKey || !secretKey) return;
    
    const config = botState.config;
    let currentPosition = botState.activePosition;
    
    // --- DISCIPLINE CHECK ---
    const riskGuardian = riskGuardianRefs.current[botId];
    const { allowed, reason, mode } = riskGuardian?.canTrade() ?? { allowed: true, reason: '', mode: 'none' };
    if (!allowed) {
      addLiveLog(botId, `Discipline action: ${reason}`);
      setLiveBotState(prev => ({...prev, bots: {...prev.bots, [botId]: {...prev.bots[botId], status: 'cooldown'}}}));
      // Handle 'adapt' mode if needed
      return; 
    }

    try {
        // --- POSITION MANAGEMENT ---
        if (currentPosition) {
            if (!isNewCandle) return; 
            
            const latestCandle = data[data.length - 1];
            let closePosition = false;
            let closeReason = '';
            
            if (currentPosition.action === 'UP' && latestCandle.low <= currentPosition.stopLoss) { closePosition = true; closeReason = 'Stop Loss hit.'; } 
            else if (currentPosition.action === 'UP' && latestCandle.high >= currentPosition.takeProfit) { closePosition = true; closeReason = 'Take Profit hit.'; } 
            else if (currentPosition.action === 'DOWN' && latestCandle.high >= currentPosition.stopLoss) { closePosition = true; closeReason = 'Stop Loss hit.'; } 
            else if (currentPosition.action === 'DOWN' && latestCandle.low <= currentPosition.takeProfit) { closePosition = true; closeReason = 'Take Profit hit.'; }

            if (closePosition) {
                addLiveLog(botId, `Exit signal: ${closeReason}`);
                if (config.isManual) {
                    toast({ title: `Manual Exit Signal: ${config.asset}`, description: `Reason: ${closeReason}. Time to close your position.` });
                } else {
                    const side = currentPosition.action === 'UP' ? 'SELL' : 'BUY';
                    const quantity = (config.capital * config.leverage) / currentPosition.entryPrice;
                    const orderResult = await placeOrder(config.asset, side, quantity, apiKey, secretKey, true);
                    toast({ title: "Position Closed (Live)", description: `${side} order for ${orderResult.quantity.toFixed(5)} ${config.asset} placed.` });
                    const pnl = side === 'SELL' ? (orderResult.price - currentPosition.entryPrice) * orderResult.quantity : (currentPosition.entryPrice - orderResult.price) * orderResult.quantity;
                    riskGuardian?.registerTrade(pnl);
                }
                setLiveBotState(prev => ({...prev, bots: {...prev.bots, [botId]: {...prev.bots[botId], activePosition: null, status: 'running'}}}));
            }
            return; // Don't look for new trades if in a position
        }

        // --- TRADE ENTRY LOGIC ---
        if (!currentPosition) {
          setLiveBotState(prev => ({...prev, bots: {...prev.bots, [botId]: {...prev.bots[botId], status: 'analyzing'}}}));
          const { signal, log } = await analyzeAsset({symbol: config.asset, interval: config.interval, ...config}, data);
          
          if (signal) {
              addLiveLog(botId, `New trade signal found: ${signal.action} at ${signal.entryPrice}`);
              if (config.isManual) {
                 toast({ title: `Manual Entry Signal: ${config.asset}`, description: `Action: ${signal.action}, Entry: ${signal.entryPrice.toFixed(4)}` });
              } else {
                  const side = signal.action === 'UP' ? 'BUY' : 'SELL';
                  const quantity = (config.capital * config.leverage) / signal.entryPrice;
                  await placeOrder(config.asset, side, quantity, apiKey, secretKey);
                  toast({ title: "Position Opened (Live)", description: `${side} order for ${quantity.toFixed(5)} ${config.asset} placed.` });
              }
              setLiveBotState(prev => ({...prev, bots: {...prev.bots, [botId]: {...prev.bots[botId], activePosition: signal, status: 'position_open'}}}));
          } else {
              addLiveLog(botId, `No trade signal found. Reason: ${log}`);
              setLiveBotState(prev => ({...prev, bots: {...prev.bots, [botId]: {...prev.bots[botId], status: 'running'}}}));
          }
        }
    } catch (e: any) {
        addLiveLog(botId, `CRITICAL ERROR in trade cycle: ${e.message}`);
        setLiveBotState(prev => ({...prev, bots: {...prev.bots, [botId]: {...prev.bots[botId], status: 'error'}}}));
        if (e.message.includes('-2015') || e.message.toLowerCase().includes('invalid api-key')) {
            toast({ title: "Live Trading API Key Failed!", description: "The bot has been stopped for safety.", variant: "destructive" });
            stopBotInstance(botId);
        }
    }
  }, [liveBotState.bots, addLiveLog, analyzeAsset, apiKey, secretKey, toast, stopBotInstance]);


  const startBotInstance = useCallback(async (config: LiveBotConfig & { id: string, isManual?: boolean }) => {
    const botId = config.id;
    addLiveLog(botId, `Starting bot for ${config.asset}...`);
    riskGuardianRefs.current[botId] = new RiskGuardian(config.strategyParams.discipline, config.capital);
    
    setLiveBotState(prev => ({
        ...prev,
        bots: {
            ...prev.bots,
            [botId]: { status: 'analyzing', config, logs: [`[${new Date().toLocaleTimeString()}] Bot starting...`], chartData: [], activePosition: null },
        },
    }));

    if (!updateIntervalRef.current) {
        updateIntervalRef.current = setInterval(() => {
            setLiveBotState(prev => {
                const updatedBots = { ...prev.bots };
                Object.keys(dataBufferRef.current).forEach(id => {
                    if (updatedBots[id]) {
                        updatedBots[id] = { ...updatedBots[id], chartData: dataBufferRef.current[id] };
                    }
                });
                return { bots: updatedBots };
            });
        }, 1000);
    }

    try {
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
          const newCandle: HistoricalData = {
            time: data.k.t, open: parseFloat(data.k.o), high: parseFloat(data.k.h),
            low: parseFloat(data.k.l), close: parseFloat(data.k.c), volume: parseFloat(data.k.v),
          };
          
          const buffer = dataBufferRef.current[botId] || [];
          if (buffer.length > 0 && buffer[buffer.length - 1].time === newCandle.time) {
            buffer[buffer.length - 1] = newCandle;
          } else {
            buffer.push(newCandle);
          }
          dataBufferRef.current[botId] = buffer.slice(-1000); // Keep buffer size fixed

          if (data.k.x) { // If candle is closed
            runLiveBotCycle(botId, true);
          }
        }
      };
      
      ws.onopen = () => addLiveLog(botId, "Live data stream connected.");
      ws.onerror = () => addLiveLog(botId, "Live data stream error.");
      ws.onclose = () => addLiveLog(botId, "Live data stream closed.");
      
      toast({ title: "Bot Started", description: `Monitoring ${config.asset} on the ${config.interval} interval.`});

    } catch (error: any) {
        addLiveLog(botId, `Error starting bot: ${error.message}`);
        toast({ title: "Failed to Start Bot", description: error.message, variant: "destructive"});
        stopBotInstance(botId);
    }
  }, [addLiveLog, toast, stopBotInstance, runLiveBotCycle]);
  
  const closePosition = useCallback(async (position: Position) => {
    if (!activeProfile || !apiKey || !secretKey) {
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
        const orderResult = await placeOrder(symbol, side, quantity, apiKey, secretKey, true);
        
        toast({
            title: "Close Order Submitted",
            description: `${side} order for ${orderResult.quantity.toFixed(5)} ${symbol} submitted. Order ID: ${orderResult.orderId}`
        });
    } catch (e: any) {
        toast({ title: "Close Order Failed", description: e.message || "An unknown error occurred.", variant: "destructive" });
    }
  }, [apiKey, secretKey, toast, activeProfile]);
  
  // --- Simulation Logic ---
  const handleSimulationTick = useCallback(async (newCandle: HistoricalData) => {
    setSimulationState(current => {
      if (!current.isRunning || !current.config) return current;
      isAnalyzingSimRef.current = true;

      let { chartData, openPositions, tradeHistory, portfolio } = current;
      const config = current.config;

      if (chartData.length > 0 && chartData[chartData.length - 1].time === newCandle.time) {
        chartData[chartData.length - 1] = newCandle;
      } else {
        chartData.push(newCandle);
        chartData = chartData.slice(-1000);
      }

      const updatedPositions = [...openPositions];
      const newTrades: any[] = [];

      for (const pos of openPositions) {
        let exitPrice: number | null = null;
        let closeReason: any = 'signal';

        if (pos.side === 'long') {
          if (newCandle.low <= pos.stopLoss) { exitPrice = pos.stopLoss; closeReason = 'stop-loss'; }
          else if (newCandle.high >= pos.takeProfit) { exitPrice = pos.takeProfit; closeReason = 'take-profit'; }
        } else {
          if (newCandle.high >= pos.stopLoss) { exitPrice = pos.stopLoss; closeReason = 'stop-loss'; }
          else if (newCandle.low <= pos.takeProfit) { exitPrice = pos.takeProfit; closeReason = 'take-profit'; }
        }

        if (exitPrice) {
          const entryValue = pos.entryPrice * pos.size;
          const exitValue = exitPrice * pos.size;
          const pnl = pos.side === 'long' ? exitValue - entryValue : entryValue - exitValue;
          const fee = (entryValue + exitValue) * (config.fee / 100);
          const netPnl = pnl - fee;

          const trade = {
            id: pos.id, type: pos.side, entryTime: pos.entryTime, entryPrice: pos.entryPrice,
            exitTime: newCandle.time, exitPrice, pnl: netPnl, pnlPercent: (netPnl / portfolio.balance) * 100,
            closeReason, stopLoss: pos.stopLoss, takeProfit: pos.takeProfit, fee,
          };
          
          newTrades.push(trade);
          addSimLog(`Closed ${pos.side.toUpperCase()} position for ${pos.asset} for $${netPnl.toFixed(2)} PNL.`);
          portfolio.balance += netPnl;
          portfolio.pnl += netPnl;
        }
      }

      const stillOpenPositions = updatedPositions.filter(p => !newTrades.find(t => t.id === p.id));
      
      if (stillOpenPositions.length === 0) {
        analyzeAsset(config, chartData).then(result => {
          if (result.signal) {
            setSimulationState(prev => {
              if (prev.openPositions.length > 0) return prev;
              const newPosSize = (prev.portfolio.balance * config.leverage) / result.signal!.entryPrice;
              const newPosition = {
                id: `sim_${Date.now()}`, asset: config.symbol, side: result.signal!.action === 'UP' ? 'long' : 'short',
                entryPrice: result.signal!.entryPrice, entryTime: result.signal!.timestamp, size: newPosSize,
                stopLoss: result.signal!.stopLoss, takeProfit: result.signal!.takeProfit,
              };
              
              addSimLog(`Opening new ${newPosition.side.toUpperCase()} position for ${newPosition.asset} at $${newPosition.entryPrice.toFixed(4)}.`);
              return { ...prev, openPositions: [...prev.openPositions, newPosition] };
            });
          }
        });
      }
      
      const allTrades = [...tradeHistory, ...newTrades];
      const wins = allTrades.filter(t => t.pnl > 0);
      const losses = allTrades.filter(t => t.pnl <= 0);
      const totalPnl = allTrades.reduce((sum, t) => sum + t.pnl, 0);
      const totalFees = allTrades.reduce((sum, t) => sum + (t.fee || 0), 0);
      const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
      const totalLosses = losses.reduce((sum, t) => sum + t.pnl, 0);

      const summary = {
        totalTrades: allTrades.length,
        winRate: allTrades.length > 0 ? (wins.length / allTrades.length) * 100 : 0,
        totalPnl: totalPnl,
        totalFees,
        averageWin: wins.length > 0 ? totalWins / wins.length : 0,
        averageLoss: losses.length > 0 ? Math.abs(totalLosses / losses.length) : 0,
        profitFactor: totalLosses !== 0 ? Math.abs(totalWins / totalLosses) : Infinity,
        initialCapital: config.initialCapital,
        endingBalance: portfolio.balance,
        totalReturnPercent: config.initialCapital > 0 ? (totalPnl / config.initialCapital) * 100 : 0
      };

      isAnalyzingSimRef.current = false;
      return {
        ...current,
        chartData,
        openPositions: stillOpenPositions,
        tradeHistory: [...tradeHistory, ...newTrades],
        portfolio,
        summary,
      };
    });
  }, [addSimLog, analyzeAsset]);

  const stopSimulation = useCallback(() => {
    if (simulationWsRef.current) {
        simulationWsRef.current.close();
        simulationWsRef.current = null;
    }
    isAnalyzingSimRef.current = false;
    setSimulationState(prev => ({...prev, isRunning: false, config: null}));
    addSimLog("Simulation stopped by user.");
    toast({ title: "Simulation Stopped" });
  }, [addSimLog, toast]);

  const startSimulation = useCallback(async (config: SimulationConfig) => {
    addSimLog("Starting simulation...");
    stopSimulation();
    
    setSimulationState({
        isRunning: true, config, logs: [`[${new Date().toLocaleTimeString()}] Simulation starting...`],
        chartData: [],
        portfolio: { initialCapital: config.initialCapital, balance: config.initialCapital, pnl: 0 },
        openPositions: [], tradeHistory: [], summary: null
    });
    
    try {
        const initialKlines = await getLatestKlinesByLimit(config.symbol, config.interval, 500);
        setSimulationState(prev => ({...prev, chartData: initialKlines}));
        addSimLog(`Loaded ${initialKlines.length} initial candles.`);

        const ws = new WebSocket(`wss://fstream.binance.com/ws/${config.symbol.toLowerCase()}@kline_${config.interval}`);
        simulationWsRef.current = ws;

        ws.onopen = () => addSimLog("Live data connection established.");
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.e === 'kline' && data.k.x) {
                const newCandle: HistoricalData = {
                    time: data.k.t, open: parseFloat(data.k.o), high: parseFloat(data.k.h),
                    low: parseFloat(data.k.l), close: parseFloat(data.k.c), volume: parseFloat(data.k.v),
                };
                handleSimulationTick(newCandle);
            }
        };
        ws.onerror = () => addSimLog("WebSocket connection error.");
        ws.onclose = () => addSimLog("WebSocket connection closed.");
        
        toast({ title: "Simulation Started", description: `Monitoring ${config.symbol} with simulated funds.` });

    } catch (e: any) {
        addSimLog(`Error starting simulation: ${e.message}`);
        toast({ title: "Failed to Start", description: e.message, variant: "destructive" });
        stopSimulation();
    }
  }, [addSimLog, toast, stopSimulation, handleSimulationTick]);
  
  // --- Grid Trading Logic ---
  const stopGridSimulation = useCallback(() => {
    addGridLog("Stopping grid forward-test.");
    if (gridWsRef.current) {
        gridWsRef.current.close();
        gridWsRef.current = null;
    }
     if (candleTimerRef.current) {
        clearInterval(candleTimerRef.current);
        candleTimerRef.current = null;
    }
    currentCandleRef.current = null;
    setGridState(prev => ({ ...prev, isRunning: false }));
  }, [addGridLog]);
  
  const handleGridTick = useCallback((price: number, time: number) => {
    setGridState(current => {
        if (!current.isRunning || !current.grid || !current.config) return current;

        let { openOrders, trades, summary, grid, config } = current;

        if (!currentCandleRef.current || currentCandleRef.current.time !== time) {
            currentCandleRef.current = { time, open: price, high: price, low: price, close: price, volume: 0 };
        } else {
            currentCandleRef.current.high = Math.max(currentCandleRef.current.high!, price);
            currentCandleRef.current.low = Math.min(currentCandleRef.current.low!, price);
            currentCandleRef.current.close = price;
        }

        if (config.stopLossPrice && price <= config.stopLossPrice) {
            addGridLog(`GLOBAL STOP LOSS triggered at ${price}. Stopping forward-test.`);
            stopGridSimulation();
            return { ...current, isRunning: false };
        }
        if (config.takeProfitPrice && price >= config.takeProfitPrice) {
            addGridLog(`GLOBAL TAKE PROFIT triggered at ${price}. Stopping forward-test.`);
            stopGridSimulation();
            return { ...current, isRunning: false };
        }
        
        const highestGridLine = Math.max(...grid.levels);
        const lowestGridLine = Math.min(...grid.levels);

        const canTrailUp = config.trailingUp && (!config.trailingUpTriggerPrice || price > config.trailingUpTriggerPrice);
        const canTrailDown = config.trailingDown && (!config.trailingDownTriggerPrice || price < config.trailingDownTriggerPrice);
        
        let gridShifted = false;
        if (canTrailUp && price > highestGridLine) {
            const shiftAmount = price - highestGridLine;
            addGridLog(`Trailing Up: Price broke upper bound. Shifting grid up by ${shiftAmount.toFixed(4)}.`);
            grid.levels = grid.levels.map(level => level + shiftAmount);
            gridShifted = true;
        } else if (canTrailDown && price < lowestGridLine) {
            const shiftAmount = lowestGridLine - price;
            addGridLog(`Trailing Down: Price broke lower bound. Shifting grid down by ${shiftAmount.toFixed(4)}.`);
            grid.levels = grid.levels.map(level => level - shiftAmount);
            gridShifted = true;
        }
        
        if (gridShifted) {
             const currentPrice = price; 
            if (config.direction === 'long') {
                openOrders = grid.levels.filter(p => p <= currentPrice).map(p => ({ price: p, side: 'buy' }));
            } else if (config.direction === 'short') {
                openOrders = grid.levels.filter(p => p >= currentPrice).map(p => ({ price: p, side: 'sell' }));
            } else { 
                openOrders = grid.levels.map(p => ({ price: p, side: p < currentPrice ? 'buy' : 'sell' }));
            }
            config.lowerPrice = Math.min(...grid.levels);
            config.upperPrice = Math.max(...grid.levels);
        }

        const newTrades: any[] = [];
        let stillOpenOrders = [...openOrders];

        stillOpenOrders = stillOpenOrders.filter(order => {
            const isBuy = order.side === 'buy';
            const priceCrossed = isBuy ? price <= order.price : price >= order.price;

            if (priceCrossed) {
                const trade = { id: `grid_${order.price}_${time}_${Math.random()}`, time, price: order.price, side: order.side };
                newTrades.push(trade);
                
                if (config.direction === 'long' && isBuy) {
                    const newSellPrice = order.price + grid.profitPerGrid;
                    if (newSellPrice <= config.upperPrice) {
                        stillOpenOrders.push({ price: newSellPrice, side: 'sell' });
                    }
                } else if (config.direction === 'short' && !isBuy) {
                    const newBuyPrice = order.price - grid.profitPerGrid;
                    if (newBuyPrice >= config.lowerPrice) {
                        stillOpenOrders.push({ price: newBuyPrice, side: 'buy' });
                    }
                } else if (config.direction === 'neutral') {
                    const newOrderPrice = isBuy ? order.price + grid.profitPerGrid : order.price - profitPerGrid;
                    if (newOrderPrice > 0 && newOrderPrice >= config.lowerPrice && newOrderPrice <= config.upperPrice) {
                        stillOpenOrders.push({ price: newOrderPrice, side: isBuy ? 'sell' : 'buy' });
                    }
                }
                
                if (summary) {
                    summary.totalPnl += grid.profitPerGrid * grid.quantityPerGrid;
                    summary.gridPnl += grid.profitPerGrid * grid.quantityPerGrid;
                    summary.totalTrades += 1;
                }
                return false;
            }
            return true;
        });
        
        return {
            ...current,
            openOrders: stillOpenOrders,
            trades: [...trades, ...newTrades],
            summary: summary ? {...summary} : current.summary,
            grid: {...grid},
            config: {...config},
        };
    });
  }, [addGridLog, stopGridSimulation]);

  const startGridSimulation = useCallback(async (config: GridConfig) => {
    stopGridSimulation();
    addGridLog(`Creating grid for ${config.symbol}...`);
    
    let gridLevels: number[] = [];
    let profitPerGrid = 0;
    if (config.mode === 'arithmetic') {
        const priceStep = (config.upperPrice - config.lowerPrice) / (config.gridCount - 1);
        profitPerGrid = priceStep;
        for (let i = 0; i < config.gridCount; i++) {
            gridLevels.push(config.lowerPrice + i * priceStep);
        }
    } else {
        const ratio = Math.pow(config.upperPrice / config.lowerPrice, 1 / (config.gridCount - 1));
        for (let i = 0; i < config.gridCount; i++) {
            const price = config.lowerPrice * Math.pow(ratio, i);
            gridLevels.push(price);
        }
        profitPerGrid = (gridLevels[1] - gridLevels[0]);
    }

    const investmentPerGrid = (config.investment * config.leverage) / config.gridCount;
    const quantityPerGrid = investmentPerGrid / (gridLevels.reduce((a, b) => a + b, 0) / gridLevels.length);

    const newGrid = {
        levels: gridLevels,
        profitPerGrid,
        quantityPerGrid,
    };
    
    toast({ title: "Grid Live Simulation Started", description: `Grid created for ${config.symbol}.` });
    
    try {
        const initialKlines = await getLatestKlinesByLimit(config.symbol, config.interval, 500);
        const currentPrice = initialKlines.length > 0 ? initialKlines[initialKlines.length-1].close : (config.lowerPrice + config.upperPrice) / 2;
        
        let initialOrders: { price: number; side: 'buy' | 'sell' }[] = [];
        if (config.direction === 'long') {
            initialOrders = gridLevels.filter(p => p <= currentPrice).map(price => ({ price, side: 'buy' }));
            addGridLog(`Long mode: Placing ${initialOrders.length} buy orders.`);
        } else if (config.direction === 'short') {
            initialOrders = gridLevels.filter(p => p >= currentPrice).map(price => ({ price, side: 'sell' }));
            addGridLog(`Short mode: Placing ${initialOrders.length} sell orders.`);
        } else {
            initialOrders = gridLevels.map(price => ({ price, side: price < currentPrice ? 'buy' : 'sell' }));
            addGridLog(`Neutral mode: Placing ${initialOrders.filter(o=>o.side==='buy').length} buy and ${initialOrders.filter(o=>o.side==='sell').length} sell orders.`);
        }

        setGridState({
            isRunning: true,
            config,
            grid: newGrid,
            chartData: initialKlines,
            trades: [],
            openOrders: initialOrders,
            summary: { totalPnl: 0, gridPnl: 0, totalTrades: 0 },
        });

        addGridLog(`Loaded ${initialKlines.length} initial candles for live simulation.`);
        
        const intervalMs = intervalToMs(config.interval);
        candleTimerRef.current = setInterval(() => {
            if (currentCandleRef.current) {
                setGridState(prev => {
                    const newChartData = [...prev.chartData];
                    const lastCandle = newChartData[newChartData.length-1];
                    if(lastCandle && lastCandle.time === currentCandleRef.current!.time) {
                        newChartData[newChartData.length - 1] = currentCandleRef.current as HistoricalData;
                    } else if (currentCandleRef.current) {
                        newChartData.push(currentCandleRef.current as HistoricalData);
                    }
                    return {...prev, chartData: newChartData.slice(-1000)};
                });
            }
        }, 1000);

        const ws = new WebSocket(`wss://fstream.binance.com/ws/${config.symbol.toLowerCase()}@aggTrade`);
        gridWsRef.current = ws;

        ws.onopen = () => addGridLog("Grid live simulation feed connected.");
        ws.onmessage = (event) => {
            const trade = JSON.parse(event.data);
            if (trade.e === 'aggTrade') {
                const price = parseFloat(trade.p);
                const time = trade.T;
                handleGridTick(price, time);
            }
        };
        ws.onerror = () => addGridLog("Grid live simulation WebSocket error.");
        ws.onclose = () => addGridLog("Grid live simulation WebSocket closed.");

    } catch (e: any) {
        addGridLog(`Error starting grid live simulation: ${e.message}`);
        toast({ title: "Grid Start Failed", description: e.message, variant: "destructive" });
        stopGridSimulation();
    }
  }, [addGridLog, toast, stopGridSimulation, handleGridTick]);

  // --- Grid Backtest Logic ---
  const runGridBacktest = useCallback(async (config: GridBacktestConfig) => {
    setGridBacktestState({ isBacktesting: true, backtestSummary: null, backtestTrades: [], unmatchedTrades: [] });
    toast({ title: "Grid Backtest Started", description: `Fetching data for ${config.symbol} for the last ${config.backtestDays} days...` });
    try {
        const endTime = Date.now();
        const startTime = addDays(endTime, -config.backtestDays).getTime();
        const klines = await getHistoricalKlines(config.symbol, config.interval, startTime, endTime);

        toast({ title: "Data Loaded", description: `Running backtest on ${klines.length} candles...` });

        let gridLevels: number[] = [];
        let profitPerGrid = 0;
        if (config.mode === 'arithmetic') {
            const priceStep = (config.upperPrice - config.lowerPrice) / (config.gridCount - 1);
            profitPerGrid = priceStep;
            for (let i = 0; i < config.gridCount; i++) gridLevels.push(config.lowerPrice + i * priceStep);
        } else {
            const ratio = Math.pow(config.upperPrice / config.lowerPrice, 1 / (config.gridCount - 1));
            for (let i = 0; i < config.gridCount; i++) gridLevels.push(config.lowerPrice * Math.pow(ratio, i));
            profitPerGrid = (gridLevels[1] - gridLevels[0]);
        }
        const investmentPerGrid = (config.investment * config.leverage) / config.gridCount;
        const avgGridPrice = gridLevels.reduce((a, b) => a + b, 0) / gridLevels.length;
        const quantityPerGrid = investmentPerGrid / avgGridPrice;
        
        let openOrders: { price: number; side: 'buy' | 'sell' }[] = [];
        const initialPrice = klines[0].close;

        if (config.direction === 'long') {
            openOrders = gridLevels.filter(p => p <= initialPrice).map(price => ({ price, side: 'buy' }));
        } else if (config.direction === 'short') {
            openOrders = gridLevels.filter(p => p >= initialPrice).map(price => ({ price, side: 'sell' }));
        } else {
            openOrders = gridLevels.map(price => ({ price, side: price < initialPrice ? 'buy' : 'sell' }));
        }

        let gridPnl = 0;
        const matchedTrades: MatchedGridTrade[] = [];
        const openBuys: any[] = [];

        for (const candle of klines) {
            let stillOpenOrders: { price: number, side: 'buy' | 'sell' }[] = [];
        
            const ordersThisCandle: { price: number, side: 'buy' | 'sell' }[] = [];
            
            for (const order of openOrders) {
                if (order.side === 'buy' && candle.low <= order.price) {
                    ordersThisCandle.push(order);
                } else if (order.side === 'sell' && candle.high >= order.price) {
                    ordersThisCandle.push(order);
                } else {
                    stillOpenOrders.push(order);
                }
            }

            ordersThisCandle.sort((a,b) => a.side === 'sell' ? -1 : 1);

            for (const order of ordersThisCandle) {
                const trade = { id: `bt_${order.price}_${candle.time}`, time: candle.time, price: order.price, side: order.side };
                
                if (trade.side === 'buy') {
                    openBuys.push(trade);
                    const takeProfitPrice = order.price + profitPerGrid;
                    if (takeProfitPrice <= config.upperPrice) {
                        stillOpenOrders.push({ price: takeProfitPrice, side: 'sell' });
                    }
                } else {
                    if (openBuys.length > 0) {
                        const matchedBuy = openBuys.shift()!;
                        const pnl = (trade.price - matchedBuy.price) * quantityPerGrid;
                        gridPnl += pnl;
                        matchedTrades.push({ id: `match_${matchedBuy.id}`, pnl, buy: matchedBuy, sell: trade });
                    }
                    const newBuyPrice = order.price - profitPerGrid;
                    if (newBuyPrice >= config.lowerPrice) {
                        stillOpenOrders.push({ price: newBuyPrice, side: 'buy' });
                    }
                }
            }
            openOrders = stillOpenOrders;
        }
        
        const totalTrades = matchedTrades.length * 2 + openBuys.length;
        const endPrice = klines[klines.length - 1].close;
        const unrealizedPnl = openBuys.reduce((acc, buy) => acc + (endPrice - buy.price) * quantityPerGrid, 0);

        const totalPnl = gridPnl + unrealizedPnl;
        const maxDrawdown = 0;
        const totalFees = totalTrades * (avgGridPrice * quantityPerGrid * 0.04 / 100);
        const apr = (totalPnl / config.investment) / config.backtestDays * 365 * 100;
        
        const summary: GridBacktestSummary = { totalPnl, gridPnl, unrealizedPnl, totalTrades, maxDrawdown, totalFees, apr };
        setGridBacktestState({ isBacktesting: false, backtestSummary: summary, backtestTrades: matchedTrades, unmatchedTrades: openBuys });
        toast({ title: "Backtest Complete", description: "Grid strategy performance report is ready." });

    } catch (e: any) {
        toast({ title: "Backtest Failed", description: e.message, variant: "destructive" });
        setGridBacktestState({ isBacktesting: false, backtestSummary: null, backtestTrades: [], unmatchedTrades: [] });
    }
  }, [toast]);
  
  // --- Test Trade Logic ---
  const executeTestTrade = useCallback(async (symbol: string, side: 'BUY' | 'SELL', capital: number, leverage: number) => {
    if (!activeProfile || !apiKey || !secretKey) {
        toast({ title: "Execution Failed", description: "An active API profile is required.", variant: "destructive" });
        return;
    }
     if (activeProfile.permissions !== 'FuturesTrading') {
        toast({ title: "Permission Denied", description: "Your active API key does not have Futures Trading permission.", variant: "destructive" });
        return;
    }
    
    addLiveLog(symbol, `Executing test order: ${side} ${capital}x${leverage} on ${symbol}...`);
    try {
        const klines = await getLatestKlinesByLimit(symbol, '1m', 1);
        if (klines.length === 0) {
            throw new Error("Could not fetch current price to calculate quantity.");
        }
        const currentPrice = klines[0].close;
        const quantity = (capital * leverage) / currentPrice;

        const orderResult = await placeOrder(symbol, side, quantity, apiKey, secretKey);
        toast({
            title: "Test Order Placed Successfully",
            description: `${side} order for ${orderResult.quantity} ${symbol} submitted.`
        });
        addLiveLog(symbol, `Test order successful. Order ID: ${orderResult.orderId}`);
    } catch (e: any) {
        toast({ title: "Test Order Failed", description: e.message, variant: "destructive" });
        addLiveLog(symbol, `Test order failed: ${e.message}`);
    }
  }, [addLiveLog, toast, activeProfile, apiKey, secretKey]);

  const closeTestPosition = useCallback(async (symbol: string, capital: number, leverage: number) => {
    addLiveLog(symbol, `Attempting to close any open test position for ${symbol}...`);
    
    if (!activeProfile || !apiKey || !secretKey) {
        toast({ title: "Execution Failed", description: "An active API profile is required.", variant: "destructive" });
        return;
    }
    
    const klines = await getLatestKlinesByLimit(symbol, '1m', 1);
    if (klines.length === 0) {
      toast({ title: "Close Failed", description: "Could not fetch current price.", variant: "destructive" });
      return;
    }
    const currentPrice = klines[0].close;
    const quantity = (capital * leverage) / currentPrice;
    
    // Attempt to close both a long and a short position.
    try {
      await placeOrder(symbol, 'SELL', quantity, apiKey, secretKey, true);
      toast({title: "Close Signal Sent", description: `Sent SELL order to close any open LONG position for ${symbol}.`});
    } catch (e: any) {
      addLiveLog(symbol, `Could not close LONG (may not exist): ${e.message}`);
    }

    try {
      await placeOrder(symbol, 'BUY', quantity, apiKey, secretKey, true);
      toast({title: "Close Signal Sent", description: `Sent BUY order to close any open SHORT position for ${symbol}.`});
    } catch (e: any) {
      addLiveLog(symbol, `Could not close SHORT (may not exist): ${e.message}`);
    }
  }, [addLiveLog, toast, activeProfile, apiKey, secretKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(liveWsRefs.current).forEach(ws => ws?.close());
      if (simulationWsRef.current) simulationWsRef.current.close();
      if (gridWsRef.current) gridWsRef.current.close();
      if (candleTimerRef.current) clearInterval(candleTimerRef.current);
       if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    }
  }, []);

  return (
    <BotContext.Provider value={{ 
      liveBotState, 
      simulationState,
      gridState,
      gridBacktestState,
      strategyParams,
      setStrategyParams,
      isTradingActive,
      isAnalysisActive,
      startBotInstance,
      stopBotInstance,
      closePosition,
      startSimulation,
      stopSimulation,
      startGridSimulation,
      stopGridSimulation,
      runGridBacktest,
      showRecommendation,
      strategyRecommendation,
      activateRecommendedStrategy,
      dismissRecommendation,
      executeTestTrade,
      closeTestPosition,
      botInstances,
      setBotInstances,
      addBotInstance,
      simulationConfigForNextLoad,
      setSimulationConfigForNextLoad,
      clearSimulationConfig
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
