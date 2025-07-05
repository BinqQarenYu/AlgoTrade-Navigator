
"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { TradingChart } from "@/components/trading-chart"
import { useApi } from "@/context/api-context"
import { useBot } from "@/context/bot-context"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal, Loader2, ClipboardCheck, Wand2, Activity, RotateCcw, Bot, ChevronDown, Newspaper, Crown, Flame, Smile, Thermometer, TrendingUp, TrendingDown, DollarSign, Repeat, ArrowUpToLine, ArrowDownToLine, BrainCircuit, Send, XCircle, Eye, GripHorizontal } from "lucide-react"
import type { HistoricalData, CoinDetails, FearAndGreedIndex } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { topAssets, getAvailableQuotesForBase } from "@/lib/assets"
import { strategyMetadatas, getStrategyById } from "@/lib/strategies"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn, formatPrice, formatLargeNumber } from "@/lib/utils"
import { getCoinDetailsByTicker } from "@/lib/coingecko-service"
import { getCoinDetailsByTickerFromCMC } from "@/lib/coinmarketcap-service"
import { getFearAndGreedIndex } from "@/lib/fear-greed-service"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"

import { defaultAwesomeOscillatorParams } from "@/lib/strategies/awesome-oscillator"
import { defaultBollingerBandsParams } from "@/lib/strategies/bollinger-bands"
import { defaultCciReversionParams } from "@/lib/strategies/cci-reversion"
import { defaultChaikinMoneyFlowParams } from "@/lib/strategies/chaikin-money-flow"
import { defaultCoppockCurveParams } from "@/lib/strategies/coppock-curve"
import { defaultDonchianChannelsParams } from "@/lib/strategies/donchian-channels"
import { defaultElderRayIndexParams } from "@/lib/strategies/elder-ray-index"
import { defaultEmaCrossoverParams } from "@/lib/strategies/ema-crossover"
import { defaultHyperPFFParams } from "@/lib/strategies/hyper-peak-formation"
import { defaultIchimokuCloudParams } from "@/lib/strategies/ichimoku-cloud"
import { defaultKeltnerChannelsParams } from "@/lib/strategies/keltner-channels"
import { defaultMacdCrossoverParams } from "@/lib/strategies/macd-crossover"
import { defaultMomentumCrossParams } from "@/lib/strategies/momentum-cross"
import { defaultObvDivergenceParams } from "@/lib/strategies/obv-divergence"
import { defaultParabolicSarFlipParams } from "@/lib/strategies/parabolic-sar-flip"
import { defaultPffParams } from "@/lib/strategies/peak-formation-fib"
import { defaultPivotPointReversalParams } from "@/lib/strategies/pivot-point-reversal"
import { defaultReversePffParams } from "@/lib/strategies/reverse-pff"
import { defaultRsiDivergenceParams } from "@/lib/strategies/rsi-divergence"
import { defaultSmaCrossoverParams } from "@/lib/strategies/sma-crossover"
import { defaultStochasticCrossoverParams } from "@/lib/strategies/stochastic-crossover"
import { defaultSupertrendParams } from "@/lib/strategies/supertrend"
import { defaultVolumeDeltaParams } from "@/lib/strategies/volume-profile-delta"
import { defaultVwapCrossParams } from "@/lib/strategies/vwap-cross"
import { defaultWilliamsRParams } from "@/lib/strategies/williams-percent-r"

