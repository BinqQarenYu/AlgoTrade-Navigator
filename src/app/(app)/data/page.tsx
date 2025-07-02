"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Play, StopCircle, FileText, Database } from 'lucide-react';
import { cn } from "@/lib/utils";

// This is a placeholder for data that would come from a WebSocket
const sampleStreamData = [
    { time: '10:30:01', price: 69231.50, volume: 2.1 },
    { time: '10:30:02', price: 69230.80, volume: 1.5 },
    { time: '10:30:03', price: 69232.20, volume: 3.2 },
    { time: '10:30:04', price: 69231.90, volume: 0.8 },
    { time: '10:30:05', price: 69233.10, volume: 4.1 },
];

export default function DataPage() {
    const [isStreaming, setIsStreaming] = useState(false);
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

    const handleStreamToggle = () => {
        // In a real implementation, you would manage WebSocket connection logic here.
        if (isStreaming) {
            setIsStreaming(false);
            setStatus('disconnected');
        } else {
            setIsStreaming(true);
            setStatus('connected');
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-left">
                <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                    <Database size={32}/> Data Management
                </h1>
                <p className="text-muted-foreground mt-2">
                    Manage historical data streams and view AI-generated reports.
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
                                    {isStreaming ? sampleStreamData.map(d => (
                                         <TableRow key={d.time}>
                                            <TableCell className="font-mono text-xs">{d.time}</TableCell>
                                            <TableCell>${d.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                            <TableCell className="text-right">{d.volume}</TableCell>
                                        </TableRow>
                                    )) : (
                                         <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                                Start stream to see live data.
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
                        <CardTitle className="flex items-center gap-2"><FileText/> AI Reports</CardTitle>
                        <CardDescription>Review and manage reports generated by the AI optimizer.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
                        <p>AI-generated reports will be displayed here.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
