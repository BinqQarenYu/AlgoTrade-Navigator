import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Activity, Shield, BarChart2, Zap } from "lucide-react";
import { type OrderFlowData } from "@/hooks/use-order-flow";

interface OrderFlowSignalsProps {
  selectedSymbol: string;
  getTradingSignal: () => any;
  getMarketSentiment: () => string;
  stats: any;
  buyOrderCount: number;
  sellOrderCount: number;
  orderFlowData: OrderFlowData[];
}

export function OrderFlowSignals({
  selectedSymbol,
  getTradingSignal,
  getMarketSentiment,
  stats,
  buyOrderCount,
  sellOrderCount,
  orderFlowData,
}: OrderFlowSignalsProps) {
  const signal = getTradingSignal();
  const sentiment = getMarketSentiment();
  const totalOrders = Math.max(orderFlowData.length, 1);
  const buyPressure = ((buyOrderCount / totalOrders) * 100).toFixed(0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 shadow-xl">
        <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight mb-2">
          <Target className="h-8 w-8 text-blue-400" />
          Tactical Trading Signals
        </h3>
        <p className="text-slate-400 font-medium">
          Algorithmic buy/sell recommendations based on real-time order flow data for {selectedSymbol}.
        </p>
      </div>

      {/* Current Market Signal */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
        <CardHeader className="bg-slate-950 border-b border-slate-800 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-black text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-500" />
            Active Signal Telemetry
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`px-3 py-1 text-sm font-black border-2 uppercase tracking-widest ${
              signal.signal.includes('sell') ? 'bg-red-500 text-white border-red-400 hover:bg-red-600' :
              signal.signal.includes('buy') ? 'bg-green-500 text-white border-green-400 hover:bg-green-600' :
              'bg-yellow-500 text-white border-yellow-400 hover:bg-yellow-600'
            }`}>
              {sentiment === 'bullish' ? 'BULLISH MARKET' :
               sentiment === 'bearish' ? 'BEARISH MARKET' :
               'NEUTRAL MARKET'}
            </Badge>
            <Badge className="bg-slate-800 text-blue-400 border border-slate-700 px-3 py-1 font-mono text-sm">
              {signal.confidence}% CONFIDENCE
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Buy Signal Card */}
            <div className={`p-6 rounded-xl border-2 transition-all duration-300 ${
              signal.signal.includes('buy') ? 
              'bg-green-950/40 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.15)] scale-[1.02]' : 
              'bg-slate-950/50 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center gap-3 mb-5 border-b border-slate-800/50 pb-4">
                <div className={`p-3 rounded-full ${signal.signal.includes('buy') ? 'bg-green-900/50 text-green-500' : 'bg-slate-800 text-slate-500'}`}>
                  <TrendingUp className="h-8 w-8" />
                </div>
                <div>
                  <h4 className={`font-black text-2xl tracking-tighter uppercase ${
                    signal.signal.includes('buy') ? 'text-green-500' : 'text-slate-500'
                  }`}>
                    Buy Signal
                  </h4>
                  {signal.signal === 'strong_buy' && (
                    <Badge className="bg-green-500 text-white text-[10px] mt-1 px-2 uppercase font-black tracking-widest">Strong Conviction</Badge>
                  )}
                </div>
              </div>
              
              {signal.signal.includes('buy') ? (
                <div className="space-y-4">
                  <p className="text-green-400 font-bold text-lg leading-tight">
                    {signal.signal === 'strong_buy' ? 'Execute long position protocols.' : 'Favorable conditions to enter.'}
                  </p>
                  <ul className="text-sm text-slate-300 space-y-2 font-medium">
                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> <span className="text-slate-200">{signal.reason}</span></li>
                    <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-blue-400 shrink-0" /> Low Risk Score: <strong className="text-white">{stats?.averageRiskScore.toFixed(1)}/10</strong></li>
                    <li className="flex items-center gap-2"><BarChart2 className="h-4 w-4 text-green-400 shrink-0" /> Buy Pressure: <strong className="text-white">{buyPressure}%</strong></li>
                  </ul>
                  <div className="mt-4 p-4 bg-green-900/30 border border-green-800/50 rounded-lg text-sm text-green-300 font-medium">
                    <span className="font-black text-green-400 block mb-1 uppercase tracking-wider text-xs">Recommended Action</span>
                    Consider entering position at current price levels. Set tight stop losses.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-500 font-bold text-lg">Wait for execution parameters.</p>
                  <ul className="text-sm text-slate-500 space-y-2">
                    <li className="flex items-center gap-2">Current Risk: {stats?.averageRiskScore.toFixed(1)}/10</li>
                    <li className="flex items-center gap-2">Signal Blocked: {signal.signal.replace('_', ' ').toUpperCase()} active</li>
                  </ul>
                  <div className="mt-4 p-4 bg-slate-900/50 border border-slate-800 rounded-lg text-sm text-slate-500">
                    Monitor market flow for shifting conditions.
                  </div>
                </div>
              )}
            </div>

            {/* Sell Signal Card */}
            <div className={`p-6 rounded-xl border-2 transition-all duration-300 ${
              signal.signal.includes('sell') ? 
              'bg-red-950/40 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)] scale-[1.02]' : 
              'bg-slate-950/50 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center gap-3 mb-5 border-b border-slate-800/50 pb-4">
                <div className={`p-3 rounded-full ${signal.signal.includes('sell') ? 'bg-red-900/50 text-red-500' : 'bg-slate-800 text-slate-500'}`}>
                  <TrendingDown className="h-8 w-8" />
                </div>
                <div>
                  <h4 className={`font-black text-2xl tracking-tighter uppercase ${
                    signal.signal.includes('sell') ? 'text-red-500' : 'text-slate-500'
                  }`}>
                    Sell Signal
                  </h4>
                  {signal.signal === 'strong_sell' && (
                    <Badge className="bg-red-500 text-white text-[10px] mt-1 px-2 uppercase font-black tracking-widest">Liquidate</Badge>
                  )}
                </div>
              </div>
              
              {signal.signal.includes('sell') ? (
                <div className="space-y-4">
                  <p className="text-red-400 font-bold text-lg leading-tight">
                    {signal.signal === 'strong_sell' ? 'Critical threat. Exit positions immediately.' : 'Warning: Reduce market exposure.'}
                  </p>
                  <ul className="text-sm text-slate-300 space-y-2 font-medium">
                    <li className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" /> <span className="text-slate-200">{signal.reason}</span></li>
                    <li className="flex items-center gap-2"><Target className="h-4 w-4 text-orange-400 shrink-0" /> Threat Vectors: <strong className="text-white">{stats?.scamCount} patterns detected</strong></li>
                    <li className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-400 shrink-0" /> Manipulation Risk: <strong className="text-white">{stats?.averageRiskScore.toFixed(1)}/10</strong></li>
                  </ul>
                  <div className="mt-4 p-4 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-300 font-medium">
                    <span className="font-black text-red-400 block mb-1 uppercase tracking-wider text-xs">Recommended Action</span>
                    {signal.signal === 'strong_sell' ? 'Close long positions or open short positions.' : 'Consider taking profits or tightening stop losses.'}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-500 font-bold text-lg">Hold position steady.</p>
                  <ul className="text-sm text-slate-500 space-y-2">
                    <li className="flex items-center gap-2">No critical threats detected</li>
                    <li className="flex items-center gap-2">Risk Level Normal: {stats?.averageRiskScore.toFixed(1)}/10</li>
                  </ul>
                  <div className="mt-4 p-4 bg-slate-900/50 border border-slate-800 rounded-lg text-sm text-slate-500">
                    No immediate sell-side pressure requires action.
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Market Concepts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800 shadow-lg">
          <CardHeader className="bg-slate-950/50 border-b border-slate-800 pb-4">
            <CardTitle className="text-lg font-black text-white flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-indigo-400" />
              Volume Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Natural Volume Status</span>
                <Badge className={`px-3 py-1 font-black ${stats?.paddingCount === 0 ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                  {stats?.paddingCount === 0 ? 'HEALTHY & VERIFIED' : 'ARTIFICIALLY PADDED'}
                </Badge>
              </div>
              <p className="text-sm text-slate-300 font-medium leading-relaxed">
                {stats?.paddingCount === 0 ? 
                  'Trading volume appears genuine with natural order size distribution.' :
                  `Alert: ${stats?.paddingCount} instances of artificial volume padding detected. This is a common manipulation tactic.`
                }
              </p>
              <div className="bg-indigo-950/30 p-4 rounded-lg border border-indigo-900/50 text-sm">
                <strong className="text-indigo-400 block mb-1 uppercase tracking-widest text-xs">System Insight</strong> 
                <span className="text-slate-300">
                  {stats?.paddingCount === 0 ? 
                    'Genuine volume provides a safe environment for executing algorithmic strategies without slippage risk.' :
                    'Padded volume creates a false sense of liquidity. Execution algorithms should pause until natural flow returns.'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow-lg">
          <CardHeader className="bg-slate-950/50 border-b border-slate-800 pb-4">
            <CardTitle className="text-lg font-black text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-400" />
              Market Aggression Metric
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Execution Velocity</span>
                <Badge className={`px-3 py-1 font-black ${stats?.ragCount <= 2 ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                  {stats?.ragCount <= 2 ? 'CALM / NORMAL' : 'HIGHLY AGGRESSIVE'}
                </Badge>
              </div>
              <p className="text-sm text-slate-300 font-medium leading-relaxed">
                The engine has detected <strong className="text-white">{stats?.ragCount}</strong> instances of aggressive, rapid-fire market orders designed to shock the order book.
              </p>
              <div className="bg-orange-950/30 p-4 rounded-lg border border-orange-900/50 text-sm">
                <strong className="text-orange-400 block mb-1 uppercase tracking-widest text-xs">Strategic Protocol</strong> 
                <span className="text-slate-300">
                  Aggressive market buying/selling often precedes heavy volatility. Consider widening trailing stops.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
