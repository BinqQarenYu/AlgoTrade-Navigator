'use client';

import { logger } from './logger';
import type { LiveBotConfig, TradeSignal, ApiProfile } from './types';

/**
 * Comprehensive validation system for trading operations
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TradingLimits {
  minCapital: number;
  maxCapital: number;
  minLeverage: number;
  maxLeverage: number;
  minTakeProfit: number;
  maxTakeProfit: number;
  minStopLoss: number;
  maxStopLoss: number;
  maxActivePositions: number;
  maxDailyTrades: number;
  allowedIntervals: string[];
  allowedSymbols: string[];
}

export class TradingValidator {
  private static limits: TradingLimits = {
    minCapital: parseFloat(process.env.BOT_MIN_CAPITAL || '10'),
    maxCapital: parseFloat(process.env.BOT_MAX_CAPITAL || '10000'),
    minLeverage: 1,
    maxLeverage: parseInt(process.env.BOT_MAX_LEVERAGE || '20', 10),
    minTakeProfit: 0.1,
    maxTakeProfit: 20,
    minStopLoss: 0.1,
    maxStopLoss: 10,
    maxActivePositions: 10,
    maxDailyTrades: 100,
    allowedIntervals: ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d'],
    allowedSymbols: [], // Empty means all symbols allowed
  };

  /**
   * Validate bot configuration
   */
  public static validateBotConfig(config: LiveBotConfig): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Validate asset/symbol
    if (!config.asset || typeof config.asset !== 'string') {
      result.errors.push('Asset/symbol is required and must be a valid string');
    } else if (config.asset.length < 3) {
      result.errors.push('Asset/symbol must be at least 3 characters long');
    } else if (!/^[A-Z0-9]+$/i.test(config.asset)) {
      result.errors.push('Asset/symbol must contain only alphanumeric characters');
    } else if (!config.asset.toUpperCase().endsWith('USDT') && !config.asset.toUpperCase().endsWith('BUSD')) {
      result.warnings.push('Asset/symbol should typically end with USDT or BUSD for futures trading');
    }

    // Validate interval
    if (!config.interval || !this.limits.allowedIntervals.includes(config.interval)) {
      result.errors.push(`Interval must be one of: ${this.limits.allowedIntervals.join(', ')}`);
    }

    // Validate capital
    if (typeof config.capital !== 'number' || isNaN(config.capital)) {
      result.errors.push('Capital must be a valid number');
    } else if (config.capital < this.limits.minCapital) {
      result.errors.push(`Capital must be at least ${this.limits.minCapital}`);
    } else if (config.capital > this.limits.maxCapital) {
      result.errors.push(`Capital cannot exceed ${this.limits.maxCapital}`);
    } else if (config.capital < 50) {
      result.warnings.push('Using low capital may result in very small position sizes');
    }

    // Validate leverage
    if (typeof config.leverage !== 'number' || isNaN(config.leverage)) {
      result.errors.push('Leverage must be a valid number');
    } else if (config.leverage < this.limits.minLeverage) {
      result.errors.push(`Leverage must be at least ${this.limits.minLeverage}`);
    } else if (config.leverage > this.limits.maxLeverage) {
      result.errors.push(`Leverage cannot exceed ${this.limits.maxLeverage}`);
    } else if (config.leverage > 10) {
      result.warnings.push('High leverage increases risk significantly');
    }

    // Validate take profit
    if (typeof config.takeProfit !== 'number' || isNaN(config.takeProfit)) {
      result.errors.push('Take profit must be a valid number');
    } else if (config.takeProfit < this.limits.minTakeProfit) {
      result.errors.push(`Take profit must be at least ${this.limits.minTakeProfit}%`);
    } else if (config.takeProfit > this.limits.maxTakeProfit) {
      result.errors.push(`Take profit cannot exceed ${this.limits.maxTakeProfit}%`);
    }

    // Validate stop loss
    if (typeof config.stopLoss !== 'number' || isNaN(config.stopLoss)) {
      result.errors.push('Stop loss must be a valid number');
    } else if (config.stopLoss < this.limits.minStopLoss) {
      result.errors.push(`Stop loss must be at least ${this.limits.minStopLoss}%`);
    } else if (config.stopLoss > this.limits.maxStopLoss) {
      result.errors.push(`Stop loss cannot exceed ${this.limits.maxStopLoss}%`);
    }

    // Validate risk ratio
    if (typeof config.takeProfit === 'number' && typeof config.stopLoss === 'number') {
      const riskRewardRatio = config.takeProfit / config.stopLoss;
      if (riskRewardRatio < 1) {
        result.warnings.push('Risk/reward ratio is less than 1:1, consider adjusting take profit or stop loss');
      } else if (riskRewardRatio < 1.5) {
        result.warnings.push('Risk/reward ratio is below 1.5:1, which may not be optimal for profitability');
      }
    }

    // Validate strategy
    if (!config.strategy || typeof config.strategy !== 'string') {
      result.errors.push('Strategy is required and must be a valid string');
    }

    // Validate strategy parameters
    if (!config.strategyParams || typeof config.strategyParams !== 'object') {
      result.errors.push('Strategy parameters are required');
    }

    result.isValid = result.errors.length === 0;
    
    if (!result.isValid) {
      logger.error('Bot configuration validation failed', { errors: result.errors, config }, undefined, 'validation');
    } else if (result.warnings.length > 0) {
      logger.warn('Bot configuration has warnings', { warnings: result.warnings, config }, undefined, 'validation');
    }

    return result;
  }

  /**
   * Validate API credentials
   */
  public static validateApiCredentials(profile: ApiProfile): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Validate API key
    if (!profile.apiKey || typeof profile.apiKey !== 'string') {
      result.errors.push('API key is required');
    } else if (profile.apiKey.length < 10) {
      result.errors.push('API key appears to be too short');
    } else if (!/^[A-Za-z0-9]+$/.test(profile.apiKey)) {
      result.errors.push('API key contains invalid characters');
    }

    // Validate secret key
    if (!profile.secretKey || typeof profile.secretKey !== 'string') {
      result.errors.push('Secret key is required');
    } else if (profile.secretKey.length < 10) {
      result.errors.push('Secret key appears to be too short');
    } else if (!/^[A-Za-z0-9+/=]+$/.test(profile.secretKey)) {
      result.errors.push('Secret key contains invalid characters');
    }

    // Validate permissions
    if (!['ReadOnly', 'FuturesTrading'].includes(profile.permissions)) {
      result.errors.push('Invalid API permissions');
    } else if (profile.permissions === 'ReadOnly') {
      result.warnings.push('API key is read-only, trading operations will not work');
    }

    // Validate name
    if (!profile.name || typeof profile.name !== 'string') {
      result.errors.push('Profile name is required');
    } else if (profile.name.length < 1) {
      result.errors.push('Profile name cannot be empty');
    }

    result.isValid = result.errors.length === 0;

    if (!result.isValid) {
      logger.error('API credentials validation failed', { errors: result.errors, profileName: profile.name }, undefined, 'validation');
    }

    return result;
  }

  /**
   * Validate trade signal
   */
  public static validateTradeSignal(signal: TradeSignal): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Validate action
    if (!['UP', 'DOWN'].includes(signal.action)) {
      result.errors.push('Signal action must be UP or DOWN');
    }

    // Validate entry price
    if (typeof signal.entryPrice !== 'number' || isNaN(signal.entryPrice) || signal.entryPrice <= 0) {
      result.errors.push('Entry price must be a positive number');
    }

    // Validate stop loss
    if (typeof signal.stopLoss !== 'number' || isNaN(signal.stopLoss) || signal.stopLoss <= 0) {
      result.errors.push('Stop loss must be a positive number');
    }

    // Validate take profit
    if (typeof signal.takeProfit !== 'number' || isNaN(signal.takeProfit) || signal.takeProfit <= 0) {
      result.errors.push('Take profit must be a positive number');
    }

    // Validate price relationships
    if (typeof signal.entryPrice === 'number' && typeof signal.stopLoss === 'number' && typeof signal.takeProfit === 'number') {
      if (signal.action === 'UP') {
        if (signal.stopLoss >= signal.entryPrice) {
          result.errors.push('For UP signals, stop loss must be below entry price');
        }
        if (signal.takeProfit <= signal.entryPrice) {
          result.errors.push('For UP signals, take profit must be above entry price');
        }
      } else if (signal.action === 'DOWN') {
        if (signal.stopLoss <= signal.entryPrice) {
          result.errors.push('For DOWN signals, stop loss must be above entry price');
        }
        if (signal.takeProfit >= signal.entryPrice) {
          result.errors.push('For DOWN signals, take profit must be below entry price');
        }
      }
    }

    // Validate confidence
    if (typeof signal.confidence !== 'number' || isNaN(signal.confidence) || signal.confidence < 0 || signal.confidence > 1) {
      result.errors.push('Confidence must be a number between 0 and 1');
    } else if (signal.confidence < 0.5) {
      result.warnings.push('Signal confidence is below 50%, consider additional validation');
    }

    // Validate timestamp
    if (typeof signal.timestamp !== 'number' || isNaN(signal.timestamp) || signal.timestamp <= 0) {
      result.errors.push('Timestamp must be a valid positive number');
    } else {
      const now = Date.now();
      const age = now - signal.timestamp;
      if (age > 300000) { // 5 minutes
        result.warnings.push('Signal is more than 5 minutes old');
      } else if (age < 0) {
        result.warnings.push('Signal timestamp is in the future');
      }
    }

    // Validate asset
    if (!signal.asset || typeof signal.asset !== 'string') {
      result.errors.push('Signal asset is required');
    }

    // Validate strategy
    if (!signal.strategy || typeof signal.strategy !== 'string') {
      result.errors.push('Signal strategy is required');
    }

    result.isValid = result.errors.length === 0;

    if (!result.isValid) {
      logger.error('Trade signal validation failed', { errors: result.errors, signal }, undefined, 'validation');
    }

    return result;
  }

  /**
   * Validate order parameters
   */
  public static validateOrderParams(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    price?: number
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Validate symbol
    if (!symbol || typeof symbol !== 'string') {
      result.errors.push('Symbol is required');
    } else if (symbol.length < 3) {
      result.errors.push('Symbol must be at least 3 characters');
    }

    // Validate side
    if (!['BUY', 'SELL'].includes(side)) {
      result.errors.push('Side must be BUY or SELL');
    }

    // Validate quantity
    if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
      result.errors.push('Quantity must be a positive number');
    } else if (quantity < 0.001) {
      result.warnings.push('Very small quantity may be rejected by exchange');
    }

    // Validate price if provided
    if (price !== undefined) {
      if (typeof price !== 'number' || isNaN(price) || price <= 0) {
        result.errors.push('Price must be a positive number');
      }
    }

    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate market conditions for trading
   */
  public static validateMarketConditions(
    price: number,
    volume: number,
    volatility: number
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Validate price
    if (typeof price !== 'number' || isNaN(price) || price <= 0) {
      result.errors.push('Invalid market price');
    }

    // Validate volume
    if (typeof volume !== 'number' || isNaN(volume) || volume < 0) {
      result.errors.push('Invalid market volume');
    } else if (volume < 1000) {
      result.warnings.push('Very low market volume may cause slippage');
    }

    // Validate volatility
    if (typeof volatility === 'number' && !isNaN(volatility)) {
      if (volatility > 0.1) { // 10% volatility
        result.warnings.push('High market volatility detected, exercise caution');
      } else if (volatility < 0.001) { // 0.1% volatility
        result.warnings.push('Very low market volatility may result in fewer trading opportunities');
      }
    }

    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate position size based on account balance
   */
  public static validatePositionSize(
    positionValue: number,
    accountBalance: number,
    leverage: number,
    maxRiskPerTrade: number = 0.02 // 2% default
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (accountBalance <= 0) {
      result.errors.push('Account balance must be positive');
      return result;
    }

    const marginRequired = positionValue / leverage;
    const marginPercentage = marginRequired / accountBalance;
    const riskPercentage = (positionValue * maxRiskPerTrade) / accountBalance;

    // Check margin requirements
    if (marginRequired > accountBalance * 0.9) { // 90% of balance
      result.errors.push('Position size would use more than 90% of account balance as margin');
    } else if (marginRequired > accountBalance * 0.5) { // 50% of balance
      result.warnings.push('Position size uses more than 50% of account balance as margin');
    }

    // Check risk per trade
    if (riskPercentage > maxRiskPerTrade) {
      result.warnings.push(`Position risk (${(riskPercentage * 100).toFixed(2)}%) exceeds recommended maximum (${(maxRiskPerTrade * 100).toFixed(2)}%)`);
    }

    // Check leverage impact
    if (leverage > 10) {
      result.warnings.push('High leverage amplifies both profits and losses significantly');
    }

    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Update trading limits
   */
  public static updateLimits(newLimits: Partial<TradingLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
    logger.info('Trading limits updated', { newLimits }, undefined, 'validation');
  }

  /**
   * Get current trading limits
   */
  public static getLimits(): TradingLimits {
    return { ...this.limits };
  }

  /**
   * Comprehensive validation for starting a trading bot
   */
  public static validateBotStart(
    config: LiveBotConfig,
    apiProfile: ApiProfile,
    accountBalance?: number
  ): ValidationResult {
    const results: ValidationResult[] = [
      this.validateBotConfig(config),
      this.validateApiCredentials(apiProfile),
    ];

    // Additional validation if account balance is available
    if (accountBalance && accountBalance > 0) {
      const positionValue = config.capital * config.leverage;
      results.push(this.validatePositionSize(positionValue, accountBalance, config.leverage));
    }

    // Combine all results
    const combinedResult: ValidationResult = {
      isValid: results.every(r => r.isValid),
      errors: results.flatMap(r => r.errors),
      warnings: results.flatMap(r => r.warnings),
    };

    if (!combinedResult.isValid) {
      logger.error('Bot start validation failed', { errors: combinedResult.errors, config }, undefined, 'validation');
    }

    return combinedResult;
  }
}