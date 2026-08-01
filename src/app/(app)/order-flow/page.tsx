"use client";

import { useState } from "react";
import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  Target,
  Zap,
  LayoutDashboard,
  BarChart3,
  TrendingUp as ChartIcon
} from "lucide-react";
import { useApi } from "@/context/api-context";
import { useWorkspace } from "@/context/workspace-context";

// Custom Hook
import { useOrderFlow } from "@/hooks/use-order-flow";

// Sub-components
import { OrderFlowStats } from "@/components/order-flow/order-flow-stats";
import { OrderFlowGuide } from "@/components/order-flow/order-flow-guide";
import { OrderFlowCharts } from "@/components/order-flow/order-flow-charts";
import { TradingChartTab } from "@/components/order-flow/trading-chart-tab";
import { OrderFlowOverview } from "@/components/order-flow/order-flow-overview";
import { OrderFlowSignals } from "@/components/order-flow/order-flow-signals";
import { OrderFlowThreatPatterns } from "@/components/order-flow/order-flow-threat-patterns";
import { OrderFlowLiveOrders } from "@/components/order-flow/order-flow-live-orders";
import { OrderFlowWhaleActivity } from "@/components/order-flow/order-flow-whale-activity";
import { OrderFlowAlerts } from "@/components/order-flow/order-flow-alerts";

