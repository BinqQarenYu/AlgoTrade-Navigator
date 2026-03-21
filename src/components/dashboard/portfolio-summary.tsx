
"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, BarChart, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePersistentState } from "@/hooks/use-persistent-state";

type PortfolioSummaryProps = {
  balance?: number;
  totalPnl?: number;
  dailyVolume?: number;
  isLoading?: boolean;
};

export function PortfolioSummary({ balance = 0, totalPnl = 0, dailyVolume = 0, isLoading }: PortfolioSummaryProps) {
  const [isBalanceOpen, setBalanceOpen] = usePersistentState<boolean>('dashboard-balance-open', true);
  const [isPnlOpen, setPnlOpen] = usePersistentState<boolean>('dashboard-pnl-open', true);
  const [isVolumeOpen, setVolumeOpen] = usePersistentState<boolean>('dashboard-volume-open', true);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  
  const pnlColor = totalPnl >= 0 ? "text-green-500" : "text-red-500";

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-slate-950/50 border-slate-800 shadow-lg relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <Collapsible open={isBalanceOpen} onOpenChange={setBalanceOpen}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold text-slate-300">Account Balance</CardTitle>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 text-slate-400 hover:text-emerald-300">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isBalanceOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent className="relative z-10">
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-3/4 bg-slate-800/50" />
                  <Skeleton className="h-4 w-1/2 bg-slate-800/50" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-black text-slate-100">{formatCurrency(balance)}</div>
                  <p className="text-xs font-semibold text-emerald-500/80">+2.1% from last month</p>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      <Card className="bg-slate-950/50 border-slate-800 shadow-lg relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <Collapsible open={isPnlOpen} onOpenChange={setPnlOpen}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold text-slate-300">Total PNL</CardTitle>
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 text-slate-400 hover:text-indigo-300">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isPnlOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent className="relative z-10">
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-3/4 bg-slate-800/50" />
                  <Skeleton className="h-4 w-1/2 bg-slate-800/50" />
                </div>
              ) : (
                <>
                  <div className={`text-2xl font-black ${pnlColor}`}>{formatCurrency(totalPnl)}</div>
                  <p className="text-xs font-semibold text-slate-500">Lifetime performance</p>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      <Card className="bg-slate-950/50 border-slate-800 shadow-lg relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <Collapsible open={isVolumeOpen} onOpenChange={setVolumeOpen}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold text-slate-300">24h Volume</CardTitle>
            <div className="flex items-center">
              <BarChart className="h-4 w-4 text-cyan-400" />
               <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 text-slate-400 hover:text-cyan-300">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isVolumeOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent className="relative z-10">
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-3/4 bg-slate-800/50" />
                  <Skeleton className="h-4 w-1/2 bg-slate-800/50" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-black text-slate-100">{formatCurrency(dailyVolume)}</div>
                  <p className="text-xs font-semibold text-cyan-500/80">+15% from yesterday</p>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
