

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
import { ChevronDown } from 'lucide-react';
import type { Wall, SpoofedWall } from '@/lib/types';
import { getDepthSnapshot } from '@/lib/binance-service';

// Types for the order book
type OrderBookLevel = [string, string]; // [price, quantity]
type OrderBookUpdate = { b: OrderBookLevel[], a: OrderBookLevel[], U: number, u: number, pu: number };


interface FormattedOrderBookLevel {
    price: number;
    size: number;
    total: number;
    isWall: boolean;
}

interface OrderBookProps {
    symbol: string;
    isStreamActive: boolean;
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

const getGroupingAndPrecision = (price: number): { grouping: number; precision: number } => {
    if (price > 10000) return { grouping: 10, precision: 2 };
    if (price > 1000) return { grouping: 0.5, precision: 2 };
    if (price > 10) return { grouping: 0.05, precision: 4 };
    if (price > 0.1) return { grouping: 0.001, precision: 6 };
    if (price > 0.0001) return { grouping: 0.000001, precision: 8 };
    return { grouping: 0.00000001, precision: 10 };
};

const groupLevels = (levels: Map<string, string>, grouping: number, precision: number): Map<string, number> => {
    const aggregated = new Map<string, number>();
    if (grouping <= 0) {
        for (const [priceStr, quantityStr] of levels.entries()) {
            aggregated.set(priceStr, parseFloat(quantityStr));
        }
        return aggregated;
    }
    
    for (const [priceStr, quantityStr] of levels.entries()) {
        const price = parseFloat(priceStr);
        const quantity = parseFloat(quantityStr);
        const groupedPrice = Math.floor(price / grouping) * grouping;
        const key = groupedPrice.toFixed(precision);

        aggregated.set(key, (aggregated.get(key) || 0) + quantity);
    }
    return aggregated;
};


export function OrderBook({ symbol, isStreamActive, onWallsUpdate }: OrderBookProps) {
    const { isConnected } = useApi();
    const { toast } = useToast();
    const wsRef = useRef<WebSocket | null>(null);
    const [bids, setBids] = useState<Map<string, string>>(new Map());
    const [asks, setAsks] = useState<Map<string, string>>(new Map());
    const [isConnecting, setIsConnecting] = useState(false);
    const [streamError, setStreamError] = useState<string | null>(null);
    const lastUpdateIdRef = useRef<number | null>(null);
    const [isCardOpen, setIsCardOpen] = usePersistentState<boolean>('lab-orderbook-card-open', true);
    const previousWallsRef = useRef<Map<string, Wall>>(new Map());

    const updateQueueRef = useRef<OrderBookUpdate[]>([]);

    // This effect runs the batch update processor.
    useEffect(() => {
        const processQueue = () => {
            if (updateQueueRef.current.length === 0) return;

            const updatesToProcess = [...updateQueueRef.current];
            updateQueueRef.current = [];

            let lastValidUpdateId = lastUpdateIdRef.current;

            setBids(prevBids => {
                const newBids = new Map(prevBids);
                for (const data of updatesToProcess) {
                    if (data.U <= lastValidUpdateId!) continue;
                    if (data.pu !== lastValidUpdateId) {
                         console.warn(`Order book for ${symbol} out of sync. Re-syncing...`);
                         // Trigger a full re-sync without relying on a full component re-mount
                         connectAndSync(symbol);
                         return prevBids; // Discard this batch
                    }
                    data.b.forEach(([p, q]) => {
                        if (parseFloat(q) === 0) newBids.delete(p); else newBids.set(p, q);
                    });
                    lastValidUpdateId = data.u;
                }
                return newBids;
            });
            
            setAsks(prevAsks => {
                const newAsks = new Map(prevAsks);
                 for (const data of updatesToProcess) {
                    if (data.U <= lastValidUpdateId!) continue;
                    if (data.pu !== lastValidUpdateId) return prevAsks;
                    data.a.forEach(([p, q]) => {
                        if (parseFloat(q) === 0) newAsks.delete(p); else newAsks.set(p, q);
                    });
                    lastValidUpdateId = data.u;
                 }
                return newAsks;
            });

            lastUpdateIdRef.current = lastValidUpdateId;
        };

        const intervalId = setInterval(processQueue, 250); // Process queue every 250ms
        return () => clearInterval(intervalId);
    }, [symbol]); // Re-create processor if symbol changes


    const connectAndSync = useCallback(async (currentSymbol: string) => {
        let snapshotLoaded = false;
        
        const ws = new WebSocket(`wss://fstream.binance.com/ws/${currentSymbol.toLowerCase()}@depth`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            const data: OrderBookUpdate = JSON.parse(event.data);
            if (data.e !== 'depthUpdate') return;

            if (snapshotLoaded) {
                updateQueueRef.current.push(data);
            }
        };

        ws.onopen = () => console.log(`Order book stream for ${currentSymbol} connected.`);
        ws.onerror = () => {
            setStreamError(`Live order book data is not available for ${currentSymbol}. The symbol may be invalid or not supported for this data stream.`);
            setIsConnecting(false);
            if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
        };
        ws.onclose = () => {
            console.log(`Order book WebSocket disconnected for ${currentSymbol}`);
        };

        try {
            const snapshot = await getDepthSnapshot(currentSymbol);
            if (ws.readyState !== WebSocket.OPEN) return;

            lastUpdateIdRef.current = snapshot.lastUpdateId;
            setBids(new Map(snapshot.bids));
            setAsks(new Map(snapshot.asks));
            
            snapshotLoaded = true;
            setIsConnecting(false);
            console.log(`Order book for ${currentSymbol} is now in sync.`);
        } catch (error: any) {
            const errorMsg = error.message.includes('Binance API Error') ? error.message : `Failed to load initial depth for ${currentSymbol}.`;
            setStreamError(errorMsg);
            toast({ title: 'Order Book Error', description: errorMsg, variant: 'destructive' });
            setIsConnecting(false);
            if (ws.readyState === WebSocket.OPEN) { ws.onclose = null; ws.close(); }
        }
    }, [toast]);


    useEffect(() => {
        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.close();
        }
        wsRef.current = null;
        updateQueueRef.current = []; // Clear queue on symbol change

        setBids(new Map());
        setAsks(new Map());
        setStreamError(null);
        lastUpdateIdRef.current = null;
        
        if (isStreamActive && isConnected && symbol) {
            setIsConnecting(true);
            connectAndSync(symbol);
        } else {
            setIsConnecting(false);
        }

        return () => {
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [isStreamActive, isConnected, symbol, connectAndSync]);
    
    const { formattedBids, formattedAsks, spread, groupingSize, maxTotal, precision } = useMemo(() => {
        if (bids.size === 0 || asks.size === 0) {
            return { formattedBids: [], formattedAsks: [], spread: 0, groupingSize: 0.01, maxTotal: 0, precision: 2 };
        }
        
        const sortedBidsPrices = Array.from(bids.keys()).map(parseFloat).sort((a,b) => b-a);
        const sortedAsksPrices = Array.from(asks.keys()).map(parseFloat).sort((a,b) => a-b);
        
        if (sortedBidsPrices.length === 0 || sortedAsksPrices.length === 0) {
             return { formattedBids: [], formattedAsks: [], spread: 0, groupingSize: 0.01, maxTotal: 0, precision: 2 };
        }

        const lastBid = sortedBidsPrices[0];
        const firstAsk = sortedAsksPrices[0];
        const midPrice = (lastBid + firstAsk) / 2;
        
        const { grouping, precision: calculatedPrecision } = getGroupingAndPrecision(midPrice);
        const calculatedSpread = firstAsk - lastBid;

        const aggregatedBids = groupLevels(bids, grouping, calculatedPrecision);
        const aggregatedAsks = groupLevels(asks, grouping, calculatedPrecision);
        
        const format = (levels: Map<string, number>, isBids: boolean): FormattedOrderBookLevel[] => {
            const sortedLevels = Array.from(levels.entries()).sort((a, b) => {
                const priceA = parseFloat(a[0]);
                const priceB = parseFloat(b[0]);
                return isBids ? priceB - priceA : priceA - priceB;
            }).slice(0, 15);

            const totalSize = Array.from(levels.values()).reduce((sum, size) => sum + size, 0);
            let cumulativeTotal = 0;

            return sortedLevels.map(([priceStr, size]) => {
                const price = parseFloat(priceStr);
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
        
        if (spoofs.length > 0) {
            onWallsUpdate({ walls: allWalls, spoofs: spoofs });
        } else {
            onWallsUpdate({ walls: allWalls, spoofs: [] });
        }


        // Update the reference for the next comparison
        const newWallMap = new Map<string, Wall>();
        allWalls.forEach(w => newWallMap.set(`${w.type}_${w.price}`, w));
        previousWallsRef.current = newWallMap;

    }, [formattedBids, formattedAsks, isStreamActive, onWallsUpdate]);


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

    const renderContent = () => {
        if (isConnecting) return <Skeleton className="h-[400px] w-full" />;
        if (!isConnected) {
            return (
                <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md">
                    <p>Connect API to view order book.</p>
                </div>
            );
        }
        if (streamError) {
             return (
                <div className="flex items-center justify-center h-48 text-destructive text-center border border-dashed border-destructive/50 rounded-md p-4">
                    <p>{streamError}</p>
                </div>
            );
        }
        if (!isStreamActive) {
            return (
                <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md">
                    <p>Order book stream is paused.</p>
                </div>
            );
        }
        return (
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
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isCardOpen && "rotate-180")} />
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent>
                        {renderContent()}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
