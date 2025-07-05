
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/context/api-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Button } from './ui/button';
import { ChevronDown, Play, StopCircle } from 'lucide-react';

// Types for the order book
type OrderBookLevel = [string, string]; // [price, quantity]

interface FormattedOrderBookLevel {
    price: number;
    size: number;
    total: number;
    isWall: boolean;
}

const WALL_THRESHOLD_PERCENT = 0.05; // 5% of visible depth

// Aggregates raw order book levels into larger price buckets
const groupLevels = (levels: OrderBookLevel[], grouping: number): OrderBookLevel[] => {
    if (grouping <= 0) return levels;

    const aggregated: { [key: string]: number } = {};
    const precision = Math.max(0, -Math.floor(Math.log10(grouping)));
    
    for (const [priceStr, quantityStr] of levels) {
        const price = parseFloat(priceStr);
        const quantity = parseFloat(quantityStr);
        // Group price levels into buckets (e.g., group 65123.45 into 65120 for a grouping of 10)
        const groupedPrice = Math.floor(price / grouping) * grouping;
        const key = groupedPrice.toFixed(precision);

        if (aggregated[key]) {
            aggregated[key] += quantity;
        } else {
            aggregated[key] = quantity;
        }
    }

    return Object.entries(aggregated).map(([price, quantity]) => [price, String(quantity)]);
};


