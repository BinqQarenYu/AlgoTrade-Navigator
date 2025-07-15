

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

export type DisciplineParams = {
  enableDiscipline: boolean;
  maxConsecutiveLosses: number;
  cooldownPeriodMinutes: number;
  dailyDrawdownLimit: number;
  onFailure: 'Cooldown' | 'Adapt';
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
  ema_medium?: number | null;
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
  // For Liquidity & Order Flow Strategy
  fvg_top?: number | null;
  fvg_bottom?: number | null;
  // For SMI MFI Supertrend
  smi?: number | null;
  smi_signal?: number | null;
  mfi?: number | null;
  // For AI Consensus strategy
  aiReasoning?: string;
  aiConfidence?: number;
  // For Grid Trading
  gridLevels?: number[];
  isProjected?: boolean;
  // For Physics-Based Visualization
  k1_stiffness_range?: number;
  volume_resistance_index_N?: number;
  pressure_depth?: number;
  avg_pressure_depth_N?: number;
  depthTotal?: number;
  depth_imbalance_ratio?: number;
  burst_potential_index_N?: number;
  sentimentScore?: number;
  predicted_next_pump_prob?: number;
  predicted_next_dump_prob?: number;
  predicted_next_burst_prob?: number;
};

export type PhysicsChartConfig = {
  showDepth: boolean;
  showImbalance: boolean;
  showStiffness: boolean;
  showPressure: boolean;
  showBPI: boolean;
  showSentiment: boolean;
  bpiThreshold: number;
};

// Represents the probability distribution for a single future time step
export type QuantumFieldData = {
    time: number;
    priceLevels: {
        price: number;
        probability: number;
    }[];
    mean?: number;
    sigma?: number;
}

