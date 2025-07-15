
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

interface FormattedOrderBookLevel {
    price: string;
    size: string;
    total: string;
    isWall: boolean;
}

interface OrderBookProps {
    symbol: string;
    onWallsUpdate?: (events: { walls: Wall[]; spoofs: SpoofedWall[] }) => void;
}

const WALL_THRESHOLD_PERCENT = 0.05; // 5% of visible depth
const MAX_ROWS = 25; // Display top 25 levels

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

export function OrderBook({ symbol, onWallsUpdate }: OrderBookProps) {
    const { isConnected } = useApi();
    const [isStreaming, setIsStreaming] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isCardOpen, setIsCardOpen] = usePersistentState<boolean>(`lab-orderbook-card-open-${symbol}`, true);
    
    const wsRef = useRef<WebSocket | null>(null);
    const bidsRef = useRef<Map<string, number>>(new Map());
    const asksRef = useRef<Map<string, number>>(new Map());
    const tableRef = useRef<HTMLDivElement>(null);
    const lastUpdateIdRef = useRef<number>(0);
    const precisionRef = useRef(2);
    const [spread, setSpread] = useState(0);

    const handleToggleStream = () => {
        setIsStreaming(!isStreaming);
    };

    const updateDOM = useCallback(() => {
        if (!tableRef.current) return;

        const bidsMap = bidsRef.current;
        const asksMap = asksRef.current;

        const sortedBids = Array.from(bidsMap.entries()).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0])).slice(0, MAX_ROWS);
        const sortedAsks = Array.from(asksMap.entries()).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).slice(0, MAX_ROWS);

        let bidTotal = 0;
        let askTotal = 0;
        const totalBidSize = sortedBids.reduce((sum, [, size]) => sum + size, 0);
        const totalAskSize = sortedAsks.reduce((sum, [, size]) => sum + size, 0);
        const maxTotal = Math.max(totalBidSize, totalAskSize);

        for (let i = 0; i < MAX_ROWS; i++) {
            // Update Bids
            const bidRow = tableRef.current.querySelector(`#bid-row-${i}`);
            if (bidRow) {
                if (sortedBids[i]) {
                    const [price, size] = sortedBids[i];
                    bidTotal += size;
                    const isWall = totalBidSize > 0 && (size / totalBidSize) > WALL_THRESHOLD_PERCENT;
                    const bgWidth = maxTotal > 0 ? (bidTotal / maxTotal) * 100 : 0;
                    
                    const priceCell = bidRow.children[0] as HTMLElement;
                    priceCell.innerText = parseFloat(price).toFixed(precisionRef.current);
                    (bidRow.children[1] as HTMLElement).innerText = size.toFixed(4);
                    (bidRow.children[2] as HTMLElement).innerText = bidTotal.toFixed(4);
                    
                    priceCell.style.background = `linear-gradient(to left, rgba(34, 197, 94, 0.2) ${bgWidth}%, transparent ${bgWidth}%)`;
                    bidRow.className = cn("relative font-mono text-xs", isWall && "bg-yellow-500/20 font-bold");
                } else {
                     (bidRow.children[0] as HTMLElement).innerText = '-';
                     (bidRow.children[1] as HTMLElement).innerText = '-';
                     (bidRow.children[2] as HTMLElement).innerText = '-';
                }
            }

            // Update Asks
            const askRow = tableRef.current.querySelector(`#ask-row-${i}`);
            if (askRow) {
                if (sortedAsks[i]) {
                    const [price, size] = sortedAsks[i];
                    askTotal += size;
                    const isWall = totalAskSize > 0 && (size / totalAskSize) > WALL_THRESHOLD_PERCENT;
                    const bgWidth = maxTotal > 0 ? (askTotal / maxTotal) * 100 : 0;
                    
                    const priceCell = askRow.children[0] as HTMLElement;
                    priceCell.innerText = parseFloat(price).toFixed(precisionRef.current);
                    (askRow.children[1] as HTMLElement).innerText = size.toFixed(4);
                    (askRow.children[2] as HTMLElement).innerText = askTotal.toFixed(4);

                    priceCell.style.background = `linear-gradient(to right, rgba(239, 68, 68, 0.2) ${bgWidth}%, transparent ${bgWidth}%)`;
                    askRow.className = cn("relative font-mono text-xs", isWall && "bg-yellow-500/20 font-bold");
                } else {
                     (askRow.children[0] as HTMLElement).innerText = '-';
                     (askRow.children[1] as HTMLElement).innerText = '-';
                     (askRow.children[2] as HTMLElement).innerText = '-';
                }
            }
        }
    }, []);

    useEffect(() => {
        if (!isStreaming || !isConnected) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        const connect = async () => {
            setIsLoading(true);
            try {
                const snapshot = await getDepthSnapshot(symbol);
                if (!snapshot || !snapshot.bids || !snapshot.asks) {
                    throw new Error("Invalid snapshot data received.");
                }
                const firstPrice = parseFloat(snapshot.bids[0]?.[0] || '0');
                const { precision } = getGroupingAndPrecision(firstPrice);
                precisionRef.current = precision;

                bidsRef.current = new Map(snapshot.bids.map(([p, q]: OrderBookLevel) => [p, parseFloat(q)]));
                asksRef.current = new Map(snapshot.asks.map(([p, q]: OrderBookLevel) => [p, parseFloat(q)]));
                lastUpdateIdRef.current = snapshot.lastUpdateId;
                
                const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@depth`);
                wsRef.current = ws;

                ws.onopen = () => setIsLoading(false);
                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.u > lastUpdateIdRef.current) {
                        data.b.forEach(([price, qty]: OrderBookLevel) => {
                            const quantity = parseFloat(qty);
                            if (quantity === 0) bidsRef.current.delete(price);
                            else bidsRef.current.set(price, quantity);
                        });
                        data.a.forEach(([price, qty]: OrderBookLevel) => {
                            const quantity = parseFloat(qty);
                            if (quantity === 0) asksRef.current.delete(price);
                            else asksRef.current.set(price, quantity);
                        });
                        lastUpdateIdRef.current = data.u;

                        const bidPrices = Array.from(bidsRef.current.keys()).map(p => parseFloat(p));
                        const askPrices = Array.from(asksRef.current.keys()).map(p => parseFloat(p));
                        
                        if(bidPrices.length > 0 && askPrices.length > 0) {
                            const bestBid = Math.max(...bidPrices);
                            const bestAsk = Math.min(...askPrices);
                            setSpread(bestAsk - bestBid);
                        }
                    }
                };
            } catch (e) {
                console.error("Failed to connect order book:", e);
                setIsLoading(false);
                setIsStreaming(false);
            }
        };

        connect();
        
        const renderInterval = setInterval(updateDOM, 500); 

        return () => {
            clearInterval(renderInterval);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [isStreaming, isConnected, symbol, updateDOM]);


    const renderTableBody = (type: 'bid' | 'ask') => {
        return (
            <TableBody>
                {Array.from({ length: MAX_ROWS }).map((_, i) => (
                    <TableRow key={`${type}-${i}`} id={`${type}-row-${i}`} className="relative font-mono text-xs">
                        <TableCell className={cn("p-1 text-left", type === 'bid' ? 'text-green-500' : 'text-red-500')}>-</TableCell>
                        <TableCell className="p-1 text-right">-</TableCell>
                        <TableCell className="p-1 text-right">-</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        );
    };

    return (
        <Card>
            <Collapsible open={isCardOpen} onOpenChange={setIsCardOpen}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex-1">
                        <CardTitle>Live Order Book</CardTitle>
                        <CardDescription>
                            {isStreaming ? `Live feed for ${symbol}. Spread: $${spread.toFixed(precisionRef.current)}` : `Feed for ${symbol} is stopped.`}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleToggleStream} variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading || !isConnected}>
                            {isLoading ? <Loader2 className="animate-spin" /> : isStreaming ? <StopCircle /> : <Play />}
                        </Button>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown className={cn("h-4 w-4 transition-transform", isCardOpen && "rotate-180")} />
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent ref={tableRef}>
                        {isLoading ? <Skeleton className="h-[400px] w-full" /> : 
                          !isConnected ? <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md"><p>Connect API to view order book.</p></div> :
                        (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold text-center">Asks (Sell Orders)</h4>
                                    <ScrollArea className="h-[400px] border rounded-md">
                                        <Table>
                                            <TableHeader><TableRow><TableHead className="h-8 p-1 text-left">Price (USD)</TableHead><TableHead className="h-8 p-1 text-right">Size</TableHead><TableHead className="h-8 p-1 text-right">Total</TableHead></TableRow></TableHeader>
                                            {renderTableBody('ask')}
                                        </Table>
                                    </ScrollArea>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold text-center">Bids (Buy Orders)</h4>
                                    <ScrollArea className="h-[400px] border rounded-md">
                                        <Table>
                                            <TableHeader><TableRow><TableHead className="h-8 p-1 text-left">Price (USD)</TableHead><TableHead className="h-8 p-1 text-right">Size</TableHead><TableHead className="h-8 p-1 text-right">Total</TableHead></TableRow></TableHeader>
                                            {renderTableBody('bid')}
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
