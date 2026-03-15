import type { BacktestSummary, BacktestResult } from '../types';

export interface OverfittingResult {
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Very High';
  score: number; // 0 (low risk) to 100 (high risk)
  feedback: string[];
  outlierTradeIds: string[];
}

// --- Configuration Thresholds ---
const WIN_RATE_THRESHOLDS = { moderate: 70, high: 80, veryHigh: 90 };
const PROFIT_FACTOR_THRESHOLDS = { moderate: 2.5, high: 3.5, veryHigh: 5.0 };
const TRADES_PER_1000_CANDLES_THRESHOLDS = { moderate: 20, low: 10, veryLow: 5 };
const OUTLIER_STD_DEV_THRESHOLD = 3.0; // PnL > 3 standard deviations from the mean is an outlier

/**
 * Analyzes a backtest summary and trade list to detect signs of overfitting.
 * Identifies suspiciously high win rates, unrealistic profit factors, and profit distributions
 * that heavily rely on statistical outlier trades.
 *
 * @param summary The backtest summary statistics.
 * @param dataPointCount The total number of candles in the backtest period.
 * @param trades The full list of trades from the backtest.
 * @returns An object containing the overfitting risk level, a score, feedback, and outlier trade IDs.
 */
export function detectOverfitting(
  summary: BacktestSummary,
  dataPointCount: number,
  trades: BacktestResult[]
): OverfittingResult {
  let score = 0;
  const feedback: string[] = [];
  const outlierTradeIds: string[] = [];

  // 1. Analyze Win Rate
  if (summary.winRate >= WIN_RATE_THRESHOLDS.veryHigh) {
    score += 40;
    feedback.push(`Win rate of ${summary.winRate.toFixed(1)}% is exceptionally high and unlikely to be sustainable in live market conditions.`);
  } else if (summary.winRate >= WIN_RATE_THRESHOLDS.high) {
    score += 25;
    feedback.push(`Win rate of ${summary.winRate.toFixed(1)}% is very high, suggesting potential curve-fitting.`);
  } else if (summary.winRate >= WIN_RATE_THRESHOLDS.moderate) {
    score += 10;
    feedback.push(`A high win rate of ${summary.winRate.toFixed(1)}% is good, but monitor its consistency in out-of-sample data.`);
  }

  // 2. Analyze Profit Factor
  if (summary.profitFactor >= PROFIT_FACTOR_THRESHOLDS.veryHigh) {
    score += 40;
    feedback.push(`A profit factor of ${summary.profitFactor.toFixed(2)} is extremely high, a classic sign of an over-optimized strategy.`);
  } else if (summary.profitFactor >= PROFIT_FACTOR_THRESHOLDS.high) {
    score += 25;
    feedback.push(`Profit factor of ${summary.profitFactor.toFixed(2)} is unusually high and may not be realistic.`);
  } else if (summary.profitFactor >= PROFIT_FACTOR_THRESHOLDS.moderate) {
    score += 10;
    feedback.push(`Profit factor of ${summary.profitFactor.toFixed(2)} is strong. Ensure this performance holds on unseen data.`);
  }

  // 3. Analyze Trade Frequency
  // Checks if the strategy trades often enough to be statistically relevant relative to the dataset length
  const tradesPer1000 = (summary.totalTrades / dataPointCount) * 1000;

  if (summary.totalTrades > 5) {
    if (tradesPer1000 < TRADES_PER_1000_CANDLES_THRESHOLDS.veryLow) {
      score += 30;
      feedback.push(`Very low trade count (${summary.totalTrades} trades over ${dataPointCount} candles). The results are not statistically significant and could be due to a few lucky trades.`);
    } else if (tradesPer1000 < TRADES_PER_1000_CANDLES_THRESHOLDS.low) {
      score += 15;
      feedback.push(`Low trade count (${summary.totalTrades} trades) may not be enough to validate the strategy's edge reliably.`);
    } else if (tradesPer1000 < TRADES_PER_1000_CANDLES_THRESHOLDS.moderate) {
      score += 5;
      feedback.push(`The trade count of ${summary.totalTrades} is adequate, but more trades would provide higher confidence.`);
    }
  } else {
      score += 50;
      feedback.push(`Fewer than 5 trades were executed. The results are statistically meaningless and should be ignored.`);
  }

  // 4. Analyze Outlier Trades
  // Optimize Standard Deviation Calculation using Welford's online algorithm or a single-pass sum/sum-of-squares approach
  // to avoid iterating over the trade list multiple times.
  const tradeCount = trades.length;
  if (tradeCount > 10) {
    let sumPnl = 0;
    let sumSqPnl = 0;

    // Single pass to collect sum and sum of squares
    for (let i = 0; i < tradeCount; i++) {
        const pnl = trades[i].pnl;
        sumPnl += pnl;
        sumSqPnl += pnl * pnl;
    }
    
    const meanPnl = sumPnl / tradeCount;
    // Calculate variance using the formula: E[X^2] - (E[X])^2
    const variancePnl = (sumSqPnl / tradeCount) - (meanPnl * meanPnl);

    // Prevent floating point inaccuracies from creating negative variance
    const stdDevPnl = variancePnl > 0 ? Math.sqrt(variancePnl) : 0;
    const outlierThreshold = meanPnl + (stdDevPnl * OUTLIER_STD_DEV_THRESHOLD);

    // Second pass strictly to identify outliers
    if (stdDevPnl > 0) {
        for (let i = 0; i < tradeCount; i++) {
            if (trades[i].pnl > outlierThreshold) {
                outlierTradeIds.push(trades[i].id);
            }
        }
    }

    if (outlierTradeIds.length > 0) {
        score += 15;
        feedback.push(`Found ${outlierTradeIds.length} outlier trade(s) with exceptionally high profit. The strategy's performance may heavily depend on these rare events.`);
    }
  }

  // Determine final risk level based on accumulated score thresholds
  let riskLevel: OverfittingResult['riskLevel'];
  if (score >= 70) {
    riskLevel = 'Very High';
  } else if (score >= 50) {
    riskLevel = 'High';
  } else if (score >= 25) {
    riskLevel = 'Moderate';
  } else {
    riskLevel = 'Low';
  }

  if (feedback.length === 0) {
      feedback.push("The backtest results appear to be within reasonable statistical boundaries. Continue validation with out-of-sample data.");
  }

  // Cap max score at 100
  return { riskLevel, score: Math.min(100, score), feedback, outlierTradeIds };
}
