

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
type OrderBookUpdate = { e: 'depthUpdate', E: number, s: string, U: number, u: number, b: OrderBookLevel[], a: OrderBookLevel[] };


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

  return [state, setState];
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

const OrderBookRow = React.memo(({ level, type, maxTotal, precision }: { level: FormattedOrderBookLevel; type: 'bid' | 'ask'; maxTotal: number; precision: number }) => {
    const bgPercentage = maxTotal > 0 ? (level.total / maxTotal) * 100 : 0;
    const bgColor = type === 'bid' ? 'bg-green-500/20' : 'bg-red-500/20';
    const textColor = type === 'bid' ? 'text-green-500' : 'text-red-500';

    return (
        <TableRow className={cn("relative font-mono text-xs hover:bg-muted/80", level.isWall && "bg-yellow-500/20 font-bold")}>
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
});
OrderBookRow.displayName = 'OrderBookRow';


export function OrderBook({ symbol, isStreamActive, onWallsUpdate }: OrderBookProps) {
    const { isConnected } = useApi();
    const { toast } = useToast();
    const wsRef = useRef<WebSocket | null>(null);

    const bidsRef = useRef<Map<string, string>>(new Map());
    const asksRef = useRef<Map<string, string>>(new Map());
    
    // --- State for the UI ---
    // These refs hold the data that is actually rendered. They are updated less frequently.
    const formattedBidsRef = useRef<FormattedOrderBookLevel[]>([]);
    const formattedAsksRef = useRef<FormattedOrderBookLevel[]>([]);
    const [lastRenderTime, setLastRenderTime] = useState(0); // This state's only job is to trigger re-renders.
    const [spread, setSpread] = useState(0);
    const [groupingSize, setGroupingSize] = useState(0.01);
    const [precision, setPrecision] = useState(2);
    const [maxTotal, setMaxTotal] = useState(0);

    const [isLoading, setIsLoading] = useState(false);
    const [streamError, setStreamError] = useState<string | null>(null);
    const lastUpdateIdRef = useRef<number | null>(null);
    const updateQueueRef = useRef<OrderBookUpdate[]>([]);
    const [isCardOpen, setIsCardOpen] = usePersistentState<boolean>('lab-orderbook-card-open', true);
    const previousWallsRef = useRef<Map<string, Wall>>(new Map());

    
    const connectAndSync = useCallback(async (currentSymbol: string) => {
        setIsLoading(true);
        setStreamError(null);
        updateQueueRef.current = [];
        lastUpdateIdRef.current = null;
        bidsRef.current.clear();
        asksRef.current.clear();
        formattedBidsRef.current = [];
        formattedAsksRef.current = [];
        setLastRenderTime(0);

        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.close();
            wsRef.current = null;
        }

        try {
            const snapshot = await getDepthSnapshot(currentSymbol);
            
            bidsRef.current = new Map(snapshot.bids);
            asksRef.current = new Map(snapshot.asks);
            
            const updatesToApply = updateQueueRef.current.filter(update => update.u > snapshot.lastUpdateId);

            updatesToApply.forEach(data => {
                data.b.forEach(([p, q]) => { if (parseFloat(q) === 0) bidsRef.current.delete(p); else bidsRef.current.set(p, q); });
                data.a.forEach(([p, q]) => { if (parseFloat(q) === 0) asksRef.current.delete(p); else asksRef.current.set(p, q); });
            });
            
            lastUpdateIdRef.current = updatesToApply.length > 0
                ? updatesToApply[updatesToApply.length - 1].u
                : snapshot.lastUpdateId;
                
            updateQueueRef.current = [];

        } catch (error: any) {
            setStreamError(error.message || `Failed to fetch snapshot for ${currentSymbol}.`);
            setIsLoading(false);
            return;
        }

        const ws = new WebSocket(`wss://fstream.binance.com/ws/${currentSymbol.toLowerCase()}@depth`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            const data: OrderBookUpdate = JSON.parse(event.data);
            if (data.e === 'depthUpdate') {
                if (lastUpdateIdRef.current === null) {
                    updateQueueRef.current.push(data);
                    return;
                }
                if (data.U > lastUpdateIdRef.current! + 1 && data.pu !== lastUpdateIdRef.current!) {
                     console.warn(`Order book for ${symbol} out of sync. Re-syncing...`);
                    connectAndSync(symbol);
                    return;
                }
                 if (data.u <= lastUpdateIdRef.current!) return;
                
                data.b.forEach(([p, q]) => { if (parseFloat(q) === 0) bidsRef.current.delete(p); else bidsRef.current.set(p, q); });
                data.a.forEach(([p, q]) => { if (parseFloat(q) === 0) asksRef.current.delete(p); else asksRef.current.set(p, q); });
                lastUpdateIdRef.current = data.u;
            }
        };

        ws.onopen = () => { setIsLoading(false); }
        ws.onerror = () => setStreamError(`Live order book data is not available for ${currentSymbol}.`);
        ws.onclose = () => console.log(`Order book WebSocket disconnected for ${currentSymbol}`);
    }, [symbol]);

    useEffect(() => {
        if (isStreamActive && isConnected && symbol) {
            connectAndSync(symbol);
        }

        return () => {
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
        };
    }, [isStreamActive, isConnected, symbol, connectAndSync]);

    // UI render loop
    useEffect(() => {
        if (!isStreamActive) return;
        const intervalId = setInterval(() => {
            const bids = bidsRef.current;
            const asks = asksRef.current;
            if (bids.size === 0 || asks.size === 0) return;

            const sortedBidsPrices = Array.from(bids.keys()).map(parseFloat).sort((a, b) => b - a);
            const sortedAsksPrices = Array.from(asks.keys()).map(parseFloat).sort((a, b) => a - b);
            if (sortedBidsPrices.length === 0 || sortedAsksPrices.length === 0) return;

            const lastBid = sortedBidsPrices[0];
            const firstAsk = sortedAsksPrices[0];
            const midPrice = (lastBid + firstAsk) / 2;

            const { grouping, precision: calculatedPrecision } = getGroupingAndPrecision(midPrice);
            setSpread(firstAsk - lastBid);
            setGroupingSize(grouping);
            setPrecision(calculatedPrecision);
            
            const aggregatedBids = groupLevels(bids, grouping, calculatedPrecision);
            const aggregatedAsks = groupLevels(asks, grouping, calculatedPrecision);
            
            const format = (levels: Map<string, number>, isBids: boolean): FormattedOrderBookLevel[] => {
                const sortedLevels = Array.from(levels.entries()).sort((a, b) => {
                    return isBids ? parseFloat(b[0]) - parseFloat(a[0]) : parseFloat(a[0]) - parseFloat(b[0]);
                }).slice(0, 20);

                const totalSize = Array.from(levels.values()).reduce((sum, size) => sum + size, 0);
                let cumulativeTotal = 0;
                return sortedLevels.map(([priceStr, size]) => {
                    cumulativeTotal += size;
                    return {
                        price: parseFloat(priceStr), size, total: cumulativeTotal,
                        isWall: totalSize > 0 && (size / totalSize) > WALL_THRESHOLD_PERCENT,
                    };
                });
            };

            const fmtdBids = format(aggregatedBids, true);
            const fmtdAsks = format(aggregatedAsks, false);
            
            formattedBidsRef.current = fmtdBids;
            formattedAsksRef.current = fmtdAsks;
            
            const calculatedMaxTotal = Math.max(
                fmtdBids[fmtdBids.length-1]?.total || 0,
                fmtdAsks[fmtdAsks.length-1]?.total || 0
            );
            setMaxTotal(calculatedMaxTotal);
            setLastRenderTime(Date.now()); // Trigger the render
        }, 500); 
        return () => clearInterval(intervalId);
    }, [isStreamActive]);
    
    // Effect to report walls and detect spoofs
    useEffect(() => {
        if (!isStreamActive) {
            onWallsUpdate({ walls: [], spoofs: [] });
            previousWallsRef.current.clear();
            return;
        }

        const allWalls: Wall[] = [
            ...formattedBidsRef.current.filter(b => b.isWall).map(b => ({ price: b.price, type: 'bid' as const })),
            ...formattedAsksRef.current.filter(a => a.isWall).map(a => ({ price: a.price, type: 'ask' as const }))
        ];

        const currentWallKeys = new Set(allWalls.map(w => `${w.type}_${w.price}`));
        const spoofs: SpoofedWall[] = [];
        previousWallsRef.current.forEach((wall, key) => {
            if (!currentWallKeys.has(key)) {
                spoofs.push({ ...wall, id: `${key}_${Date.now()}` });
            }
        });
        
        if (spoofs.length > 0) {
            onWallsUpdate({ walls: allWalls, spoofs: spoofs });
        } else {
            onWallsUpdate({ walls: allWalls, spoofs: [] });
        }

        const newWallMap = new Map<string, Wall>();
        allWalls.forEach(w => newWallMap.set(`${w.type}_${w.price}`, w));
        previousWallsRef.current = newWallMap;

    }, [lastRenderTime, isStreamActive, onWallsUpdate]); // Depends on the render trigger

    const renderContent = () => {
        if (isLoading) return <Skeleton className="h-[400px] w-full" />;
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
                            <TableHeader><TableRow>
                                <TableHead className="h-8 p-1 text-left text-muted-foreground">Price (USD)</TableHead>
                                <TableHead className="h-8 p-1 text-right text-muted-foreground">Size</TableHead>
                                <TableHead className="h-8 p-1 text-right text-muted-foreground">Total</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {formattedBidsRef.current.map(bid => <OrderBookRow key={bid.price} level={bid} type="bid" maxTotal={maxTotal} precision={precision} />)}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-center">Asks (Sell Orders)</h4>
                    <ScrollArea className="h-[400px] border rounded-md">
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead className="h-8 p-1 text-left text-muted-foreground">Price (USD)</TableHead>
                                <TableHead className="h-8 p-1 text-right text-muted-foreground">Size</TableHead>
                                <TableHead className="h-8 p-1 text-right text-muted-foreground">Total</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {formattedAsksRef.current.map(ask => <OrderBookRow key={ask.price} level={ask} type="ask" maxTotal={maxTotal} precision={precision} />)}
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
