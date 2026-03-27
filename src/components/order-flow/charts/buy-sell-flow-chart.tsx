import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { TrendingUp } from "lucide-react";

interface BuySellFlowChartProps {
  chartData: any[];
  isMonitoring: boolean;
}

export function BuySellFlowChart({ chartData, isMonitoring }: BuySellFlowChartProps) {
  return (
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
  );
}
