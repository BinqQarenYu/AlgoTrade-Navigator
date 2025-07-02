import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Position } from "@/lib/types";

type OpenPositionsProps = {
  positions: Position[];
};

export function OpenPositions({ positions }: OpenPositionsProps) {
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
            {positions.map((pos) => (
              <TableRow key={pos.symbol}>
                <TableCell className="font-medium">{pos.symbol}</TableCell>
                <TableCell>
                  <Badge variant={pos.side === 'LONG' ? "default" : "destructive"} className={pos.side === 'LONG' ? 'bg-green-600' : 'bg-red-600'}>
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
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
