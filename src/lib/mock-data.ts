import type { Position, Trade, HistoricalData } from './types';

export const portfolio = {
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

export const generateHistoricalData = (): HistoricalData[] => {
  const data: HistoricalData[] = [];
  let price = 68000;
  const startTime = new Date().getTime() - 100 * 60 * 60 * 1000; // 100 hours ago

  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(startTime + i * 60 * 60 * 1000);
    const time = `${timestamp.getHours()}:00`;

    const change = (Math.random() - 0.48) * (price * 0.01);
    const open = price;
    const close = price + change;
    price = close;

    const high = Math.max(open, close) + Math.random() * (price * 0.005);
    const low = Math.min(open, close) - Math.random() * (price * 0.005);
    const volume = Math.random() * 1000 + 500;

    const record: HistoricalData = {
      time,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: parseFloat(volume.toFixed(2)),
    };

    if (i > 5 && Math.random() > 0.9) {
        record.buySignal = record.low;
    }
    if (i > 5 && Math.random() > 0.92) {
        record.sellSignal = record.high;
    }

    data.push(record);
  }
  return data;
};

export const historicalData: HistoricalData[] = generateHistoricalData();
