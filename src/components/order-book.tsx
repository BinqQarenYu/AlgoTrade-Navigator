
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useApi } from '@/context/api-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Button } from './ui/button';
import { ChevronDown, Play, StopCircle, Loader2 } from 'lucide-react';
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

// React.memo helps prevent re-renders if props haven't changed
const OrderBookRow = React.memo(({ level, type, precision }: { level: FormattedOrderBookLevel; type: 'bid' | 'ask'; precision: number }) => {
    return (
        <TableRow 
            data-price-level={level.price}
            className={cn("relative font-mono text-xs hover:bg-muted/80", level.isWall && "bg-yellow-500/20 font-bold")}>
            <TableCell className={cn("p-1 text-left relative", type === 'bid' ? 'text-green-500' : 'text-red-500')}>
                {level.price.toFixed(precision)}
                <div 
                    data-role="bg-bar"
                    className={cn("absolute top-0 bottom-0 h-full -z-10", type === 'bid' ? 'bg-green-500/20 right-0' : 'bg-red-500/20 left-0')} 
                />
            </TableCell>
            <TableCell className="p-1 text-right" data-role="size">{level.size.toFixed(4)}</TableCell>
            <TableCell className="p-1 text-right" data-role="total">{level.total.toFixed(4)}</TableCell>
        </TableRow>
    );
});
OrderBookRow.displayName = 'OrderBookRow';


