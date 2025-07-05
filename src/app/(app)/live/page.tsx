
"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { TradingChart } from "@/components/trading-chart"
import { getHistoricalKlines } from "@/lib/binance-service"
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
import { Terminal, Bot, Play, StopCircle, Loader2, BrainCircuit, Activity, ChevronDown, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { addDays } from "date-fns"
import type { HistoricalData, TradeSignal } from "@/lib/types"
import type { PredictMarketOutput } from "@/ai/flows/predict-market-flow"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { topAssets, getAvailableQuotesForBase } from "@/lib/assets"
import { strategies, getStrategyById } from "@/lib/strategies"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

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

export default function LiveTradingPage() {
  const { toast } = useToast()
  const { isConnected } = useApi();
  const { 
    liveBotState, 
    startLiveBot, 
    stopLiveBot,
    isTradingActive,
    strategyParams,
    setStrategyParams,
  } = useBot();

  const { isRunning, logs, prediction, isPredicting, chartData: botChartData } = liveBotState;
  
  const [isClient, setIsClient] = useState(false)
  
  // Local state for configuration UI
  const [baseAsset, setBaseAsset] = useState<string>("BTC");
  const [quoteAsset, setQuoteAsset] = useState<string>("USDT");
  const [availableQuotes, setAvailableQuotes] = useState<string[]>([]);
  const symbol = useMemo(() => `${baseAsset}${quoteAsset}`, [baseAsset, quoteAsset]);

  const [selectedStrategy, setSelectedStrategy] = useState<string>(strategies[0].id);
  const [interval, setInterval] = useState<string>("1m");
  const [initialCapital, setInitialCapital] = useState<number>(100);
  const [leverage, setLeverage] = useState<number>(10);
  const [takeProfit, setTakeProfit] = useState<number>(5);
  const [stopLoss, setStopLoss] = useState<number>(2);
  const [fee, setFee] = useState<number>(0.04);
  const [marginType, setMarginType] = useState<string>("isolated");
  const [useAIPrediction, setUseAIPrediction] = useState(false);

  // Local state for chart data, separate from the bot's data
  const [chartData, setChartData] = useState<HistoricalData[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);

  const [ipAddress, setIpAddress] = useState<string | null>(null);

  // Collapsible states
  const [isControlsOpen, setControlsOpen] = useState(true);
  const [isParamsOpen, setParamsOpen] = useState(false);
  const [isPredictionOpen, setPredictionOpen] = useState(true);
  const [isLogsOpen, setLogsOpen] = useState(true);
  
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
        toast({ title: "Parameters Reset", description: `The parameters for ${getStrategyById(selectedStrategy)?.name} have been reset to their default values.`});
    }
  }

  useEffect(() => {
    setIsClient(true)
    const fetchIp = async () => {
        try {
        const response = await fetch('/api/ip');
        const data = await response.json();
        setIpAddress(data.ip);
        } catch (error) {
        console.error("Could not fetch IP address:", error);
        setIpAddress("Unavailable");
        }
    };
    fetchIp();
  }, [])

  useEffect(() => {
    const quotes = getAvailableQuotesForBase(baseAsset);
    setAvailableQuotes(quotes);
    if (!quotes.includes(quoteAsset)) {
      setQuoteAsset(quotes[0] || '');
    }
  }, [baseAsset, quoteAsset]);

  // Sync local chart with bot's chart data when running
  useEffect(() => {
    if (isRunning) {
        setChartData(botChartData);
    }
  }, [isRunning, botChartData]);
  
  // Effect to fetch initial chart data when bot is NOT running
  useEffect(() => {
    if (!isClient || !isConnected || isRunning || !symbol) {
        if (!isRunning) setChartData([]);
        return;
    }

    const fetchData = async () => {
        setIsFetchingData(true);
        setChartData([]);
        toast({ title: "Fetching Market Data...", description: `Loading ${interval} data for ${symbol}.`});
        try {
            const from = addDays(new Date(), -1).getTime();
            const to = new Date().getTime();
            const klines = await getHistoricalKlines(symbol, interval, from, to);
            setChartData(klines);
            toast({ title: "Data Loaded", description: `Market data for ${symbol} is ready.` });
        } catch (error: any) {
            console.error("Failed to fetch historical data:", error);
            toast({
                title: "Failed to Load Data",
                description: error.message || "Could not retrieve historical data from Binance.",
                variant: "destructive"
            });
            setChartData([]);
        } finally {
            setIsFetchingData(false);
        }
    };

    fetchData();
  }, [symbol, interval, isConnected, isClient, toast, isRunning]);

  const handleBaseAssetChange = (newBase: string) => {
    setBaseAsset(newBase);
    if (!isRunning) {
      setChartData([]);
    }
  };

  const handleQuoteAssetChange = (newQuote: string) => {
    setQuoteAsset(newQuote);
    if (!isRunning) {
      setChartData([]);
    }
  };

  const handleIntervalChange = useCallback((newInterval: string) => {
    setInterval(newInterval);
    if (!isRunning) {
        setChartData([]);
    }
  }, [isRunning]);
  
  const handleBotToggle = async () => {
    if (isRunning) {
        stopLiveBot();
    } else {
        if (!isConnected) {
            toast({ title: "Cannot start bot", description: "Please connect to the API first.", variant: "destructive"});
            return;
        }
        startLiveBot({
            symbol,
            interval,
            strategy: selectedStrategy,
            strategyParams: strategyParams[selectedStrategy],
            initialCapital,
            leverage,
            takeProfit,
            stopLoss,
            marginType,
            useAIPrediction,
            fee
        });
    }
  }

  const tradeSignalForChart = useMemo<TradeSignal | null>(() => {
    const { isRunning, prediction, chartData: botChartData, config } = liveBotState;

    if (!isRunning || !prediction || prediction.prediction === 'NEUTRAL' || !config) {
      return null;
    }
    
    const lastCandle = botChartData[botChartData.length - 1];
    if (!lastCandle) return null;

    const entryPrice = lastCandle.close;

    const slPercent = config.stopLoss;
    const tpPercent = config.takeProfit;

    const stopLossPrice = prediction.prediction === 'UP' 
      ? entryPrice * (1 - slPercent / 100)
      : entryPrice * (1 + slPercent / 100);
      
    const takeProfitPrice = prediction.prediction === 'UP'
      ? entryPrice * (1 + tpPercent / 100)
      : entryPrice * (1 - tpPercent / 100);

    return {
      action: prediction.prediction,
      entryPrice: entryPrice,
      stopLoss: stopLossPrice,
      takeProfit: takeProfitPrice,
      confidence: prediction.confidence,
      reasoning: `Live AI Prediction: ${prediction.reasoning}`,
      timestamp: new Date(),
      strategy: config.strategy,
      asset: config.symbol,
    };
}, [liveBotState]);


  const anyLoading = isFetchingData;
  const getPredictionBadgeVariant = (pred: string) => {
    switch (pred) {
        case 'UP': return 'default';
        case 'DOWN': return 'destructive';
        default: return 'secondary';
    }
  }

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
          disabled={isRunning}
        />
      </div>
    ));

    const canReset = !!DEFAULT_PARAMS_MAP[selectedStrategy];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">{controls}</div>
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
            {canReset && (
                <Button onClick={handleResetParams} disabled={isRunning} variant="secondary" className="w-full">
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
                Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> to enable live trading features.
            </AlertDescription>
        </Alert>
    )}
     {isTradingActive && !isRunning && (
        <Alert variant="default" className="mb-4 bg-primary/10 border-primary/20 text-primary">
            <Bot className="h-4 w-4" />
            <AlertTitle>Another Trading Session is Active</AlertTitle>
            <AlertDescription>
                Live Trading is disabled to prioritize another active trading session. Check the <Link href="/manual" className="font-bold underline">Manual Trading</Link> or <Link href="/multi-signal" className="font-bold underline">Multi-Signal</Link> page.
            </AlertDescription>
        </Alert>
      )}
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 flex flex-col h-[600px]">
        <TradingChart data={isRunning ? botChartData : chartData} symbol={symbol} interval={interval} onIntervalChange={handleIntervalChange} tradeSignal={tradeSignalForChart} />
      </div>
      <div className="xl:col-span-2 space-y-6">
        <Card>
          <Collapsible open={isControlsOpen} onOpenChange={setControlsOpen}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Bot/> Live Bot Controls</CardTitle>
                <CardDescription>Configure and manage your live trading bot.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                      <span className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        isConnected ? "bg-green-500" : "bg-red-500"
                      )} />
                      <span>IP: {ipAddress || "Loading..."}</span>
                  </div>
                  <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronDown className={cn("h-4 w-4 transition-transform", isControlsOpen && "rotate-180")} />
                          <span className="sr-only">Toggle</span>
                      </Button>
                  </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="base-asset">Base</Label>
                      <Select onValueChange={handleBaseAssetChange} value={baseAsset} disabled={isRunning}>
                        <SelectTrigger id="base-asset"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {topAssets.map(asset => (
                            <SelectItem key={asset.ticker} value={asset.ticker}>{asset.ticker} - {asset.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quote-asset">Quote</Label>
                      <Select onValueChange={handleQuoteAssetChange} value={quoteAsset} disabled={isRunning || availableQuotes.length === 0}>
                        <SelectTrigger id="quote-asset"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {availableQuotes.map(asset => (
                            <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="strategy">Strategy</Label>
                      <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={isRunning}>
                        <SelectTrigger id="strategy">
                          <SelectValue placeholder="Select strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          {strategies.map(strategy => (
                            <SelectItem key={strategy.id} value={strategy.id}>{strategy.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interval">Interval</Label>
                      <Select onValueChange={handleIntervalChange} value={interval} disabled={isRunning}>
                        <SelectTrigger id="interval">
                          <SelectValue placeholder="Select interval" />
                        </SelectTrigger>
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
                </div>

                <Collapsible open={isParamsOpen} onOpenChange={setParamsOpen} className="space-y-2">
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
                        <Label htmlFor="initial-capital">Initial Capital ($)</Label>
                        <Input 
                            id="initial-capital" 
                            type="number" 
                            value={initialCapital}
                            onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)}
                            placeholder="100"
                            disabled={isRunning}
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
                        disabled={isRunning}
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
                            disabled={isRunning}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="take-profit">Take Profit (%)</Label>
                        <Input 
                            id="take-profit" 
                            type="number" 
                            value={takeProfit}
                            onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                            placeholder="5"
                            disabled={isRunning}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="stop-loss">Stop Loss (%)</Label>
                        <Input 
                            id="stop-loss" 
                            type="number" 
                            value={stopLoss}
                            onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                            placeholder="2"
                            disabled={isRunning}
                        />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="margin-type">Margin Type</Label>
                      <Select onValueChange={setMarginType} value={marginType} disabled={isRunning}>
                        <SelectTrigger id="margin-type">
                          <SelectValue placeholder="Select margin type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="isolated">Isolated</SelectItem>
                          <SelectItem value="cross">Cross</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                </div>
                <div className="space-y-2">
                  <Label>AI-Powered Analysis</Label>
                  <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
                    <Switch id="ai-prediction" checked={useAIPrediction} onCheckedChange={setUseAIPrediction} disabled={isRunning} />
                    <div className="flex flex-col">
                        <Label htmlFor="ai-prediction">Enable AI Prediction</Label>
                        <p className="text-xs text-muted-foreground">Let an AI validate each signal. Disabling this runs the classic strategy only.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleBotToggle} disabled={anyLoading || !isConnected || (isTradingActive && !isRunning)} variant={isRunning ? "destructive" : "default"}>
                  {isRunning ? <StopCircle /> : <Play />}
                  {isRunning ? "Stop Bot" : "Start Bot"}
                </Button>
              </CardFooter>
            </CollapsibleContent>
          </Collapsible>
        </Card>
        
        <Card>
          <Collapsible open={isPredictionOpen} onOpenChange={setPredictionOpen}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><BrainCircuit/> AI Market Prediction</CardTitle>
                <CardDescription>AI-powered validation of the strategy's signal.</CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isPredictionOpen && "rotate-180")} />
                      <span className="sr-only">Toggle</span>
                  </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                  {!useAIPrediction && isRunning ? (
                      <div className="flex items-center justify-center h-24 text-muted-foreground">
                          <p>AI Prediction is disabled for this session.</p>
                      </div>
                  ) : isPredicting ? (
                      <div className="flex items-center justify-center h-24 text-muted-foreground">
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          <span>Analyzing market data...</span>
                      </div>
                  ) : prediction ? (
                      <div className="space-y-3">
                          <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Prediction</span>
                              <Badge variant={getPredictionBadgeVariant(prediction.prediction)} className="text-lg px-4 py-1">
                                  {prediction.prediction}
                              </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Confidence</span>
                              <span className="font-semibold">{(prediction.confidence * 100).toFixed(1)}%</span>
                          </div>
                          <div>
                              <p className="text-sm text-muted-foreground mt-2">{prediction.reasoning}</p>
                          </div>
                      </div>
                  ) : (
                      <div className="flex items-center justify-center h-24 text-muted-foreground">
                          <p>{isRunning ? 'Waiting for next cycle...' : 'Start the bot to get predictions.'}</p>
                      </div>
                  )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card>
          <Collapsible open={isLogsOpen} onOpenChange={setLogsOpen}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Activity/> Bot Status & Logs</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                      Status: 
                      <span className={cn(
                          "font-semibold",
                          isRunning ? "text-green-500" : "text-red-500"
                      )}>
                          {isRunning ? "Running" : "Idle"}
                      </span>
                  </CardDescription>
                </div>
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
                              <p>Logs will appear here when the bot is running.</p>
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

    