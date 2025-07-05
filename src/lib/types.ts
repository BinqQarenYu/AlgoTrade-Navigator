

export type OrderSide = 'BUY' | 'SELL';

export type OrderResult = {
  orderId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number; // For market orders, this would be the fill price
  timestamp: number;
};

export type Position = {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  leverage: string;
};

export type Trade = {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  size: number;
  price: number;
  time: string; // Formatted for display
  timestamp: number; // Raw for sorting
};

export type HistoricalData = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buySignal?: number;
  sellSignal?: number;
  sma_short?: number | null;
  sma_long?: number | null;
  ema_short?: number | null;
  ema_long?: number | null;
  rsi?: number | null;
  stopLossLevel?: number;
  peakPrice?: number;
  poc?: number;
  volumeDelta?: number;
  cumulativeVolumeDelta?: number;
  bb_upper?: number | null;
  bb_middle?: number | null;
  bb_lower?: number | null;
  macd?: number | null;
  macd_signal?: number | null;
  macd_hist?: number | null;
  supertrend?: number | null;
  supertrend_direction?: number | null;
  atr?: number | null;
  donchian_upper?: number | null;
  donchian_middle?: number | null;
  donchian_lower?: number | null;
  tenkan_sen?: number | null;
  kijun_sen?: number | null;
  senkou_a?: number | null;
  senkou_b?: number | null;
  chikou_span?: number | null;
  // New indicators for 14 new strategies
  stoch_k?: number | null;
  stoch_d?: number | null;
  keltner_upper?: number | null;
  keltner_middle?: number | null;
  keltner_lower?: number | null;
  vwap?: number | null;
  psar?: number | null;
  psar_direction?: number | null;
  momentum?: number | null;
  awesome_oscillator?: number | null;
  williams_r?: number | null;
  cci?: number | null;
  ha_open?: number;
  ha_high?: number;
  ha_low?: number;
  ha_close?: number;
  pivot_point?: number | null;
  s1?: number | null;
  s2?: number | null;
  s3?: number | null;
  r1?: number | null;
  r2?: number | null;
  r3?: number | null;
  obv?: number | null;
  cmf?: number | null;
  coppock?: number | null;
  bull_power?: number | null;
  bear_power?: number | null;
};

export type Portfolio = {
  balance: number;
  totalPnl: number;
  dailyVolume: number;
};

export type StreamedDataPoint = {
  id: number; // Aggregate trade ID
  time: number;
  price: number;
  volume: number;
};

export type BacktestResult = {
  id: string;
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  closeReason: 'signal' | 'take-profit' | 'stop-loss';
  type: 'long' | 'short';
  stopLoss: number;
  takeProfit: number;
  fee: number;
  reasoning?: string;
  confidence?: number;
};

export type BacktestSummary = {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  initialCapital: number;
  endingBalance: number;
  totalReturnPercent: number;
  totalFees: number;
};

export type ApiProfile = {
  id: string;
  name: string;
  apiKey: string;
  secretKey: string;
  permissions: 'ReadOnly' | 'FuturesTrading';
};

export type TradeSignal = {
  action: 'UP' | 'DOWN';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  reasoning: string;
  timestamp: Date;
  exitTimestamp?: Date;
  strategy: string;
  peakPrice?: number;
  asset: string;
};

export type RankedTradeSignal = TradeSignal & {
  rank: number;
  justification: string;
};
    
export type LiveBotConfig = {
    symbol: string;
    interval: string;
    strategy: string;
    strategyParams: any;
    initialCapital: number;
    leverage: number;
    takeProfit: number;
    stopLoss: number;
    marginType: string;
    useAIPrediction: boolean;
    fee: number;
};

export type ManualTraderConfig = {
    symbol: string;
    interval: string;
    strategy: string;
    strategyParams: any;
    initialCapital: number;
    leverage: number;
    takeProfit: number;
    stopLoss: number;
    useAIPrediction: boolean;
    fee: number;
}

export interface ManualTraderState {
  isAnalyzing: boolean;
  isExecuting: boolean;
  logs: string[];
  signal: TradeSignal | null;
  chartData: HistoricalData[];
}

export type MultiSignalConfig = {
    assets: string[];
    interval: string;
    strategy: string;
    strategyParams: any;
    takeProfit: number;
    stopLoss: number;
    useAIPrediction: boolean;
};

export interface SignalResult {
    signal: TradeSignal | null;
    status: 'idle' | 'monitoring' | 'analyzing' | 'error' | 'no_signal';
    log: string;
}

export interface MultiSignalState {
  isRunning: boolean;
  config: MultiSignalConfig | null;
  results: Record<string, SignalResult>; // Keyed by asset symbol
  logs: string[];
}

export type ScreenerConfig = {
  asset: string;
  strategies: string[];
  strategyParams: Record<string, any>;
  interval: string;
};

export type PricePredictionOutput = {
    predictedPrice: number;
    confidence: number;
    reasoning: string;
};

export type StrategyAnalysisInput = {
    name: string;
    signal: string | null;
    indicators: Record<string, any>;
};

export interface ScreenerState {
  isRunning: boolean;
  config: ScreenerConfig | null;
  prediction: PricePredictionOutput | null;
  strategyInputs: StrategyAnalysisInput[];
  logs: string[];
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  calculate: (data: HistoricalData[], params?: any) => Promise<HistoricalData[]>;
}

export type CoinSentimentData = {
  id: string;
  symbol: string;
  name: string;
  sentimentUp?: number;
  image?: string;
};

export type CoinDetails = CoinSentimentData & {
  description: string | null;
  marketCapRank: number | null;
  publicInterestScore?: number;
  marketCap: number;
  priceChange24h: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number | null;
  ath: number;
  athDate: string;
  atl: number;
  atlDate: string;
};

export type FearAndGreedIndex = {
    value: number;
    valueClassification: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
};

export interface BotContextType {
  liveBotState: any;
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
  executeManualTrade: (signal: TradeSignal, capital: number, leverage: number, isSimulation: boolean) => void;
  setManualChartData: (symbol: string, interval: string) => void;
  startMultiSignalMonitor: (config: MultiSignalConfig) => void;
  stopMultiSignalMonitor: () => void;
  startScreener: (config: ScreenerConfig) => void;
  stopScreener: () => void;
}
