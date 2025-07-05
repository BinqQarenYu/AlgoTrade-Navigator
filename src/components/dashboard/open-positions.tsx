
"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Position } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, XCircle } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type OpenPositionsProps = {
  positions: Position[];
  isLoading?: boolean;
  onClosePosition: (position: Position) => void;
  permissions?: 'ReadOnly' | 'FuturesTrading';
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
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
        </TableRow>
    ))
);


export function OpenPositions({ positions, isLoading, onClosePosition, permissions }: OpenPositionsProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Open Positions</CardTitle>
           <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                  <span className="sr-only">Toggle</span>
              </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
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
                  <TableHead>PNL (USD)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                        <TableCell>${formatPrice(pos.entryPrice)}</TableCell>
                        <TableCell>${formatPrice(pos.markPrice)}</TableCell>
                        <TableCell>{pos.leverage}</TableCell>
                        <TableCell className={`text-right font-medium ${pos.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {pos.pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      disabled={permissions === 'ReadOnly'}
                                      className="h-8"
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Close
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                {permissions === 'ReadOnly' && (
                                  <TooltipContent>
                                    <p>A key with Futures Trading permissions is required.</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Close Position</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will submit a market order to close your {pos.side} position of {pos.size} {pos.symbol}. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onClosePosition(pos)}>
                                  Confirm Close
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                            No open positions
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
