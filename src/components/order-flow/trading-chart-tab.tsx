import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, ComposedChart, Tooltip as RechartsTooltip } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Shield, Target, AlertTriangle, Zap, Download } from "lucide-react";
import { orderFlowAnalyzer } from "@/lib/order-flow-analyzer";

interface TradingChartTabProps {
  tradingChartData: any[];
  selectedSymbol: string;
  selectedTimeInterval: string;
  setSelectedTimeInterval: (interval: string) => void;
  isMonitoring: boolean;
}

export function TradingChartTab({
  tradingChartData,
  selectedSymbol,
  selectedTimeInterval,
  setSelectedTimeInterval,
  isMonitoring,
}: TradingChartTabProps) {
  return (
    <div className="space-y-4">
      <div className="mb-4 p-4 bg-secondary/40 border border-white/10 rounded-xl backdrop-blur-xl">
        <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
          <Activity className="h-4 w-4 text-sky-400" />
          Trading Chart Analysis
        </h3>
        <p className="text-xs text-muted-foreground">
          Comprehensive price action, volume analysis, and order flow correlation for {selectedSymbol}
        </p>
      </div>

      {/* Chart Controls */}
      <Card className="p-4 bg-background/60 backdrop-blur-xl border border-white/10 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-foreground font-mono">📈 Chart Type:</label>
            <select 
              className="px-3 py-1.5 border border-white/10 rounded-lg bg-secondary/60 text-foreground text-xs font-bold shadow-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            >
              <option value="candlestick" className="bg-slate-900 text-foreground font-semibold">Candlestick</option>
              <option value="line" className="bg-slate-900 text-foreground font-semibold">Line Chart</option>
              <option value="area" className="bg-slate-900 text-foreground font-semibold">Area Chart</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-foreground font-mono">⏰ Timeframe:</label>
            <select 
              value={selectedTimeInterval}
              onChange={(e) => setSelectedTimeInterval(e.target.value)}
              className="px-3 py-1.5 border border-white/10 rounded-lg bg-secondary/60 text-foreground text-xs font-bold shadow-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            >
              <option value="30s" className="bg-slate-900 text-foreground font-semibold">30 Seconds</option>
              <option value="5m" className="bg-slate-900 text-foreground font-semibold">5 Minutes</option>
              <option value="1h" className="bg-slate-900 text-foreground font-semibold">1 Hour</option>
              <option value="4h" className="bg-slate-900 text-foreground font-semibold">4 Hours</option>
            </select>
          </div>
          <span className="text-xs text-sky-400 font-mono font-bold bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/30">
            Real-time price action with order flow overlay
          </span>
        </div>
      </Card>

      {/* Main Trading Chart */}
      <Card className="bg-background/60 backdrop-blur-xl border border-white/10 shadow-xl">
        <CardHeader className="border-b border-white/5 pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            📈 {selectedSymbol} Price Chart with Order Flow Analysis
            {isMonitoring && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse text-xs">LIVE</Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Candlestick chart with volume, technical indicators, and manipulation risk overlay
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Chart Legend */}
          <div className="mb-4 p-3 bg-secondary/30 rounded-xl border border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-emerald-400 rounded-sm"></div>
                  <span className="font-bold text-foreground">Green Candle ↑</span>
                </div>
                <span className="text-muted-foreground">Closed higher</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-rose-400 rounded-sm"></div>
                  <span className="font-bold text-foreground">Red Candle ↓</span>
                </div>
                <span className="text-muted-foreground">Closed lower</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-sky-400 rounded-sm"></div>
                  <span className="font-bold text-foreground">Volume Bars</span>
                </div>
                <span className="text-muted-foreground">Trading volume</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-amber-400 rounded-sm"></div>
                  <span className="font-bold text-foreground">Risk Level</span>
                </div>
                <span className="text-muted-foreground">Manipulation risk</span>
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
                <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-secondary/30 border border-white/5 rounded-xl">
                  <div className="text-center">
                    <div className="text-xs font-semibold text-muted-foreground">Current Price</div>
                    <div className="text-base font-bold text-emerald-400 font-mono">
                      ${tradingChartData[tradingChartData.length - 1]?.close?.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-muted-foreground">24h High</div>
                    <div className="text-base font-bold text-foreground font-mono">
                      ${Math.max(...tradingChartData.map(d => d.high)).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-muted-foreground">24h Low</div>
                    <div className="text-base font-bold text-foreground font-mono">
                      ${Math.min(...tradingChartData.map(d => d.low)).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-muted-foreground">Volume</div>
                    <div className="text-base font-bold text-sky-400 font-mono">
                      {tradingChartData[tradingChartData.length - 1]?.volume?.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-muted-foreground">Risk Level</div>
                    <div className={`text-base font-bold font-mono ${
                      tradingChartData[tradingChartData.length - 1]?.manipulationRisk <= 3 ? 'text-emerald-400' :
                      tradingChartData[tradingChartData.length - 1]?.manipulationRisk <= 6 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {tradingChartData[tradingChartData.length - 1]?.manipulationRisk?.toFixed(1)}/10
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technical Analysis & Order Flow Correlation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-background/60 backdrop-blur-xl border border-white/10 shadow-xl">
              <CardHeader className="border-b border-white/5 pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                  📊 Technical Indicators
                  <Badge variant="outline" className="text-xs border-sky-500/30 text-sky-400">Real-time</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3 font-mono">
                  {tradingChartData.length > 0 && (
                    <>
                      <div className="flex justify-between items-center p-3 bg-secondary/30 border border-white/5 rounded-xl">
                        <span className="text-xs font-semibold text-muted-foreground">SMA (20):</span>
                        <span className="text-sm font-bold text-sky-400">
                          ${tradingChartData[tradingChartData.length - 1]?.sma20?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary/30 border border-white/5 rounded-xl">
                        <span className="text-xs font-semibold text-muted-foreground">EMA (12):</span>
                        <span className="text-sm font-bold text-emerald-400">
                          ${tradingChartData[tradingChartData.length - 1]?.ema12?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary/30 border border-white/5 rounded-xl">
                        <span className="text-xs font-semibold text-muted-foreground">Resistance:</span>
                        <span className="text-sm font-bold text-amber-400">
                          ${tradingChartData[tradingChartData.length - 1]?.resistance?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary/30 border border-white/5 rounded-xl">
                        <span className="text-xs font-semibold text-muted-foreground">Support:</span>
                        <span className="text-sm font-bold text-purple-400">
                          ${tradingChartData[tradingChartData.length - 1]?.support?.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/60 backdrop-blur-xl border border-white/10 shadow-xl">
              <CardHeader className="border-b border-white/5 pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                  🔄 Order Flow Correlation
                  <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">Live Analysis</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3 font-mono">
                  {tradingChartData.length > 0 && (
                    <>
                      <div className="flex justify-between items-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <span className="text-xs font-semibold text-muted-foreground">Buy Pressure:</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {tradingChartData[tradingChartData.length - 1]?.buyPressure || 0} orders
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                        <span className="text-xs font-semibold text-muted-foreground">Sell Pressure:</span>
                        <span className="text-sm font-bold text-rose-400">
                          {tradingChartData[tradingChartData.length - 1]?.sellPressure || 0} orders
                        </span>
                      </div>
                      <div className="p-3 bg-secondary/30 border border-white/5 rounded-xl">
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Order Flow Sentiment:</div>
                        <div className={`text-sm font-bold ${
                          (tradingChartData[tradingChartData.length - 1]?.buyPressure || 0) > 
                          (tradingChartData[tradingChartData.length - 1]?.sellPressure || 0) ? 
                          'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {(tradingChartData[tradingChartData.length - 1]?.buyPressure || 0) > 
                           (tradingChartData[tradingChartData.length - 1]?.sellPressure || 0) ? 
                           '🚀 BULLISH' : '📉 BEARISH'}
                        </div>
                      </div>
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <div className="text-xs font-semibold text-amber-300 mb-1">Price Action Signal:</div>
                        <div className="text-amber-400 text-xs font-bold">
                          {tradingChartData.length >= 2 &&
                           tradingChartData[tradingChartData.length - 1]?.close > tradingChartData[tradingChartData.length - 2]?.close ?
                           '⬆️ Upward momentum detected' : '⬇️ Downward momentum detected'}
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
