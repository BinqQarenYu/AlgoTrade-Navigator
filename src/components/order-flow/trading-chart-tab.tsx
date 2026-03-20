import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, ComposedChart, Tooltip as RechartsTooltip } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Shield, Target, AlertTriangle, Zap, Download, Terminal } from "lucide-react";
import { orderFlowAnalyzer } from "@/lib/order-flow-analyzer";

interface TradingChartTabProps {
  tradingChartData: any[];
  selectedSymbol: string;
  selectedTimeInterval: string;
  setSelectedTimeInterval: (interval: string) => void;
  isMonitoring: boolean;
  buyOrderCount?: number;
  sellOrderCount?: number;
  orderFlowData?: any[];
}

export function TradingChartTab({
  tradingChartData,
  selectedSymbol,
  selectedTimeInterval,
  setSelectedTimeInterval,
  isMonitoring,
  buyOrderCount,
  sellOrderCount,
  orderFlowData,
}: TradingChartTabProps) {
  return (
    <div className="space-y-4">
          <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">📊 Trading Chart Analysis</h3>
            <p className="text-sm text-gray-700">
              Comprehensive price action, volume analysis, and order flow correlation for {selectedSymbol}
            </p>
          </div>

          {/* Chart Controls */}
          <Card className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-indigo-800">📈 Chart Type:</label>
                <select 
                  className="px-3 py-2 border-2 border-indigo-400 rounded-md bg-white text-gray-800 text-sm font-bold shadow-lg hover:border-indigo-500 hover:shadow-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                >
                  <option value="candlestick" className="text-gray-800 font-semibold bg-white">Candlestick</option>
                  <option value="line" className="text-gray-800 font-semibold bg-white">Line Chart</option>
                  <option value="area" className="text-gray-800 font-semibold bg-white">Area Chart</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-indigo-800">⏰ Timeframe:</label>
                <select 
                  value={selectedTimeInterval}
                  onChange={(e) => setSelectedTimeInterval(e.target.value)}
                  className="px-3 py-2 border-2 border-indigo-400 rounded-md bg-white text-gray-800 text-sm font-bold shadow-lg hover:border-indigo-500 hover:shadow-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                >
                  <option value="30s" className="text-gray-800 font-semibold bg-white">30 Seconds</option>
                  <option value="5m" className="text-gray-800 font-semibold bg-white">5 Minutes</option>
                  <option value="1h" className="text-gray-800 font-semibold bg-white">1 Hour</option>
                  <option value="4h" className="text-gray-800 font-semibold bg-white">4 Hours</option>
                </select>
              </div>
              <span className="text-xs text-indigo-700 font-bold bg-indigo-100 px-3 py-1 rounded-full border border-indigo-300">
                Real-time price action with order flow overlay
              </span>
            </div>
          </Card>

          {/* Main Trading Chart */}
          <Card className="border-2 border-indigo-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-800">
                📈 {selectedSymbol} Price Chart with Order Flow Analysis
                {isMonitoring && (
                  <Badge className="bg-green-500 animate-pulse text-xs">LIVE</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Candlestick chart with volume, technical indicators, and manipulation risk overlay
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Chart Legend */}
              <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="font-semibold">Green Candle ↑</span>
                    </div>
                    <span className="text-muted-foreground">Price closed higher than open</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="font-semibold">Red Candle ↓</span>
                    </div>
                    <span className="text-muted-foreground">Price closed lower than open</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="font-semibold">Volume Bars</span>
                    </div>
                    <span className="text-muted-foreground">Trading volume per timeframe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span className="font-semibold">Risk Level</span>
                    </div>
                    <span className="text-muted-foreground">Order flow manipulation risk</span>
                  </div>
                </div>
              </div>

              {/* Combined Chart */}
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={tradingChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                    <XAxis 
                      dataKey="time"
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(value) => {
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
                        } else {
                          return date.toLocaleDateString('en-US', { 
                            month: '2-digit', 
                            day: '2-digit' 
                          }) + ' ' + date.toLocaleTimeString('en-US', { 
                            hour: '2-digit',
                            hour12: false 
                          }) + 'h';
                        }
                      }}
                    />
                    <YAxis 
                      yAxisId="price"
                      orientation="right"
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <YAxis 
                      yAxisId="volume"
                      orientation="left"
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => {
                        if (value >= 1000) {
                          return `${(value / 1000).toFixed(1)}K`;
                        }
                        return value.toFixed(0);
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
                        if (name === 'volume') {
                          return [`${Number(value).toLocaleString()}`, '📊 Volume'];
                        }
                        if (name === 'manipulationRisk') {
                          return [`${Number(value).toFixed(1)}/10`, '⚠️ Risk Score'];
                        }
                        if (name === 'close') {
                          return [`$${Number(value).toLocaleString()}`, '💰 Close Price'];
                        }
                        return [Number(value).toLocaleString(), name];
                      }}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return `${date.toLocaleDateString('en-US')} ${date.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false 
                        })}`;
                      }}
                    />
                    <Legend />
                    
                    {/* Volume Bars */}
                    <Bar
                      yAxisId="volume"
                      dataKey="volume"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                      name="volume"
                    />
                    
                    {/* Price Line */}
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="close"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="close"
                    />
                    
                    {/* Risk Level Overlay */}
                    <Line
                      yAxisId="volume"
                      type="monotone"
                      dataKey="manipulationRisk"
                      stroke="#f97316"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      name="manipulationRisk"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Current Price Info */}
              {tradingChartData.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-indigo-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm font-semibold text-indigo-800">Current Price</div>
                    <div className="text-lg font-bold text-green-600">
                      ${tradingChartData[tradingChartData.length - 1]?.close?.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-indigo-800">24h High</div>
                    <div className="text-lg font-bold text-gray-700">
                      ${Math.max(...tradingChartData.map(d => d.high)).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-indigo-800">24h Low</div>
                    <div className="text-lg font-bold text-gray-700">
                      ${Math.min(...tradingChartData.map(d => d.low)).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-indigo-800">Volume</div>
                    <div className="text-lg font-bold text-blue-600">
                      {tradingChartData[tradingChartData.length - 1]?.volume?.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-indigo-800">Risk Level</div>
                    <div className={`text-lg font-bold ${
                      tradingChartData[tradingChartData.length - 1]?.manipulationRisk <= 3 ? 'text-green-600' :
                      tradingChartData[tradingChartData.length - 1]?.manipulationRisk <= 6 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {tradingChartData[tradingChartData.length - 1]?.manipulationRisk?.toFixed(1)}/10
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latest Quantitative Output */}
          <Card className="bg-slate-900 border-slate-700 shadow-xl overflow-hidden mb-4">
            <CardHeader className="bg-slate-950/50 border-b border-slate-700 pb-4">
              <CardTitle className="flex items-center gap-2 text-white">
                  <Terminal className="h-5 w-5 text-blue-400" />
                  Latest Quantitative Output
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] h-5">Real-time indicators</Badge>
              </CardTitle>
              <CardDescription className="text-xs font-mono text-slate-400">Real-time indicators extracted from Binance candles.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {tradingChartData.length > 0 && (() => {
                const lastData = tradingChartData[tradingChartData.length - 1] || {};
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner group hover:border-blue-500/50 transition-all space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">RSI (14)</span>
                      <div className="text-2xl font-mono font-black text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">{lastData.rsi?.toFixed(2) || '---'}</div>
                      <div className={`text-[9px] font-bold uppercase ${(lastData.rsi || 50) > 70 ? 'text-red-400' : (lastData.rsi || 50) < 30 ? 'text-green-400' : 'text-slate-400'}`}>
                          {(lastData.rsi || 50) > 70 ? 'Overbought' : (lastData.rsi || 50) < 30 ? 'Oversold' : 'Neutral Zone'}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner group hover:border-green-500/50 transition-all space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">MACD Line</span>
                      <div className="text-2xl font-mono font-black text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">{lastData.macd?.toFixed(4) || '---'}</div>
                      <div className="text-[9px] font-bold uppercase text-slate-400">PERIOD 12, 26, 9</div>
                    </div>
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner group hover:border-orange-500/50 transition-all space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">BB Upper</span>
                      <div className="text-2xl font-mono font-black text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]">${lastData.bb_upper?.toLocaleString() || '---'}</div>
                      <div className="text-[9px] font-bold uppercase text-slate-400">TOP BAND</div>
                    </div>
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner group hover:border-purple-500/50 transition-all space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">BB Lower</span>
                      <div className="text-2xl font-mono font-black text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]">${lastData.bb_lower?.toLocaleString() || '---'}</div>
                      <div className="text-[9px] font-bold uppercase text-slate-400">BOTTOM BAND</div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Technical Analysis & Order Flow Correlation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-slate-900 border-slate-700 shadow-xl overflow-hidden">
              <CardHeader className="bg-slate-950/50 border-b border-slate-700 pb-4">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Activity className="h-5 w-5 text-blue-400" />
                  Technical Indicators
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] h-5">Real-time</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {tradingChartData.length > 0 && (
                    <>
                      <div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800 shadow-inner group hover:border-blue-500/50 transition-all">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">SMA (20)</span>
                        <span className="font-mono font-black text-blue-400 text-lg">
                          ${tradingChartData[tradingChartData.length - 1]?.sma20?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800 shadow-inner group hover:border-green-500/50 transition-all">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">EMA (12)</span>
                        <span className="font-mono font-black text-green-400 text-lg">
                          ${tradingChartData[tradingChartData.length - 1]?.ema12?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800 shadow-inner group hover:border-orange-500/50 transition-all">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Resistance</span>
                        <span className="font-mono font-black text-orange-400 text-lg">
                          ${tradingChartData[tradingChartData.length - 1]?.resistance?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800 shadow-inner group hover:border-purple-500/50 transition-all">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Support</span>
                        <span className="font-mono font-black text-purple-400 text-lg">
                          ${tradingChartData[tradingChartData.length - 1]?.support?.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-700 shadow-xl overflow-hidden">
              <CardHeader className="bg-slate-950/50 border-b border-slate-700 pb-4">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  Order Flow Correlation
                  <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px] h-5">Live Analysis</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {tradingChartData.length > 0 && (
                    <>
                      <div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800 shadow-inner group hover:border-green-500/50 transition-all">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Live Buy Pressure</span>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-400" />
                          <span className="font-mono font-black text-green-400 text-lg">
                            {buyOrderCount ?? tradingChartData[tradingChartData.length - 1]?.buyPressure ?? 0}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800 shadow-inner group hover:border-red-500/50 transition-all">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Live Sell Pressure</span>
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-400" />
                          <span className="font-mono font-black text-red-400 text-lg">
                            {sellOrderCount ?? tradingChartData[tradingChartData.length - 1]?.sellPressure ?? 0}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 shadow-inner">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Shield className="h-3 w-3" /> Sentiment Profile
                        </div>
                        <div className={`text-xl font-black tracking-tighter ${
                          (buyOrderCount ?? 0) > (sellOrderCount ?? 0) ? 
                          'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 
                          'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                        }`}>
                          {(buyOrderCount ?? 0) > (sellOrderCount ?? 0) ? 
                           '🚀 BULLISH ACCUMULATION' : '📉 BEARISH DISTRIBUTION'}
                        </div>
                      </div>

                      <div className="p-4 bg-slate-950/80 rounded-xl border border-yellow-500/20 shadow-inner relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500/50"></div>
                        <div className="text-xs font-bold text-yellow-500/80 uppercase tracking-widest mb-1">Momentum Signal</div>
                        <div className="text-slate-200 text-sm font-bold">
                          {tradingChartData.length >= 2 &&
                           tradingChartData[tradingChartData.length - 1]?.close > tradingChartData[tradingChartData.length - 2]?.close ?
                           'Upward Bias: Price Appreciating' : 'Downward Bias: Price Depreciating'}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                           <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${
                                  (buyOrderCount ?? 0) > (sellOrderCount ?? 0) ? 'bg-green-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(100, ((buyOrderCount ?? 1) / Math.max(1, (buyOrderCount ?? 0) + (sellOrderCount ?? 0))) * 100)}%` }}
                              ></div>
                           </div>
                           <span className="text-[10px] font-mono font-bold text-slate-400">
                             {Math.min(100, Math.round(((buyOrderCount ?? 1) / Math.max(1, (buyOrderCount ?? 0) + (sellOrderCount ?? 0))) * 100))}% BUY
                           </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
    </div>
  );
}
