
"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, BarChart, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type PortfolioSummaryProps = {
  balance?: number;
  totalPnl?: number;
  dailyVolume?: number;
  isLoading?: boolean;
};

const usePersistentState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        if (isMounted) {
          setState(JSON.parse(item));
        }
      }
    } catch (e) {
      console.error('Failed to parse stored state', e);
    } finally {
      if (isMounted) {
        setIsHydrated(true);
      }
    }
    return () => { isMounted = false; };
  }, [key]);

  useEffect(() => {
    if (isHydrated) {
      window.localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state, isHydrated]);

  return [state, setState];
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
      <Card>
        <Collapsible open={isBalanceOpen} onOpenChange={setBalanceOpen}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isBalanceOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Collapsible>
      </Card>
      <Card>
        <Collapsible open={isPnlOpen} onOpenChange={setPnlOpen}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PNL</CardTitle>
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isPnlOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Collapsible>
      </Card>
      <Card>
        <Collapsible open={isVolumeOpen} onOpenChange={setVolumeOpen}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
            <div className="flex items-center">
              <BarChart className="h-4 w-4 text-muted-foreground" />
               <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isVolumeOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
