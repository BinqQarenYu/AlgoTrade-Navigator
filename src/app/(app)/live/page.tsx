

"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useBot } from "@/context/bot-context"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bot, Play, StopCircle, ChevronDown, PlusCircle, Trash2, Settings, BrainCircuit, RotateCcw, CheckCircle, Loader2 } from "lucide-react"
import { topAssets, pairsByBase, topBases, assetInfo } from "@/lib/assets"
import { strategyMetadatas, getStrategyById } from "@/lib/strategies"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useApi } from "@/context/api-context"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DisciplineParams, LiveBotConfig } from "@/lib/types"
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
import { defaultReversePffParams } from "@/lib/strategies/reverse-pff"
import { defaultRsiDivergenceParams } from "@/lib/strategies/rsi-divergence"
import { defaultStochasticCrossoverParams } from "@/lib/strategies/stochastic-crossover"
import { defaultSupertrendParams } from "@/lib/strategies/supertrend"
import { defaultVolumeDeltaParams } from "@/lib/strategies/volume-profile-delta"
import { defaultVwapCrossParams } from "@/lib/strategies/vwap-cross"
import { defaultWilliamsRParams } from "@/lib/strategies/williams-percent-r"
import { defaultLiquidityGrabParams } from "@/lib/strategies/liquidity-grab"
import { defaultLiquidityOrderFlowParams } from "@/lib/strategies/liquidity-order-flow"
import { defaultEmaCciMacdParams } from "@/lib/strategies/ema-cci-macd"
import { defaultCodeBasedConsensusParams } from "@/lib/strategies/code-based-consensus"
import { defaultMtfEngulfingParams } from "@/lib/strategies/mtf-engulfing"
import { defaultSmiMfiSupertrendParams } from "@/lib/strategies/smi-mfi-supertrend"

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
    'ema-cci-macd': defaultEmaCciMacdParams,
    'code-based-consensus': defaultCodeBasedConsensusParams,
    'mtf-engulfing': defaultMtfEngulfingParams,
    'smi-mfi-supertrend': defaultSmiMfiSupertrendParams,
}

type BotInstance = LiveBotConfig & {
    id: string;
};

const createNewBotInstance = (id: string): BotInstance => ({
    id,
    asset: '',
    capital: 100,
    leverage: 10,
    takeProfit: 1.5,
    stopLoss: 1,
    strategy: '',
    strategyParams: {},
});

