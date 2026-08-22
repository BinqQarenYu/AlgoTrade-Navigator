export type MBOSide = 'BID' | 'ASK';
export type MBOAction = 'ADD' | 'CANCEL' | 'MODIFY' | 'EXECUTE';

export interface MBOEvent {
  action: MBOAction;
  side: MBOSide;
  price: number;
  size: number;
  orderId: string;
  timestamp: number;
  originalSize?: number;
}

export interface MBOOrder {
  orderId: string;
  side: MBOSide;
  price: number;
  size: number;
  timestamp: number;
  initialTimestamp: number;
}

export interface L2PriceLevel {
  price: number;
  volume: number;
  orderCount: number;
  side: MBOSide;
}

export interface L2Snapshot {
  timestamp: number;
  bids: Array<{ p: number; v: number }>;
  asks: Array<{ p: number; v: number }>;
}

export interface L2Delta {
  action: 'update' | 'delete';
  side: MBOSide;
  p: number;
  v: number;
  timestamp: number;
}

export interface TradeTick {
  id: string;
  timestamp: number;
  price: number;
  size: number;
  side: 'BUY' | 'SELL'; // BUY = aggressive buyer hitting ask, SELL = aggressive seller hitting bid
  isAggressiveBuy: boolean;
  bidVol: number;
  askVol: number;
}

export interface FootprintBubble {
  id: string;
  timestamp: number;
  price: number;
  totalVolume: number;
  bidVolume: number;
  askVolume: number;
  delta: number; // askVolume - bidVolume
  tradeCount: number;
  isBuyAggression: boolean;
  label?: string;
  hasIceberg?: boolean;
  hasSpoofing?: boolean;
}

export interface OHLCVCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buyVolume?: number;
  sellVolume?: number;
}

export interface HeatmapPriceSlice {
  timestamp: number;
  levels: Map<number, number>; // price -> volume
}

export interface IcebergEvent {
  id: string;
  timestamp: number;
  price: number;
  side: MBOSide;
  visibleSize: number;
  executedVolume: number;
  hiddenReloadCount: number;
  detectedAt: number;
}

export interface SpoofEvent {
  id: string;
  timestamp: number;
  price: number;
  side: MBOSide;
  size: number;
  lifetimeMs: number;
  distanceToMidTicks: number;
  detectedAt: number;
}

export interface QueuePositionTracker {
  userOrderId: string;
  side: MBOSide;
  price: number;
  userSize: number;
  ordersAhead: number;
  volumeAhead: number;
  initialOrdersAhead: number;
  initialVolumeAhead: number;
  estimatedFillTimeMs?: number;
  status: 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED';
  filledQuantity: number;
}

export interface VolumeProfileLevel {
  price: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
  delta: number;
}

export interface VolumeProfileData {
  levels: VolumeProfileLevel[];
  pocPrice: number;
  pocVolume: number;
  vahPrice: number; // Value Area High (68%)
  valPrice: number; // Value Area Low (68%)
  totalVolume: number;
  totalDelta: number;
}

export interface CVDPoint {
  timestamp: number;
  cvd: number;
  sessionVolume: number;
  delta: number;
  isPositive: boolean;
}

export interface LiquidationEvent {
  timestamp: number;
  price: number;
  volume: number;
  side: 'BUY' | 'SELL'; // BUY = Short Liquidated, SELL = Long Liquidated
}

export interface CumulativeLiquidation {
  timestamp: number;
  longVol: number; // accumulated SELL liquidations
  shortVol: number; // accumulated BUY liquidations
}

// ============================================================
// Market Profile (TPO + Volume Profile per session)
// ============================================================

export interface MarketProfileTPOLevel {
  price: number;
  letters: string[];        // TPO letters that printed at this level, e.g. ['a','b','c']
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
  isInsideVA: boolean;      // Whether this level is inside the Value Area
}

export interface MarketProfileData {
  levels: MarketProfileTPOLevel[];
  pocPrice: number;         // Point of Control — price with most TPOs
  pocVolume: number;        // Total volume at POC
  vahPrice: number;         // Value Area High (70% of TPOs)
  valPrice: number;         // Value Area Low (70% of TPOs)
  ibHigh: number;           // Initial Balance High (first N periods)
  ibLow: number;            // Initial Balance Low (first N periods)
  openPrice: number;        // Session open price
  closePrice: number;       // Latest price (session close so far)
  currentLetter: string;    // Current TPO letter being assigned
  sessionStart: number;     // Timestamp of session start
  totalTPOCount: number;    // Total TPO blocks printed
}

export interface MarketProfileConfig {
  enabled: boolean;
  periodMinutes: number;    // Duration per TPO letter (default 30)
  priceAggregation: number; // How many ticks to aggregate (default 4)
  ibPeriods: number;        // Number of initial periods for IB (default 2)
  showTPO: boolean;
  showVolumeProfile: boolean;
  showPOCLine: boolean;
  showVAHVAL: boolean;
  showIB: boolean;
  showTextValues: boolean;
  profileWidth: number;     // Pixel width of the profile (default 120)
}

export interface DOMOrderEntryState {
  symbol: string;
  openQty: number;
  openPnl: number;
  dailyPnl: number;
  quantity: number;
  broker: string;
  account: string;
  ticksDiff: number;
  ocoEnabled: boolean;
  ocoMode: 'SL/TP' | 'TRAILING' | 'BREAKEVEN';
  slEnabled: boolean;
  tpEnabled: boolean;
  ocoUnit: 'MONEY' | 'TICKS';
  ocoValue: number;
  beTicks: number;
  executionLocation: 'SERVER' | 'CLIENT';
  linkPendingOrders: boolean;
}

export interface ReplayConfig {
  symbol: string;
  startDate: string;
  speedMultiplier: number; // 1, 8, 40, 100, 200, 400
  includeMBO: boolean;
  isPlaying: boolean;
  currentTime: number;
  startTime: number;
  endTime: number;
}