export function OrderBook({ symbol, onWallsUpdate }: OrderBookProps) {
    const { isConnected } = useApi();
    const wsRef = useRef<WebSocket | null>(null);

    const [isStreamActive, setIsStreamActive] = useState(false);
    const bidsRef = useRef<Map<string, string>>(new Map());
    const asksRef = useRef<Map<string, string>>(new Map());

    // State for the visible, structured data (price levels). This changes infrequently.
    const [formattedBids, setFormattedBids] = useState<FormattedOrderBookLevel[]>([]);
    const [formattedAsks, setFormattedAsks] = useState<FormattedOrderBookLevel[]>([]);
    
    const [spread, setSpread] = useState(0);
    const [groupingSize, setGroupingSize] = useState(0.01);
    const [precision, setPrecision] = useState(2);

    const [isLoading, setIsLoading] = useState(false);
    const [streamError, setStreamError] = useState<string | null>(null);
    const lastUpdateIdRef = useRef<number | null>(null);
    const [isCardOpen, setIsCardOpen] = usePersistentState<boolean>('lab-orderbook-card-open', true);
    const previousWallsRef = useRef<Map<string, Wall>>(new Map());
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const stopStream = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsLoading(false);
        setStreamError(null);
    }, []);

    const connectAndSync = useCallback(async (currentSymbol: string) => {
        setIsLoading(true);
        setStreamError(null);
        lastUpdateIdRef.current = null;
        bidsRef.current.clear();
        asksRef.current.clear();
        setFormattedBids([]);
        setFormattedAsks([]);

        try {
            const snapshot = await getDepthSnapshot(currentSymbol);
            if (!isStreamActive) return;

            lastUpdateIdRef.current = snapshot.lastUpdateId;
            bidsRef.current = new Map(snapshot.bids);
            asksRef.current = new Map(snapshot.asks);
            
            const ws = new WebSocket(`wss://fstream.binance.com/ws/${currentSymbol.toLowerCase()}@depth`);
            wsRef.current = ws;

            ws.onmessage = (event) => {
                const data: OrderBookUpdate = JSON.parse(event.data);
                if (data.e === 'depthUpdate') {
                    if (data.U <= lastUpdateIdRef.current!) return;
                    if (data.pu !== lastUpdateIdRef.current!) {
                        console.warn(`Order book for ${symbol} out of sync. Reconnecting...`);
                        connectAndSync(symbol);
                        return;
                    }
                    data.b.forEach(([p, q]) => { if (parseFloat(q) === 0) bidsRef.current.delete(p); else bidsRef.current.set(p, q); });
                    data.a.forEach(([p, q]) => { if (parseFloat(q) === 0) asksRef.current.delete(p); else asksRef.current.set(p, q); });
                    lastUpdateIdRef.current = data.u;
                }
            };

            ws.onopen = () => setIsLoading(false);
            ws.onerror = () => setStreamError(`Live order book data is not available for ${currentSymbol}.`);
            ws.onclose = () => { if (ws === wsRef.current) console.log(`Order book WebSocket disconnected for ${currentSymbol}`); };

        } catch (error: any) {
            setStreamError(error.message || `Failed to fetch snapshot for ${currentSymbol}.`);
            setIsLoading(false);
            setIsStreamActive(false);
        }
    }, [isStreamActive, symbol]);

    const handleToggleStream = () => {
        setIsStreamActive(prev => !prev);
    };
    
    useEffect(() => {
        if (isStreamActive && isConnected && symbol) {
            connectAndSync(symbol);
        } else {
            stopStream();
        }
        return () => stopStream();
    }, [isStreamActive, isConnected, symbol, connectAndSync, stopStream]);

    // High-frequency update loop for UI values.
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

            const newGrouping = getGroupingAndPrecision(midPrice);
            if (newGrouping.grouping !== groupingSize) setGroupingSize(newGrouping.grouping);
            if (newGrouping.precision !== precision) setPrecision(newGrouping.precision);
            setSpread(firstAsk - lastBid);
            
            const aggregatedBids = groupLevels(bids, newGrouping.grouping, newGrouping.precision);
            const aggregatedAsks = groupLevels(asks, newGrouping.grouping, newGrouping.precision);
            
            let maxTotal = 0;
            const format = (levels: Map<string, number>, isBids: boolean): FormattedOrderBookLevel[] => {
                const sortedLevels = Array.from(levels.entries()).sort((a, b) => {
                    return isBids ? parseFloat(b[0]) - parseFloat(a[0]) : parseFloat(a[0]) - parseFloat(b[0]);
                }).slice(0, 20);

                const totalSize = Array.from(levels.values()).reduce((sum, size) => sum + size, 0);
                let cumulativeTotal = 0;
                const result = sortedLevels.map(([priceStr, size]) => {
                    cumulativeTotal += size;
                    return { price: parseFloat(priceStr), size, total: cumulativeTotal, isWall: totalSize > 0 && (size / totalSize) > WALL_THRESHOLD_PERCENT };
                });
                if(result.length > 0) maxTotal = Math.max(maxTotal, result[result.length - 1].total);
                return result;
            };

            const fmtdBids = format(aggregatedBids, true);
            const fmtdAsks = format(aggregatedAsks, false).reverse();

            // Only update state if the structure (price levels) changes
            if (fmtdBids.length !== formattedBids.length || fmtdBids.some((b, i) => b.price !== formattedBids[i]?.price)) {
                setFormattedBids(fmtdBids);
            }
            if (fmtdAsks.length !== formattedAsks.length || fmtdAsks.some((a, i) => a.price !== formattedAsks[i]?.price)) {
                setFormattedAsks(fmtdAsks);
            }
            
            // Fast, direct DOM updates for dynamic values
            if (tableContainerRef.current) {
                fmtdBids.forEach(level => {
                    const row = tableContainerRef.current!.querySelector(`[data-price-level="${level.price}"]`);
                    if (row) {
                        (row.querySelector('[data-role="size"]') as HTMLElement).textContent = level.size.toFixed(4);
                        (row.querySelector('[data-role="total"]') as HTMLElement).textContent = level.total.toFixed(4);
                        (row.querySelector('[data-role="bg-bar"]') as HTMLElement).style.width = `${(level.total / maxTotal) * 100}%`;
                    }
                });
                fmtdAsks.forEach(level => {
                    const row = tableContainerRef.current!.querySelector(`[data-price-level="${level.price}"]`);
                     if (row) {
                        (row.querySelector('[data-role="size"]') as HTMLElement).textContent = level.size.toFixed(4);
                        (row.querySelector('[data-role="total"]') as HTMLElement).textContent = level.total.toFixed(4);
                        (row.querySelector('[data-role="bg-bar"]') as HTMLElement).style.width = `${(level.total / maxTotal) * 100}%`;
                    }
                });
            }

            // Wall detection logic
            const allWalls: Wall[] = [...fmtdBids, ...fmtdAsks].filter(l => l.isWall).map(l => ({ price: l.price, type: fmtdBids.includes(l) ? 'bid' : 'ask' }));
            const currentWallKeys = new Set(allWalls.map(w => `${w.type}_${w.price}`));
            const spoofs: SpoofedWall[] = [];
            previousWallsRef.current.forEach((wall, key) => {
                if (!currentWallKeys.has(key)) spoofs.push({ ...wall, id: `${key}_${Date.now()}` });
            });
            onWallsUpdate({ walls: allWalls, spoofs });
            const newWallMap = new Map<string, Wall>();
            allWalls.forEach(w => newWallMap.set(`${w.type}_${w.price}`, w));
            previousWallsRef.current = newWallMap;

        }, 500); 
        return () => clearInterval(intervalId);
    }, [isStreamActive, groupingSize, precision]);

    const renderContent = () => {
        if (isLoading) return <Skeleton className="h-[400px] w-full" />;
        if (!isConnected) return <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md"><p>Connect API to view order book.</p></div>;
        if (streamError) return <div className="flex items-center justify-center h-48 text-destructive text-center border border-dashed border-destructive/50 rounded-md p-4"><p>{streamError}</p></div>;
        if (!isStreamActive) return <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md"><p>Order book stream is paused.</p></div>;
        
        return (
            <div className="grid grid-cols-2 gap-4" ref={tableContainerRef}>
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-center">Asks (Sell Orders)</h4>
                    <ScrollArea className="h-[400px] border rounded-md">
                        <Table>
                            <TableHeader><TableRow><TableHead className="h-8 p-1 text-left">Price (USD)</TableHead><TableHead className="h-8 p-1 text-right">Size</TableHead><TableHead className="h-8 p-1 text-right">Total</TableHead></TableRow></TableHeader>
                            <TableBody>{formattedAsks.map(ask => <OrderBookRow key={ask.price} level={ask} type="ask" precision={precision} />)}</TableBody>
                        </Table>
                    </ScrollArea>
                </div>
                 <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-center">Bids (Buy Orders)</h4>
                    <ScrollArea className="h-[400px] border rounded-md">
                        <Table>
                             <TableHeader><TableRow><TableHead className="h-8 p-1 text-left">Price (USD)</TableHead><TableHead className="h-8 p-1 text-right">Size</TableHead><TableHead className="h-8 p-1 text-right">Total</TableHead></TableRow></TableHeader>
                            <TableBody>{formattedBids.map(bid => <OrderBookRow key={bid.price} level={bid} type="bid" precision={precision} />)}</TableBody>
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
                    <div className="flex-1">
                        <CardTitle>Live Order Book</CardTitle>
                        <CardDescription>
                            {`Live depth for ${symbol}. Spread: $${spread.toFixed(precision)}`}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button onClick={handleToggleStream} variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading || !isConnected}>
                            {isLoading ? <Loader2 className="animate-spin" /> : isStreamActive ? <StopCircle className="text-destructive"/> : <Play/>}
                        </Button>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown className={cn("h-4 w-4 transition-transform", isCardOpen && "rotate-180")} />
                            </Button>
                        </CollapsibleTrigger>
                    </div>
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

    