

"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, Info } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { GridBacktestSummary, GridTrade } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from './ui/scroll-area';

type GridBacktestReportProps = {
    summary: GridBacktestSummary;
    trades: GridTrade[];
    onSelectTrade: (trade: GridTrade) => void;
};

const SummaryStat = ({ label, value, tooltipContent }: { label: string, value: React.ReactNode, tooltipContent?: string }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center justify-center p-2 rounded-md bg-muted/50 text-center cursor-help space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {label}
              {tooltipContent && <Info className="h-3 w-3" />}
            </div>
            <div className="text-base md:text-lg font-bold truncate">{value}</div>
          </div>
        </TooltipTrigger>
        {tooltipContent && (
            <TooltipContent>
                <p className="max-w-xs">{tooltipContent}</p>
            </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export function GridBacktestReport({ summary, trades, onSelectTrade }: GridBacktestReportProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [isLogOpen, setIsLogOpen] = useState(false);

    const pnlColor = summary.totalPnl >= 0 ? "text-green-500" : "text-red-500";
    const aprColor = summary.apr >= 0 ? "text-green-500" : "text-red-500";

    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Grid Backtest Report</CardTitle>
                        <CardDescription>Performance summary of the historical test.</CardDescription>
                    </div>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                             <SummaryStat 
                                label="Total PNL" 
                                value={<span className={pnlColor}>${summary.totalPnl.toFixed(2)}</span>}
                                tooltipContent="The total profit or loss, combining matched grid profits and the unrealized PNL of open orders at the end of the test."
                            />
                            <SummaryStat 
                                label="Grid PNL" 
                                value={<span className="text-green-500">${summary.gridPnl.toFixed(2)}</span>}
                                tooltipContent="Profit generated exclusively from completed buy-low, sell-high grid pairs."
                            />
                            <SummaryStat 
                                label="Unrealized PNL" 
                                value={<span className={cn(summary.unrealizedPnl >= 0 ? "text-green-500" : "text-red-500")}>${summary.unrealizedPnl.toFixed(2)}</span>}
                                tooltipContent="The profit or loss of any remaining open 'buy' orders if the test ended. This reflects the current value of your inventory."
                            />
                             <SummaryStat 
                                label="Total Trades" 
                                value={summary.totalTrades}
                                tooltipContent="The total number of buy and sell orders executed by the grid."
                            />
                             <SummaryStat 
                                label="Fees Paid" 
                                value={`$${summary.totalFees.toFixed(2)}`}
                                tooltipContent="An estimation of the total trading fees incurred during the backtest."
                            />
                             <SummaryStat 
                                label="APR" 
                                value={<span className={aprColor}>{summary.apr.toFixed(2)}%</span>}
                                tooltipContent="The Annual Percentage Rate, showing the strategy's profitability extrapolated over a year."
                            />
                        </div>
                         <div className="text-center pt-2">
                            <SummaryStat 
                                label="Max Drawdown" 
                                value={<span className="text-red-500">{summary.maxDrawdown.toFixed(2)}%</span>}
                                tooltipContent="The largest percentage drop from a portfolio peak to a subsequent trough. A key measure of risk."
                            />
                        </div>

                        <Collapsible open={isLogOpen} onOpenChange={setIsLogOpen}>
                            <CollapsibleTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full">
                                    Trade Log ({trades.length} trades)
                                    <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", isLogOpen && "rotate-180")} />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                                 <ScrollArea className="h-48 border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Side</TableHead>
                                                <TableHead className="text-right">Price</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {trades.length > 0 ? (
                                                trades.map(trade => (
                                                    <TableRow key={trade.id} onClick={() => onSelectTrade(trade)} className="cursor-pointer hover:bg-muted/50">
                                                        <TableCell className="text-xs font-mono">{new Date(trade.time).toLocaleString()}</TableCell>
                                                        <TableCell><Badge variant={trade.side === 'buy' ? 'default' : 'destructive'} className={trade.side === 'buy' ? 'bg-green-600' : 'bg-red-600'}>{trade.side.toUpperCase()}</Badge></TableCell>
                                                        <TableCell className="text-right font-mono text-xs">${formatPrice(trade.price)}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No trades executed in backtest.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CollapsibleContent>
                        </Collapsible>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
