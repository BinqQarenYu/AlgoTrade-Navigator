
"use client"

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { OpenPositions } from "@/components/dashboard/open-positions";
import { TradeHistory } from "@/components/dashboard/trade-history";
import { getAccountBalance, getOpenPositions, getTradeHistory } from "@/lib/binance-service";
import { useApi } from "@/context/api-context";
import type { Portfolio, Position, Trade } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { isConnected, apiKey, secretKey } = useApi();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      if (isConnected && apiKey && secretKey) {
        try {
          // Fetch portfolio, positions, and trades in parallel
          const [realPortfolio, realPositions, btcTrades, ethTrades, solTrades] = await Promise.all([
            getAccountBalance(apiKey, secretKey),
            getOpenPositions(apiKey, secretKey),
            getTradeHistory("BTCUSDT", apiKey, secretKey),
            getTradeHistory("ETHUSDT", apiKey, secretKey),
            getTradeHistory("SOLUSDT", apiKey, secretKey),
          ]);
          setPortfolio(realPortfolio);
          setPositions(realPositions);

          // Combine and sort trade history by time (most recent first)
          const combinedHistory = [...btcTrades, ...ethTrades, ...solTrades]
            .sort((a, b) => b.timestamp - a.timestamp);
            
          setHistory(combinedHistory.slice(0, 50)); // Display the 50 most recent trades

        } catch (error: any) {
          console.error(error);
          setPortfolio(null); // Clear data on error
          setPositions([]); // Clear data on error
          setHistory([]);
          const errorMessage = "Failed to fetch live data. Please check your API key permissions or try again later.";
          setError(errorMessage);
          toast({
            title: "Data Fetch Failed",
            description: error.message || "Could not retrieve data from Binance.",
            variant: "destructive",
          });
        }
      } else {
        // If not connected, clear all data.
        setPortfolio(null);
        setPositions([]);
        setHistory([]);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [isConnected, apiKey, secretKey, toast]);

  const handleClearHistory = () => {
    setHistory([]);
    toast({
        title: "Trade History Cleared",
        description: "Your trade history has been cleared from view. It will reappear on the next data fetch."
    })
  }

  return (
    <div className="space-y-6">
      {!isConnected && (
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>API Disconnected</AlertTitle>
          <AlertDescription>
            Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> in the Settings page to see live data.
          </AlertDescription>
        </Alert>
      )}

      {error && isConnected && (
         <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>API Error</AlertTitle>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
            <OpenPositions positions={positions} isLoading={isLoading && isConnected} />
        </div>
        <div className="lg:col-span-2">
            <TradeHistory trades={history} onClear={handleClearHistory} />
        </div>
      </div>
    </div>
  );
}

    