
"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useBot } from "@/context/bot-context"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PlusCircle, CheckCircle } from "lucide-react"
import { useApi } from "@/context/api-context"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { LiveBotConfig } from "@/lib/types"
import { BotInstanceRow } from "@/components/bot-instance-row"


type BotInstance = LiveBotConfig & {
    id: string;
};

export default function ManualTradingPage() {
    const { isConnected } = useApi();
    const { 
        liveBotState,
        addBotInstance,
        getBotInstances,
    } = useBot();

    const botInstances = getBotInstances('manual');
    const { bots: runningBots } = liveBotState;
    const [openParams, setOpenParams] = useState<Record<string, boolean>>({});

    const handleAddBotInstance = useCallback(() => {
        addBotInstance('manual');
    }, [addBotInstance]);

    useEffect(() => {
        if (botInstances.length === 0) {
            handleAddBotInstance();
        }
    }, [botInstances, handleAddBotInstance]);

    return (
        <div className="space-y-6">
            <div className="text-left">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Manual Trading Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                    Configure and monitor multiple strategies, but execute trades manually based on the bot's signals.
                </p>
            </div>

            {isConnected ? (
                <Alert variant="default" className="border-green-500/50 bg-green-500/10 text-green-500">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>API Connected</AlertTitle>
                    <AlertDescription>
                        You are connected to the Binance API. Signal monitoring is enabled.
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert variant="destructive">
                    <AlertTitle>API Disconnected</AlertTitle>
                    <AlertDescription>
                        Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> to enable signal monitoring.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Signal Monitoring Matrix</CardTitle>
                        <CardDescription>Add, remove, and configure your signal monitors.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button onClick={handleAddBotInstance} size="sm" variant="outline">
                            <PlusCircle className="mr-2 h-4 w-4"/> Add Monitor
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
                                    <TableHead>Trade Signal (Entry/SL/TP)</TableHead>
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
                                            botType="manual"
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
