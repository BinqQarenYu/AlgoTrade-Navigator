import type { HistoricalData } from './types';

export interface MarketAnalysisRequest {
  symbol: string;
  ohlcData: HistoricalData[];
  priceChange24h?: number;
  volume24h?: number;
  marketCap?: number;
  sentiment?: number;
  liquidityPools?: LiquidityPoolInfo[];
}

export interface LiquidityPoolInfo {
  reserveInUsd: number;
  volume24h: number;
  buys24h: number;
  address: string;
  dex: string;
}

export interface AIAnalysisResult {
  recommendation: 'BUY' | 'SELL' | 'NEUTRAL';
  direction: 'Bullish' | 'Bearish' | 'Sideways';
  strength: 'Low' | 'Medium' | 'High';
  confidence: number; // 0-100
  summary: string;
  technicalAnalysis: {
    trend: string;
    support?: number;
    resistance?: number;
    indicators: Record<string, any>;
  };
  riskAssessment: {
    level: 'Low' | 'Medium' | 'High';
    factors: string[];
  };
  liquidityAnalysis?: {
    safe: boolean;
    poolCount: number;
    totalLiquidity: number;
    warnings: string[];
  };
}

/**
 * AI-powered market analysis service
 * Based on CoinGecko's AI trading bot guide
 */
export class AIAnalysisService {
  private apiKey: string | null;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || null;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  async analyzeMarket(request: MarketAnalysisRequest): Promise<AIAnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(request);
      
      if (!this.apiKey) {
        // Return mock analysis when no API key is available
        return this.generateMockAnalysis(request);
      }

      const response = await this.callOpenAI(prompt, request);
      
      if (!response) {
        throw new Error('Failed to get AI response');
      }

