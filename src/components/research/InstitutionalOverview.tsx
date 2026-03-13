
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ShieldCheck, Zap, Droplets, Info, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CoinDetails, FearAndGreedIndex } from "@/lib/types"

interface InstitutionalOverviewProps {
  marketDetails: CoinDetails | null
  globalContext: FearAndGreedIndex | null
}

export function InstitutionalOverview({ marketDetails, globalContext }: InstitutionalOverviewProps) {
  // Calculate Vol/MC Ratio (Liquidity Depth)
  // Higher is generally better for liquidity, but too high might mean a pump
  const liquidityRatio = marketDetails ? (marketDetails.volume24h / marketDetails.marketCap) * 100 : 0
  const isLiquidityDeep = liquidityRatio > 5
  const isLiquidityThin = liquidityRatio < 1

  // Calculate Supply Ratio
  const supplyRatio = marketDetails && marketDetails.totalSupply 
    ? (marketDetails.circulatingSupply / marketDetails.totalSupply) * 100 
    : 100

  // Fear & Greed Color
  const getFngColor = (val: number) => {
    if (val <= 25) return "text-red-500"
    if (val <= 45) return "text-orange-500"
    if (val <= 55) return "text-yellow-500"
    if (val <= 75) return "text-green-500"
    return "text-blue-500"
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Global Context */}
      <Card className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-indigo-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-500" />
            Global Market Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <p className={cn("text-3xl font-bold tracking-tight", globalContext ? getFngColor(globalContext.value) : "text-muted-foreground")}>
                {globalContext ? globalContext.value : "--"}
              </p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {globalContext ? globalContext.valueClassification : "Loading..."}
              </p>
            </div>
            <div className="flex gap-1 h-8 items-end">
              {[10, 30, 50, 70, 90].map((step) => (
                <div 
                  key={step}
                  className={cn(
                    "w-2 rounded-t-sm transition-all duration-500",
                    globalContext && globalContext.value >= step - 10 
                      ? "bg-indigo-500 opacity-100" 
                      : "bg-muted opacity-30"
                  )}
                  style={{ height: `${step}%` }}
                />
              ))}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed italic">
            Fear & Greed Index synthesizes social signals, volatility, and dominance to gauge overall market heat.
          </p>
        </CardContent>
      </Card>

      {/* Liquidity & Fundamentals */}
      <Card className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Droplets className="h-4 w-4 text-emerald-500" />
            Institutional Liquidity Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" /> Turnover Ratio (Vol/MC)
              </span>
              <span className={cn("font-bold", isLiquidityDeep ? "text-emerald-500" : isLiquidityThin ? "text-red-500" : "text-amber-500")}>
                {liquidityRatio.toFixed(2)}%
              </span>
            </div>
            <Progress value={Math.min(liquidityRatio * 5, 100)} className="h-1.5" />
            
            <div className="flex justify-between items-center bg-background/40 p-2 rounded-xl border border-border/50">
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Market Cap Rank</span>
                <p className="text-sm font-bold">#{marketDetails?.marketCapRank || '--'}</p>
              </div>
              <Badge variant={isLiquidityDeep ? "default" : "outline"} className={cn("h-6", isLiquidityDeep && "bg-emerald-500/20 text-emerald-500 border-none")}>
                {isLiquidityDeep ? "Deep Liquidity" : isLiquidityThin ? "High Slippage" : "Average Depth"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supply Dynamics (New Row) */}
      <Card className="md:col-span-2 border-dashed">
         <CardContent className="py-4 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 w-full space-y-2">
                <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Circulating Supply Ratio</span>
                    <span>{supplyRatio.toFixed(1)}%</span>
                </div>
                <Progress value={supplyRatio} className="h-2 bg-muted/30" />
            </div>
            <div className="flex gap-3 shrink-0">
                <div className="text-center px-4 py-2 bg-background rounded-2xl border border-border shadow-sm">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">FDV</p>
                    <p className="text-sm font-mono font-bold">
                        {marketDetails?.totalSupply 
                            ? `$${(marketDetails.marketCap / (supplyRatio/100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                            : 'N/A'
                        }
                    </p>
                </div>
                <div className="text-center px-4 py-2 bg-background rounded-2xl border border-border shadow-sm">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Category</p>
                    <p className="text-sm font-bold truncate max-w-[120px]">
                        {marketDetails ? "Layer-1" : "--"} {/* In a real app we'd map this */}
                    </p>
                </div>
            </div>
         </CardContent>
      </Card>
    </div>
  )
}
