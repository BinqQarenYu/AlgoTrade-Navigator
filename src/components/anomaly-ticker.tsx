"use client";

import { useEffect, useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Zap, AlertTriangle, ArrowUpRight, ArrowDownRight, Anchor, XCircle, Droplets, ShieldAlert, ChevronDown, ChevronRight, Layers, Search, Filter, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";


export interface MicroEvent {
    event_id: string;
    timestamp: number;
    symbol: string;
    event_type: 'WHALE_TX' | 'ICEBERG' | 'SPOOF_CANCEL' | 'VPIN_SPIKE' | 'LIQUIDATION' | 'ENTROPY_SHIFT';
    price: number;
    volume_usd: number;
    severity_score: number;
    metadata?: string;
}

interface EventGroup {
    id: string;
    symbol: string;
    type: 'CASCADE' | 'SINGLE';
    events: MicroEvent[];
    totalVolume: number;
    startTime: number;
    endTime: number;
    side?: string;
}

export function AnomalyTicker({ className }: { className?: string }) {
    const [events, setEvents] = useState<MicroEvent[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [filterLiquidation, setFilterLiquidation] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showOnlyTier1, setShowOnlyTier1] = useState(false);

    const TIER_1 = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT", "DOGEUSDT", "ADAUSDT", "TRXUSDT", "LINKUSDT", "SUIUSDT"];


    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch('/api/sentry/events');
                if (!res.ok) return;
                const data = await res.json();
                if (data.events) {
                    setEvents(data.events);
                }
            } catch (e) {}
        };

        fetchEvents();
        const interval = setInterval(fetchEvents, 3000);
        return () => clearInterval(interval);
    }, []);

    const groups = useMemo(() => {
        if (events.length === 0) return [];
        
        const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);
        const result: EventGroup[] = [];
        let currentGroup: EventGroup | null = null;

        sorted.forEach(e => {
            let metadata = { side: 'BUY' };
            try { if(e.metadata) metadata = JSON.parse(e.metadata); } catch(err){}

            const isLiquidation = e.event_type === 'LIQUIDATION';
            const isWhale = e.event_type === 'WHALE_TX';
            
            // Refined Grouping: Same symbol + (Liquidation or Whale) + 10s window
            const canBeGrouped = currentGroup && 
                               currentGroup.symbol === e.symbol && 
                               currentGroup.type === 'CASCADE' &&
                               ((isLiquidation && currentGroup.side === metadata.side) || (isWhale && currentGroup.side === metadata.side)) &&
                               Math.abs(currentGroup.endTime - e.timestamp) < 10000;

            if (canBeGrouped && currentGroup) {
                currentGroup.events.push(e);
                currentGroup.totalVolume += e.volume_usd;
                currentGroup.startTime = Math.min(currentGroup.startTime, e.timestamp);
                currentGroup.endTime = Math.max(currentGroup.endTime, e.timestamp);
            } else {
                currentGroup = {
                    id: e.event_id,
                    symbol: e.symbol.toUpperCase(),
                    type: (isLiquidation || isWhale) ? 'CASCADE' : 'SINGLE',
                    events: [e],
                    totalVolume: e.volume_usd,
                    startTime: e.timestamp,
                    endTime: e.timestamp,
                    side: metadata.side
                };
                result.push(currentGroup);
            }
        });

        return result.filter(g => {
            const matchesSearch = g.symbol.includes(searchTerm.toUpperCase());
            const matchesTier = !showOnlyTier1 || TIER_1.includes(g.symbol);
            const matchesType = !filterLiquidation || g.type === 'CASCADE' || g.events.some(e => e.event_type === 'LIQUIDATION');
            return matchesSearch && matchesTier && matchesType;
        });
    }, [events, filterLiquidation, searchTerm, showOnlyTier1]);


    const toggleGroup = (id: string) => {
        const next = new Set(expandedGroups);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedGroups(next);
    };

    const formatVol = (val: number) => {
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
        return `$${val.toFixed(0)}`;
    };

    const getEventStyling = (e: MicroEvent | EventGroup) => {
        const type = 'event_type' in e ? e.event_type : (e.type === 'CASCADE' ? 'LIQUIDATION' : e.events[0].event_type);
        
        let side = 'BUY';
        if ('side' in e && e.side) {
            side = e.side;
        } else if ('metadata' in e && e.metadata) {
            try { side = JSON.parse(e.metadata).side || 'BUY'; } catch(err){}
        }
        
        const isBuy = side === 'BUY';

        switch (type) {
            case 'LIQUIDATION':
                return {
                    icon: <AlertTriangle className="h-3.5 w-3.5" />,
                    color: isBuy ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors animate-glow-emerald' : 'text-rose-400 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-colors animate-glow-rose',
                    label: `Liquidation ${side}`,
                    shadow: isBuy ? 'shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                };
            case 'WHALE_TX':
                return { 
                    icon: isBuy ? <ArrowUpRight className="h-3.5 w-3.5" />: <ArrowDownRight className="h-3.5 w-3.5" />,
                    color: isBuy ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-rose-400 border-rose-500/20 bg-rose-500/5',
                    label: `Whale ${isBuy ? 'Buy' : 'Sell'}`,
                    shadow: ''
                };
            case 'ICEBERG':
                return { icon: <Anchor className="h-3.5 w-3.5" />, color: 'text-amber-400 border-amber-500/20 bg-amber-500/5 animate-glow-amber', label: 'Iceberg Wall', shadow: '' };
            case 'VPIN_SPIKE':
                return { icon: <Droplets className="h-3.5 w-3.5" />, color: 'text-red-500 border-red-500/20 bg-red-500/5', label: 'Toxic Flow', shadow: '' };
            default:
                return { icon: <Zap className="h-3.5 w-3.5" />, color: 'text-slate-400 border-slate-800 bg-slate-900/50', label: 'Anomaly', shadow: '' };
        }
    };


    return (
        <div className={cn(
            "flex flex-col gap-0 p-0 bg-slate-950/60 border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl backdrop-blur-xl transition-all duration-500", 
            isMinimized ? "max-h-[50px]" : "max-h-[600px]", 
            className
        )}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60 bg-slate-900/40 select-none">
                <div 
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="flex items-center gap-2 cursor-pointer group"
                >
                    <ShieldAlert className={cn("h-3.5 w-3.5 transition-all", isMinimized ? "text-slate-500" : "text-rose-500")} />
                    <h3 className={cn("text-[10px] font-black uppercase tracking-[0.2em] transition-all", isMinimized ? "text-slate-500" : "text-slate-300")}>
                        Sentinel Radar
                    </h3>
                    <div className="flex items-center gap-1 ml-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[7px] text-emerald-500/70 font-bold uppercase tracking-widest">Live Feed</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {!isMinimized && (
                        <div className="flex gap-1.5 items-center">
                            <div className="relative flex items-center group/search">
                                <Search className={cn("absolute left-2 h-2.5 w-2.5 transition-colors", searchTerm ? "text-primary" : "text-slate-500")} />
                                <input 
                                    type="text"
                                    placeholder="SEARCH SYM..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                                    className="bg-slate-950/80 border border-slate-800 rounded-md pl-6 pr-2 py-1 text-[8px] w-24 focus:w-32 transition-all outline-none focus:border-primary/50 font-mono text-slate-300 placeholder:text-slate-600"
                                />
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowOnlyTier1(!showOnlyTier1); }}
                                title="Show Tier 1 Assets"
                                className={cn("p-1 rounded border transition-all", showOnlyTier1 ? "bg-primary border-primary text-white" : "bg-slate-800 border-slate-700 text-slate-400")}
                            >
                                <Zap className="h-3 w-3" />
                            </button>
                             <button 
                                onClick={(e) => { e.stopPropagation(); setFilterLiquidation(!filterLiquidation); }}
                                className={cn("text-[8px] px-2 py-1 rounded border transition-all font-bold uppercase tracking-tighter h-6", 
                                    filterLiquidation ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/40" : "bg-slate-800 border-slate-700 text-slate-400")}
                            >
                                Liq only
                            </button>
                        </div>
                    )}
                    <button 
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1 rounded-md hover:bg-slate-800 transition-colors text-slate-400"
                    >
                        {isMinimized ? <ChevronDown className="h-4 w-4" /> : <XCircle className="h-4 w-4 opacity-50 hover:opacity-100" />}
                    </button>
                </div>
            </div>


            {!isMinimized && (
                <div className="overflow-y-auto custom-scrollbar flex-1">
                    {groups.length === 0 ? (
                        <div className="p-10 text-center text-slate-500 text-[10px] uppercase font-bold tracking-widest opacity-50">
                            Monitoring Deep Flow...
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800/30">
                            {groups.map((group) => {
                                const isExpanded = expandedGroups.has(group.id);
                                const style = getEventStyling(group);
                                const isCascade = group.events.length > 1;

                                return (
                                    <div key={group.id} className="group/row">
                                        <div 
                                            onClick={() => isCascade && toggleGroup(group.id)}
                                            className={cn(
                                                "px-4 py-3 flex items-center justify-between cursor-pointer transition-all duration-300 border-l-2 border-l-transparent",
                                                isCascade ? "hover:translate-x-1 group-hover/row:bg-white/5" : "cursor-default",
                                                isCascade && (style.label.includes('Sell') ? "border-l-rose-500/50 bg-rose-500/[0.03]" : "border-l-emerald-500/50 bg-emerald-500/[0.03]"),
                                                style.color.split(' ')[0],
                                                style.shadow,
                                                isExpanded && "bg-white/[0.05]"
                                            )}
                                        >

                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black tracking-tight flex items-center gap-1.5">
                                                        {group.symbol}
                                                        {isCascade && (
                                                            <span className="bg-rose-500 text-white text-[8px] px-1.5 py-0.5 rounded-full animate-pulse ml-1 font-mono uppercase">
                                                                Cascade x{group.events.length}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-[9px] opacity-60 font-mono tracking-tighter uppercase flex items-center gap-1">
                                                        {style.icon} {style.label}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-right flex items-center gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold font-mono text-slate-200">
                                                        {formatVol(group.totalVolume)}
                                                    </span>
                                                    <span className="text-[9px] opacity-40 font-mono uppercase tracking-tighter text-slate-400">
                                                        {formatDistanceToNow(group.startTime, { addSuffix: true })}
                                                    </span>
                                                </div>
                                                {isCascade && (
                                                    <div className="p-1 rounded-md bg-slate-800/50 border border-slate-700/50">
                                                        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {isExpanded && isCascade && (
                                            <div className="bg-slate-900/40 px-6 py-2 border-l-2 border-l-rose-500/20 flex flex-col gap-1 my-1">
                                                {group.events.map((e, idx) => (
                                                    <div key={e.event_id} className="flex justify-between items-center py-1 text-[10px] font-mono border-b border-white/5 last:border-0 opacity-80 hover:opacity-100 transition-opacity">
                                                        <span className="text-slate-400">#{group.events.length - idx}</span>
                                                        <span className="text-slate-300">@ {e.price}</span>
                                                        <span className={cn("font-bold", style.color.split(' ')[0])}>{formatVol(e.volume_usd)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
