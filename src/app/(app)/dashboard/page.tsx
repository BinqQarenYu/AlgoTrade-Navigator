"use client"

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { OpenPositions } from "@/components/dashboard/open-positions";
import { TradeHistory } from "@/components/dashboard/trade-history";
import { portfolio as mockPortfolio, openPositions as mockOpenPositions, tradeHistory as mockTradeHistory } from "@/lib/mock-data";
import { getAccountBalance, getOpenPositions } from "@/lib/binance-service";
import { useApi } from "@/context/api-context";
import type { Portfolio, Position, Trade } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { isConnected, apiKey, secretKey } = useApi();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>(mockOpenPositions);
  const [history, setHistory] = useState<Trade[]>(mockTradeHistory);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      if (isConnected && apiKey && secretKey) {
        try {
          // Fetch portfolio and positions in parallel
          const [realPortfolio, realPositions] = await Promise.all([
            getAccountBalance(apiKey, secretKey),
            getOpenPositions(apiKey, secretKey)
          ]);
          setPortfolio(realPortfolio);
          setPositions(realPositions);
        } catch (error: any) {
          console.error(error);
          setPortfolio(null); // Clear data on error
          setPositions([]); // Clear data on error
          const errorMessage = "Failed to fetch live data. Please check your API key permissions or try again later.";
          setError(errorMessage);
          toast({
            title: "Data Fetch Failed",
            description: error.message || "Could not retrieve data from Binance.",
            variant: "destructive",
          });
        }
      } else {
        // If not connected, show mock data.
        setPortfolio(mockPortfolio);
        setPositions(mockOpenPositions);
        setHistory(mockTradeHistory);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [isConnected, apiKey, secretKey, toast]);

  const handleClearHistory = () => {
    setHistory([]);
    toast({
        title: "Trade History Cleared",
        description: "Your mock trade history has been removed from view."
    })
  }

  return (
    <div className="space-y-6">
      {!isConnected && (
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>API Disconnected</AlertTitle>
          <AlertDescription>
            Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> in the Settings page to see live data. Displaying mock data.
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
