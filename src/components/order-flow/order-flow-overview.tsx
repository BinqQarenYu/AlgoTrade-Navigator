import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Target, Activity, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { OrderFlowStats } from "./order-flow-stats";
import { type ManipulationPattern, type OrderFlowData } from "@/hooks/use-order-flow";

interface OrderFlowOverviewProps {
  stats: any;
  selectedSymbol: string;
  isMonitoring: boolean;
  orderFlowData: OrderFlowData[];
  manipulationPatterns: ManipulationPattern[];
  calculateMarketSentiment: () => number;
  getVolumeIndicator: () => string;
  getVolumeDescription: () => string;
  getVolumeExplanation: () => string;
  getRiskLevel: () => string;
  getRiskLevelColor: () => string;
  getRiskExplanation: () => string;
  getRecommendedActions: () => { title: string; description: string }[];
  getPatternIcon: (type: string) => React.ReactNode;
  getSeverityColor: (severity: string) => string;
}

export function OrderFlowOverview({
  stats,
  selectedSymbol,
  isMonitoring,
  orderFlowData,
  manipulationPatterns,
  calculateMarketSentiment,
  getVolumeIndicator,
  getVolumeDescription,
  getVolumeExplanation,
  getRiskLevel,
  getRiskLevelColor,
  getRiskExplanation,
  getRecommendedActions,
  getPatternIcon,
  getSeverityColor,
}: OrderFlowOverviewProps) {
  return (
    <div className="space-y-4">
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-2">📊 Order Flow Analysis Overview</h3>
        <p className="text-sm text-gray-700">
          Monitor real-time order flow patterns and detect manipulation for {selectedSymbol}
        </p>
      </div>

      {/* Debug Info */}
      <Card className="mb-4 bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <div className="text-sm text-gray-600">
            <div>🔍 Debug Info:</div>
            <div>• Order Flow Data: {orderFlowData.length} items</div>
            <div>• Stats Available: {stats ? 'Yes' : 'No'}</div>
            <div>• Symbol: {selectedSymbol}</div>
            <div>• Monitoring: {isMonitoring ? 'Active' : 'Inactive'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      {stats && (
        <OrderFlowStats stats={stats} selectedSymbol={selectedSymbol} isMonitoring={isMonitoring} />
      )}
      
      {/* Summarized Analysis */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <BarChart3 className="h-5 w-5" />
            📊 Market Analysis Summary
          </CardTitle>
          <CardDescription>
            Intuitive overview of what's happening in the {selectedSymbol} order flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                {calculateMarketSentiment() > 0.6 ? '🟢' : calculateMarketSentiment() < 0.4 ? '🔴' : '🟡'}
                Market Sentiment
              </h4>
              <div className="text-lg font-bold mb-1">
                {calculateMarketSentiment() > 0.6 ? 'Bullish 📈' : 
                 calculateMarketSentiment() < 0.4 ? 'Bearish 📉' : 'Neutral ⚖️'}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Based on recent buy vs sell volume and order frequency.
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                {getVolumeIndicator()} Volume Intensity
              </h4>
              <div className="text-lg font-bold mb-1">{getVolumeDescription()}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {getVolumeExplanation()}
              </p>
            </div>
          </div>

          <div className={`p-4 rounded-lg border-2 ${
            getRiskLevel().includes('HIGH') ? 'bg-red-50 border-red-200' : 
            getRiskLevel().includes('MEDIUM') ? 'bg-yellow-50 border-yellow-200' : 
            'bg-green-50 border-green-200'
          }`}>
            <h4 className={`font-bold mb-2 flex items-center gap-2 ${getRiskLevelColor()}`}>
              <AlertTriangle className="h-4 w-4" />
              Manipulation Risk: {getRiskLevel()}
            </h4>
            <p className="text-sm text-gray-700">{getRiskExplanation()}</p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              🎯 Recommended Actions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getRecommendedActions().map((action, index) => (
                <div key={index} className="bg-white p-3 rounded border border-green-200 text-sm">
                  <div className="font-semibold text-green-800 mb-1">{action.title}</div>
                  <div className="text-gray-700">{action.description}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Manipulation Patterns */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold">🚨 Threat Detection</h3>
          <div className="text-sm text-muted-foreground">
            Click on each card to learn more about these manipulation tactics
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {manipulationPatterns.map((pattern, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
                  {getPatternIcon(pattern.type)}
                  {pattern.type === 'padding' ? '🎯 Order Padding' : 
                   pattern.type === 'scam' ? '⚠️ Scam Activity' : 
                   '⚡ Rag Pulling'}
                </CardTitle>
                <Badge className={getSeverityColor(pattern.severity)}>
                  {pattern.severity.toUpperCase()}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2 flex items-center gap-2">
                  {pattern.count}
                  <span className="text-sm font-normal text-muted-foreground">detected</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {pattern.type === 'padding' ? 'Fake volume from tiny orders to mislead traders' :
                   pattern.type === 'scam' ? 'Suspicious patterns indicating potential fraud' :
                   'Aggressive trades to manipulate prices rapidly'}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  {pattern.severity === 'high' ? 
                    <><XCircle className="h-3 w-3 text-red-500" /> High Threat</> :
                    pattern.severity === 'medium' ? 
                    <><AlertTriangle className="h-3 w-3 text-yellow-500" /> Moderate Risk</> :
                    <><CheckCircle className="h-3 w-3 text-green-500" /> Low Risk</>
                  }
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
