
"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Target, CheckCircle, ArrowUpRight, ArrowDownRight, Info, AlertTriangle, ShieldCheck, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface PredictionDetail {
  prediction: 'UP' | 'DOWN' | 'NEUTRAL';
  confidence: number;
  reasoning: string;
  recommendation: string;
}

interface AIAnalysisSignalProps {
  aggressive: PredictionDetail | null;
  conservative: PredictionDetail | null;
  institutionalBias?: string;
  isLiquidityManipulation?: boolean;
  isAnalyzing: boolean;
}

export function AIAnalysisSignal({
  aggressive,
  conservative,
  institutionalBias,
  isLiquidityManipulation = false,
  isAnalyzing
}: AIAnalysisSignalProps) {
  
  const renderStrategyCard = (title: string, data: PredictionDetail | null, variant: 'aggressive' | 'conservative') => {
    const action = data?.prediction || 'NEUTRAL';
    const displayAction = action === 'UP' ? 'BUY' : action === 'DOWN' ? 'SELL' : 'HOLD';
    const confidencePercent = Math.round((data?.confidence || 0.5) * 100);
    
    return (
      <div className={cn(
        "p-5 rounded-2xl border-2 transition-all duration-300 flex-1",
        displayAction === 'BUY' && "border-green-500/20 bg-green-500/5",
        displayAction === 'SELL' && "border-red-500/20 bg-red-500/5",
        displayAction === 'HOLD' && "border-yellow-500/20 bg-yellow-500/5"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
             <div className={cn(
                 "p-1.5 rounded-lg",
                 variant === 'aggressive' ? "bg-orange-500/10 text-orange-500" : "bg-blue-500/10 text-blue-500"
             )}>
                {variant === 'aggressive' ? <Zap className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
             </div>
             <span className="font-bold text-sm tracking-tight uppercase">{title}</span>
          </div>
          <Badge 
            variant={displayAction === 'BUY' ? 'default' : displayAction === 'SELL' ? 'destructive' : 'secondary'}
            className="font-bold px-3 py-0.5"
          >
            {displayAction}
          </Badge>
        </div>

        <div className="space-y-4">
            <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                    <span>Model Confidence</span>
                    <span>{confidencePercent}%</span>
                </div>
                <Progress value={confidencePercent} className="h-1" />
            </div>

            <div className="space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed italic line-clamp-3">
                    "{data?.reasoning || "Analyzing short-term volatility patterns..."}"
                </p>
                <div className="pt-2 border-t border-border/50">
                    <p className="text-[10px] font-bold text-primary uppercase mb-1">Instruction:</p>
                    <p className="text-xs font-semibold text-foreground">
                        {data?.recommendation || "Wait for data sync..."}
                    </p>
                </div>
            </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={cn(
      "border-none shadow-2xl shadow-primary/5 bg-background/50 backdrop-blur-xl",
      isAnalyzing && "opacity-50 grayscale pointer-events-none animate-pulse"
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl font-black italic tracking-tighter">
              <Target className="h-6 w-6 text-primary" />
              AI STRATEGY CONSENSUS
            </CardTitle>
            <CardDescription className="text-xs font-medium">
                Dual-timeframe intelligence synthesizing current data streams
            </CardDescription>
          </div>
          {isLiquidityManipulation && (
            <Badge variant="destructive" className="animate-bounce">
              <AlertTriangle className="mr-1 h-3 w-3" /> Manipulation Risk
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          {renderStrategyCard("Aggressive Scalp", aggressive, 'aggressive')}
          {renderStrategyCard("Conservative Trend", conservative, 'conservative')}
        </div>

        {institutionalBias && (
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Institutional Bias</p>
                    <p className="text-sm font-medium text-muted-foreground leading-snug">
                        {institutionalBias}
                    </p>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  )
}
