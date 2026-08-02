"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"
import { useApi } from "@/context/api-context"
import { useWorkspace } from "@/context/workspace-context"
import { useToast } from "@/hooks/use-toast"
import { getLatestKlinesByLimit } from "@/lib/binance-service"
import { createDualApiService } from "@/lib/dual-coin-api-service"
import { getFearAndGreedIndex } from "@/lib/fear-greed-service"
import type { HistoricalData, CoinDetails, FearAndGreedIndex } from "@/lib/types"
import { calculateRSI, calculateMACD, calculateBollingerBands } from "@/lib/indicators"

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
  const { aiResearchState, updateAiResearch, setLastSelectedSymbol } = useWorkspace()
  const { toast } = useToast()
  
  const [selectedAsset, setSelectedAssetState] = useState(aiResearchState.selectedAsset || 'BTCUSDT')
  const [selectedInterval, setSelectedIntervalState] = useState(aiResearchState.selectedInterval || '1h')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  // Data State restored from workspace
  const [chartData, setChartData] = useState<HistoricalData[]>(aiResearchState.chartData || [])
  const [metrics, setMetrics] = useState<MarketMetrics | null>(aiResearchState.metrics || null)
  const [keyLevels, setKeyLevels] = useState<PriceLevel[]>(aiResearchState.keyLevels || [])
  
  // AI Flow Results restored from workspace
  const [aiPrediction, setAiPrediction] = useState<PredictMarketOutput | null>(aiResearchState.aiPrediction || null)
  const [manipulationResult, setManipulationResult] = useState<DetectManipulationOutput | null>(aiResearchState.manipulationResult || null)
  
  // Consolidated Data restored from workspace
  const [marketDetails, setMarketDetails] = useState<CoinDetails | null>(aiResearchState.marketDetails || null)
  const [globalContext, setGlobalContext] = useState<FearAndGreedIndex | null>(aiResearchState.globalContext || null)

  const setSelectedAsset = useCallback((asset: string) => {
    setSelectedAssetState(asset)
    setLastSelectedSymbol(asset)
    updateAiResearch({ selectedAsset: asset })
  }, [setLastSelectedSymbol, updateAiResearch])

  const setSelectedInterval = useCallback((interval: string) => {
    setSelectedIntervalState(interval)
    updateAiResearch({ selectedInterval: interval })
  }, [updateAiResearch])

  // Memoized Metric & Level Calculations to avoid synchronous recalculation on render
  const calculateMetrics = useCallback((data: HistoricalData[]): MarketMetrics => {
    if (!data || data.length === 0) return { trend: 'neutral', strength: 0, volatility: 0, momentum: 50, volume: 0 }

    const prices = data.map(d => d.close)
    const volumes = data.map(d => d.volume)
    
    const recentPrices = prices.slice(-20)
    const oldPrices = prices.slice(-40, -20)
    const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / (recentPrices.length || 1)
    const oldAvg = oldPrices.reduce((a, b) => a + b, 0) / (oldPrices.length || 1)
    const priceChange = oldAvg > 0 ? ((recentAvg - oldAvg) / oldAvg) * 100 : 0
    
    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (priceChange > 1.5) trend = 'bullish'
    else if (priceChange < -1.5) trend = 'bearish'
    
    const volatility = Math.sqrt(prices.slice(1).map((p, i) => Math.pow((p - prices[i]) / (prices[i] || 1), 2)).reduce((a, b) => a + b, 0) / (prices.length || 1)) * 100
    const rsi = data[data.length - 1]?.rsi || 50
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / (volumes.length || 1)
    const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / (volumes.slice(-5).length || 1)
    const volumeChange = avgVolume > 0 ? ((recentVolume - avgVolume) / avgVolume) * 100 : 0
    
    return {
      trend,
      strength: Math.min(Math.round(Math.abs(priceChange) * 20), 100),
      volatility: Math.round(volatility * 1000),
      momentum: Math.round(rsi),
      volume: Math.round(volumeChange)
    }
  }, [])

  const identifyKeyLevels = useCallback((data: HistoricalData[]): PriceLevel[] => {
    if (!data || data.length < 11) return []

    const levels: PriceLevel[] = []
    for (let i = 5; i < data.length - 5; i++) {
      const current = data[i]
      const isSwingHigh = data.slice(i - 5, i).every(d => d.high < current.high) && data.slice(i + 1, i + 6).every(d => d.high < current.high)
      const isSwingLow = data.slice(i - 5, i).every(d => d.low > current.low) && data.slice(i + 1, i + 6).every(d => d.low > current.low)
      const avgVol = data.reduce((sum, d) => sum + d.volume, 0) / data.length
      const volStrength = Math.min(100, 70 + (current.volume / (avgVol || 1)) * 10)

      if (isSwingHigh) levels.push({ price: current.high, type: 'resistance', strength: Math.round(volStrength) })
      if (isSwingLow) levels.push({ price: current.low, type: 'support', strength: Math.round(volStrength) })
    }
    return levels.sort((a, b) => b.strength - a.strength).slice(0, 6).sort((a, b) => b.price - a.price)
  }, [])

  const analyzeMarket = useCallback(async () => {
    setIsAnalyzing(true)
    
    try {
      // 1. Fetch Latest K-line Data concurrently
      const rawData = await getLatestKlinesByLimit(selectedAsset, selectedInterval, 100)

      // Augment raw data with indicators
      const closes = rawData.map(d => d.close)
      const rsi = calculateRSI(closes, 14)
      const macd = calculateMACD(closes, 12, 26, 9)
      const bb = calculateBollingerBands(closes, 20, 2)

      const data = rawData.map((d, i) => ({
        ...d,
        rsi: rsi[i] !== null ? rsi[i] : undefined,
        macd: macd.macd[i] !== null ? macd.macd[i] : undefined,
        bb_upper: bb.upper[i] !== null ? bb.upper[i] : undefined,
        bb_lower: bb.lower[i] !== null ? bb.lower[i] : undefined
      }))
      setChartData(data)
      
      // 2. Calculate Local Technical Metrics
      const calculatedMetrics = calculateMetrics(data)
      const calculatedKeyLevels = identifyKeyLevels(data)
      setMetrics(calculatedMetrics)
      setKeyLevels(calculatedKeyLevels)
      
      // 3. Fetch Institutional Analytics (CMC/CG/FearGreed) in parallel
      const tickerOnly = selectedAsset.replace('USDT', '').toLowerCase()
      const dualApi = createDualApiService(coingeckoApiKey, coinmarketcapApiKey)
      
      const [fetchedMarketDetails, fetchedGlobalContext] = await Promise.all([
          dualApi.getCoinDetails(tickerOnly).catch(() => null),
          getFearAndGreedIndex().catch(() => null)
      ])
      
      setMarketDetails(fetchedMarketDetails)
      setGlobalContext(fetchedGlobalContext)
      
      // 4. Parallel AI Model Execution
      const recentDataJson = JSON.stringify(data.slice(-30))
      
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
      ])
      
      if (prediction) setAiPrediction(prediction)
      if (manipulation) setManipulationResult(manipulation)

      updateAiResearch({
        selectedAsset,
        selectedInterval,
        chartData: data,
        metrics: calculatedMetrics,
        keyLevels: calculatedKeyLevels,
        aiPrediction: prediction,
        manipulationResult: manipulation,
        marketDetails: fetchedMarketDetails,
        globalContext: fetchedGlobalContext,
      })

      toast({
        title: "AI Analysis Complete",
        description: `Successfully analyzed ${selectedAsset} using quantitative models.`,
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
  }, [selectedAsset, selectedInterval, coingeckoApiKey, coinmarketcapApiKey, geminiApiKey, geminiModel, updateAiResearch, toast, calculateMetrics, identifyKeyLevels])

  useEffect(() => {
    if (!aiResearchState.chartData || aiResearchState.chartData.length === 0) {
      analyzeMarket()
    }
  }, [])

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <ResearchHeader 
        selectedAsset={selectedAsset}
        setSelectedAsset={setSelectedAsset}
        selectedInterval={selectedInterval}
        setSelectedInterval={setSelectedInterval}
        isAnalyzing={isAnalyzing}
        onAnalyze={analyzeMarket}
      />

      {(marketDetails || globalContext) && (
        <InstitutionalOverview 
          marketDetails={marketDetails}
          globalContext={globalContext}
        />
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
