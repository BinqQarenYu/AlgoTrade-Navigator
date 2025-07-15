
"use client"

import type { LiveBotStateForAsset } from "@/lib/types";
import { parseSymbolString } from "@/lib/assets";
import { cn, formatPrice } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { ScrollArea } from "./ui/scroll-area";
import { AlertCircle, Bot, CheckCircle, HelpCircle, Loader2, MinusCircle, TrendingDown, TrendingUp } from "lucide-react";
import { Separator } from "./ui/separator";

interface LiveTradingBotCardProps {
    asset: string;
    botState?: LiveBotStateForAsset;
}

const StatusIndicator = ({ status }: { status: LiveBotStateForAsset['status'] }) => {
    switch (status) {
        case 'running':
            return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'analyzing':
            return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
        case 'position_open':
            return <Bot className="h-4 w-4 text-primary" />;
        case 'error':
            return <AlertCircle className="h-4 w-4 text-red-500" />;
        default:
            return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
}

export function LiveTradingBotCard({ asset, botState }: LiveTradingBotCardProps) {
    const { base, quote } = parseSymbolString(asset) || { base: asset, quote: '' };
    
    if (!botState) {
        return (
            <Card className="bg-muted/30">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="text-base">{base}/{quote}</span>
                        <MinusCircle className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                    <CardDescription>Waiting to initialize...</CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    const { status, activePosition, logs } = botState;
    
    const positionValue = activePosition ? activePosition.entryPrice * 10 : 0; // Assuming size 10 for display

    return (
        <Card className={cn(
            activePosition && "border-primary/50",
            status === 'error' && "border-destructive/50"
        )}>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="text-base">{base}/{quote}</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <StatusIndicator status={status} />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="capitalize">{status.replace('_', ' ')}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardTitle>
                <CardDescription>
                    {activePosition ? `In ${activePosition.action === 'UP' ? 'LONG' : 'SHORT'} position.` : `Monitoring for signals.`}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {activePosition ? (
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Entry Price</span>
                            <span className="font-mono font-semibold">${formatPrice(activePosition.entryPrice)}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Take Profit</span>
                            <span className="font-mono text-green-500">${formatPrice(activePosition.takeProfit)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Stop Loss</span>
                            <span className="font-mono text-red-500">${formatPrice(activePosition.stopLoss)}</span>
                        </div>
                        <Separator />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-xs text-muted-foreground truncate cursor-help">
                                  {activePosition.reasoning}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="start" className="max-w-[280px]">
                               <p className="text-xs">{activePosition.reasoning}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                    </div>
                ) : (
                    <div className="h-32">
                      <ScrollArea className="h-full w-full rounded-md border p-2">
                          <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                              {logs.length > 0 ? logs.join('\n') : 'No activity yet...'}
                          </pre>
                      </ScrollArea>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
