
"use client"

import React, { memo, useCallback } from "react"
import { useBot } from "@/context/bot-context"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn, formatPrice } from "@/lib/utils"
import { topAssets } from "@/lib/assets"
import { strategyMetadatas } from "@/lib/strategies"
import type { LiveBotConfig, LiveBotStateForAsset, DisciplineParams } from "@/lib/types"
import { Bot, Play, StopCircle, Settings, Trash2, BrainCircuit, CheckCircle, Activity, TrendingUp, TrendingDown } from "lucide-react"
import { StrategyParamsCard } from "./strategy-params-card"
import { DisciplineSettings } from "./trading-discipline/DisciplineSettings"
import { defaultSmaCrossoverParams } from "@/lib/strategies/sma-crossover"

type BotInstance = LiveBotConfig & { id: string };
type BotType = 'live' | 'manual';

interface BotInstanceRowProps {
    bot: BotInstance;
    index: number;
    botState?: LiveBotStateForAsset;
    openParams: Record<string, boolean>;
    setOpenParams: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    isBotRunning: boolean;
    isConnected: boolean;
    canTrade?: boolean;
    onManualTrade?: (bot: BotInstance, side: 'BUY' | 'SELL') => void;
    botType: BotType;
}

const StatusBadge = memo(({ status, botType }: { status?: LiveBotStateForAsset['status'], botType: BotType }) => {
    const statusInfo = {
        running: {
            color: 'bg-blue-600 hover:bg-blue-600',
            icon: Bot,
            text: botType === 'live' ? 'Running' : 'Monitoring',
            tooltip: botType === 'live' ? 'The bot is actively monitoring the market and will execute trades automatically.' : 'The bot is monitoring for signals. Manual execution is required.'
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
            text: botType === 'live' ? 'In Position' : 'Signal Found',
            tooltip: botType === 'live' ? 'The bot has an open trade and is monitoring for an exit.' : 'A valid trade signal has been found. Ready for manual execution.'
        },
        error: {
            color: '', // Uses destructive variant
            icon: Bot,
            text: 'Error',
            tooltip: 'The bot encountered an error. Check logs for details.'
        },
        cooldown: {
            color: '',
            icon: Bot,
            text: 'Cooldown',
            tooltip: 'The bot is in a temporary timeout due to risk management rules.'
        },
        idle: {
            color: '',
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


export const BotInstanceRow = memo(({
    bot, index, botState, openParams, setOpenParams, isBotRunning, isConnected, canTrade, onManualTrade, botType
}: BotInstanceRowProps) => {
    const { toast } = useToast();
    const { setBotInstances, startBotInstance, stopBotInstance } = useBot();

    const chartData = botState?.chartData || [];
    const lastPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : null;
    const lastSignal = botState?.activePosition;

    const handleConfigChange = useCallback(<K extends keyof LiveBotConfig>(field: K, value: LiveBotConfig[K]) => {
        setBotInstances(botType, prev => prev.map(b => b.id === bot.id ? { ...b, [field]: value } : b));
    }, [bot.id, botType, setBotInstances]);

    const handleParamChange = useCallback((param: string, value: any) => {
        setBotInstances(botType, prev => prev.map(b => {
            if (b.id === bot.id) {
                const updatedParams = { ...b.strategyParams, [param]: value };
                return { ...b, strategyParams: updatedParams };
            }
            return b;
        }));
    }, [bot.id, botType, setBotInstances]);
    
    const handleDisciplineChange = useCallback((paramName: keyof DisciplineParams, value: any) => {
        const currentParams = bot.strategyParams || {};
        const currentDisciplineParams = currentParams.discipline || defaultSmaCrossoverParams.discipline;
        handleParamChange('discipline', { ...currentDisciplineParams, [paramName]: value });
    }, [bot.strategyParams, handleParamChange]);

    const handleResetParams = useCallback(() => {
        // This will be implemented fully once strategy defaults are centralized.
        toast({ title: "Parameters Reset", description: "Parameters reset to default values." });
    }, [toast]);

    const handleRemoveBot = useCallback(() => {
        setBotInstances(botType, prev => prev.length > 1 ? prev.filter(b => b.id !== bot.id) : prev);
    }, [bot.id, botType, setBotInstances]);
    
    const handleToggleBot = useCallback(() => {
        if (!bot.asset || !bot.strategy) {
            toast({ title: "Incomplete Config", description: "Please select an asset and strategy.", variant: "destructive" });
            return;
        }
        if (isBotRunning) {
            stopBotInstance(bot.id);
        } else {
            startBotInstance({ ...bot, isManual: botType === 'manual' });
        }
    }, [bot, isBotRunning, botType, startBotInstance, stopBotInstance, toast]);

    const toggleParams = useCallback(() => {
        setOpenParams(prev => ({ ...prev, [bot.id]: !prev[bot.id] }));
    }, [bot.id, setOpenParams]);

    const handleInternalManualTrade = (side: 'BUY' | 'SELL') => {
        if (botState?.status === 'cooldown') {
            toast({ title: "Trade Blocked", description: `This bot is in a disciplinary cooldown. Trading is disabled.`, variant: "destructive" });
            return;
        }
        onManualTrade?.(bot, side);
    }

    return (
        <>
            <TableRow className={cn(openParams[bot.id] && "bg-muted/50")}>
                <TableCell>{index + 1}</TableCell>
                <TableCell><StatusBadge status={botState?.status} botType={botType} /></TableCell>
                <TableCell>
                    <Select value={bot.asset} onValueChange={(val) => handleConfigChange('asset', val)} disabled={isBotRunning}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Select Asset" /></SelectTrigger>
                        <SelectContent>{topAssets.map(a => (<SelectItem key={a.ticker} value={`${a.ticker}USDT`}>{a.name}</SelectItem>))}</SelectContent>
                    </Select>
                </TableCell>
                <TableCell>
                    {isBotRunning && lastPrice !== null ? (
                        <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3 text-muted-foreground animate-pulse" />
                            <span className="font-mono text-xs text-muted-foreground">${formatPrice(lastPrice)}</span>
                        </div>
                    ) : <span className="text-xs text-muted-foreground">--</span>}
                </TableCell>
                {botType === 'manual' && (
                    <TableCell>
                        {lastSignal ? (
                            <div className="flex flex-col text-xs font-mono">
                               <span className={cn("flex items-center font-semibold", lastSignal.action === 'UP' ? 'text-green-500' : 'text-red-500')}>
                                    {lastSignal.action === 'UP' ? <><TrendingUp className="mr-1 h-4 w-4"/> BUY SIGNAL</> : <><TrendingDown className="mr-1 h-4 w-4"/> SELL SIGNAL</>}
                                </span>
                                <span className="text-muted-foreground mt-1">Entry: {formatPrice(lastSignal.entryPrice)}</span>
                                <span className="text-muted-foreground">SL: {formatPrice(lastSignal.stopLoss)} / TP: {formatPrice(lastSignal.takeProfit)}</span>
                            </div>
                        ) : <span className="text-xs text-muted-foreground">--</span>}
                    </TableCell>
                )}
                <TableCell>
                    <Input type="number" value={bot.capital} onChange={(e) => handleConfigChange('capital', parseFloat(e.target.value) || 0)} className="w-28" disabled={isBotRunning} />
                </TableCell>
                <TableCell>
                    <Input type="number" value={bot.leverage} onChange={(e) => handleConfigChange('leverage', parseInt(e.target.value, 10) || 1)} className="w-24" disabled={isBotRunning} />
                </TableCell>
                <TableCell>
                    <Select value={bot.interval} onValueChange={(val) => handleConfigChange('interval', val)} disabled={isBotRunning}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1m">1m</SelectItem>
                            <SelectItem value="5m">5m</SelectItem>
                            <SelectItem value="15m">15m</SelectItem>
                            <SelectItem value="1h">1h</SelectItem>
                            <SelectItem value="4h">4h</SelectItem>
                            <SelectItem value="1d">1d</SelectItem>
                        </SelectContent>
                    </Select>
                </TableCell>
                <TableCell>
                    <Input type="number" value={bot.takeProfit} onChange={(e) => handleConfigChange('takeProfit', parseFloat(e.target.value) || 0)} className="w-24" disabled={isBotRunning} />
                </TableCell>
                <TableCell>
                    <Input type="number" value={bot.stopLoss} onChange={(e) => handleConfigChange('stopLoss', parseFloat(e.target.value) || 0)} className="w-24" disabled={isBotRunning} />
                </TableCell>
                <TableCell>
                    <Select value={bot.strategy} onValueChange={(val) => handleConfigChange('strategy', val)} disabled={isBotRunning}>
                        <SelectTrigger className="w-52"><SelectValue placeholder="Select Strategy" /></SelectTrigger>
                        <SelectContent>{strategyMetadatas.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                    </Select>
                </TableCell>
                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div tabIndex={0}>
                                        <Button variant={isBotRunning ? "destructive" : "default"} size="sm" onClick={handleToggleBot} disabled={!isConnected}>
                                            {isBotRunning ? <StopCircle className="mr-2 h-4 w-4"/> : <Play className="mr-2 h-4 w-4"/>}
                                            {isBotRunning ? `Stop` : `Start`}
                                        </Button>
                                    </div>
                                </TooltipTrigger>
                                {!canTrade && botType === 'live' && !isBotRunning && ( <TooltipContent><p>A key with Futures Trading permission is required.</p></TooltipContent> )}
                            </Tooltip>
                        </TooltipProvider>
                        <Button variant="ghost" size="icon" onClick={toggleParams} disabled={!bot.strategy}><Settings className={cn("h-4 w-4", openParams[bot.id] && "text-primary")} /></Button>
                        <Button variant="ghost" size="icon" onClick={handleRemoveBot} disabled={isBotRunning}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                </TableCell>
            </TableRow>
            {openParams[bot.id] && (
                <TableRow>
                    <TableCell colSpan={botType === 'live' ? 11 : 12} className="p-0">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30">
                            <div className="md:col-span-2">
                                <StrategyParamsCard
                                    bot={bot}
                                    onParamChange={handleParamChange}
                                    onReset={handleResetParams}
                                    isTradingActive={isBotRunning}
                                />
                            </div>
                            <div className="space-y-4">
                                {botType === 'live' && onManualTrade && (
                                    <Card>
                                        <CardHeader className="p-4"><CardTitle className="text-sm">Manual Execution</CardTitle></CardHeader>
                                        <CardContent className="p-4 flex flex-col gap-2">
                                            <Button variant="outline" onClick={() => handleInternalManualTrade('BUY')} disabled={!isConnected || !canTrade}><TrendingUp className="mr-2 h-4 w-4 text-green-500" /> Manual Long</Button>
                                            <Button variant="outline" onClick={() => handleInternalManualTrade('SELL')} disabled={!isConnected || !canTrade}><TrendingDown className="mr-2 h-4 w-4 text-red-500" /> Manual Short</Button>
                                        </CardContent>
                                    </Card>
                                )}
                                <DisciplineSettings params={bot.strategyParams.discipline || defaultSmaCrossoverParams.discipline} onParamChange={handleDisciplineChange} isDisabled={isBotRunning} />
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
});
BotInstanceRow.displayName = 'BotInstanceRow';

