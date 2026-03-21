
'use client';

import type { DisciplineParams } from './types';
import { logger } from './logger';

/**
 * Manages trading discipline by tracking performance and enforcing rules.
 * This class monitors consecutive losses and daily drawdown to trigger
 * either a cooldown period or an adaptation recommendation.
 */
export class RiskGuardian {
  private disciplineParams: DisciplineParams;
  private consecutiveLosses: number = 0;
  private sessionPnl: number = 0;
  private cooldownUntil: number | null = null;
  private initialBalance: number;

  constructor(disciplineParams: DisciplineParams, initialBalance: number = 1000) {
    this.disciplineParams = disciplineParams;
    this.initialBalance = initialBalance;
    logger.info("Risk Guardian initialized", { params: disciplineParams }, undefined, "risk-guardian");
  }

  /**
   * Records the outcome of a trade and updates the guardian's state.
   * @param pnl The profit or loss of the completed trade.
   */
  public registerTrade(pnl: number): void {
    this.sessionPnl += pnl;

    if (pnl <= 0) {
      this.consecutiveLosses++;
      logger.debug(`Loss registered`, { consecutiveLosses: this.consecutiveLosses }, undefined, "risk-guardian");
    } else {
      this.consecutiveLosses = 0; // Reset on a winning trade
      logger.debug("Win registered. Consecutive losses reset.", {}, undefined, "risk-guardian");
    }
  }

  /**
   * Checks if a new trade is allowed based on the current state and rules.
   * @param timestamp The current candle timestamp (simulated time).
   * @returns An object indicating if the trade is allowed and the reason if not.
   */
  public canTrade(timestamp: number): { allowed: boolean; reason: string; mode: 'cooldown' | 'adapt' | 'none' } {
    if (!this.disciplineParams.enableDiscipline) {
      return { allowed: true, reason: 'Discipline is disabled.', mode: 'none' };
    }

    // Check for daily drawdown limit
    const drawdownPercent = (this.sessionPnl / this.initialBalance) * 100;
    if (this.sessionPnl < 0 && Math.abs(drawdownPercent) >= this.disciplineParams.dailyDrawdownLimit) {
        return { 
            allowed: false, 
            reason: `Daily drawdown limit of ${this.disciplineParams.dailyDrawdownLimit}% reached.`,
            mode: 'cooldown' 
        };
    }

    // Check for consecutive loss limit
    if (this.consecutiveLosses >= this.disciplineParams.maxConsecutiveLosses) {
      if (this.disciplineParams.onFailure === 'Adapt') {
        return {
          allowed: false,
          reason: `Max consecutive losses (${this.consecutiveLosses}) reached. Adaptation recommended.`,
          mode: 'adapt',
        };
      } else { // Cooldown
        if (!this.cooldownUntil) {
          this.cooldownUntil = timestamp + this.disciplineParams.cooldownPeriodMinutes * 60 * 1000;
        }
      }
    }

    // Check if currently in a cooldown period
    if (this.cooldownUntil && timestamp < this.cooldownUntil) {
      const minutesRemaining = ((this.cooldownUntil - timestamp) / 60000).toFixed(1);
      return {
        allowed: false,
        reason: `Trading is on a mandatory cooldown for another ${minutesRemaining} minutes due to consecutive losses.`,
        mode: 'cooldown',
      };
    } else if (this.cooldownUntil && timestamp >= this.cooldownUntil) {
        // Cooldown has expired
        this.resetCooldown();
    }

    return { allowed: true, reason: 'Ready to trade.', mode: 'none' };
  }

  /**
   * Resets the cooldown timer and consecutive loss counter.
   * This is called automatically when a cooldown expires, or can be called
   * manually if the user acknowledges an "Adapt" recommendation.
   */
  public resetCooldown(): void {
    this.cooldownUntil = null;
    this.consecutiveLosses = 0;
    logger.info("Cooldown expired. Resetting consecutive losses.", {}, undefined, "risk-guardian");
  }

  /**
   * Resets the entire state of the guardian, including PnL.
   */
  public reset(): void {
    this.consecutiveLosses = 0;
    this.sessionPnl = 0;
    this.cooldownUntil = null;
    logger.info("Risk Guardian has been fully reset.", {}, undefined, "risk-guardian");
  }
}
