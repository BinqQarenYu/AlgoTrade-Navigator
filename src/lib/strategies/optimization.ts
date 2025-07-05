
export interface OptimizationRange {
    min: number;
    max: number;
    step: number;
}

export interface StrategyOptimizationConfig {
    [paramName: string]: OptimizationRange;
}

// Defines the search space for the auto-tuner for each strategy.
// Strategies not included here will not have the auto-tune button.
export const optimizationConfigs: Record<string, StrategyOptimizationConfig> = {
    'sma-crossover': {
        shortPeriod: { min: 5, max: 25, step: 5 },
        longPeriod: { min: 30, max: 60, step: 10 },
    },
    'ema-crossover': {
        shortPeriod: { min: 5, max: 25, step: 5 },
        longPeriod: { min: 30, max: 60, step: 10 },
    },
    'rsi-divergence': {
        period: { min: 7, max: 21, step: 7 },
        oversold: { min: 20, max: 30, step: 5 },
        overbought: { min: 70, max: 80, step: 5 },
    },
    'bollinger-bands': {
        period: { min: 10, max: 30, step: 5 },
        stdDev: { min: 1.5, max: 2.5, step: 0.5 },
    },
    'macd-crossover': {
        shortPeriod: { min: 9, max: 15, step: 3 },
        longPeriod: { min: 20, max: 30, step: 5 },
        signalPeriod: { min: 7, max: 12, step: 2 },
    },
    'supertrend': {
        period: { min: 7, max: 14, step: 1 },
        multiplier: { min: 2, max: 4, step: 1 },
    },
    'donchian-channels': {
        period: { min: 10, max: 50, step: 10 },
    },
    'stochastic-crossover': {
        period: { min: 10, max: 20, step: 2 },
        smoothK: { min: 3, max: 5, step: 1 },
        smoothD: { min: 3, max: 5, step: 1 },
    }
};
