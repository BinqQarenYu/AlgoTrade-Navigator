
"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Activity, Zap, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface MarketMetricsGridProps {
  metrics: {
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    volatility: number;
    momentum: number;
    volume: number;
  } | null;
  isAnalyzing: boolean;
}

export function MarketMetricsGrid({ 
  metrics,
  isAnalyzing
}: MarketMetricsGridProps) {
  
  if (!metrics && !isAnalyzing) return null;

  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
      isAnalyzing && "opacity-60 grayscale animate-pulse pointer-events-none"
    )}>
      {/* Trend Card */}
      <Card className="border-primary/10 bg-primary/2">
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-primary" /> Market Trend</span>
            <Badge 
              variant={
                metrics?.trend === 'bullish' ? 'default' : 
                metrics?.trend === 'bearish' ? 'destructive' : 
                'secondary'
              }
              className="text-[10px] px-2"
            >
              {metrics?.trend.toUpperCase() || 'CALCULATING'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold">{metrics?.strength || 0}%</h2>
            <span className="text-[10px] font-medium text-muted-foreground mb-1">STRENGTH</span>
          </div>
          <Progress value={metrics?.strength || 0} className="mt-3 h-1.5" />
        </CardContent>
      </Card>

      {/* Volatility Card */}
      <Card className="border-primary/10 bg-primary/2">
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-orange-500" /> Volatility</span>
            <Badge 
              variant={metrics?.volatility && metrics.volatility > 60 ? 'destructive' : metrics?.volatility && metrics.volatility > 30 ? 'secondary' : 'default'}
              className="text-[10px] px-2 shadow-none"
            >
              {metrics?.volatility && metrics.volatility > 60 ? 'DANGEROUS' : metrics?.volatility && metrics.volatility > 30 ? 'NORMAL' : 'LOW'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold">{metrics?.volatility || 0}</h2>
            <span className="text-[10px] font-medium text-muted-foreground mb-1">METRIC SCORE</span>
          </div>
          <Progress value={Math.min(metrics?.volatility || 0, 100)} className="mt-3 h-1.5" />
        </CardContent>
      </Card>

      {/* Momentum Card */}
      <Card className="border-primary/10 bg-primary/2">
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-yellow-500" /> Momentum (RSI)</span>
            <Badge 
              variant={
                metrics?.momentum && metrics.momentum > 70 ? 'destructive' : 
                metrics?.momentum && metrics.momentum < 30 ? 'default' : 
                'secondary'
              }
              className="text-[10px] px-2 shadow-none"
            >
              {metrics?.momentum && metrics.momentum > 70 ? 'PEAK' : metrics?.momentum && metrics.momentum < 30 ? 'FLOOR' : 'NEUTRAL'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold">{metrics?.momentum || 0}</h2>
            <span className="text-[10px] font-medium text-muted-foreground mb-1">RSI-VALUE</span>
          </div>
          <Progress value={metrics?.momentum || 0} className="mt-3 h-1.5" />
        </CardContent>
      </Card>

      {/* Volume Card */}
      <Card className="border-primary/10 bg-primary/2">
        <CardHeader className="pb-3 px-4 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-blue-500" /> Momentum Trend</span>
            <Badge variant={(metrics?.volume || 0) > 20 ? 'default' : 'secondary'} className="text-[10px] px-2 shadow-none">
              {(metrics?.volume || 0) > 0 ? 'ACCUMULATION' : 'DISTRIBUTION'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold">{(metrics?.volume || 0) > 0 ? '+' : ''}{metrics?.volume || 0}%</h2>
            <span className="text-[10px] font-medium text-muted-foreground mb-1">AVG VOLUME CHANGE</span>
          </div>
          <Progress 
            value={Math.min(Math.abs(metrics?.volume || 0), 100)} 
            className="mt-3 h-1.5" 
          />
        </CardContent>
      </Card>
    </div>
  )
}