export type QuantumPredictionSummary = {
  trend: 'BULLISH' | 'BEARISH' | 'RANGING' | '---';
  target: number; // The Mean (μ)
  confidence: number;
  sigma: number; // The Standard Deviation (σ)
  range: {
    min: number; // μ - σ
    max: number; // μ + σ
  }
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
  peakPrice?: number;
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
  timestamp: number; 
  exitTimestamp?: number;
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
    useAIPrediction: boolean;
    reverse: boolean;
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

export type PricePredictionOutput = {
    predictedPrice: number;
    predictedDirection: 'UP' | 'DOWN' | 'NEUTRAL';
    confidence: number;
    reasoning: string;
};

// This is the input format for the AI meta-model flow
export type StrategyAnalysisInput = {
    strategyName: string;
    signal: 'BUY' | 'SELL' | 'HOLD' | null;
    indicatorValues: Record<string, any>;
};

export type SimulationConfig = LiveBotConfig;
export type SimulatedTrade = BacktestResult;

export type SimulatedPosition = {
    id: string;
    asset: string;
    side: 'long' | 'short';
    entryPrice: number;
    entryTime: number;
    size: number;
    stopLoss: number;
    takeProfit: number;
};

export type SimulationState = {
    isRunning: boolean;
    config: SimulationConfig | null;
    logs: string[];
    chartData: HistoricalData[];
    portfolio: {
        initialCapital: number;
        balance: number;
        pnl: number;
    };
    openPositions: SimulatedPosition[];
    tradeHistory: SimulatedTrade[];
    summary: BacktestSummary | null;
};


export interface Strategy {
  id: string;
  name: string;
  description: string;
  calculate: (data: HistoricalData[], params?: any, symbol?: string) => Promise<HistoricalData[]>;
}

export type CoinSentimentData = {
  id: string;
  symbol: string;
  name: string;
  sentimentUp?: number;
  image?: string;
};

export type CoinDetails = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  sentimentUp?: number; // Only from CoinGecko
  description: string | null;
  marketCapRank: number | null;
  publicInterestScore?: number; // Only from CoinGecko
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

export type LiquidityEvent = {
  time: number;
  priceLevel: number;
  direction: 'bullish' | 'bearish';
  type: 'grab' | 'sweep';
  volume?: number;
};

export interface LiquidityTarget {
  priceLevel: number;
  type: 'buy-side' | 'sell-side';
}

export type SavedMarketReport = {
  id: string;
  timestamp: number;
  type: 'market-report';
  input: {
    symbol: string;
    interval: string;
  };
  output: {
    title: string;
    summary: string;
    trendAnalysis: string;
    volatilityAnalysis: string;
    keyLevels: string;
    outlook: string;
  };
};

export type SavedManipulationScan = {
  id: string;
  timestamp: number;
  type: 'manipulation-scan';
  input: {
    symbol: string;
    interval: string; // Add interval to match the query key
  };
  output: {
    isManipulationSuspected: boolean;
    confidence: number;
    currentPhase: 'Accumulation' | 'Pump' | 'Distribution' | 'None';
    reasoning: string;
    accumulationPeriod?: { startTime: number; endTime: number; };
    pumpPeriod?: { startTime: number; endTime: number; };
    distributionPeriod?: { startTime: number; endTime: number; };
  };
};

export type SavedReport = SavedMarketReport | SavedManipulationScan;

export type GridConfig = {
    symbol: string;
    interval: string;
    lowerPrice: number;
    upperPrice: number;
    gridCount: number;
    leverage: number;
    mode: 'arithmetic' | 'geometric';
    direction: 'neutral' | 'long' | 'short';
    investment: number;
    trailingUp: boolean;
    trailingDown: boolean;
    // Optional advanced parameters
    stopLossPrice?: number;
    takeProfitPrice?: number;
    trailingUpTriggerPrice?: number;
    trailingDownTriggerPrice?: number;
};

export type GridBacktestConfig = GridConfig & {
    backtestDays: number;
}

export type GridBacktestSummary = {
    totalPnl: number;
    gridPnl: number;
    unrealizedPnl: number;
    totalTrades: number;
    totalFees: number;
    maxDrawdown: number;
    apr: number;
}

export type Grid = {
    levels: number[];
    profitPerGrid: number;
    quantityPerGrid: number;
};

export type GridTrade = {
    id: string;
    time: number;
    price: number;
    side: 'buy' | 'sell';
};

export type MatchedGridTrade = {
    id: string;
    pnl: number;
    buy: GridTrade;
    sell: GridTrade;
}

export type GridState = {
    isRunning: boolean;
    config: GridConfig | null;
    chartData: HistoricalData[];
    grid: Grid | null;
    trades: GridTrade[];
    openOrders: { price: number, side: 'buy' | 'sell' }[];
    summary: {
        totalPnl: number;
        gridPnl: number;
        totalTrades: number;
    } | null;
};

export type Wall = {
  price: number;
  type: 'bid' | 'ask';
};

export type SpoofedWall = Wall & {
  id: string; // Unique ID for the event
};

export type ScreenAssetsCriteria = {
    minMarketCap: number;
    maxMarketCap: number;
    minVolume24h: number;
    maxVolume24h: number;
    volatilityPreference: 'low' | 'medium' | 'high' | 'any';
    agePreference: 'any' | 'new' | 'established';
    performancePreference: 'strong_7d' | 'weak_7d' | 'any';
};

export type ScreenAssetsInput = {
    criteria: ScreenAssetsCriteria;
    coingeckoApiKey: string | null;
};

export type RankedScreenedAsset = {
    rank: number;
    id: string;
    name: string;
    symbol: string;
    marketCap: number;
    performance7d: number;
    imageUrl: string;
    justification: string;
};

export type ScreenAssetsOutput = {
    assets: RankedScreenedAsset[];
};

export type DetectManipulationOutput = {
  isManipulationSuspected: boolean;
  confidence: number;
  currentPhase: 'Accumulation' | 'Pump' | 'Distribution' | 'None';
  reasoning: string;
  accumulationPeriod?: { startTime: number; endTime: number; };
  pumpPeriod?: { startTime: number; endTime: number; };
  distributionPeriod?: { startTime: number; endTime: number; };
};
