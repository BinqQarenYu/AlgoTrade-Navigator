
// This file centralizes the definitions of available indicators and their default parameters.
// It's used by the Strategy Maker to populate UI and by the strategy generator to get default values.

type IndicatorParam = {
  type: 'number';
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
};

export const availableIndicators: Record<string, { name: string, params: Record<string, IndicatorParam> }> = {
  'sma': {
    name: 'Simple Moving Average',
    params: { period: { type: 'number', defaultValue: 20 } }
  },
  'ema': {
    name: 'Exponential Moving Average',
    params: { period: { type: 'number', defaultValue: 20 } }
  },
  'rsi': {
    name: 'Relative Strength Index',
    params: { 
      period: { type: 'number', defaultValue: 14 },
    }
  },
  'macd': {
    name: 'MACD',
    params: {
      shortPeriod: { type: 'number', defaultValue: 12 },
      longPeriod: { type: 'number', defaultValue: 26 },
      signalPeriod: { type: 'number', defaultValue: 9 },
    }
  },
  'bollinger_bands': {
    name: 'Bollinger Bands',
    params: {
        period: { type: 'number', defaultValue: 20 },
        stdDev: { type: 'number', defaultValue: 2, step: 0.1 },
    }
  },
  'supertrend': {
    name: 'Supertrend',
    params: {
        period: { type: 'number', defaultValue: 10 },
        multiplier: { type: 'number', defaultValue: 3 },
    }
  },
  'cci': {
    name: 'Commodity Channel Index',
    params: {
        period: { type: 'number', defaultValue: 20 },
    }
  },
  'donchian_channels': {
    name: 'Donchian Channels',
    params: {
        period: { type: 'number', defaultValue: 20 },
    }
  },
  'stochastic': {
    name: 'Stochastic Oscillator',
    params: {
        period: { type: 'number', defaultValue: 14 },
        smoothK: { type: 'number', defaultValue: 3 },
        smoothD: { type: 'number', defaultValue: 3 },
    }
  },
  'keltner_channels': {
    name: 'Keltner Channels',
    params: {
        period: { type: 'number', defaultValue: 20 },
        multiplier: { type: 'number', defaultValue: 2 },
    }
  },
  'vwap': {
    name: 'Volume-Weighted Avg Price',
    params: {
        period: { type: 'number', defaultValue: 20 },
    }
  },
  'parabolic_sar': {
    name: 'Parabolic SAR',
    params: {
        afStart: { type: 'number', defaultValue: 0.02, step: 0.01 },
        afIncrement: { type: 'number', defaultValue: 0.02, step: 0.01 },
        afMax: { type: 'number', defaultValue: 0.2, step: 0.1 },
    }
  },
  'momentum': {
    name: 'Momentum',
    params: {
        period: { type: 'number', defaultValue: 14 },
    }
  },
  'awesome_oscillator': {
    name: 'Awesome Oscillator',
    params: {
        shortPeriod: { type: 'number', defaultValue: 5 },
        longPeriod: { type: 'number', defaultValue: 34 },
    }
  },
  'williams_r': {
    name: 'Williams %R',
    params: {
        period: { type: 'number', defaultValue: 14 },
    }
  },
  'obv': {
    name: 'On-Balance Volume',
    params: {} // OBV has no parameters
  },
  'cmf': {
    name: 'Chaikin Money Flow',
    params: {
        period: { type: 'number', defaultValue: 20 },
    }
  },
  'coppock_curve': {
    name: 'Coppock Curve',
    params: {
        longRoC: { type: 'number', defaultValue: 14 },
        shortRoC: { type: 'number', defaultValue: 11 },
        wmaPeriod: { type: 'number', defaultValue: 10 },
    }
  },
  'elder_ray': {
    name: 'Elder-Ray Index',
    params: {
        period: { type: 'number', defaultValue: 13 },
    }
  },
  'mfi': {
    name: 'Money Flow Index',
    params: {
        period: { type: 'number', defaultValue: 14 },
    }
  },
  'smi': {
    name: 'SMI Oscillator',
    params: {
        smiPeriod: { type: 'number', defaultValue: 5 },
        emaPeriod: { type: 'number', defaultValue: 3 },
    }
  }
};

export function getIndicatorParams(indicatorId: string): Record<string, number> {
    const indicator = availableIndicators[indicatorId];
    if (!indicator) return {};
    
    const params: Record<string, number> = {};
    for (const paramName in indicator.params) {
        params[paramName] = indicator.params[paramName].defaultValue;
    }
    return params;
}
