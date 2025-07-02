"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, BarChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type PortfolioSummaryProps = {
  balance?: number;
  totalPnl?: number;
  dailyVolume?: number;
  isLoading?: boolean;
};

export function PortfolioSummary({ balance = 0, totalPnl = 0, dailyVolume = 0, isLoading }: PortfolioSummaryProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  
  const pnlColor = totalPnl >= 0 ? "text-green-500" : "text-red-500";

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
              <p className="text-xs text-muted-foreground">+2.1% from last month</p>
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total PNL</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
           {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <>
              <div className={`text-2xl font-bold ${pnlColor}`}>{formatCurrency(totalPnl)}</div>
              <p className="text-xs text-muted-foreground">Lifetime performance</p>
            </>
           )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
          <BarChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
           {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold">{formatCurrency(dailyVolume)}</div>
              <p className="text-xs text-muted-foreground">+15% from yesterday</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
