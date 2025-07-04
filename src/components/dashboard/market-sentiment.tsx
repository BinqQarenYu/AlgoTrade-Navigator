
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Smile, Frown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { CoinSentimentData } from "@/lib/types";

interface MarketSentimentProps {
  sentiments: CoinSentimentData[];
  isLoading: boolean;
}

const SentimentSkeleton = () => (
    <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
            <div key={`skel-sent-${i}`} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </div>
        ))}
    </div>
);

export function MarketSentiment({ sentiments, isLoading }: MarketSentimentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Smile /> Market Sentiment</CardTitle>
        <CardDescription>Community sentiment from CoinGecko.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SentimentSkeleton />
        ) : sentiments.length > 0 ? (
          <div className="space-y-6">
            {sentiments.map(coin => (
              <div key={coin.id}>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={coin.image} alt={coin.name} data-ai-hint="crypto icon"/>
                    <AvatarFallback>{coin.symbol.toUpperCase().slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                     <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">{coin.name}</span>
                        <span className="font-mono text-sm">{coin.sentimentUp.toFixed(1)}% Up</span>
                    </div>
                    <div className="w-full bg-destructive/20 rounded-full h-2.5">
                      <div 
                        className="bg-green-500 h-2.5 rounded-full" 
                        style={{ width: `${coin.sentimentUp}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
            <Frown className="w-8 h-8 mb-2"/>
            <p>Could not load sentiment data.</p>
            <p className="text-xs">This may be due to CoinGecko's API rate limits.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
