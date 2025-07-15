
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
import { ChevronDown, Play, Loader2, RefreshCw } from 'lucide-react';
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

const groupLevels = (levels: OrderBookLevel[], grouping: number, precision: number): Map<string, number> => {
    const aggregated = new Map<string, number>();
    for (const [priceStr, quantityStr] of levels) {
        const price = parseFloat(priceStr);
        const quantity = parseFloat(quantityStr);
        const groupedPrice = Math.floor(price / grouping) * grouping;
        const key = groupedPrice.toFixed(precision);
        aggregated.set(key, (aggregated.get(key) || 0) + quantity);
    }
    return aggregated;
};

const OrderBookRow = React.memo(({ level, type, precision, maxTotal }: { level: FormattedOrderBookLevel; type: 'bid' | 'ask'; precision: number; maxTotal: number }) => {
    const bgWidth = maxTotal > 0 ? (level.total / maxTotal) * 100 : 0;
    return (
        <TableRow className={cn("relative font-mono text-xs hover:bg-muted/80", level.isWall && "bg-yellow-500/20 font-bold")}>
            <td 
                className={cn("p-1 text-left relative", type === 'bid' ? 'text-green-500' : 'text-red-500')}
                style={{
                  background: type === 'bid' 
                    ? `linear-gradient(to left, rgba(34, 197, 94, 0.2) ${bgWidth}%, transparent ${bgWidth}%)` 
                    : `linear-gradient(to right, rgba(239, 68, 68, 0.2) ${bgWidth}%, transparent ${bgWidth}%)`
                }}
            >
                {level.price.toFixed(precision)}
            </td>
            <TableCell className="p-1 text-right">{level.size.toFixed(4)}</TableCell>
            <TableCell className="p-1 text-right">{level.total.toFixed(4)}</TableCell>
        </TableRow>
    );
});
OrderBookRow.displayName = 'OrderBookRow';

export function OrderBook({ symbol, onWallsUpdate }: OrderBookProps) {
    const { isConnected } = useApi();
    const [formattedBids, setFormattedBids] = useState<FormattedOrderBookLevel[]>([]);
    const [formattedAsks, setFormattedAsks] = useState<FormattedOrderBookLevel[]>([]);
    const [spread, setSpread] = useState(0);
    const [precision, setPrecision] = useState(2);
    const [maxTotal, setMaxTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isCardOpen, setIsCardOpen] = usePersistentState<boolean>('lab-orderbook-card-open', true);
    const [hasData, setHasData] = useState(false);

    const processSnapshot = useCallback((snapshot: { bids: OrderBookLevel[], asks: OrderBookLevel[] }) => {
        if (snapshot.bids.length === 0 || snapshot.asks.length === 0) return;

        const lastBidPrice = parseFloat(snapshot.bids[0][0]);
        const firstAskPrice = parseFloat(snapshot.asks[0][0]);
        const midPrice = (lastBidPrice + firstAskPrice) / 2;
        
        const { grouping, precision } = getGroupingAndPrecision(midPrice);
        setPrecision(precision);
        setSpread(firstAskPrice - lastBidPrice);

        const aggregatedBids = groupLevels(snapshot.bids, grouping, precision);
        const aggregatedAsks = groupLevels(snapshot.asks, grouping, precision);

        let currentMaxTotal = 0;
        const format = (levels: Map<string, number>, isBids: boolean): FormattedOrderBookLevel[] => {
            const sortedLevels = Array.from(levels.entries()).sort((a, b) => {
                return isBids ? parseFloat(b[0]) - parseFloat(a[0]) : parseFloat(a[0]) - parseFloat(b[0]);
            }).slice(0, 25);

            const totalSize = Array.from(levels.values()).reduce((sum, size) => sum + size, 0);
            let cumulativeTotal = 0;
            const result = sortedLevels.map(([priceStr, size]) => {
                cumulativeTotal += size;
                return { price: parseFloat(priceStr), size, total: cumulativeTotal, isWall: totalSize > 0 && (size / totalSize) > WALL_THRESHOLD_PERCENT };
            });
            if(result.length > 0) currentMaxTotal = Math.max(currentMaxTotal, result[result.length - 1].total);
            return result;
        };

        const fmtdBids = format(aggregatedBids, true);
        const fmtdAsks = format(aggregatedAsks, false).reverse();
        
        setFormattedBids(fmtdBids);
        setFormattedAsks(fmtdAsks);
        setMaxTotal(currentMaxTotal);
        
        const allWalls: Wall[] = [...fmtdBids, ...fmtdAsks].filter(l => l.isWall).map(l => ({ price: l.price, type: fmtdBids.includes(l) ? 'bid' : 'ask' }));
        onWallsUpdate({ walls: allWalls, spoofs: [] }); // No spoof detection in snapshot mode
        setHasData(true);
    }, [onWallsUpdate]);

    const handleFetchSnapshot = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        setHasData(false);

        try {
            const snapshot = await getDepthSnapshot(symbol);
            processSnapshot(snapshot);
        } catch (error: any) {
            setFetchError(error.message || `Failed to fetch snapshot for ${symbol}.`);
        } finally {
            setIsLoading(false);
        }
    }, [symbol, processSnapshot]);

    useEffect(() => {
        // Clear data when symbol changes
        setFormattedBids([]);
        setFormattedAsks([]);
        setFetchError(null);
        setHasData(false);
    }, [symbol]);

    const renderContent = () => {
        if (isLoading) return <Skeleton className="h-[400px] w-full" />;
        if (!isConnected) return <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md"><p>Connect API to view order book.</p></div>;
        if (fetchError) return <div className="flex items-center justify-center h-48 text-destructive text-center border border-dashed border-destructive/50 rounded-md p-4"><p>{fetchError}</p></div>;
        if (!hasData) return <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md"><p>Click the "Fetch" button to load the order book.</p></div>;
        
        return (
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-center">Asks (Sell Orders)</h4>
                    <ScrollArea className="h-[400px] border rounded-md">
                        <Table><TableHeader><TableRow><TableHead className="h-8 p-1 text-left">Price (USD)</TableHead><TableHead className="h-8 p-1 text-right">Size</TableHead><TableHead className="h-8 p-1 text-right">Total</TableHead></TableRow></TableHeader>
                            <TableBody>{formattedAsks.map(ask => <OrderBookRow key={`ask-${ask.price}`} level={ask} type="ask" precision={precision} maxTotal={maxTotal}/>)}</TableBody>
                        </Table>
                    </ScrollArea>
                </div>
                 <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-center">Bids (Buy Orders)</h4>
                    <ScrollArea className="h-[400px] border rounded-md">
                        <Table><TableHeader><TableRow><TableHead className="h-8 p-1 text-left">Price (USD)</TableHead><TableHead className="h-8 p-1 text-right">Size</TableHead><TableHead className="h-8 p-1 text-right">Total</TableHead></TableRow></TableHeader>
                            <TableBody>{formattedBids.map(bid => <OrderBookRow key={`bid-${bid.price}`} level={bid} type="bid" precision={precision} maxTotal={maxTotal}/>)}</TableBody>
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
                            {`Static snapshot for ${symbol}. Spread: $${spread.toFixed(precision)}`}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button onClick={handleFetchSnapshot} variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading || !isConnected}>
                            {isLoading ? <Loader2 className="animate-spin" /> : hasData ? <RefreshCw /> : <Play />}
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
