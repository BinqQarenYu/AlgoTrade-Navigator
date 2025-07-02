"use client"

import React, { useState, useEffect } from "react";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { OpenPositions } from "@/components/dashboard/open-positions";
import { TradeHistory } from "@/components/dashboard/trade-history";
import { portfolio as mockPortfolio, openPositions, tradeHistory } from "@/lib/mock-data";
import type { Portfolio } from "@/lib/types";

export default function DashboardPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching data from an API
    const fetchData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
      setPortfolio(mockPortfolio);
      setIsLoading(false);
    }
    fetchData();
  }, [])

  return (
    <div className="space-y-6">
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
