'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getOrderBook } from '@/lib/binance-service';
import { Loader2, Activity, Layers, ArrowUpRight, ArrowDownRight, Zap, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatPrice } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { topAssets, getAvailableQuotesForBase, parseSymbolString } from '@/lib/assets';
import { AssetSelector } from '@/components/ui/asset-selector';
import { microstructureService } from '@/lib/microstructure-service';

interface OrderBookLevel {
    price: number;
    volume: number;
    total: number;
    type: 'bid' | 'ask';
    depthPercentage: number;
}

interface LiquidityHeatmapProps {
    symbol: string;
    onClose?: () => void;
}

export const LiquidityHeatmap: React.FC<LiquidityHeatmapProps> = ({ symbol: initialSymbol }) => {
    const [symbol, setSymbol] = useState(initialSymbol);

    // Sync with prop if it changes externally
    useEffect(() => {
        setSymbol(initialSymbol);
    }, [initialSymbol]);

    const [bids, setBids] = useState<OrderBookLevel[]>([]);
    const [asks, setAsks] = useState<OrderBookLevel[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [livePrice, setLivePrice] = useState<number | null>(null);
    const [activeIcebergs, setActiveIcebergs] = useState<{ price: number, size: number, timestamp: number }[]>([]);
    const wsRef = useRef<WebSocket | null>(null);

    // Initial fetch
    useEffect(() => {
        let isMounted = true;
        
        const fetchOrderBook = async () => {
            setIsLoading(true);
            try {
                const data = await getOrderBook(symbol, 100);
                if (isMounted) {
                    processOrderBook(data.bids, data.asks);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Failed to fetch initial order book:", error);
                if (isMounted) setIsLoading(false);
            }
        };

        fetchOrderBook();

        return () => {
            isMounted = false;
        };
    }, [symbol]);

    // Tick for Iceberg Polling
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIcebergs(microstructureService.getIcebergLevels(symbol));
        }, 1000);
        return () => clearInterval(interval);
    }, [symbol]);

    // WebSocket for 100ms updates (zero-lag real-time)
    useEffect(() => {
        // We use depth20 for lower payload size, updating 100ms
        const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@depth20@100ms`);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.b && data.a) {
                processOrderBook(data.b, data.a);
                // Try to infer live price from tightest spread
                if (data.a.length > 0 && data.b.length > 0) {
                    const lowestAsk = parseFloat(data.a[0][0]);
                    const highestBid = parseFloat(data.b[0][0]);
                    setLivePrice((lowestAsk + highestBid) / 2);
                }
            }
        };

        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, [symbol]);

    const processOrderBook = (rawBids: [string, string][], rawAsks: [string, string][]) => {
        let currentBidTotal = 0;
        const parsedBids = rawBids.map(b => {
             const price = parseFloat(b[0]);
             const volume = parseFloat(b[1]);
             currentBidTotal += volume;
             return { price, volume, total: currentBidTotal, type: 'bid' as const, depthPercentage: 0 };
        }).slice(0, 50);

        let currentAskTotal = 0;
        const parsedAsks = rawAsks.map(a => {
             const price = parseFloat(a[0]);
             const volume = parseFloat(a[1]);
             currentAskTotal += volume;
             return { price, volume, total: currentAskTotal, type: 'ask' as const, depthPercentage: 0 };
        }).slice(0, 50);

        const maxBidTotal = parsedBids.length > 0 ? parsedBids[parsedBids.length - 1].total : 1;
        parsedBids.forEach(b => b.depthPercentage = (b.total / maxBidTotal) * 100);

        const maxAskTotal = parsedAsks.length > 0 ? parsedAsks[parsedAsks.length - 1].total : 1;
        parsedAsks.forEach(a => a.depthPercentage = (a.total / maxAskTotal) * 100);
        
        // Asks should be ordered from highest price to lowest price for the visual book
        setAsks(parsedAsks.reverse());
        setBids(parsedBids);
        setLastUpdated(new Date());

        // Update central Microstructure Service to compute resting liquidity vs Executed Volume variances
        microstructureService.updateDepth(
            symbol,
            rawBids.map(b => [parseFloat(b[0]), parseFloat(b[1])]),
            rawAsks.map(a => [parseFloat(a[0]), parseFloat(a[1])])
        );
    };

    const spread = useMemo(() => {
        if (asks.length === 0 || bids.length === 0) return 0;
        // Asks are reversed (highest to lowest), so asks[asks.length - 1] is lowest ask
        const lowestAsk = asks[asks.length - 1].price;
        const highestBid = bids[0].price;
        return lowestAsk - highestBid;
    }, [asks, bids]);

    const maxVolume = useMemo(() => {
       const bMax = Math.max(...bids.map(b => b.volume), 0);
       const aMax = Math.max(...asks.map(a => a.volume), 0);
       return Math.max(bMax, aMax, 1);
    }, [bids, asks]);

    if (isLoading && bids.length === 0) {
        return (
            <Card className="h-[600px] flex items-center justify-center bg-black/40 border-purple-500/20 shadow-2xl backdrop-blur-md">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                    <p className="text-muted-foreground animate-pulse">Synchronizing High-Frequency Liquidity Data...</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="h-full bg-slate-950/80 border-slate-800 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col relative group">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[200px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />
            
            <CardHeader className="p-4 border-b border-white/5 relative z-10 bg-black/20">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Layers className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
                                Liquidity Heatmap 
                                <Badge variant="outline" className="text-[10px] h-5 bg-green-500/10 text-green-400 border-green-500/20 px-1.5 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Live
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-[10px] opacity-70">
                                Real-time dynamic order book depth & wall detection.
                            </CardDescription>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="flex gap-2">
                        {(() => {
                            const parsed = parseSymbolString(symbol) || { base: symbol.replace('USDT', ''), quote: 'USDT' };
                            const availableQuotes = getAvailableQuotesForBase(parsed.base) || ['USDT'];
                            return (
                                <AssetSelector
                                    baseAsset={parsed.base}
                                    quoteAsset={parsed.quote}
                                    onBaseChange={(newBase) => setSymbol(`${newBase}${parsed.quote}`)}
                                    onQuoteChange={(newQuote) => setSymbol(`${parsed.base}${newQuote}`)}
                                    availableQuotes={availableQuotes}
                                />
                            );
                        })()}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col relative z-10 overflow-hidden font-mono text-xs">
                 <div className="grid grid-cols-[1fr_1fr_1fr] bg-black/40 text-[10px] text-muted-foreground p-2 border-b border-white/5 z-20 items-center">
                    <div className="text-left font-semibold uppercase tracking-wider">Price (USDT) <span className="ml-2 text-cyan-500/50">🧊 Iceberg Tracker Active</span></div>
                    <div className="text-right font-semibold uppercase tracking-wider">Size</div>
                    <div className="text-right font-semibold uppercase tracking-wider">Total</div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar p-2 space-y-[1px]">
                    {/* ASKS (SELLS) */}
                    <div className="flex flex-col space-y-[1px]">
                        {asks.map((ask, i) => {
                            const intensity = (ask.volume / maxVolume) * 100;
                            const isWall = intensity > 70;
                            
                            // Check for Iceberg detection from persistent list
                            const thisIceberg = activeIcebergs.find(ib => 
                                Math.abs(ib.price - ask.price) < (spread * 0.1) // Range match for precision floating point
                            );
                            const isIceberg = !!thisIceberg;

                            return (
                                <div key={`ask-${i}`} className={cn("grid grid-cols-[1fr_1fr_1fr] relative group h-[20px] items-center px-1 rounded-sm hover:bg-white/5 transition-colors cursor-crosshair", isIceberg && "bg-cyan-950/30 border-y border-cyan-500/20")}>
                                    {/* Heatmap Volume Bar */}
                                    <div 
                                        className={cn("absolute right-0 top-0 bottom-0 bg-red-500/10 transition-all duration-300 z-0", isWall && "bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.3)] border-r-2 border-red-500")}
                                        style={{ width: `${intensity}%` }} 
                                    />
                                    {/* Depth curve visualizer (subtle) */}
                                    <div 
                                        className="absolute right-0 top-0 bottom-0 bg-red-900/10 z-0"
                                        style={{ width: `${ask.depthPercentage}%` }} 
                                    />
                                    <div className={cn("text-left relative z-10 font-bold flex items-center gap-1", isIceberg ? "text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.6)]" : isWall ? "text-red-400" : "text-red-500/80")}>
                                        {formatPrice(ask.price)}
                                        {isIceberg && <Badge variant="outline" className="bg-cyan-950 text-cyan-400 border-cyan-500/50 text-[8px] py-0 px-1 uppercase tracking-widest"><Search className="w-2 h-2 mr-1 animate-pulse" />Iceberg {(thisIceberg!.size).toFixed(1)}</Badge>}
                                        {isWall && !isIceberg && <Zap className="inline-block w-3 h-3 text-red-500 animate-pulse" />}
                                    </div>
                                    <div className="text-right relative z-10 text-slate-300">{ask.volume.toFixed(3)}</div>
                                    <div className="text-right relative z-10 text-slate-500">{ask.total.toFixed(3)}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* SPREAD INDICATOR */}
                    <div className="py-3 my-1 flex justify-between items-center border-y border-white/5 bg-black/20 px-2 rounded-sm shadow-inner">
                         <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Spread</span>
                            <span className="text-amber-400 font-bold">{(spread).toFixed(2)} USDT</span>
                         </div>
                         <div className="flex flex-col justify-end text-right">
                            {livePrice && (
                                <span className="text-lg font-bold text-white tabular-nums tracking-tighter shadow-black drop-shadow-md">
                                    ${formatPrice(livePrice)}
                                </span>
                            )}
                         </div>
                    </div>

                    {/* BIDS (BUYS) */}
                    <div className="flex flex-col space-y-[1px]">
                        {bids.map((bid, i) => {
                             const intensity = (bid.volume / maxVolume) * 100;
                             const isWall = intensity > 70;
                             
                             // Check for Iceberg detection from persistent list
                             const thisIceberg = activeIcebergs.find(ib => 
                                 Math.abs(ib.price - bid.price) < (spread * 0.1)
                             );
                             const isIceberg = !!thisIceberg;

                             return (
                                 <div key={`bid-${i}`} className={cn("grid grid-cols-[1fr_1fr_1fr] relative group h-[20px] items-center px-1 rounded-sm hover:bg-white/5 transition-colors cursor-crosshair", isIceberg && "bg-cyan-950/30 border-y border-cyan-500/20")}>
                                    {/* Heatmap Volume Bar */}
                                    <div 
                                        className={cn("absolute right-0 top-0 bottom-0 bg-green-500/10 transition-all duration-300 z-0", isWall && "bg-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.3)] border-r-2 border-green-500")}
                                        style={{ width: `${intensity}%` }} 
                                    />
                                     {/* Depth curve visualizer (subtle) */}
                                     <div 
                                        className="absolute right-0 top-0 bottom-0 bg-green-900/10 z-0"
                                        style={{ width: `${bid.depthPercentage}%` }} 
                                    />
                                    <div className={cn("text-left relative z-10 font-bold flex items-center gap-1", isIceberg ? "text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.6)]" : isWall ? "text-green-400" : "text-green-500/80")}>
                                        {formatPrice(bid.price)}
                                        {isIceberg && <Badge variant="outline" className="bg-cyan-950 text-cyan-400 border-cyan-500/50 text-[8px] py-0 px-1 uppercase tracking-widest"><Search className="w-2 h-2 mr-1 animate-pulse" />Iceberg {(thisIceberg!.size).toFixed(1)}</Badge>}
                                        {isWall && !isIceberg && <Zap className="inline-block w-3 h-3 text-green-500 animate-pulse" />}
                                    </div>
                                    <div className="text-right relative z-10 text-slate-300">{bid.volume.toFixed(3)}</div>
                                    <div className="text-right relative z-10 text-slate-500">{bid.total.toFixed(3)}</div>
                                </div>
                             )
                        })}
                    </div>
                </div>

                {/* SHADOW LOG OVERLAY (Whales & Icebergs) */}
                {activeIcebergs.length > 0 && (
                    <div className="absolute top-20 right-4 w-48 z-40 space-y-2 pointer-events-none">
                        <div className="text-[9px] font-bold text-cyan-400 bg-cyan-950/80 px-2 py-1 rounded border border-cyan-500/30 backdrop-blur-sm flex items-center justify-between">
                            SHADOW LOG 🧊
                            <span className="animate-pulse flex items-center gap-1">
                                <Activity className="w-2 h-2" /> LIVE
                            </span>
                        </div>
                        {activeIcebergs.slice(0, 5).map((ib, i) => (
                            <div key={`log-${i}`} className="bg-black/60 border-l-2 border-cyan-500 p-1.5 rounded-sm backdrop-blur-md animate-in slide-in-from-right duration-300">
                                <div className="flex justify-between items-start">
                                    <span className="text-cyan-400 font-bold">{formatPrice(ib.price)}</span>
                                    <Badge variant="outline" className="text-[8px] h-3 bg-cyan-500/10 text-cyan-500 border-cyan-500/20 px-1 py-0">{ib.size.toFixed(0)}</Badge>
                                </div>
                                <div className="text-[8px] text-slate-500 flex justify-between mt-1">
                                    <span>ICEBERG RELOAD</span>
                                    <span>{new Date(ib.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