const StrategyParamsCard = ({ bot, onParamChange, onDisciplineChange, onReset, isTradingActive }: { 
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
                {hasTunableParams ? (
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
                    params={params.discipline || defaultAwesomeOscillatorParams.discipline}
                    onParamChange={onDisciplineChange}
                    isCollapsed={isDisciplineOpen}
                    onCollapseChange={setIsDisciplineOpen}
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
}

const StatusBadge = ({ status }: { status?: 'idle' | 'running' | 'analyzing' | 'position_open' | 'error' | 'cooldown' }) => {
    switch (status) {
        case 'running': return <Badge variant="default" className="bg-green-600 hover:bg-green-600"><CheckCircle className="mr-1 h-3 w-3" /> Running</Badge>;
        case 'analyzing': return <Badge variant="secondary"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Analyzing</Badge>;
        case 'position_open': return <Badge variant="default" className="bg-blue-600 hover:bg-blue-600"><Bot className="mr-1 h-3 w-3" /> In Position</Badge>;
        case 'error': return <Badge variant="destructive">Error</Badge>;
        case 'cooldown': return <Badge variant="destructive">Cooldown</Badge>;
        default: return <Badge variant="secondary">Idle</Badge>;
    }
}

export default function LiveTradingPage() {
    const { toast } = useToast();
    const { isConnected, startBotInstance, stopBotInstance, liveBotState, setStrategyParams, activeProfile } = useBot();
    const { bots: runningBots } = liveBotState;
    const [botInstances, setBotInstances] = usePersistentState<BotInstance[]>('live-bot-instances', [createNewBotInstance('bot_1')]);
    const [openParams, setOpenParams] = useState<Record<string, boolean>>({});

    const addBotInstance = () => {
        const newId = `bot_${Date.now()}`;
        setBotInstances(prev => [...prev, createNewBotInstance(newId)]);
    };

    useEffect(() => {
        if (botInstances.length === 0) {
            addBotInstance(); // Ensure there's always at least one row
        }
    }, [botInstances]);


    const handleBotConfigChange = <K extends keyof BotInstance>(id: string, field: K, value: BotInstance[K]) => {
        setBotInstances(prev => prev.map(bot => {
            if (bot.id === id) {
                let updatedValue = value;
                if (field === 'takeProfit' || field === 'stopLoss' || field === 'capital' || field === 'leverage') {
                     updatedValue = (value === '' || isNaN(value as number)) ? 0 : value as BotInstance[K];
                }
                const updatedBot = { ...bot, [field]: updatedValue };
                if (field === 'strategy') {
                    updatedBot.strategyParams = DEFAULT_PARAMS_MAP[value as string] || {};
                }
                return updatedBot;
            }
            return bot;
        }));
    };
    
    const handleStrategyParamChange = (botId: string, param: string, value: any) => {
        setBotInstances(prev => prev.map(bot => {
            if (bot.id === botId) {
                const updatedParams = { ...bot.strategyParams };
                 if (typeof value === 'object') {
                   updatedParams[param] = value;
                } else if (typeof value === 'boolean') {
                   updatedParams[param] = value;
                } else {
                   const parsedValue = (value === '' || isNaN(value as number)) ? 0 : String(value).includes('.') ? parseFloat(value) : parseInt(value, 10);
                   updatedParams[param] = isNaN(parsedValue as number) ? 0 : parsedValue;
                }
               return { ...bot, strategyParams: updatedParams };
           }
            return bot;
        }));
    };
    
    const handleDisciplineParamChange = (botId: string, paramName: keyof DisciplineParams, value: any) => {
        handleStrategyParamChange(botId, 'discipline', {
            ...(botInstances.find(b => b.id === botId)?.strategyParams.discipline || defaultAwesomeOscillatorParams.discipline),
            [paramName]: value
        });
    };

    const handleResetParams = (botId: string) => {
        const bot = botInstances.find(b => b.id === botId);
        if (bot) {
            const defaultParams = DEFAULT_PARAMS_MAP[bot.strategy];
            if (defaultParams) {
                setBotInstances(prev => prev.map(b => b.id === botId ? { ...b, strategyParams: defaultParams } : b));
                toast({ title: "Parameters Reset", description: "Parameters have been reset to their default values." });
            }
        }
    }

    const removeBotInstance = (id: string) => {
        if (botInstances.length <= 1 && botInstances[0].id === id) {
            toast({ title: "Cannot Remove", description: "At least one bot configuration must remain.", variant: "destructive" });
            return;
        }
        setBotInstances(prev => prev.filter(bot => bot.id !== id));
    };

    const toggleParams = (id: string) => {
        setOpenParams(prev => ({ ...prev, [id]: !prev[id] }));
    }

    const handleToggleBot = (botId: string) => {
        const botConfig = botInstances.find(b => b.id === botId);
        if (!botConfig || !botConfig.asset || !botConfig.strategy) {
            toast({ title: "Incomplete Config", description: "Please select an asset and strategy for the bot.", variant: "destructive" });
            return;
        }

        if (activeProfile?.permissions !== 'FuturesTrading') {
            toast({ title: "Permission Denied", description: "The active API key must have 'FuturesTrading' permissions enabled to start a live bot.", variant: "destructive"});
            return;
        }

        if (runningBots[botId]?.status === 'running' || runningBots[botId]?.status === 'analyzing' || runningBots[botId]?.status === 'position_open') {
            stopBotInstance(botId);
        } else {
            startBotInstance(botConfig);
        }
    }

    return (
        <div className="space-y-6">
            <div className="text-left">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Live Trading Matrix</h1>
                <p className="text-muted-foreground mt-2">
                    Configure and deploy a portfolio of unique trading bots from a single dashboard.
                </p>
            </div>

            {isConnected ? (
                <Alert variant="default" className="border-green-500/50 bg-green-500/10 text-green-500">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>API CONNECTED</AlertTitle>
                    <AlertDescription>
                        You are connected to the Binance API. Live trading features are enabled.
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert variant="destructive">
                    <AlertDescription>
                        Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> to enable live trading features.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Bot Configuration Matrix</CardTitle>
                        <CardDescription>Add, remove, and configure your trading bots.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button onClick={addBotInstance} size="sm" variant="outline">
                            <PlusCircle className="mr-2 h-4 w-4"/> Add Bot
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Asset</TableHead>
                                    <TableHead>Capital ($)</TableHead>
                                    <TableHead>Leverage (x)</TableHead>
                                    <TableHead>TP (%)</TableHead>
                                    <TableHead>SL (%)</TableHead>
                                    <TableHead>Strategy</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {botInstances.map((bot, index) => {
                                    const isRunning = !!runningBots[bot.id] && runningBots[bot.id]?.status !== 'idle' && runningBots[bot.id]?.status !== 'error';
                                    const botStatus = runningBots[bot.id]?.status;

                                    return (
                                        <React.Fragment key={bot.id}>
                                            <TableRow className={cn(openParams[bot.id] && "bg-muted/50")}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell><StatusBadge status={botStatus}/></TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={bot.asset}
                                                        onValueChange={(val) => handleBotConfigChange(bot.id, 'asset', val)}
                                                        disabled={isRunning}
                                                    >
                                                        <SelectTrigger className="w-40"><SelectValue placeholder="Select Asset" /></SelectTrigger>
                                                        <SelectContent>
                                                            {topAssets.map(a => (<SelectItem key={a.ticker} value={`${a.ticker}USDT`}>{a.name}</SelectItem>))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={bot.capital}
                                                        onChange={(e) => handleBotConfigChange(bot.id, 'capital', e.target.value as any)}
                                                        className="w-28"
                                                        disabled={isRunning}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={bot.leverage}
                                                        onChange={(e) => handleBotConfigChange(bot.id, 'leverage', e.target.value as any)}
                                                        className="w-24"
                                                        disabled={isRunning}
                                                    />
                                                </TableCell>
                                                 <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={bot.takeProfit}
                                                        onChange={(e) => handleBotConfigChange(bot.id, 'takeProfit', e.target.value as any)}
                                                        className="w-24"
                                                        disabled={isRunning}
                                                    />
                                                </TableCell>
                                                 <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={bot.stopLoss}
                                                        onChange={(e) => handleBotConfigChange(bot.id, 'stopLoss', e.target.value as any)}
                                                        className="w-24"
                                                        disabled={isRunning}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={bot.strategy}
                                                        onValueChange={(val) => handleBotConfigChange(bot.id, 'strategy', val)}
                                                        disabled={isRunning}
                                                    >
                                                        <SelectTrigger className="w-52"><SelectValue placeholder="Select Strategy" /></SelectTrigger>
                                                        <SelectContent>
                                                            {strategyMetadatas.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div tabIndex={0}> 
                                                                        <Button
                                                                            variant={isRunning ? "destructive" : "default"}
                                                                            size="sm"
                                                                            onClick={() => handleToggleBot(bot.id)}
                                                                            disabled={!isConnected}
                                                                        >
                                                                            {isRunning ? <StopCircle className="mr-2 h-4 w-4"/> : <Play className="mr-2 h-4 w-4"/>}
                                                                            {isRunning ? 'Stop' : 'Start'}
                                                                        </Button>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                {activeProfile?.permissions !== 'FuturesTrading' && !isRunning && (
                                                                    <TooltipContent>
                                                                        <p>A key with Futures Trading permission is required.</p>
                                                                    </TooltipContent>
                                                                )}
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <Button variant="ghost" size="icon" onClick={() => toggleParams(bot.id)} disabled={isRunning || !bot.strategy}>
                                                            <Settings className={cn("h-4 w-4", openParams[bot.id] && "text-primary")} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => removeBotInstance(bot.id)} disabled={isRunning}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {openParams[bot.id] && bot.strategy && (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="p-0">
                                                        <div className="p-4 bg-muted/30">
                                                            <StrategyParamsCard
                                                                bot={bot}
                                                                onParamChange={(param, value) => handleStrategyParamChange(bot.id, param, value)}
                                                                onDisciplineChange={(param, value) => handleDisciplineParamChange(bot.id, param, value)}
                                                                onReset={() => handleResetParams(bot.id)}
                                                                isTradingActive={isRunning}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    )})}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
