'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, TrendingDown, Target, Zap, ShieldAlert } from "lucide-react";

interface Signal {
  signal_id: string;
  timestamp: number;
  symbol: string;
  strategy_id: string;
  signal_type: 'BUY' | 'SELL';
  entry_price: number;
  exit_price?: number;
  outcome?: 'WIN' | 'LOSS' | 'OPEN';
  profit_delta?: number;
  feature_vector: string;
}

interface PerformanceData {
  signals: Signal[];
  stats: {
    winRate: number;
    sampleSize: number;
    confidenceMultiplier: number;
    modelStatus: string;
  };
}

export function BayesianPerformanceTracker({ symbol }: { symbol: string }) {
  const [perfData, setPerfData] = useState<PerformanceData | null>(null);

  const fetchPerformance = async () => {
    try {
      const response = await fetch(`/api/ai/performance?symbol=${symbol}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setPerfData(data);
      }
    } catch (e) {
      console.error("Failed to fetch Bayesian perf", e);
    }
  };

  useEffect(() => {
    fetchPerformance();
    const interval = setInterval(fetchPerformance, 15000); // 15s refresh for AI stats
    return () => clearInterval(interval);
  }, [symbol]);

  if (!perfData) return null;

  return (
    <div className="space-y-4">
      {/* Bayesian Learning Status */}
      <div className="flex items-center justify-between bg-indigo-950/20 border border-indigo-500/20 p-3 rounded-lg backdrop-blur-sm">
         <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${perfData.stats.winRate > 0.5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'} animate-pulse`}>
               <Brain className="h-4 w-4" />
            </div>
            <div>
               <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Model Intelligence Level</p>
               <h4 className="text-sm font-black text-white uppercase tracking-tighter">
                 {perfData.stats.modelStatus} ({ (perfData.stats.winRate * 100).toFixed(1) } % Win Rate)
               </h4>
            </div>
         </div>
         <div className="text-right">
            <p className="text-[9px] font-black text-slate-500 uppercase">Confidence Multiplier</p>
            <p className={`text-lg font-black font-mono ${perfData.stats.confidenceMultiplier >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              x{perfData.stats.confidenceMultiplier.toFixed(2)}
            </p>
         </div>
      </div>

      {/* Recent AI Captured Signals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
         {perfData.signals.map((signal) => {
            const isWin = signal.outcome === 'WIN';
            const isLoss = signal.outcome === 'LOSS';
            const isOpen = signal.outcome === 'OPEN';
            
            return (
               <Card key={signal.signal_id} className={`bg-slate-900 border transition-all ${
                 isWin ? 'border-emerald-500/30 shadow-[0_4px_10px_rgba(16,185,129,0.1)]' : 
                 isLoss ? 'border-rose-500/30' : 'border-indigo-500/30 border-dashed'
               }`}>
                  <CardContent className="p-3">
                     <div className="flex justify-between items-start mb-2">
                        <Badge className={`text-[8px] font-black px-1.5 py-0 ${signal.signal_type === 'BUY' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                          {signal.signal_type}
                        </Badge>
                        <span className="text-[8px] font-mono text-slate-500">{new Date(signal.timestamp).toLocaleTimeString()}</span>
                     </div>
                     <div className="text-xs font-black text-white font-mono leading-none mb-1">
                        {signal.entry_price} &rarr; {signal.exit_price || '...'}
                     </div>
                     <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
                        <div className={`text-[9px] font-black uppercase ${isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-indigo-400 animate-pulse'}`}>
                           {isOpen ? 'Capturing DNA' : signal.outcome}
                        </div>
                        {signal.profit_delta !== undefined && (
                           <div className={`text-[9px] font-black font-mono ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                              { (signal.profit_delta >= 0 ? '+' : '') + signal.profit_delta.toFixed(3) }%
                           </div>
                        )}
                     </div>
                  </CardContent>
               </Card>
            );
         })}
      </div>
    </div>
  );
}
