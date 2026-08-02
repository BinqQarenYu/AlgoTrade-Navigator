
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
}

export function ResearchHeader({
  selectedAsset,
  setSelectedAsset,
  selectedInterval,
  setSelectedInterval,
  isAnalyzing,
  onAnalyze
}: ResearchHeaderProps) {
  const intervals = [
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1d' },
  ]

  const quickPills = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT']

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between p-4 bg-background/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl shadow-black/20">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/15 border border-primary/30 rounded-xl shadow-lg shadow-primary/10">
          <Brain className="h-6 w-6 text-primary animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            AI Research Lab
          </h1>
          <p className="text-muted-foreground text-xs">
            Multi-model quantitative market intelligence & predictive signals
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
        {/* Quick Ticker Pills */}
        <div className="hidden sm:flex items-center gap-1.5 p-1 bg-secondary/50 border border-white/10 rounded-xl">
          {quickPills.map(ticker => {
            const isSelected = selectedAsset === ticker
            const label = ticker.replace('USDT', '')
            return (
              <button
                key={ticker}
                onClick={() => setSelectedAsset(ticker)}
                className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg transition-all ${
                  isSelected 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        <Select value={selectedAsset} onValueChange={setSelectedAsset}>
          <SelectTrigger className="w-[130px] bg-background/80 border-white/10 rounded-xl text-xs font-mono font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {topAssets.map(asset => (
              <SelectItem key={asset.ticker} value={`${asset.ticker}USDT`} className="font-mono text-xs">
                {asset.ticker}/USDT
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedInterval} onValueChange={setSelectedInterval}>
          <SelectTrigger className="w-[80px] bg-background/80 border-white/10 rounded-xl text-xs font-mono font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {intervals.map(interval => (
              <SelectItem key={interval.value} value={interval.value} className="font-mono text-xs">
                {interval.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button 
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="shadow-lg shadow-primary/20 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
        >
          {isAnalyzing ? <Activity className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1.5 h-3.5 w-3.5 fill-current" />}
          {isAnalyzing ? 'Analyzing...' : 'Run Research'}
        </Button>
      </div>
    </div>
  )
}
