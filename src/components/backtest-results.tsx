import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { BacktestResult, BacktestSummary } from "@/lib/types";
import { format } from 'date-fns';
import { ScrollArea } from "./ui/scroll-area";

type BacktestResultsProps = {
  results: BacktestResult[];
  summary: BacktestSummary | null;
};

const SummaryStat = ({ label, value }: { label: string, value: string | React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center p-2 rounded-md bg-muted/50">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-bold">{value}</div>
    </div>
);

export function BacktestResults({ results, summary }: BacktestResultsProps) {
  if (!summary) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Backtest Results</CardTitle>
                <CardDescription>Run a backtest to see the results here.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md">
                    <p>Results will be displayed after a backtest is complete.</p>
                </div>
            </CardContent>
        </Card>
    )
  }

  const pnlColor = summary.totalPnl >= 0 ? "text-green-500" : "text-red-500";
  const winRateColor = summary.winRate >= 50 ? "text-green-500" : "text-red-500";
  const profitFactorColor = summary.profitFactor >= 1 ? "text-green-500" : "text-red-500";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backtest Results</CardTitle>
        <CardDescription>A summary of the simulated trading performance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <SummaryStat label="Total PNL" value={<span className={pnlColor}>${summary.totalPnl.toFixed(2)}</span>} />
            <SummaryStat label="Win Rate" value={<span className={winRateColor}>{summary.winRate.toFixed(2)}%</span>} />
            <SummaryStat label="Profit Factor" value={<span className={profitFactorColor}>{isFinite(summary.profitFactor) ? summary.profitFactor.toFixed(2) : '∞'}</span>} />
            <SummaryStat label="Total Trades" value={summary.totalTrades} />
            <SummaryStat label="Avg. Win" value={<span className="text-green-500">${summary.averageWin.toFixed(2)}</span>} />
            <SummaryStat label="Avg. Loss" value={<span className="text-red-500">${summary.averageLoss.toFixed(2)}</span>} />
        </div>

        <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Trade Log</h3>
             <ScrollArea className="h-72 w-full rounded-md border">
                <Table>
                <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                    <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Exit</TableHead>
                    <TableHead className="text-right">P&L ($)</TableHead>
                    <TableHead className="text-right">P&L (%)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {results.length > 0 ? (
                        results.map((trade, index) => (
                        <TableRow key={index}>
                            <TableCell>
                                <Badge variant={trade.pnl > 0 ? "default" : "destructive"}>
                                    {trade.pnl > 0 ? 'WIN' : 'LOSS'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="font-mono text-xs">{format(new Date(trade.entryTime), 'MM/dd HH:mm')}</div>
                                <div>${trade.entryPrice.toFixed(2)}</div>
                            </TableCell>
                             <TableCell>
                                <div className="font-mono text-xs">{format(new Date(trade.exitTime), 'MM/dd HH:mm')}</div>
                                <div>${trade.exitPrice.toFixed(2)}</div>
                            </TableCell>
                            <TableCell className={`text-right font-medium ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {trade.pnl.toFixed(2)}
                            </TableCell>
                             <TableCell className={`text-right font-medium ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {trade.pnlPercent.toFixed(2)}%
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                No trades were executed in this backtest.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
             </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
