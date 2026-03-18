import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, Target, ShieldAlert, Zap } from "lucide-react";
import { type OrderFlowData, type VeryLargeActivity } from "@/hooks/use-order-flow";

interface OrderFlowLiveOrdersProps {
  orderFlowData: OrderFlowData[];
  activeVeryLargeActivity: VeryLargeActivity | null;
}

export function OrderFlowLiveOrders({
  orderFlowData,
  activeVeryLargeActivity,
}: OrderFlowLiveOrdersProps) {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 shadow-xl">
        <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight mb-2">
          <Activity className="h-8 w-8 text-blue-400" />
          Live Order Stream
        </h3>
        <p className="text-slate-400 font-medium">
          Real-time ticker tape of incoming orders. Filtered for manipulation mapping. Red scores (7-10) indicate highly actionable threats.
        </p>
      </div>
      
      <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
        <CardHeader className="bg-slate-950 border-b border-slate-800 pb-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl font-black text-white flex items-center gap-2">
                <Target className="h-6 w-6 text-indigo-500" />
                Live Order Tape
              </CardTitle>
              <CardDescription className="text-slate-400 font-medium mt-1">
                Last 10 executions processed by the matching engine
              </CardDescription>
            </div>
            <div className="flex gap-3 text-xs font-bold tracking-widest uppercase">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-950/50 border border-green-900">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-green-500">Buy</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-950/50 border border-red-900">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-red-500">Sell</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-3 relative">
            {orderFlowData.length === 0 ? (
              <div className="text-center py-16 bg-slate-950/50 rounded-xl border border-slate-800 border-dashed">
                <Activity className="h-12 w-12 mx-auto mb-4 text-slate-700 animate-pulse" />
                <p className="text-lg font-bold text-slate-400">Awaiting Order Data...</p>
                <p className="text-sm text-slate-600">Start the monitoring engine to view live tape.</p>
              </div>
            ) : (
              orderFlowData.slice(0, 10).map((order, index) => {
                const isVeryLargeOrder = activeVeryLargeActivity && 
                  (order.size > 25 || 
                   (activeVeryLargeActivity.startTime <= order.timestamp && 
                    order.timestamp <= Date.now() && 
                    Date.now() - activeVeryLargeActivity.startTime < 30000));

                return (
                  <div key={index} className={`relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    isVeryLargeOrder ? 
                      'bg-purple-950/40 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)] animate-pulse' :
                    order.riskScore >= 7 ? 'bg-red-950/20 border-red-500/30' :
                    order.riskScore >= 4 ? 'bg-orange-950/20 border-orange-500/30' :
                    'bg-slate-950 hover:bg-slate-900 border-slate-800'
                  }`}>
                    <div className="flex items-start sm:items-center gap-4 mb-3 sm:mb-0">
                      <div className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] ${
                        order.orderType === 'buy' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {order.orderType === 'buy' ? <TrendingUp className="h-5 w-5 mb-1" /> : <TrendingDown className="h-5 w-5 mb-1" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{order.orderType}</span>
                      </div>
                      
                      <div>
                        <div className="font-bold flex items-center gap-2 text-white text-lg">
                          <span className="font-mono text-blue-400">{order.symbol}</span>
                          <span className="text-slate-500">|</span>
                          <span className="font-mono">{order.size.toFixed(order.size < 1 ? 4 : 2)}</span>
                          <span className="text-slate-400 text-sm">@</span>
                          <span className="font-mono text-green-400">${order.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                        </div>
                        <div className="text-xs font-medium mt-1">
                          {order.suspiciousFlags.length > 0 ? (
                            <span className="flex items-center gap-1 text-orange-400"><ShieldAlert className="h-3 w-3" /> {order.suspiciousFlags.join(' • ')}</span>
                          ) : (
                            <span className="text-slate-500">Standard Execution</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Risk</span>
                        <div className={`text-xl font-black font-mono ${
                          order.riskScore >= 7 ? 'text-red-500' :
                          order.riskScore >= 4 ? 'text-orange-500' :
                          'text-emerald-500'
                        }`}>
                          {order.riskScore.toFixed(0)}<span className="text-sm text-slate-600">/10</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0 sm:mt-1">
                        {new Date(order.timestamp).toLocaleTimeString(undefined, { hour12: false, fractionalSecondDigits: 3 })}
                      </div>
                    </div>
                    
                    {isVeryLargeOrder && (
                      <div className="absolute -top-3 -right-2">
                        <Badge className="bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-widest px-2 py-1 shadow-lg shadow-purple-900/50 border border-purple-400">
                          <Zap className="h-3 w-3 mr-1 inline animate-bounce" /> Whale Action
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
