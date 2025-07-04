



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
};

export type TradeSignal = {
  action: 'UP' | 'DOWN';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  reasoning: string;
  timestamp: Date;
  strategy: string;
  peakPrice?: number;
};
    
export type LiveBotConfig = {
    symbol: string;
    interval: string;
    strategy: string;
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
    initialCapital: number;
    leverage: number;
    takeProfit: number;
    stopLoss: number;
    useAIPrediction: boolean;
    fee: number;
}

export type MultiSignalConfig = {
    assets: string[];
    interval: string;
    strategy: string;
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

export interface Strategy {
  id: string;
  name: string;
  description: string;
  calculate: (data: HistoricalData[]) => Promise<HistoricalData[]>;
}

export type CoinSentimentData = {
  id: string;
  symbol: string;
  name: string;
  sentimentUp: number;
  image: string;
};

export type CoinDetails = CoinSentimentData & {
  description: string | null;
  marketCapRank: number | null;
  publicInterestScore: number;
};

export type FearAndGreedIndex = {
    value: number;
    valueClassification: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
};
