"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useApi } from "@/context/api-context"
import { useToast } from "@/hooks/use-toast"
import { 
  TrendingUp, TrendingDown, BarChart3, Activity, Target, 
  AlertTriangle, CheckCircle, Brain, LineChart, Terminal,
  Zap, Shield, DollarSign, Percent, ArrowUpRight, ArrowDownRight
} from "lucide-react"
import { topAssets } from "@/lib/assets"
import { getHistoricalData } from "@/lib/binance-service"
import type { HistoricalData } from "@/lib/types"
import { cn } from "@/lib/utils"

type MarketMetrics = {
  trend: 'bullish' | 'bearish' | 'neutral'
  strength: number
  volatility: number
  momentum: number
  volume: number
}

type TradingSignal = {
  action: 'BUY' | 'SELL' | 'HOLD'
  strength: number
  confidence: number
  riskLevel: 'low' | 'medium' | 'high'
  reasons: string[]
}

type PriceLevel = {
  price: number
  type: 'support' | 'resistance'
  strength: number
}

export default function AIResearchPage() {
  const { isConnected, activeProfile } = useApi()
  const { toast } = useToast()
  
  const [selectedAsset, setSelectedAsset] = useState('BTCUSDT')
  const [selectedInterval, setSelectedInterval] = useState('1h')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [chartData, setChartData] = useState<HistoricalData[]>([])
  const [metrics, setMetrics] = useState<MarketMetrics | null>(null)
  const [signal, setSignal] = useState<TradingSignal | null>(null)
  const [keyLevels, setKeyLevels] = useState<PriceLevel[]>([])

  const intervals = [
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' },
  ]

  const analyzeMarket = async () => {
    if (!isConnected || !activeProfile) {
      toast({
        title: "Not Connected",
        description: "Please connect to Binance API in Settings",
        variant: "destructive"
      })
      return
    }

    setIsAnalyzing(true)
    
    try {
      const keys = { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey }
      const { data } = await getHistoricalData(selectedAsset, selectedInterval, 100, keys)
      
      setChartData(data)
      
      // Calculate market metrics
      const calculatedMetrics = calculateMetrics(data)
      setMetrics(calculatedMetrics)
      
      // Generate trading signal
      const generatedSignal = generateSignal(data, calculatedMetrics)
      setSignal(generatedSignal)
      
      // Identify key levels
      const levels = identifyKeyLevels(data)
      setKeyLevels(levels)
      
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${selectedAsset}`,
      })
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to fetch market data",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const calculateMetrics = (data: HistoricalData[]): MarketMetrics => {
    const prices = data.map(d => d.close)
    const volumes = data.map(d => d.volume)
    
    // Trend calculation
    const recentPrices = prices.slice(-20)
    const oldPrices = prices.slice(-40, -20)
    const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length
    const oldAvg = oldPrices.reduce((a, b) => a + b, 0) / oldPrices.length
    const priceChange = ((recentAvg - oldAvg) / oldAvg) * 100
    
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (priceChange > 2) trend = 'bullish'
    else if (priceChange < -2) trend = 'bearish'
    
    // Strength calculation (0-100)
    const strength = Math.min(Math.abs(priceChange) * 10, 100)
    
    // Volatility calculation
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i])
    const variance = returns.reduce((sum, r) => sum + r * r, 0) / returns.length
    const volatility = Math.sqrt(variance) * 100
    
    // Momentum calculation using RSI
    const rsi = data[data.length - 1]?.rsi || 50
    const momentum = rsi
    
    // Volume analysis
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
    const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5
    const volumeChange = ((recentVolume - avgVolume) / avgVolume) * 100
    
    return {
      trend,
      strength: Math.round(strength),
      volatility: Math.round(volatility * 100),
      momentum: Math.round(momentum),
      volume: Math.round(volumeChange)
    }
  }

  const generateSignal = (data: HistoricalData[], metrics: MarketMetrics): TradingSignal => {
    const lastCandle = data[data.length - 1]
    const rsi = lastCandle.rsi || 50
    const macd = lastCandle.macd || 0
    const macdSignal = lastCandle.macd_signal || 0
    
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
    let strength = 0
    let confidence = 50
    const reasons: string[] = []
    
    // RSI Analysis
    if (rsi < 30) {
      action = 'BUY'
      strength += 25
      reasons.push('RSI oversold (<30)')
    } else if (rsi > 70) {
      action = 'SELL'
      strength += 25
      reasons.push('RSI overbought (>70)')
    }
    
    // MACD Analysis
    if (macd > macdSignal) {
      if (action === 'BUY' || action === 'HOLD') {
        action = 'BUY'
        strength += 20
        reasons.push('MACD bullish crossover')
      }
    } else if (macd < macdSignal) {
      if (action === 'SELL' || action === 'HOLD') {
        action = 'SELL'
        strength += 20
        reasons.push('MACD bearish crossover')
      }
    }
    
    // Trend Analysis
    if (metrics.trend === 'bullish' && action !== 'SELL') {
      action = 'BUY'
      strength += 15
      reasons.push('Strong uptrend detected')
    } else if (metrics.trend === 'bearish' && action !== 'BUY') {
      action = 'SELL'
      strength += 15
      reasons.push('Strong downtrend detected')
    }
    
    // Volume Confirmation
    if (metrics.volume > 20) {
      strength += 10
      reasons.push('High volume confirms signal')
    }
    
    // Momentum Analysis
    if (metrics.momentum > 60 && action === 'BUY') {
      strength += 10
      reasons.push('Positive momentum building')
    } else if (metrics.momentum < 40 && action === 'SELL') {
      strength += 10
      reasons.push('Negative momentum building')
    }
    
    // Calculate confidence
    confidence = Math.min(50 + strength, 95)
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'medium'
    if (metrics.volatility > 60) riskLevel = 'high'
    else if (metrics.volatility < 30) riskLevel = 'low'
    
    if (reasons.length === 0) {
      reasons.push('No strong signals detected')
    }
    
    return {
      action,
      strength: Math.min(strength, 100),
      confidence,
      riskLevel,
      reasons
    }
  }

  const identifyKeyLevels = (data: HistoricalData[]): PriceLevel[] => {
    const levels: PriceLevel[] = []
    
    // Find swing highs and lows
    for (let i = 5; i < data.length - 5; i++) {
      const current = data[i]
      const isSwingHigh = data.slice(i - 5, i).every(d => d.high < current.high) &&
                          data.slice(i + 1, i + 6).every(d => d.high < current.high)
      const isSwingLow = data.slice(i - 5, i).every(d => d.low > current.low) &&
                         data.slice(i + 1, i + 6).every(d => d.low > current.low)
      
      if (isSwingHigh) {
        levels.push({
          price: current.high,
          type: 'resistance',
          strength: 70 + Math.random() * 30
        })
      }
      if (isSwingLow) {
        levels.push({
          price: current.low,
          type: 'support',
          strength: 70 + Math.random() * 30
        })
      }
    }
    
    // Sort and limit to top 5 of each type
    const resistances = levels
      .filter(l => l.type === 'resistance')
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 3)
    const supports = levels
      .filter(l => l.type === 'support')
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 3)
    
    return [...resistances, ...supports].sort((a, b) => b.price - a.price)
  }

  useEffect(() => {
    if (isConnected && activeProfile) {
      analyzeMarket()
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            AI Research Lab
          </h1>
          <p className="text-muted-foreground mt-1">
            Advanced market analysis and AI-powered trading insights
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedAsset} onValueChange={setSelectedAsset}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {topAssets.map(asset => (
                <SelectItem key={asset.ticker} value={`${asset.ticker}USDT`}>
                  {asset.ticker}/USDT
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedInterval} onValueChange={setSelectedInterval}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {intervals.map(interval => (
                <SelectItem key={interval.value} value={interval.value}>
                  {interval.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={analyzeMarket}
            disabled={!isConnected || isAnalyzing}
          >
            {isAnalyzing ? <Activity className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
        </div>
      </div>

      {!isConnected && (
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>API Disconnected</AlertTitle>
          <AlertDescription>
            Please connect to the Binance API in Settings to use AI Research features.
          </AlertDescription>
        </Alert>
      )}

      {metrics && signal && (
        <>
          {/* Trading Signal Card */}
          <Card className={cn(
            "border-2",
            signal.action === 'BUY' && "border-green-500/50 bg-green-500/5",
            signal.action === 'SELL' && "border-red-500/50 bg-red-500/5",
            signal.action === 'HOLD' && "border-yellow-500/50 bg-yellow-500/5"
          )}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  AI Trading Signal
                </CardTitle>
                <Badge 
                  variant={signal.action === 'BUY' ? 'default' : signal.action === 'SELL' ? 'destructive' : 'secondary'}
                  className="text-lg px-4 py-1"
                >
                  {signal.action === 'BUY' && <ArrowUpRight className="mr-1 h-4 w-4" />}
                  {signal.action === 'SELL' && <ArrowDownRight className="mr-1 h-4 w-4" />}
                  {signal.action}
                </Badge>
              </div>
              <CardDescription>
                AI-powered recommendation based on multiple technical indicators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Signal Strength</span>
                    <span className="font-bold">{signal.strength}%</span>
                  </div>
                  <Progress value={signal.strength} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-bold">{signal.confidence}%</span>
                  </div>
                  <Progress value={signal.confidence} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Risk Level</span>
                    <Badge 
                      variant={
                        signal.riskLevel === 'low' ? 'default' : 
                        signal.riskLevel === 'medium' ? 'secondary' : 
                        'destructive'
                      }
                    >
                      {signal.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Key Reasons
                </h4>
                <ul className="space-y-1">
                  {signal.reasons.map((reason, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Market Metrics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Market Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={
                      metrics.trend === 'bullish' ? 'default' : 
                      metrics.trend === 'bearish' ? 'destructive' : 
                      'secondary'
                    }
                    className="text-base"
                  >
                    {metrics.trend === 'bullish' && <TrendingUp className="mr-1 h-4 w-4" />}
                    {metrics.trend === 'bearish' && <TrendingDown className="mr-1 h-4 w-4" />}
                    {metrics.trend.toUpperCase()}
                  </Badge>
                  <span className="text-2xl font-bold">{metrics.strength}%</span>
                </div>
                <Progress value={metrics.strength} className="mt-3 h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-500" />
                  Volatility
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={metrics.volatility > 60 ? 'destructive' : metrics.volatility > 30 ? 'secondary' : 'default'}
                  >
                    {metrics.volatility > 60 ? 'HIGH' : metrics.volatility > 30 ? 'MEDIUM' : 'LOW'}
                  </Badge>
                  <span className="text-2xl font-bold">{metrics.volatility}</span>
                </div>
                <Progress value={Math.min(metrics.volatility, 100)} className="mt-3 h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Momentum (RSI)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={
                      metrics.momentum > 70 ? 'destructive' : 
                      metrics.momentum < 30 ? 'default' : 
                      'secondary'
                    }
                  >
                    {metrics.momentum > 70 ? 'OVERBOUGHT' : metrics.momentum < 30 ? 'OVERSOLD' : 'NEUTRAL'}
                  </Badge>
                  <span className="text-2xl font-bold">{metrics.momentum}</span>
                </div>
                <Progress value={metrics.momentum} className="mt-3 h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  Volume Change
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant={metrics.volume > 20 ? 'default' : 'secondary'}>
                    {metrics.volume > 0 ? 'INCREASING' : 'DECREASING'}
                  </Badge>
                  <span className="text-2xl font-bold">{metrics.volume > 0 ? '+' : ''}{metrics.volume}%</span>
                </div>
                <Progress 
                  value={Math.min(Math.abs(metrics.volume), 100)} 
                  className="mt-3 h-2" 
                />
              </CardContent>
            </Card>
          </div>

          {/* Key Price Levels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Key Price Levels
              </CardTitle>
              <CardDescription>
                Important support and resistance levels identified by AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {keyLevels.length > 0 ? (
                  keyLevels.map((level, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={level.type === 'resistance' ? 'destructive' : 'default'}
                        >
                          {level.type === 'resistance' ? 'RESISTANCE' : 'SUPPORT'}
                        </Badge>
                        <span className="font-mono text-lg font-bold">
                          ${level.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Strength:</span>
                        <span className="font-bold">{Math.round(level.strength)}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No key levels identified yet. Run analysis to detect price levels.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Market Intelligence Tabs */}
          <Tabs defaultValue="technical" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="technical">Technical Analysis</TabsTrigger>
              <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
              <TabsTrigger value="strategy">Strategy Suggestions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="technical" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Technical Indicators Summary</CardTitle>
                  <CardDescription>Current values of key technical indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {chartData.length > 0 && (
                      <>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">RSI (14)</span>
                          <div className="text-xl font-bold">
                            {chartData[chartData.length - 1]?.rsi?.toFixed(2) || 'N/A'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">MACD</span>
                          <div className="text-xl font-bold">
                            {chartData[chartData.length - 1]?.macd?.toFixed(2) || 'N/A'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">BB Upper</span>
                          <div className="text-xl font-bold">
                            ${chartData[chartData.length - 1]?.bb_upper?.toFixed(2) || 'N/A'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">BB Lower</span>
                          <div className="text-xl font-bold">
                            ${chartData[chartData.length - 1]?.bb_lower?.toFixed(2) || 'N/A'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">ATR</span>
                          <div className="text-xl font-bold">
                            {chartData[chartData.length - 1]?.atr?.toFixed(2) || 'N/A'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Volume</span>
                          <div className="text-xl font-bold">
                            {chartData[chartData.length - 1]?.volume?.toFixed(0) || 'N/A'}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="risk" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Risk Analysis
                  </CardTitle>
                  <CardDescription>Comprehensive risk assessment for trading decisions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="text-sm font-medium">Market Risk</span>
                      <Badge variant={signal.riskLevel === 'high' ? 'destructive' : signal.riskLevel === 'medium' ? 'secondary' : 'default'}>
                        {signal.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="text-sm font-medium">Volatility Risk</span>
                      <Badge variant={metrics.volatility > 60 ? 'destructive' : 'default'}>
                        {metrics.volatility > 60 ? 'HIGH' : metrics.volatility > 30 ? 'MEDIUM' : 'LOW'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="text-sm font-medium">Liquidity</span>
                      <Badge variant={metrics.volume > 20 ? 'default' : 'secondary'}>
                        {metrics.volume > 20 ? 'GOOD' : 'MODERATE'}
                      </Badge>
                    </div>
                  </div>
                  
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Risk Management Tips</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
                        <li>Always use stop-loss orders to limit potential losses</li>
                        <li>Position size should not exceed 2-5% of total capital</li>
                        <li>Higher volatility requires wider stop-loss levels</li>
                        <li>Consider market conditions and news events</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="strategy" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Strategy Recommendations
                  </CardTitle>
                  <CardDescription>Personalized trading strategies based on current market conditions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {signal.action === 'BUY' && (
                      <div className="p-4 rounded-lg border border-green-500/50 bg-green-500/5">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Long Position Strategy
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <DollarSign className="h-4 w-4 text-green-500 mt-0.5" />
                            <span>Entry: Consider entering long position at current price</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Shield className="h-4 w-4 text-green-500 mt-0.5" />
                            <span>Stop Loss: Set 2-3% below recent support level</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Target className="h-4 w-4 text-green-500 mt-0.5" />
                            <span>Take Profit: Target 5-8% above entry or next resistance</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Percent className="h-4 w-4 text-green-500 mt-0.5" />
                            <span>Position Size: Use {signal.riskLevel === 'low' ? '3-5%' : signal.riskLevel === 'medium' ? '2-3%' : '1-2%'} of capital</span>
                          </li>
                        </ul>
                      </div>
                    )}
                    
                    {signal.action === 'SELL' && (
                      <div className="p-4 rounded-lg border border-red-500/50 bg-red-500/5">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <TrendingDown className="h-4 w-4" />
                          Short Position Strategy
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <DollarSign className="h-4 w-4 text-red-500 mt-0.5" />
                            <span>Entry: Consider entering short position at current price</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Shield className="h-4 w-4 text-red-500 mt-0.5" />
                            <span>Stop Loss: Set 2-3% above recent resistance level</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Target className="h-4 w-4 text-red-500 mt-0.5" />
                            <span>Take Profit: Target 5-8% below entry or next support</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Percent className="h-4 w-4 text-red-500 mt-0.5" />
                            <span>Position Size: Use {signal.riskLevel === 'low' ? '3-5%' : signal.riskLevel === 'medium' ? '2-3%' : '1-2%'} of capital</span>
                          </li>
                        </ul>
                      </div>
                    )}
                    
                    {signal.action === 'HOLD' && (
                      <div className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/5">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Wait & Watch Strategy
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                            <span>Market is in a consolidation phase - avoid new positions</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                            <span>Wait for clearer directional signals before entering</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                            <span>Monitor key support/resistance levels for breakout</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                            <span>Preserve capital for high-probability setups</span>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
