import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';

interface OrderCountDistributionProps {
  chartData: any[];
}

export function OrderCountDistribution({ chartData }: OrderCountDistributionProps) {
  return (
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
  );
}
