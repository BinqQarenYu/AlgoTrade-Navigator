"use client"

import React, { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronDown, Database, HardDrive, CloudUpload, Loader2, StopCircle, Server, Activity, Clock, Zap, ShieldAlert, FolderOpen } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

import { assetSyncService, type SyncStatus } from '@/lib/sync-all-assets';

interface DbConfig {
  path: string;
  sizeMb: number;
  isActive: boolean;
  tradeCount: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
  bufferPending: number;
  timeline?: {
    targetStartMs: number;
    nowMs: number;
    coveredStartMs: number | null;
    coveredEndMs: number | null;
    coveredPercent: number;
    gapPercent: number;
  };
  isFlushing?: boolean;
}

export function DataVaultCard({ isConnected }: { isConnected: boolean }) {
  const { toast } = useToast()

  const [isStorageOpen, setIsStorageOpen] = useState(true);

  const [dbConfig, setDbConfig] = useState<DbConfig | null>(null);
  const [dbPathInput, setDbPathInput] = useState<string>('');
  const [isRelocating, setIsRelocating] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState(0);
  const [backfillDays, setBackfillDays] = useState({ covered: 0, total: 60 });
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  const [sentryStatus, setSentryStatus] = useState<any>(null);
  const [whaleThreshold, setWhaleThreshold] = useState(50000);
  const [childNodes, setChildNodes] = useState<any[]>([]);

  const refreshChildNodes = async () => {
      try {
          const res = await fetch('/api/sentry/status?t=' + Date.now());
          const data = await res.json();
          setChildNodes(data.sentries || []);
      } catch (e) {}
  };

  const refreshSentryStatus = async () => {
      try {
          const res = await fetch('/api/sentry');
          const data = await res.json();
          setSentryStatus(data);
          if (data?.config) {
              setWhaleThreshold(data.config.whaleThresholdUsd);
          }
      } catch (e) { console.error("Sentry fetch error", e); }
  };

  const handleUpdateSentryConfig = async () => {
      try {
          const res = await fetch('/api/sentry', {
             method: 'PUT',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ whaleThresholdUsd: whaleThreshold })
          });
          const data = await res.json();
          if (data.success) {
              setSentryStatus(data.status);
              toast({ title: "Sentry Configuration Saved" });
          }
      } catch (e) {}
  };

  const startManualSync = (days: number) => {
    toast({ title: "Sync Started", description: `Fetching past ${days} days for all assets sequentially via CCXT.` });
    assetSyncService.startGlobalSync(days, '1h', (status) => {
        setSyncStatus(status);
        if(!status.isRunning) {
            toast({ title: "Sync Finished", description: `Completed sync. Status: ${status.currentSymbol}`});
            refreshDbConfig();
        }
    });
  };

  const stopManualSync = () => {
    assetSyncService.stop();
    setSyncStatus(prev => prev ? { ...prev, isRunning: false, currentSymbol: 'Stopped' } : null);
    toast({ title: "Sync Stopped", description: "Manual sync was aborted by user." });
  };

  const refreshDbConfig = async (symbol = 'BTCUSDT') => {
    try {
      const res = await fetch(`/api/db/config?symbol=${symbol}`);
      if (!res.ok) return;
      const d: DbConfig = await res.json();
      setDbConfig(d);
      setDbPathInput(prev => prev || d.path);
      if (d.timeline) {
        const p = d.timeline.coveredPercent;
        setBackfillProgress(parseFloat(p.toFixed(1)));
        setBackfillDays({
          covered: parseFloat(((p / 100) * 60).toFixed(1)),
          total: 60,
        });
      }
    } catch (e) {
      console.error('Could not load DB config', e);
    }
  };

  useEffect(() => {
    refreshDbConfig();
    refreshSentryStatus();
    refreshChildNodes();
    const t = setInterval(() => {
        refreshDbConfig();
        refreshSentryStatus();
        refreshChildNodes();
    }, 15_000);
    return () => clearInterval(t);
  }, []);

  const handleRelocateDB = async () => {
    if (!dbPathInput || dbPathInput === dbConfig?.path) return;
    setIsRelocating(true);
    try {
      const res = await fetch('/api/db/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'relocate', newPath: dbPathInput }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: '✅ Database Relocated', description: `Mounted at ${dbPathInput}` });
        await refreshDbConfig();
      } else {
        toast({ title: 'Relocation Failed', description: data.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsRelocating(false);
    }
  };

  return (
    <Card className="bg-slate-950/50 border-slate-800 shadow-lg">
      <Collapsible open={isStorageOpen} onOpenChange={setIsStorageOpen}>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                    <Database className="text-primary h-5 w-5"/> Data Vault Health
                </CardTitle>
                <CardDescription>
                    DuckDB persistence engine status, backfill progress, and repository management.
                </CardDescription>
              </div>
              <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={isStorageOpen ? "Collapse Data Vault" : "Expand Data Vault"}><ChevronDown className={cn("h-4 w-4 transition-transform", isStorageOpen && "rotate-180")} /><span className="sr-only">Toggle</span></Button></CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
          <CardContent className="space-y-5">

              {/* ── Stats Grid ─────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    icon: <HardDrive className="h-4 w-4 text-primary"/>,
                    label: 'DB Size',
                    value: dbConfig ? `${dbConfig.sizeMb} MB` : '—',
                  },
                  {
                    icon: <Activity className="h-4 w-4 text-green-500"/>,
                    label: 'Trade Records',
                    value: dbConfig ? dbConfig.tradeCount.toLocaleString() : '—',
                  },
                  {
                    icon: <Clock className="h-4 w-4 text-yellow-500"/>,
                    label: 'Buffer Pending',
                    value: dbConfig ? `${dbConfig.bufferPending} rows` : '—',
                  },
                  {
                    icon: dbConfig?.isFlushing ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin"/> : <Zap className="h-4 w-4 text-blue-500"/>,
                    label: 'DB Status',
                    value: dbConfig?.isActive ? (dbConfig.isFlushing ? 'Ingesting...' : 'Connected') : 'Offline',
                  },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col gap-1 p-3 rounded-xl border border-slate-700/50 bg-slate-900/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {stat.icon}
                      {stat.label}
                    </div>
                    <p className="text-sm font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* ── SENTINEL CLUSTER STATUS (Mother-Child Hierarchy) ── */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                    <div>
                        <Label className="text-sm font-bold flex items-center gap-1.5">
                            <Server className="h-4 w-4 text-orange-500"/> Distributed Sentinel Cluster
                        </Label>
                        <p className="text-[10px] text-muted-foreground italic mt-0.5">
                            Automatic Mother-Child Hierarchy. Child (Orange Pi) is the Primary Gatherer.
                            Mother (This Node) activates only if Child is silent for 30s.
                        </p>
                    </div>
                    <Badge className={sentryStatus?.childAlive
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px]"}>
                        {sentryStatus?.childAlive ? "👑 Child is King (Live)" : "⚠️ Child Missing (Offline)"}
                    </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {/* Cluster Role Indicator */}
                    <div className="p-3 border rounded-xl bg-slate-900/50 flex flex-col gap-1.5 border-slate-800/80">
                        <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Mother Role Status</Label>
                        <div className="flex items-center gap-2 flex-wrap">
                            {sentryStatus?.isFailoverMode ? (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-black animate-pulse">FAILOVER ACTIVE</Badge>
                            ) : sentryStatus?.respawnAttempted && !sentryStatus?.childAlive ? (
                                <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30 font-black animate-pulse">RESPAWNING CHILD...</Badge>
                            ) : (
                                <Badge variant="outline" className="text-slate-500 border-slate-700 opacity-60">DORMANT (WATCHING)</Badge>
                            )}
                            {sentryStatus?.childProcessAlive && (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">PROCESS TRACKED</Badge>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                            {sentryStatus?.isFailoverMode
                              ? "Child could not be revived. Mother has taken over scanning to prevent data gaps."
                              : sentryStatus?.respawnAttempted && !sentryStatus?.childAlive
                              ? "Mother detected Child silence and sent a respawn command. Waiting for heartbeat..."
                              : "Mother is idling. Child is handling all market connections autonomously."}
                        </p>
                    </div>

                    {/* Heartbeat Monitor */}
                    <div className="p-3 border rounded-xl bg-slate-900/50 flex flex-col gap-1.5 border-slate-800/80">
                        <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Child Pulse Engine</Label>
                        <div className="flex items-center justify-between">
                            <span className={cn("text-lg font-black font-mono", sentryStatus?.childAlive ? "text-emerald-500" : "text-rose-500")}>
                                {sentryStatus?.childAlive ? "ONLINE" : "SILENT"}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                                {sentryStatus?.lastChildHeartbeat > 0
                                  ? `${Math.round((Date.now() - sentryStatus.lastChildHeartbeat) / 1000)}s ago`
                                  : 'NEVER RECEIVED'}
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                            <div
                              className={cn(
                                  "h-full transition-all duration-500 rounded-full",
                                  sentryStatus?.childAlive ? "bg-emerald-500"
                                  : sentryStatus?.respawnAttempted ? "bg-sky-500 animate-pulse"
                                  : "bg-rose-500"
                              )}
                              style={{ width: sentryStatus?.childAlive ? '100%' : sentryStatus?.respawnAttempted ? '50%' : '0%' }}
                            />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                            {sentryStatus?.childAlive
                              ? "✅ Child is actively sending data. Mother is dormant."
                              : sentryStatus?.respawnAttempted
                              ? "🔄 Auto-respawn attempted. Waiting for heartbeat confirmation..."
                              : "⚠️ No child heartbeat detected. Mother will attempt respawn on next cycle."}
                        </p>
                    </div>
                </div>
              </div>

              {/* ── Child Nodes Backlog ─────────────────────────── */}
              {childNodes.length > 0 && (
              <div className="space-y-2 border rounded-lg p-3 bg-slate-900/50">
                <Label className="text-sm font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Server className="h-4 w-4 text-orange-500"/> Remote Child Node Backlogs</span>
                    <Badge variant="secondary" className="text-[10px]">{childNodes.reduce((acc, c) => acc + (c.bufferSize || 0), 0)} Total Rows Pending</Badge>
                </Label>
                <p className="text-[10px] text-muted-foreground italic">
                  Data sitting on external sentry nodes waiting to be ingested over the network into this Mother Node's Data Vault.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                   {childNodes.map(c => (
                       <div key={c.id} className={cn("p-2 border rounded flex items-center justify-between", c.online ? "bg-emerald-500/10 border-emerald-500/20" : c.bufferSize > 0 ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "bg-slate-800/50 border-slate-700/50")}>
                           <div className="flex flex-col">
                              <span className="text-xs font-bold font-mono">{c.id.replace('sentry-', '').replace('SENTINEL-', '')} {c.id.includes('ORANGE') ? '(Orange Pi)' : ''}</span>
                              <span className="text-[10px] text-muted-foreground">{c.online ? "🟢 Connected / Syncing" : "🔴 Offline / Hoarding Data"}</span>
                           </div>
                           <div className="text-right flex flex-col items-end">
                              <span className={cn("text-xs font-black font-mono", c.bufferSize > 0 && !c.online ? "text-orange-500 animate-pulse" : c.bufferSize > 0 ? "text-amber-500" : "opacity-50")}>{c.bufferSize} rows</span>
                           </div>
                       </div>
                   ))}
                </div>
              </div>
              )}

              {/* ── Stream Status Row ─────────────────────────── */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex items-center justify-between border border-slate-800 rounded-lg p-3 bg-slate-900/50">
                    <div>
                        <Label className="text-sm font-bold flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-yellow-500"/>Live Sync Stream</Label>
                        <p className="text-xs text-slate-400 mt-0.5">WebSocket → DuckDB instant write</p>
                    </div>
                    <Badge className={isConnected ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs" : "bg-slate-800/50 text-slate-400 border border-slate-700 text-xs"} variant={isConnected ? "default" : "secondary"}>
                        {isConnected ? "🟢 Active" : "⚪ Paused"}
                    </Badge>
                </div>
                <div className="flex-1 flex items-center justify-between border border-slate-800 rounded-lg p-3 bg-slate-900/50">
                    <div>
                        <Label className="text-sm font-bold flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-blue-500"/>Backfill Engine</Label>
                        <p className="text-xs text-slate-400 mt-0.5">Background REST gap fill</p>
                    </div>
                    <Badge className="text-xs" variant={backfillProgress >= 100 ? "default" : "secondary"}>
                        {backfillProgress >= 100 ? "✅ Complete" : "⏳ Running"}
                    </Badge>
                </div>
              </div>

              {/* ── Timeline Map ──────────────────────────────── */}
              <div className="space-y-2 border rounded-lg p-4 bg-black/20">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground">Historical Coverage Timeline</span>
                  <span className="text-primary">{backfillDays.covered} / {backfillDays.total} days</span>
                </div>
                <div className="relative h-4 rounded-full bg-muted overflow-hidden">
                  {/* Covered range */}
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-700"
                    style={{ width: `${backfillProgress}%` }}
                  />
                  {/* Gap (not yet fetched) */}
                  <div
                    className="absolute top-0 h-full bg-red-500/30"
                    style={{ left: `${backfillProgress}%`, width: `${100 - backfillProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>2 months ago</span>
                  {dbConfig?.timeline?.coveredStartMs && (
                    <span className="text-primary font-medium">
                      {new Date(dbConfig.timeline.coveredStartMs).toLocaleDateString()} fetched
                    </span>
                  )}
                  <span>Now</span>
                </div>
                <Progress value={backfillProgress} className="h-1.5" />
                <p className="text-center text-xs font-bold">{backfillProgress}% Complete</p>
              </div>

              {/* ── Relocation Section ───────────────────────── */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm font-bold flex items-center gap-1.5">
                  <FolderOpen className="h-4 w-4"/> Relocate Repository
                </Label>
                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                    <Input
                        value={dbPathInput}
                        onChange={(e) => setDbPathInput(e.target.value)}
                        placeholder="e.g. D:\DataVault\algo_trades.duckdb"
                        className="font-mono text-xs sm:text-sm flex-1"
                    />
                    <Button
                      onClick={handleRelocateDB}
                      disabled={isRelocating || !dbPathInput || dbPathInput === dbConfig?.path}
                      className="shrink-0"
                      size="sm"
                    >
                        {isRelocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HardDrive className="mr-2 h-4 w-4" />}
                        {isRelocating ? "Migrating..." : "Move DB"}
                    </Button>
                </div>
                <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                  Atomically flushes all pending writes, closes the database, physically moves the <code>.duckdb</code> file to the new path, and remounts. Zero data loss.
                </p>
              </div>

              {/* ── Manual Backfill Sync ─────────────────────── */}
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-sm font-bold flex items-center gap-1.5">
                  <CloudUpload className="h-4 w-4"/> Manual Data Sync (CCXT)
                </Label>
                <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                  Force a sequential CCXT engine download of all supported assets to fill DuckDB gaps instantly without hitting Binance 429 rate limits.
                </p>

                {syncStatus && syncStatus.isRunning ? (
                    <div className="flex flex-col gap-2 p-3 bg-indigo-950/20 border border-indigo-900/50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-400">Syncing {syncStatus.currentSymbol}...</span>
                            <span className="text-xs font-bold">{syncStatus.progressPercent}%</span>
                        </div>
                        <Progress value={syncStatus.progressPercent} className="h-1.5 bg-indigo-500" />
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{syncStatus.completedSymbols.length} / {syncStatus.totalSymbols} Assets</span>
                            <Button variant="ghost" size="sm" onClick={stopManualSync} className="h-6 text-red-400 hover:bg-red-950/30 hover:text-red-300">
                                <StopCircle className="h-3 w-3 mr-1" /> Abort
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2">
                     <Button variant="outline" size="sm" className="flex-1 bg-slate-900/50 hover:bg-indigo-950/50 hover:text-indigo-300 hover:border-indigo-800 transition-colors" onClick={() => startManualSync(7)}>
                         <Database className="h-4 w-4 mr-2" /> Sync 7 Days
                     </Button>
                     <Button variant="outline" size="sm" className="flex-1 bg-slate-900/50 hover:bg-indigo-950/50 hover:text-indigo-300 hover:border-indigo-800 transition-colors" onClick={() => startManualSync(30)}>
                         <Database className="h-4 w-4 mr-2" /> Sync 30 Days
                     </Button>
                    </div>
                )}
              </div>

              {/* ── Headless Sentry Control ──────────────────────── */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                    <div>
                        <Label className="text-sm font-bold flex items-center gap-1.5">
                            <ShieldAlert className="h-4 w-4 text-rose-500"/> Headless Anomaly Sentry
                        </Label>
                        <p className="text-[10px] text-muted-foreground italic mt-1">
                            Runs 24/7 in the background (Node.js). Detects and saves Whales, Icebergs, and VPIN spikes directly to DuckDB.
                        </p>
                    </div>
                    <Badge className={sentryStatus?.isRunning ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold" : "bg-slate-800/50 text-slate-400 font-bold"} variant={sentryStatus?.isRunning ? "default" : "secondary"}>
                        {sentryStatus?.isRunning ? "🟢 Online" : "⚪ Dormant"}
                    </Badge>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                    <div className="flex-1 space-y-2">
                        <Label className="text-xs font-semibold text-slate-300">Minimum Whale Threshold (USD)</Label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                value={whaleThreshold}
                                onChange={(e) => setWhaleThreshold(Number(e.target.value))}
                                className="h-8 text-xs font-mono bg-background/50"
                            />
                            <Button size="sm" variant="secondary" className="h-8" onClick={handleUpdateSentryConfig}>Save</Button>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-end space-y-1.5">
                         <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Sentinel Guard (Mother Role)</Label>
                         <div className="flex items-center gap-2 text-xs">
                             {sentryStatus?.failoverWatchActive ? (
                                 <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">WATCH ACTIVE</Badge>
                             ) : (
                                 <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px]">WATCH STOPPED</Badge>
                             )}
                             <span className="text-[10px] text-muted-foreground leading-none">Scanning Cluster Health...</span>
                         </div>
                         <p className="text-[10px] text-slate-500 leading-tight">
                             Manual control disabled. Mother will take over scans ONLY if Child is silent for {'>'}30s.
                         </p>
                    </div>
                </div>
              </div>

          </CardContent>
          </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
