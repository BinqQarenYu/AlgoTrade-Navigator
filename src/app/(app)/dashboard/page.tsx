
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
      if (!isConnected || !activeProfile) {
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
          getAccountBalance(keys),
          getOpenPositions(keys),
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
  }, [isConnected, activeProfile, toast, setApiLimit, rateLimitThreshold]);

  return (
    <div className="space-y-6">
      {isTradingActive && (
        <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
            <Bot className="h-4 w-4" />
            <AlertTitle>Live Bot Session Active</AlertTitle>
            <AlertDescription>
                Your bots are running. You can monitor their individual performance on the <Link href="/live" className="font-bold underline">Live Trading</Link> or <Link href="/manual" className="font-bold underline">Manual Trading</Link> pages.
            </AlertDescription>
        </Alert>
      )}

      {!isConnected && (
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>API Disconnected</AlertTitle>
          <AlertDescription>
            Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> in the Settings page to see live data.
          </AlertDescription>
        </Alert>
      )}

      {error && (
         <Alert variant="destructive">
          {error.includes('Service unavailable') ? <Globe className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
          <AlertTitle>{error.includes('Service unavailable') ? 'Geo-Restriction Error' : 'API Error'}</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <PortfolioSummary 
        isLoading={isLoading && isConnected}
        balance={portfolio?.balance} 
        totalPnl={portfolio?.totalPnl} 
        dailyVolume={portfolio?.dailyVolume} 
      />
      
      <OpenPositions 
        positions={positions} 
        isLoading={isLoading && isConnected}
        onClosePosition={closePosition}
        permissions={activeProfile?.permissions}
      />
    </div>
  );
}
