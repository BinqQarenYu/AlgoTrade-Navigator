
"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useBot } from "@/context/bot-context"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bot, CheckCircle, PlusCircle, ClipboardCheck } from "lucide-react"
import { useApi } from "@/context/api-context"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { LiveBotConfig } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { BotInstanceRow } from "@/components/bot-instance-row"

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
        startBotInstance, 
        stopBotInstance, 
        liveBotState,
        addBotInstance,
        getBotInstances,
        setBotInstances,
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
                                    <TableHead className="text-right">Actions</TableHead>
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
                                            onManualTrade={executeTestTrade}
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
