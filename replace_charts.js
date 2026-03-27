const fs = require('fs');

const fileContent = `import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Shield, Target, AlertTriangle, HelpCircle } from "lucide-react";
import { orderFlowAnalyzer } from "@/lib/order-flow-analyzer";

// Import extracted components
import { BuySellFlowChart } from "./charts/buy-sell-flow-chart";
import { RiskLevelChart } from "./charts/risk-level-chart";
import { OrderCountDistribution } from "./charts/order-count-distribution";
import { NetOrderFlow } from "./charts/net-order-flow";
import { FlowAnalyticsSummary } from "./charts/flow-analytics-summary";

interface OrderFlowChartsProps {
  chartData: any[];
  selectedSymbol: string;
  selectedTimeInterval: string;
  setSelectedTimeInterval: (interval: string) => void;
  isMonitoring: boolean;
  setOrderFlowData: React.Dispatch<React.SetStateAction<any[]>>;
  updateChartData: (orders: any[]) => void;
}

export function OrderFlowCharts({
  chartData,
  selectedSymbol,
  selectedTimeInterval,
  setSelectedTimeInterval,
  isMonitoring,
  setOrderFlowData,
  updateChartData,
}: OrderFlowChartsProps) {
  return (
    <div className="space-y-4">
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">📊 Order Flow Visualization</h3>
            <p className="text-sm text-gray-700">
              Real-time charts showing buy/sell flow, volume patterns, and risk levels for {selectedSymbol}
            </p>
            <div className="text-xs bg-yellow-100 p-2 rounded mt-2 border border-yellow-300">
              🔍 Debug Info: Chart data length: {chartData.length} | Selected interval: {selectedTimeInterval}
              {chartData.length > 0 && (
                <div className="mt-1">
                  Latest data: Buy Vol: {chartData[chartData.length - 1]?.buyVolume?.toFixed(2)} |
                  Sell Vol: {chartData[chartData.length - 1]?.sellVolume?.toFixed(2)}
                </div>
              )}
              {chartData.length === 0 && (
                <div className="mt-1 text-red-600 font-semibold">⚠️ No chart data available! Check console for data generation logs.</div>
              )}
            </div>
          </div>

          {/* Time Interval Selector */}
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-indigo-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-indigo-800">⏰ Time Interval:</label>
                <select
                  value={selectedTimeInterval}
                  onChange={(e) => setSelectedTimeInterval(e.target.value)}
                  className="px-3 py-2 border-2 border-indigo-400 rounded-md bg-white text-gray-800 text-sm font-bold shadow-lg hover:border-indigo-500 hover:shadow-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  style={{
                    color: '#1f2937',
                    backgroundColor: '#ffffff',
                    fontWeight: '600'
                  }}
                >
                  <option value="30s" className="text-gray-800 font-semibold bg-white">30 Seconds</option>
                  <option value="5m" className="text-gray-800 font-semibold bg-white">5 Minutes</option>
                  <option value="1h" className="text-gray-800 font-semibold bg-white">1 Hour</option>
                  <option value="4h" className="text-gray-800 font-semibold bg-white">4 Hours</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    console.log('🔄 Manual data generation triggered');
                    const newOrders = orderFlowAnalyzer.generateMockOrders(selectedSymbol, 25);
                    const analyzed = newOrders.map(order => {
                      const flags = orderFlowAnalyzer.analyzeOrder(order);
                      return {
                        symbol: order.symbol,
                        timestamp: order.timestamp,
                        orderType: order.side,
                        size: order.size,
                        price: order.price,
                        suspiciousFlags: flags.reasons || [],
                        riskScore: flags.riskScore || 0,
                        flags,
                        marketSource: { coinApi: 'manual', priceApi: 'manual' }
                      };
                    });
                    setOrderFlowData(prev => [...analyzed, ...prev].slice(0, 100));
                    updateChartData(analyzed);
                  }}
                  className="px-3 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition-colors"
                >
                  🔄 Generate Data
                </button>
                <span className="text-xs text-indigo-700 font-bold bg-indigo-100 px-3 py-1 rounded-full border border-indigo-300">
                  Updates every 1 minute
                </span>
              </div>
            </div>
          </Card>

          <BuySellFlowChart chartData={chartData} isMonitoring={isMonitoring} />

          <RiskLevelChart chartData={chartData} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <OrderCountDistribution chartData={chartData} />
            <NetOrderFlow chartData={chartData} />
          </div>

          <FlowAnalyticsSummary chartData={chartData} />
    </div>
  );
}
`;

fs.writeFileSync('src/components/order-flow/order-flow-charts.tsx', fileContent);
console.log('Done!');
