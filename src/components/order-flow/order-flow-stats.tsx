import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, AlertTriangle, Target, DollarSign, Database, ShieldAlert, Zap } from "lucide-react";

interface OrderFlowStatsProps {
  stats: any;
  selectedSymbol: string;
  isMonitoring: boolean;
}

export function OrderFlowStats({ stats, selectedSymbol, isMonitoring }: OrderFlowStatsProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="bg-slate-900 border-slate-800 shadow-lg hover:border-blue-500/30 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Database className="h-4 w-4" /> Total Analyzed
          </CardTitle>
          <Activity className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black text-white">{stats.totalOrders || stats.total}</div>
          <p className="text-xs text-slate-500 font-medium">Orders scanned in buffer</p>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs font-bold text-blue-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            System Actively Monitoring
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-900 border-slate-800 shadow-lg hover:border-red-500/30 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> High Risk
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black text-red-500">{stats.highRiskCount || 0}</div>
          <p className="text-xs text-slate-500 font-medium">Risk score 7 or higher</p>
          <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-bold uppercase tracking-wider">
            {(!stats.highRiskCount || stats.highRiskCount === 0) ? (
              <span className="text-emerald-500 flex items-center gap-1">🟢 Low Threat Level</span>
            ) : stats.highRiskCount < 5 ? (
              <span className="text-orange-500 flex items-center gap-1">🟡 Moderate Concern</span>
            ) : (
              <span className="text-red-500 flex items-center gap-1 animate-pulse">🔴 High Alert Status</span>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-900 border-slate-800 shadow-lg hover:border-purple-500/30 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Target className="h-4 w-4" /> Risk Average
          </CardTitle>
          <Activity className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black text-white">{(stats.averageRiskScore || 0).toFixed(1)}</div>
          <p className="text-xs text-slate-500 font-medium">Out of 10 maximum</p>
          <div className="mt-4 pt-3 border-t border-slate-800">
            <Progress 
              value={(stats.averageRiskScore || 0) * 10} 
              className={`h-1.5 bg-slate-800 ${
                (stats.averageRiskScore || 0) > 7 ? '[&>div]:bg-red-500' :
                (stats.averageRiskScore || 0) > 4 ? '[&>div]:bg-orange-500' :
                '[&>div]:bg-emerald-500'
              }`} 
            />
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-900 border-slate-800 shadow-lg hover:border-green-500/30 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Zap className="h-4 w-4" /> Target Feed
          </CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black text-white">{selectedSymbol}</div>
          <p className="text-xs text-slate-500 font-medium">Active algorithmic pair</p>
          <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-bold uppercase tracking-wider">
            {isMonitoring ? (
              <span className="text-emerald-500 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Link Established
              </span>
            ) : (
              <span className="text-slate-500 flex items-center gap-2">
                ⏸️ Connection Paused
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
