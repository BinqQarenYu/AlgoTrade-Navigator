import * as Indicators from '@/lib/indicators';
import { strategies } from '@/lib/strategies/all-strategies';

export interface ModuleInput {
  name: string;
  type: 'number' | 'number[]' | 'HistoricalData[]' | 'boolean' | 'string' | 'any';
  defaultValue?: any;
}

export interface ModuleOutput {
  name: string;
  type: 'any';
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: 'Indicators' | 'Strategies';
  inputs: ModuleInput[];
  outputs: ModuleOutput[];
  execute: (inputs: Record<string, any>) => any | Promise<any>;
}

// Map manual indicators
const IndicatorRegistry: Record<string, ModuleDefinition> = {
  calculateSMA: {
    id: 'calculateSMA',
    name: 'Calculate SMA',
    description: 'Calculates Simple Moving Average',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'number[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 14 }
    ],
    outputs: [{ name: 'sma', type: 'any' }],
    execute: (inputs) => ({ sma: Indicators.calculateSMA(inputs.data, inputs.period) })
  },
  calculateEMA: {
    id: 'calculateEMA',
    name: 'Calculate EMA',
    description: 'Calculates Exponential Moving Average',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'number[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 14 }
    ],
    outputs: [{ name: 'ema', type: 'any' }],
    execute: (inputs) => ({ ema: Indicators.calculateEMA(inputs.data, inputs.period) })
  },
  calculateRSI: {
    id: 'calculateRSI',
    name: 'Calculate RSI',
    description: 'Calculates Relative Strength Index',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'number[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 14 }
    ],
    outputs: [{ name: 'rsi', type: 'any' }],
    execute: (inputs) => ({ rsi: Indicators.calculateRSI(inputs.data, inputs.period) })
  },
  calculateStandardDeviation: {
    id: 'calculateStandardDeviation',
    name: 'Calculate Standard Deviation',
    description: 'Calculates rolling Standard Deviation',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'number[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 14 }
    ],
    outputs: [{ name: 'stdDev', type: 'any' }],
    execute: (inputs) => ({ stdDev: Indicators.calculateStandardDeviation(inputs.data, inputs.period) })
  },
  calculateBollingerBands: {
    id: 'calculateBollingerBands',
    name: 'Calculate Bollinger Bands',
    description: 'Calculates Bollinger Bands (upper, middle, lower)',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'number[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 20 },
      { name: 'stdDevMultiplier', type: 'number', defaultValue: 2 }
    ],
    outputs: [{ name: 'upper', type: 'any' }, { name: 'middle', type: 'any' }, { name: 'lower', type: 'any' }],
    execute: (inputs) => Indicators.calculateBollingerBands(inputs.data, inputs.period, inputs.stdDevMultiplier)
  },
  calculateMACD: {
    id: 'calculateMACD',
    name: 'Calculate MACD',
    description: 'Calculates MACD, Signal, and Histogram',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'number[]', defaultValue: [] },
      { name: 'shortPeriod', type: 'number', defaultValue: 12 },
      { name: 'longPeriod', type: 'number', defaultValue: 26 },
      { name: 'signalPeriod', type: 'number', defaultValue: 9 }
    ],
    outputs: [{ name: 'macd', type: 'any' }, { name: 'signal', type: 'any' }, { name: 'histogram', type: 'any' }],
    execute: (inputs) => Indicators.calculateMACD(inputs.data, inputs.shortPeriod, inputs.longPeriod, inputs.signalPeriod)
  },
  calculateATR: {
    id: 'calculateATR',
    name: 'Calculate ATR',
    description: 'Calculates Average True Range',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 14 }
    ],
    outputs: [{ name: 'atr', type: 'any' }],
    execute: (inputs) => ({ atr: Indicators.calculateATR(inputs.data, inputs.period) })
  },
  calculateSupertrend: {
    id: 'calculateSupertrend',
    name: 'Calculate Supertrend',
    description: 'Calculates Supertrend and direction',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 10 },
      { name: 'multiplier', type: 'number', defaultValue: 3 }
    ],
    outputs: [{ name: 'supertrend', type: 'any' }, { name: 'direction', type: 'any' }],
    execute: (inputs) => Indicators.calculateSupertrend(inputs.data, inputs.period, inputs.multiplier)
  },
  calculateDonchianChannels: {
    id: 'calculateDonchianChannels',
    name: 'Calculate Donchian Channels',
    description: 'Calculates Donchian Channels (upper, middle, lower)',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 20 }
    ],
    outputs: [{ name: 'upper', type: 'any' }, { name: 'middle', type: 'any' }, { name: 'lower', type: 'any' }],
    execute: (inputs) => Indicators.calculateDonchianChannels(inputs.data, inputs.period)
  },
  calculateIchimokuCloud: {
    id: 'calculateIchimokuCloud',
    name: 'Calculate Ichimoku Cloud',
    description: 'Calculates Ichimoku Cloud components',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'tenkanPeriod', type: 'number', defaultValue: 9 },
      { name: 'kijunPeriod', type: 'number', defaultValue: 26 },
      { name: 'senkouBPeriod', type: 'number', defaultValue: 52 },
      { name: 'displacement', type: 'number', defaultValue: 26 }
    ],
    outputs: [{ name: 'tenkan', type: 'any' }, { name: 'kijun', type: 'any' }, { name: 'senkouA', type: 'any' }, { name: 'senkouB', type: 'any' }, { name: 'chikou', type: 'any' }],
    execute: (inputs) => Indicators.calculateIchimokuCloud(inputs.data, inputs.tenkanPeriod, inputs.kijunPeriod, inputs.senkouBPeriod, inputs.displacement)
  },
  calculateStochastic: {
    id: 'calculateStochastic',
    name: 'Calculate Stochastic',
    description: 'Calculates Stochastic Oscillator (%K, %D)',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 14 },
      { name: 'smoothK', type: 'number', defaultValue: 3 },
      { name: 'smoothD', type: 'number', defaultValue: 3 }
    ],
    outputs: [{ name: 'k', type: 'any' }, { name: 'd', type: 'any' }],
    execute: (inputs) => Indicators.calculateStochastic(inputs.data, inputs.period, inputs.smoothK, inputs.smoothD)
  },
  calculateKeltnerChannels: {
    id: 'calculateKeltnerChannels',
    name: 'Calculate Keltner Channels',
    description: 'Calculates Keltner Channels (upper, middle, lower)',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 20 },
      { name: 'multiplier', type: 'number', defaultValue: 2 }
    ],
    outputs: [{ name: 'upper', type: 'any' }, { name: 'middle', type: 'any' }, { name: 'lower', type: 'any' }],
    execute: (inputs) => Indicators.calculateKeltnerChannels(inputs.data, inputs.period, inputs.multiplier)
  },
  calculateVWAP: {
    id: 'calculateVWAP',
    name: 'Calculate VWAP',
    description: 'Calculates Volume Weighted Average Price',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 14 }
    ],
    outputs: [{ name: 'vwap', type: 'any' }],
    execute: (inputs) => ({ vwap: Indicators.calculateVWAP(inputs.data, inputs.period) })
  },
  calculateParabolicSAR: {
    id: 'calculateParabolicSAR',
    name: 'Calculate Parabolic SAR',
    description: 'Calculates Parabolic SAR',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'afStart', type: 'number', defaultValue: 0.02 },
      { name: 'afIncrement', type: 'number', defaultValue: 0.02 },
      { name: 'afMax', type: 'number', defaultValue: 0.2 }
    ],
    outputs: [{ name: 'psar', type: 'any' }, { name: 'direction', type: 'any' }],
    execute: (inputs) => Indicators.calculateParabolicSAR(inputs.data, inputs.afStart, inputs.afIncrement, inputs.afMax)
  },
  calculateMomentum: {
    id: 'calculateMomentum',
    name: 'Calculate Momentum',
    description: 'Calculates Momentum',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'number[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 14 }
    ],
    outputs: [{ name: 'momentum', type: 'any' }],
    execute: (inputs) => ({ momentum: Indicators.calculateMomentum(inputs.data, inputs.period) })
  },
  calculateAwesomeOscillator: {
    id: 'calculateAwesomeOscillator',
    name: 'Calculate Awesome Oscillator',
    description: 'Calculates Awesome Oscillator',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'shortPeriod', type: 'number', defaultValue: 5 },
      { name: 'longPeriod', type: 'number', defaultValue: 34 }
    ],
    outputs: [{ name: 'ao', type: 'any' }],
    execute: (inputs) => ({ ao: Indicators.calculateAwesomeOscillator(inputs.data, inputs.shortPeriod, inputs.longPeriod) })
  },
  calculateWilliamsR: {
    id: 'calculateWilliamsR',
    name: 'Calculate Williams %R',
    description: 'Calculates Williams %R',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 14 }
    ],
    outputs: [{ name: 'williamsR', type: 'any' }],
    execute: (inputs) => ({ williamsR: Indicators.calculateWilliamsR(inputs.data, inputs.period) })
  },
  calculateCCI: {
    id: 'calculateCCI',
    name: 'Calculate CCI',
    description: 'Calculates Commodity Channel Index',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 20 }
    ],
    outputs: [{ name: 'cci', type: 'any' }],
    execute: (inputs) => ({ cci: Indicators.calculateCCI(inputs.data, inputs.period) })
  },
  calculateHeikinAshi: {
    id: 'calculateHeikinAshi',
    name: 'Calculate Heikin Ashi',
    description: 'Calculates Heikin Ashi candles',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] }
    ],
    outputs: [{ name: 'haData', type: 'any' }],
    execute: (inputs) => ({ haData: Indicators.calculateHeikinAshi(inputs.data) })
  },
  calculateSmoothedHeikinAshi: {
    id: 'calculateSmoothedHeikinAshi',
    name: 'Calculate Smoothed Heikin Ashi',
    description: 'Calculates Smoothed Heikin Ashi candles',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 10 }
    ],
    outputs: [{ name: 'smoothedHaData', type: 'any' }],
    execute: (inputs) => ({ smoothedHaData: Indicators.calculateSmoothedHeikinAshi(inputs.data, inputs.period) })
  },
  calculatePivotPoints: {
    id: 'calculatePivotPoints',
    name: 'Calculate Pivot Points',
    description: 'Calculates Pivot Points (PP, S1-S3, R1-R3)',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 14 }
    ],
    outputs: [{ name: 'pp', type: 'any' }, { name: 's1', type: 'any' }, { name: 's2', type: 'any' }, { name: 's3', type: 'any' }, { name: 'r1', type: 'any' }, { name: 'r2', type: 'any' }, { name: 'r3', type: 'any' }],
    execute: (inputs) => Indicators.calculatePivotPoints(inputs.data, inputs.period)
  },
  calculateOBV: {
    id: 'calculateOBV',
    name: 'Calculate OBV',
    description: 'Calculates On-Balance Volume',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] }
    ],
    outputs: [{ name: 'obv', type: 'any' }],
    execute: (inputs) => ({ obv: Indicators.calculateOBV(inputs.data) })
  },
  calculateCMF: {
    id: 'calculateCMF',
    name: 'Calculate CMF',
    description: 'Calculates Chaikin Money Flow',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 20 }
    ],
    outputs: [{ name: 'cmf', type: 'any' }],
    execute: (inputs) => ({ cmf: Indicators.calculateCMF(inputs.data, inputs.period) })
  },
  calculateCoppockCurve: {
    id: 'calculateCoppockCurve',
    name: 'Calculate Coppock Curve',
    description: 'Calculates Coppock Curve',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'number[]', defaultValue: [] },
      { name: 'longRoC', type: 'number', defaultValue: 14 },
      { name: 'shortRoC', type: 'number', defaultValue: 11 },
      { name: 'wmaPeriod', type: 'number', defaultValue: 10 }
    ],
    outputs: [{ name: 'coppock', type: 'any' }],
    execute: (inputs) => ({ coppock: Indicators.calculateCoppockCurve(inputs.data, inputs.longRoC, inputs.shortRoC, inputs.wmaPeriod) })
  },
  calculateElderRay: {
    id: 'calculateElderRay',
    name: 'Calculate Elder Ray',
    description: 'Calculates Elder Ray Bull & Bear Power',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 13 }
    ],
    outputs: [{ name: 'bullPower', type: 'any' }, { name: 'bearPower', type: 'any' }],
    execute: (inputs) => Indicators.calculateElderRay(inputs.data, inputs.period)
  },
  findFVGs: {
    id: 'findFVGs',
    name: 'Find FVGs',
    description: 'Finds Fair Value Gaps',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] }
    ],
    outputs: [{ name: 'fvgs', type: 'any' }],
    execute: (inputs) => ({ fvgs: Indicators.findFVGs(inputs.data) })
  },
  calculateMFI: {
    id: 'calculateMFI',
    name: 'Calculate MFI',
    description: 'Calculates Money Flow Index',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'period', type: 'number', defaultValue: 14 }
    ],
    outputs: [{ name: 'mfi', type: 'any' }],
    execute: (inputs) => ({ mfi: Indicators.calculateMFI(inputs.data, inputs.period) })
  },
  calculateSMI: {
    id: 'calculateSMI',
    name: 'Calculate SMI',
    description: 'Calculates Stochastic Momentum Index',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'number[]', defaultValue: [] },
      { name: 'smiPeriod', type: 'number', defaultValue: 10 },
      { name: 'emaPeriod', type: 'number', defaultValue: 3 }
    ],
    outputs: [{ name: 'smi', type: 'any' }, { name: 'signal', type: 'any' }],
    execute: (inputs) => Indicators.calculateSMI(inputs.data, inputs.smiPeriod, inputs.emaPeriod)
  },
  calculateSemafor: {
    id: 'calculateSemafor',
    name: 'Calculate Semafor',
    description: 'Calculates Semafor Levels',
    category: 'Indicators',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'period1', type: 'number', defaultValue: 5 },
      { name: 'period2', type: 'number', defaultValue: 13 },
      { name: 'period3', type: 'number', defaultValue: 34 }
    ],
    outputs: [{ name: 'semafor', type: 'any' }],
    execute: (inputs) => ({ semafor: Indicators.calculateSemafor(inputs.data, inputs.period1, inputs.period2, inputs.period3) })
  }
};

const StrategyRegistry: Record<string, ModuleDefinition> = {};
strategies.forEach((strategy) => {
  StrategyRegistry[strategy.id] = {
    id: strategy.id,
    name: `Strategy: ${strategy.name}`,
    description: strategy.description,
    category: 'Strategies',
    inputs: [
      { name: 'data', type: 'HistoricalData[]', defaultValue: [] },
      { name: 'params', type: 'any', defaultValue: {} },
      { name: 'symbol', type: 'string', defaultValue: 'BTC/USDT' }
    ],
    outputs: [{ name: 'strategyOutput', type: 'any' }],
    execute: async (inputs) => {
      // Execute the strategy, handling async operations (e.g. AI-Hybrid)
      const output = await strategy.calculate(inputs.data, inputs.params, inputs.symbol);
      return { strategyOutput: output };
    }
  };
});

export const ModuleRegistry: Record<string, ModuleDefinition> = {
  ...IndicatorRegistry,
  ...StrategyRegistry
};
