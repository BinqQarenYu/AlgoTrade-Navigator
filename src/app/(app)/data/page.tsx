"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Play, StopCircle, Database, Trash2, FolderClock } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import type { StreamedDataPoint } from '@/lib/types';
import { saveDataPoint, loadSavedData, clearSavedData } from '@/lib/data-service';
import { format } from 'date-fns';

export default function DataPage() {
    const [isStreaming, setIsStreaming] = useState(false);
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [streamedData, setStreamedData] = useState<StreamedDataPoint[]>([]);
    const [savedData, setSavedData] = useState<StreamedDataPoint[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastPriceRef = useRef<number>(69231.50);
    const { toast } = useToast();

    // Effect for handling the data stream simulation
    useEffect(() => {
        if (isStreaming) {
            setStatus('connected');
            intervalRef.current = setInterval(async () => {
                const newPrice = lastPriceRef.current + (Math.random() - 0.5) * 10;
                lastPriceRef.current = newPrice;
                const newPoint: StreamedDataPoint = {
                    time: new Date().getTime(),
                    price: parseFloat(newPrice.toFixed(2)),
                    volume: parseFloat((Math.random() * 5).toFixed(2)),
                };
                
                // Update the live view
                setStreamedData(prevData => [newPoint, ...prevData].slice(0, 100)); // Keep last 100 points in view

                // Save the data point to our "persistent" storage
                try {
                    await saveDataPoint(newPoint);
                } catch (error) {
                    console.error("Failed to save data point:", error);
                }

            }, 1000); // Add a new point every second
        } else {
            setStatus('disconnected');
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isStreaming]);
    
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
        if (!isStreaming) {
            setStreamedData([]); // Clear previous session view on start
        } else {
            // When stopping, refresh the saved data view
            fetchSavedData();
        }
        setIsStreaming(!isStreaming);
    };
    
    const handleClearData = async () => {
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <Card>
                    <CardHeader>
                        <CardTitle>Historical Data Stream</CardTitle>
                        <CardDescription>Connect to a real-time data feed via WebSocket.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="symbol">Symbol</Label>
                                <Select defaultValue="BTC/USDT" disabled={isStreaming}>
                                    <SelectTrigger id="symbol">
                                        <SelectValue placeholder="Select symbol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                                        <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                                        <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="interval">Interval</Label>
                                <Select defaultValue="1s" disabled={isStreaming}>
                                    <SelectTrigger id="interval">
                                        <SelectValue placeholder="Select interval" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1s">1 Second</SelectItem>
                                        <SelectItem value="1m">1 Minute</SelectItem>
                                        <SelectItem value="5m">5 Minutes</SelectItem>
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
                                {status}
                             </span>
                           </div>
                            <Button onClick={handleStreamToggle} variant={isStreaming ? "destructive" : "default"} size="sm">
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
                                         <TableRow key={d.time + d.price}>
                                            <TableCell className="font-mono text-xs">{format(new Date(d.time), 'HH:mm:ss')}</TableCell>
                                            <TableCell>${d.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                            <TableCell className="text-right">{d.volume}</TableCell>
                                        </TableRow>
                                    )) : (
                                         <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                                {isStreaming ? 'Connecting to stream...' : 'Start stream to see live data.'}
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
                            <Button variant="outline" size="sm" onClick={handleClearData} disabled={savedData.length === 0}>
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
                                         <TableRow key={d.time + d.price}>
                                            <TableCell className="font-mono text-xs">{format(new Date(d.time), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                                            <TableCell>${d.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                            <TableCell className="text-right">{d.volume}</TableCell>
                                        </TableRow>
                                    )) : (
                                         <TableRow>
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
