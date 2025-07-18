
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
  }
  // Add other indicators here as they become needed/available
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