// Shadcn UI
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function OrderFlowPage() {
  const { coingeckoApiKey, coinmarketcapApiKey } = useApi();
  const { orderFlowState, updateOrderFlow, setLastSelectedSymbol } = useWorkspace();
  
  const [selectedSymbol, setSelectedSymbolState] = useState<string>(orderFlowState.selectedSymbol || "BTCUSDT");
  const [selectedTimeInterval, setSelectedTimeIntervalState] = useState<string>(orderFlowState.selectedTimeInterval || "30s");

  const setSelectedSymbol = (symbol: string) => {
    setSelectedSymbolState(symbol);
    setLastSelectedSymbol(symbol);
    updateOrderFlow({ selectedSymbol: symbol });
  };

  const setSelectedTimeInterval = (interval: string) => {
    setSelectedTimeIntervalState(interval);
    updateOrderFlow({ selectedTimeInterval: interval });
  };

  const orderFlow = useOrderFlow(
    selectedSymbol, 
    selectedTimeInterval, 
    coingeckoApiKey, 
    coinmarketcapApiKey
  );

  const {
    orderFlowData,
    manipulationPatterns,
    isMonitoring,
    stats,
    hasHighRiskDetected,
    chartData,
    tradingChartData,
    veryLargeActivities,
    activeVeryLargeActivity,
    veryLargeActivityLog,
    buyOrderCount,
    sellOrderCount,
    setIsMonitoring,
    startMonitoring,
    stopMonitoring,
    saveActivityLog,
    setOrderFlowData,
    updateChartData,
    calculateMarketSentiment,
    getMarketSentiment,
    getTradingSignal,
    getVolumeIndicator,
    getVolumeDescription,
    getVolumeExplanation,
    getRiskLevel,
    getRiskLevelColor,
    getRiskExplanation,
    getRecommendedActions
  } = orderFlow;

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'padding': return <Target className="h-4 w-4" />;
      case 'scam': return <AlertTriangle className="h-4 w-4" />;
      case 'rag': return <Zap className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500 hover:bg-red-600';
      case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'low': return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <TooltipProvider>
    <div className={`container mx-auto p-4 space-y-6 min-h-screen bg-slate-950 text-slate-200 transition-colors duration-500 ${activeVeryLargeActivity ? 'animate-bg-alarm' : ''}`}>
      {/* Header Section */}
      <Card className={`border-b-4 border-b-blue-500 shadow-xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 transition-all duration-500 ${activeVeryLargeActivity ? 'border-b-red-500' : ''}`}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl shadow-lg ring-4 transition-all duration-500 ${activeVeryLargeActivity ? 'bg-red-600 ring-red-100 animate-bounce' : 'bg-blue-600 ring-blue-100'}`}>
                {activeVeryLargeActivity ? <AlertTriangle className="h-8 w-8 text-white" /> : <Activity className="h-8 w-8 text-white" />}
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white">
                  Order Flow Navigator
                </h1>
                <p className={`font-medium flex items-center gap-2 mt-1 transition-colors duration-500 ${activeVeryLargeActivity ? 'text-red-400' : 'text-blue-400'}`}>
                  <span className={`flex h-2 w-2 rounded-full animate-pulse ${activeVeryLargeActivity ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                  {activeVeryLargeActivity ? '⚠️ CRITICAL MARKET ALERT' : 'Institutional Grade Flow Analysis'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 p-2 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700 shadow-inner">
              <div className="flex items-center gap-3 px-3">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pair:</span>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                  <SelectTrigger className={`w-[140px] bg-slate-800 border-2 font-bold transition-all ${activeVeryLargeActivity ? 'border-red-500 text-red-400' : 'border-slate-700 text-white hover:border-blue-500'}`}>
                    <SelectValue placeholder="Select Symbol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTCUSDT" className="font-bold">BTC/USDT</SelectItem>
                    <SelectItem value="ETHUSDT" className="font-bold">ETH/USDT</SelectItem>
                    <SelectItem value="BNBUSDT" className="font-bold">BNB/USDT</SelectItem>
                    <SelectItem value="SOLUSDT" className="font-bold">SOL/USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="h-8 w-px bg-blue-100"></div>

              <div className="flex gap-2 px-3">
                {!isMonitoring ? (
                  <Button 
                    onClick={startMonitoring}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all active:scale-95 border border-blue-500"
                  >
                    🚀 Start Monitoring
                  </Button>
                ) : (
                  <Button 
                    onClick={stopMonitoring}
                    variant="destructive"
                    className="font-bold px-6 shadow-md hover:shadow-lg transition-all active:scale-95"
                  >
                    🛑 Stop System
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hero Alerts */}
      {activeVeryLargeActivity && (
        <Alert className="border-4 border-red-500 bg-red-50 shadow-2xl animate-alarm-blink">
          <AlertTriangle className="h-6 w-6 text-red-600 animate-pulse" />
          <AlertTitle className="text-xl font-black text-red-900 flex items-center gap-2">
            🚨 WHALE ACTIVITY DETECTED
            <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse uppercase">Critical</span>
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-red-800 font-black text-2xl tracking-tight">
                {activeVeryLargeActivity.description}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={saveActivityLog} className="bg-white border-red-200 hover:bg-red-100 text-red-700 font-bold shadow-lg">
                  💾 Save Alert Log
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Status Alert */}
      {isMonitoring && (
        <Alert className="bg-green-50 border-green-200 shadow-sm border-l-4 border-l-green-500">
          <Activity className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 font-bold">🟢 Live Monitoring Active</AlertTitle>
          <AlertDescription className="text-green-700">
            Scanning {selectedSymbol} for suspicious trading patterns in real-time.
          </AlertDescription>
        </Alert>
      )}

      {!isMonitoring && (
        <OrderFlowGuide />
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white font-bold text-slate-400 rounded-lg">
            <LayoutDashboard className="h-4 w-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="chart" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white font-bold text-slate-400 rounded-lg">
            <BarChart3 className="h-4 w-4 mr-2" /> Flow Chart
          </TabsTrigger>
          <TabsTrigger value="trading-chart" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white font-bold text-slate-400 rounded-lg">
            <ChartIcon className="h-4 w-4 mr-2" /> Trading Chart
          </TabsTrigger>
          <TabsTrigger value="signals" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white font-bold text-slate-400 rounded-lg">
            <TrendingUp className="h-4 w-4 mr-2" /> Signals
          </TabsTrigger>
          <TabsTrigger value="patterns" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white font-bold text-slate-400 rounded-lg">
            <Target className="h-4 w-4 mr-2" /> Patterns
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white font-bold text-slate-400 rounded-lg">
            <Activity className="h-4 w-4 mr-2" /> Live Orders
          </TabsTrigger>
          <TabsTrigger value="whale" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white font-bold text-slate-400 rounded-lg">
            <Zap className="h-4 w-4 mr-2" /> Whales
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white font-bold text-slate-400 rounded-lg">
            <AlertTriangle className="h-4 w-4 mr-2" /> Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OrderFlowOverview 
            stats={stats}
            selectedSymbol={selectedSymbol}
            isMonitoring={isMonitoring}
            orderFlowData={orderFlowData}
            manipulationPatterns={manipulationPatterns}
            calculateMarketSentiment={calculateMarketSentiment}
            getVolumeIndicator={getVolumeIndicator}
            getVolumeDescription={getVolumeDescription}
            getVolumeExplanation={getVolumeExplanation}
            getRiskLevel={getRiskLevel}
            getRiskLevelColor={getRiskLevelColor}
            getRiskExplanation={getRiskExplanation}
            getRecommendedActions={getRecommendedActions}
            getPatternIcon={getPatternIcon}
            getSeverityColor={getSeverityColor}
          />
        </TabsContent>

        <TabsContent value="chart" className="space-y-4">
          <OrderFlowCharts 
            chartData={chartData} 
            selectedSymbol={selectedSymbol} 
            selectedTimeInterval={selectedTimeInterval} 
            setSelectedTimeInterval={setSelectedTimeInterval} 
            isMonitoring={isMonitoring} 
            setOrderFlowData={setOrderFlowData} 
            updateChartData={updateChartData} 
          />
        </TabsContent>

        <TabsContent value="trading-chart" className="space-y-4">
          <TradingChartTab 
            tradingChartData={tradingChartData} 
            selectedSymbol={selectedSymbol} 
            selectedTimeInterval={selectedTimeInterval} 
            setSelectedTimeInterval={setSelectedTimeInterval} 
            isMonitoring={isMonitoring} 
          />
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <OrderFlowSignals 
            selectedSymbol={selectedSymbol}
            getTradingSignal={getTradingSignal}
            getMarketSentiment={getMarketSentiment}
            stats={stats}
            buyOrderCount={buyOrderCount}
            sellOrderCount={sellOrderCount}
            orderFlowData={orderFlowData}
          />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <OrderFlowThreatPatterns 
            manipulationPatterns={manipulationPatterns}
            getPatternIcon={getPatternIcon}
            getSeverityColor={getSeverityColor}
          />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <OrderFlowLiveOrders 
            orderFlowData={orderFlowData}
            activeVeryLargeActivity={activeVeryLargeActivity}
          />
        </TabsContent>

        <TabsContent value="whale" className="space-y-4">
          <OrderFlowWhaleActivity 
            veryLargeActivities={veryLargeActivities}
            activeVeryLargeActivity={activeVeryLargeActivity}
            veryLargeActivityLog={veryLargeActivityLog}
            saveActivityLog={saveActivityLog}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <OrderFlowAlerts 
            hasHighRiskDetected={hasHighRiskDetected}
            selectedSymbol={selectedSymbol}
            manipulationPatterns={manipulationPatterns}
          />
        </TabsContent>
      </Tabs>
    </div>
    </TooltipProvider>
  );
}
