/**
 * 🛰️ Sentinel Machine: Dashboard (The Command Center)
 * Documentation: src/app/(app)/dashboard/README.md
 * Mission: Zero-latency global heartbeat and centralized visualization.
 */
"use client"

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { OpenPositions } from "@/components/dashboard/open-positions";
import { getAccountBalance, getOpenPositions } from "@/lib/binance-service";
import { useApi } from "@/context/api-context";
import { useBot } from "@/context/bot-context";
import type { Portfolio, Position } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Bot, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNerve } from "@/hooks/use-nerve";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { isConnected, activeProfile, apiLimit, setApiLimit, rateLimitThreshold } = useApi();
  const { isTradingActive, closePosition } = useBot();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (isTradingActive || !isConnected || !activeProfile) {
        setIsLoading(false);
        setPortfolio(null);
        setPositions([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      if (apiLimit.used >= rateLimitThreshold) {
          setError(`API rate limit threshold reached. Used: ${apiLimit.used}. Please wait a moment.`);
          toast({ title: "Rate Limit Reached", description: "Fetching paused to avoid exceeding API limits.", variant: "destructive"});
          setIsLoading(false);
          return;
      }

      try {
        const keys = { apiKey: activeProfile.apiKey, secretKey: activeProfile.secretKey };
        const [{ data: realPortfolio, usedWeight: pnlWeight }, { data: realPositions, usedWeight: posWeight }] = await Promise.all([
          getAccountBalance(keys, activeProfile.useDirectConnection),
          getOpenPositions(keys, activeProfile.useDirectConnection),
        ]);
        
        setApiLimit({ used: posWeight, limit: 1200 });
        setPortfolio(realPortfolio);
        setPositions(realPositions);

      } catch (error: any) {
        console.error(error);
        setPortfolio(null);
        setPositions([]);
        
        if (error.message.includes('Service unavailable')) {
           setError(error.message);
        } else {
           const errorMessage = `Failed to fetch live data using '${activeProfile?.name}'. Please check your API key permissions or try again later.`;
           setError(errorMessage);
           toast({ title: "Data Fetch Failed", description: error.message || "Could not retrieve data from Binance.", variant: "destructive"});
        }
      }
      setIsLoading(false);
    };

    fetchData();
  }, [isConnected, activeProfile, toast, setApiLimit, rateLimitThreshold, isTradingActive]);

  const { connected } = useNerve();
  const MACHINE_ID = 'SENTINEL-NODE-1-DASHBOARD';

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar pb-12 animate-in fade-in duration-500 px-6">
        <div className="flex justify-between items-end mb-6 shrink-0 mt-4">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-emerald-500 flex items-center gap-3 uppercase">
                        <Globe className="h-8 w-8 text-indigo-500" />
                        SENTINEL-1: DASHBOARD
                    </h1>
                    <div className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-500 border",
                        connected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                    )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", connected ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                        {connected ? "Nerve Active" : "Searching for Mother..."}
                    </div>
                </div>
                <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold opacity-70">
                    Sovereign Command Center & Centralized Heartbeat Monitor
                </p>
            </div>
        </div>

    <div className="space-y-6">
      {isTradingActive && (
        <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
            <Bot className="h-4 w-4" />
            <AlertTitle>Live Bot Session Active</AlertTitle>
            <AlertDescription>
                Dashboard data is paused to prioritize live trading. Check the <Link href="/live" className="font-bold underline">Live Trading</Link> or <Link href="/manual" className="font-bold underline">Manual Trading</Link> pages for real-time updates.
            </AlertDescription>
        </Alert>
      )}

      {!isConnected && !isTradingActive && (
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>API Disconnected</AlertTitle>
          <AlertDescription>
            Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> in the Settings page to see live data.
          </AlertDescription>
        </Alert>
      )}

      {error && !isTradingActive && (
         <Alert variant="destructive">
          {error.includes('Service unavailable') ? <Globe className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
          <AlertTitle>{error.includes('Service unavailable') ? 'Geo-Restriction Error' : 'API Error'}</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <PortfolioSummary 
        isLoading={isLoading && isConnected && !isTradingActive}
        balance={portfolio?.balance} 
        totalPnl={portfolio?.totalPnl} 
        dailyVolume={portfolio?.dailyVolume} 
      />
      
      <OpenPositions 
        positions={positions} 
        isLoading={isLoading && isConnected && !isTradingActive}
        onClosePosition={closePosition}
        permissions={activeProfile?.permissions}
      />
      </div>
    </div>
  );
}
