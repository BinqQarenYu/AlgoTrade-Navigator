
"use client"

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { OpenPositions } from "@/components/dashboard/open-positions";
import { TradeHistory } from "@/components/dashboard/trade-history";
import { getAccountBalance, getOpenPositions, getTradeHistory } from "@/lib/binance-service";
import { getSentimentForTickers } from "@/lib/coingecko-service";
import { useApi } from "@/context/api-context";
import { useBot } from "@/context/bot-context";
import type { Portfolio, Position, Trade, CoinSentimentData } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarketSentiment } from "@/components/dashboard/market-sentiment";
import { AIAnalyticsCard } from "@/components/dashboard/ai-analytics-card";

export default function DashboardPage() {
  const { isConnected, apiKey, secretKey, activeProfile, apiLimit, setApiLimit, rateLimitThreshold, coingeckoApiKey, coinmarketcapApiKey } = useApi();
  const { isTradingActive, closePosition } = useBot();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<Trade[]>([]);
  const [sentiments, setSentiments] = useState<CoinSentimentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSentimentLoading, setIsSentimentLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (isTradingActive) {
        setIsLoading(false);
        setIsSentimentLoading(false);
        setPortfolio(null);
        setPositions([]);
        setHistory([]);
        setSentiments([]);
        return;
      }

      setIsLoading(true);
      setIsSentimentLoading(true);
      setError(null);

      // Fetch CoinGecko sentiment data regardless of Binance connection
      try {
        const sentimentData = await getSentimentForTickers(['BTC', 'ETH', 'SOL'], coingeckoApiKey);
        setSentiments(sentimentData);
      } catch (e) {
        console.error("Failed to fetch sentiment data", e);
        // Don't show a toast for this, it's a non-critical feature
        setSentiments([]);
      } finally {
        setIsSentimentLoading(false);
      }


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
          // Fetch portfolio, positions, and trades in parallel
          const [
            { data: realPortfolio, usedWeight: pnlWeight },
            { data: realPositions, usedWeight: posWeight },
            { data: btcTrades, usedWeight: btcWeight },
            { data: ethTrades, usedWeight: ethWeight },
            { data: solTrades, usedWeight: solWeight },
          ] = await Promise.all([
            getAccountBalance(apiKey, secretKey),
            getOpenPositions(apiKey, secretKey),
            getTradeHistory("BTCUSDT", apiKey, secretKey),
            getTradeHistory("ETHUSDT", apiKey, secretKey),
            getTradeHistory("SOLUSDT", apiKey, secretKey),
          ]);
          
          setApiLimit({ used: solWeight, limit: 1200 }); // The last call's weight is the most up-to-date total
          
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
          const errorMessage = `Failed to fetch live data using '${activeProfile?.name}'. Please check your API key permissions or try again later.`;
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
  }, [isConnected, apiKey, secretKey, toast, activeProfile, setApiLimit, rateLimitThreshold, isTradingActive, coingeckoApiKey, coinmarketcapApiKey]);

  const handleClearHistory = () => {
    setHistory([]);
    toast({
        title: "Trade History Cleared",
        description: "Your trade history has been cleared from view. It will reappear on the next data fetch."
    })
  }

  return (
    <div className="space-y-6">
      {isTradingActive && (
        <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
            <Bot className="h-4 w-4" />
            <AlertTitle>Trading Session Active</AlertTitle>
            <AlertDescription>
                Live data fetching on the dashboard is paused to prioritize an active trading session. Check the <Link href="/live" className="font-bold underline">Live</Link>, <Link href="/manual" className="font-bold underline">Manual</Link>, or <Link href="/multi-signal" className="font-bold underline">Multi-Signal</Link> pages.
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <OpenPositions 
                positions={positions} 
                isLoading={isLoading && isConnected && !isTradingActive}
                onClosePosition={closePosition}
                permissions={activeProfile?.permissions}
            />
        </div>
        <div className="lg:col-span-1 space-y-6">
            <AIAnalyticsCard />
            <MarketSentiment sentiments={sentiments} isLoading={isSentimentLoading} />
        </div>
        <div className="lg:col-span-3">
            <TradeHistory trades={history} onClear={handleClearHistory} />
        </div>
      </div>
    </div>
  );
}
