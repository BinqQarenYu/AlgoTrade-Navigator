import type { HistoricalData } from './types';

export interface MarketAnalysisRequest {
  symbol: string;
  timeframe: string;
  ohlcData: HistoricalData[];
  volume?: number;
  priceChange24h?: number;
  marketCap?: number;
  indicators?: Record<string, any>;
  news?: Array<{
    title: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    timestamp: Date;
  }>;
}

export interface AIAnalysisResult {
  recommendation: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL';
  confidence: number;
  reasoning: string;
  keyLevels: {
    support?: number;
    resistance?: number;
    indicators: Record<string, any>;
  };
  riskAssessment: {
    factors: string[];
    score: number;
  };
  timeHorizon: string;
  lastUpdated: Date;
  liquidityAnalysis?: {
    safe: boolean;
    poolCount: number;
    warnings: string[];
  };
}

export interface LiquidityPoolInfo {
  address: string;
  token0: {
    symbol: string;
    address: string;
    balance: string;
  };
  token1: {
    symbol: string;
    address: string;
    balance: string;
  };
  liquidity: string;
  volume24h: string;
  fee: number;
  verified: boolean;
}

export class AIAnalysisService {
  private apiKey: string | null;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || null;
    this.baseUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';
  }

  async analyzeMarket(request: MarketAnalysisRequest): Promise<AIAnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(request);
      
      if (!this.apiKey) {
        return this.getMockAnalysis(request);
      }

      const response = await this.callOpenAI(prompt);
      return this.parseAnalysisResponse(response, request);
      
    } catch (error) {
      console.error('AI Analysis error:', error);
      return this.getMockAnalysis(request);
    }
  }

  private buildAnalysisPrompt(request: MarketAnalysisRequest): string {
    const { symbol, timeframe, ohlcData, volume, priceChange24h } = request;
    const recentData = ohlcData.slice(-20);
    const currentPrice = recentData[recentData.length - 1]?.close || 0;
    
    return `Analyze ${symbol} at $${currentPrice}, ${timeframe} timeframe, ${priceChange24h?.toFixed(2)}% change.`;
  }

  private formatOHLCData(data: HistoricalData[]): string {
    return data.map(candle => 
      `${new Date(candle.time).toISOString().substr(0, 16)}: O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close}`
    ).join('\n');
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private parseAnalysisResponse(response: string, request: MarketAnalysisRequest): AIAnalysisResult {
    const recommendation = this.extractRecommendation(response);
    const confidence = this.extractConfidence(response);
    const keyLevels = this.extractKeyLevels(response, request);
    
    return {
      recommendation,
      confidence,
      reasoning: response,
      keyLevels,
      riskAssessment: {
        factors: this.extractRiskFactors(response),
        score: this.calculateRiskScore(response)
      },
      timeHorizon: this.extractTimeHorizon(response),
      lastUpdated: new Date()
    };
  }

  private extractRecommendation(response: string): 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL' {
    const lowerResponse = response.toLowerCase();
    if (lowerResponse.includes('buy')) return 'BUY';
    if (lowerResponse.includes('sell')) return 'SELL';
    if (lowerResponse.includes('hold')) return 'HOLD';
    return 'NEUTRAL';
  }

  private extractConfidence(response: string): number {
    const confidenceMatch = response.match(/confidence[:\s]*(\d+)%?/i);
    return confidenceMatch ? parseInt(confidenceMatch[1]) : 60;
  }

  private extractKeyLevels(response: string, request: MarketAnalysisRequest): { support?: number; resistance?: number; indicators: Record<string, any> } {
    const currentPrice = request.ohlcData[request.ohlcData.length - 1]?.close || 0;
    return {
      support: currentPrice * 0.95,
      resistance: currentPrice * 1.05,
      indicators: request.indicators || {}
    };
  }

  private extractRiskFactors(response: string): string[] {
    const factors: string[] = [];
    if (response.toLowerCase().includes('volatil')) factors.push('High volatility');
    if (response.toLowerCase().includes('volume')) factors.push('Volume concerns');
    return factors.length > 0 ? factors : ['Standard market risks'];
  }

  private calculateRiskScore(response: string): number {
    const lowerResponse = response.toLowerCase();
    let riskScore = 50;
    if (lowerResponse.includes('high risk')) riskScore += 30;
    if (lowerResponse.includes('low risk')) riskScore -= 20;
    return Math.max(0, Math.min(100, riskScore));
  }

  private extractTimeHorizon(response: string): string {
    const lowerResponse = response.toLowerCase();
    if (lowerResponse.includes('short term')) return 'Short-term (1-7 days)';
    if (lowerResponse.includes('long term')) return 'Long-term (1+ months)';
    return 'Medium-term (1-4 weeks)';
  }

  private getMockAnalysis(request: MarketAnalysisRequest): AIAnalysisResult {
    const currentPrice = request.ohlcData[request.ohlcData.length - 1]?.close || 0;
    const priceChange = request.priceChange24h || 0;
    
    let recommendation: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL' = 'NEUTRAL';
    if (priceChange > 5) recommendation = 'BUY';
    else if (priceChange < -5) recommendation = 'SELL';
    else if (Math.abs(priceChange) < 2) recommendation = 'HOLD';
    
    return {
      recommendation,
      confidence: 65,
      reasoning: `Mock analysis for ${request.symbol} at $${currentPrice}, 24h change: ${priceChange.toFixed(2)}%`,
      keyLevels: {
        support: currentPrice * 0.95,
        resistance: currentPrice * 1.05,
        indicators: request.indicators || {}
      },
      riskAssessment: {
        factors: ['Mock analysis limitations', 'Market volatility'],
        score: 60
      },
      timeHorizon: 'Short-term (1-7 days)',
      lastUpdated: new Date()
    };
  }
}

export const aiAnalysisService = new AIAnalysisService();