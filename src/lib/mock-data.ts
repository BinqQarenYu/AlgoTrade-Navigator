
import type { Position, Trade, HistoricalData, Portfolio } from './types';
import { differenceInMinutes, addDays } from 'date-fns';

export const portfolio: Portfolio = {
  balance: 10450.75,
  totalPnl: 152.3,
  dailyVolume: 76340.21,
};

export const openPositions: Position[] = [
  { symbol: 'BTC/USDT', side: 'LONG', size: 0.5, entryPrice: 68500, markPrice: 69230, pnl: 365, leverage: '10x' },
  { symbol: 'ETH/USDT', side: 'SHORT', size: 10, entryPrice: 3600, markPrice: 3550, pnl: 500, leverage: '20x' },
  { symbol: 'SOL/USDT', side: 'LONG', size: 100, entryPrice: 165, markPrice: 162, pnl: -300, leverage: '10x' },
];

export const tradeHistory: Trade[] = [
  { id: '1', symbol: 'BTC/USDT', side: 'BUY', size: 0.1, price: 68450, time: '2024-05-28 10:30:15' },
  { id: '2', symbol: 'ETH/USDT', side: 'SELL', size: 5, price: 3610, time: '2024-05-28 09:15:45' },
  { id: '3', symbol: 'LINK/USDT', side: 'BUY', size: 200, price: 17.5, time: '2024-05-28 08:05:20' },
  { id: '4', symbol: 'LINK/USDT', side: 'SELL', size: 200, price: 17.8, time: '2024-05-28 08:45:10' },
  { id: '5', symbol: 'SOL/USDT', side: 'BUY', size: 50, price: 168, time: '2024-05-27 22:30:00' },
];

export const mockAssetPrices: { [key: string]: number } = {
  "BTC/USDT": 69230.50,
  "ETH/USDT": 3550.20,
  "SOL/USDT": 162.75,
  "BNB/USDT": 590.10,
  "XRP/USDT": 0.52,
  "ADA/USDT": 0.45,
  "DOGE/USDT": 0.16,
  "AVAX/USDT": 36.80,
  "LINK/USDT": 17.25,
  "DOT/USDT": 7.15,
  "MATIC/USDT": 0.72,
  "SHIB/USDT": 0.000025,
  "LTC/USDT": 84.50,
};


export const generateHistoricalData = (startPrice: number, startDate?: Date, endDate?: Date): HistoricalData[] => {
  const data: HistoricalData[] = [];
  let price = startPrice;

  const end = endDate || new Date();
  const start = startDate || addDays(new Date(), -7);

  // Cap the number of data points for performance
  const totalMinutes = Math.abs(differenceInMinutes(end, start));
  const maxPoints = 2000; // Limit to 2000 data points
  const interval = Math.max(1, Math.ceil(totalMinutes / maxPoints)); // Generate at least 1-minute intervals

  let currentTime = start.getTime();
  const endTime = end.getTime();

  while(currentTime <= endTime) {
    const change = (Math.random() - 0.48) * (price * 0.0005);
    const open = price;
    const close = price + change;
    price = close;

    const high = Math.max(open, close) + Math.random() * (price * 0.0002);
    const low = Math.min(open, close) - Math.random() * (price * 0.0002);
    const volume = Math.random() * 10 + 5;

    const precision = startPrice < 1 ? 6 : 2;

    const record: HistoricalData = {
      time: currentTime,
      open: parseFloat(open.toFixed(precision)),
      high: parseFloat(high.toFixed(precision)),
      low: parseFloat(low.toFixed(precision)),
      close: parseFloat(close.toFixed(precision)),
      volume: parseFloat(volume.toFixed(2)),
    };

    data.push(record);
    currentTime += interval * 60 * 1000; // Move to the next interval
  }
  return data;
};

export const historicalData: HistoricalData[] = generateHistoricalData(mockAssetPrices["BTC/USDT"]);
