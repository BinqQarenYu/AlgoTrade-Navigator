
"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Shield, Brain, Terminal, DollarSign, Target, Percent, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface DetailedAnalysisTabsProps {
  chartData: any[];
  signal: {
    action: string;
    riskLevel: string;
    reasons: string[];
  } | null;
  metrics: {
    volatility: number;
    volume: number;
  } | null;
  isAnalyzing: boolean;
}

export function DetailedAnalysisTabs({
  chartData,
  signal,
  metrics,
  isAnalyzing
}: DetailedAnalysisTabsProps) {
  
  const lastData = chartData[chartData.length - 1] || {};

  return (
    <Tabs defaultValue="technical" className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-11 bg-muted/50 p-1 rounded-xl">
        <TabsTrigger value="technical" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Technical Indicators</TabsTrigger>
        <TabsTrigger value="risk" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Risk Assessment</TabsTrigger>
        <TabsTrigger value="strategy" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">System Recommendations</TabsTrigger>
      </TabsList>
      
      <TabsContent value="technical" className="space-y-4 mt-4">
        <Card className="border-primary/10">
          <CardHeader className="py-5">
            <CardTitle className="text-lg flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                Latest Quantitative Output
            </CardTitle>
            <CardDescription className="text-xs font-mono">Real-time indicators extracted from Binance candles.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/30 rounded-2xl border border-primary/5 space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">RSI (14)</span>
                <div className="text-2xl font-mono font-bold">{lastData.rsi?.toFixed(2) || '---'}</div>
                <div className={cn("text-[9px] font-bold uppercase", (lastData.rsi || 50) > 70 ? "text-red-500" : (lastData.rsi || 50) < 30 ? "text-green-500" : "text-muted-foreground")}>
                    {(lastData.rsi || 50) > 70 ? 'Overbought' : (lastData.rsi || 50) < 30 ? 'Oversold' : 'Neutral Zone'}
                </div>
              </div>
              <div className="p-4 bg-muted/30 rounded-2xl border border-primary/5 space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">MACD Line</span>
                <div className="text-2xl font-mono font-bold">{lastData.macd?.toFixed(4) || '---'}</div>
                <div className="text-[9px] font-bold uppercase text-muted-foreground">PERIOD 12, 26, 9</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-2xl border border-primary/5 space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">BB Upper</span>
                <div className="text-2xl font-mono font-bold text-red-500/80">${lastData.bb_upper?.toLocaleString() || '---'}</div>
                <div className="text-[9px] font-bold uppercase text-muted-foreground">TOP BAND</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-2xl border border-primary/5 space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">BB Lower</span>
                <div className="text-2xl font-mono font-bold text-green-500/80">${lastData.bb_lower?.toLocaleString() || '---'}</div>
                <div className="text-[9px] font-bold uppercase text-muted-foreground">BOTTOM BAND</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="risk" className="space-y-4 mt-4">
        <Card className="border-primary/10">
          <CardHeader className="py-5">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Safety Protocols & Risks
            </CardTitle>
            <CardDescription className="text-xs">Holistic risk evaluation of the current trade setup.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-primary/10 bg-muted/30">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Overall Risk</span>
                  <Badge variant={signal?.riskLevel === 'high' ? 'destructive' : signal?.riskLevel === 'medium' ? 'secondary' : 'default'} className="text-sm font-bold w-full justify-center py-1">
                    {signal?.riskLevel?.toUpperCase() || '---'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-primary/10 bg-muted/30">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Volatility Risk</span>
                  <Badge variant={(metrics?.volatility || 0) > 60 ? 'destructive' : 'default'} className="text-sm font-bold w-full justify-center py-1">
                    {(metrics?.volatility || 0) > 60 ? 'HIGH' : (metrics?.volatility || 0) > 30 ? 'MODERATE' : 'STABLE'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-primary/10 bg-muted/30">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Volume Health</span>
                  <Badge variant={(metrics?.volume || 0) > 20 ? 'default' : 'secondary'} className="text-sm font-bold w-full justify-center py-1">
                    {(metrics?.volume || 0) > 20 ? 'HEALTHY' : 'DORMANT'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex items-start gap-4">
                <div className="p-2 bg-yellow-500/20 rounded-lg shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-yellow-700 mb-1 leading-none uppercase tracking-wider">Trading Discipline Guidelines</h4>
                    <p className="text-xs text-yellow-600/80 leading-relaxed italic">"High volatility environments typically require wider stop-losses (ATR x 2.5). Avoid over-leveraging beyond 5x in current market conditions."</p>
                </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="strategy" className="space-y-4 mt-4">
        <Card className="border-primary/10">
          <CardHeader className="py-5">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Strategic Implementation
            </CardTitle>
            <CardDescription className="text-xs">How to execute the current AI consensus within a professional strategy.</CardDescription>
          </CardHeader>
          <CardContent>
            {signal?.action === 'BUY' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold text-green-600/60 uppercase tracking-widest flex items-center gap-1"><DollarSign className="h-3 w-3" /> Entry Type</span>
                        <div className="text-sm font-bold text-green-800">LIMIT / MARKET</div>
                   </div>
                   <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold text-green-600/60 uppercase tracking-widest flex items-center gap-1"><Shield className="h-3 w-3" /> Stop Loss</span>
                        <div className="text-sm font-bold text-green-800">~2.5% BELOW SUPPORT</div>
                   </div>
                   <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold text-green-600/60 uppercase tracking-widest flex items-center gap-1"><Target className="h-3 w-3" /> Take Profit</span>
                        <div className="text-sm font-bold text-green-800">RR 1:2.0 MINTARGET</div>
                   </div>
                   <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold text-green-600/60 uppercase tracking-widest flex items-center gap-1"><Percent className="h-3 w-3" /> Allocation</span>
                        <div className="text-sm font-bold text-green-800">MAX 3% PORTFOLIO</div>
                   </div>
                </div>
              </div>
            )}
            
            {signal?.action === 'SELL' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold text-red-600/60 uppercase tracking-widest flex items-center gap-1"><DollarSign className="h-3 w-3" /> Short Entry</span>
                        <div className="text-sm font-bold text-red-800">REJECTION CONFIRM</div>
                   </div>
                   <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold text-red-600/60 uppercase tracking-widest flex items-center gap-1"><Shield className="h-3 w-3" /> Stop Loss</span>
                        <div className="text-sm font-bold text-red-800">~1.5% ABOVE RESISTANCE</div>
                   </div>
                   <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold text-red-600/60 uppercase tracking-widest flex items-center gap-1"><Target className="h-3 w-3" /> Take Profit</span>
                        <div className="text-sm font-bold text-red-800">NEAR MAJOR SUPPORT</div>
                   </div>
                   <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold text-red-600/60 uppercase tracking-widest flex items-center gap-1"><Percent className="h-3 w-3" /> Allocation</span>
                        <div className="text-sm font-bold text-red-800">MAX 2.5% PORTFOLIO</div>
                   </div>
                </div>
              </div>
            )}
            
            {(signal?.action === 'HOLD' || !signal) && (
              <div className="p-12 text-center border-2 border-dashed rounded-3xl border-primary/5 bg-muted/20">
                <Activity className="h-10 w-10 mx-auto text-primary/30 mb-4" />
                <h4 className="text-lg font-bold text-muted-foreground uppercase tracking-widest">No Active Strategy Required</h4>
                <p className="text-sm text-muted-foreground/60 mt-2 italic px-12">"The system is currently in 'Wait & Watch' mode. No high-probability setups are detected in the current candle cluster. Capital preservation is priority."</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
