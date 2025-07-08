
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { get24hTickerStats } from '@/lib/binance-service';
import { topAssets } from '@/lib/assets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Ticker } from 'ccxt';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useApi } from '@/context/api-context';
import { useToast } from '@/hooks/use-toast';

interface HeatmapData {
    symbol: string;
    base: string;
    percentage: number;
}

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

const getHeatmapColor = (percentage: number) => {
    if (percentage > 2.5) return 'bg-green-700 hover:bg-green-600';
    if (percentage > 1) return 'bg-green-600 hover:bg-green-500';
    if (percentage > 0) return 'bg-green-500 hover:bg-green-400';
    if (percentage < -2.5) return 'bg-red-700 hover:bg-red-600';
    if (percentage < -1) return 'bg-red-600 hover:bg-red-500';
    if (percentage < 0) return 'bg-red-500 hover:bg-red-400';
    return 'bg-muted hover:bg-muted/80 text-foreground';
};

export function MarketHeatmap() {
    const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = usePersistentState<boolean>('dashboard-heatmap-open', true);
    const { isConnected } = useApi();
    const { toast } = useToast();

    const fetchHeatmapData = useCallback(async (isInitial: boolean) => {
        if (!isConnected) {
            if (isInitial) setIsLoading(false);
            setHeatmapData([]);
            return;
        }

        if (isInitial) {
            setIsLoading(true);
        }

        try {
            const symbolsToFetch = topAssets.map(asset => `${asset.ticker}USDT`);
            const tickerStats = await get24hTickerStats(symbolsToFetch);
            
            const data = Object.values(tickerStats).map((ticker: Ticker) => ({
                symbol: ticker.symbol,
                base: ticker.symbol.replace('USDT', ''),
                percentage: ticker.percentage ?? 0,
            })).sort((a, b) => Math.abs(b.percentage) - Math.abs(a.percentage));

            setHeatmapData(data);
        } catch (error: any) {
            console.error("Failed to fetch heatmap data:", error);
            if (isInitial) {
                toast({
                    title: "Heatmap Failed",
                    description: "Could not load market performance data.",
                    variant: "destructive"
                });
            }
        } finally {
            if (isInitial) {
                setIsLoading(false);
            }
        }
    }, [isConnected, toast]);

    useEffect(() => {
        if (isConnected) {
            fetchHeatmapData(true); // Initial fetch

            const intervalId = setInterval(() => {
                fetchHeatmapData(false); // Subsequent fetches
            }, 15 * 60 * 1000); // 15 minutes

            return () => clearInterval(intervalId); // Cleanup interval on unmount or when disconnected
        } else {
            setIsLoading(false);
            setHeatmapData([]);
        }
    }, [isConnected, fetchHeatmapData]);


    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Market Heatmap</CardTitle>
                        <CardDescription>24h volatility of top assets. Updates every 15 mins.</CardDescription>
                    </div>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                        </Button>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent>
                        {isLoading ? (
                            <div className="grid grid-cols-4 gap-2">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                ))}
                            </div>
                        ) : heatmapData.length > 0 ? (
                            <TooltipProvider>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {heatmapData.map(item => (
                                        <Tooltip key={item.symbol}>
                                            <TooltipTrigger asChild>
                                                <div className={cn(
                                                    "p-2 rounded-md text-white transition-colors duration-200 text-center flex flex-col justify-center items-center h-16",
                                                    getHeatmapColor(item.percentage)
                                                )}>
                                                    <div className="font-bold text-sm">{item.base}</div>
                                                    <div className="text-xs font-mono">
                                                        {item.percentage > 0 ? '+' : ''}
                                                        {item.percentage.toFixed(2)}%
                                                    </div>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{item.symbol} 24h Change: {item.percentage.toFixed(2)}%</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                </div>
                            </TooltipProvider>
                        ) : (
                            <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md">
                                <p>{isConnected ? "Could not load data." : "Connect API to view heatmap."}</p>
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
