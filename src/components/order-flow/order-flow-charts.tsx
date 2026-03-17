import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Shield, Target, AlertTriangle, HelpCircle } from "lucide-react";
import { orderFlowAnalyzer } from "@/lib/order-flow-analyzer";

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

          {/* Order Flow Chart */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                📈 Buy vs Sell Flow Over Time
                {isMonitoring && (
                  <Badge className="bg-green-500 animate-pulse text-xs">LIVE</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Green areas show buying pressure, red areas show selling pressure
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Chart Guide */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="font-semibold">Green Area ↑</span>
                    </div>
                    <span className="text-muted-foreground">High buying pressure = Bullish sentiment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="font-semibold">Red Area ↓</span>
                    </div>
                    <span className="text-muted-foreground">High selling pressure = Bearish sentiment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-blue-500" />
                      <span className="font-semibold">Look for:</span>
                    </div>
                    <span className="text-muted-foreground">Green &gt; Red for buy signals</span>
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
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg border text-xs text-gray-800">
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
                  </div>
                )}
              </div>
              
              {/* Quick Analysis */}
              <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-red-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Quick Analysis Guide
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-semibold">✅ Buy Signal:</span>
                      <span>Green area consistently above red</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 font-semibold">❌ Sell Signal:</span>
                      <span>Red area dominates over green</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600 font-semibold">⚠️ Caution:</span>
                      <span>Equal areas = sideways market</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 font-semibold">💡 Tip:</span>
                      <span>Watch for trend changes at peaks</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Level Chart */}
          <Card className="border-2 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                ⚠️ Risk Level Tracking
              </CardTitle>
              <CardDescription>
                Average risk score over time intervals (0-10 scale)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Risk Guide */}
              <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="font-semibold">0-3 Safe ✅</span>
                    </div>
                    <span className="text-muted-foreground">Low manipulation risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span className="font-semibold">4-6 Caution ⚠️</span>
                    </div>
                    <span className="text-muted-foreground">Moderate risk - be careful</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded animate-pulse"></div>
                      <span className="font-semibold">7-10 Danger 🚨</span>
                    </div>
                    <span className="text-muted-foreground">High risk - avoid trading</span>
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
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg border text-xs text-gray-800">
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
                  </div>
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
              <div className="mt-4 p-3 bg-gradient-to-r from-red-50 to-green-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Risk Analysis Guide
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 font-semibold">🟢 Safe (0-3):</span>
                      <span>Normal trading, low manipulation</span>
                    </div>
                    <div className="text-muted-foreground">Good time to enter positions</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600 font-semibold">🟡 Caution (4-6):</span>
                      <span>Some suspicious activity detected</span>
                    </div>
                    <div className="text-muted-foreground">Reduce position sizes, monitor closely</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 font-semibold">🔴 Danger (7-10):</span>
                      <span>High manipulation risk</span>
                    </div>
                    <div className="text-muted-foreground">Exit positions, avoid new trades</div>
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
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg border text-xs text-gray-800">
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
                    </div>
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
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-lg border text-xs text-gray-800">
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
                    </div>
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
