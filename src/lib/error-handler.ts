'use client';

/**
 * Comprehensive error handling system for the trading bot
 */

export type ErrorType = 
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'RATE_LIMIT'
  | 'INVALID_CREDENTIALS'
  | 'INSUFFICIENT_BALANCE'
  | 'INVALID_SYMBOL'
  | 'ORDER_ERROR'
  | 'WEBSOCKET_ERROR'
  | 'STRATEGY_ERROR'
  | 'DATA_ERROR'
  | 'SYSTEM_ERROR'
  | 'GEO_RESTRICTION';

export interface TradingError extends Error {
  type: ErrorType;
  code?: string | number;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export class TradingErrorHandler {
  private static errorPatterns: Record<string, { type: ErrorType; retryable: boolean; severity: TradingError['severity'] }> = {
    // Binance API Error Codes
    '-1000': { type: 'API_ERROR', retryable: false, severity: 'high' }, // Unknown error
    '-1001': { type: 'NETWORK_ERROR', retryable: true, severity: 'medium' }, // Disconnected
    '-1002': { type: 'API_ERROR', retryable: false, severity: 'high' }, // Unauthorized
    '-1003': { type: 'RATE_LIMIT', retryable: true, severity: 'medium' }, // Too many requests
    '-1006': { type: 'NETWORK_ERROR', retryable: true, severity: 'medium' }, // Unexpected response
    '-1007': { type: 'NETWORK_ERROR', retryable: true, severity: 'medium' }, // Timeout
    '-1008': { type: 'API_ERROR', retryable: false, severity: 'medium' }, // Server overloaded
    '-1013': { type: 'ORDER_ERROR', retryable: false, severity: 'medium' }, // Invalid quantity
    '-1015': { type: 'RATE_LIMIT', retryable: true, severity: 'medium' }, // Too many orders
    '-2010': { type: 'ORDER_ERROR', retryable: false, severity: 'high' }, // New order rejected
    '-2011': { type: 'ORDER_ERROR', retryable: false, severity: 'medium' }, // Cancel rejected
    '-2013': { type: 'ORDER_ERROR', retryable: false, severity: 'medium' }, // Order does not exist
    '-2014': { type: 'INVALID_CREDENTIALS', retryable: false, severity: 'critical' }, // API key format invalid
    '-2015': { type: 'INVALID_CREDENTIALS', retryable: false, severity: 'critical' }, // Invalid API key
    '-2016': { type: 'API_ERROR', retryable: false, severity: 'medium' }, // No trading window
    '-2018': { type: 'INSUFFICIENT_BALANCE', retryable: false, severity: 'high' }, // Balance insufficient
    '-2019': { type: 'INSUFFICIENT_BALANCE', retryable: false, severity: 'high' }, // Margin insufficient
    '-2021': { type: 'ORDER_ERROR', retryable: false, severity: 'medium' }, // Order would immediately trigger
    
    // Custom error patterns
    'NETWORK': { type: 'NETWORK_ERROR', retryable: true, severity: 'medium' },
    'TIMEOUT': { type: 'NETWORK_ERROR', retryable: true, severity: 'medium' },
    'ECONNRESET': { type: 'NETWORK_ERROR', retryable: true, severity: 'medium' },
    'ENOTFOUND': { type: 'NETWORK_ERROR', retryable: true, severity: 'high' },
    'ECONNREFUSED': { type: 'NETWORK_ERROR', retryable: true, severity: 'high' },
    'restricted location': { type: 'GEO_RESTRICTION', retryable: false, severity: 'critical' },
    '451': { type: 'GEO_RESTRICTION', retryable: false, severity: 'critical' },
    '403': { type: 'GEO_RESTRICTION', retryable: false, severity: 'critical' },
  };

  public static createError(
    message: string, 
    originalError?: Error, 
    context?: Record<string, any>
  ): TradingError {
    let errorInfo: { type: ErrorType; retryable: boolean; severity: TradingError['severity'] } = { type: 'SYSTEM_ERROR', retryable: false, severity: 'medium' };
    let code: string | number | undefined;

    // Try to extract error code from message
    const codeMatch = message.match(/-?\d{4}/);
    if (codeMatch) {
      code = codeMatch[0];
      errorInfo = this.errorPatterns[code] || errorInfo;
    }

    // Check for text patterns
    for (const [pattern, info] of Object.entries(this.errorPatterns)) {
      if (message.toLowerCase().includes(pattern.toLowerCase())) {
        errorInfo = info;
        code = pattern;
        break;
      }
    }

    const error = new Error(message) as TradingError;
    error.type = errorInfo.type;
    error.code = code;
    error.retryable = errorInfo.retryable;
    error.severity = errorInfo.severity;
    error.context = context;

    if (originalError) {
      error.stack = originalError.stack;
      error.cause = originalError;
    }

    return error;
  }

  public static shouldRetry(error: TradingError, attemptNumber: number): boolean {
    if (!error.retryable) return false;
    
    const maxAttempts = this.getMaxRetryAttempts(error.type);
    return attemptNumber < maxAttempts;
  }

  public static getRetryDelay(error: TradingError, attemptNumber: number): number {
    const baseDelays: Record<ErrorType, number> = {
      NETWORK_ERROR: 1000,
      API_ERROR: 2000,
      RATE_LIMIT: 60000, // 1 minute for rate limits
      INVALID_CREDENTIALS: 0,
      INSUFFICIENT_BALANCE: 0,
      INVALID_SYMBOL: 0,
      ORDER_ERROR: 1000,
      WEBSOCKET_ERROR: 3000,
      STRATEGY_ERROR: 500,
      DATA_ERROR: 1000,
      SYSTEM_ERROR: 2000,
      GEO_RESTRICTION: 0,
    };

    const baseDelay = baseDelays[error.type] || 2000;
    
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 1000;
    
    return Math.min(exponentialDelay + jitter, 300000); // Cap at 5 minutes
  }

  private static getMaxRetryAttempts(errorType: ErrorType): number {
    const maxAttempts: Record<ErrorType, number> = {
      NETWORK_ERROR: 5,
      API_ERROR: 3,
      RATE_LIMIT: 3,
      INVALID_CREDENTIALS: 0,
      INSUFFICIENT_BALANCE: 0,
      INVALID_SYMBOL: 0,
      ORDER_ERROR: 2,
      WEBSOCKET_ERROR: 5,
      STRATEGY_ERROR: 2,
      DATA_ERROR: 3,
      SYSTEM_ERROR: 3,
      GEO_RESTRICTION: 0,
    };

    return maxAttempts[errorType] || 2;
  }

  public static getErrorAction(error: TradingError): 'retry' | 'stop_bot' | 'emergency_stop' | 'log_only' {
    switch (error.severity) {
      case 'critical':
        return 'emergency_stop';
      case 'high':
        if (error.type === 'INSUFFICIENT_BALANCE' || error.type === 'INVALID_CREDENTIALS') {
          return 'stop_bot';
        }
        return error.retryable ? 'retry' : 'stop_bot';
      case 'medium':
        return error.retryable ? 'retry' : 'log_only';
      case 'low':
        return 'log_only';
      default:
        return 'log_only';
    }
  }
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Record<string, any>
): Promise<T> {
  let lastError: TradingError;
  
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = TradingErrorHandler.createError(
        error.message || 'Unknown error',
        error,
        { ...context, attempt, operationName }
      );

      console.error(`[${operationName}] Attempt ${attempt} failed:`, lastError);

      if (!TradingErrorHandler.shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      const delay = TradingErrorHandler.getRetryDelay(lastError, attempt);
      console.log(`[${operationName}] Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000 // 1 minute
  ) {}

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - operation blocked');
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  public getState(): string {
    return this.state;
  }
}