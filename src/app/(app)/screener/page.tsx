
"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import { useBot } from "@/context/bot-context"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bot, Sparkles, Play, StopCircle, ChevronDown, Trophy, Info } from "lucide-react"
import { topBases, pairsByBase, assetInfo, parseSymbolString } from "@/lib/assets"
import { strategies } from "@/lib/strategies"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn, formatPrice } from "@/lib/utils"
import type { RankedTradeSignal } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const ScreenerResultCard = ({ rankedSignal }: { rankedSignal: RankedTradeSignal }) => {
    const displaySymbol = useMemo(() => {
        const parsed = parseSymbolString(rankedSignal.asset);
        return parsed ? `${parsed.base}/${parsed.quote}` : rankedSignal.asset;
    }, [rankedSignal.asset]);

    const getRankColor = (rank: number) => {
        if (rank === 1) return "bg-amber-400 text-amber-900 border-amber-500";
        if (rank === 2) return "bg-slate-300 text-slate-800 border-slate-400";
        if (rank === 3) return "bg-orange-400 text-orange-900 border-orange-500";
        return "bg-muted text-muted-foreground";
    }

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-3">
                            {displaySymbol}
                             <Badge variant={rankedSignal.action === 'UP' ? 'default' : 'destructive'} className="text-sm">
                                {rankedSignal.action === 'UP' ? 'LONG' : 'SHORT'}
                            </Badge>
                        </CardTitle>
                        <CardDescription>Strategy: {rankedSignal.strategy}</CardDescription>
                    </div>
                    <div className={cn("flex items-center gap-2 font-bold text-lg rounded-md px-3 py-1 border", getRankColor(rankedSignal.rank))}>
                       <Trophy className="w-5 h-5"/> #{rankedSignal.rank}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 flex-grow">
                <div className="grid gap-1.5 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Entry Price</span>
                        <span className="font-mono">${formatPrice(rankedSignal.entryPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Stop Loss</span>
                        <span className="font-mono text-red-500">${formatPrice(rankedSignal.stopLoss)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Take Profit</span>
                        <span className="font-mono text-green-500">${formatPrice(rankedSignal.takeProfit)}</span>
                    </div>
                </div>
                 <div className="space-y-1 pt-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary"/> AI Justification
                    </h4>
                    <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <p className="text-xs text-muted-foreground cursor-help line-clamp-2">
                                {rankedSignal.justification}
                            </p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <p>{rankedSignal.justification}</p>
                        </TooltipContent>
                    </Tooltip>
                    </TooltipProvider>
                </div>
            </CardContent>
        </Card>
    );
}


export default function ScreenerPage() {
    const { toast } = useToast();
    const { 
        screenerState, 
        startScreener, 
        stopScreener, 
        isTradingActive 
    } = useBot();
    const { isRunning, results, logs, config: runningConfig } = screenerState;

    // UI State
    const [selectedAssets, setSelectedAssets] = useState<string[]>(["BTCUSDT", "ETHUSDT", "SOLUSDT"]);
    const [selectedStrategies, setSelectedStrategies] = useState<string[]>(["peak-formation-fib"]);
    const [interval, setInterval] = useState("1h");
    const [useAiRanking, setUseAiRanking] = useState(true);
    
    const [isConfigOpen, setConfigOpen] = useState(true);

    const handleAssetToggle = (asset: string) => {
        setSelectedAssets(prev => 
            prev.includes(asset) ? prev.filter(a => a !== asset) : [...prev, asset]
        );
    };

    const handleStrategyToggle = (strategyId: string) => {
        setSelectedStrategies(prev => 
            prev.includes(strategyId) ? prev.filter(s => s !== strategyId) : [...prev, strategyId]
        );
    };

    const handleRunScreener = () => {
        if (isRunning) {
            stopScreener();
        } else {
            if (selectedAssets.length === 0) {
                toast({ title: "No Assets Selected", description: "Please select at least one asset to screen.", variant: "destructive"});
                return;
            }
            if (selectedStrategies.length === 0) {
                toast({ title: "No Strategies Selected", description: "Please select at least one strategy to run.", variant: "destructive"});
                return;
            }
            startScreener({
                assets: selectedAssets,
                strategies: selectedStrategies,
                interval,
                useAiRanking
            });
        }
    };
    
    const isThisPageRunning = isRunning;

    return (
        <div className="space-y-6">
            <div className="text-left">
                <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                    <Sparkles size={32}/> AI Screener
                </h1>
                <p className="text-muted-foreground mt-2">
                    Find high-potential trade setups by running multiple strategies across multiple assets, ranked by AI.
                </p>
            </div>
             {isTradingActive && !isThisPageRunning && (
                <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
                    <Bot className="h-4 w-4" />
                    <AlertTitle>Another Trading Session is Active</AlertTitle>
                    <AlertDescription>
                        The AI Screener is disabled to prioritize another active trading session. Check other pages like <Link href="/live" className="font-bold underline">Live Bot</Link>.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                <Card className="lg:col-span-1">
                    <Collapsible open={isConfigOpen} onOpenChange={setConfigOpen}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Configuration</CardTitle>
                                <CardDescription>Set parameters for the screener.</CardDescription>
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
                                    <Label>Assets to Screen</Label>
                                    <ScrollArea className="h-40 w-full rounded-md border p-4">
                                        <div className="space-y-4">
                                            {topBases.map((base) => {
                                                const quotes = pairsByBase[base] || [];
                                                if (quotes.length === 0) return null;
                                                return (
                                                    <div key={base}>
                                                        <h4 className="font-medium text-sm mb-2">{base} - {assetInfo[base] || ''}</h4>
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pl-2">
                                                            {quotes.map(quote => {
                                                                const symbol = `${base}${quote}`;
                                                                return (
                                                                    <div key={symbol} className="flex items-center space-x-2">
                                                                        <Checkbox id={`asset-${symbol}`} checked={selectedAssets.includes(symbol)} onCheckedChange={() => handleAssetToggle(symbol)} disabled={isRunning} />
                                                                        <Label htmlFor={`asset-${symbol}`} className="font-normal text-muted-foreground">{quote}</Label>
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
                                    <Label>Strategies to Use</Label>
                                    <ScrollArea className="h-40 w-full rounded-md border p-4">
                                        <div className="space-y-2">
                                        {strategies.map((strategy) => (
                                            <div key={strategy.id} className="flex items-center space-x-2">
                                                <Checkbox id={`strat-${strategy.id}`} checked={selectedStrategies.includes(strategy.id)} onCheckedChange={() => handleStrategyToggle(strategy.id)} disabled={isRunning}/>
                                                <Label htmlFor={`strat-${strategy.id}`} className="font-normal text-muted-foreground">{strategy.name}</Label>
                                            </div>
                                        ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="interval">Interval</Label>
                                    <Select onValueChange={setInterval} value={interval} disabled={isRunning}>
                                        <SelectTrigger id="interval"><SelectValue/></SelectTrigger>
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
                                <div className="flex items-center space-x-2 pt-2">
                                    <Switch id="ai-ranking" checked={useAiRanking} onCheckedChange={setUseAiRanking} disabled={isRunning} />
                                    <Label htmlFor="ai-ranking">Enable AI Ranking</Label>
                                </div>

                                <Button onClick={handleRunScreener} className="w-full" variant={isRunning ? "destructive" : "default"} disabled={isTradingActive && !isRunning}>
                                    {isRunning ? <StopCircle /> : <Play />}
                                    {isRunning ? "Stop Screener" : "Find Top Signals"}
                                </Button>
                            </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>

                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ranked Signals</CardTitle>
                            <CardDescription>
                                {isRunning ? "Scanning markets... This may take a few moments." : `Showing ${results.length} ranked signals from the last run.`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isRunning ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {Array.from({length: 3}).map((_, i) => (
                                         <Card key={i}>
                                            <CardHeader>
                                                <Skeleton className="h-5 w-24"/>
                                                <Skeleton className="h-4 w-32"/>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                <Skeleton className="h-4 w-full"/>
                                                <Skeleton className="h-4 w-full"/>
                                                <Skeleton className="h-4 w-4/5"/>
                                            </CardContent>
                                         </Card>
                                    ))}
                                </div>
                            ) : results.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {results.map((signal, index) => (
                                        <ScreenerResultCard key={`${signal.asset}-${signal.strategy}-${index}`} rankedSignal={signal} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-64 text-muted-foreground border border-dashed rounded-md">
                                    <p>{logs.length > 0 ? logs[logs.length-1] : "Run the screener to find top signals."}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

