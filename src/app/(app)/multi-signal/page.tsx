
"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useBot } from "@/context/bot-context"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bot, Play, StopCircle } from "lucide-react"
import { MultiSignalCard } from "@/components/multi-signal-card"

const allAssets = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "DOTUSDT", 
    "LINKUSDT", "MATICUSDT", "LTCUSDT", "NEARUSDT", "UNIUSDT", "ATOMUSDT", "ETCUSDT", "FILUSDT", "APTUSDT", "SUIUSDT", "OPUSDT",
    "SHIBUSDT", "TRXUSDT", "BCHUSDT"
];

export default function MultiSignalPage() {
    const { toast } = useToast();
    const { 
        multiSignalState, 
        startMultiSignalMonitor, 
        stopMultiSignalMonitor, 
        isTradingActive 
    } = useBot();
    const { isRunning, results, config: runningConfig } = multiSignalState;

    // UI State
    const [selectedAssets, setSelectedAssets] = useState<string[]>(["BTCUSDT", "ETHUSDT", "SOLUSDT"]);
    const [interval, setInterval] = useState("1h");
    const [strategy, setStrategy] = useState("peak-formation-fib");
    const [takeProfit, setTakeProfit] = useState(2);
    const [stopLoss, setStopLoss] = useState(1);
    const [useAIPrediction, setUseAIPrediction] = useState(true);

    const handleAssetToggle = (asset: string) => {
        setSelectedAssets(prev => 
            prev.includes(asset) ? prev.filter(a => a !== asset) : [...prev, asset]
        );
    };

    const handleToggleMonitor = () => {
        if (isRunning) {
            stopMultiSignalMonitor();
        } else {
            if (selectedAssets.length === 0) {
                toast({ title: "No Assets Selected", description: "Please select at least one asset to monitor.", variant: "destructive"});
                return;
            }
            startMultiSignalMonitor({
                assets: selectedAssets,
                interval,
                strategy,
                takeProfit,
                stopLoss,
                useAIPrediction
            });
        }
    };

    const monitoredAssets = isRunning && runningConfig ? runningConfig.assets : [];

    return (
        <div className="space-y-6">
            <div className="text-left">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Multi-Signal Generator</h1>
                <p className="text-muted-foreground mt-2">
                    Monitor multiple assets concurrently to find trade signals based on your chosen strategy.
                </p>
            </div>
             {isTradingActive && !isRunning && (
                <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
                    <Bot className="h-4 w-4" />
                    <AlertTitle>Another Trading Session is Active</AlertTitle>
                    <AlertDescription>
                        The Multi-Signal Generator is disabled to prioritize another active trading session. Check the <Link href="/live" className="font-bold underline">Live Bot</Link> or <Link href="/manual" className="font-bold underline">Manual Trading</Link> page.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Configuration</CardTitle>
                        <CardDescription>Set up the parameters for the signal monitor.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Assets to Monitor</Label>
                            <ScrollArea className="h-40 w-full rounded-md border p-4">
                                <div className="space-y-2">
                                    {allAssets.map(asset => (
                                        <div key={asset} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={asset}
                                                checked={selectedAssets.includes(asset)}
                                                onCheckedChange={() => handleAssetToggle(asset)}
                                                disabled={isRunning}
                                            />
                                            <Label htmlFor={asset} className="font-normal">{asset.replace("USDT", "/USDT")}</Label>
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
                        <div className="space-y-2">
                            <Label htmlFor="strategy">Strategy</Label>
                            <Select onValueChange={setStrategy} value={strategy} disabled={isRunning}>
                                <SelectTrigger id="strategy"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sma-crossover">SMA Crossover</SelectItem>
                                    <SelectItem value="ema-crossover">EMA Crossover</SelectItem>
                                    <SelectItem value="rsi-divergence">RSI Divergence</SelectItem>
                                    <SelectItem value="peak-formation-fib">Peak Formation Fib</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="take-profit">Take Profit (%)</Label>
                                <Input id="take-profit" type="number" value={takeProfit} onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)} disabled={isRunning} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="stop-loss">Stop Loss (%)</Label>
                                <Input id="stop-loss" type="number" value={stopLoss} onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)} disabled={isRunning} />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Switch id="ai-prediction" checked={useAIPrediction} onCheckedChange={setUseAIPrediction} disabled={isRunning} />
                            <Label htmlFor="ai-prediction">Enable AI Validation</Label>
                        </div>

                        <Button onClick={handleToggleMonitor} className="w-full" variant={isRunning ? "destructive" : "default"} disabled={isTradingActive && !isRunning}>
                            {isRunning ? <StopCircle /> : <Play />}
                            {isRunning ? "Stop Monitoring" : "Start Monitoring"}
                        </Button>
                    </CardContent>
                </Card>

                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Signal Dashboard</CardTitle>
                            <CardDescription>
                                {isRunning ? `Monitoring ${monitoredAssets.length} assets...` : "Start the monitor to see live signals."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isRunning ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {monitoredAssets.map(asset => (
                                        <MultiSignalCard key={asset} asset={asset} result={results[asset]} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-64 text-muted-foreground border border-dashed rounded-md">
                                    <p>The signal dashboard is idle.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