      return this.parseAIResponse(response, request);
    } catch (error) {
      console.error('AI Analysis failed:', error);
      return this.generateFallbackAnalysis(request);
    }
  }

  private buildAnalysisPrompt(request: MarketAnalysisRequest): string {
    const { symbol, ohlcData, priceChange24h, volume24h, marketCap, sentiment, liquidityPools } = request;
    
    const recentData = ohlcData.slice(-20); // Last 20 candles
    const ohlcSummary = this.formatOHLCData(recentData);
    const liquidityInfo = liquidityPools ? this.formatLiquidityData(liquidityPools) : 'No liquidity data available';
    
    return `
Analyze the cryptocurrency ${symbol} based on the following market data:

PRICE DATA:
${ohlcSummary}

MARKET METRICS:
- 24h Price Change: ${priceChange24h || 'N/A'}%
- 24h Volume: $${volume24h ? volume24h.toLocaleString() : 'N/A'}
- Market Cap: $${marketCap ? marketCap.toLocaleString() : 'N/A'}
- Sentiment Score: ${sentiment || 'N/A'}/100

LIQUIDITY ANALYSIS:
${liquidityInfo}

Provide a comprehensive analysis including:
1. Overall recommendation (BUY/SELL/NEUTRAL)
2. Market direction (Bullish/Bearish/Sideways)
3. Signal strength (Low/Medium/High)
4. Confidence level (0-100)
5. Technical analysis summary
6. Risk assessment
7. Key support/resistance levels

Format your response as valid JSON matching this structure:
{
  "recommendation": "BUY|SELL|NEUTRAL",
  "direction": "Bullish|Bearish|Sideways",
  "strength": "Low|Medium|High",
  "confidence": number,
  "summary": "detailed analysis summary",
  "technicalAnalysis": {
    "trend": "trend description",
    "support": number_or_null,
    "resistance": number_or_null,
    "indicators": {"indicator_name": "value"}
  },
  "riskAssessment": {
    "level": "Low|Medium|High",
    "factors": ["risk factor 1", "risk factor 2"]
  },
  "liquidityAnalysis": {
    "safe": boolean,
    "poolCount": number,
    "totalLiquidity": number,
    "warnings": ["warning 1", "warning 2"]
  }
}`;
  }

  private async callOpenAI(prompt: string, request: MarketAnalysisRequest): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert cryptocurrency market analyst. Provide accurate, data-driven analysis in valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private parseAIResponse(response: string, request: MarketAnalysisRequest): AIAnalysisResult {
    try {
      // Extract JSON from response if it's wrapped in markdown or other text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : response;
      
      const parsed = JSON.parse(jsonString);
      
      // Validate and clean the response
      return {
        recommendation: this.validateRecommendation(parsed.recommendation),
        direction: this.validateDirection(parsed.direction),
        strength: this.validateStrength(parsed.strength),
        confidence: Math.max(0, Math.min(100, parsed.confidence || 50)),
        summary: parsed.summary || `Analysis for ${request.symbol}`,
        technicalAnalysis: {
          trend: parsed.technicalAnalysis?.trend || 'Unknown',
          support: parsed.technicalAnalysis?.support || null,
          resistance: parsed.technicalAnalysis?.resistance || null,
          indicators: parsed.technicalAnalysis?.indicators || {},
        },
        riskAssessment: {
          level: this.validateRiskLevel(parsed.riskAssessment?.level),
          factors: Array.isArray(parsed.riskAssessment?.factors) ? parsed.riskAssessment.factors : [],
        },
        liquidityAnalysis: parsed.liquidityAnalysis ? {
          safe: Boolean(parsed.liquidityAnalysis.safe),
          poolCount: parsed.liquidityAnalysis.poolCount || 0,
          totalLiquidity: parsed.liquidityAnalysis.totalLiquidity || 0,
          warnings: Array.isArray(parsed.liquidityAnalysis.warnings) ? parsed.liquidityAnalysis.warnings : [],
        } : undefined,
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.generateFallbackAnalysis(request);
    }
  }

  private formatOHLCData(data: HistoricalData[]): string {
    return data
      .map(candle => 
        `Time: ${new Date(candle.time).toISOString()}, O: ${candle.open}, H: ${candle.high}, L: ${candle.low}, C: ${candle.close}, V: ${candle.volume}`
      )
      .join('\n');
  }

  private formatLiquidityData(pools: LiquidityPoolInfo[]): string {
    if (!pools || pools.length === 0) return 'No liquidity pools found';
    
    const totalLiquidity = pools.reduce((sum, pool) => sum + pool.reserveInUsd, 0);
    const totalVolume = pools.reduce((sum, pool) => sum + pool.volume24h, 0);
    
    return `
Total Pools: ${pools.length}
Total Liquidity: $${totalLiquidity.toLocaleString()}
Total 24h Volume: $${totalVolume.toLocaleString()}
Average Pool Size: $${(totalLiquidity / pools.length).toLocaleString()}

Pool Details:
${pools.map(pool => 
  `- ${pool.dex}: $${pool.reserveInUsd.toLocaleString()} liquidity, $${pool.volume24h.toLocaleString()} volume`
).join('\n')}`;
  }

  private generateMockAnalysis(request: MarketAnalysisRequest): AIAnalysisResult {
    const symbol = request.symbol;
    const lastPrice = request.ohlcData[request.ohlcData.length - 1]?.close || 0;
    const priceChange = request.priceChange24h || 0;
    
    const isPositive = priceChange > 0;
    const volatility = Math.abs(priceChange);
    
    let recommendation: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
    let direction: 'Bullish' | 'Bearish' | 'Sideways' = 'Sideways';
    let strength: 'Low' | 'Medium' | 'High' = 'Medium';
    
    if (volatility > 5) {
      recommendation = isPositive ? 'BUY' : 'SELL';
      direction = isPositive ? 'Bullish' : 'Bearish';
      strength = volatility > 10 ? 'High' : 'Medium';
    }
    
    return {
      recommendation,
      direction,
      strength,
      confidence: Math.max(20, Math.min(80, 50 + Math.abs(priceChange) * 2)),
      summary: `Mock analysis for ${symbol}: Price is ${lastPrice}, showing ${priceChange > 0 ? 'gains' : 'losses'} of ${Math.abs(priceChange).toFixed(2)}% in 24h.`,
      technicalAnalysis: {
        trend: direction,
        support: lastPrice * 0.95,
        resistance: lastPrice * 1.05,
        indicators: {
          'RSI': Math.floor(Math.random() * 40) + 30,
          'MACD': isPositive ? 'Bullish' : 'Bearish',
          'Volume': 'Average'
        },
      },
      riskAssessment: {
        level: volatility > 10 ? 'High' : volatility > 5 ? 'Medium' : 'Low',
        factors: [
          volatility > 10 ? 'High volatility detected' : 'Normal market conditions',
          'Standard market risks apply'
        ],
      },
      liquidityAnalysis: request.liquidityPools ? {
        safe: request.liquidityPools.length > 0,
        poolCount: request.liquidityPools.length,
        totalLiquidity: request.liquidityPools.reduce((sum, pool) => sum + pool.reserveInUsd, 0),
        warnings: request.liquidityPools.length < 3 ? ['Limited liquidity pools available'] : [],
      } : undefined,
    };
  }

  private generateFallbackAnalysis(request: MarketAnalysisRequest): AIAnalysisResult {
    return {
      recommendation: 'NEUTRAL',
      direction: 'Sideways',
      strength: 'Low',
      confidence: 30,
      summary: `Fallback analysis for ${request.symbol}. Unable to perform detailed AI analysis at this time.`,
      technicalAnalysis: {
        trend: 'Inconclusive',
        support: undefined,
        resistance: undefined,
        indicators: {},
      },
      riskAssessment: {
        level: 'Medium',
        factors: ['Analysis service unavailable', 'Limited data available'],
      },
    };
  }

  private validateRecommendation(rec: any): 'BUY' | 'SELL' | 'NEUTRAL' {
    return ['BUY', 'SELL', 'NEUTRAL'].includes(rec) ? rec : 'NEUTRAL';
  }

  private validateDirection(dir: any): 'Bullish' | 'Bearish' | 'Sideways' {
    return ['Bullish', 'Bearish', 'Sideways'].includes(dir) ? dir : 'Sideways';
  }

  private validateStrength(str: any): 'Low' | 'Medium' | 'High' {
    return ['Low', 'Medium', 'High'].includes(str) ? str : 'Medium';
  }

  private validateRiskLevel(level: any): 'Low' | 'Medium' | 'High' {
    return ['Low', 'Medium', 'High'].includes(level) ? level : 'Medium';
  }
}

// Export singleton instance
export const aiAnalysisService = new AIAnalysisService();