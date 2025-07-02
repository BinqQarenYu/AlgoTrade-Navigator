import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Position } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

type OpenPositionsProps = {
  positions: Position[];
  isLoading?: boolean;
};

const OpenPositionsSkeleton = () => (
    Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={`skel-pos-${i}`}>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell><Skeleton className="h-5 w-12" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-5 w-10" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
        </TableRow>
    ))
);


export function OpenPositions({ positions, isLoading }: OpenPositionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Open Positions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Entry Price</TableHead>
              <TableHead>Mark Price</TableHead>
              <TableHead>Leverage</TableHead>
              <TableHead className="text-right">PNL (USD)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <OpenPositionsSkeleton />
            ) : positions.length > 0 ? (
                positions.map((pos) => (
                  <TableRow key={pos.symbol}>
                    <TableCell className="font-medium">{pos.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={pos.side === 'LONG' ? "default" : "destructive"}>
                        {pos.side}
                      </Badge>
                    </TableCell>
                    <TableCell>{pos.size}</TableCell>
                    <TableCell>${pos.entryPrice.toLocaleString()}</TableCell>
                    <TableCell>${pos.markPrice.toLocaleString()}</TableCell>
                    <TableCell>{pos.leverage}</TableCell>
                    <TableCell className={`text-right font-medium ${pos.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {pos.pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </TableCell>
                  </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                        No open positions
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
