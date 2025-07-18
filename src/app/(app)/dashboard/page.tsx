
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
import { Terminal, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { isConnected, apiKey, secretKey, activeProfile, apiLimit, setApiLimit, rateLimitThreshold } = useApi();
  const { isTradingActive, closePosition } = useBot();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (isTradingActive) {
        setIsLoading(false);
        setPortfolio(null);
        setPositions([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      if (isConnected && apiKey && secretKey) {
        if (apiLimit.used >= rateLimitThreshold) {
            setError(`API rate limit threshold reached. Used: ${apiLimit.used}. Please wait a moment.`);
            toast({
                title: "Rate Limit Reached",
                description: "Fetching paused to avoid exceeding API limits.",
                variant: "destructive"
            });
            setIsLoading(false);
            return;
        }

        try {
          // Fetch portfolio and positions in parallel
          const [
            { data: realPortfolio, usedWeight: pnlWeight },
            { data: realPositions, usedWeight: posWeight },
          ] = await Promise.all([
            getAccountBalance(apiKey, secretKey),
            getOpenPositions(apiKey, secretKey),
          ]);
          
          setApiLimit({ used: posWeight, limit: 1200 });
          
          setPortfolio(realPortfolio);
          setPositions(realPositions);

        } catch (error: any) {
          console.error(error);
          setPortfolio(null);
          setPositions([]);
          const errorMessage = `Failed to fetch live data using '${activeProfile?.name}'. Please check your API key permissions or try again later.`;
          setError(errorMessage);
          toast({
            title: "Data Fetch Failed",
            description: error.message || "Could not retrieve data from Binance.",
            variant: "destructive",
          });
        }
      } else {
        setPortfolio(null);
        setPositions([]);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [isConnected, apiKey, secretKey, toast, activeProfile, setApiLimit, rateLimitThreshold, isTradingActive]);


  return (
    <div className="space-y-6">
      {isTradingActive && (
        <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
            <Bot className="h-4 w-4" />
            <AlertTitle>Trading Session Active</AlertTitle>
            <AlertDescription>
                Live data fetching on the dashboard is paused to prioritize an active trading session. Check the <Link href="/live" className="font-bold underline">Live</Link> or <Link href="/manual" className="font-bold underline">Manual</Link> pages.
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
          <Terminal className="h-4 w-4" />
          <AlertTitle>API Error</AlertTitle>
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
  );
}
