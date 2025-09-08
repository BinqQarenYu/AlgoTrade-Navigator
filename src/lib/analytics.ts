'use client';

import { logger } from './logger';
import type { TradeSignal, BacktestResult } from './types';

/**
 * Performance metrics and trade analytics system
 */

export interface TradeRecord {
  id: string;
  botId: string;
  symbol: string;
  strategy: string;
  entryTime: number;
  exitTime?: number;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  side: 'LONG' | 'SHORT';
  pnl?: number;
  pnlPercent?: number;
  fees: number;
  status: 'open' | 'closed' | 'cancelled';
  closeReason?: 'take_profit' | 'stop_loss' | 'signal' | 'manual' | 'emergency';
  confidence: number;
  reasoning?: string;
  tags?: string[];
}

export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  averageTradeLength: number;
  totalFees: number;
  returnOnInvestment: number;
  expectancy: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  largestWin: number;
  largestLoss: number;
}

export interface StrategyPerformance extends PerformanceMetrics {
  strategyId: string;
  strategyName: string;
  timeframe: string;
  symbols: string[];
  lastTrade?: number;
  isActive: boolean;
}

export interface BotPerformance extends PerformanceMetrics {
  botId: string;
  botName: string;
  startTime: number;
  uptime: number;
  strategies: Record<string, StrategyPerformance>;
  dailyPnl: Record<string, number>; // Date string -> PnL
  monthlyPnl: Record<string, number>; // YYYY-MM -> PnL
}

export interface MarketAnalytics {
  symbol: string;
  totalVolume: number;
  averageSpread: number;
  volatility: number;
  priceChange24h: number;
  highestPrice: number;
  lowestPrice: number;
  supportLevels: number[];
  resistanceLevels: number[];
  trendDirection: 'bullish' | 'bearish' | 'sideways';
  strength: number;
}

export class TradingAnalytics {
  private trades: Map<string, TradeRecord> = new Map();
  private botPerformance: Map<string, BotPerformance> = new Map();
  private marketData: Map<string, MarketAnalytics> = new Map();
  private listeners: Set<(data: any) => void> = new Set();

  constructor() {
    this.loadFromStorage();
    logger.info('Trading analytics system initialized', {}, undefined, 'analytics');
  }

  /**
   * Record a new trade
   */
  public recordTrade(trade: Omit<TradeRecord, 'id'>): string {
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tradeRecord: TradeRecord = {
      id: tradeId,
      ...trade,
    };

    this.trades.set(tradeId, tradeRecord);
    this.updateBotPerformance(trade.botId, tradeRecord);
    this.saveToStorage();

    logger.info(
      'Trade recorded for analytics',
      { tradeId, symbol: trade.symbol, strategy: trade.strategy },
      trade.botId,
      'analytics'
    );

    return tradeId;
  }

  /**
   * Update an existing trade (e.g., when closing)
   */
  public updateTrade(tradeId: string, updates: Partial<TradeRecord>): boolean {
    const trade = this.trades.get(tradeId);
    if (!trade) return false;

    const updatedTrade = { ...trade, ...updates };
    this.trades.set(tradeId, updatedTrade);
    this.updateBotPerformance(trade.botId, updatedTrade);
    this.saveToStorage();

    logger.debug(
      'Trade updated in analytics',
      { tradeId, updates },
      trade.botId,
      'analytics'
    );

    return true;
  }

  /**
   * Get bot performance metrics
   */
  public getBotPerformance(botId: string): BotPerformance | undefined {
    return this.botPerformance.get(botId);
  }

  /**
   * Get all bot performance metrics
   */
  public getAllBotPerformance(): Map<string, BotPerformance> {
    return new Map(this.botPerformance);
  }

  /**
   * Get strategy performance across all bots
   */
  public getStrategyPerformance(strategyId: string): StrategyPerformance {
    const strategyTrades = Array.from(this.trades.values())
      .filter(trade => trade.strategy === strategyId);

    return this.calculatePerformanceMetrics(strategyTrades) as StrategyPerformance;
  }

