"use client"

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { OpenPositions } from "@/components/dashboard/open-positions";
import { TradeHistory } from "@/components/dashboard/trade-history";
import { portfolio as mockPortfolio, openPositions, tradeHistory } from "@/lib/mock-data";
import { getAccountBalance } from "@/lib/binance-service";
import { useApi } from "@/context/api-context";
import type { Portfolio } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function DashboardPage() {
  const { isConnected, apiKey, secretKey } = useApi();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      if (isConnected && apiKey && secretKey) {
        try {
          const realPortfolio = await getAccountBalance(apiKey, secretKey);
          setPortfolio(realPortfolio);
        } catch (error) {
          console.error(error);
          setPortfolio(mockPortfolio); // Fallback to mock
        }
      } else {
        setPortfolio(mockPortfolio); // Use mock if not connected
      }
      setIsLoading(false);
    };

    fetchData();
  }, [isConnected, apiKey, secretKey]);

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

      <PortfolioSummary 
        isLoading={isLoading}
        balance={portfolio?.balance} 
        totalPnl={portfolio?.totalPnl} 
        dailyVolume={portfolio?.dailyVolume} 
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
            <OpenPositions positions={openPositions} />
        </div>
        <div className="lg:col-span-2">
            <TradeHistory trades={tradeHistory} />
        </div>
      </div>
    </div>
  );
}
