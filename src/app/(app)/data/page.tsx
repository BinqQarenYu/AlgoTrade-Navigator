
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Play, StopCircle, Database, Trash2, FolderClock, Bot } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { useBot } from '@/context/bot-context';
import type { StreamedDataPoint } from '@/lib/types';
import { saveDataPoint, loadSavedData, clearSavedData } from '@/lib/data-service';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DataPage() {
    const [isStreaming, setIsStreaming] = useState(false);
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [streamedData, setStreamedData] = useState<StreamedDataPoint[]>([]);
    const [savedData, setSavedData] = useState<StreamedDataPoint[]>([]);
    const [symbol, setSymbol] = useState("btcusdt"); // lowercase for websocket
    const wsRef = useRef<WebSocket | null>(null);
    const dataBufferRef = useRef<StreamedDataPoint[]>([]);
    const { toast } = useToast();
    const { isTradingActive, liveBotState } = useBot();
    
    // Batch UI updates to prevent freezing from high-frequency messages
    useEffect(() => {
        if (!isStreaming) return;

        const intervalId = setInterval(() => {
            if (dataBufferRef.current.length > 0) {
                setStreamedData(prevData => [...dataBufferRef.current, ...prevData].slice(0, 100));
                dataBufferRef.current = [];
            }
        }, 500); // Update UI every 500ms

        return () => clearInterval(intervalId);
    }, [isStreaming]);

    // Effect for handling the real-time data stream connection
    useEffect(() => {
        if (isStreaming && !isTradingActive) {
            setStatus('connecting');
            const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol}@aggTrade`);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("WebSocket connected");
                setStatus('connected');
                toast({ title: "Stream Connected", description: `Live data stream for ${symbol.toUpperCase()} is active.`});
            };

            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                // The aggTrade stream provides 'a' for aggregate trade ID, 'p' for price and 'q' for quantity.
                if (message.e === 'aggTrade' && message.p && message.q && message.a) {
                    const newPoint: StreamedDataPoint = {
                        id: message.a, // Aggregate trade ID
                        time: message.T, // Trade time
                        price: parseFloat(message.p),
                        volume: parseFloat(message.q),
                    };

                    dataBufferRef.current.unshift(newPoint); // Add to buffer, don't set state directly

                    try {
                        saveDataPoint(newPoint);
                    } catch (error) {
                        console.error("Failed to save data point:", error);
                    }
                }
            };

            ws.onerror = () => {
                console.error("A WebSocket error occurred. The browser console may have more specific details about the connection failure.");
                setStatus('disconnected');
                toast({ title: "WebSocket Error", description: "Connection failed.", variant: "destructive" });
            };

            ws.onclose = () => {
                console.log("WebSocket disconnected");
                setStatus('disconnected');
                 if (wsRef.current) {
                   toast({ title: "Stream Disconnected", description: "The data stream has been closed."});
                }
                wsRef.current = null;
            };

        } else {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (isStreaming && isTradingActive) {
                setIsStreaming(false); // Force stop if trading becomes active
            }
        }
        
        // Cleanup function to close the WebSocket connection
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [isStreaming, symbol, toast, isTradingActive]);
    
    const fetchSavedData = async () => {
        try {
            const data = await loadSavedData();
            setSavedData(data.reverse()); // Show newest first
        } catch (error) {
            console.error("Failed to load saved data:", error);
            toast({
                title: "Error",
                description: "Could not load saved data.",
                variant: "destructive"
            });
        }
    };
    
    // Fetch saved data on component mount
    useEffect(() => {
        fetchSavedData();
    }, []);

    const handleStreamToggle = () => {
        if (isTradingActive) {
            toast({ title: "Action Paused", description: "Stop the active trading session to manage data streams.", variant: "destructive" });
            return;
        }
        if (!isStreaming) {
            setStreamedData([]); // Clear previous session view on start
            dataBufferRef.current = [];
        } else {
            // When stopping, refresh the saved data view
            fetchSavedData();
        }
        setIsStreaming(!isStreaming);
    };
    
    const handleClearData = async () => {
         if (isTradingActive) {
            toast({ title: "Action Paused", description: "Stop the active trading session to manage data streams.", variant: "destructive" });
            return;
        }
        try {
            await clearSavedData();
            setSavedData([]);
            toast({
                title: "Success",
                description: "All saved historical data has been cleared.",
            });
        } catch (error) {
            console.error("Failed to clear data:", error);
            toast({
                title: "Error",
                description: "Could not clear saved data.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-left">
                <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                    <Database size={32}/> Data Management
                </h1>
                <p className="text-muted-foreground mt-2">
                    Manage real-time data streams and persisted historical data.
                </p>
            </div>
             {isTradingActive && (
                <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
                    <Bot className="h-4 w-4" />
                    <AlertTitle>Trading Session Active</AlertTitle>
                    <AlertDescription>
                        The real-time data stream is disabled to prioritize the active{' '}
                        {liveBotState.isRunning ? <Link href="/live" className="font-bold underline">Live Bot</Link> : <Link href="/manual" className="font-bold underline">Manual Trade</Link>}.
                    </AlertDescription>
                </Alert>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <Card>
                    <CardHeader>
                        <CardTitle>Real-time Data Stream</CardTitle>
                        <CardDescription>Connect to a live Binance data feed via WebSocket.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="symbol">Symbol</Label>
                                <Select defaultValue="btcusdt" onValueChange={setSymbol} disabled={isStreaming || isTradingActive}>
                                    <SelectTrigger id="symbol">
                                        <SelectValue placeholder="Select symbol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="btcusdt">BTC/USDT</SelectItem>
                                        <SelectItem value="ethusdt">ETH/USDT</SelectItem>
                                        <SelectItem value="solusdt">SOL/USDT</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="interval">Stream Type</Label>
                                <Select defaultValue="aggTrade" disabled={isStreaming || isTradingActive}>
                                    <SelectTrigger id="interval">
                                        <SelectValue placeholder="Select stream" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="aggTrade">Aggregate Trade</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                           <div className="flex items-center gap-2">
                             <span className={cn(
                                "h-2.5 w-2.5 rounded-full",
                                status === 'connected' && "bg-green-500",
                                status === 'disconnected' && "bg-red-500",
                                status === 'connecting' && "bg-yellow-500 animate-pulse"
                             )}/>
                             <span className="text-sm font-medium capitalize text-muted-foreground">
                                {isTradingActive ? 'Paused' : status}
                             </span>
                           </div>
                            <Button onClick={handleStreamToggle} variant={isStreaming ? "destructive" : "default"} size="sm" disabled={isTradingActive}>
                                {isStreaming ? <StopCircle /> : <Play />}
                                {isStreaming ? 'Stop Stream' : 'Start Stream'}
                            </Button>
                        </div>
                        <div className="h-64 overflow-y-auto border rounded-md">
                             <Table>
                                <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Price (USD)</TableHead>
                                        <TableHead className="text-right">Volume</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isStreaming && streamedData.length > 0 ? streamedData.map(d => (
                                         <TableRow key={d.id}>
                                            <TableCell className="font-mono text-xs">{format(new Date(d.time), 'HH:mm:ss.SSS')}</TableCell>
                                            <TableCell>${d.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                            <TableCell className="text-right">{d.volume}</TableCell>
                                        </TableRow>
                                    )) : (
                                         <TableRow key="streaming-placeholder">
                                            <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                                {isTradingActive ? 'Streaming is paused.' : isStreaming ? 'Connecting to stream...' : 'Start stream to see live data.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2"><FolderClock/> Saved Data & Reports</span>
                            <Button variant="outline" size="sm" onClick={handleClearData} disabled={savedData.length === 0 || isTradingActive}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Clear
                            </Button>
                        </CardTitle>
                        <CardDescription>Review data saved from your streams and view AI-generated reports.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Saved Stream Data ({savedData.length} points)</h3>
                         <div className="h-64 overflow-y-auto border rounded-md">
                            <Table>
                                <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Price (USD)</TableHead>
                                        <TableHead className="text-right">Volume</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {savedData.length > 0 ? savedData.slice(0, 100).map(d => (
                                         <TableRow key={d.id}>
                                            <TableCell className="font-mono text-xs">{format(new Date(d.time), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                                            <TableCell>${d.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                            <TableCell className="text-right">{d.volume}</TableCell>
                                        </TableRow>
                                    )) : (
                                         <TableRow key="saved-data-placeholder">
                                            <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                                No data saved yet. Start a stream to collect data.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="border-t pt-4">
                             <h3 className="text-sm font-medium text-muted-foreground mb-2">AI Reports</h3>
                             <div className="flex items-center justify-center h-full min-h-[100px] text-muted-foreground rounded-md border border-dashed">
                                 <p>AI-generated reports will be displayed here.</p>
                             </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
