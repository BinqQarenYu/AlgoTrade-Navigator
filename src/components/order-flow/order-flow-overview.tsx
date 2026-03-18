import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Target, Activity, CheckCircle, XCircle, AlertTriangle, ShieldAlert, Cpu } from "lucide-react";
import { OrderFlowStats } from "./order-flow-stats";
import { type ManipulationPattern, type OrderFlowData } from "@/hooks/use-order-flow";

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
          <Cpu className="h-8 w-8 text-indigo-400" />
          System Overview & Telemetry
        </h3>
        <p className="text-slate-400 font-medium">
          High-contrast real-time analytics engine and threat detection for {selectedSymbol}
        </p>
      </div>

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

      {/* Statistics Summary */}
      {stats && (
        <OrderFlowStats stats={stats} selectedSymbol={selectedSymbol} isMonitoring={isMonitoring} />
      )}
      
      {/* Summarized Analysis */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
        <CardHeader className="bg-slate-950 border-b border-slate-800 pb-5">
          <CardTitle className="text-xl font-black text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-500" />
            Market Analysis Summary
          </CardTitle>
          <CardDescription className="text-slate-400 font-medium">
            Intelligence overview of current order flow conditions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-inner">
              <h4 className="font-bold text-slate-300 mb-2 flex items-center gap-2 uppercase tracking-wider text-sm">
                {calculateMarketSentiment() > 0.6 ? '🟢' : calculateMarketSentiment() < 0.4 ? '🔴' : '🟡'}
                Market Sentiment
              </h4>
              <div className={`text-2xl font-black mb-1 ${calculateMarketSentiment() > 0.6 ? 'text-green-400' : calculateMarketSentiment() < 0.4 ? 'text-red-400' : 'text-yellow-400'}`}>
                {calculateMarketSentiment() > 0.6 ? 'BULLISH 📈' : 
                 calculateMarketSentiment() < 0.4 ? 'BEARISH 📉' : 'NEUTRAL ⚖️'}
              </div>
              <p className="text-sm text-slate-400 mt-2 font-medium">
                Based on recent buy vs sell volume and frequency.
              </p>
            </div>

            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-inner">
              <h4 className="font-bold text-slate-300 mb-2 flex items-center gap-2 uppercase tracking-wider text-sm">
                {getVolumeIndicator()} Volume Intensity
              </h4>
              <div className="text-2xl font-black text-white mb-1">{getVolumeDescription()}</div>
              <p className="text-sm text-slate-400 mt-2 font-medium">
                {getVolumeExplanation()}
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
      
      {/* Manipulation Patterns */}
      <div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-6 bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-red-500" /> Active Threat Vectors
            </h3>
            <div className="text-sm font-medium text-slate-400 mt-1">
              Detected micro-structures indicating potential market manipulation
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {manipulationPatterns.map((pattern, index) => {
            const isHigh = pattern.severity === 'high';
            const isMed = pattern.severity === 'medium';
            return (
              <Card key={index} className={`bg-slate-900 border-2 overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl ${
                isHigh ? 'border-red-500/30 hover:border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 
                isMed ? 'border-orange-500/30 hover:border-orange-500/80' : 
                'border-slate-700 hover:border-slate-500'
              }`}>
                <CardHeader className={`pb-3 ${isHigh ? 'bg-red-950/30' : isMed ? 'bg-orange-950/30' : 'bg-slate-800/30'}`}>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-black text-white capitalize flex items-center gap-2 leading-tight">
                      <span className={`p-1.5 rounded-md ${isHigh ? 'bg-red-500/20 text-red-400' : isMed ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-300'}`}>
                        {getPatternIcon(pattern.type)}
                      </span>
                      {pattern.type === 'padding' ? 'Order Padding' : 
                       pattern.type === 'scam' ? 'Scam Activity' : 
                       'Rag Pulling'}
                    </CardTitle>
                    <Badge className={`uppercase font-black text-[10px] tracking-wider px-2 py-0.5 ${
                      isHigh ? 'bg-red-500 text-white' : 
                      isMed ? 'bg-orange-500 text-white' : 
                      'bg-slate-600 text-white'
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
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-2">hits</span>
                  </div>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed mb-4 h-10 line-clamp-2">
                    {pattern.type === 'padding' ? 'Fake volume from tiny orders to mislead traders' :
                     pattern.type === 'scam' ? 'Suspicious patterns indicating potential fraud' :
                     'Aggressive trades to manipulate prices rapidly'}
                  </p>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider pt-3 border-t border-slate-800">
                    {isHigh ? 
                      <><XCircle className="h-4 w-4 text-red-500" /> <span className="text-red-500">Critical Threat</span></> :
                      isMed ? 
                      <><AlertTriangle className="h-4 w-4 text-orange-500" /> <span className="text-orange-500">Elevated Risk</span></> :
                      <><CheckCircle className="h-4 w-4 text-emerald-500" /> <span className="text-emerald-500">Low Variance</span></>
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
