"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Zap, AlertTriangle, ArrowUpRight, ArrowDownRight, Anchor, XCircle, Droplets, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function AnomalyTicker({ className }: { className?: string }) {
    const [events, setEvents] = useState<MicroEvent[]>([]);

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
        const interval = setInterval(fetchEvents, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, []);

    const formatVol = (val: number) => {
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
        return `$${val.toFixed(0)}`;
    };

    const getEventStyling = (e: MicroEvent) => {
        let parsedMeta = { side: 'BUY' };
        try { if(e.metadata) parsedMeta = JSON.parse(e.metadata); } catch(err){}
        const isBuy = parsedMeta.side === 'BUY';

        switch (e.event_type) {
            case 'WHALE_TX':
                return { 
                    icon: isBuy ? <ArrowUpRight className="h-4 w-4 text-emerald-400"/> : <ArrowDownRight className="h-4 w-4 text-rose-400"/>,
                    color: isBuy ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-rose-400 border-rose-500/30 bg-rose-500/10',
                    label: `Whale ${isBuy ? 'Buy' : 'Sell'}`
                };
            case 'ICEBERG':
                return {
                    icon: <Anchor className="h-4 w-4 text-amber-400"/>,
                    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
                    label: 'Iceberg Wall Detected'
                };
            case 'SPOOF_CANCEL':
                return {
                    icon: <XCircle className="h-4 w-4 text-purple-400"/>,
                    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
                    label: 'Spoof Cancelled'
                };
            case 'VPIN_SPIKE':
                return {
                    icon: <Droplets className="h-4 w-4 text-red-500"/>,
                    color: 'text-red-500 border-red-500/30 bg-red-500/10',
                    label: 'Toxic Flow (VPIN)'
                };
            case 'LIQUIDATION':
                return {
                    icon: <AlertTriangle className="h-4 w-4 text-yellow-300"/>,
                    color: 'text-yellow-300 border-yellow-500/40 bg-yellow-500/20',
                    label: `Liquidation (${parsedMeta.side})`
                };
            case 'ENTROPY_SHIFT':
                 return {
                    icon: <Zap className="h-4 w-4 text-blue-400"/>,
                    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
                    label: 'Bot Entropy Shift'
                };
            default:
                return { icon: <Zap className="h-4 w-4 text-slate-400"/>, color: 'text-slate-400 border-slate-700 bg-slate-900', label: 'Anomaly' };
        }
    };

    if (events.length === 0) return null;

    return (
        <div className={cn("flex flex-col gap-2 p-3 bg-slate-950/80 border border-slate-800 rounded-xl overflow-y-auto custom-scrollbar shadow-2xl shadow-rose-900/10", className)}>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5 mb-1 sticky top-0 bg-slate-950/90 py-1 z-10">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-500 bg-rose-500/20 rounded-sm" />
                Live Anomaly Radar
            </h3>
            <div className="space-y-2">
                {events.map((e) => {
                    const style = getEventStyling(e);
                    return (
                        <div key={e.event_id} className={cn("p-2.5 rounded-xl border text-xs flex flex-col gap-1.5 transition-all shadow-inner hover:scale-[1.02]", style.color)}>
                            <div className="flex justify-between items-center font-bold">
                                <span className="flex items-center gap-1.5 opacity-90">{style.icon} {style.label}</span>
                                <span className="font-mono text-[9px] opacity-60 uppercase">{formatDistanceToNow(e.timestamp, { addSuffix: true })}</span>
                            </div>
                            <div className="flex justify-between items-end mt-0.5">
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-black text-sm tracking-tight">{e.symbol}</span>
                                    <span className="opacity-80 font-mono tracking-tighter">Vol: {formatVol(e.volume_usd)}</span>
                                </div>
                                <div className="text-right flex flex-col gap-0.5">
                                    <span className="font-mono text-sm tracking-tighter">@ {e.price}</span>
                                    <span className="opacity-70 text-[9px] font-semibold uppercase tracking-wider">Severity: {(e.severity_score * 10).toFixed(1)}/10</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
