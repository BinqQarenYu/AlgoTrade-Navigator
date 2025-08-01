
"use client"

import React, { useState, useEffect, memo, useCallback } from "react"
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
import { Bot, Play, StopCircle, ChevronDown, PlusCircle, Trash2, Settings, BrainCircuit, RotateCcw, CheckCircle, Loader2, ClipboardCheck } from "lucide-react"
import { topAssets } from "@/lib/assets"
import { strategyMetadatas, getStrategyById } from "@/lib/strategies"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useApi } from "@/context/api-context"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DisciplineParams, LiveBotConfig, LiveBotStateForAsset } from "@/lib/types"
import { DisciplineSettings } from "@/components/trading-discipline/DisciplineSettings"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { BotInstanceRow } from "../bot-instance-row"

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
import { defaultSmiMfiScalpParams } from '@/lib/strategies/smi-mfi-scalp';
import { defaultOrderFlowScalpParams } from '@/lib/strategies/order-flow-scalp';
import { defaultForcedActionScalpParams } from '@/lib/strategies/forced-action-scalp';

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
    'smi-mfi-scalp': defaultSmiMfiScalpParams,
    'order-flow-scalp': defaultOrderFlowScalpParams,
    'forced-action-scalp': defaultForcedActionScalpParams,
}

type BotInstance = LiveBotConfig & {
    id: string;
};

const SystemCheckItem = ({ label, passed }: { label: string; passed: boolean }) => (
    <div className="flex items-center justify-between text-sm">
        <p>{label}</p>
        {passed ? (
            <Badge variant="default" className="bg-green-600 hover:bg-green-600">PASS</Badge>
        ) : (
            <Badge variant="destructive">FAIL</Badge>
        )}
    </div>
);


export default function LiveTradingPage() {
    const { toast } = useToast();
    const { isConnected, activeProfile, telegramBotToken, telegramChatId } = useApi();
    const { 
        liveBotState,
        addBotInstance,
        getBotInstances,
        executeTestTrade,
    } = useBot();
    
    const botInstances = getBotInstances('live');
    const { bots: runningBots } = liveBotState;
    const [openParams, setOpenParams] = useState<Record<string, boolean>>({});

    const handleAddBotInstance = useCallback(() => {
        addBotInstance('live'); // Add an empty bot config
    }, [addBotInstance]);

    useEffect(() => {
        if (botInstances.length === 0) {
            handleAddBotInstance(); // Ensure there's always at least one row
        }
    }, [botInstances, handleAddBotInstance]);
    
    const isAnyBotMisconfigured = botInstances.some(b => !b.asset || !b.strategy);

    const handleManualTrade = (bot: BotInstance, side: 'BUY' | 'SELL') => {
        executeTestTrade(bot.asset, side, bot.capital, bot.leverage);
    };

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
                    <AlertTitle>API Connected</AlertTitle>
                    <AlertDescription>
                        You are connected to the Binance API. Live trading features are enabled.
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert variant="destructive">
                    <AlertTitle>API Disconnected</AlertTitle>
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
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                    <ClipboardCheck className="mr-2 h-4 w-4"/> System Check
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Live Trading Pre-Flight Checklist</DialogTitle>
                                    <DialogDescription>
                                        Verify these items before deploying your bots to ensure a smooth session.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <SystemCheckItem label="Binance API Connected" passed={isConnected} />
                                    <Separator />
                                    <SystemCheckItem label="Active Profile has Trading Permissions" passed={activeProfile?.permissions === 'FuturesTrading'} />
                                    <Separator />
                                    <SystemCheckItem label="Telegram Notifications Configured" passed={!!(telegramBotToken && telegramChatId)} />
                                    <Separator />
                                    <SystemCheckItem label="All Bot Rows Fully Configured" passed={!isAnyBotMisconfigured} />
                                </div>
                            </DialogContent>
                        </Dialog>
                         <Button onClick={handleAddBotInstance} size="sm" variant="outline">
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
                                    <TableHead>Live Price</TableHead>
                                    <TableHead>Capital ($)</TableHead>
                                    <TableHead>Leverage (x)</TableHead>
                                    <TableHead>Interval</TableHead>
                                    <TableHead>TP (%)</TableHead>
                                    <TableHead>SL (%)</TableHead>
                                    <TableHead>Strategy</TableHead>
                                    <TableHead className="text-right w-[180px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {botInstances.map((bot, index) => {
                                    const botLiveState = runningBots[bot.id];
                                    const isRunning = !!botLiveState && botLiveState?.status !== 'idle' && botLiveState?.status !== 'error';
                                    
                                    return (
                                        <BotInstanceRow
                                            key={bot.id}
                                            bot={bot}
                                            index={index}
                                            botState={botLiveState}
                                            openParams={openParams}
                                            setOpenParams={setOpenParams}
                                            isBotRunning={isRunning}
                                            isConnected={isConnected}
                                            canTrade={activeProfile?.permissions === 'FuturesTrading'}
                                            onManualTrade={handleManualTrade}
                                            botType="live"
                                        />
                                    )})}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
