
import type { HistoricalData, BacktestResult, BacktestSummary, DisciplineParams, Trade } from '../types';
import { RiskGuardian } from '../risk-guardian';

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
 * Optimized Backtest Engine - Senior Architect Implementation
 * 
 * Performance: O(N) single-pass iteration.
 * Mathematical Accuracy: Handles price gaps, slippage, and fees with 8-decimal precision.
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
    let currentBalance = initialCapital;
    let peakBalance = initialCapital;
    let maxDrawdown = 0;

    let positionType: 'long' | 'short' | null = null;
    let entryPrice = 0;
    let entryTime = 0;
    let stopLossLevel = 0;
    let takeProfitLevel = 0;
    let tradeQuantity = 0;
    let entryPeakPrice: number | undefined;

    // Fixed math helper to avoid floating point drift
    const f8 = (num: number) => Math.round(num * 1e8) / 1e8;

    for (let i = 1; i < data.length; i++) {
        // 1. Liquidation Check
        if (currentBalance <= 0) break;

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
                    exitPrice = f8(takeProfitLevel);
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
                    exitPrice = f8(takeProfitLevel);
                    closeReason = 'take-profit';
                }
                // Check Strategy Exit Signal
                else if (prev.buySignal) {
                    exitPrice = f8(current.open * (1 + slippage / 100));
                    closeReason = 'signal';
                }
            }

            if (exitPrice !== null) {
                const entryValue = f8(entryPrice * tradeQuantity);
                const exitValue = f8(exitPrice * tradeQuantity);
                const totalFee = f8((entryValue + exitValue) * (fee / 100));
                
                const grossPnl = positionType === 'long' 
                    ? exitValue - entryValue 
                    : entryValue - exitValue;
                
                const netPnl = f8(grossPnl - totalFee);

                riskGuardian.registerTrade(netPnl);
                currentBalance = f8(currentBalance + netPnl);
                
                if (currentBalance > peakBalance) peakBalance = currentBalance;
                const dd = f8(((peakBalance - currentBalance) / peakBalance) * 100);
                if (dd > maxDrawdown) maxDrawdown = dd;

                trades.push({
                    id: `t-${trades.length}`,
                    type: positionType,
                    entryTime,
                    entryPrice,
                    exitTime: current.time,
                    exitPrice,
                    pnl: netPnl,
                    pnlPercent: f8((netPnl / initialCapital) * 100),
                    closeReason,
                    stopLoss: stopLossLevel,
                    takeProfit: takeProfitLevel,
                    fee: totalFee,
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

                // Entry Price calculation with slippage
                entryPrice = f8(current.open * (signal === 'BUY' ? (1 + slippage / 100) : (1 - slippage / 100)));
                entryTime = current.time;
                entryPeakPrice = prev.peakPrice;

                const capitalToUse = useCompounding ? currentBalance : initialCapital;
                tradeQuantity = f8((capitalToUse * leverage) / entryPrice);

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
    const totalWinsPnl = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLossesPnl = losses.reduce((sum, t) => sum + t.pnl, 0);
    const totalPnl = f8(currentBalance - initialCapital);
    const totalFees = trades.reduce((sum, t) => sum + (t.fee || 0), 0);

    const summary: BacktestSummary = {
        totalTrades,
        winRate: totalTrades > 0 ? f8((wins.length / totalTrades) * 100) : 0,
        totalPnl,
        totalFees: f8(totalFees),
        averageWin: wins.length > 0 ? f8(totalWinsPnl / wins.length) : 0,
        averageLoss: losses.length > 0 ? f8(Math.abs(totalLossesPnl / losses.length)) : 0,
        profitFactor: totalLossesPnl !== 0 ? f8(Math.abs(totalWinsPnl / totalLossesPnl)) : (totalWinsPnl > 0 ? Infinity : 0),
        initialCapital,
        endingBalance: f8(currentBalance),
        totalReturnPercent: f8((totalPnl / initialCapital) * 100),
        maxDrawdown: f8(maxDrawdown)
    };

    return { trades, summary, finalBalance: currentBalance, maxDrawdown };
}
