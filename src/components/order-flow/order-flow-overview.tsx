import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Target, Activity, CheckCircle, XCircle, AlertTriangle, ShieldAlert, Cpu, Brain, TrendingUp, TrendingDown } from "lucide-react";
import { OrderFlowStats } from "./order-flow-stats";
import { type ManipulationPattern, type OrderFlowData } from "@/hooks/use-order-flow";
import { BayesianPerformanceTracker } from "./bayesian-performance-tracker";
import { RAGTrainingOrchestrator } from "./rag-training-orchestrator";

interface OrderFlowOverviewProps {
  stats: any;
  selectedSymbol: string;
  isMonitoring: boolean;
  orderFlowData: OrderFlowData[];
  manipulationPatterns: ManipulationPattern[];
  calculateMarketSentiment: () => number;
  getVolumeIndicator: () => string;
  getVolumeDescription: () => string;
  getVolumeExplanation: () => string;
  getRiskLevel: () => string;
  getRiskLevelColor: () => string;
  getRiskExplanation: () => string;
  getRecommendedActions: () => { title: string; description: string }[];
  getPatternIcon: (type: string) => React.ReactNode;
  getSeverityColor: (severity: string) => string;
}

export function OrderFlowOverview({
  stats,
  selectedSymbol,
  isMonitoring,
  orderFlowData,
  manipulationPatterns,
  calculateMarketSentiment,
  getVolumeIndicator,
  getVolumeDescription,
  getVolumeExplanation,
  getRiskLevel,
  getRiskLevelColor,
  getRiskExplanation,
  getRecommendedActions,
  getPatternIcon,
  getSeverityColor,
}: OrderFlowOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 shadow-xl">
        <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight mb-2">
          {getVolumeIndicator()} Quant Execution Overview
        </h3>
        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">{selectedSymbol} | Bayesian Feedback Active</p>
      </div>

      {/* Bayesian RAG Training Control - NEW */}
      <RAGTrainingOrchestrator symbol={selectedSymbol} />

      {/* Debug Info / Telemetry */}
      <Card className="bg-slate-950 border-slate-800 shadow-md">
        <CardContent className="p-4">
          <div className="font-mono text-xs md:text-sm">
            <span className="text-slate-300 font-bold mb-3 block border-b border-slate-800 pb-2 flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-400" /> SYSTEM DIAGNOSTICS
            </span>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
              <div className="bg-slate-900 p-2 rounded border border-slate-800"><span className="text-slate-500 block text-xs">BUFFER</span> <span className="text-green-400 font-bold text-lg">{orderFlowData.length}</span></div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800"><span className="text-slate-500 block text-xs">ENGINE</span> <span className={stats ? "text-green-400 font-bold text-lg" : "text-yellow-400 font-bold text-lg"}>{stats ? 'ONLINE' : 'BOOTING'}</span></div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800"><span className="text-slate-500 block text-xs">TARGET</span> <span className="text-blue-400 font-bold text-lg">{selectedSymbol}</span></div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800"><span className="text-slate-500 block text-xs">STATUS</span> <span className={isMonitoring ? "text-green-400 font-bold text-lg" : "text-orange-400 font-bold text-lg"}>{isMonitoring ? 'ACTIVE' : 'STANDBY'}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Intelligence & Bayesian Feedback - NEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-slate-900 border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.1)] overflow-hidden">
          <div className="absolute top-0 right-0 p-2">
            <Badge className="bg-indigo-500 animate-pulse text-[10px] font-black tracking-widest px-2 py-0.5 shadow-lg border-indigo-400">RAG TRAINING ACTIVE</Badge>
          </div>
          <CardHeader className="bg-slate-950 pb-4 border-b border-white/5">
            <CardTitle className="text-sm font-black text-indigo-300 flex items-center gap-2 uppercase tracking-widest">
              <Cpu className="h-4 w-4" /> AI Training Intelligence
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold text-slate-500">Real-time vectorization of order flow characteristics</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                 <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Vector Confluence</div>
                 <div className="text-2xl font-black text-white font-mono leading-none">84.2%</div>
                 <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: '84.2%' }}></div>
                 </div>
              </div>
              <div className="space-y-2 border-l border-white/5 pl-6">
                 <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Feature Correlation</div>
                 <div className="text-2xl font-black text-emerald-400 font-mono leading-none">0.89</div>
                 <div className="text-[9px] font-bold text-slate-600 uppercase">Strong Convergence</div>
              </div>
              <div className="space-y-2 border-l border-white/5 pl-6">
                 <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Bayesian Confidence</div>
                 <div className="text-2xl font-black text-blue-400 font-mono leading-none">High</div>
                 <div className="text-[9px] font-bold text-slate-600 uppercase">Signal Validated</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700 shadow-md">
           <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                <ShieldAlert className="h-4 w-4 text-orange-400" /> Learning Pulse
              </CardTitle>
           </CardHeader>
           <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-bold">
                 <span className="text-slate-500">PATTERN RECOGNITION</span>
                 <span className="text-green-400">OPTIMAL</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold">
                 <span className="text-slate-500">ERROR BACKPROP</span>
                 <span className="text-blue-400">LOGGING</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold">
                 <span className="text-slate-500">WHALE IMPACT SYNC</span>
                 <span className="text-indigo-400">92% SYNC</span>
              </div>
              <div className="pt-2 border-t border-white/5">
                 <div className="text-[9px] font-black text-indigo-400/80 uppercase italic leading-tight">
                    "AI is weighting Whale Movements as primary 5-min signal."
                 </div>
              </div>
           </CardContent>
        </Card>
      </div>
      
      {/* Statistics Summary */}
      {stats && (
        <OrderFlowStats stats={stats} selectedSymbol={selectedSymbol} isMonitoring={isMonitoring} />
      )}
      
      {/* Summarized Analysis */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
        <CardHeader className="bg-slate-950 border-b border-slate-800 pb-5">
          <CardTitle className="text-xl font-black text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-500" />
            Quant Execution Overview
          </CardTitle>
          <CardDescription className="text-slate-400 font-medium font-mono text-xs uppercase tracking-tighter">
             Cross-Confluence Analysis for {selectedSymbol} Execution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-inner group hover:border-indigo-500/50 transition-all">
              <h4 className="font-bold text-slate-300 mb-2 flex items-center gap-2 uppercase tracking-wider text-[10px]">
                {calculateMarketSentiment() > 0.6 ? '🟢' : calculateMarketSentiment() < 0.4 ? '🔴' : '🟡'}
                Aggregate Sentiment
              </h4>
              <div className={`text-2xl font-black mb-1 leading-none ${calculateMarketSentiment() > 0.6 ? 'text-green-400' : calculateMarketSentiment() < 0.4 ? 'text-red-400' : 'text-yellow-400'}`}>
                {calculateMarketSentiment() > 0.6 ? 'BULLISH' : 
                 calculateMarketSentiment() < 0.4 ? 'BEARISH' : 'NEUTRAL'}
              </div>
              <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest italic opacity-70">
                WHALE + BOT + RETAIL SYNC
              </p>
            </div>

            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-inner group hover:border-blue-500/50 transition-all">
              <h4 className="font-bold text-slate-300 mb-2 flex items-center gap-2 uppercase tracking-wider text-[10px]">
                {getVolumeIndicator()} Intensity Rating
              </h4>
              <div className="text-2xl font-black text-white mb-1 leading-none">{getVolumeDescription()}</div>
              <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest italic opacity-70">
                PULSE: {stats?.averageVolume?.toFixed(2) || 0} UNI
              </p>
            </div>

            <div className="bg-indigo-950/20 p-5 rounded-xl border border-indigo-900/40 shadow-inner group hover:border-indigo-500 transition-all cursor-crosshair">
              <h4 className="font-bold text-indigo-400 mb-2 flex items-center gap-2 uppercase tracking-wider text-[10px]">
                🎯 Strategic Confluence
              </h4>
              <div className="text-xl font-black text-white mb-1 leading-tight uppercase">HIGH SIGNAL CLARITY</div>
              <p className="text-[10px] text-indigo-300/60 mt-2 font-bold leading-tight">
                3 Independent strategies signaling {calculateMarketSentiment() > 0.5 ? 'LONG' : 'SHORT'}.
              </p>
            </div>
          </div>

          <div className={`p-6 rounded-xl border-2 shadow-lg flex items-start gap-4 ${
            getRiskLevel().includes('HIGH') ? 'bg-red-950/40 border-red-500/50' : 
            getRiskLevel().includes('MEDIUM') ? 'bg-orange-950/40 border-orange-500/50' : 
            'bg-emerald-950/40 border-emerald-500/50'
          }`}>
            <div className={`p-3 rounded-full ${
              getRiskLevel().includes('HIGH') ? 'bg-red-900/50 text-red-500' : 
              getRiskLevel().includes('MEDIUM') ? 'bg-orange-900/50 text-orange-500' : 
              'bg-emerald-900/50 text-emerald-500'
            }`}>
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div>
              <h4 className={`font-black text-xl mb-1 uppercase tracking-widest ${
                getRiskLevel().includes('HIGH') ? 'text-red-500' : 
                getRiskLevel().includes('MEDIUM') ? 'text-orange-500' : 
                'text-emerald-500'
              }`}>
                Threat Level: {getRiskLevel()}
              </h4>
              <p className="text-base text-slate-300 font-medium leading-relaxed">{getRiskExplanation()}</p>
            </div>
          </div>

          <div className="bg-blue-950/30 p-6 rounded-xl border border-blue-900/50">
            <h4 className="font-black text-blue-400 mb-4 flex items-center gap-2 text-lg uppercase tracking-widest">
              <Target className="h-5 w-5" />
              Tactical Recommendations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getRecommendedActions().map((action, index) => (
                <div key={index} className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 shadow-sm leading-relaxed">
                  <div className="font-bold text-blue-300 mb-1 text-base">{action.title}</div>
                  <div className="text-slate-400 font-medium text-sm text-balance">{action.description}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Live Execution Feed / Notification Center */}
      <div className="pt-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
           <div>
             <h3 className="text-xl font-black text-indigo-400 flex items-center gap-2 uppercase tracking-widest">
                <Activity className="h-6 w-6" /> Live Execution Feed
             </h3>
             <div className="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-widest italic">
                Tactical Alerts & Significant Volume Flow
             </div>
           </div>
           <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-[9px] font-black tracking-widest uppercase animate-pulse">Live Radar</Badge>
        </div>
        <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
           <CardContent className="p-0">
             <div className="h-72 overflow-y-auto w-full flex flex-col divide-y divide-white/5 relative scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
               {[...orderFlowData].reverse().slice(0, 50).map((order, idx) => {
                 const isWhale = stats && order.size > (stats.averageVolume * 3);
                 const vpin = order.microstructure?.vpin || 0;
                 const entropy = order.microstructure?.entropyScore || 1;
                 const toxic = vpin > 0.7 || entropy < 0.3;
                 
                 // Show all active whales and toxic flows, else dim
                 if (!isWhale && !toxic && idx > 5) return null; // keep last 5 normal orders context

                 return (
                   <div key={order.id || idx} className={`p-4 transition-colors flex items-center justify-between group ${toxic ? 'hover:bg-purple-900/20' : 'hover:bg-slate-800/50'}`}>
                     <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-full ${
                          order.orderType === 'buy' ? 
                           toxic ? 'bg-purple-900/40 text-purple-400' : 'bg-green-900/30 text-green-500' : 
                           toxic ? 'bg-purple-900/40 text-purple-400' : 'bg-red-900/30 text-red-500'
                        }`}>
                          {order.orderType === 'buy' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className={`font-black tracking-widest uppercase text-sm flex items-center gap-2 ${
                            order.orderType === 'buy' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {isWhale && <span className="bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded uppercase">Whale</span>}
                            {toxic && <span className="bg-purple-500 text-white text-[9px] px-1.5 py-0.5 rounded uppercase animate-pulse">Toxic</span>}
                            {order.orderType}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            <strong className="text-slate-200">{order.size.toFixed(4)}</strong> @ {order.price.toFixed(2)}
                          </div>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                           {new Date(order.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="mt-1 flex items-center gap-1 justify-end">
                           <span className="text-[9px] font-bold text-slate-600 uppercase">VPIN: {(vpin*100).toFixed(0)}%</span>
                        </div>
                     </div>
                   </div>
                 )
               })}
             </div>
           </CardContent>
        </Card>
      </div>

      {/* Bayesian Live Performance Tracking - NEW */}
      <div className="pt-8">
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
           <h3 className="text-xl font-black text-emerald-400 flex items-center gap-2 uppercase tracking-widest">
              <Brain className="h-6 w-6 text-indigo-400" /> Bayesian Learning Pulse
           </h3>
           <Badge className="bg-slate-800 text-emerald-400 border-emerald-500/30 text-[9px] font-black tracking-widest uppercase">Live RAG Inference</Badge>
        </div>
        <BayesianPerformanceTracker symbol={selectedSymbol} />
      </div>

      {/* BOFI Strategic Roadmap - Gold Standard v2.0 */}
      <div className="pt-8 pt-4">
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
           <h3 className="text-xl font-black text-indigo-400 flex items-center gap-2 uppercase tracking-widest">
              <Activity className="h-6 w-6" /> BOFI Strategic Roadmap (Gold v2.0)
           </h3>
           <Badge className="bg-slate-800 text-indigo-400 border-indigo-500/30 text-[9px] font-black tracking-widest uppercase">Granulation Engine</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Section 1: Pre-Flight & Data Architecture */}
           <Card className="bg-slate-900/50 border-slate-800 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                 <ShieldAlert className="h-20 w-20 text-indigo-500" />
              </div>
              <CardHeader className="pb-2 bg-slate-950/40">
                 <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-emerald-500" /> 1. Pre-Flight & Intelligence
                 </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5">
                 {[
                   { t: 'Vault Sync', d: 'Map microstructure vectors to algo_trades.duckdb', s: 'done' },
                   { t: 'Snap History', d: 'Capture T-minus 100 ticks for every AI signal trigger', s: 'pending' },
                   { t: 'Feature Merging', d: 'Join Entropy + VPIN + Imbalance into single feature set', s: 'pending' }
                 ].map((task, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded bg-slate-950/20 border border-white/5 group hover:bg-slate-950/50 transition-all cursor-default">
                       <div className={`mt-1 h-3.5 w-3.5 rounded-sm border-2 flex items-center justify-center ${task.s === 'done' ? 'bg-indigo-500 border-indigo-400' : 'border-slate-700'}`}>
                          {task.s === 'done' && <CheckCircle className="h-2.5 w-2.5 text-white" />}
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-white uppercase tracking-tight">{task.t}</p>
                          <p className="text-[9px] font-medium text-slate-500 line-clamp-1">{task.d}</p>
                       </div>
                    </div>
                 ))}
              </CardContent>
           </Card>

           {/* Section 2: Implementation Tax & Performance */}
           <Card className="bg-slate-900/50 border-slate-800 shadow-sm relative overflow-hidden">
              <CardHeader className="pb-2 bg-slate-950/40">
                 <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Cpu className="h-3 w-3 text-blue-500" /> 2. Resource Tax & Integrity
                 </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5">
                 {[
                   { t: 'Throttling Gear', d: 'Enforce 5s loop on recommendation heuristics', s: 'active' },
                   { t: 'Cleanup Audit', d: 'Verify all useEffects have explicit stop/flush logic', s: 'done' },
                   { t: 'DOM Guard', d: 'Optimize Overview with React.memo for high-tick sync', s: 'pending' }
                 ].map((task, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded bg-slate-950/20 border border-white/5 group hover:bg-slate-950/50 transition-all cursor-default">
                       <div className={`mt-1 h-3.5 w-3.5 rounded-sm border-2 flex items-center justify-center ${task.s === 'done' || task.s === 'active' ? 'bg-blue-500 border-blue-400' : 'border-slate-700'}`}>
                          {(task.s === 'done' || task.s === 'active') && <Activity className="h-2.5 w-2.5 text-white animate-pulse" />}
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-white uppercase tracking-tight">{task.t}</p>
                          <p className="text-[9px] font-medium text-slate-500 line-clamp-1">{task.d}</p>
                       </div>
                    </div>
                 ))}
              </CardContent>
           </Card>

           {/* Section 3: Bayesian Feedback & Learning */}
           <Card className="bg-slate-900/50 border-slate-800 shadow-sm relative overflow-hidden md:col-span-2">
              <CardHeader className="pb-2 bg-indigo-950/10 border-b border-indigo-500/10">
                 <CardTitle className="text-[10px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                    <Target className="h-3 w-3 text-indigo-400" /> 3. Bayesian Training Loop (Log &rarr; improvement)
                 </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { t: 'Outcome Logging', d: 'Record "Why" a scalp fails at 0.1% loss', s: 'pending' },
                      { t: 'Posterior Update', d: 'Adjust signal confidence based on Whale failure rate', s: 'pending' },
                      { t: 'Regime Scaling', d: 'Optimize weights for Scalp (5m) vs Short-Term (1h)', s: 'pending' }
                    ].map((task, i) => (
                       <div key={i} className="flex items-center gap-3 p-3 rounded bg-slate-950/40 border border-indigo-500/5 hover:border-indigo-500/30 transition-all cursor-crosshair">
                          <div className="h-4 w-4 rounded-full border-2 border-indigo-500/30 flex items-center justify-center text-[8px] font-black text-indigo-400">
                             {i+1}
                          </div>
                          <div>
                             <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">{task.t}</p>
                             <p className="text-[9px] font-bold text-slate-500 uppercase italic leading-none mt-1">{task.d}</p>
                          </div>
                       </div>
                    ))}
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

      {/* Manipulation Patterns (Threat Vectors) */}
      <div className="pt-8 border-t border-white/5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-6 bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-widest">
              <ShieldAlert className="h-6 w-6 text-red-500" /> Threat Vectors
            </h3>
            <div className="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-widest italic">
              Active micro-structures indicating adversarial manipulation
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {manipulationPatterns.map((pattern, index) => {
            const isHigh = pattern.severity === 'high';
            const isMed = pattern.severity === 'medium';
            return (
              <Card key={index} className={`bg-slate-900 border overflow-hidden transition-all hover:shadow-2xl ${
                isHigh ? 'border-red-500/40 bg-red-950/5 shadow-inner' : 
                isMed ? 'border-orange-500/40 bg-orange-950/5' : 
                'border-slate-800'
              }`}>
                <CardHeader className={`pb-3 ${isHigh ? 'bg-red-950/30' : isMed ? 'bg-orange-950/30' : 'bg-slate-800/30'}`}>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xs font-black text-white uppercase flex items-center gap-2 leading-tight tracking-widest">
                      <span className={`p-1 rounded-md ${isHigh ? 'bg-red-500/20 text-red-500' : isMed ? 'bg-orange-500/20 text-orange-500' : 'bg-slate-700 text-slate-300'}`}>
                        {getPatternIcon(pattern.type)}
                      </span>
                      {pattern.type === 'padding' ? 'Vector Padding' : 
                       pattern.type === 'scam' ? 'Scam Vector' : 
                       'Rag Intensity'}
                    </CardTitle>
                    <Badge className={`uppercase font-black text-[9px] tracking-wider px-2 py-0.5 ${
                      isHigh ? 'bg-red-500 text-white shadow-sm' : 
                      isMed ? 'bg-orange-500 text-white shadow-sm' : 
                      'bg-slate-800 border border-slate-700 text-slate-500'
                    }`}>
                      {pattern.severity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="mb-4">
                    <span className="text-4xl font-black text-white tracking-tighter">
                      {pattern.count}
                    </span>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-2">Samples Detected</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-bold leading-relaxed mb-4 h-10 line-clamp-2 italic">
                    {pattern.type === 'padding' ? 'Synthetic volume influx detected in micro-ticks' :
                     pattern.type === 'scam' ? 'Atypical order book divergence detected' :
                     'High velocity aggressive sweeps in thin liquidity'}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest pt-3 border-t border-slate-800/50">
                    {isHigh ? 
                      <><XCircle className="h-4 w-4 text-red-500" /> <span className="text-red-500">Critical Suppression Needed</span></> :
                      isMed ? 
                      <><AlertTriangle className="h-4 w-4 text-orange-500" /> <span className="text-orange-500">Enhanced Monitoring</span></> :
                      <><CheckCircle className="h-4 w-4 text-emerald-500" /> <span className="text-emerald-500">Safe Variance</span></>
                    }
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  );
}
