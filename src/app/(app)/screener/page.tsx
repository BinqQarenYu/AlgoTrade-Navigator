
"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useBot } from "@/context/bot-context"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bot, Sparkles, Play, StopCircle, ChevronDown, BrainCircuit, Loader2 } from "lucide-react"
import { topAssets } from "@/lib/assets"
import { strategies } from "@/lib/strategies"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn, formatPrice } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"

export default function ScreenerPage() {
    const { toast } = useToast();
    const { 
        screenerState, 
        startScreener, 
        stopScreener, 
        isTradingActive 
    } = useBot();
    const { isRunning, prediction, logs, config: runningConfig, strategyInputs } = screenerState;

    // UI State
    const [selectedAsset, setSelectedAsset] = useState<string>("BTCUSDT");
    const [selectedStrategies, setSelectedStrategies] = useState<string[]>(["peak-formation-fib", "ema-crossover"]);
    const [interval, setInterval] = useState("5m");
    
    const [isConfigOpen, setConfigOpen] = useState(true);

    const handleStrategyToggle = (strategyId: string) => {
        setSelectedStrategies(prev => 
            prev.includes(strategyId) ? prev.filter(s => s !== strategyId) : [...prev, strategyId]
        );
    };

    const handleSelectAllStrategies = () => {
        if (selectedStrategies.length === strategies.length) {
            setSelectedStrategies([]);
        } else {
            setSelectedStrategies(strategies.map(s => s.id));
        }
    };

    const handleRunScreener = () => {
        if (isRunning) {
            stopScreener();
        } else {
            if (!selectedAsset) {
                toast({ title: "No Asset Selected", description: "Please select an asset to analyze.", variant: "destructive"});
                return;
            }
            if (selectedStrategies.length === 0) {
                toast({ title: "No Strategies Selected", description: "Please select at least one strategy for the ensemble.", variant: "destructive"});
                return;
            }
            startScreener({
                asset: selectedAsset,
                strategies: selectedStrategies,
                interval,
            });
        }
    };
    
    const isThisPageRunning = isRunning;

    return (
        <div className="space-y-6">
            <div className="text-left">
                <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                    <BrainCircuit size={32}/> Ensemble Price Predictor
                </h1>
                <p className="text-muted-foreground mt-2">
                    Use a meta-model to predict future price by combining multiple strategy outputs.
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
                                <CardDescription>Set up the ensemble model.</CardDescription>
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
                                    <Label>Asset to Analyze</Label>
                                    <Select onValueChange={setSelectedAsset} value={selectedAsset} disabled={isRunning}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {topAssets.map(asset => (
                                                <SelectItem key={asset.ticker} value={`${asset.ticker}USDT`}>{asset.ticker}/USDT</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Strategies for Ensemble</Label>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0"
                                            onClick={handleSelectAllStrategies}
                                            disabled={isRunning}
                                            type="button"
                                        >
                                            {selectedStrategies.length === strategies.length ? 'Deselect All' : 'Select All'}
                                        </Button>
                                    </div>
                                    <ScrollArea className="h-48 w-full rounded-md border p-4">
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
                                
                                <Button onClick={handleRunScreener} className="w-full" variant={isRunning ? "destructive" : "default"} disabled={isTradingActive && !isRunning}>
                                    {isRunning ? <StopCircle /> : <Play />}
                                    {isRunning ? "Stop Analysis" : "Predict Price"}
                                </Button>
                            </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>

                <div className="lg:col-span-3 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>AI Price Prediction</CardTitle>
                            <CardDescription>
                                {isRunning ? "Analyzing... This may take a few moments." : prediction ? `Prediction for ${runningConfig?.asset} on the next ${runningConfig?.interval} candle.` : "Run analysis to get a price prediction."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isRunning ? (
                                <div className="flex items-center justify-center h-48 text-muted-foreground">
                                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                    <span>Synthesizing strategy data...</span>
                                </div>
                            ) : prediction ? (
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm text-muted-foreground">Predicted Price</Label>
                                        <p className="text-4xl font-bold text-primary">${formatPrice(prediction.predictedPrice)}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm text-muted-foreground">Confidence</Label>
                                        <div className="flex items-center gap-4">
                                            <Progress value={prediction.confidence * 100} className="w-full" />
                                            <span className="font-semibold">{(prediction.confidence * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                     <div>
                                        <Label className="text-sm text-muted-foreground">Reasoning</Label>
                                        <p className="text-sm text-foreground/80">{prediction.reasoning}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md">
                                    <p>{logs.length > 0 ? logs[logs.length-1] : "Prediction results will appear here."}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Strategy Inputs</CardTitle>
                            <CardDescription>The data fed to the AI from each selected strategy.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Strategy</TableHead>
                                    <TableHead>Signal</TableHead>
                                    <TableHead>Key Indicators</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isRunning && strategyInputs.length === 0 ? (
                                        Array.from({length: selectedStrategies.length}).map((_, i) => (
                                            <TableRow key={`skel-${i}`}>
                                                <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                                                <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                                                <TableCell><Skeleton className="h-5 w-48"/></TableCell>
                                            </TableRow>
                                        ))
                                    ) : strategyInputs.length > 0 ? (
                                        strategyInputs.map((input) => (
                                            <TableRow key={input.name}>
                                                <TableCell className="font-medium">{input.name}</TableCell>
                                                <TableCell>{input.signal || 'None'}</TableCell>
                                                <TableCell className="text-xs font-mono">
                                                    {Object.entries(input.indicators).map(([key, value]) => (
                                                        <div key={key}>{key}: {typeof value === 'number' ? value.toFixed(4) : String(value)}</div>
                                                    ))}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                            Run analysis to see strategy inputs.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
