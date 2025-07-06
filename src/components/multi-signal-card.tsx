
"use client"

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { SignalResult } from "@/lib/types";
import { Separator } from "./ui/separator";
import { cn, formatPrice } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { parseSymbolString } from "@/lib/assets";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Button } from "./ui/button";
import { ChevronDown } from "lucide-react";

interface MultiSignalCardProps {
  asset: string;
  result?: SignalResult;
}

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

export function MultiSignalCard({ asset, result }: MultiSignalCardProps) {
    const [isOpen, setIsOpen] = usePersistentState<boolean>(`multisignal-card-open-${asset}`, true);

    const displaySymbol = useMemo(() => {
        const parsed = parseSymbolString(asset);
        return parsed ? `${parsed.base}/${parsed.quote}` : asset;
    }, [asset]);
    
    const renderContent = () => {
        if (!result) {
            return (
                <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            )
        }

        if (result.status === 'analyzing') {
             return <p className="text-sm text-muted-foreground">Analyzing market data...</p>
        }
        
        if (result.status === 'error') {
            return <p className="text-sm text-red-500">{result.log || "An error occurred."}</p>
        }

        if (result.status === 'no_signal') {
            return <p className="text-sm text-muted-foreground">{result.log || "No recent trade setup found."}</p>
        }

        if (result.signal) {
            const { signal } = result;
            const confidenceColor = signal.confidence > 0.7 ? "text-green-500" : signal.confidence > 0.5 ? "text-yellow-500" : "text-red-500";
            return (
                <TooltipProvider>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Action</span>
                            <Badge variant={signal.action === 'UP' ? 'default' : 'destructive'} className="text-base px-3 py-1">
                                {signal.action === 'UP' ? 'LONG' : 'SHORT'}
                            </Badge>
                        </div>
                        <Separator />
                        <div className="grid gap-1.5 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Entry Price</span>
                                <span className="font-mono">${formatPrice(signal.entryPrice)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Stop Loss</span>
                                <span className="font-mono text-red-500">${formatPrice(signal.stopLoss)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Take Profit</span>
                                <span className="font-mono text-green-500">${formatPrice(signal.takeProfit)}</span>
                            </div>
                        </div>
                        <Separator />
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">AI Confidence</span>
                            <span className={cn("font-semibold font-mono", confidenceColor)}>{(signal.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <p className="text-xs text-muted-foreground pt-1 truncate cursor-help">{signal.reasoning}</p>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="start" className="max-w-[280px]">
                               <p className="text-xs">{signal.reasoning}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            )
        }

        return <p className="text-sm text-muted-foreground">Waiting for next cycle...</p>
    };
    
    const getStatusColor = (status?: SignalResult['status']) => {
        switch(status) {
            case 'analyzing': return 'bg-yellow-500 animate-pulse';
            case 'error': return 'bg-red-500';
            case 'monitoring':
                 return result?.signal ? 'bg-green-500' : 'bg-blue-500';
            default: return 'bg-gray-400';
        }
    }

    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <span>{displaySymbol}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-normal text-muted-foreground capitalize">{result?.status?.replace('_', ' ') || 'Idle'}</span>
                                <span className={cn("h-2.5 w-2.5 rounded-full", getStatusColor(result?.status))} />
                            </div>
                        </CardTitle>
                        {result?.signal && <CardDescription>{result.signal.strategy} on {new Date(result.signal.timestamp).toLocaleTimeString()}</CardDescription>}
                    </div>
                     <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1">
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                            <span className="sr-only">Toggle</span>
                        </Button>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="min-h-[180px]">
                        {renderContent()}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
