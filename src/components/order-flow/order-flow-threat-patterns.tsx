import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { type ManipulationPattern } from "@/hooks/use-order-flow";
import { ShieldAlert, Info } from "lucide-react";

interface OrderFlowThreatPatternsProps {
  manipulationPatterns: ManipulationPattern[];
  getPatternIcon: (type: string) => React.ReactNode;
  getSeverityColor: (severity: string) => string;
}

export function OrderFlowThreatPatterns({
  manipulationPatterns,
  getPatternIcon,
  getSeverityColor,
}: OrderFlowThreatPatternsProps) {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 shadow-xl">
        <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight mb-2">
          <ShieldAlert className="h-8 w-8 text-blue-400" />
          Market Manipulation Intelligence
        </h3>
        <p className="text-slate-400 font-medium leading-relaxed max-w-3xl">
          Algorithmic detection of structural market anomalies. These patterns represent potential spoofing, padding, and hostile capital movements designed to artificially influence order book dynamics. 
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {manipulationPatterns.map((pattern, index) => {
          const isHigh = pattern.severity === 'high';
          const isMedium = pattern.severity === 'medium';
          
          return (
            <Card key={index} className={`bg-slate-900 border-l-4 shadow-lg transition-transform hover:-translate-y-1 ${
              isHigh ? 'border-l-red-500 border-y-slate-800 border-r-slate-800 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 
              isMedium ? 'border-l-orange-500 border-y-slate-800 border-r-slate-800' : 
              'border-l-emerald-500 border-y-slate-800 border-r-slate-800'
            }`}>
              <CardHeader className={`pb-4 border-b border-slate-800/50 ${isHigh ? 'bg-red-950/20' : isMedium ? 'bg-orange-950/20' : 'bg-slate-800/20'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      isHigh ? 'bg-red-500/20 text-red-400' : 
                      isMedium ? 'bg-orange-500/20 text-orange-400' : 
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {getPatternIcon(pattern.type)}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black text-white capitalize flex items-center gap-2">
                        {pattern.type === 'padding' ? 'Volume Spoofing / Padding' : 
                         pattern.type === 'scam' ? 'Hostile Scam Vector' : 
                         'Aggressive Rag Pulling'}
                        <Badge className="bg-slate-800 text-slate-300 font-mono text-xs ml-2 border border-slate-700">
                          {pattern.count} DETECTIONS
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-slate-400 mt-2 font-medium max-w-2xl leading-relaxed">
                        {pattern.type === 'padding' ? 
                          'Algorithmic placement of high-frequency micro-orders attempting to fabricate liquidity depth and deceive trend-following algorithms.' :
                         pattern.type === 'scam' ? 
                          'Highly abnormal execution structures strongly correlated with coordinated pump-and-dump or rug-pull operations.' :
                          'Coordinated, rapid-fire market orders designed purely to break support/resistance levels and trigger stop-loss cascades.'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="md:text-right shrink-0">
                    <Badge className={`uppercase font-black tracking-widest px-4 py-2 text-xs border ${
                      isHigh ? 'bg-red-500 text-white border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 
                      isMedium ? 'bg-orange-500 text-white border-orange-400' : 
                      'bg-emerald-500 text-white border-emerald-400'
                    }`}>
                      {isHigh ? 'CRITICAL THREAT' : 
                       isMedium ? 'ELEVATED RISK' : 
                       'STANDARD VARIANCE'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="font-bold text-slate-400 uppercase tracking-widest text-xs">Threat Severity Index</span>
                        <span className={`font-mono font-bold ${isHigh ? 'text-red-400' : isMedium ? 'text-orange-400' : 'text-emerald-400'}`}>
                          {isHigh ? '85.0' : isMedium ? '55.0' : '25.0'} / 100
                        </span>
                      </div>
                      <Progress 
                        value={isHigh ? 85 : isMedium ? 55 : 25} 
                        className={`h-2 bg-slate-800 ${
                          isHigh ? '[&>div]:bg-red-500' : 
                          isMedium ? '[&>div]:bg-orange-500' : 
                          '[&>div]:bg-emerald-500'
                        }`} 
                      />
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-sm font-bold text-slate-400 uppercase">Detection Metric</span>
                      <span className="font-mono text-white font-bold">{pattern.count} matches / hour</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 self-start">
                    <h5 className="flex items-center gap-2 text-sm font-black text-blue-400 uppercase tracking-widest mb-2">
                      <Info className="h-4 w-4" /> Tactical Implications
                    </h5>
                    <p className="text-sm text-slate-300 font-medium leading-relaxed">
                      {pattern.type === 'padding' ? 'Disregard volume spikes that lack corresponding price momentum. These are likely synthetic prints meant to lure retail liquidity.' :
                       pattern.type === 'scam' ? 'Halt algorithmic buying immediately. The asset structure shows severe signs of intentional deterioration or manipulation by controlling entities.' :
                       'Expect immediate high volatility. Market makers are likely withdrawing liquidity. Widen stops if heavily exposed, or wait for structure to settle.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
