
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
import { Bot, Play, StopCircle, ChevronDown, PlusCircle, Trash2, Settings, BrainCircuit, RotateCcw } from "lucide-react"
import { topAssets } from "@/lib/assets"
import { strategyMetadatas, getStrategyById } from "@/lib/strategies"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useApi } from "@/context/api-context"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

type BotInstance = {
    id: string;
    asset: string;
    capital: number;
    leverage: number;
    strategy: string;
    strategyParams: any;
};

const createNewBotInstance = (id: string): BotInstance => ({
    id,
    asset: '',
    capital: 100,
    leverage: 10,
    strategy: '',
    strategyParams: {},
});

const StrategyParamsCard = ({ bot, onParamChange, onReset, isTradingActive }: { bot: BotInstance, onParamChange: (param: string, value: any) => void, onReset: () => void, isTradingActive: boolean }) => {
    const strategyInfo = getStrategyById(bot.strategy);
    if (!strategyInfo) return null;

    const params = bot.strategyParams || {};
    const filteredParams = Object.fromEntries(Object.entries(params).filter(([key]) => key !== 'discipline' && key !== 'reverse'));

    if (Object.keys(filteredParams).length === 0) {
        return <p className="text-sm text-muted-foreground p-4">This strategy has no tunable parameters.</p>;
    }

    return (
        <Card className="bg-muted/50">
            <CardHeader className="p-4">
                <CardTitle className="text-sm">Parameters for {strategyInfo.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {Object.entries(filteredParams).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                            <Label htmlFor={`${bot.id}-${key}`} className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                            <Input
                                id={`${bot.id}-${key}`}
                                type="number"
                                value={value as number}
                                onChange={e => onParamChange(key, e.target.value)}
                                className="h-8"
                                disabled={isTradingActive}
                            />
                        </div>
                    ))}
                </div>
                {DEFAULT_PARAMS_MAP[bot.strategy] && (
                    <Button onClick={onReset} variant="secondary" size="sm" className="w-full" disabled={isTradingActive}>
                        <RotateCcw/> Reset to Default
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}

export default function LiveTradingPage() {
    const { toast } = useToast();
    const { isConnected, isTradingActive } = useApi();
    const [botInstances, setBotInstances] = usePersistentState<BotInstance[]>('live-bot-instances', [createNewBotInstance('bot_1')]);
    const [openParams, setOpenParams] = useState<Record<string, boolean>>({});

    const addBotInstance = () => {
        const newId = `bot_${Date.now()}`;
        setBotInstances(prev => [...prev, createNewBotInstance(newId)]);
    };

    useEffect(() => {
        if (botInstances.length === 0) {
            addBotInstance(); // Ensure there's always at least one row
            return;
        }

        const lastBot = botInstances[botInstances.length - 1];

        const isLastBotFilled = 
            lastBot.asset &&
            lastBot.capital > 0 &&
            lastBot.leverage >= 1 &&
            lastBot.strategy;

        if (isLastBotFilled) {
            addBotInstance();
        }
    }, [botInstances]);


    const handleBotConfigChange = <K extends keyof BotInstance>(id: string, field: K, value: BotInstance[K]) => {
        setBotInstances(prev => prev.map(bot => {
            if (bot.id === id) {
                const updatedBot = { ...bot, [field]: value };
                // If the strategy changes, reset its parameters to the new strategy's defaults
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
                const parsedValue = String(value).includes('.') ? parseFloat(value) : parseInt(value, 10);
                return {
                    ...bot,
                    strategyParams: {
                        ...bot.strategyParams,
                        [param]: isNaN(parsedValue) ? 0 : parsedValue,
                    }
                }
            }
            return bot;
        }))
    }

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
        if (botInstances.length <= 1) {
            toast({ title: "Cannot Remove", description: "At least one bot configuration must remain.", variant: "destructive" });
            return;
        }
        setBotInstances(prev => prev.filter(bot => bot.id !== id));
    };

    const toggleParams = (id: string) => {
        setOpenParams(prev => ({ ...prev, [id]: !prev[id] }));
    }

    return (
        <div className="space-y-6">
            <div className="text-left">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Live Trading Matrix</h1>
                <p className="text-muted-foreground mt-2">
                    Configure and deploy a portfolio of unique trading bots from a single dashboard.
                </p>
            </div>

            {!isConnected && (
                <Alert variant="destructive">
                    <AlertDescription>
                        Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> to enable live trading features.
                    </AlertDescription>
                </Alert>
            )}

            {isTradingActive && (
                <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
                    <Bot className="h-4 w-4" />
                    <AlertTitle>Trading Session is Active</AlertTitle>
                    <AlertDescription>
                        Configuration is locked while a trading session is running.
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
                         <Button onClick={addBotInstance} size="sm" variant="outline" disabled={isTradingActive}>
                            <PlusCircle/> Add Bot
                        </Button>
                        <Button className="bg-primary hover:bg-primary/90" disabled={isTradingActive || !isConnected}>
                            <Play/> Start All Bots
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead>Asset</TableHead>
                                    <TableHead>Capital ($)</TableHead>
                                    <TableHead>Leverage (x)</TableHead>
                                    <TableHead>Strategy</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {botInstances.map((bot, index) => (
                                    <React.Fragment key={bot.id}>
                                        <TableRow>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={bot.asset}
                                                    onValueChange={(val) => handleBotConfigChange(bot.id, 'asset', val)}
                                                    disabled={isTradingActive}
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
                                                    onChange={(e) => handleBotConfigChange(bot.id, 'capital', parseFloat(e.target.value) || 0)}
                                                    className="w-28"
                                                    disabled={isTradingActive}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={bot.leverage}
                                                    onChange={(e) => handleBotConfigChange(bot.id, 'leverage', parseInt(e.target.value, 10) || 1)}
                                                    className="w-24"
                                                    disabled={isTradingActive}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={bot.strategy}
                                                    onValueChange={(val) => handleBotConfigChange(bot.id, 'strategy', val)}
                                                    disabled={isTradingActive}
                                                >
                                                    <SelectTrigger className="w-52"><SelectValue placeholder="Select Strategy" /></SelectTrigger>
                                                    <SelectContent>
                                                        {strategyMetadatas.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => toggleParams(bot.id)} disabled={isTradingActive || !bot.strategy}>
                                                        <Settings className={cn("h-4 w-4", openParams[bot.id] && "text-primary")} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => removeBotInstance(bot.id)} disabled={isTradingActive}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {openParams[bot.id] && bot.strategy && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="p-0">
                                                    <div className="p-4 bg-muted/30">
                                                        <StrategyParamsCard
                                                            bot={bot}
                                                            onParamChange={(param, value) => handleStrategyParamChange(bot.id, param, value)}
                                                            onReset={() => handleResetParams(bot.id)}
                                                            isTradingActive={isTradingActive}
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
