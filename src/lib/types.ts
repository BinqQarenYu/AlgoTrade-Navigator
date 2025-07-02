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
  time: string;
};

export type HistoricalData = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buySignal?: number;
  sellSignal?: number;
};

export type Portfolio = {
  balance: number;
  totalPnl: number;
  dailyVolume: number;
};