export function OrderBook({ symbol }: { symbol: string }) {
    const { isConnected } = useApi();
    const { toast } = useToast();
    const wsRef = useRef<WebSocket | null>(null);
    const [bids, setBids] = useState<OrderBookLevel[]>([]);
    const [asks, setAsks] = useState<OrderBookLevel[]>([]);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isStreamActive, setIsStreamActive] = useState(false);
    const [isCardOpen, setIsCardOpen] = useState(true);
    const notifiedWallsRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        // If the stream is meant to be inactive, ensure connection is closed.
        if (!isStreamActive) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        // Do not connect if API is disconnected or no symbol is provided.
        if (!isConnected || !symbol) {
            setIsStreamActive(false);
            return;
        }

        setIsConnecting(true);
        notifiedWallsRef.current.clear(); // Clear notifications on new stream

        // Close any existing connection before opening a new one
        if (wsRef.current) {
            wsRef.current.close();
        }

        const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@depth`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log(`Order book WebSocket connected for ${symbol}`);
            setIsConnecting(false);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.e === 'depthUpdate') {
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
            setIsConnecting(false);
            setIsStreamActive(false);
        };

        ws.onclose = () => {
            console.log(`Order book WebSocket disconnected for ${symbol}`);
            setIsConnecting(false);
             if (wsRef.current) {
                setBids([]);
                setAsks([]);
             }
        };

        // Cleanup function for when component unmounts or dependencies change
        return () => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
            wsRef.current = null;
        };

    }, [symbol, isConnected, toast, isStreamActive]);
    
    const { formattedBids, formattedAsks, spread, groupingSize, maxTotal, precision } = useMemo(() => {
        const lastBid = bids.length > 0 ? parseFloat(bids[0][0]) : 0;
        const firstAsk = asks.length > 0 ? parseFloat(asks[0][0]) : 0;
        const midPrice = lastBid > 0 && firstAsk > 0 ? (lastBid + firstAsk) / 2 : 0;
        const calculatedSpread = firstAsk > 0 && lastBid > 0 ? firstAsk - lastBid : 0;

        let grouping = 1.0;
        if (midPrice > 50000) grouping = 10;
        else if (midPrice > 2000) grouping = 1;
        else if (midPrice > 100) grouping = 0.5;
        else if (midPrice > 10) grouping = 0.1;
        else if (midPrice > 0.1) grouping = 0.01;
        else grouping = 0.001;

        const calculatedPrecision = Math.max(0, -Math.floor(Math.log10(grouping)));

        const aggregatedBids = groupLevels(bids, grouping);
        const aggregatedAsks = groupLevels(asks, grouping);
        
        const format = (levels: OrderBookLevel[], isBids: boolean): FormattedOrderBookLevel[] => {
            const sortedLevels = [...levels].sort((a, b) => {
                const priceA = parseFloat(a[0]);
                const priceB = parseFloat(b[0]);
                return isBids ? priceB - priceA : priceA - priceB;
            }).slice(0, 15);

            const totalSize = sortedLevels.reduce((sum, level) => sum + parseFloat(level[1]), 0);
            let cumulativeTotal = 0;

            return sortedLevels.map(level => {
                const price = parseFloat(level[0]);
                const size = parseFloat(level[1]);
                cumulativeTotal += size;
                const isWall = totalSize > 0 && (size / totalSize) > WALL_THRESHOLD_PERCENT;
                return { price, size, total: cumulativeTotal, isWall };
            });
        };

        const fmtdBids = format(aggregatedBids, true);
        const fmtdAsks = format(aggregatedAsks, false);
        const calculatedMaxTotal = Math.max(
            fmtdBids[fmtdBids.length - 1]?.total || 0,
            fmtdAsks[fmtdAsks.length - 1]?.total || 0
        );

        return {
            formattedBids: fmtdBids,
            formattedAsks: fmtdAsks,
            spread: calculatedSpread,
            groupingSize: grouping,
            maxTotal: calculatedMaxTotal,
            precision: calculatedPrecision,
        };

    }, [bids, asks]);

    // Effect to check for new walls and send toast notifications.
    useEffect(() => {
        const checkAndNotify = (levels: FormattedOrderBookLevel[], type: 'Buy' | 'Sell') => {
            if (!isStreamActive) return;

            levels.forEach(level => {
                if (level.isWall && !notifiedWallsRef.current.has(level.price)) {
                    toast({
                        title: `Large ${type} Wall Detected`,
                        description: `A significant order wall of size ${level.size.toFixed(2)} was detected at $${level.price.toFixed(precision)}.`,
                    });
                    notifiedWallsRef.current.add(level.price);
                }
            });
        };

        checkAndNotify(formattedBids, 'Buy');
        checkAndNotify(formattedAsks, 'Sell');

    }, [formattedBids, formattedAsks, toast, isStreamActive, precision]);

    const handleToggleStream = () => {
        if (!isConnected) {
            toast({ title: "API Disconnected", description: "Please connect to the Binance API in settings to start the stream." });
            return;
        }
        setIsStreamActive(prev => !prev);
    }

    const OrderBookRow = ({ level, type }: { level: FormattedOrderBookLevel; type: 'bid' | 'ask' }) => {
        const bgPercentage = maxTotal > 0 ? (level.total / maxTotal) * 100 : 0;
        const bgColor = type === 'bid' ? 'bg-green-500/20' : 'bg-red-500/20';
        const textColor = type === 'bid' ? 'text-green-500' : 'text-red-500';

        return (
            <TableRow className={cn("relative font-mono text-xs", level.isWall && "bg-yellow-500/20 font-bold")}>
                <TableCell className={cn("p-1 text-left", textColor)}>
                    {level.price.toFixed(precision)}
                     <div 
                        className={cn("absolute top-0 bottom-0 -z-10", bgColor, type === 'bid' ? 'right-0' : 'left-0')} 
                        style={{ width: `${bgPercentage}%` }}
                    />
                </TableCell>
                <TableCell className="p-1 text-right">{level.size.toFixed(4)}</TableCell>
                <TableCell className="p-1 text-right">{level.total.toFixed(4)}</TableCell>
            </TableRow>
        );
    }

    return (
        <Card>
            <Collapsible open={isCardOpen} onOpenChange={setIsCardOpen}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Live Order Book</CardTitle>
                        <CardDescription>
                            {`Live depth for ${symbol}. Spread: $${spread.toFixed(precision)}. Grouping: ${groupingSize}`}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleToggleStream} variant={isStreamActive ? "destructive" : "outline"} size="icon" className="h-8 w-8">
                            {isStreamActive ? <StopCircle /> : <Play />}
                            <span className="sr-only">{isStreamActive ? "Stop Stream" : "Start Stream"}</span>
                        </Button>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown className={cn("h-4 w-4 transition-transform", isCardOpen && "rotate-180")} />
                                <span className="sr-only">Toggle</span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent>
                        {isConnecting ? (
                             <Skeleton className="h-[400px] w-full" />
                        ) : !isConnected ? (
                             <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md">
                                <p>Connect API to view order book.</p>
                            </div>
                        ) : !isStreamActive ? (
                            <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md">
                                <p>Order book stream is paused.</p>
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
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
