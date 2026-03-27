/**
 * 🛡️ Sentinel Machine: Manual Pilot (The Pilot Interface)
 * Documentation: src/app/(app)/manual/README.md
 * Mission: High-precision manual trade entry and override controls.
 */
"use client"

import React, { useState, useEffect, memo, useCallback, useRef } from "react"
import Link from "next/link"
import { useBot } from "@/context/bot-context"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bot, Play, StopCircle, ChevronDown, PlusCircle, Trash2, Settings, BrainCircuit, RotateCcw, CheckCircle, Loader2, TrendingUp, TrendingDown, Activity, AlertTriangle, Layers, Eye, FileText , LayoutDashboard, X, GripHorizontal } from "lucide-react"
import { topAssets, getAvailableQuotesForBase, parseSymbolString } from "@/lib/assets"
import { VisualHudPanel } from "@/components/manual/visual-hud-panel"
import { EventDossierPanel } from "@/components/manual/event-dossier-panel"
import { AnomalyTicker } from "@/components/anomaly-ticker"
import { AssetSelector } from "@/components/ui/asset-selector"
import { strategyMetadatas, getStrategyById } from "@/lib/strategies"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn, formatPrice } from "@/lib/utils"
import { useApi } from "@/context/api-context"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { DraggableOverlay } from "@/components/order-flow/draggable-overlay"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { LiquidityHeatmap } from "@/components/live/LiquidityHeatmap"
import type { DisciplineParams, LiveBotConfig, LiveBotStateForAsset } from "@/lib/types"
import { DisciplineSettings } from "@/components/trading-discipline/DisciplineSettings"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// Default parameter maps for resetting
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
import { defaultRsiDivergenceParams } from "@/lib/strategies/rsi-divergence"
import { defaultSmaCrossoverParams } from "@/lib/strategies/sma-crossover"
import { defaultStochasticCrossoverParams } from "@/lib/strategies/stochastic-crossover"
import { defaultSupertrendParams } from "@/lib/strategies/supertrend"
import { defaultVolumeDeltaParams } from "@/lib/strategies/volume-delta"
import { defaultVwapCrossParams } from "@/lib/strategies/vwap-cross"
import { defaultWilliamsRParams } from "@/lib/strategies/williams-percent-r"
import { defaultLiquidityGrabParams } from "@/lib/strategies/liquidity-grab"
import { defaultLiquidityOrderFlowParams } from "@/lib/strategies/liquidity-order-flow"
import { defaultEmaCciMacdParams } from "@/lib/strategies/ema-cci-macd"
import { defaultCodeBasedConsensusParams } from "@/lib/strategies/code-based-consensus"
import { defaultMtfEngulfingParams } from "@/lib/strategies/mtf-engulfing"
import { defaultSmiMfiSupertrendParams } from "@/lib/strategies/smi-mfi-supertrend"
import { defaultAIHybridParams } from "@/lib/strategies/ai-hybrid"

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
    'rsi-divergence': defaultRsiDivergenceParams,
    'sma-crossover': defaultSmaCrossoverParams,
    'stochastic-crossover': defaultStochasticCrossoverParams,
    'supertrend': defaultSupertrendParams,
    'volume-delta': defaultVolumeDeltaParams,
    'vwap-cross': defaultVwapCrossParams,
    'williams-r': defaultWilliamsRParams,
    'liquidity-grab': defaultLiquidityGrabParams,
    'liquidity-order-flow': defaultLiquidityOrderFlowParams,
    'ema-cci-macd': defaultEmaCciMacdParams,
    'code-based-consensus': defaultCodeBasedConsensusParams,
    'mtf-engulfing': defaultMtfEngulfingParams,
    'smi-mfi-supertrend': defaultSmiMfiSupertrendParams,
    'ai-hybrid': defaultAIHybridParams,
}

type BotInstance = LiveBotConfig & {
    id: string;
};

