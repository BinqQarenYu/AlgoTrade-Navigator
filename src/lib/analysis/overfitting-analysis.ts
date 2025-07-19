
'use server';

import type { BacktestSummary } from '../types';

export interface OverfittingResult {
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Very High';
  score: number; // 0 (low risk) to 100 (high risk)
  feedback: string[];
}

// --- Configuration Thresholds ---
const WIN_RATE_THRESHOLDS = { moderate: 70, high: 80, veryHigh: 90 };
const PROFIT_FACTOR_THRESHOLDS = { moderate: 2.5, high: 3.5, veryHigh: 5.0 };
const TRADES_PER_1000_CANDLES_THRESHOLDS = { moderate: 20, low: 10, veryLow: 5 };

/**
 * Analyzes a backtest summary to detect signs of overfitting.
 * @param summary The backtest summary statistics.
 * @param dataPointCount The total number of candles in the backtest period.
 * @returns An object containing the overfitting risk level, a numerical score, and detailed feedback.
 */
export function detectOverfitting(
  summary: BacktestSummary,
  dataPointCount: number
): OverfittingResult {
  let score = 0;
  const feedback: string[] = [];

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
  const tradesPer1000 = (summary.totalTrades / dataPointCount) * 1000;
  if (summary.totalTrades > 5 && tradesPer1000 < TRADES_PER_1000_CANDLES_THRESHOLDS.veryLow) {
    score += 30;
    feedback.push(`Very low trade count (${summary.totalTrades} trades over ${dataPointCount} candles). The results are not statistically significant and could be due to a few lucky trades.`);
  } else if (summary.totalTrades > 5 && tradesPer1000 < TRADES_PER_1000_CANDLES_THRESHOLDS.low) {
    score += 15;
    feedback.push(`Low trade count (${summary.totalTrades} trades) may not be enough to validate the strategy's edge reliably.`);
  } else if (summary.totalTrades > 5 && tradesPer1000 < TRADES_PER_1000_CANDLES_THRESHOLDS.moderate) {
    score += 5;
    feedback.push(`The trade count of ${summary.totalTrades} is adequate, but more trades would provide higher confidence.`);
  } else if (summary.totalTrades <= 5) {
      score += 50;
      feedback.push(`Fewer than 5 trades were executed. The results are statistically meaningless and should be ignored.`);
  }


  // Determine final risk level
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

  return { riskLevel, score: Math.min(100, score), feedback };
}
