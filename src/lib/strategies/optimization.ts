
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
    },
    'liquidity-grab': {
        swingLookaround: { min: 5, max: 15, step: 2 },
        confirmationCandles: { min: 1, max: 5, step: 1 },
        maxSweepLookahead: { min: 10, max: 50, step: 10 },
    },
    // Adding the rest of the strategies
    'peak-formation-fib': {
        peakLookaround: { min: 3, max: 10, step: 1 },
        swingLookaround: { min: 2, max: 5, step: 1 },
        emaShortPeriod: { min: 10, max: 20, step: 3 },
        emaLongPeriod: { min: 40, max: 60, step: 5 },
        fibLevel1: { min: 0.382, max: 0.5, step: 0.118 },
        fibLevel2: { min: 0.618, max: 0.786, step: 0.168 },
    },
    'hyper-peak-formation': { // Same as PFF
        peakLookaround: { min: 3, max: 10, step: 1 },
        swingLookaround: { min: 2, max: 5, step: 1 },
        emaShortPeriod: { min: 10, max: 20, step: 3 },
        emaLongPeriod: { min: 40, max: 60, step: 5 },
        fibLevel1: { min: 0.382, max: 0.5, step: 0.118 },
        fibLevel2: { min: 0.618, max: 0.786, step: 0.168 },
    },
    'liquidity-order-flow': {
        swingLookaround: { min: 3, max: 10, step: 1 },
        emaTrendPeriod: { min: 100, max: 200, step: 50 },
        maxLookahead: { min: 25, max: 75, step: 25 },
    },
    'volume-delta': {
        pocLookback: { min: 100, max: 300, step: 50 },
        deltaLookback: { min: 3, max: 10, step: 2 },
        pocProximityPercent: { min: 0.002, max: 0.01, step: 0.002 },
    },
    'ichimoku-cloud': {
        tenkanPeriod: { min: 7, max: 12, step: 1 },
        kijunPeriod: { min: 20, max: 30, step: 2 },
        senkouBPeriod: { min: 45, max: 60, step: 5 },
    },
    'awesome-oscillator': {
        shortPeriod: { min: 3, max: 7, step: 1 },
        longPeriod: { min: 30, max: 40, step: 2 },
    },
    'cci-reversion': {
        period: { min: 15, max: 30, step: 5 },
        overbought: { min: 80, max: 120, step: 20 },
        oversold: { min: -120, max: -80, step: 20 },
    },
    'chaikin-money-flow': {
        period: { min: 15, max: 25, step: 5 },
    },
    'coppock-curve': {
        longRoC: { min: 12, max: 16, step: 1 },
        shortRoC: { min: 9, max: 12, step: 1 },
        wmaPeriod: { min: 8, max: 12, step: 1 },
    },
    'elder-ray-index': {
        period: { min: 10, max: 20, step: 3 },
    },
    'keltner-channels': {
        period: { min: 15, max: 25, step: 5 },
        multiplier: { min: 1.5, max: 2.5, step: 0.5 },
    },
    'momentum-cross': {
        period: { min: 10, max: 20, step: 2 },
    },
    'obv-divergence': {
        period: { min: 15, max: 25, step: 5 },
    },
    'parabolic-sar-flip': {
        afStart: { min: 0.01, max: 0.03, step: 0.01 },
        afIncrement: { min: 0.01, max: 0.03, step: 0.01 },
        afMax: { min: 0.1, max: 0.3, step: 0.1 },
    },
    'pivot-point-reversal': {
        period: { min: 12, max: 48, step: 12 },
    },
    'vwap-cross': {
        period: { min: 15, max: 30, step: 5 },
    },
    'williams-r': {
        period: { min: 10, max: 20, step: 2 },
        overbought: { min: -30, max: -10, step: 5 },
        oversold: { min: -90, max: -70, step: 5 },
    },
    'ema-cci-macd': {
        emaFastPeriod: { min: 5, max: 15, step: 3 },
        emaMediumPeriod: { min: 16, max: 30, step: 5 },
        emaSlowPeriod: { min: 40, max: 60, step: 10 },
        cciPeriod: { min: 14, max: 28, step: 7 },
        cciLevel: { min: 100, max: 150, step: 25 },
        macdShortPeriod: { min: 9, max: 15, step: 3 },
        macdLongPeriod: { min: 20, max: 30, step: 5 },
        macdSignalPeriod: { min: 7, max: 12, step: 2 },
    },
    'mtf-engulfing': {
        emaLength: { min: 14, max: 50, step: 7 },
        atrLength: { min: 10, max: 20, step: 2 },
        slAtrMultiplier: { min: 1.0, max: 2.5, step: 0.5 },
        rrRatio: { min: 1.5, max: 3.0, step: 0.5 },
    },
};