const StrategyParamsCard = memo(({ bot, onParamChange, onDisciplineChange, onReset, isTradingActive }: { 
    bot: BotInstance, 
    onParamChange: (param: string, value: any) => void, 
    onDisciplineChange: (param: keyof DisciplineParams, value: any) => void,
    onReset: () => void, 
    isTradingActive: boolean 
}) => {
    const [isDisciplineOpen, setIsDisciplineOpen] = useState(false);
    const strategyInfo = getStrategyById(bot.strategy);
    if (!strategyInfo) return null;

    const params = bot.strategyParams || {};
    const filteredParams = Object.fromEntries(Object.entries(params).filter(([key]) => key !== 'discipline' && key !== 'reverse'));

    const hasTunableParams = Object.keys(filteredParams).length > 0;

    return (
        <Card className="bg-muted/50">
            <CardHeader className="p-4">
                <CardTitle className="text-sm">Parameters for {strategyInfo.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {isTradingActive ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        {Object.entries(filteredParams).map(([key, value]) => (
                             <div key={key} className="flex justify-between items-center">
                                <p className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</p>
                                <p className="font-mono">{String(value)}</p>
                            </div>
                        ))}
                    </div>
                ) : hasTunableParams ? (
                     <div className="grid grid-cols-2 gap-4">
                        {Object.entries(filteredParams).map(([key, value]) => (
                            <div key={key} className="space-y-1">
                                <Label htmlFor={`${bot.id}-${key}`} className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                                <Input
                                    id={`${bot.id}-${key}`}
                                    type="number"
                                    value={value as number || 0}
                                    onChange={e => onParamChange(key, e.target.value)}
                                    className="h-8"
                                    disabled={isTradingActive}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground p-4 text-center">This strategy has no tunable parameters.</p>
                )}
               
                <div className="flex items-center space-x-2 pt-2">
                    <Switch
                        id={`reverse-logic-${bot.id}`}
                        checked={params.reverse || false}
                        onCheckedChange={(checked) => onParamChange('reverse', checked)}
                        disabled={isTradingActive}
                    />
                    <div className="flex flex-col">
                        <Label htmlFor={`reverse-logic-${bot.id}`} className="cursor-pointer">Reverse Logic (Contrarian Mode)</Label>
                    </div>
                </div>

                <DisciplineSettings
                    params={params.discipline || defaultSmaCrossoverParams.discipline}
                    onParamChange={onDisciplineChange}
                    isDisabled={isTradingActive}
                />

                {DEFAULT_PARAMS_MAP[bot.strategy] && (
                    <Button onClick={onReset} variant="secondary" size="sm" className="w-full mt-4" disabled={isTradingActive}>
                        <RotateCcw className="mr-2 h-4 w-4"/> Reset to Default
                    </Button>
                )}
            </CardContent>
        </Card>
    )
});
StrategyParamsCard.displayName = 'StrategyParamsCard';

const StatusBadge = memo(({ status }: { status?: 'idle' | 'running' | 'analyzing' | 'position_open' | 'error' | 'cooldown' }) => {
    
    const statusInfo = {
        running: {
            color: 'bg-blue-600 hover:bg-blue-600',
            icon: Bot,
            text: 'Monitoring',
            tooltip: 'The bot is actively monitoring the market for a new trade signal.'
        },
        analyzing: {
            color: 'bg-purple-600 hover:bg-purple-600',
            icon: BrainCircuit,
            text: 'Analyzing',
            tooltip: 'The bot is performing its initial analysis to find a trade signal.'
        },
        position_open: {
            color: 'bg-green-600 hover:bg-green-600',
            icon: CheckCircle,
            text: 'Signal Found',
            tooltip: 'A valid trade signal has been found. Ready for manual execution.'
        },
        error: {
            color: '', // Uses destructive variant
            icon: Bot, // No icon for error, text is enough
            text: 'Error',
            tooltip: 'The bot encountered an error. Check logs on the Dashboard for details.'
        },
        cooldown: {
            color: '', // Uses destructive variant
            icon: Bot,
            text: 'Cooldown',
            tooltip: 'The bot is in a temporary timeout due to risk management rules (e.g., too many losses).'
        },
        idle: {
            color: '', // Uses secondary variant
            icon: Bot,
            text: 'Idle',
            tooltip: 'The bot is stopped and not monitoring the market.'
        }
    };
    
    const currentStatus = statusInfo[status || 'idle'];
    const Icon = currentStatus.icon;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge variant={status === 'error' || status === 'cooldown' ? 'destructive' : status === 'idle' ? 'secondary' : 'default'} className={cn(currentStatus.color)}>
                        <Icon className={cn("mr-1 h-3 w-3", (status === 'analyzing' || status === 'running') && "animate-pulse")} /> {currentStatus.text}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{currentStatus.tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});
StatusBadge.displayName = 'StatusBadge';

export default function ManualTradingPage() {
    const { toast } = useToast();
    const { isConnected } = useApi();
    const { 
        startBotInstance, 
        stopBotInstance, 
        liveBotState,
        botInstances,
        setBotInstances,
        addBotInstance: addBotContextInstance,
    } = useBot();
    
    const { bots: runningBots } = liveBotState;
    const [activeBotId, setActiveBotId] = useState<string | null>(null);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

    const addBotInstance = useCallback(() => {
        addBotContextInstance({}); 
    }, [addBotContextInstance]);

    useEffect(() => {
        if (botInstances.length === 0) {
            addBotInstance();
        } else if (!activeBotId && botInstances.length > 0) {
            setActiveBotId(botInstances[0].id);
        }
    }, [botInstances, addBotInstance, activeBotId]);

    const handleBotConfigChange = useCallback((id: string, field: any, value: any) => {
        setBotInstances(prev => prev.map(bot => {
            if (bot.id === id) {
                const updatedBot: any = { ...bot, [field]: value };
                if (field === 'strategy') {
                    updatedBot.strategyParams = DEFAULT_PARAMS_MAP[value as string] || {};
                }
                return updatedBot as LiveBotConfig & { id: string };
            }
            return bot;
        }));
    }, [setBotInstances]);
    
    const handleStrategyParamChange = useCallback((botId: string, param: string, value: any) => {
        setBotInstances((prev: any[]) => prev.map((bot: any) => {
            if (bot.id === botId) {
                const updatedParams = { ...bot.strategyParams };
                 if (typeof value === 'object' || typeof value === 'boolean') {
                   updatedParams[param] = value;
                } else {
                   const parsedValue = (value === '' || isNaN(value as any)) ? 0 : String(value).includes('.') ? parseFloat(value) : parseInt(value, 10);
                   updatedParams[param] = isNaN(parsedValue as any) ? 0 : parsedValue;
                }
               return { ...bot, strategyParams: updatedParams };
           }
            return bot;
        }));
    }, [setBotInstances]);
    
    const handleDisciplineParamChange = useCallback((botId: string, paramName: keyof DisciplineParams, value: any) => {
        handleStrategyParamChange(botId, 'discipline', {
            ...(botInstances.find(b => b.id === botId)?.strategyParams?.discipline || defaultSmaCrossoverParams.discipline),
            [paramName]: value
        });
    }, [botInstances, handleStrategyParamChange]);

    const handleResetParams = useCallback((botId: string) => {
        const bot = botInstances.find(b => b.id === botId);
        if (bot && DEFAULT_PARAMS_MAP[bot.strategy]) {
            setBotInstances(prev => prev.map(b => b.id === botId ? { ...b, strategyParams: DEFAULT_PARAMS_MAP[bot.strategy] } : b));
            toast({ title: "Parameters Reset" });
        }
    }, [botInstances, setBotInstances, toast]);

    const removeBot = useCallback((id: string) => {
        setBotInstances(prev => prev.filter(bot => bot.id !== id));
        if (activeBotId === id) setActiveBotId(null);
    }, [setBotInstances, activeBotId]);

    const handleToggleBot = useCallback((botId: string) => {
        const botConfig = botInstances.find(b => b.id === botId);
        if (!botConfig?.asset || !botConfig?.strategy) {
            toast({ title: "Incomplete Config", description: "Select asset and strategy first.", variant: "destructive" });
            return;
        }

        const isRunning = runningBots[botId]?.status === 'running' || runningBots[botId]?.status === 'analyzing' || runningBots[botId]?.status === 'position_open';
        
        if (isRunning) stopBotInstance(botId);
        else startBotInstance({ ...botConfig, isManual: true });
    }, [botInstances, runningBots, startBotInstance, stopBotInstance, toast]);

    const activeBot = botInstances.find(b => b.id === activeBotId);
    const activeBotLiveState = activeBotId ? runningBots[activeBotId] : undefined;
    const isTradingActive = !!activeBotLiveState && activeBotLiveState.status !== 'idle' && activeBotLiveState.status !== 'error';

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
            <div className="flex justify-between items-center mb-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Trading Command Terminal</h1>
                    <p className="text-muted-foreground text-sm mt-1">Beginner-Friendly Synthesis Engine (Master-Detail View)</p>
                </div>
                {!isConnected && (
                    <Alert variant="destructive" className="py-2 w-auto flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        <AlertTitle className="mb-0 text-sm">Offline: Connect API in settings.</AlertTitle>
                    </Alert>
                )}
            </div>
            
            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* LEFT SIDEBAR: WATCHLIST & ANOMALIES */}
                <div className="w-80 flex flex-col shrink-0 gap-4">
                    <Card className="flex flex-col shrink-0 border border-slate-800 bg-slate-950/40 max-h-[50%] overflow-hidden shadow-lg shadow-black/20">
                        <CardHeader className="py-4 border-b border-white/5 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold tracking-wider uppercase text-slate-300">Watchlist monitors</CardTitle>
                            <Button onClick={addBotInstance} size="icon" variant="ghost" className="h-6 w-6"><PlusCircle className="h-4 w-4 text-indigo-400"/></Button>
                        </CardHeader>
                        <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                            {botInstances.map(bot => {
                                const st = runningBots[bot.id]?.status || 'idle';
                                const isActive = activeBotId === bot.id;
                                const signal = runningBots[bot.id]?.activePosition;
                                
                                return (
                                    <div 
                                        key={bot.id} 
                                        onClick={() => setActiveBotId(bot.id)}
                                        className={`p-4 border-b border-white/5 cursor-pointer transition-colors ${isActive ? 'bg-indigo-950/30 border-l-2 border-l-indigo-500' : 'hover:bg-slate-900'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-sm">{bot.asset || "Select Asset"}</span>
                                            <StatusBadge status={st} />
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            {strategyMetadatas.find(s => s.id === bot.strategy)?.name || "No strategy"}
                                        </div>
                                        {signal && (
                                            <div className={`mt-2 px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 ${signal.action === 'UP' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                <Activity className="w-3 h-3" /> SIGNAL ACTIVE
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    <div className="flex-1 overflow-hidden flex flex-col pb-4">
                        <AnomalyTicker className="h-full flex-1 border-slate-800" />
                    </div>
                </div>

                {/* CENTER STAGE: COMMAND TERMINAL */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-12 pr-4">
                    {!activeBot ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center bg-slate-950/20 rounded-lg border border-dashed border-white/10">
                            <Activity className="w-12 h-12 mb-4 opacity-20" />
                            <h2 className="text-xl font-bold">No Asset Selected</h2>
                            <p className="mt-2 text-sm max-w-md">Select an asset from the Watchlist on the left to initialize the visual HUD and Formidable Hindsight engine.</p>
                        </div>
                    ) : (
                        <>
                            {/* ACTIVE BOT HEADER CONFIG */}
                            <Card className="shrink-0 border-indigo-500/20 bg-slate-950/40">
                                <CardHeader className="py-3 items-center flex flex-row justify-between border-b border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <LayoutDashboard className="text-indigo-400 w-5 h-5"/>
                                            <CardTitle className="text-lg">{activeBot.asset || 'New Monitor'}</CardTitle>
                                        </div>
                                        <StatusBadge status={activeBotLiveState?.status} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant={isTradingActive ? "destructive" : "default"} size="sm" onClick={() => handleToggleBot(activeBot.id)} disabled={!isConnected} className={isTradingActive ? "animate-pulse" : ""}>
                                            {isTradingActive ? <StopCircle className="mr-2 h-4 w-4"/> : <Play className="mr-2 h-4 w-4"/>}
                                            {isTradingActive ? 'Halt Engine' : 'Deploy Engine'}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => removeBot(activeBot.id)} disabled={isTradingActive} className="text-red-400 hover:bg-red-950/50 hover:text-red-300">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 bg-slate-900/40">
                                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                                        <div className="col-span-2">
                                            <Label className="text-xs mb-1 block">Strategy Core</Label>
                                            <Select value={activeBot.strategy} onValueChange={(val) => handleBotConfigChange(activeBot.id, 'strategy', val)} disabled={isTradingActive}>
                                                <SelectTrigger><SelectValue placeholder="Select Strategy" /></SelectTrigger>
                                                <SelectContent>{strategyMetadatas.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            {(() => {
                                                const parsed = parseSymbolString(activeBot.asset) || { base: activeBot.asset.replace('USDT', ''), quote: 'USDT' };
                                                const availableQuotes = getAvailableQuotesForBase(parsed.base) || ['USDT'];
                                                return (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Asset Pair</Label>
                                                        <AssetSelector baseAsset={parsed.base} quoteAsset={parsed.quote} onBaseChange={(newBase) => handleBotConfigChange(activeBot.id, 'asset', `${newBase}${parsed.quote}`)} onQuoteChange={(newQuote) => handleBotConfigChange(activeBot.id, 'asset', `${parsed.base}${newQuote}`)} disabled={isTradingActive} availableQuotes={availableQuotes} />
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div>
                                            <Label className="text-xs mb-1 block">Interval</Label>
                                            <Select value={activeBot.interval} onValueChange={(val) => handleBotConfigChange(activeBot.id, 'interval', val)} disabled={isTradingActive}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent><SelectItem value="1m">1m</SelectItem><SelectItem value="5m">5m</SelectItem><SelectItem value="15m">15m</SelectItem><SelectItem value="1h">1h</SelectItem><SelectItem value="4h">4h</SelectItem><SelectItem value="1d">1d</SelectItem></SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2">
                                            <Button variant="outline" size="sm" className="w-full flex justify-between group" onClick={() => setShowAdvancedSettings(true)}>
                                                <span>Advanced Settings</span> <Settings className="h-4 w-4 text-indigo-400 group-hover:rotate-90 transition-transform duration-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* UNIFIED HINDSIGHT PANELS (Macro + Micro + History) */}
                            <EventDossierPanel bot={activeBot} botState={activeBotLiveState} />
                            
                            {/* VISUAL HUD */}
                            <VisualHudPanel symbol={activeBot.asset || 'BTCUSDT'} />
                        </>
                    )}
                </div>
            </div>
            
                    {showAdvancedSettings && activeBot && (
                <DraggableOverlay 
                    id={`manual-bot-settings-${activeBot.id}`} 
                    title={`${activeBot.asset} Strategy Control`} 
                    onClose={() => setShowAdvancedSettings(false)}
                    defaultPosition={{ x: 800, y: 150 }}
                >
                    <StrategyParamsCard 
                        bot={activeBot} 
                        onParamChange={(p, v) => handleStrategyParamChange(activeBot.id, p, v)} 
                        onDisciplineChange={(p, v) => handleDisciplineParamChange(activeBot.id, p, v)} 
                        onReset={() => handleResetParams(activeBot.id)} 
                        isTradingActive={isTradingActive} 
                    />
                </DraggableOverlay>
            )}
        </div>
    );
}
