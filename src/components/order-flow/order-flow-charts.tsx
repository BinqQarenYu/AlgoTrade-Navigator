import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Shield, Target, AlertTriangle, HelpCircle, ShieldAlert } from "lucide-react";
import { orderFlowAnalyzer } from "@/lib/order-flow-analyzer";
import { DraggableOverlay } from "./draggable-overlay";

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
          <div className="mb-4 p-5 bg-slate-900 rounded-xl border border-slate-800 shadow-xl">
            <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-tight mb-2">
              <Activity className="h-6 w-6 text-blue-500" /> Order Flow Visualization
            </h3>
            <p className="text-sm text-slate-400 font-medium">
              Real-time charts showing buy/sell flow, volume patterns, and risk levels for <span className="text-blue-400">{selectedSymbol}</span>
            </p>
            <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg mt-4 border border-slate-800 font-mono shadow-inner">
              <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 border-b border-white/5 pb-2">
                 <Target className="h-3 w-3 text-blue-500" /> Debug Telemetry
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                 <span>Length: <strong className="text-white">{chartData.length}</strong></span>
                 <span>Interval: <strong className="text-white">{selectedTimeInterval}</strong></span>
              </div>
              
              {chartData.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-3 pt-2">
                  <span className="text-green-400 bg-green-950/30 px-2 py-0.5 rounded border border-green-900/50 flex items-center gap-1">
                     <TrendingUp className="h-3 w-3" /> Buy Vol: {chartData[chartData.length - 1]?.buyVolume?.toFixed(2)}
                  </span>
                  <span className="text-red-400 bg-red-950/30 px-2 py-0.5 rounded border border-red-900/50 flex items-center gap-1">
                     <TrendingDown className="h-3 w-3" /> Sell Vol: {chartData[chartData.length - 1]?.sellVolume?.toFixed(2)}
                  </span>
                </div>
              )}
              {chartData.length === 0 && (
                <div className="mt-2 pt-2 text-orange-400 font-semibold animate-pulse tracking-widest uppercase text-[10px] flex items-center gap-1">
                   <AlertTriangle className="h-3 w-3" /> No chart data available! Awaiting buffer fill.
                </div>
              )}
            </div>
          </div>

          {/* Time Interval Selector */}
          <Card className="p-4 bg-slate-900 border-slate-800 shadow-md">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <label className="text-xs uppercase font-black tracking-widest text-slate-500">Time Interval:</label>
                <select 
                  value={selectedTimeInterval}
                  onChange={(e) => setSelectedTimeInterval(e.target.value)}
                  className="px-3 py-1.5 border border-slate-700 rounded-md bg-slate-950 text-white text-sm font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all tracking-wider"
                >
                  <option value="30s">30 Seconds</option>
                  <option value="5m">5 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="4h">4 Hours</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
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
                  className="px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded text-xs font-black uppercase tracking-widest hover:bg-indigo-600/40 transition-colors flex items-center gap-2"
                >
                  <Activity className="h-3 w-3" /> Generate Pulse
                </button>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">
                  Live Buffer Active
                </span>
              </div>
            </div>
          </Card>

          {/* Order Flow Chart */}
          <Card className="border-slate-800 bg-slate-900/50 shadow-xl overflow-hidden mt-4">
            <CardHeader className="bg-slate-950 pb-4 border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-white font-black text-xl tracking-tighter uppercase">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                Aggregated Volume Flow
                {isMonitoring && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse text-[9px] font-black uppercase tracking-widest ml-2">LIVE</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-slate-500 font-medium">
                Differential buy vs sell pressure mapped against time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Chart Guide */}
              <div className="mb-4 p-3 bg-indigo-950/20 rounded-lg border border-indigo-900/30">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                      <span className="text-green-400">Green Area ↑</span>
                    </div>
                    <span className="text-slate-500/80">Bullish Pressure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.5)]"></div>
                      <span className="text-red-400">Red Area ↓</span>
                    </div>
                    <span className="text-slate-500/80">Bearish Pressure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-indigo-400" />
                      <span className="text-indigo-400">Look for:</span>
                    </div>
                    <span className="text-slate-500/80">Green &gt; Red = Buy</span>
                  </div>
                </div>
              </div>

              <div className="h-80 w-full relative">
                {chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600 font-semibold">Loading chart data...</p>
                      <p className="text-xs text-gray-500 mt-1">Generating real-time order flow data</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(value) => {
                        // Format X-axis based on selected time interval using timestamp
                        const date = new Date(value);
                        
                        if (selectedTimeInterval === '30s') {
                          return date.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false 
                          });
                        } else if (selectedTimeInterval === '5m') {
                          return date.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          });
                        } else if (selectedTimeInterval === '1h') {
                          // For 1h, show date and hour
                          return date.toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            day: '2-digit' 
                          }) + ' ' + date.toLocaleTimeString('en-US', { 
                            hour: '2-digit',
                            hour12: false 
                          }) + 'h';
                        } else if (selectedTimeInterval === '4h') {
                          // For 4h, show date and hour
                          return date.toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            day: '2-digit' 
                          }) + ' ' + date.toLocaleTimeString('en-US', { 
                            hour: '2-digit',
                            hour12: false 
                          }) + 'h';
                        }
                        return date.toLocaleTimeString();
                      }}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      label={{ 
                        value: `Volume (${selectedSymbol.replace('USDT', '')})`, 
                        angle: -90, 
                        position: 'insideLeft', 
                        style: { textAnchor: 'middle' } 
                      }}
                      tickFormatter={(value) => {
                        // Format Y-axis volume based on magnitude
                        if (value >= 1000000) {
                          return `${(value / 1000000).toFixed(1)}M`;
                        } else if (value >= 1000) {
                          return `${(value / 1000).toFixed(1)}K`;
                        } else if (value >= 1) {
                          return value.toFixed(1);
                        } else {
                          return value.toFixed(3);
                        }
                      }}
                    />
                    <RechartsTooltip 
                      contentStyle={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: any, name: any) => {
                        const formattedValue = Number(value) >= 1000000 
                          ? `${(Number(value) / 1000000).toFixed(2)}M`
                          : Number(value) >= 1000 
                          ? `${(Number(value) / 1000).toFixed(2)}K`
                          : Number(value).toFixed(2);
                        
                        return [
                          `${formattedValue} ${selectedSymbol.replace('USDT', '')}`,
                          name === 'buyVolume' ? '🟢 Buy Volume (Bullish)' :
                          name === 'sellVolume' ? '🔴 Sell Volume (Bearish)' : name
                        ];
                      }}
                      labelFormatter={(label) => {
                        // Format tooltip label using the timestamp
                        const date = new Date(label);
                        
                        if (selectedTimeInterval === '30s') {
                          return `Time: ${date.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false 
                          })}`;
                        } else if (selectedTimeInterval === '5m') {
                          return `Time: ${date.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })}`;
                        } else {
                          return `${date.toLocaleDateString('en-US')} ${date.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })}`;
                        }
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '10px' }}
                      formatter={(value) => value === 'buyVolume' ? '🟢 Buy Pressure (Good for Entry)' : '🔴 Sell Pressure (Consider Exit)'}
                    />
                    <Area
                      type="monotone"
                      dataKey="buyVolume"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="buyVolume"
                    />
                    <Area
                      type="monotone"
                      dataKey="sellVolume"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.6}
                      name="sellVolume"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                )}
                
                {/* Floating annotations */}
                {chartData.length > 0 && (
                  <DraggableOverlay 
                    id={`${selectedSymbol}-current-trend`} 
                    title="Current Trend"
                    defaultPosition={{ x: 650, y: 150 }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="font-semibold">Current Trend ({selectedTimeInterval}):</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">
                        {chartData[chartData.length - 1]?.buyVolume > chartData[chartData.length - 1]?.sellVolume ? 
                          '📈 Bullish (More Buying)' : 
                          '📉 Bearish (More Selling)'}
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">Buy Volume:</span> {
                          (() => {
                            const vol = chartData[chartData.length - 1]?.buyVolume || 0;
                            return vol >= 1000000 ? `${(vol / 1000000).toFixed(1)}M` :
                                   vol >= 1000 ? `${(vol / 1000).toFixed(1)}K` :
                                   vol.toFixed(2);
                          })()
                        } {selectedSymbol.replace('USDT', '')}
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">Sell Volume:</span> {
                          (() => {
                            const vol = chartData[chartData.length - 1]?.sellVolume || 0;
                            return vol >= 1000000 ? `${(vol / 1000000).toFixed(1)}M` :
                                   vol >= 1000 ? `${(vol / 1000).toFixed(1)}K` :
                                   vol.toFixed(2);
                          })()
                        } {selectedSymbol.replace('USDT', '')}
                      </div>
                      <div className="text-xs border-t pt-1 mt-1">
                        <span className="font-medium">Interval:</span> {
                          selectedTimeInterval === '30s' ? '30 Seconds' :
                          selectedTimeInterval === '5m' ? '5 Minutes' :
                          selectedTimeInterval === '1h' ? '1 Hour' :
                          selectedTimeInterval === '4h' ? '4 Hours' : selectedTimeInterval
                        }
                      </div>
                    </div>
                  </DraggableOverlay>
                )}
              </div>
              
              {/* Quick Analysis */}
              <div className="mt-4 p-4 bg-slate-950/50 rounded-xl border border-white/5">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-500" />
                  Quick Analysis Guide
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded bg-green-950/20 border border-green-900/30">
                      <span className="text-green-500 font-bold uppercase tracking-wider text-[9px] w-20">Buy Signal</span>
                      <span className="text-slate-400 text-[10px] uppercase">Green consistently above red</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-red-950/20 border border-red-900/30">
                      <span className="text-red-500 font-bold uppercase tracking-wider text-[9px] w-20">Sell Signal</span>
                      <span className="text-slate-400 text-[10px] uppercase">Red area dominates over green</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded bg-yellow-950/20 border border-yellow-900/30">
                      <span className="text-yellow-500 font-bold uppercase tracking-wider text-[9px] w-20">Caution</span>
                      <span className="text-slate-400 text-[10px] uppercase">Equal areas = sideways market</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-indigo-950/20 border border-indigo-900/30">
                      <span className="text-indigo-400 font-bold uppercase tracking-wider text-[9px] w-20">Edge Tip</span>
                      <span className="text-slate-400 text-[10px] uppercase">Watch for reversals at volume peaks</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Level Chart */}
          <Card className="border-slate-800 bg-slate-900/50 shadow-xl overflow-hidden mt-4">
            <CardHeader className="bg-slate-950 pb-4 border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-white font-black text-xl tracking-tighter uppercase">
                <Shield className="h-5 w-5 text-red-500" /> Risk Level Tracking
              </CardTitle>
              <CardDescription className="text-slate-500 font-medium">
                Average risk score mapped over time (0-10 scale).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Risk Guide */}
              <div className="mb-6 p-3 bg-red-950/10 rounded-lg border border-red-900/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                      <span className="text-green-500">0-3 Range</span>
                    </div>
                    <span className="text-slate-500/80">Low Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_5px_rgba(249,115,22,0.5)]"></div>
                      <span className="text-orange-500">4-6 Range</span>
                    </div>
                    <span className="text-slate-500/80">Medium Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                      <span className="text-red-500 font-black">7-10 Danger</span>
                    </div>
                    <span className="text-slate-500/80">High Manipulation</span>
                  </div>
                </div>
              </div>

              <div className="h-60 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    {/* Risk zone backgrounds */}
                    <defs>
                      <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.1} />
                        <stop offset="30%" stopColor="#f59e0b" stopOpacity={0.1} />
                        <stop offset="70%" stopColor="#10b981" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fecaca" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        if (selectedTimeInterval === '30s' || selectedTimeInterval === '5m') {
                          return date.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          });
                        } else {
                          return date.toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            day: '2-digit' 
                          }) + ' ' + date.toLocaleTimeString('en-US', { 
                            hour: '2-digit',
                            hour12: false 
                          });
                        }
                      }}
                    />
                    <YAxis 
                      domain={[0, 10]}
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      label={{ value: 'Risk Score', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                    />
                    <RechartsTooltip 
                      contentStyle={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: any) => {
                        const score = Number(value);
                        const level = score <= 3 ? '🟢 Safe' : score <= 6 ? '🟡 Caution' : '🔴 Danger';
                        return [`${score.toFixed(1)}/10 (${level})`, 'Risk Level'];
                      }}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return `Time: ${date.toLocaleDateString('en-US')} ${date.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false 
                        })}`;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgRisk"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#dc2626' }}
                    />
                    {/* Risk threshold lines */}
                    <Line
                      type="monotone"
                      dataKey={() => 3}
                      stroke="#10b981"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey={() => 7}
                      stroke="#ef4444"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                
                {/* Risk level indicator */}
                {chartData.length > 0 && (
                  <DraggableOverlay 
                    id={`${selectedSymbol}-danger-level`} 
                    title="Risk Core"
                    defaultPosition={{ x: 650, y: 350 }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        chartData[chartData.length - 1]?.avgRisk <= 3 ? 'bg-green-500' :
                        chartData[chartData.length - 1]?.avgRisk <= 6 ? 'bg-yellow-500' :
                        'bg-red-500 animate-pulse'
                      }`}></div>
                      <span className="font-semibold">Current Risk:</span>
                    </div>
                    <div className="text-muted-foreground">
                      {chartData[chartData.length - 1]?.avgRisk <= 3 ? '🟢 Safe to Trade' :
                       chartData[chartData.length - 1]?.avgRisk <= 6 ? '🟡 Use Caution' :
                       '🔴 High Risk - Avoid'}
                    </div>
                  </DraggableOverlay>
                )}
                
                {/* Risk threshold annotations */}
                <div className="absolute left-16 top-12 text-xs text-red-600 font-semibold">
                  ← Danger Zone (7+)
                </div>
                <div className="absolute left-16 bottom-16 text-xs text-green-600 font-semibold">
                  ← Safe Zone (0-3)
                </div>
              </div>
              
              {/* Risk Analysis Guide */}
              <div className="mt-4 p-4 bg-slate-950/50 rounded-xl border border-white/5">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  Risk Protocols
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
                  <div className="space-y-2">
                    <div className="flex flex-col p-2 rounded bg-green-950/20 border border-green-900/30 h-full justify-center">
                      <span className="text-green-500 font-bold uppercase tracking-wider text-[9px] mb-1">Level 0-3: Optimal</span>
                      <span className="text-slate-400 text-[10px] uppercase">Low manipulation. Ideal for position building.</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-col p-2 rounded bg-orange-950/20 border border-orange-900/30 h-full justify-center">
                      <span className="text-orange-500 font-bold uppercase tracking-wider text-[9px] mb-1">Level 4-6: Caution</span>
                      <span className="text-slate-400 text-[10px] uppercase">Suspicious patterns detected. Scale down sizing.</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-col p-2 rounded bg-red-950/20 border border-red-900/30 h-full justify-center">
                      <span className="text-red-500 font-black uppercase tracking-wider text-[9px] mb-1 animate-pulse">Level 7-10: Critical</span>
                      <span className="text-slate-400 text-[10px] uppercase">High toxicity. Hedge or liquidate immediately.</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Count and Net Flow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  📊 Order Count Distribution
                </CardTitle>
                <CardDescription>
                  Number of buy vs sell orders per time interval
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Order Count Guide */}
                <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="font-semibold">Green Bars ↑</span>
                      </div>
                      <span className="text-muted-foreground">More buy orders = Bullish interest</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span className="font-semibold">Red Bars ↓</span>
                      </div>
                      <span className="text-muted-foreground">More sell orders = Bearish pressure</span>
                    </div>
                  </div>
                </div>

                <div className="h-60 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          if (selectedTimeInterval === '30s' || selectedTimeInterval === '5m') {
                            return date.toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: false 
                            });
                          } else {
                            return date.toLocaleDateString('en-US', { 
                              month: '2-digit', 
                              day: '2-digit' 
                            }) + ' ' + date.toLocaleTimeString('en-US', { 
                              hour: '2-digit',
                              hour12: false 
                            });
                          }
                        }}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        label={{ value: 'Order Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: '#faf5ff',
                          border: '1px solid #e9d5ff',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: any, name: any) => [
                          value,
                          name === 'buyCount' ? '🟢 Buy Orders (Demand)' : '🔴 Sell Orders (Supply)'
                        ]}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      <Legend 
                        formatter={(value) => value === 'buyCount' ? '🟢 Buy Orders (Demand)' : '🔴 Sell Orders (Supply)'}
                      />
                      <Bar dataKey="buyCount" fill="#10b981" name="buyCount" />
                      <Bar dataKey="sellCount" fill="#ef4444" name="sellCount" />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Order imbalance indicator */}
                  {chartData.length > 0 && (
                    <DraggableOverlay 
                      id={`${selectedSymbol}-imbalance-overlay`} 
                      title="Volume Imbalance"
                      defaultPosition={{ x: 650, y: 550 }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${
                          (chartData[chartData.length - 1]?.buyCount || 0) > (chartData[chartData.length - 1]?.sellCount || 0) ? 
                          'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="font-semibold">Order Flow:</span>
                      </div>
                      <div className="text-muted-foreground">
                        {(chartData[chartData.length - 1]?.buyCount || 0) > (chartData[chartData.length - 1]?.sellCount || 0) ? 
                          '🟢 Buy Dominated' : 
                          '🔴 Sell Dominated'}
                      </div>
                    </DraggableOverlay>
                  )}
                </div>
                
                {/* Order Analysis */}
                <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Order Flow Analysis
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 font-semibold">🟢 High Green Bars:</span>
                        <span>Strong buying interest</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-semibold">🔴 High Red Bars:</span>
                        <span>Heavy selling pressure</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 font-semibold">📊 Equal Bars:</span>
                        <span>Balanced market</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-600 font-semibold">💡 Watch:</span>
                        <span>Sudden changes indicate shifts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-indigo-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-800">
                  🌊 Net Order Flow
                </CardTitle>
                <CardDescription>
                  Net flow (buy volume - sell volume) over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Net Flow Guide */}
                <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-blue-500" />
                        <span className="font-semibold">Above Zero ↑</span>
                      </div>
                      <span className="text-muted-foreground">More buying volume = Bullish flow</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-blue-500" />
                        <span className="font-semibold">Below Zero ↓</span>
                      </div>
                      <span className="text-muted-foreground">More selling volume = Bearish flow</span>
                    </div>
                  </div>
                </div>

                <div className="h-60 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="netFlowGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          if (selectedTimeInterval === '30s' || selectedTimeInterval === '5m') {
                            return date.toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: false 
                            });
                          } else {
                            return date.toLocaleDateString('en-US', { 
                              month: '2-digit', 
                              day: '2-digit' 
                            }) + ' ' + date.toLocaleTimeString('en-US', { 
                              hour: '2-digit',
                              hour12: false 
                            });
                          }
                        }}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        fontSize={12}
                        tickLine={false}
                        label={{ value: 'Net Flow', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: '#f0f9ff',
                          border: '1px solid #e0e7ff',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: any) => {
                          const flow = Number(value);
                          const trend = flow > 0 ? '🟢 Bullish' : '🔴 Bearish';
                          return [`${flow.toFixed(2)} (${trend})`, 'Net Flow'];
                        }}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      {/* Zero line reference */}
                      <Area
                        type="monotone"
                        dataKey={() => 0}
                        stroke="#6b7280"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        fill="transparent"
                      />
                      <Area
                        type="monotone"
                        dataKey="netFlow"
                        stroke="#3b82f6"
                        fill="url(#netFlowGradient)"
                        name="Net Flow"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  
                  {/* Flow direction indicator */}
                  {chartData.length > 0 && (
                    <DraggableOverlay id="flow-direction-overlay" defaultPosition={{ x: 250, y: 16 }}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${
                          (chartData[chartData.length - 1]?.netFlow || 0) > 0 ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="font-semibold">Current Flow:</span>
                      </div>
                      <div className="text-muted-foreground">
                        {(chartData[chartData.length - 1]?.netFlow || 0) > 0 ? 
                          '🟢 Bullish Flow' : 
                          '🔴 Bearish Flow'}
                      </div>
                    </DraggableOverlay>
                  )}
                  
                  {/* Zero line annotation */}
                  <div className="absolute left-16 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-semibold">
                    ← Zero Line (Neutral)
                  </div>
                </div>
                
                {/* Net Flow Analysis */}
                <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Net Flow Trading Guide
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 font-semibold">🟢 Positive Flow:</span>
                        <span>Buy volume &gt; Sell volume</span>
                      </div>
                      <div className="text-muted-foreground">Indicates bullish sentiment, consider buying</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-semibold">🔴 Negative Flow:</span>
                        <span>Sell volume &gt; Buy volume</span>
                      </div>
                      <div className="text-muted-foreground">Indicates bearish sentiment, consider selling</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart Analytics Summary */}
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
    </div>
  );
}
