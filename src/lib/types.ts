

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
    