  /**
   * Get performance for a specific symbol
   */
  public getSymbolPerformance(symbol: string): PerformanceMetrics {
    const symbolTrades = Array.from(this.trades.values())
      .filter(trade => trade.symbol === symbol);

    return this.calculatePerformanceMetrics(symbolTrades);
  }

  /**
   * Get trades for a specific bot
   */
  public getBotTrades(botId: string, limit?: number): TradeRecord[] {
    const botTrades = Array.from(this.trades.values())
      .filter(trade => trade.botId === botId)
      .sort((a, b) => b.entryTime - a.entryTime);

    return limit ? botTrades.slice(0, limit) : botTrades;
  }

  /**
   * Get recent trades across all bots
   */
  public getRecentTrades(limit: number = 50): TradeRecord[] {
    return Array.from(this.trades.values())
      .sort((a, b) => b.entryTime - a.entryTime)
      .slice(0, limit);
  }

  /**
   * Get daily PnL for a bot
   */
  public getDailyPnL(botId: string, days: number = 30): Record<string, number> {
    const bot = this.botPerformance.get(botId);
    if (!bot) return {};

    const result: Record<string, number> = {};
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result[dateStr] = bot.dailyPnl[dateStr] || 0;
    }

    return result;
  }

  /**
   * Calculate win streaks and loss streaks
   */
  public getStreaks(botId: string): {
    currentStreak: number;
    currentStreakType: 'win' | 'loss' | 'none';
    longestWinStreak: number;
    longestLossStreak: number;
  } {
    const botTrades = this.getBotTrades(botId);
    
    let currentStreak = 0;
    let currentStreakType: 'win' | 'loss' | 'none' = 'none';
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    for (const trade of botTrades.reverse()) {
      if (trade.status === 'closed' && trade.pnl !== undefined) {
        if (trade.pnl > 0) {
          tempWinStreak++;
          tempLossStreak = 0;
          if (currentStreakType !== 'win') {
            currentStreak = 1;
            currentStreakType = 'win';
          } else {
            currentStreak++;
          }
          longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
        } else if (trade.pnl < 0) {
          tempLossStreak++;
          tempWinStreak = 0;
          if (currentStreakType !== 'loss') {
            currentStreak = 1;
            currentStreakType = 'loss';
          } else {
            currentStreak++;
          }
          longestLossStreak = Math.max(longestLossStreak, tempLossStreak);
        }
      }
    }

    return {
      currentStreak,
      currentStreakType,
      longestWinStreak,
      longestLossStreak,
    };
  }

  /**
   * Generate performance report
   */
  public generateReport(
    botId?: string,
    strategyId?: string,
    timeRange?: { start: number; end: number }
  ): {
    summary: PerformanceMetrics;
    trades: TradeRecord[];
    insights: string[];
    recommendations: string[];
  } {
    let trades = Array.from(this.trades.values());

    // Apply filters
    if (botId) {
      trades = trades.filter(trade => trade.botId === botId);
    }
    if (strategyId) {
      trades = trades.filter(trade => trade.strategy === strategyId);
    }
    if (timeRange) {
      trades = trades.filter(trade => 
        trade.entryTime >= timeRange.start && trade.entryTime <= timeRange.end
      );
    }

    const summary = this.calculatePerformanceMetrics(trades);
    const insights = this.generateInsights(summary, trades);
    const recommendations = this.generateRecommendations(summary, trades);

    return { summary, trades, insights, recommendations };
  }

  /**
   * Calculate comprehensive performance metrics
   */
  private calculatePerformanceMetrics(trades: TradeRecord[]): PerformanceMetrics {
    const closedTrades = trades.filter(trade => trade.status === 'closed' && trade.pnl !== undefined);
    
    if (closedTrades.length === 0) {
      return this.getEmptyMetrics();
    }

    const winningTrades = closedTrades.filter(trade => trade.pnl! > 0);
    const losingTrades = closedTrades.filter(trade => trade.pnl! < 0);
    
    const totalPnl = closedTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const totalFees = closedTrades.reduce((sum, trade) => sum + trade.fees, 0);
    
    const averageWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, trade) => sum + trade.pnl!, 0) / winningTrades.length 
      : 0;
    
    const averageLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl!, 0) / losingTrades.length)
      : 0;

    const profitFactor = averageLoss > 0 ? Math.abs(averageWin / averageLoss) : 0;
    
    // Calculate drawdown
    const { maxDrawdown, maxDrawdownPercent } = this.calculateDrawdown(closedTrades);
    
    // Calculate average trade length
    const averageTradeLength = closedTrades
      .filter(trade => trade.exitTime)
      .reduce((sum, trade) => sum + (trade.exitTime! - trade.entryTime), 0) / closedTrades.length;

    // Calculate Sharpe ratio (simplified)
    const returns = closedTrades.map(trade => trade.pnlPercent || 0);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    // Calculate expectancy
    const winRate = winningTrades.length / closedTrades.length;
    const expectancy = (winRate * averageWin) - ((1 - winRate) * averageLoss);

    return {
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      totalPnl,
      totalPnlPercent: closedTrades.reduce((sum, trade) => sum + (trade.pnlPercent || 0), 0),
      averageWin,
      averageLoss,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      maxDrawdownPercent,
      averageTradeLength,
      totalFees,
      returnOnInvestment: totalPnl > 0 ? (totalPnl / Math.abs(totalPnl + totalFees)) * 100 : 0,
      expectancy,
      consecutiveWins: this.getMaxConsecutive(closedTrades, true),
      consecutiveLosses: this.getMaxConsecutive(closedTrades, false),
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl!)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl!)) : 0,
    };
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateDrawdown(trades: TradeRecord[]): { maxDrawdown: number; maxDrawdownPercent: number } {
    if (trades.length === 0) return { maxDrawdown: 0, maxDrawdownPercent: 0 };

    let peak = 0;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let runningTotal = 0;

    trades.sort((a, b) => a.entryTime - b.entryTime).forEach(trade => {
      runningTotal += trade.pnl || 0;
      
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      
      const drawdown = peak - runningTotal;
      const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
      
      maxDrawdown = Math.max(maxDrawdown, drawdown);
      maxDrawdownPercent = Math.max(maxDrawdownPercent, drawdownPercent);
    });

    return { maxDrawdown, maxDrawdownPercent };
  }

  /**
   * Get maximum consecutive wins or losses
   */
  private getMaxConsecutive(trades: TradeRecord[], wins: boolean): number {
    if (trades.length === 0) return 0;

    let maxConsecutive = 0;
    let currentConsecutive = 0;

    trades.sort((a, b) => a.entryTime - b.entryTime).forEach(trade => {
      const isWin = (trade.pnl || 0) > 0;
      
      if ((wins && isWin) || (!wins && !isWin)) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    });

    return maxConsecutive;
  }

  /**
   * Generate insights from performance data
   */
  private generateInsights(metrics: PerformanceMetrics, trades: TradeRecord[]): string[] {
    const insights: string[] = [];

    if (metrics.winRate > 0.6) {
      insights.push(`High win rate of ${(metrics.winRate * 100).toFixed(1)}% indicates good signal quality`);
    } else if (metrics.winRate < 0.4) {
      insights.push(`Low win rate of ${(metrics.winRate * 100).toFixed(1)}% suggests strategy needs improvement`);
    }

    if (metrics.profitFactor > 1.5) {
      insights.push(`Strong profit factor of ${metrics.profitFactor.toFixed(2)} indicates profitable strategy`);
    } else if (metrics.profitFactor < 1) {
      insights.push(`Profit factor below 1.0 (${metrics.profitFactor.toFixed(2)}) indicates unprofitable strategy`);
    }

    if (metrics.maxDrawdownPercent > 20) {
      insights.push(`High maximum drawdown of ${metrics.maxDrawdownPercent.toFixed(1)}% indicates high risk`);
    }

    if (metrics.sharpeRatio > 1) {
      insights.push(`Good risk-adjusted returns with Sharpe ratio of ${metrics.sharpeRatio.toFixed(2)}`);
    }

    return insights;
  }

  /**
   * Generate recommendations based on performance
   */
  private generateRecommendations(metrics: PerformanceMetrics, trades: TradeRecord[]): string[] {
    const recommendations: string[] = [];

    if (metrics.winRate < 0.4) {
      recommendations.push('Consider adjusting strategy parameters or improving signal quality');
    }

    if (metrics.averageLoss > metrics.averageWin * 2) {
      recommendations.push('Review risk management - losses are significantly larger than wins');
    }

    if (metrics.maxDrawdownPercent > 15) {
      recommendations.push('Implement stricter risk management to reduce drawdown');
    }

    if (metrics.consecutiveLosses > 5) {
      recommendations.push('Add circuit breaker to stop trading after consecutive losses');
    }

    if (metrics.totalFees / Math.abs(metrics.totalPnl) > 0.1) {
      recommendations.push('Consider optimizing trade frequency to reduce fee impact');
    }

    return recommendations;
  }

  /**
   * Update bot performance metrics
   */
  private updateBotPerformance(botId: string, trade: TradeRecord): void {
    let botPerf = this.botPerformance.get(botId);
    
    if (!botPerf) {
      botPerf = {
        botId,
        botName: `Bot ${botId}`,
        startTime: Date.now(),
        uptime: 0,
        strategies: {},
        dailyPnl: {},
        monthlyPnl: {},
        ...this.getEmptyMetrics(),
      };
    }

    // Update daily PnL if trade is closed
    if (trade.status === 'closed' && trade.pnl !== undefined) {
      const dateStr = new Date(trade.exitTime || trade.entryTime).toISOString().split('T')[0];
      botPerf.dailyPnl[dateStr] = (botPerf.dailyPnl[dateStr] || 0) + trade.pnl;
      
      const monthStr = dateStr.substring(0, 7); // YYYY-MM
      botPerf.monthlyPnl[monthStr] = (botPerf.monthlyPnl[monthStr] || 0) + trade.pnl;
    }

    this.botPerformance.set(botId, botPerf);
  }

  /**
   * Get empty metrics template
   */
  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnl: 0,
      totalPnlPercent: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      averageTradeLength: 0,
      totalFees: 0,
      returnOnInvestment: 0,
      expectancy: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      largestWin: 0,
      largestLoss: 0,
    };
  }

  /**
   * Save data to localStorage
   */
  private saveToStorage(): void {
    try {
      if (typeof window === 'undefined') return;

      const data = {
        trades: Array.from(this.trades.entries()),
        botPerformance: Array.from(this.botPerformance.entries()),
        timestamp: Date.now(),
      };

      localStorage.setItem('trading-analytics', JSON.stringify(data));
    } catch (error: any) {
      logger.error(`Failed to save analytics data: ${error.message}`, { error: error.message }, undefined, 'analytics');
    }
  }

  /**
   * Load data from localStorage
   */
  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined') return;

      const stored = localStorage.getItem('trading-analytics');
      if (!stored) return;

      const data = JSON.parse(stored);
      
      if (data.trades) {
        this.trades = new Map(data.trades);
      }
      
      if (data.botPerformance) {
        this.botPerformance = new Map(data.botPerformance);
      }

      logger.info('Analytics data loaded from storage', { 
        tradesCount: this.trades.size,
        botsCount: this.botPerformance.size 
      }, undefined, 'analytics');

    } catch (error: any) {
      logger.error(`Failed to load analytics data: ${error.message}`, { error: error.message }, undefined, 'analytics');
    }
  }

  /**
   * Clear all analytics data
   */
  public clearData(): void {
    this.trades.clear();
    this.botPerformance.clear();
    this.marketData.clear();
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('trading-analytics');
    }

    logger.info('All analytics data cleared', {}, undefined, 'analytics');
  }

  /**
   * Export analytics data
   */
  public exportData(): string {
    const data = {
      trades: Array.from(this.trades.entries()),
      botPerformance: Array.from(this.botPerformance.entries()),
      marketData: Array.from(this.marketData.entries()),
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }
}

// Export singleton instance
export const analytics = new TradingAnalytics();