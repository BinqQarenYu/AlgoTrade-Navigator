"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import type { HistoricalData, CoinDetails, FearAndGreedIndex } from "@/lib/types"
import type { PredictMarketOutput } from "@/ai/flows/predict-market-flow"
import type { DetectManipulationOutput } from "@/ai/flows/detect-manipulation-flow"

export type MarketMetrics = {
  trend: 'bullish' | 'bearish' | 'neutral'
  strength: number
  volatility: number
  momentum: number
  volume: number
}

export type PriceLevel = {
  price: number
  type: 'support' | 'resistance'
  strength: number
}

interface AIResearchState {
  selectedAsset: string
  selectedInterval: string
  chartData: HistoricalData[]
  metrics: MarketMetrics | null
  keyLevels: PriceLevel[]
  aiPrediction: PredictMarketOutput | null
  manipulationResult: DetectManipulationOutput | null
  marketDetails: CoinDetails | null
  globalContext: FearAndGreedIndex | null
}

interface OrderFlowState {
  selectedSymbol: string
  selectedTimeInterval: string
  activeTab: string
}

interface WorkspaceContextType {
  // Global Symbol Memory
  lastSelectedSymbol: string
  setLastSelectedSymbol: (symbol: string) => void

  // AI Research State
  aiResearchState: AIResearchState
  setAiResearchState: React.Dispatch<React.SetStateAction<AIResearchState>>
  updateAiResearch: (partial: Partial<AIResearchState>) => void

  // Order Flow State
  orderFlowState: OrderFlowState
  setOrderFlowState: React.Dispatch<React.SetStateAction<OrderFlowState>>
  updateOrderFlow: (partial: Partial<OrderFlowState>) => void
}

const STORAGE_KEY_AI_RESEARCH = "algotrade_ai_research_workspace_v1"
const STORAGE_KEY_ORDER_FLOW = "algotrade_order_flow_workspace_v1"
const STORAGE_KEY_LAST_SYMBOL = "algotrade_last_symbol_v1"

const defaultAiResearchState: AIResearchState = {
  selectedAsset: 'BTCUSDT',
  selectedInterval: '1h',
  chartData: [],
  metrics: null,
  keyLevels: [],
  aiPrediction: null,
  manipulationResult: null,
  marketDetails: null,
  globalContext: null,
}

const defaultOrderFlowState: OrderFlowState = {
  selectedSymbol: 'BTCUSDT',
  selectedTimeInterval: '30s',
  activeTab: 'overview',
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [lastSelectedSymbol, setLastSelectedSymbolState] = useState<string>('BTCUSDT')
  const [aiResearchState, setAiResearchState] = useState<AIResearchState>(defaultAiResearchState)
  const [orderFlowState, setOrderFlowState] = useState<OrderFlowState>(defaultOrderFlowState)

  // Initialize from sessionStorage on client side
  useEffect(() => {
    try {
      const savedSymbol = sessionStorage.getItem(STORAGE_KEY_LAST_SYMBOL)
      if (savedSymbol) {
        setLastSelectedSymbolState(savedSymbol)
      }

      const savedAiState = sessionStorage.getItem(STORAGE_KEY_AI_RESEARCH)
      if (savedAiState) {
        const parsed = JSON.parse(savedAiState)
        setAiResearchState(parsed)
      }

      const savedOrderFlow = sessionStorage.getItem(STORAGE_KEY_ORDER_FLOW)
      if (savedOrderFlow) {
        const parsed = JSON.parse(savedOrderFlow)
        setOrderFlowState(parsed)
      }
    } catch (e) {
      console.warn("Failed to load workspace state from storage:", e)
    }
  }, [])

  // Sync to sessionStorage
  const setLastSelectedSymbol = (symbol: string) => {
    setLastSelectedSymbolState(symbol)
    try {
      sessionStorage.setItem(STORAGE_KEY_LAST_SYMBOL, symbol)
    } catch (e) {}
  }

  const updateAiResearch = (partial: Partial<AIResearchState>) => {
    setAiResearchState((prev) => {
      const updated = { ...prev, ...partial }
      try {
        sessionStorage.setItem(STORAGE_KEY_AI_RESEARCH, JSON.stringify(updated))
      } catch (e) {}
      return updated
    })
  }

  const updateOrderFlow = (partial: Partial<OrderFlowState>) => {
    setOrderFlowState((prev) => {
      const updated = { ...prev, ...partial }
      try {
        sessionStorage.setItem(STORAGE_KEY_ORDER_FLOW, JSON.stringify(updated))
      } catch (e) {}
      return updated
    })
  }

  return (
    <WorkspaceContext.Provider
      value={{
        lastSelectedSymbol,
        setLastSelectedSymbol,
        aiResearchState,
        setAiResearchState,
        updateAiResearch,
        orderFlowState,
        setOrderFlowState,
        updateOrderFlow,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider")
  }
  return context
}
