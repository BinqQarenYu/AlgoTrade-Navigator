import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Shield, Target } from "lucide-react";

interface NetOrderFlowProps {
  chartData: any[];
}

export function NetOrderFlow({ chartData }: NetOrderFlowProps) {
  return (
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
          );
}
