import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Shield, Target } from "lucide-react";

interface FlowAnalyticsSummaryProps {
  chartData: any[];
}

export function FlowAnalyticsSummary({ chartData }: FlowAnalyticsSummaryProps) {
  return (
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                📊 Flow Analytics Summary
                <Badge variant="outline" className="text-xs">
                  Real-time Analysis
                </Badge>
              </CardTitle>
              <CardDescription>
                Key metrics and trading insights from order flow analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                    {chartData.reduce((sum, d) => sum + d.buyVolume, 0).toFixed(1)}
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-semibold">Total Buy Volume</div>
                  <div className="text-xs text-muted-foreground">
                    Last {chartData.length} intervals
                  </div>
                  <div className="text-xs text-green-600 mt-1 font-semibold">
                    💪 Buying Power
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                    {chartData.reduce((sum, d) => sum + d.sellVolume, 0).toFixed(1)}
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-semibold">Total Sell Volume</div>
                  <div className="text-xs text-muted-foreground">
                    Last {chartData.length} intervals
                  </div>
                  <div className="text-xs text-red-600 mt-1 font-semibold">
                    📉 Selling Pressure
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${
                    chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 ? '+' : ''}{chartData.reduce((sum, d) => sum + d.netFlow, 0).toFixed(1)}
                    {chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 ?
                      <TrendingUp className="w-4 h-4" /> :
                      <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div className="text-sm font-semibold">Net Flow</div>
                  <div className="text-xs text-muted-foreground">
                    {chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 ? 'Bullish' : 'Bearish'}
                  </div>
                  <div className={`text-xs mt-1 font-semibold ${
                    chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 ? '🚀 Momentum Up' : '⬇️ Momentum Down'}
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${
                    chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 3 ? 'text-green-600' :
                    chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 6 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1)).toFixed(1)}
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-semibold">Avg Risk Score</div>
                  <div className="text-xs text-muted-foreground">
                    {chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 3 ? 'Low Risk' :
                     chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 6 ? 'Medium Risk' : 'High Risk'}
                  </div>
                  <div className={`text-xs mt-1 font-semibold ${
                    chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 3 ? 'text-green-600' :
                    chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 6 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 3 ? '✅ Safe Zone' :
                     chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 6 ? '⚠️ Caution Zone' : '🚨 Danger Zone'}
                  </div>
                </div>
              </div>

              {/* Trading Decision Box */}
              <div className="mt-6 p-4 bg-white rounded-lg border-2 border-dashed border-green-300">
                <h4 className="font-semibold text-lg mb-3 flex items-center gap-2 text-green-800">
                  🎯 Current Trading Decision
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`text-center p-3 rounded-lg border-2 ${
                    chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 &&
                    chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 4 ?
                    'bg-green-100 border-green-300' : 'bg-gray-100 border-gray-300'
                  }`}>
                    <div className="text-2xl mb-2">🟢</div>
                    <div className="font-semibold text-green-800">BUY SIGNAL</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Positive net flow + Low risk
                    </div>
                    {chartData.reduce((sum, d) => sum + d.netFlow, 0) > 0 &&
                     chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 4 && (
                      <Badge className="bg-green-600 mt-2 text-xs">ACTIVE</Badge>
                    )}
                  </div>
                  <div className={`text-center p-3 rounded-lg border-2 ${
                    Math.abs(chartData.reduce((sum, d) => sum + d.netFlow, 0)) <= 5 ||
                    (chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) > 4 &&
                     chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 6) ?
                    'bg-yellow-100 border-yellow-300' : 'bg-gray-100 border-gray-300'
                  }`}>
                    <div className="text-2xl mb-2">🟡</div>
                    <div className="font-semibold text-yellow-800">WAIT</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Neutral flow or medium risk
                    </div>
                    {(Math.abs(chartData.reduce((sum, d) => sum + d.netFlow, 0)) <= 5 ||
                      (chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) > 4 &&
                       chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) <= 6)) && (
                      <Badge className="bg-yellow-600 mt-2 text-xs">ACTIVE</Badge>
                    )}
                  </div>
                  <div className={`text-center p-3 rounded-lg border-2 ${
                    chartData.reduce((sum, d) => sum + d.netFlow, 0) < -5 ||
                    chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) > 6 ?
                    'bg-red-100 border-red-300' : 'bg-gray-100 border-gray-300'
                  }`}>
                    <div className="text-2xl mb-2">🔴</div>
                    <div className="font-semibold text-red-800">SELL SIGNAL</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Negative net flow or high risk
                    </div>
                    {(chartData.reduce((sum, d) => sum + d.netFlow, 0) < -5 ||
                      chartData.reduce((sum, d) => sum + d.avgRisk, 0) / Math.max(chartData.length, 1) > 6) && (
                      <Badge className="bg-red-600 mt-2 text-xs">ACTIVE</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
  );
}
