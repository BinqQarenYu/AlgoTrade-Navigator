
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import type { Wall, SpoofedWall } from '@/lib/types';
import { getDepthSnapshot } from '@/lib/binance-service';

// Types for the order book
type OrderBookLevel = [string, string]; // [price, quantity]

interface FormattedOrderBookLevel {
    price: number;
    size: number;
    total: number;
    isWall: boolean;
}

interface OrderBookProps {
    symbol: string;
    onWallsUpdate: (events: { walls: Wall[]; spoofs: SpoofedWall[] }) => void;
}

const WALL_THRESHOLD_PERCENT = 0.05; // 5% of visible depth

const usePersistentState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        if (isMounted) {
          setState(JSON.parse(item));
        }
      }
    } catch (e) {
      console.error('Failed to parse stored state', e);
    } finally {
      if (isMounted) {
        setIsHydrated(true);
      }
    }
    return () => { isMounted = false; };
  }, [key]);

  useEffect(() => {
    if (isHydrated) {
      window.localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state, isHydrated]);

  return [isHydrated ? state : defaultValue, setState];
};

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


export function OrderBook({ symbol, onWallsUpdate }: OrderBookProps) {
    const { isConnected } = useApi();
    const { toast } = useToast();
    const wsRef = useRef<WebSocket | null>(null);
    const [bids, setBids] = useState<Map<string, string>>(new Map());
    const [asks, setAsks] = useState<Map<string, string>>(new Map());
    const [isConnecting, setIsConnecting] = useState(false);
    const [isStreamActive, setIsStreamActive] = usePersistentState<boolean>('lab-orderbook-stream-active', false);
    const [isCardOpen, setIsCardOpen] = usePersistentState<boolean>('lab-orderbook-card-open', true);
    
    const lastUpdateIdRef = useRef<number | null>(null);
    const previousWallsRef = useRef<Map<string, Wall>>(new Map());
    
    const applyUpdates = useCallback((updates: any[]) => {
        updates.forEach(update => {
            setBids(prevBids => {
                const newBids = new Map(prevBids);
                update.b.forEach(([p, q]: OrderBookLevel) => {
                    if (parseFloat(q) === 0) {
                        newBids.delete(p);
                    } else {
                        newBids.set(p, q);
                    }
                });
                return newBids;
            });
            setAsks(prevAsks => {
                const newAsks = new Map(prevAsks);
                update.a.forEach(([p, q]: OrderBookLevel) => {
                    if (parseFloat(q) === 0) {
                        newAsks.delete(p);
                    } else {
                        newAsks.set(p, q);
                    }
                });
                return newAsks;
            });
        });
    }, []);

    const connectAndSync = useCallback(async (currentSymbol: string) => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        setIsConnecting(true);
        lastUpdateIdRef.current = null;
        setBids(new Map());
        setAsks(new Map());
        
        let eventQueue: any[] = [];
        let snapshotLoaded = false;

        const ws = new WebSocket(`wss://fstream.binance.com/ws/${currentSymbol.toLowerCase()}@depth`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.e !== 'depthUpdate') return;

            if (!snapshotLoaded) {
                eventQueue.push(data);
                return;
            }

            if (data.U <= lastUpdateIdRef.current!) {
                return;
            }
            
            if (data.pu === lastUpdateIdRef.current) {
                applyUpdates([data]);
                lastUpdateIdRef.current = data.u;
            } else {
                console.warn(`Order book for ${currentSymbol} out of sync. Re-syncing...`);
                connectAndSync(currentSymbol);
            }
        };

        ws.onopen = () => {
            console.log(`Order book stream for ${currentSymbol} connected.`);
        };
        
        ws.onerror = () => {
            console.error(`Order book WebSocket error for ${currentSymbol}.`);
            toast({ title: 'Stream Error', variant: 'destructive' });
            setIsConnecting(false);
            setIsStreamActive(false);
        };

        ws.onclose = () => {
            console.log(`Order book WebSocket disconnected for ${currentSymbol}`);
        };

        try {
            const snapshot = await getDepthSnapshot(currentSymbol);
            if (ws.readyState !== WebSocket.OPEN) return; // Connection may have closed

            setBids(new Map(snapshot.bids));
            setAsks(new Map(snapshot.asks));
            lastUpdateIdRef.current = snapshot.lastUpdateId;
            snapshotLoaded = true;
            setIsConnecting(false);

            // Process any events that were queued while snapshot was loading
            const updatesToApply = eventQueue.filter(update => update.U > lastUpdateIdRef.current!);
            if (updatesToApply.length > 0) {
                 applyUpdates(updatesToApply);
            }
            eventQueue = [];
            
            console.log(`Order book for ${currentSymbol} is now in sync.`);
        } catch (error: any) {
            toast({ title: 'Order Book Error', description: `Failed to load initial depth: ${error.message}`, variant: 'destructive' });
            setIsConnecting(false);
            setIsStreamActive(false);
            ws.close();
        }
    }, [applyUpdates, setIsStreamActive, toast]);


    useEffect(() => {
        if (isStreamActive && isConnected && symbol) {
            connectAndSync(symbol);
        }

        return () => {
            if (wsRef.current) {
                wsRef.current.onclose = null; // Prevent onclose logic from running on manual cleanup
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [isStreamActive, isConnected, symbol, connectAndSync]);
    
    const { formattedBids, formattedAsks, spread, groupingSize, maxTotal, precision } = useMemo(() => {
        const bidLevels: OrderBookLevel[] = Array.from(bids.entries());
        const askLevels: OrderBookLevel[] = Array.from(asks.entries());
        
        const sortedBids = [...bidLevels].sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
        const sortedAsks = [...askLevels].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
        
        const lastBid = sortedBids.length > 0 ? parseFloat(sortedBids[0][0]) : 0;
        const firstAsk = sortedAsks.length > 0 ? parseFloat(sortedAsks[0][0]) : 0;
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

        const aggregatedBids = groupLevels(sortedBids, grouping);
        const aggregatedAsks = groupLevels(sortedAsks, grouping);
        
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

    // Effect to report walls and detect spoofs
    useEffect(() => {
        if (!isStreamActive) {
            onWallsUpdate({ walls: [], spoofs: [] });
            previousWallsRef.current.clear();
            return;
        }

        const allWalls: Wall[] = [
            ...formattedBids.filter(b => b.isWall).map(b => ({ price: b.price, type: 'bid' as const })),
            ...formattedAsks.filter(a => a.isWall).map(a => ({ price: a.price, type: 'ask' as const }))
        ];

        const currentWallKeys = new Set(allWalls.map(w => `${w.type}_${w.price}`));
        
        const spoofs: SpoofedWall[] = [];
        previousWallsRef.current.forEach((wall, key) => {
            if (!currentWallKeys.has(key)) {
                // This wall was present before but is now gone -> potential spoof
                spoofs.push({ ...wall, id: `${key}_${Date.now()}` });
            }
        });
        
        onWallsUpdate({ walls: allWalls, spoofs: spoofs });

        // Update the reference for the next comparison
        const newWallMap = new Map<string, Wall>();
        allWalls.forEach(w => newWallMap.set(`${w.type}_${w.price}`, w));
        previousWallsRef.current = newWallMap;

    }, [formattedBids, formattedAsks, isStreamActive, onWallsUpdate]);


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
                <TableCell className={cn("p-1 text-left relative", textColor)}>
                    {level.price.toFixed(precision)}
                     <div 
                        className={cn("absolute top-0 bottom-0 h-full -z-10", bgColor, type === 'bid' ? 'right-0' : 'left-0')} 
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
