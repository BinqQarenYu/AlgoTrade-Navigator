import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, AlertTriangle, Target, DollarSign } from "lucide-react";

interface OrderFlowStatsProps {
  stats: any;
  selectedSymbol: string;
  isMonitoring: boolean;
}

export function OrderFlowStats({ stats, selectedSymbol, isMonitoring }: OrderFlowStatsProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">📊 Total Orders Analyzed</CardTitle>
          <Activity className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalOrders || stats.total}</div>
          <p className="text-xs text-muted-foreground">Orders scanned in last hour</p>
          <div className="mt-2 text-xs text-blue-600">
            ✅ System actively monitoring
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">🚨 High Risk Orders</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">{stats.highRiskCount || 0}</div>
          <p className="text-xs text-muted-foreground">Risk score 7 or higher</p>
          <div className="mt-2 text-xs">
            {(!stats.highRiskCount || stats.highRiskCount === 0) ? (
              <span className="text-green-600">🟢 Low threat level</span>
            ) : stats.highRiskCount < 5 ? (
              <span className="text-yellow-600">🟡 Moderate concern</span>
            ) : (
              <span className="text-red-600">🔴 High alert status</span>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">📈 Risk Score Average</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{(stats.averageRiskScore || 0).toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">Out of 10 maximum</p>
          <div className="mt-2">
            <Progress 
              value={(stats.averageRiskScore || 0) * 10} 
              className="w-full h-2" 
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">🎯 Currently Monitoring</CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{selectedSymbol}</div>
          <p className="text-xs text-muted-foreground">Active trading pair</p>
          <div className="mt-2 text-xs">
            {isMonitoring ? (
              <span className="text-green-600">🟢 Live monitoring</span>
            ) : (
              <span className="text-gray-600">⏸️ Monitoring paused</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