const DEFAULT_PARAMS_MAP: Record<string, any> = {
    'awesome-oscillator': defaultAwesomeOscillatorParams,
    'bollinger-bands': defaultBollingerBandsParams,
    'cci-reversion': defaultCciReversionParams,
    'chaikin-money-flow': defaultChaikinMoneyFlowParams,
    'coppock-curve': defaultCoppockCurveParams,
    'donchian-channels': defaultDonchianChannelsParams,
    'elder-ray-index': defaultElderRayIndexParams,
    'ema-crossover': defaultEmaCrossoverParams,
    'hyper-peak-formation': defaultHyperPFFParams,
    'ichimoku-cloud': defaultIchimokuCloudParams,
    'keltner-channels': defaultKeltnerChannelsParams,
    'macd-crossover': defaultMacdCrossoverParams,
    'momentum-cross': defaultMomentumCrossParams,
    'obv-divergence': defaultObvDivergenceParams,
    'parabolic-sar-flip': defaultParabolicSarFlipParams,
    'peak-formation-fib': defaultPffParams,
    'pivot-point-reversal': defaultPivotPointReversalParams,
    'reverse-pff': defaultReversePffParams,
    'rsi-divergence': defaultRsiDivergenceParams,
    'sma-crossover': defaultSmaCrossoverParams,
    'stochastic-crossover': defaultStochasticCrossoverParams,
    'supertrend': defaultSupertrendParams,
    'volume-delta': defaultVolumeDeltaParams,
    'vwap-cross': defaultVwapCrossParams,
    'williams-r': defaultWilliamsRParams,
}

