
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/context/api-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

// Types for the order book
type OrderBookLevel = [string, string]; // [price, quantity]

interface FormattedOrderBookLevel {
    price: number;
    size: number;
    total: number;
    isWall: boolean;
}

const WALL_THRESHOLD_PERCENT = 0.05; // 5% of visible depth

export function OrderBook({ symbol }: { symbol: string }) {
    const { isConnected } = useApi();
    const { toast } = useToast();
    const wsRef = useRef<WebSocket | null>(null);
    const [bids, setBids] = useState<OrderBookLevel[]>([]);
    const [asks, setAsks] = useState<OrderBookLevel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isConnected || !symbol) {
            setIsLoading(false);
            setBids([]);
            setAsks([]);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        setIsLoading(true);

        // Close any existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        // Establish new WebSocket connection for depth stream
        const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@depth`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log(`Order book WebSocket connected for ${symbol}`);
            setIsLoading(false);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.e === 'depthUpdate') {
                // Update bids and asks state.
                // For simplicity, we'll just replace them. A real high-performance implementation
                // would process the update events (U, u) to maintain the order book state.
                setBids(data.b.filter((level: OrderBookLevel) => parseFloat(level[1]) > 0));
                setAsks(data.a.filter((level: OrderBookLevel) => parseFloat(level[1]) > 0));
            }
        };

        ws.onerror = (error) => {
            console.error(`Order book WebSocket error for ${symbol}:`, error);
            toast({
                title: 'Order Book Error',
                description: 'Could not connect to the live data stream.',
                variant: 'destructive',
            });
            setIsLoading(false);
        };

        ws.onclose = () => {
            console.log(`Order book WebSocket disconnected for ${symbol}`);
            // Don't set loading to true here, just clear data.
             if (wsRef.current) { // only clear if we are not creating a new one
                setBids([]);
                setAsks([]);
             }
        };

        return () => {
            ws.close();
            wsRef.current = null;
        };

    }, [symbol, isConnected, toast]);
    
    const formatLevels = (levels: OrderBookLevel[], isBids: boolean): FormattedOrderBookLevel[] => {
        const sortedLevels = [...levels].sort((a, b) => {
            const priceA = parseFloat(a[0]);
            const priceB = parseFloat(b[0]);
            return isBids ? priceB - priceA : priceA - priceB;
        }).slice(0, 15); // Show top 15 levels

        const totalSize = sortedLevels.reduce((sum, level) => sum + parseFloat(level[1]), 0);
        let cumulativeTotal = 0;

        return sortedLevels.map(level => {
            const price = parseFloat(level[0]);
            const size = parseFloat(level[1]);
            cumulativeTotal += size;
            const isWall = (size / totalSize) > WALL_THRESHOLD_PERCENT;
            return { price, size, total: cumulativeTotal, isWall };
        });
    };

    const formattedBids = useMemo(() => formatLevels(bids, true), [bids]);
    const formattedAsks = useMemo(() => formatLevels(asks, false), [asks]);

    const maxTotal = Math.max(
        formattedBids[formattedBids.length - 1]?.total || 0,
        formattedAsks[formattedAsks.length - 1]?.total || 0
    );

    const OrderBookRow = ({ level, type }: { level: FormattedOrderBookLevel; type: 'bid' | 'ask' }) => {
        const bgPercentage = maxTotal > 0 ? (level.total / maxTotal) * 100 : 0;
        const bgColor = type === 'bid' ? 'bg-green-500/20' : 'bg-red-500/20';
        const textColor = type === 'bid' ? 'text-green-500' : 'text-red-500';

        return (
            <TableRow className={cn("relative font-mono text-xs", level.isWall && "bg-yellow-500/20 font-bold")}>
                 <TableCell className={cn("p-1 text-left", textColor)}>{level.price.toFixed(2)}</TableCell>
                <TableCell className="p-1 text-right">{level.size.toFixed(4)}</TableCell>
                <TableCell className="p-1 text-right">{level.total.toFixed(4)}</TableCell>
                <div 
                    className={cn("absolute top-0 bottom-0 -z-10", bgColor, type === 'bid' ? 'right-0' : 'left-0')} 
                    style={{ width: `${bgPercentage}%` }}
                />
            </TableRow>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Live Order Book</CardTitle>
                <CardDescription>Real-time market depth for {symbol}.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                     <Skeleton className="h-[400px] w-full" />
                ) : !isConnected ? (
                     <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md">
                        <p>Connect API to view order book.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-center">Bids (Buy Orders)</h4>
                            <ScrollArea className="h-[400px] border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="h-8 p-1 text-left text-muted-foreground">Price (USD)</TableHead>
                                            <TableHead className="h-8 p-1 text-right text-muted-foreground">Size</TableHead>
                                            <TableHead className="h-8 p-1 text-right text-muted-foreground">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {formattedBids.map(bid => <OrderBookRow key={bid.price} level={bid} type="bid" />)}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                         <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-center">Asks (Sell Orders)</h4>
                            <ScrollArea className="h-[400px] border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="h-8 p-1 text-left text-muted-foreground">Price (USD)</TableHead>
                                            <TableHead className="h-8 p-1 text-right text-muted-foreground">Size</TableHead>
                                            <TableHead className="h-8 p-1 text-right text-muted-foreground">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {formattedAsks.map(ask => <OrderBookRow key={ask.price} level={ask} type="ask" />)}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
