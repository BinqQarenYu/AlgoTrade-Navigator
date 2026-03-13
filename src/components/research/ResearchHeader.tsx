
"use client"

import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Brain, Activity, Zap } from "lucide-react"
import { topAssets } from "@/lib/assets"

interface ResearchHeaderProps {
  selectedAsset: string;
  setSelectedAsset: (asset: string) => void;
  selectedInterval: string;
  setSelectedInterval: (interval: string) => void;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  isConnected: boolean;
}

export function ResearchHeader({
  selectedAsset,
  setSelectedAsset,
  selectedInterval,
  setSelectedInterval,
  isAnalyzing,
  onAnalyze,
  isConnected
}: ResearchHeaderProps) {
  const intervals = [
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '1d', label: '1 Day' },
  ]

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          AI Research Lab
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Advanced multi-model analysis for objective market intelligence
        </p>
      </div>
      <div className="flex flex-wrap gap-2 w-full md:w-auto">
        <Select value={selectedAsset} onValueChange={setSelectedAsset}>
          <SelectTrigger className="w-full md:w-[160px] bg-background border-primary/20">
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
          <SelectTrigger className="w-full md:w-[140px] bg-background border-primary/20">
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
          onClick={onAnalyze}
          disabled={!isConnected || isAnalyzing}
          className="w-full md:w-auto shadow-lg shadow-primary/20"
        >
          {isAnalyzing ? <Activity className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
          {isAnalyzing ? 'Processing AI Models...' : 'Run Research'}
        </Button>
      </div>
    </div>
  )
}
