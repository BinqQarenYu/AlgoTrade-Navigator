/**
 * 🔬 AI Research Lab: The Master Signal Archive ("The Black Box")
 * 
 * Mission: Audit the AI Analyst and Retrospective Teacher.
 * Context: Causal correlation between News (Cause) and Orderbook (Effect).
 */

"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Brain, Search, Database, Fingerprint, History, Info, CheckCircle2, XCircle, Activity } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  Cell, Legend 
} from 'recharts'

export default function AIResearchLab() {
    const [lessons, setLessons] = useState<any[]>([]);
    const [selectedLesson, setSelectedLesson] = useState<any>(null);
    const [traceData, setTraceData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTraceLoading, setIsTraceLoading] = useState(false);
    const [isMlTraining, setIsMlTraining] = useState(false);
    const [mlStats, setMlStats] = useState<any>(null);

    const handleTrainMl = async () => {
        setIsMlTraining(true);
        try {
            const res = await fetch('/api/ml/train', { method: 'POST' });
            const data = await res.json();
            if (data.success && data.market_states) {
                setMlStats(data);
                fetchLessons();
            } else {
                alert(data.message || 'ML Training skipped or failed.');
            }
        } catch (e: any) {
            console.error(e);
            alert("ML Engine failed. Check terminal.");
        } finally {
            setIsMlTraining(false);
        }
    };

    useEffect(() => {
        fetchLessons();
    }, []);

    useEffect(() => {
        if (selectedLesson) {
            fetchTrace(selectedLesson.event_id);
        }
    }, [selectedLesson]);

    const fetchTrace = async (id: string) => {
        setIsTraceLoading(true);
        try {
            const res = await fetch(`/api/db/trace?eventId=${id}`);
            const json = await res.json();
            if (json.success && json.data.microstructure_events) {
                // Bucket into 1-minute bins for cleaner charting
                const events = json.data.microstructure_events;
                const buckets = new Map();
                
                events.forEach((ev: any) => {
                    const minute = Math.floor(ev.timestamp / 60000) * 60000;
                    const existing = buckets.get(minute) || { time: minute, Whale: 0, Liq: 0 };
                    if (ev.event_type.includes('WHALE')) existing.Whale += ev.volume_usd;
                    if (ev.event_type === 'LIQUIDATION') existing.Liq += ev.volume_usd;
                    buckets.set(minute, existing);
                });

                setTraceData(Array.from(buckets.values()).sort((a, b) => a.time - b.time));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsTraceLoading(false);
        }
    };

    const fetchLessons = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/db/lessons?limit=20');
            const json = await res.json();
            if (json.success) setLessons(json.data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (ms: any) => format(new Date(Number(ms)), "MMM dd, HH:mm:ss");

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden pb-12 animate-in fade-in duration-500">
            
            {/* Header */}
            <div className="flex justify-between items-end mb-6 mt-4 px-2">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-blue-500 flex items-center gap-3">
                        <Brain className="h-8 w-8 text-emerald-500" />
                        AI RESEARCH LAB: SIGNAL ARCHIVE
                    </h1>
                    <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold opacity-70">
                        The Master Knowledge Vault for Retrospective AI Lessons.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleTrainMl}
                        disabled={isMlTraining}
                        className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 p-2 px-4 rounded-xl text-xs font-bold text-blue-400 transition-colors"
                    >
                        <Database className={cn("h-4 w-4", isMlTraining && "animate-spin")} />
                        {isMlTraining ? "TRAINING XGBOOST..." : "FORCE ML RETRAIN"}
                    </button>
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl text-[10px] font-mono text-slate-400">
                        <Database className="h-3 w-3 text-emerald-500"/>
                        DUCKDB VAULT SYNC: OK
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                
                {/* 1. Knowledge Vault (The List) */}
                <Card className="bg-slate-950/40 border-slate-800 shadow-xl lg:col-span-1 flex flex-col min-h-0">
                    <CardHeader className="py-4 border-b border-slate-800/50">
                        <CardTitle className="text-sm uppercase tracking-widest text-slate-300 flex items-center gap-2">
                            <History className="h-4 w-4 text-emerald-500"/> Master Database
                        </CardTitle>
                        <CardDescription>Auditing {lessons.length} mature causal links.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto custom-scrollbar p-2 mt-2">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center text-slate-500 animate-pulse">Loading Vault...</div>
                        ) : lessons.length > 0 ? (
                            <div className="space-y-4">
                                {lessons.map((lesson) => (
                                    <div 
                                        key={lesson.event_id} 
                                        onClick={() => setSelectedLesson(lesson)}
                                        className={cn(
                                            "p-3 rounded-lg border transition-all cursor-pointer hover:border-emerald-500/50",
                                            selectedLesson?.event_id === lesson.event_id 
                                                ? "bg-emerald-500/10 border-emerald-500/50" 
                                                : "bg-slate-900/50 border-slate-800"
                                        )}
                                    >
                                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex justify-between">
                                            <span>{lesson.source} | {lesson.asset_scope}</span>
                                            <span>{formatTime(lesson.timestamp)}</span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-100 line-clamp-2 leading-relaxed">
                                            {lesson.headline}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="px-1.5 py-0.5 rounded bg-slate-950 text-[9px] font-mono border border-slate-800">
                                                RS: {lesson.relevance_score.toFixed(1)}
                                            </div>
                                            {lesson.metadata && (
                                                <div className="flex items-center gap-1 text-[9px] text-emerald-400">
                                                    <CheckCircle2 className="h-2.5 w-2.5"/> GRADED BY AI
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500 italic">No mature signals buffered.</div>
                        )}
                    </CardContent>
                </Card>

                {/* 2. Research Analysis Terminal */}
                <Card className="bg-slate-950/40 border-slate-800 shadow-xl lg:col-span-2 flex flex-col min-h-0 relative">
                    {selectedLesson ? (
                        <>
                            <CardHeader className="border-b border-slate-800/50 bg-slate-900/20">
                                <CardTitle className="text-xl font-black text-white flex items-center gap-2">
                                    <Fingerprint className="h-6 w-6 text-emerald-500"/> Signal Analysis: {selectedLesson.event_id}
                                </CardTitle>
                                <CardDescription>{selectedLesson.headline}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                                
                                {/* AI Lesson Block */}
                                {selectedLesson.metadata && (
                                    <div className="space-y-4 bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl relative overflow-hidden">
                                        <div className="absolute top-[-20px] right-[-20px] opacity-10">
                                            <Brain className="h-32 w-32 text-emerald-500"/>
                                        </div>
                                        <h3 className="text-xs uppercase font-black text-emerald-400 tracking-widest flex items-center gap-2">
                                            Gemini Retrospective Lesson:
                                        </h3>
                                        {/* Dynamic lesson parsing */}
                                        <div className="text-lg font-medium text-slate-200 indent-4 tracking-tight">
                                            "{JSON.parse(selectedLesson.metadata).lesson?.lesson || 'Lesson metadata pending...'}"
                                        </div>
                                        <div className="flex items-center gap-4 mt-6">
                                            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 flex-1">
                                                <div className="text-[10px] text-slate-500 uppercase font-black mb-1">Causal Outcome</div>
                                                <div className="text-sm font-bold text-white uppercase">{JSON.parse(selectedLesson.metadata).lesson?.outcome || 'UNKNOWN'}</div>
                                            </div>
                                            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 flex-1">
                                                <div className="text-[10px] text-slate-500 uppercase font-black mb-1">True Significance</div>
                                                <div className="text-sm font-bold text-white">{JSON.parse(selectedLesson.metadata).lesson?.true_significance || '?'}/10.0</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Microstructure Causal Trace Chart */}
                                <div className="space-y-4 pt-4 border-t border-slate-800">
                                    <h3 className="text-xs uppercase font-black text-slate-400 tracking-widest flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Activity className="h-4 w-4 text-rose-500"/>
                                            Causal Impact Trace (±5m Window)
                                        </div>
                                        {isTraceLoading && <span className="text-[9px] animate-pulse">Syncing Vault...</span>}
                                    </h3>
                                    
                                    <div className="bg-slate-900/40 rounded-xl h-72 border border-slate-800 p-4">
                                        {traceData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ReBarChart data={traceData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                                    <XAxis 
                                                        dataKey="time" 
                                                        tickFormatter={(t) => format(t, "HH:mm")} 
                                                        stroke="#475569" 
                                                        fontSize={10} 
                                                    />
                                                    <YAxis 
                                                        stroke="#475569" 
                                                        fontSize={10} 
                                                        tickFormatter={(v) => `$${(v/1e3).toFixed(0)}k`} 
                                                    />
                                                    <RechartsTooltip 
                                                        labelFormatter={(t) => format(t, "HH:mm:ss")}
                                                        contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px' }}
                                                        itemStyle={{ fontSize: '10px' }}
                                                    />
                                                    <Legend wrapperStyle={{ fontSize: '10px' }} iconType="circle"/>
                                                    <Bar dataKey="Whale" fill="#3b82f6" name="Whale Order Vol" radius={[4, 4, 0, 0]} barSize={20} />
                                                    <Bar dataKey="Liq" fill="#f43f5e" name="Liquidation Burst" radius={[4, 4, 0, 0]} barSize={20} />
                                                </ReBarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                                                <Search className={cn("h-8 w-8 opacity-20", isTraceLoading && "animate-spin")}/>
                                                <div className="text-[10px] uppercase font-bold tracking-widest">
                                                    {isTraceLoading ? "Mining Causal Links..." : "Zero Anomalous Reaction Found"}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Override Controls */}
                                <div className="flex items-center gap-4 pt-8">
                                    <button className="flex-1 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 py-3 rounded-lg text-xs font-bold uppercase tracking-widest">
                                        Verify This Signal
                                    </button>
                                    <button className="flex-1 bg-slate-900 border border-slate-800 hover:border-red-500/50 py-3 rounded-lg text-xs font-bold uppercase tracking-widest">
                                        Flag as Noise
                                    </button>
                                </div>
                            </CardContent>
                        </>
                    ) : (
                        <div className="flex-1 h-full flex flex-col items-center justify-center space-y-4 p-12 text-center">
                            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800">
                                <Info className="h-10 w-10 text-slate-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-300">Select a Lesson from the Vault</h3>
                                <p className="text-sm text-slate-500 max-w-sm mt-2">
                                    Auditing causal links helps the Sentinel cluster improve its predictive confidence.
                                </p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}
