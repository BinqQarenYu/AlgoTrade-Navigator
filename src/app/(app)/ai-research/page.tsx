"use client"

import React, { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"
import { useApi } from "@/context/api-context"
import { useToast } from "@/hooks/use-toast"
import { getLatestKlinesByLimit } from "@/lib/binance-service"
import { createDualApiService } from "@/lib/dual-coin-api-service"
import { getFearAndGreedIndex } from "@/lib/fear-greed-service"
import type { HistoricalData, CoinDetails, FearAndGreedIndex } from "@/lib/types"

// Modular Components
import { ResearchHeader } from "@/components/research/ResearchHeader"
import { AIAnalysisSignal } from "@/components/research/AIAnalysisSignal"
import { InstitutionalOverview } from "@/components/research/InstitutionalOverview"
import { MarketMetricsGrid } from "@/components/research/MarketMetricsGrid"
import { KeyPriceLevels } from "@/components/research/KeyPriceLevels"
import { ManipulationAlert } from "@/components/research/ManipulationAlert"
import { DetailedAnalysisTabs } from "@/components/research/DetailedAnalysisTabs"

// AI Flows (Server Actions)
import { predictMarket, type PredictMarketOutput } from "@/ai/flows/predict-market-flow"
import { detectManipulation, type DetectManipulationOutput } from "@/ai/flows/detect-manipulation-flow"

type MarketMetrics = {
  trend: 'bullish' | 'bearish' | 'neutral'
  strength: number
  volatility: number
  momentum: number
  volume: number
}

type PriceLevel = {
  price: number
  type: 'support' | 'resistance'
  strength: number
}

export default function AIResearchPage() {
  const { isConnected, activeProfile, geminiApiKey, geminiModel, coingeckoApiKey, coinmarketcapApiKey } = useApi()
  const { toast } = useToast()
  
  const [selectedAsset, setSelectedAsset] = useState('BTCUSDT')
  const [selectedInterval, setSelectedInterval] = useState('1h')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  // Data State
  const [chartData, setChartData] = useState<HistoricalData[]>([])
  const [metrics, setMetrics] = useState<MarketMetrics | null>(null)
  const [keyLevels, setKeyLevels] = useState<PriceLevel[]>([])
  
  // AI Flow Results
  const [aiPrediction, setAiPrediction] = useState<PredictMarketOutput | null>(null)
  const [manipulationResult, setManipulationResult] = useState<DetectManipulationOutput | null>(null)
  
  // Consolidated Data
  const [marketDetails, setMarketDetails] = useState<CoinDetails | null>(null)
  const [globalContext, setGlobalContext] = useState<FearAndGreedIndex | null>(null)

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
      // 1. Fetch Latest K-line Data
      const data = await getLatestKlinesByLimit(selectedAsset, selectedInterval, 100)
      setChartData(data)
      
      // 2. Calculate Local Technical Metrics (Immediate Feedback)
      const calculatedMetrics = calculateMetrics(data)
      setMetrics(calculatedMetrics)
      setKeyLevels(identifyKeyLevels(data))
      
      // 3. Fetch Institutional Analytics (CMC/CG/FearGreed)
      const tickerOnly = selectedAsset.replace('USDT', '').toLowerCase()
      const dualApi = createDualApiService(coingeckoApiKey, coinmarketcapApiKey)
      
      const [fetchedMarketDetails, fetchedGlobalContext] = await Promise.all([
          dualApi.getCoinDetails(tickerOnly).catch(() => null),
          getFearAndGreedIndex().catch(() => null)
      ])
      
      setMarketDetails(fetchedMarketDetails)
      setGlobalContext(fetchedGlobalContext)
      
      // 4. Parallel AI Model Execution
      const recentDataJson = JSON.stringify(data.slice(-30)) // Send last 30 candles to AI
      
      const [prediction, manipulation] = await Promise.all([
        predictMarket({
          symbol: selectedAsset,
          recentData: recentDataJson,
          apiKey: geminiApiKey || undefined,
          model: geminiModel,
          marketDetails: fetchedMarketDetails || undefined,
          globalContext: fetchedGlobalContext || undefined
        }).catch(err => {
            console.error("AI Prediction failed:", err);
            return null;
        }),
        detectManipulation({
          symbol: selectedAsset,
          historicalData: recentDataJson,
          apiKey: geminiApiKey || undefined,
          model: geminiModel,
          marketDetails: fetchedMarketDetails || undefined,
          globalContext: fetchedGlobalContext || undefined
        }).catch(err => {
            console.error("Manipulation Detect failed:", err);
            return null;
        })
      ]);
      
      if (prediction) setAiPrediction(prediction);
      if (manipulation) setManipulationResult(manipulation);
      
      toast({
        title: "AI Analysis Complete",
        description: `Successfully researched ${selectedAsset} using advanced models.`,
      })
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Research Failed",
        description: error.message || "Failed to analyze market data",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Helper Logic (Move to Lib later if shared)
  const calculateMetrics = (data: HistoricalData[]): MarketMetrics => {
    const prices = data.map(d => d.close)
    const volumes = data.map(d => d.volume)
    
    const recentPrices = prices.slice(-20)
    const oldPrices = prices.slice(-40, -20)
    const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length
    const oldAvg = oldPrices.reduce((a, b) => a + b, 0) / oldPrices.length
    const priceChange = ((recentAvg - oldAvg) / oldAvg) * 100
    
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (priceChange > 1.5) trend = 'bullish'
    else if (priceChange < -1.5) trend = 'bearish'
    
    const volatility = Math.sqrt(prices.slice(1).map((p, i) => Math.pow((p - prices[i]) / prices[i], 2)).reduce((a, b) => a + b) / prices.length) * 100
    const rsi = data[data.length - 1]?.rsi || 50
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
    const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5
    const volumeChange = ((recentVolume - avgVolume) / avgVolume) * 100
    
    return {
      trend,
      strength: Math.min(Math.round(Math.abs(priceChange) * 20), 100),
      volatility: Math.round(volatility * 1000),
      momentum: Math.round(rsi),
      volume: Math.round(volumeChange)
    }
  }

  const identifyKeyLevels = (data: HistoricalData[]): PriceLevel[] => {
    const levels: PriceLevel[] = []
    for (let i = 5; i < data.length - 5; i++) {
      const current = data[i]
      const isSwingHigh = data.slice(i - 5, i).every(d => d.high < current.high) && data.slice(i + 1, i + 6).every(d => d.high < current.high)
      const isSwingLow = data.slice(i - 5, i).every(d => d.low > current.low) && data.slice(i + 1, i + 6).every(d => d.low > current.low)
      if (isSwingHigh) levels.push({ price: current.high, type: 'resistance', strength: 70 + Math.random() * 30 })
      if (isSwingLow) levels.push({ price: current.low, type: 'support', strength: 70 + Math.random() * 30 })
    }
    return levels.sort((a, b) => b.strength - a.strength).slice(0, 6).sort((a, b) => b.price - a.price)
  }

  useEffect(() => {
    if (isConnected && activeProfile) {
      analyzeMarket()
    }
  }, [])

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <ResearchHeader 
        selectedAsset={selectedAsset}
        setSelectedAsset={setSelectedAsset}
        selectedInterval={selectedInterval}
        setSelectedInterval={setSelectedInterval}
        isAnalyzing={isAnalyzing}
        onAnalyze={analyzeMarket}
        isConnected={isConnected}
      />

      {(marketDetails || globalContext) && (
        <InstitutionalOverview 
          marketDetails={marketDetails}
          globalContext={globalContext}
        />
      )}

      {!isConnected && (
        <Alert className="bg-destructive/10 border-destructive/20">
          <Terminal className="h-4 w-4" />
          <AlertTitle>API Integration Required</AlertTitle>
          <AlertDescription>
            AI Research requires an active Binance API connection. Please configure your profile in Settings.
          </AlertDescription>
        </Alert>
      )}

      {(metrics || isAnalyzing) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <AIAnalysisSignal 
              aggressive={aiPrediction?.aggressive || null}
              conservative={aiPrediction?.conservative || null}
              institutionalBias={aiPrediction?.institutionalBias}
              isLiquidityManipulation={manipulationResult?.isManipulationSuspected}
              isAnalyzing={isAnalyzing}
            />
            
            <MarketMetricsGrid 
              metrics={metrics}
              isAnalyzing={isAnalyzing}
            />

            <DetailedAnalysisTabs 
              chartData={chartData}
              signal={aiPrediction ? {
                  action: aiPrediction.conservative.prediction === 'UP' ? 'BUY' : aiPrediction.conservative.prediction === 'DOWN' ? 'SELL' : 'HOLD',
                  riskLevel: metrics && metrics.volatility > 60 ? 'high' : 'medium',
                  reasons: [aiPrediction.conservative.reasoning, aiPrediction.aggressive.reasoning]
              } : null}
              metrics={metrics}
              isAnalyzing={isAnalyzing}
            />
          </div>

          <div className="space-y-8">
            <ManipulationAlert 
              isManipulationSuspected={manipulationResult?.isManipulationSuspected || false}
              confidence={manipulationResult?.confidence || 0}
              currentPhase={manipulationResult?.currentPhase || 'None'}
              reasoning={manipulationResult?.reasoning || "Running forensic volumetric analysis..."}
              isAnalyzing={isAnalyzing}
            />
            
            <KeyPriceLevels 
              levels={keyLevels}
              isAnalyzing={isAnalyzing}
            />
          </div>
        </div>
      )}
    </div>
  )
}
