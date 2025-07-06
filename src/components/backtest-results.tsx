
"use client"

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { BacktestResult, BacktestSummary } from "@/lib/types";
import { format } from 'date-fns';
import { ScrollArea } from "./ui/scroll-area";
import { cn, formatPrice } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Info, ChevronDown, GripHorizontal } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Button } from "./ui/button";

type BacktestResultsProps = {
  results: BacktestResult[];
  summary: BacktestSummary | null;
  onSelectTrade: (trade: BacktestResult) => void;
  selectedTradeId?: string | null;
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

const SummaryStat = ({ label, value, tooltipContent }: { label: string, value: React.ReactNode, tooltipContent?: string }) => {
  if (tooltipContent) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center justify-center p-2 rounded-md bg-muted/50 text-center cursor-help">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {label}
              <Info className="h-3 w-3" />
            </div>
            <div className="text-base md:text-lg font-bold truncate">{value}</div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-2 rounded-md bg-muted/50 text-center">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-base md:text-lg font-bold truncate">{value}</div>
    </div>
  );
};

export function BacktestResults({ results, summary, onSelectTrade, selectedTradeId }: BacktestResultsProps) {
  const [isOpen, setIsOpen] = usePersistentState<boolean>('backtest-results-open', true);
  const [logHeight, setLogHeight] = usePersistentState<number>('backtest-results-height', 288);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent<HTMLDivElement>) => {
    mouseDownEvent.preventDefault();
    const startHeight = logHeight;
    const startPosition = mouseDownEvent.clientY;

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const newHeight = startHeight + mouseMoveEvent.clientY - startPosition;
      if (newHeight >= 150 && newHeight <= 800) {
        setLogHeight(newHeight);
      }
    };

    const onMouseUp = () => {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, { once: true });
  }, [logHeight, setLogHeight]);


  if (!summary) {
    return (
      <Card>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Backtest Results</CardTitle>
              <CardDescription>Run a backtest to see the results here.</CardDescription>
            </div>
            <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                    <span className="sr-only">Toggle</span>
                </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
                <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md">
                    <p>Results will be displayed after a backtest is complete.</p>
                </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    )
  }

  const pnlColor = summary.totalPnl >= 0 ? "text-green-500" : "text-red-500";
  const winRateColor = summary.winRate >= 50 ? "text-green-500" : "text-red-500";
  const profitFactorColor = summary.profitFactor >= 1 ? "text-green-500" : "text-red-500";
  const returnColor = summary.totalReturnPercent >= 0 ? "text-green-500" : "text-red-500";

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Backtest Results</CardTitle>
            <CardDescription>A summary of the simulated trading performance. Click a trade to view it on the chart.</CardDescription>
          </div>
          <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                  <span className="sr-only">Toggle</span>
              </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6 pb-8">
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-4">
                <SummaryStat 
                    label="Net PNL" 
                    value={<span className={pnlColor}>${summary.totalPnl.toFixed(2)}</span>}
                    tooltipContent="The total profit or loss from all trades, after deducting all commission fees. Formula: Gross P/L - Total Fees."
                />
                <SummaryStat 
                    label="Win Rate" 
                    value={<span className={winRateColor}>{summary.winRate.toFixed(2)}%</span>}
                    tooltipContent="The percentage of trades that were profitable (closed with a positive PNL). Formula: (Winning Trades / Total Trades) * 100."
                />
                <SummaryStat 
                    label="Profit Factor" 
                    value={<span className={profitFactorColor}>{isFinite(summary.profitFactor) ? summary.profitFactor.toFixed(2) : '∞'}</span>}
                    tooltipContent="The ratio of gross profit to gross loss. A value greater than 1 indicates a profitable system. Formula: Gross Profit / Gross Loss."
                />
                <SummaryStat 
                    label="Total Return" 
                    value={<span className={returnColor}>{summary.totalReturnPercent.toFixed(2)}%</span>}
                    tooltipContent="The total percentage return on your initial capital. Formula: (Net PNL / Initial Capital) * 100."
                />
                <SummaryStat label="Total Trades" value={summary.totalTrades} />
                <SummaryStat label="Avg. Win" value={<span className="text-green-500">${summary.averageWin.toFixed(2)}</span>} />
                <SummaryStat label="Avg. Loss" value={<span className="text-red-500">${summary.averageLoss.toFixed(2)}</span>} />
                <SummaryStat label="Total Fees" value={<span>${summary.totalFees.toFixed(2)}</span>} />
            </div>

            <div className="space-y-2 relative">
                <h3 className="text-sm font-medium text-muted-foreground">Trade Log</h3>
                <ScrollArea
                    className="w-full rounded-md border"
                    style={{ height: `${logHeight}px` }}
                >
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                        <TableRow>
                        <TableHead>Side</TableHead>
                        <TableHead>Entry</TableHead>
                        <TableHead>Exit</TableHead>
                        <TableHead>Close Reason</TableHead>
                        <TableHead>Fee ($)</TableHead>
                        <TableHead>Net P&L ($)</TableHead>
                        <TableHead className="text-right">Info</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {results.length > 0 ? (
                            results.map((trade) => (
                                <TableRow 
                                    key={trade.id}
                                    onClick={() => onSelectTrade(trade)}
                                    className={cn(
                                        "cursor-pointer hover:bg-muted/80",
                                        selectedTradeId === trade.id && "bg-primary/20 hover:bg-primary/20"
                                    )}
                                >
                                    <TableCell>
                                        <Badge variant={trade.type === 'long' ? "default" : "destructive"}>
                                            {trade.type === 'long' ? 'LONG' : 'SHORT'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-mono text-xs">{format(new Date(trade.entryTime), 'MM/dd HH:mm')}</div>
                                        <div>${formatPrice(trade.entryPrice)}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-mono text-xs">{format(new Date(trade.exitTime), 'MM/dd HH:mm')}</div>
                                        <div>${formatPrice(trade.exitPrice)}</div>
                                    </TableCell>
                                    <TableCell className="capitalize">
                                        <Badge variant={
                                            trade.closeReason === 'take-profit' ? 'default' :
                                            trade.closeReason === 'stop-loss' ? 'destructive' : 'secondary'
                                        } className="whitespace-nowrap">
                                            {trade.closeReason.replace('-', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {trade.fee.toFixed(4)}
                                    </TableCell>
                                    <TableCell className={`font-medium ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {trade.pnl.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {trade.reasoning && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-60 hover:opacity-100">
                                                <Info className="h-4 w-4" />
                                                <span className="sr-only">Show rationale</span>
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="max-w-xs space-y-1">
                                                    <p className="font-semibold">Entry Rationale:</p>
                                                    <p>{trade.reasoning}</p>
                                                    {trade.confidence && (
                                                        <p className="text-muted-foreground text-xs">AI Confidence: {(trade.confidence * 100).toFixed(1)}%</p>
                                                    )}
                                                </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                                    No trades were executed in this backtest.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </ScrollArea>
                <div
                    onMouseDown={startResizing}
                    className="absolute -bottom-4 left-0 w-full h-4 flex items-center justify-center cursor-ns-resize group"
                >
                    <GripHorizontal className="h-5 w-5 text-muted-foreground/30 transition-colors group-hover:text-primary" />
                </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
