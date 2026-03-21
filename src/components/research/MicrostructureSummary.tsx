"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Activity, Fingerprint, Ghost, Coins, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { MicrostructureAnalysis } from "@/lib/microstructure-service"

interface MicrostructureSummaryProps {
  metrics: MicrostructureAnalysis | null;
  isAnalyzing: boolean;
}

export function MicrostructureSummary({
  metrics,
  isAnalyzing
}: MicrostructureSummaryProps) {
  
  if (!metrics && !isAnalyzing) return null;

  const isHighToxicity = (metrics?.vpin || 0) > 0.7;
  const isBotFlow = (metrics?.entropyScore || 5) < 3.0;

  return (
    <Card className={cn(
      "border-indigo-500/20 bg-indigo-500/5 backdrop-blur-sm",
      isAnalyzing && "opacity-60 grayscale animate-pulse"
    )}>
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-400" />
          Microstructure Vault
        </CardTitle>
        <CardDescription className="text-[10px] uppercase tracking-wider font-medium opacity-60">
          Real-time Order Flow Micro-Metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Shannon Entropy - Humanity Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 opacity-70">
              <Fingerprint className="h-3.5 w-3.5" />
              Humanity Score
            </span>
            <Badge variant={isBotFlow ? "destructive" : "secondary"} className="text-[9px] h-4">
              {isBotFlow ? "BOT PADDING" : "ORGANIC"}
            </Badge>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-xl font-bold">{metrics?.entropyScore?.toFixed(2) || "4.50"}</span>
            <span className="text-[9px] opacity-40 italic">BITRIATE ENTROPY</span>
          </div>
          <Progress value={Math.min(((metrics?.entropyScore || 4.5) / 6) * 100, 100)} className="h-1 bg-indigo-950" />
        </div>

        {/* VPIN - Toxicity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 opacity-70">
              <AlertTriangle className={cn("h-3.5 w-3.5", isHighToxicity && "text-amber-500")} />
              Flow Toxicity (VPIN)
            </span>
            {isHighToxicity && <span className="text-[9px] text-amber-500 font-bold animate-pulse">TOXICITY ALERT</span>}
          </div>
          <div className="flex items-end justify-between">
            <span className={cn("text-xl font-bold", isHighToxicity && "text-amber-500")}>
                {(metrics?.vpin || 0).toFixed(4)}
            </span>
            <span className="text-[9px] opacity-40 italic">PROBABILITY OF INFORMED TRADES</span>
          </div>
        </div>

        {/* Spoofing / Phantom Liquidity */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5">
           <div className="flex items-center gap-2">
              <Ghost className={cn("h-4 w-4", metrics?.isSpoofing ? "text-red-500 animate-bounce" : "opacity-40")} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Phantom Walls</span>
           </div>
           <Badge className={cn("text-[9px]", metrics?.isSpoofing ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-slate-700")}>
              {metrics?.isSpoofing ? "DETECTED" : "CLEAR"}
           </Badge>
        </div>

        {/* Iceberg Detection */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5">
           <div className="flex items-center gap-2">
              <Activity className={cn("h-4 w-4", metrics?.isIceberg ? "text-cyan-400 animate-pulse" : "opacity-40")} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Shadow Orders</span>
           </div>
           <Badge className={cn("text-[9px]", metrics?.isIceberg ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(34,211,238,0.4)]" : "bg-slate-700")}>
              {metrics?.isIceberg ? "ICEBERG" : "NONE"}
           </Badge>
        </div>

        {/* Funding Rate */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5">
           <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Carry Cost</span>
           </div>
           <div className="text-xs font-mono font-bold text-white">
              {metrics?.fundingRate ? `${(metrics.fundingRate * 100).toFixed(4)}%` : "0.0100%"}
           </div>
        </div>

        {/* Phase 3: Sentiment & Skew Divergence */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-indigo-400 flex items-center gap-1.5">
              <Activity className="h-3 w-3" />
              Toxic Trap Detector
            </span>
            {metrics?.isToxicTrap && (
              <Badge className="bg-orange-600 animate-pulse text-[8px] border-orange-400/50">
                TRAP DETECTED
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded-lg bg-black/30 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                 <span className="text-[8px] font-bold text-slate-500 uppercase">Social</span>
                 <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_5px]", (metrics?.sentimentScore || 0) > 0.1 ? "bg-green-500" : (metrics?.sentimentScore || 0) < -0.1 ? "bg-red-500" : "bg-slate-500")} />
              </div>
              <span className={cn("text-xs font-black", (metrics?.sentimentScore || 0) > 0.1 ? "text-green-400" : (metrics?.sentimentScore || 0) < -0.1 ? "text-red-400" : "text-slate-400")}>
                {metrics?.sentimentScore ? (metrics.sentimentScore > 0.5 ? 'VERY BULL' : metrics.sentimentScore > 0 ? 'BULLISH' : metrics.sentimentScore < -0.5 ? 'VERY BEAR' : 'BEARISH') : 'NEUTRAL'}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-black/30 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                 <span className="text-[8px] font-bold text-slate-500 uppercase">OB Skew</span>
                 <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_5px]", (metrics?.orderBookSkew || 0) > 0.1 ? "bg-green-500" : (metrics?.orderBookSkew || 0) < -0.1 ? "bg-red-500" : "bg-slate-500")} />
              </div>
              <span className={cn("text-xs font-black", (metrics?.orderBookSkew || 0) > 0.1 ? "text-green-400" : (metrics?.orderBookSkew || 0) < -0.1 ? "text-red-400" : "text-slate-400")}>
                {(metrics?.orderBookSkew || 0).toFixed(2)}
              </span>
            </div>
          </div>
          
          {metrics?.isToxicTrap && (
            <div className="p-2 rounded border border-orange-500/20 bg-orange-500/5 text-[9px] text-orange-400 font-medium italic">
              Whale absorption visible on sell-side despite bullish retail sentiment. Entry at own risk.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