export default function ManualTradingPage() {
  const { isConnected, coingeckoApiKey, coinmarketcapApiKey, activeProfile } = useApi();
  const { toast } = useToast();
  const { 
    manualTraderState,
    runManualAnalysis,
    cancelManualAnalysis,
    resetManualSignal,
    setManualChartData,
    isTradingActive,
    strategyParams,
    setStrategyParams,
    executeManualTrade,
    cleanManualChart,
  } = useBot();

  const { isAnalyzing, logs, signal, chartData, isExecuting } = manualTraderState;
  
  // Local state for UI configuration
  const [baseAsset, setBaseAsset] = useState<string>("BTC");
  const [quoteAsset, setQuoteAsset] = useState<string>("USDT");
  const [availableQuotes, setAvailableQuotes] = useState<string[]>([]);
  const symbol = useMemo(() => `${baseAsset}${quoteAsset}`, [baseAsset, quoteAsset]);
  
  const [selectedStrategy, setSelectedStrategy] = useState<string>("peak-formation-fib");
  const [interval, setInterval] = useState<string>("1h");
  const [initialCapital, setInitialCapital] = useState<number>(100);
  const [leverage, setLeverage] = useState<number>(10);
  const [takeProfit, setTakeProfit] = useState<number>(2);
  const [stopLoss, setStopLoss] = useState<number>(1);
  const [fee, setFee] = useState<number>(0.04);
  const [useAIPrediction, setUseAIPrediction] = useState(false);
  const [chartHeight, setChartHeight] = useState(600);

  // State for external data
  const [coinDetails, setCoinDetails] = useState<CoinDetails | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [fearAndGreed, setFearAndGreed] = useState<FearAndGreedIndex | null>(null);
  const [isFetchingFng, setIsFetchingFng] = useState(false);

  // Collapsible states
  const [isGeneratorOpen, setGeneratorOpen] = useState(false);
  const [isParamsOpen, setParamsOpen] = useState(false);
  const [isIntelOpen, setIntelOpen] = useState(false);
  const [isSignalOpen, setSignalOpen] = useState(false);
  const [isLogsOpen, setLogsOpen] = useState(false);

  useEffect(() => {
    if (selectedStrategy === 'none') {
      cleanManualChart();
    }
  }, [selectedStrategy, cleanManualChart]);
  
  const startChartResize = useCallback((mouseDownEvent: React.MouseEvent<HTMLDivElement>) => {
    mouseDownEvent.preventDefault();
    const startHeight = chartHeight;
    const startPosition = mouseDownEvent.clientY;

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const newHeight = startHeight + mouseMoveEvent.clientY - startPosition;
      if (newHeight >= 400 && newHeight <= 1200) {
        setChartHeight(newHeight);
      }
    };

    const onMouseUp = () => {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, { once: true });
  }, [chartHeight]);

  useEffect(() => {
    const quotes = getAvailableQuotesForBase(baseAsset);
    setAvailableQuotes(quotes);
    if (!quotes.includes(quoteAsset)) {
      setQuoteAsset(quotes[0] || '');
    }
  }, [baseAsset, quoteAsset]);

  // Fetch asset-specific details
  useEffect(() => {
    const fetchDetails = async () => {
      if (!baseAsset) {
        setCoinDetails(null);
        return;
      }
      setIsFetchingDetails(true);
      setCoinDetails(null);

      try {
        const [cmcDetails, cgDetails] = await Promise.all([
          coinmarketcapApiKey ? getCoinDetailsByTickerFromCMC(baseAsset, coinmarketcapApiKey) : Promise.resolve(null),
          getCoinDetailsByTicker(baseAsset, coingeckoApiKey) // Always fetch from CG for sentiment
        ]);

        let finalDetails: CoinDetails | null = null;

        if (cmcDetails) {
          // CMC is the primary source, enrich it with CoinGecko data
          finalDetails = { ...cmcDetails };
          if (cgDetails) {
            finalDetails.sentimentUp = cgDetails.sentimentUp;
            finalDetails.publicInterestScore = cgDetails.publicInterestScore;
            // Use CoinGecko image if CMC one is missing
            if (!finalDetails.image && cgDetails.image) {
              finalDetails.image = cgDetails.image;
            }
          }
          toast({ title: "Loaded from CoinMarketCap", description: "Asset intelligence enriched with CoinGecko data." });
        } else if (cgDetails) {
          // Fallback to CoinGecko if CMC fails or is not configured
          finalDetails = cgDetails;
          toast({ title: "Loaded from CoinGecko", description: "Using CoinGecko as the data source." });
        }
        
        setCoinDetails(finalDetails);

      } catch (e) {
        console.error("Failed to fetch coin details", e);
        toast({ title: "Error", description: "Could not fetch asset intelligence.", variant: "destructive" });
      } finally {
        setIsFetchingDetails(false);
      }
    };

    fetchDetails();
  }, [baseAsset, coingeckoApiKey, coinmarketcapApiKey, toast]);
  
  // Fetch market-wide Fear & Greed index once on page load
  useEffect(() => {
    const fetchFng = async () => {
        setIsFetchingFng(true);
        try {
            const index = await getFearAndGreedIndex();
            setFearAndGreed(index);
        } catch(e) {
            console.error("Failed to fetch F&G index", e);
            setFearAndGreed(null);
        } finally {
            setIsFetchingFng(false);
        }
    };
    fetchFng();
  }, []);

  const handleRunAnalysis = useCallback(() => {
    runManualAnalysis({
        symbol,
        interval,
        strategy: selectedStrategy,
        strategyParams: strategyParams[selectedStrategy],
        initialCapital,
        leverage,
        takeProfit,
        stopLoss,
        useAIPrediction,
        fee
    });
  }, [runManualAnalysis, symbol, interval, selectedStrategy, strategyParams, initialCapital, leverage, takeProfit, stopLoss, useAIPrediction, fee]);

  const handleCancelAnalysis = useCallback(() => {
    cancelManualAnalysis();
  }, [cancelManualAnalysis]);

  const handleResetSignal = useCallback(() => {
    resetManualSignal();
  }, [resetManualSignal]);

  const handleIntervalChange = (newInterval: string) => {
    setInterval(newInterval);
  };

  const handleBaseAssetChange = (newBase: string) => {
    setBaseAsset(newBase);
  };
  
  const handleQuoteAssetChange = (newQuote: string) => {
    setQuoteAsset(newQuote);
  };

  useEffect(() => {
    if (isConnected && !manualTraderState.isAnalyzing && manualTraderState.signal === null && symbol) {
      setManualChartData(symbol, interval);
    }
  }, [isConnected, symbol, interval, setManualChartData, manualTraderState.isAnalyzing, manualTraderState.signal]);


  const hasActiveSignal = signal !== null;
  
  const handleParamChange = (strategyId: string, paramName: string, value: string) => {
    const parsedValue = value.includes('.') ? parseFloat(value) : parseInt(value, 10);
    setStrategyParams(prev => ({
        ...prev,
        [strategyId]: {
            ...prev[strategyId],
            [paramName]: isNaN(parsedValue) ? 0 : parsedValue,
        }
    }));
  };
  
  const handleResetParams = () => {
    const defaultParams = DEFAULT_PARAMS_MAP[selectedStrategy];
    if (defaultParams) {
        setStrategyParams(prev => ({...prev, [selectedStrategy]: defaultParams}));
        const strategyName = getStrategyById(selectedStrategy)?.name || 'the strategy';
        toast({ title: "Parameters Reset", description: `The parameters for ${strategyName} have been reset to their default values.`});
    }
  }

  const handleExecuteTrade = (isSimulation: boolean) => {
    if (signal) {
      executeManualTrade(signal, initialCapital, leverage, isSimulation);
    }
  };

  // Derived state for signal card
  const positionValue = initialCapital * leverage;
  let tradeQuantity = 0;
  let entryFee = 0;
  let exitFee = 0;
  let totalFee = 0;
  let grossPnl = 0;
  let netPnl = 0;

  if (signal) {
    tradeQuantity = positionValue / signal.entryPrice;
    entryFee = signal.entryPrice * tradeQuantity * (fee / 100);
    exitFee = signal.takeProfit * tradeQuantity * (fee / 100);
    totalFee = entryFee + exitFee;
    if (signal.action === 'UP') {
        grossPnl = (signal.takeProfit - signal.entryPrice) * tradeQuantity;
    } else {
        grossPnl = (signal.entryPrice - signal.takeProfit) * tradeQuantity;
    }
    netPnl = grossPnl - totalFee;
  }
  
  const isThisPageTrading = isAnalyzing || hasActiveSignal;

  const getFngColor = (value: number) => {
    if (value <= 25) return "bg-red-600"; // Extreme Fear
    if (value <= 45) return "bg-orange-500"; // Fear
    if (value <= 55) return "bg-yellow-500"; // Neutral
    if (value <= 75) return "bg-green-400"; // Greed
    return "bg-green-600"; // Extreme Greed
  };

  const renderParameterControls = () => {
    const params = strategyParams[selectedStrategy];
    if (!params) return <p className="text-sm text-muted-foreground">This strategy has no tunable parameters.</p>;

    const controls = Object.entries(params).map(([key, value]) => (
      <div key={key} className="space-y-2">
        <Label htmlFor={key} className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
        <Input 
          id={key}
          type="number"
          value={value as number}
          onChange={(e) => handleParamChange(selectedStrategy, key, e.target.value)}
          step={String(value).includes('.') ? '0.001' : '1'}
          disabled={isThisPageTrading}
        />
      </div>
    ));

    const canReset = !!DEFAULT_PARAMS_MAP[selectedStrategy];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">{controls}</div>
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
            {canReset && (
                <Button onClick={handleResetParams} disabled={isThisPageTrading} variant="secondary" className="w-full">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset to Default
                </Button>
            )}
        </div>
      </div>
    );
  };


  return (
    <div className="flex flex-col h-full">
    {!isConnected && (
        <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>API Disconnected</AlertTitle>
            <AlertDescription>
                Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> to load market data.
            </AlertDescription>
        </Alert>
    )}
     {isTradingActive && !isThisPageTrading && (
        <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
            <Bot className="h-4 w-4" />
            <AlertTitle>Another Trading Session is Active</AlertTitle>
            <AlertDescription>
                Manual trading is disabled to prioritize another active trading session. Check the <Link href="/live" className="font-bold underline">Live Bot</Link> or <Link href="/multi-signal" className="font-bold underline">Multi-Signal</Link> page.
            </AlertDescription>
        </Alert>
      )}
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 relative pb-4">
        <div className="flex flex-col" style={{ height: `${chartHeight}px` }}>
            <TradingChart 
                data={chartData} 
                symbol={symbol} 
                interval={interval} 
                tradeSignal={signal} 
                onIntervalChange={handleIntervalChange} />
        </div>
        <div
            onMouseDown={startChartResize}
            className="absolute bottom-0 left-0 w-full h-4 flex items-center justify-center cursor-ns-resize group"
        >
            <GripHorizontal className="h-5 w-5 text-muted-foreground/30 transition-colors group-hover:text-primary" />
        </div>
      </div>
      <div className="xl:col-span-2 space-y-6">
        <Card>
          <Collapsible open={isGeneratorOpen} onOpenChange={setGeneratorOpen}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><ClipboardCheck/> Manual Signal Generator</CardTitle>
                <CardDescription>Configure and generate a trade signal for manual execution.</CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isGeneratorOpen && "rotate-180")} />
                      <span className="sr-only">Toggle</span>
                  </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="base-asset">Base Asset</Label>
                      <Select onValueChange={handleBaseAssetChange} value={baseAsset} disabled={isThisPageTrading}>
                        <SelectTrigger id="base-asset"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {topAssets.map(asset => (
                            <SelectItem key={asset.ticker} value={asset.ticker}>{asset.ticker} - {asset.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quote-asset">Quote Asset</Label>
                      <Select onValueChange={handleQuoteAssetChange} value={quoteAsset} disabled={isThisPageTrading || availableQuotes.length === 0}>
                        <SelectTrigger id="quote-asset"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {availableQuotes.map(asset => (
                            <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interval">Interval</Label>
                      <Select onValueChange={handleIntervalChange} value={interval} disabled={isThisPageTrading}>
                        <SelectTrigger id="interval"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1m">1 Minute</SelectItem>
                          <SelectItem value="5m">5 Minutes</SelectItem>
                          <SelectItem value="15m">15 Minutes</SelectItem>
                          <SelectItem value="1h">1 Hour</SelectItem>
                          <SelectItem value="4h">4 Hours</SelectItem>
                          <SelectItem value="1d">1 Day</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="strategy">Strategy</Label>
                      <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={isThisPageTrading}>
                        <SelectTrigger id="strategy"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (Candles Only)</SelectItem>
                          {strategyMetadatas.map(strategy => (
                            <SelectItem key={strategy.id} value={strategy.id}>{strategy.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                </div>

                 <Collapsible open={isParamsOpen} onOpenChange={setParamsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <BrainCircuit className="mr-2 h-4 w-4" />
                      <span>Strategy Parameters</span>
                      <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", isParamsOpen && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 border rounded-md bg-muted/50 space-y-4">
                    {renderParameterControls()}
                  </CollapsibleContent>
                </Collapsible>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="initial-capital">Capital ($)</Label>
                        <Input 
                            id="initial-capital" 
                            type="number" 
                            value={initialCapital}
                            onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)}
                            placeholder="100"
                            disabled={isThisPageTrading}
                        />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="leverage">Leverage (x)</Label>
                      <Input
                        id="leverage"
                        type="number"
                        min="1"
                        value={leverage}
                        onChange={(e) => setLeverage(parseInt(e.target.value, 10) || 1)}
                        placeholder="10"
                        disabled={isThisPageTrading}
                      />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fee">Fee (%)</Label>
                        <Input 
                            id="fee" 
                            type="number" 
                            value={fee}
                            onChange={(e) => setFee(parseFloat(e.target.value) || 0)}
                            placeholder="0.04"
                            disabled={isThisPageTrading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="take-profit">Take Profit (%)</Label>
                        <Input 
                            id="take-profit" 
                            type="number" 
                            value={takeProfit}
                            onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                            placeholder="2"
                            disabled={isThisPageTrading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="stop-loss">Stop Loss (%)</Label>
                        <Input 
                            id="stop-loss" 
                            type="number" 
                            value={stopLoss}
                            onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                            placeholder="1"
                            disabled={isThisPageTrading}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                  <Label>AI-Powered Analysis</Label>
                  <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                    <Switch id="ai-prediction" checked={useAIPrediction} onCheckedChange={setUseAIPrediction} disabled={isThisPageTrading} />
                    <div className="flex flex-col">
                        <Label htmlFor="ai-prediction">Enable AI Validation</Label>
                        <p className="text-xs text-muted-foreground">Let an AI validate the strategy's signal before providing a recommendation.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                    className="w-full"
                    onClick={
                        isAnalyzing ? handleCancelAnalysis :
                        hasActiveSignal ? handleResetSignal : 
                        handleRunAnalysis
                    }
                    disabled={!isConnected || (isTradingActive && !isThisPageTrading) || (!isAnalyzing && !hasActiveSignal && selectedStrategy === 'none')}
                    variant={isAnalyzing || hasActiveSignal ? "destructive" : "default"}
                >
                    {isAnalyzing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Cancel Analysis
                        </>
                    ) : hasActiveSignal ? (
                        <>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset Signal
                        </>
                    ) : (
                        <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Analyze for Signal
                        </>
                    )}
                </Button>
              </CardFooter>
            </CollapsibleContent>
          </Collapsible>
        </Card>
        
        <Card>
          <Collapsible open={isIntelOpen} onOpenChange={setIntelOpen}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Newspaper/> Asset Intelligence</CardTitle>
                  <CardDescription>Contextual data and sentiment for the selected asset.</CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isIntelOpen && "rotate-180")} />
                    <span className="sr-only">Toggle</span>
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                  <CardContent>
                      {isFetchingDetails ? (
                          <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                  <Skeleton className="h-10 w-10 rounded-full" />
                                  <div className="flex-1 space-y-2">
                                      <Skeleton className="h-4 w-24" />
                                      <Skeleton className="h-3 w-16" />
                                  </div>
                              </div>
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-full" />
                              <Separator />
                              <div className="space-y-2">
                                <Skeleton className="h-3 w-1/3" />
                                <div className="flex justify-between"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-1/4" /></div>
                                <div className="flex justify-between"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-1/4" /></div>
                              </div>
                          </div>
                      ) : coinDetails ? (
                          <div className="space-y-4">
                              <div className="flex items-start gap-4">
                                  <Avatar>
                                      <AvatarImage src={coinDetails.image} alt={coinDetails.name} data-ai-hint="crypto icon" />
                                      <AvatarFallback>{coinDetails.symbol.toUpperCase().slice(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                      <h3 className="font-semibold">{coinDetails.name} ({coinDetails.symbol.toUpperCase()})</h3>
                                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                          {coinDetails.marketCapRank && <span className="flex items-center gap-1"><Crown className="h-3 w-3 text-yellow-500" /> Rank #{coinDetails.marketCapRank}</span>}
                                          {coinDetails.publicInterestScore > 0 && <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-orange-500" /> Score {coinDetails.publicInterestScore.toFixed(2)}</span>}
                                      </div>
                                  </div>
                                  <div className="text-right">
                                    <Label className="text-xs text-muted-foreground">Market Cap</Label>
                                    <p className="font-semibold">${formatLargeNumber(coinDetails.marketCap)}</p>
                                  </div>
                              </div>
                              
                              <Separator />

                              <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">24h Performance</Label>
                                  <div className="flex justify-between items-center text-sm">
                                      <span className="flex items-center gap-1 text-muted-foreground">
                                          {coinDetails.priceChange24h >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                                          Price Change
                                      </span>
                                      <span className={cn("font-semibold", coinDetails.priceChange24h >= 0 ? "text-green-500" : "text-red-500")}>
                                          {coinDetails.priceChange24h.toFixed(2)}%
                                      </span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                      <span className="flex items-center gap-1 text-muted-foreground"><DollarSign className="h-4 w-4" /> Volume</span>
                                      <span className="font-semibold">${formatLargeNumber(coinDetails.volume24h)}</span>
                                  </div>
                              </div>

                              <Separator />

                              <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Lifetime Performance</Label>
                                  <div className="flex justify-between items-center text-sm">
                                      <span className="flex items-center gap-1 text-muted-foreground"><ArrowUpToLine className="h-4 w-4" /> All-Time High</span>
                                      <div className="text-right">
                                        <p className="font-semibold">${formatPrice(coinDetails.ath)}</p>
                                        <p className="text-xs text-muted-foreground">{coinDetails.athDate}</p>
                                      </div>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                      <span className="flex items-center gap-1 text-muted-foreground"><ArrowDownToLine className="h-4 w-4" /> All-Time Low</span>
                                      <div className="text-right">
                                        <p className="font-semibold">${formatPrice(coinDetails.atl)}</p>
                                        <p className="text-xs text-muted-foreground">{coinDetails.atlDate}</p>
                                      </div>
                                  </div>
                              </div>
                              
                              <Separator />
                              
                              <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Token Supply</Label>
                                  <div className="flex justify-between items-center text-sm">
                                      <span className="flex items-center gap-1 text-muted-foreground"><Repeat className="h-4 w-4" /> Circulating</span>
                                      <span className="font-semibold">{formatLargeNumber(coinDetails.circulatingSupply, 2)}</span>
                                  </div>
                                  {coinDetails.totalSupply && (
                                     <div className="flex justify-between items-center text-sm">
                                        <span className="flex items-center gap-1 text-muted-foreground"><Repeat className="h-4 w-4" /> Total</span>
                                        <span className="font-semibold">{formatLargeNumber(coinDetails.totalSupply, 2)}</span>
                                    </div>
                                  )}
                              </div>

                              {coinDetails.sentimentUp > 0 && <Separator />}
                              
                              {coinDetails.sentimentUp > 0 && (
                                <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Smile className="h-3 w-3"/> Community Sentiment</Label>
                                    <div className="w-full bg-destructive/20 rounded-full h-2.5">
                                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${coinDetails.sentimentUp}%` }}></div>
                                    </div>
                                    <p className="text-right text-xs mt-1 font-semibold">{coinDetails.sentimentUp.toFixed(1)}% Up</p>
                                </div>
                              )}
                              <div>
                                <Label className="text-xs text-muted-foreground">Description</Label>
                                <p className="text-sm text-foreground/90 line-clamp-3">
                                  {coinDetails.description || "No description available."}
                                </p>
                              </div>
                              <Separator />
                              <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                                      <Thermometer className="h-3 w-3"/> Overall Market Sentiment
                                  </Label>
                                  {isFetchingFng ? (
                                      <div className="space-y-2">
                                          <Skeleton className="h-4 w-full" />
                                          <Skeleton className="h-2 w-full" />
                                      </div>
                                  ) : fearAndGreed ? (
                                      <div>
                                          <div className="flex justify-between items-center text-sm mb-1">
                                              <span className="font-medium">Fear & Greed Index</span>
                                              <span className="font-semibold">{fearAndGreed.valueClassification} ({fearAndGreed.value})</span>
                                          </div>
                                          <Progress value={fearAndGreed.value} className="h-2" indicatorClassName={getFngColor(fearAndGreed.value)} />
                                      </div>
                                  ) : (
                                      <p className="text-xs text-muted-foreground">Could not load Fear & Greed Index.</p>
                                  )}
                              </div>
                          </div>
                      ) : (
                          <div className="flex items-center justify-center h-48 text-muted-foreground text-center">
                              <p>Asset intelligence from CoinGecko is unavailable for {baseAsset}.</p>
                          </div>
                      )}
                  </CardContent>
              </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card>
          <Collapsible open={isSignalOpen} onOpenChange={setSignalOpen}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Trade Signal</CardTitle>
                <CardDescription>
                    {signal ? `Signal for ${symbol} generated at ${signal.timestamp.toLocaleTimeString()}` : "Signals will appear here after analysis."}
                </CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isSignalOpen && "rotate-180")} />
                      <span className="sr-only">Toggle</span>
                  </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="min-h-[240px]">
                  {isAnalyzing ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          <span>Searching for a trade setup...</span>
                      </div>
                  ) : signal ? (
                      <div className="space-y-4">
                          <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Recommended Action</span>
                              <Badge variant={signal.action === 'UP' ? 'default' : 'destructive'} className="text-base px-4 py-1">
                                  {signal.action === 'UP' ? 'BUY / LONG' : 'SELL / SHORT'}
                              </Badge>
                          </div>
                          <Separator/>
                          <div className="grid gap-2 text-sm">
                              <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Entry Price (approx.)</span>
                                  <span className="font-mono">${formatPrice(signal.entryPrice)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Stop Loss</span>
                                  <span className="font-mono text-red-500">${formatPrice(signal.stopLoss)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Take Profit</span>
                                  <span className="font-mono text-green-500">${formatPrice(signal.takeProfit)}</span>
                              </div>
                          </div>
                          <Separator/>
                          <div className="grid gap-2 text-sm">
                              <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Est. Position Value</span>
                                  <span className="font-mono">${positionValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Est. Total Fee</span>
                                  <span className="font-mono">${totalFee.toFixed(4)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Net PNL at TP</span>
                                  <span className="font-mono font-semibold text-green-500">${netPnl.toFixed(4)}</span>
                              </div>
                          </div>
                          
                          <Separator />
                          <div className="space-y-2">
                              <h4 className="text-sm font-medium">{useAIPrediction ? "AI Analysis" : "Signal Rationale"}</h4>
                              {useAIPrediction && (
                                  <div className="flex justify-between items-center text-sm">
                                      <span className="text-muted-foreground">Confidence</span>
                                      <span className="font-mono font-semibold">{(signal.confidence * 100).toFixed(1)}%</span>
                                  </div>
                              )}
                              <p className="text-xs text-muted-foreground pt-1">{signal.reasoning}</p>
                          </div>
                      </div>
                  ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                          <p>Click "Analyze for Signal" to get a recommendation.</p>
                      </div>
                  )}
              </CardContent>
               {signal && !isAnalyzing && (
                    <CardFooter className="flex-col items-stretch gap-2 pt-6 border-t">
                        <Button
                            onClick={() => handleExecuteTrade(false)}
                            disabled={isExecuting || activeProfile?.permissions !== 'FuturesTrading'}
                            className={cn(signal.action === 'UP' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700')}
                            title={activeProfile?.permissions !== 'FuturesTrading' ? 'A key with Futures Trading permissions is required.' : `Execute ${signal.action} on Binance`}
                        >
                            {isExecuting ? <Loader2 className="animate-spin"/> : <Send/>}
                            Execute Trade (Binance)
                        </Button>
                        <Button
                            onClick={() => handleExecuteTrade(true)}
                            disabled={isExecuting}
                            variant="secondary"
                        >
                            <Eye />
                            Simulate on Chart
                        </Button>
                        <Separator />
                        <Button
                            onClick={handleResetSignal}
                            variant="ghost"
                            size="sm"
                            disabled={isExecuting}
                        >
                            <XCircle/>
                            Dismiss Signal
                        </Button>
                    </CardFooter>
                )}
            </CollapsibleContent>
          </Collapsible>
        </Card>
        
        <Card>
          <Collapsible open={isLogsOpen} onOpenChange={setLogsOpen}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Activity/> Analysis Logs</CardTitle>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isLogsOpen && "rotate-180")} />
                        <span className="sr-only">Toggle</span>
                    </Button>
                </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                  <div className="bg-muted/50 p-3 rounded-md h-48 overflow-y-auto">
                      {logs.length > 0 ? (
                          <pre className="text-xs whitespace-pre-wrap font-mono">
                              {logs.join('\n')}
                          </pre>
                      ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                              <p>Logs from the analysis will appear here.</p>
                          </div>
                      )}
                  </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

      </div>
    </div>
    </div>
  )
}
