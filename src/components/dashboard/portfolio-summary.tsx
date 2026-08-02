
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, BarChart, ChevronDown, Activity } from "lucide-react";
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
      minimumFractionDigits: 2,
    }).format(value);
  
  const pnlColor = totalPnl >= 0 ? "text-emerald-400" : "text-rose-400";
  const PnlIcon = totalPnl >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="grid gap-4 md:grid-cols-3 animate-in fade-in duration-300">
      <Card className="bg-background/60 backdrop-blur-xl border border-white/10 shadow-xl hover:border-primary/40 transition-all duration-300">
        <Collapsible open={isBalanceOpen} onOpenChange={setBalanceOpen}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Account Balance
            </CardTitle>
            <div className="flex items-center gap-1">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isBalanceOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-1">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-3/4 bg-white/5" />
                  <Skeleton className="h-3 w-1/2 bg-white/5" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-extrabold font-mono tracking-tight">{formatCurrency(balance)}</div>
                  <p className="text-[11px] text-emerald-400/90 font-mono mt-1 flex items-center gap-1">
                    <Activity className="h-3 w-3" /> Live Exchange Wallet
                  </p>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Card className="bg-background/60 backdrop-blur-xl border border-white/10 shadow-xl hover:border-primary/40 transition-all duration-300">
        <Collapsible open={isPnlOpen} onOpenChange={setPnlOpen}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Lifetime PnL
            </CardTitle>
            <div className="flex items-center gap-1">
              <div className={cn("p-1.5 rounded-lg", totalPnl >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10")}>
                <PnlIcon className={cn("h-4 w-4", pnlColor)} />
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isPnlOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-1">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-3/4 bg-white/5" />
                  <Skeleton className="h-3 w-1/2 bg-white/5" />
                </div>
              ) : (
                <>
                  <div className={cn("text-2xl font-extrabold font-mono tracking-tight", pnlColor)}>
                    {totalPnl >= 0 ? `+${formatCurrency(totalPnl)}` : formatCurrency(totalPnl)}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono mt-1">Realized & Unrealized Aggregate</p>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Card className="bg-background/60 backdrop-blur-xl border border-white/10 shadow-xl hover:border-primary/40 transition-all duration-300">
        <Collapsible open={isVolumeOpen} onOpenChange={setVolumeOpen}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              24h Executed Volume
            </CardTitle>
            <div className="flex items-center gap-1">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                <BarChart className="h-4 w-4 text-indigo-400" />
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isVolumeOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-1">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-3/4 bg-white/5" />
                  <Skeleton className="h-3 w-1/2 bg-white/5" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-extrabold font-mono tracking-tight">{formatCurrency(dailyVolume)}</div>
                  <p className="text-[11px] text-muted-foreground font-mono mt-1">Total Turnaround Capacity</p>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
