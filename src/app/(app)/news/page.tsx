/**
 * 📰 The Global Event Ledger
 * 
 * Mission: A dedicated News and Macro Calendar Terminal.
 * Function: Displays pure contextual data gathered by the Sentinel.
 * Bloomberg-Style Grid Layout for high-density reading.
 */

"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Newspaper, Globe, Filter, RefreshCw, Layers, CalendarDays, Maximize2, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default function GlobalNewsLedger() {
    const [news, setNews] = useState<any[]>([]);
    const [totalRows, setTotalRows] = useState(0);
    const [page, setPage] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const LIMIT = 25;

    useEffect(() => {
        fetchNews(page);
    }, [page]);

    const fetchNews = async (pageIndex: number) => {
        setIsLoading(true);
        try {
            const offset = pageIndex * LIMIT;
            const res = await fetch(`/api/db/news?limit=${LIMIT}&offset=${offset}`);
            const json = await res.json();
            
            if (json.success) {
                setNews(json.data.events);
                setTotalRows(json.data.total);
            }
        } catch (e) {
            console.error('[News Ledger] Fetch failed:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTimeFull = (ms: any) => format(new Date(Number(ms)), "MMM dd, yyyy - HH:mm:ss");
    
    // Parse metadata for external links or extra context
    const parseMeta = (metaStr: string) => {
        try { return JSON.parse(metaStr); } catch { return null; }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden pb-12 animate-in fade-in duration-500">
            
            {/* Terminal Header */}
            <div className="flex justify-between items-end mb-6 mt-4 px-2 shrink-0">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center gap-3">
                        <Globe className="h-8 w-8 text-blue-500" />
                        GLOBAL EVENT LEDGER
                    </h1>
                    <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold opacity-70">
                        Institutional-Grade Macro Context & Breaking Rumors.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl text-[10px] font-mono text-slate-400">
                        <Layers className="h-3 w-3 text-blue-500"/>
                        {totalRows.toLocaleString()} ARCHIVED EVENTS
                    </div>
                    <button 
                        onClick={() => fetchNews(page)}
                        disabled={isLoading}
                        className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 p-2 rounded-lg border border-blue-500/20 transition-all font-bold flex items-center gap-2"
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")}/>
                    </button>
                </div>
            </div>

            {/* Bloomberg-Style Grid Container */}
            <Card className="bg-slate-950/60 border-slate-800 shadow-2xl flex-1 flex flex-col min-h-0 mx-2">
                <CardHeader className="py-3 border-b border-slate-800/50 bg-slate-900/50 shrink-0">
                    <div className="grid grid-cols-12 gap-4 text-[10px] uppercase font-black tracking-widest text-slate-500">
                        <div className="col-span-2 flex items-center gap-1"><CalendarDays className="h-3 w-3"/> TIMESTAMP (UTC)</div>
                        <div className="col-span-1">SOURCE</div>
                        <div className="col-span-1">ASSET</div>
                        <div className="col-span-6">HEADLINE / EVENT DESCRIPTION</div>
                        <div className="col-span-1 text-center">LEVEL</div>
                        <div className="col-span-1 text-right">RS-SCORE</div>
                    </div>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-[#0a0f1c]">
                    {isLoading && news.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                            <Newspaper className="h-10 w-10 animate-bounce opacity-50"/>
                            <div className="text-xs uppercase tracking-widest font-bold animate-pulse">Syncing Global Feeds...</div>
                        </div>
                    ) : news.length > 0 ? (
                        <div className="divide-y divide-slate-800/50">
                            {news.map((item, i) => {
                                const meta = parseMeta(item.metadata);
                                const isFact = item.level <= 2;
                                
                                return (
                                    <div 
                                        key={item.event_id || i}
                                        className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-blue-900/10 transition-colors text-sm items-center cursor-default group"
                                    >
                                        <div className="col-span-2 text-xs font-mono text-slate-400">
                                            {formatTimeFull(item.timestamp)}
                                        </div>
                                        
                                        <div className="col-span-1">
                                            <span className={cn(
                                                "text-[9px] px-1.5 py-0.5 rounded uppercase font-black border tracking-wider",
                                                item.source === 'GECKO' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                item.source === 'CMC' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                "bg-slate-800 text-slate-300 border-slate-700"
                                            )}>
                                                {item.source}
                                            </span>
                                        </div>

                                        <div className="col-span-1 font-bold text-slate-200 uppercase text-xs">
                                            {item.asset_scope}
                                        </div>

                                        <div className="col-span-6 font-medium text-slate-300 pr-4 leading-snug flex items-center gap-2">
                                            <span className="line-clamp-2">{item.headline}</span>
                                            {meta?.url && (
                                                <a href={meta.url} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ExternalLink className="h-3 w-3 text-blue-400 hover:text-blue-300" />
                                                </a>
                                            )}
                                        </div>

                                        <div className="col-span-1 flex justify-center">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                isFact ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                                            )} title={isFact ? "Systemic (Fact)" : "Speculative (Rumor)"} />
                                        </div>

                                        <div className="col-span-1 text-right font-mono text-xs font-black">
                                            <span className={cn(
                                                item.relevance_score >= 8 ? "text-rose-400" :
                                                item.relevance_score >= 5 ? "text-amber-400" :
                                                "text-blue-400"
                                            )}>
                                                {item.relevance_score.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 italic">No events recorded in the vault.</div>
                    )}
                </CardContent>

                {/* Pagination Footer */}
                <div className="py-2 px-6 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                        SHOWING {LIMIT * page + 1} - {Math.min(LIMIT * (page + 1), totalRows)} OF {totalRows}
                    </div>
                    <div className="flex gap-2">
                        <button 
                            disabled={page === 0} 
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-bold rounded"
                        >
                            PREV
                        </button>
                        <button 
                            disabled={(page + 1) * LIMIT >= totalRows}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-bold rounded"
                        >
                            NEXT
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    )
}
