import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceArea } from 'recharts';

interface RiskLevelChartProps {
  chartData: any[];
}

export function RiskLevelChart({ chartData }: RiskLevelChartProps) {
  return (
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


  );
}
