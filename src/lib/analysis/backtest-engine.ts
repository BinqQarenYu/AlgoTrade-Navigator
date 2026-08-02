
import type { HistoricalData, BacktestResult, BacktestSummary, DisciplineParams } from '../types';
import { RiskGuardian } from '../risk-guardian';
import Decimal from 'decimal.js';

export interface BacktestEngineConfig {
    initialCapital: number;
    leverage: number;
    fee: number;
    slippage: number;
    stopLoss: number;
    takeProfit: number;
    useCompounding: boolean;
    discipline?: DisciplineParams;
}

export interface BacktestEngineResult {
    trades: BacktestResult[];
    summary: BacktestSummary;
    finalBalance: number;
    maxDrawdown: number;
}

/**
 * Optimized Backtest Engine - Quantitative Trading Implementation
 * 
 * Performance: O(N) single-pass iteration.
 * Mathematical Precision: Uses decimal.js for financial balance, trade PnL, fees, and drawdown.
 * Robustness: Integrated Risk Management (RiskGuardian) and Liquidation checks.
 */
export function executeBacktestEngine(
    data: HistoricalData[],
    config: BacktestEngineConfig
): BacktestEngineResult {
    const { 
        initialCapital, 
        leverage, 
        fee, 
        slippage, 
        stopLoss, 
        takeProfit, 
        useCompounding, 
        discipline 
    } = config;

    const riskGuardian = new RiskGuardian(discipline || {
        enableDiscipline: false,
        maxConsecutiveLosses: 3,
        dailyDrawdownLimit: 5,
        onFailure: 'Cooldown',
        cooldownPeriodMinutes: 60
    }, initialCapital);

    const trades: BacktestResult[] = [];
    let currentBalance = new Decimal(initialCapital);
    let peakBalance = new Decimal(initialCapital);
    let maxDrawdownDec = new Decimal(0);

    let positionType: 'long' | 'short' | null = null;
    let entryPrice = 0;
    let entryTime = 0;
    let stopLossLevel = 0;
    let takeProfitLevel = 0;
    let tradeQuantity = 0;
    let entryPeakPrice: number | undefined;

    const f8 = (num: number) => new Decimal(num).toDecimalPlaces(8, Decimal.ROUND_HALF_UP).toNumber();

    for (let i = 1; i < data.length; i++) {
        // 1. Liquidation Check
        if (currentBalance.lessThanOrEqualTo(0)) break;

        const current = data[i];
        const prev = data[i - 1];

        // 2. Exit Logic (Check SL/TP and Signal Reversals)
        if (positionType !== null) {
            let exitPrice: number | null = null;
            let closeReason: BacktestResult['closeReason'] = 'signal';

            if (positionType === 'long') {
                // Check if Price Gapped below Stop Loss at Open
                if (current.open <= stopLossLevel) {
                    exitPrice = f8(current.open * (1 - slippage / 100));
                    closeReason = 'stop-loss';
                } 
                // Check normal Stop Loss hit
                else if (current.low <= stopLossLevel) {
                    exitPrice = f8(stopLossLevel * (1 - slippage / 100));
                    closeReason = 'stop-loss';
                }
                // Check normal Take Profit hit
                else if (current.high >= takeProfitLevel) {
                    exitPrice = f8(takeProfitLevel * (1 - slippage / 100));
                    closeReason = 'take-profit';
                }
                // Check Strategy Exit Signal (Reverse Signal)
                else if (prev.sellSignal) {
                    exitPrice = f8(current.open * (1 - slippage / 100));
                    closeReason = 'signal';
                }
            } else { // SHORT
                // Check if Price Gapped above Stop Loss at Open
                if (current.open >= stopLossLevel) {
                    exitPrice = f8(current.open * (1 + slippage / 100));
                    closeReason = 'stop-loss';
                }
                // Check normal Stop Loss hit
                else if (current.high >= stopLossLevel) {
                    exitPrice = f8(stopLossLevel * (1 + slippage / 100));
                    closeReason = 'stop-loss';
                }
                // Check normal Take Profit hit
                else if (current.low <= takeProfitLevel) {
                    exitPrice = f8(takeProfitLevel * (1 + slippage / 100));
                    closeReason = 'take-profit';
                }
                // Check Strategy Exit Signal
                else if (prev.buySignal) {
                    exitPrice = f8(current.open * (1 + slippage / 100));
                    closeReason = 'signal';
                }
            }

            if (exitPrice !== null) {
                const entryValue = new Decimal(entryPrice).times(tradeQuantity);
                const exitValue = new Decimal(exitPrice).times(tradeQuantity);
                const feeRate = new Decimal(fee).dividedBy(100);
                const totalFee = entryValue.plus(exitValue).times(feeRate);

                const grossPnl = positionType === 'long'
                    ? exitValue.minus(entryValue)
                    : entryValue.minus(exitValue);

                const netPnl = grossPnl.minus(totalFee);
                const netPnlNum = netPnl.toDecimalPlaces(8, Decimal.ROUND_HALF_UP).toNumber();

                riskGuardian.registerTrade(netPnlNum);
                currentBalance = currentBalance.plus(netPnl);

                if (currentBalance.greaterThan(peakBalance)) {
                    peakBalance = currentBalance;
                }

                if (peakBalance.greaterThan(0)) {
                    const currentDd = peakBalance.minus(currentBalance).dividedBy(peakBalance).times(100);
                    if (currentDd.greaterThan(maxDrawdownDec)) {
                        maxDrawdownDec = currentDd;
                    }
                }

                const positionValue = entryValue.toNumber();
                const pnlPercent = positionValue > 0 
                    ? new Decimal(netPnlNum).dividedBy(positionValue).times(100).toDecimalPlaces(8, Decimal.ROUND_HALF_UP).toNumber()
                    : 0;

                trades.push({
                    id: `t-${trades.length}`,
                    type: positionType,
                    entryTime,
                    entryPrice,
                    exitTime: current.time,
                    exitPrice,
                    pnl: netPnlNum,
                    pnlPercent,
                    closeReason,
                    stopLoss: stopLossLevel,
                    takeProfit: takeProfitLevel,
                    fee: totalFee.toDecimalPlaces(8, Decimal.ROUND_HALF_UP).toNumber(),
                    peakPrice: entryPeakPrice
                });

                positionType = null;
            }
        }

        // 3. Entry Logic
        if (positionType === null) {
            const signal: 'BUY' | 'SELL' | null = prev.buySignal ? 'BUY' : prev.sellSignal ? 'SELL' : null;

            if (signal) {
                // Respect Risk Guardian (Discipline Management)
                const { allowed } = riskGuardian.canTrade(current.time);
                if (!allowed) continue;

                const slipFactor = signal === 'BUY' ? (1 + slippage / 100) : (1 - slippage / 100);
                entryPrice = f8(current.open * slipFactor);
                entryTime = current.time;
                entryPeakPrice = prev.peakPrice;

                const capitalToUse = useCompounding ? currentBalance : new Decimal(initialCapital);
                tradeQuantity = capitalToUse.times(leverage).dividedBy(entryPrice).toDecimalPlaces(8, Decimal.ROUND_HALF_UP).toNumber();

                if (signal === 'BUY') {
                    positionType = 'long';
                    stopLossLevel = prev.stopLossLevel ?? f8(entryPrice * (1 - (stopLoss || 0) / 100));
                    takeProfitLevel = f8(entryPrice * (1 + (takeProfit || 0) / 100));
                } else {
                    positionType = 'short';
                    stopLossLevel = prev.stopLossLevel ?? f8(entryPrice * (1 + (stopLoss || 0) / 100));
                    takeProfitLevel = f8(entryPrice * (1 - (takeProfit || 0) / 100));
                }
            }
        }
    }

    // 4. Calculate Summary Stats
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);
    const totalWinsPnl = wins.reduce((sum, t) => sum.plus(t.pnl), new Decimal(0));
    const totalLossesPnl = losses.reduce((sum, t) => sum.plus(t.pnl), new Decimal(0));

    const totalPnlDec = currentBalance.minus(initialCapital);
    const totalFeesDec = trades.reduce((sum, t) => sum.plus(t.fee || 0), new Decimal(0));

    const endingBalanceNum = currentBalance.toDecimalPlaces(8, Decimal.ROUND_HALF_UP).toNumber();
    const totalPnlNum = totalPnlDec.toDecimalPlaces(8, Decimal.ROUND_HALF_UP).toNumber();

    const summary: BacktestSummary = {
        totalTrades,
        winRate: totalTrades > 0 ? new Decimal(wins.length).dividedBy(totalTrades).times(100).toDecimalPlaces(4).toNumber() : 0,
        totalPnl: totalPnlNum,
        totalFees: totalFeesDec.toDecimalPlaces(8).toNumber(),
        averageWin: wins.length > 0 ? totalWinsPnl.dividedBy(wins.length).toDecimalPlaces(8).toNumber() : 0,
        averageLoss: losses.length > 0 ? totalLossesPnl.abs().dividedBy(losses.length).toDecimalPlaces(8).toNumber() : 0,
        profitFactor: !totalLossesPnl.isZero() ? totalWinsPnl.dividedBy(totalLossesPnl.abs()).toDecimalPlaces(4).toNumber() : (totalWinsPnl.greaterThan(0) ? Infinity : 0),
        initialCapital,
        endingBalance: endingBalanceNum,
        totalReturnPercent: new Decimal(totalPnlNum).dividedBy(initialCapital).times(100).toDecimalPlaces(4).toNumber(),
        maxDrawdown: maxDrawdownDec.toDecimalPlaces(4).toNumber()
    };

    return { trades, summary, finalBalance: endingBalanceNum, maxDrawdown: summary.maxDrawdown };
}
