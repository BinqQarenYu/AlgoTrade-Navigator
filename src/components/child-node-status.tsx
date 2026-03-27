"use client"

import { useState, useEffect, useRef } from 'react';
import { Server, Activity, Shield, Zap, Cpu, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SentryNode {
  id: string;
  online: boolean;
  lastCheckIn: number;
  processedCount: number;
  bufferSize: number;
  assetCount?: number;
}

export function ChildNodeStatus() {
  const [fleetStatus, setFleetStatus] = useState<'active' | 'offline' | 'loading'>('loading');
  const [sentries, setSentries] = useState<SentryNode[]>([]);
  const [isRelaying, setIsRelaying] = useState(false);
  const prevCounts = useRef<Record<string, number>>({});

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/sentry/status?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          const newSentries = data.sentries || [];
          
          // Detect work being shared (processedCount change)
          let workDetected = false;
          newSentries.forEach((s: SentryNode) => {
            if (prevCounts.current[s.id] !== undefined && s.processedCount > 0) {
              // Any non-zero count in a check-in indicates work just happened
              workDetected = true;
            }
            prevCounts.current[s.id] = s.processedCount;
          });

          if (workDetected) {
            setIsRelaying(true);
            setTimeout(() => setIsRelaying(false), 2000);
          }

          setFleetStatus(data.fleet_status || 'offline');
          setSentries(newSentries);
        } else {
          setFleetStatus('offline');
        }
      } catch (e) {
        setFleetStatus('offline');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000); // Faster polling for 'live' feel
    return () => clearInterval(interval);
  }, []);

  if (fleetStatus === 'loading') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-800/20 bg-slate-900/10 rounded-full backdrop-blur-sm">
        <Server className="h-4 w-4 text-slate-500 animate-pulse" />
        <span className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Initializing Sentry...</span>
      </div>
    );
  }

  if (sentries.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 border border-rose-500/30 bg-rose-500/5 rounded-full backdrop-blur-md transition-all duration-500 hover:bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
         <div className="relative flex h-2.5 w-2.5">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]"></span>
         </div>
         <Shield className="h-4 w-4 text-rose-500/70" />
         <span className="text-[10px] text-rose-500 uppercase font-black tracking-[0.2em]">Fleet Critical: Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {sentries.map((sentry) => {
        const isOnline = sentry.online;
        const bufferSize = sentry.bufferSize;
        const isCaching = !isOnline && bufferSize > 0;
        const isCluster = sentry.id.startsWith('SENTINEL-CLUSTER');
        const label = sentry.id.includes('ORANGE_PI') 
            ? 'ORANGE PI 5 PLUS' 
            : sentry.id.replace('sentry-', '').replace('SENTINEL-', '').toUpperCase();
        
        const subLabel = isCluster 
            ? "Multi-Asset Sentinel Node" 
            : isOnline ? "Operational / Sharing Work" : isCaching ? "Local Buffer (Caching)" : "System Isolated";
        
        return (
          <div 
              key={sentry.id}
              className={cn(
                  "relative flex flex-col gap-0.5 min-w-[180px] px-4 py-2 border rounded-xl overflow-hidden transition-all duration-700",
                  isOnline ? "bg-emerald-500/5 border-emerald-500/20 animate-glow-emerald" : "bg-rose-500/5 border-rose-500/20",
                  isCaching && "bg-amber-500/5 border-amber-500/20 animate-glow-amber",
                  isRelaying && isOnline && "border-primary/40"
              )} 
          >
            {/* Background Work Animation */}
            {isOnline && (
                <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent animate-data-relay" />
            )}

            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="relative flex h-2.5 w-2.5">
                        {isOnline ? (
                            <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-emerald-200 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                            </>
                        ) : isCaching ? (
                            <>
                                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-amber-200"></span>
                            </>
                        ) : (
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600 border border-rose-400 shadow-[0_0_8px_rgba(225,29,72,0.8)]"></span>
                        )}
                    </div>
                    
                    <div className="flex flex-col">
                        <span className={cn(
                            "text-[11px] font-black tracking-widest uppercase",
                            isOnline ? "text-emerald-400" : isCaching ? "text-amber-400" : "text-rose-400"
                        )}>
                            {label}
                        </span>
                        <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">
                            {subLabel} {sentry.assetCount ? `[${sentry.assetCount} Assets]` : ''}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isOnline ? <Zap className={cn("h-3.5 w-3.5 transition-all duration-300", isRelaying ? "text-primary animate-pulse scale-125" : "text-emerald-400/60")} /> : <Activity className="h-3.5 w-3.5 text-rose-500/50" />}
                </div>
            </div>
            
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/5 font-mono text-[9px]">
                <div className="flex items-center gap-2 text-slate-400">
                    <div className="flex items-center gap-1">
                        <Cpu className="h-3 w-3 opacity-50" />
                        <span className={cn(isOnline && "text-emerald-400/90")}>{sentry.processedCount} RX</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Database className="h-3 w-3 opacity-50" />
                        <span className={cn(bufferSize > 0 ? "text-amber-400" : "text-slate-500")}>{bufferSize} BUF</span>
                    </div>
                </div>
                
                {isOnline && (
                    <div className="flex gap-0.5">
                        {[1,2,3,4].map(i => (
                            <div 
                                key={i} 
                                className={cn(
                                    "h-1.5 w-1.5 rounded-sm transition-all duration-300",
                                    isRelaying ? "bg-primary animate-pulse" : "bg-emerald-500/20"
                                )} 
                                style={{ animationDelay: `${i * 150}ms` }}
                            />
                        ))}
                    </div>
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
