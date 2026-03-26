"use client"

import React, { useState, useEffect } from "react"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ShieldAlert, Droplets, Anchor, Zap, AlertTriangle, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react"
import { AssetSelector } from "@/components/ui/asset-selector"
import { parseSymbolString, getAvailableQuotesForBase } from "@/lib/assets"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, Legend, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function AnomalyRadarPage() {
    const [symbol, setSymbol] = usePersistentState('radar-symbol', 'BTCUSDT');
    const [timeWindow, setTimeWindow] = useState('24'); // hours
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/sentry/radar?symbol=${symbol}&hours=${timeWindow}`);
                if (!res.ok) throw new Error('Failed to fetch radar data');
                const json = await res.json();
                if (isMounted && json.success) {
                    setData(json.data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 15000); 
        return () => { isMounted = false; clearInterval(interval); };
    }, [symbol, timeWindow]);

    const parsedSymbol = parseSymbolString(symbol) || { base: symbol.replace('USDT', ''), quote: 'USDT' };
    const availableQuotes = getAvailableQuotesForBase(parsedSymbol.base) || ['USDT'];

    // Data Formatting for Charts
    const formatVol = (val: number) => {
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
        return `$${val}`;
    };

    const formatTime = (ms: number) => format(new Date(ms), "HH:mm");

    // 1. Manipulation Breakdown (Pie)
    let pieData: any[] = [];
    let totWhales = 0, totSpoof = 0, totIceberg = 0;
    if (data?.eventCounts?.length > 0) {
        data.eventCounts.forEach((e: any) => {
            if (e.event_type.includes('WHALE')) totWhales += e.total_volume;
            if (e.event_type === 'SPOOF_CANCEL') totSpoof += e.total_volume;
            if (e.event_type === 'ICEBERG') totIceberg += e.total_volume;
        });
        pieData = [
            { name: 'Whale Tx', value: totWhales, color: '#3b82f6' },
            { name: 'Spoofed/Cancelled', value: totSpoof, color: '#a855f7' },
            { name: 'Hidden Icebergs', value: totIceberg, color: '#f59e0b' }
        ].filter(d => d.value > 0);
    }

    // 2. VPIN & Entropy Series
    const combinedSeries: any[] = [];
    if (data?.vpinSeries) {
        const vpinMap = new Map(data.vpinSeries.map((d: any) => [d.time_bucket, d.avg_vpin]));
        const entMap = new Map(data.entropySeries?.map((d: any) => [d.time_bucket, d.avg_entropy]) || []);
        
        // Merge buckets
        const allBuckets = Array.from(new Set([...vpinMap.keys(), ...entMap.keys()])).sort((a: any, b: any) => a - b);
        allBuckets.forEach(b => {
            combinedSeries.push({
                time: b,
                VPIN: vpinMap.get(b) || 0,
                Entropy: entMap.get(b) || 0
            });
        });
    }

    // 3. Iceberg Support/Resistance (Bar)
    const icebergBars = data?.icebergs ? data.icebergs.slice(0, 15).map((d: any) => ({
        price: d.price.toFixed(1),
        volume: d.magnitude
    })) : [];

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar pb-12">
            
            <div className="flex justify-between items-end mb-6 shrink-0 mt-4 px-2">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-indigo-500 flex items-center gap-3">
                        <ShieldAlert className="h-8 w-8 text-rose-500" />
                        Microstructure Intelligence Radar
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1 uppercase tracking-widest font-bold opacity-70">
                        Deep Market Manipulation & Smart Money Tracker
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                    <div className="w-64">
                        <AssetSelector 
                            baseAsset={parsedSymbol.base} 
                            quoteAsset={parsedSymbol.quote} 
                            onBaseChange={(n) => setSymbol(`${n}${parsedSymbol.quote}`)} 
                            onQuoteChange={(n) => setSymbol(`${parsedSymbol.base}${n}`)} 
                            availableQuotes={availableQuotes} 
                        />
                    </div>
                    <Select value={timeWindow} onValueChange={setTimeWindow}>
                        <SelectTrigger className="w-32 bg-slate-950 border-slate-800"><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="1">Last 1 Hour</SelectItem><SelectItem value="4">Last 4 Hours</SelectItem><SelectItem value="24">Last 24 Hours</SelectItem><SelectItem value="168">Last 7 Days</SelectItem></SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading && !data ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                    <Activity className="h-12 w-12 text-indigo-500 animate-pulse mb-4" />
                    <h2 className="text-xl font-bold animate-pulse">Running DuckDB Aggregations...</h2>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* TOP ROW */}
                    <Card className="bg-slate-950/40 border-slate-800 shadow-xl lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-widest text-slate-300">Bot Dominance Ratio & Toxicity (VPIN)</CardTitle>
                            <CardDescription>Visualizing algorithmic manipulation shifts and toxic flow accumulation every 15 minutes.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-72">
                            {combinedSeries.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={combinedSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="vpinGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="entGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="time" tickFormatter={formatTime} stroke="#475569" fontSize={10} tickMargin={10} />
                                        <YAxis stroke="#475569" fontSize={10} tickFormatter={(val) => val.toFixed(1)} />
                                        <RechartsTooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} 
                                            labelFormatter={(l) => format(new Date(l), "MMM dd, HH:mm")}
                                        />
                                        <Legend verticalAlign="top" height={36} iconType="circle"/>
                                        <Area type="monotone" name="Toxicity (VPIN)" dataKey="VPIN" stroke="#ef4444" fillOpacity={1} fill="url(#vpinGradient)" strokeWidth={2} />
                                        <Area type="monotone" name="Bot Entropy (Manipulation)" dataKey="Entropy" stroke="#3b82f6" fillOpacity={1} fill="url(#entGradient)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 italic">No anomaly data found for this window.</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-950/40 border-slate-800 shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-widest text-slate-300">Manipulation Index</CardTitle>
                            <CardDescription>Ratio of authentic vs spoofed/hidden liquidity.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-72 flex flex-col items-center justify-center relative">
                            {pieData.length > 0 ? (
                                <>
                                    <ResponsiveContainer width="100%" height="80%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                            </Pie>
                                            <RechartsTooltip formatter={(v: number) => formatVol(v)} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="w-full grid grid-cols-2 gap-2 text-xs mt-2 px-4">
                                        {pieData.map(d => (
                                            <div key={d.name} className="flex flex-col items-center text-center">
                                                <span className="flex items-center gap-1 font-bold truncate" style={{color: d.color}}>
                                                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}/>
                                                    {d.name.split(' ')[0]}
                                                </span>
                                                <span className="opacity-70 font-mono">{formatVol(d.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-slate-500 italic">No high-IQ prints detected.</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* BOTTOM ROW */}
                    <Card className="bg-slate-950/40 border-slate-800 shadow-xl lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-widest text-slate-300 flex items-center gap-2"><Anchor className="h-4 w-4 text-amber-500"/> Institutional Iceberg Levels</CardTitle>
                            <CardDescription>Mathematical aggregation of hidden liquidity walls to find "True" Support/Resistance.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-80">
                            {icebergBars.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={icebergBars} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                        <XAxis type="number" tickFormatter={(val) => `$${(val/1e6).toFixed(1)}M`} stroke="#475569" fontSize={10} />
                                        <YAxis dataKey="price" type="category" stroke="#e2e8f0" fontSize={11} fontWeight="bold" width={80} />
                                        <RechartsTooltip formatter={(v: number) => formatVol(v)} cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}/>
                                        <Bar dataKey="volume" name="Hidden USD Volume" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} >
                                           {icebergBars.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.volume > 5000000 ? '#ef4444' : '#f59e0b'} />
                                            ))} 
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 italic">No iceberg clustering found.</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-950/40 border-slate-800 shadow-xl flex flex-col">
                        <CardHeader className="shrink-0">
                            <CardTitle className="text-sm uppercase tracking-widest text-slate-300 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-emerald-500"/> Chain-Reaction Liquidations</CardTitle>
                            <CardDescription>Major force-closures (Cascades).</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-2">
                            {data?.liquidations?.length > 0 ? (
                                <div className="space-y-2">
                                    {data.liquidations.map((liq: any, i: number) => {
                                        let md = { side: 'BUY' };
                                        try { if(liq.metadata) md = JSON.parse(liq.metadata); } catch(e){}
                                        // A 'BUY' liquidation means a Short got liquidated (they are forced to buy back).
                                        // A 'SELL' liquidation means a Long got liquidated (they are forced to sell).
                                        const isShortRekt = md.side === 'BUY';
                                        
                                        return (
                                            <div key={i} className={cn("p-2 border rounded-lg text-xs flex justify-between items-center", isShortRekt ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-rose-500/20 bg-rose-500/10 text-rose-400")}>
                                                <div className="flex flex-col">
                                                    <span className="font-bold flex items-center gap-1">
                                                        {isShortRekt ? <ArrowUpRight className="h-3 w-3"/> : <ArrowDownRight className="h-3 w-3"/>}
                                                        {isShortRekt ? "Short Squeeze" : "Long Cascade"}
                                                    </span>
                                                    <span className="opacity-70 font-mono text-[9px] mt-0.5">{formatTime(liq.timestamp)}</span>
                                                </div>
                                                <div className="text-right flex flex-col">
                                                    <span className="font-black font-mono">{formatVol(liq.volume_usd)}</span>
                                                    <span className="opacity-70 font-mono text-[10px]">@ {liq.price}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 italic">No major liquidations in this window.</div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
