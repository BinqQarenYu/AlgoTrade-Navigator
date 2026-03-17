import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Activity, Shield } from "lucide-react";
import { type OrderFlowData } from "@/hooks/use-order-flow";

interface OrderFlowSignalsProps {
  selectedSymbol: string;
  getTradingSignal: () => any;
  getMarketSentiment: () => string;
  stats: any;
  buyOrderCount: number;
  sellOrderCount: number;
  orderFlowData: OrderFlowData[];
}

export function OrderFlowSignals({
  selectedSymbol,
  getTradingSignal,
  getMarketSentiment,
  stats,
  buyOrderCount,
  sellOrderCount,
  orderFlowData,
}: OrderFlowSignalsProps) {
  const signal = getTradingSignal();
  const sentiment = getMarketSentiment();

  return (
    <div className="space-y-4">
      <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-red-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-2">📈 Trading Decision Helper</h3>
        <p className="text-sm text-gray-700">
          Based on order flow analysis, here are the current buy/sell recommendations for {selectedSymbol}
        </p>
      </div>

      {/* Current Market Signal */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            🎯 Current Market Signal for {selectedSymbol}
            <Badge className={`${
              signal.signal.includes('sell') ? 'bg-red-500 hover:bg-red-600' :
              signal.signal.includes('buy') ? 'bg-green-500 hover:bg-green-600' :
              'bg-yellow-500 hover:bg-yellow-600'
            }`}>
              {sentiment === 'bullish' ? '🟢 BULLISH' :
               sentiment === 'bearish' ? '🔴 BEARISH' :
               '🟡 NEUTRAL'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {signal.confidence}% confidence
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Buy Signal */}
            <div className={`p-4 rounded-lg border-2 ${
              signal.signal.includes('buy') ? 
              'bg-green-100 border-green-300' : 
              'bg-gray-100 border-gray-300'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className={`h-6 w-6 ${
                  signal.signal.includes('buy') ? 'text-green-600' : 'text-gray-500'
                }`} />
                <h4 className={`font-bold text-lg ${
                  signal.signal.includes('buy') ? 'text-green-800' : 'text-gray-600'
                }`}>
                  BUY SIGNAL
                </h4>
                {signal.signal === 'strong_buy' && (
                  <Badge className="bg-green-600 hover:bg-green-700 text-xs text-white">STRONG</Badge>
                )}
              </div>
              
              {signal.signal.includes('buy') ? (
                <div className="space-y-2">
                  <p className="text-green-700 font-semibold">
                    {signal.signal === 'strong_buy' ? '🚀 STRONG BUY' : '✅ GOOD TO BUY'}
                  </p>
                  <ul className="text-sm text-green-600 space-y-1">
                    <li>• {signal.reason}</li>
                    <li>• Risk Score: {stats?.averageRiskScore.toFixed(1)}/10</li>
                    <li>• Buy Pressure: {((buyOrderCount / Math.max(orderFlowData.length, 1)) * 100).toFixed(0)}%</li>
                    <li>• Market Sentiment: {sentiment.toUpperCase()}</li>
                  </ul>
                  <div className="mt-3 p-2 bg-green-200 rounded text-xs text-green-800">
                    <strong>Confidence:</strong> {signal.confidence}% • <strong>Action:</strong> Consider entering position
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-600 font-semibold">⏸️ WAIT FOR BETTER ENTRY</p>
                  <ul className="text-sm text-gray-500 space-y-1">
                    <li>• {signal.reason}</li>
                    <li>• Risk Score: {stats?.averageRiskScore.toFixed(1)}/10</li>
                    <li>• Current Signal: {signal.signal.toUpperCase()}</li>
                  </ul>
                  <div className="mt-3 p-2 bg-gray-200 rounded text-xs text-gray-600">
                    <strong>Recommendation:</strong> Monitor for improved conditions
                  </div>
                </div>
              )}
            </div>

            {/* Sell Signal */}
            <div className={`p-4 rounded-lg border-2 ${
              signal.signal.includes('sell') ? 
              'bg-red-100 border-red-300' : 
              'bg-gray-100 border-gray-300'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className={`h-6 w-6 ${
                  signal.signal.includes('sell') ? 'text-red-600' : 'text-gray-500'
                }`} />
                <h4 className={`font-bold text-lg ${
                  signal.signal.includes('sell') ? 'text-red-800' : 'text-gray-600'
                }`}>
                  SELL SIGNAL
                </h4>
                {signal.signal === 'strong_sell' && (
                  <Badge className="bg-red-600 hover:bg-red-700 text-xs text-white">URGENT</Badge>
                )}
              </div>
              
              {signal.signal.includes('sell') ? (
                <div className="space-y-2">
                  <p className="text-red-700 font-semibold">
                    {signal.signal === 'strong_sell' ? '🚨 URGENT SELL' : '❌ CONSIDER SELLING'}
                  </p>
                  <ul className="text-sm text-red-600 space-y-1">
                    <li>• {signal.reason}</li>
                    <li>• Scam Patterns: {stats?.scamCount} detected</li>
                    <li>• Manipulation Risk: {stats?.averageRiskScore.toFixed(1)}/10</li>
                    <li>• Market Sentiment: {sentiment.toUpperCase()}</li>
                  </ul>
                  <div className="mt-3 p-2 bg-red-200 rounded text-xs text-red-800">
                    <strong>Confidence:</strong> {signal.confidence}% • <strong>Action:</strong> {signal.signal === 'strong_sell' ? 'Exit immediately' : 'Consider reducing position'}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-600 font-semibold">📊 HOLD POSITION</p>
                  <ul className="text-sm text-gray-500 space-y-1">
                    <li>• No immediate sell signals</li>
                    <li>• Risk Level: {stats?.averageRiskScore.toFixed(1)}/10</li>
                    <li>• Current Signal: {signal.signal.toUpperCase()}</li>
                  </ul>
                  <div className="mt-3 p-2 bg-gray-200 rounded text-xs text-gray-600">
                    <strong>Recommendation:</strong> Continue monitoring market conditions
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Concepts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Volume Analysis
              <Badge variant="outline">Key Concept</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Natural Volume:</span>
                <span className={`font-bold ${stats?.paddingCount === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats?.paddingCount === 0 ? '✅ HEALTHY' : '❌ PADDED'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {stats?.paddingCount === 0 ? 
                  'Trading volume appears genuine with normal order sizes' :
                  `${stats?.paddingCount} instances of artificial volume padding detected`
                }
              </div>
              <div className="bg-blue-50 p-3 rounded text-xs">
                <strong>💡 Trading Tip:</strong> {stats?.paddingCount === 0 ? 
                  'Genuine volume indicates real market interest - good for entry/exit' :
                  'Padded volume can mislead - wait for natural price action'
                }
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ordering Aggressiveness */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚡ Order Aggressiveness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Market Aggression:</span>
                <span className={`font-bold ${stats?.ragCount <= 2 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats?.ragCount <= 2 ? '🟢 CALM' : '🔴 AGGRESSIVE'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">{stats?.ragCount} instances of aggressive activity</div>
              <div className="bg-purple-50 p-3 rounded text-xs">
                <strong>Tip:</strong> Aggressive activity often signals whale movement.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Decision Framework */}
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-purple-800 flex items-center gap-2">
            🎯 Trading Decision Framework
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`text-center p-4 rounded-lg border-2 ${signal.signal.includes('buy') ? 'bg-green-100 border-green-300' : 'bg-white border-gray-200'}`}>
              <div className="text-2xl mb-2">🟢</div>
              <h4 className="font-semibold text-green-800 mb-2">BUY CONDITIONS</h4>
              <ul className="text-xs text-green-700 space-y-1">
                <li>• Risk score below 4/10 ✓</li>
                <li>• No scam patterns ✓</li>
                <li>• Natural volume flow ✓</li>
              </ul>
            </div>
            {/* ... other conditions simplified for now ... */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
