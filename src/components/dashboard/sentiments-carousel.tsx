"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getSentimentForTickers } from '@/lib/coingecko-service';
import type { CoinSentimentData } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Smile, Frown, TrendingUp } from "lucide-react";
import { TopAssets } from './top-assets';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

const MarketSentimentCard = ({ sentiments, isLoading }: { sentiments: CoinSentimentData[], isLoading: boolean }) => (
    <Card className="h-full flex flex-col">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Smile /> Market Sentiment</CardTitle>
            <CardDescription>Community sentiment from CoinGecko.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
            {isLoading ? (
              <SentimentSkeleton />
            ) : sentiments.length > 0 ? (
              <div className="space-y-6 h-80 overflow-y-auto">
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
                            style={{ width: `${coin.sentimentUp || 0}%` }}
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

export function SentimentsCarousel() {
  const [sentiments, setSentiments] = useState<CoinSentimentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSentiments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const sentimentData = await getSentimentForTickers(['BTC', 'ETH', 'SOL', 'DOGE']);
        setSentiments(sentimentData);
      } catch (e) {
        setError("Failed to fetch sentiment data.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSentiments();
  }, []);

  if (error) {
    return (
      <Alert variant="destructive">
        <TrendingUp className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Carousel className="w-full">
      <CarouselContent>
        <CarouselItem>
          <MarketSentimentCard sentiments={sentiments} isLoading={isLoading} />
        </CarouselItem>
        <CarouselItem>
          <TopAssets />
        </CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
