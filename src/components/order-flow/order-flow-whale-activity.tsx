import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Timer, ArrowUpRight, ArrowDownRight, AlertTriangle, Eye, Activity } from "lucide-react";
import { type VeryLargeActivity } from "@/hooks/use-order-flow";

interface OrderFlowWhaleActivityProps {
  veryLargeActivities: VeryLargeActivity[];
  activeVeryLargeActivity: VeryLargeActivity | null;
  veryLargeActivityLog: string[];
  saveActivityLog: () => void;
}

export function OrderFlowWhaleActivity({
  veryLargeActivities,
  activeVeryLargeActivity,
  veryLargeActivityLog,
  saveActivityLog,
}: OrderFlowWhaleActivityProps) {

  const getTypeStyle = (type: string) => {
    switch(type) {
      case 'massive_buy': return { color: 'text-green-500', bg: 'bg-green-100', icon: <ArrowUpRight className="h-6 w-6 text-green-500" /> };
      case 'massive_sell': return { color: 'text-red-500', bg: 'bg-red-100', icon: <ArrowDownRight className="h-6 w-6 text-red-500" /> };
      case 'coordinated_attack': return { color: 'text-orange-500', bg: 'bg-orange-100', icon: <AlertTriangle className="h-6 w-6 text-orange-500" /> };
      case 'whale_activity': 
      default: return { color: 'text-purple-500', bg: 'bg-purple-100', icon: <Eye className="h-6 w-6 text-purple-500" /> };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-2xl">
        <div>
          <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
            <Activity className="h-8 w-8 text-blue-400" /> 
            Whale Sonar & Activity Monitor
          </h3>
          <p className="text-slate-400 mt-1 font-medium">
            Real-time detection of massive capital deployment and potential market manipulation.
          </p>
        </div>
        <Button onClick={saveActivityLog} className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg">
          Export Sonar Logs
        </Button>
      </div>

      {/* Active Whale Alert Dashboard */}
      {activeVeryLargeActivity && (
        <div className={`p-1 rounded-xl animate-alarm-blink ${activeVeryLargeActivity.riskLevel === 'extreme' ? 'bg-red-500' : 'bg-orange-500'}`}>
          <div className="bg-slate-950 p-6 rounded-lg h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-full animate-bounce ${activeVeryLargeActivity.riskLevel === 'extreme' ? 'bg-red-900/50 text-red-500' : 'bg-orange-900/50 text-orange-500'}`}>
                <Zap className="h-8 w-8" />
              </div>
              <div>
                <h4 className={`text-2xl font-black uppercase tracking-widest ${activeVeryLargeActivity.riskLevel === 'extreme' ? 'text-red-500' : 'text-orange-500'}`}>
                  Live Target Locked
                </h4>
                <p className="text-slate-400 font-medium">{activeVeryLargeActivity.description}</p>
              </div>
              <Badge className={`ml-auto px-4 py-2 text-sm font-black border-2 ${activeVeryLargeActivity.riskLevel === 'extreme' ? 'bg-red-500 text-white border-red-400' : 'bg-orange-500 text-white border-orange-400'}`}>
                {activeVeryLargeActivity.riskLevel.toUpperCase()} RISK
              </Badge>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p className="text-slate-400 text-sm font-bold uppercase mb-1">Activity Type</p>
                <div className="flex items-center gap-2">
                  {getTypeStyle(activeVeryLargeActivity.type).icon}
                  <span className={`text-xl font-black ${getTypeStyle(activeVeryLargeActivity.type).color}`}>
                    {activeVeryLargeActivity.type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p className="text-slate-400 text-sm font-bold uppercase mb-1">Total Volume Impact</p>
                <div className="text-3xl font-black text-white">
                  {activeVeryLargeActivity.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-lg text-slate-500">Orders</span>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p className="text-slate-400 text-sm font-bold uppercase mb-1">Max Order Size</p>
                <div className="text-2xl font-black text-blue-400">
                  {activeVeryLargeActivity.maxOrderSize.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <p className="text-slate-400 text-sm font-bold uppercase mb-1">Avg Execution Price</p>
                <div className="text-2xl font-black text-green-400">
                  ${activeVeryLargeActivity.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historical Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Timer className="h-6 w-6 text-blue-600" /> Recent Detections
          </h4>
          
          <div className="grid gap-4">
            {veryLargeActivities.length === 0 ? (
              <Card className="border-dashed border-2 bg-slate-50">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Zap className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">No Whales Detected</h3>
                  <p className="text-slate-500">The sonar is sweeping the order books. All clear for now.</p>
                </CardContent>
              </Card>
            ) : (
              veryLargeActivities.map((activity) => {
                const style = getTypeStyle(activity.type);
                return (
                  <div key={activity.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-xl border transition-all hover:shadow-md ${activity.isActive ? 'bg-blue-50 border-blue-200 shadow-inner' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-start sm:items-center gap-4">
                      <div className={`p-3 rounded-xl ${style.bg}`}>
                        {style.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-black text-slate-800 text-lg">{activity.type.replace('_', ' ').toUpperCase()}</h5>
                          <Badge className={`${activity.riskLevel === 'extreme' ? 'bg-red-500 hover:bg-red-500' : 'bg-orange-500 hover:bg-orange-500'} text-xs font-bold px-2 py-0`}>
                            {activity.riskLevel.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">{activity.description}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 sm:mt-0 flex gap-6 text-right w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-4 sm:pt-0">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Volume</p>
                        <p className="font-black text-slate-800 text-lg">{activity.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Time</p>
                        <p className="font-black text-slate-600 font-mono text-sm mt-1">{new Date(activity.startTime).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div>
          <Card className="h-full border-slate-200 shadow-md">
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">📝 System Raw Logs</CardTitle>
              <CardDescription>Console output feed</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto p-4 bg-slate-950 text-green-400 font-mono text-xs space-y-3 leading-relaxed">
                {veryLargeActivityLog.length === 0 ? (
                  <p className="text-slate-600 text-center py-10">Awaiting system events...</p>
                ) : (
                  veryLargeActivityLog.map((log, i) => (
                    <div key={i} className="border-b border-white/10 pb-2 last:border-0">
                      <span className="text-slate-500 mr-2">&gt;</span>{log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
