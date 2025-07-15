
"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
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
import { Terminal, Bot, Play, StopCircle, Loader2, BrainCircuit, Activity, ChevronDown, RotateCcw, GripHorizontal, ShieldCheck, TestTube, TrendingUp, TrendingDown, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { topBases, pairsByBase, assetInfo } from "@/lib/assets"
import { strategyMetadatas, getStrategyById } from "@/lib/strategies"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DisciplineSettings } from "@/components/trading-discipline/DisciplineSettings"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { LiveBotConfig } from "@/lib/types"
import { LiveTradingBotCard } from "@/components/live-trading-bot-card"

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
import { defaultStochasticCrossoverParams } from "@/lib/strategies/stochastic-crossover"
import { defaultSupertrendParams } from "@/lib/strategies/supertrend"
import { defaultVolumeDeltaParams } from "@/lib/strategies/volume-profile-delta"
import { defaultVwapCrossParams } from "@/lib/strategies/vwap-cross"
import { defaultWilliamsRParams } from "@/lib/strategies/williams-percent-r"
import { defaultLiquidityGrabParams } from "@/lib/strategies/liquidity-grab"
import { defaultLiquidityOrderFlowParams } from "@/lib/strategies/liquidity-order-flow"

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
    'stochastic-crossover': defaultStochasticCrossoverParams,
    'supertrend': defaultSupertrendParams,
    'volume-delta': defaultVolumeDeltaParams,
    'vwap-cross': defaultVwapCrossParams,
    'williams-r': defaultWilliamsRParams,
    'liquidity-grab': defaultLiquidityGrabParams,
    'liquidity-order-flow': defaultLiquidityOrderFlowParams,
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

  const { isRunning, bots, config: runningConfig } = liveBotState;
  
  const [selectedAssets, setSelectedAssets] = usePersistentState<string[]>('live-assets', ["BTCUSDT", "ETHUSDT"]);
  const [selectedStrategy, setSelectedStrategy] = usePersistentState<string>('live-strategy', "peak-formation-fib");
  const [interval, setInterval] = usePersistentState<string>('live-interval', "1m");
  const [initialCapital, setInitialCapital] = usePersistentState<number>('live-initial-capital', 100);
  const [leverage, setLeverage] = usePersistentState<number>('live-leverage', 10);
  const [takeProfit, setTakeProfit] = usePersistentState<number>('live-tp', 5);
  const [stopLoss, setStopLoss] = usePersistentState<number>('live-sl', 2);
  const [useAIPrediction, setUseAIPrediction] = usePersistentState<boolean>('live-ai-prediction', false);
  const [isConfigOpen, setConfigOpen] = usePersistentState<boolean>('live-config-open', true);
  const [isParamsOpen, setParamsOpen] = usePersistentState<boolean>('live-params-open', false);
  const [isDisciplineOpen, setDisciplineOpen] = usePersistentState<boolean>('live-discipline-open', false);

  const handleAssetToggle = (asset: string) => {
    setSelectedAssets(prev => 
        prev.includes(asset) ? prev.filter(a => a !== asset) : [...prev, asset]
    );
  };
  
  const handleParamChange = (strategyId: string, paramName: string, value: any) => {
    setStrategyParams(prev => ({
        ...prev,
        [strategyId]: { ...prev[strategyId], [paramName]: value }
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

  const handleBotToggle = async () => {
    if (isRunning) {
        stopLiveBot();
    } else {
        if (selectedAssets.length === 0) {
            toast({ title: "No Assets Selected", description: "Please select at least one asset to run.", variant: "destructive"});
            return;
        }
        if (selectedStrategy === 'none') {
            toast({ title: "No Strategy Selected", description: "Please select a strategy to run the live bot.", variant: "destructive"});
            return;
        }
        if (!isConnected) {
            toast({ title: "Cannot start bot", description: "Please connect to the API first.", variant: "destructive"});
            return;
        }
        
        const config: LiveBotConfig = {
            assets: selectedAssets,
            interval,
            strategy: selectedStrategy,
            strategyParams: strategyParams[selectedStrategy],
            initialCapital,
            leverage,
            takeProfit,
            stopLoss,
            useAIPrediction,
        }

        startLiveBot(config);
    }
  }
  
  const monitoredAssets = isRunning && runningConfig ? runningConfig.assets : [];

  return (
    <div className="space-y-6">
      <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Multi-Asset Live Trading</h1>
          <p className="text-muted-foreground mt-2">
              Deploy and manage multiple trading bots concurrently from a single dashboard.
          </p>
      </div>

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
        <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
            <Bot className="h-4 w-4" />
            <AlertTitle>Another Trading Session is Active</AlertTitle>
            <AlertDescription>
                Live Trading is disabled to prioritize another active trading session. Check other pages.
            </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <Card className="lg:col-span-1">
          <Collapsible open={isConfigOpen} onOpenChange={setConfigOpen}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Master Configuration</CardTitle>
                <CardDescription>Settings apply to all selected bots.</CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isConfigOpen && "rotate-180")} />
                  </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Assets to Trade</Label>
                    <ScrollArea className="h-60 w-full rounded-md border p-4">
                        <div className="space-y-4">
                            {topBases.map((base) => {
                                const quotes = pairsByBase[base] || [];
                                if (quotes.length === 0) return null;
                                return (
                                    <div key={base}>
                                        <h4 className="font-medium text-sm mb-2">{base} - {assetInfo[base] || ''}</h4>
                                        <div className="grid grid-cols-3 gap-x-4 gap-y-2 pl-2">
                                            {quotes.map(quote => {
                                                const symbol = `${base}${quote}`;
                                                return (
                                                    <div key={symbol} className="flex items-center space-x-2">
                                                        <Checkbox id={symbol} checked={selectedAssets.includes(symbol)} onCheckedChange={() => handleAssetToggle(symbol)} disabled={isRunning}/>
                                                        <Label htmlFor={symbol} className="font-normal text-muted-foreground">{quote}</Label>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Select onValueChange={setSelectedStrategy} value={selectedStrategy} disabled={isRunning}>
                    <SelectTrigger id="strategy"><SelectValue /></SelectTrigger>
                    <SelectContent>{strategyMetadatas.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Interval</Label>
                  <Select onValueChange={setInterval} value={interval} disabled={isRunning}>
                    <SelectTrigger id="interval"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">1m</SelectItem><SelectItem value="5m">5m</SelectItem><SelectItem value="15m">15m</SelectItem><SelectItem value="1h">1h</SelectItem><SelectItem value="4h">4h</SelectItem><SelectItem value="1d">1d</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Collapsible open={isParamsOpen} onOpenChange={setParamsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full"><BrainCircuit/>Strategy Parameters<ChevronDown className={cn("ml-auto h-4 w-4", isParamsOpen && "rotate-180")} /></Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 border rounded-md bg-muted/50 space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        {(Object.keys(strategyParams[selectedStrategy] || {}).filter(k => k !== 'discipline' && k !== 'reverse')).map(key => (
                           <div key={key} className="space-y-2">
                            <Label htmlFor={key} className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                            <Input id={key} type="number" value={strategyParams[selectedStrategy][key]} onChange={e => handleParamChange(selectedStrategy, key, e.target.value)} disabled={isRunning}/>
                           </div>
                        ))}
                     </div>
                     <div className="flex items-center space-x-2 pt-2"><Switch id="reverse-logic" checked={strategyParams[selectedStrategy]?.reverse || false} onCheckedChange={(c) => handleParamChange(selectedStrategy, 'reverse', c)} disabled={isRunning}/><Label htmlFor="reverse-logic">Reverse Logic</Label></div>
                     {DEFAULT_PARAMS_MAP[selectedStrategy] && <Button onClick={handleResetParams} disabled={isRunning} variant="secondary" className="w-full"><RotateCcw/>Reset to Default</Button>}
                  </CollapsibleContent>
                </Collapsible>
                 
                <DisciplineSettings params={strategyParams[selectedStrategy]?.discipline} onParamChange={(key, value) => handleParamChange(selectedStrategy, 'discipline', {...strategyParams[selectedStrategy].discipline, [key]: value})} isCollapsed={isDisciplineOpen} onCollapseChange={setDisciplineOpen} isDisabled={isRunning} />

                <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="capital">Capital/Bot ($)</Label><Input id="capital" type="number" value={initialCapital} onChange={e => setInitialCapital(parseFloat(e.target.value))} disabled={isRunning}/></div>
                  <div className="space-y-2"><Label htmlFor="leverage">Leverage</Label><Input id="leverage" type="number" value={leverage} onChange={e => setLeverage(parseInt(e.target.value))} disabled={isRunning}/></div>
                  <div className="space-y-2"><Label htmlFor="tp">Take Profit (%)</Label><Input id="tp" type="number" value={takeProfit} onChange={e => setTakeProfit(parseFloat(e.target.value))} disabled={isRunning}/></div>
                  <div className="space-y-2"><Label htmlFor="sl">Stop Loss (%)</Label><Input id="sl" type="number" value={stopLoss} onChange={e => setStopLoss(parseFloat(e.target.value))} disabled={isRunning}/></div>
                </div>

                <div className="flex items-center space-x-2 pt-2"><Switch id="ai-prediction" checked={useAIPrediction} onCheckedChange={setUseAIPrediction} disabled={isRunning}/><Label htmlFor="ai-prediction">Enable AI Validation</Label></div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleBotToggle} disabled={!isConnected || (isTradingActive && !isRunning)} variant={isRunning ? "destructive" : "default"}>
                  {isRunning ? <StopCircle /> : <Play />}
                  {isRunning ? "Stop All Bots" : "Start Trading"}
                </Button>
              </CardFooter>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <div className="lg:col-span-3">
          <Card>
              <CardHeader>
                  <CardTitle>Live Bot Dashboard</CardTitle>
                  <CardDescription>
                      {isRunning ? `Monitoring ${monitoredAssets.length} assets...` : "Bots are idle. Start trading to see live data."}
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  {isRunning ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
                          {monitoredAssets.map(asset => (
                              <LiveTradingBotCard key={asset} asset={asset} botState={bots[asset]} />
                          ))}
                      </div>
                  ) : (
                      <div className="flex items-center justify-center h-64 text-muted-foreground border border-dashed rounded-md">
                          <p>The bot dashboard is currently inactive.</p>
                      </div>
                  )}
              </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
