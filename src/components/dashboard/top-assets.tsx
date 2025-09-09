"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTopCoins } from '@/lib/coingecko-service';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TrendingUp, List } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price_change_percentage_24h: number;
}

const AssetSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={`skel-asset-${i}`} className="flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
    ))}
  </div>
);

export function TopAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const topAssets = await getTopCoins(250);
        setAssets(topAssets);
      } catch (e) {
        setError("Failed to fetch top assets from CoinGecko.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssets();
  }, []);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><List /> Top 250 Index</CardTitle>
        <CardDescription>Top assets by market capitalization.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {isLoading ? (
          <AssetSkeleton />
        ) : error ? (
          <Alert variant="destructive">
            <TrendingUp className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4 h-80 overflow-y-auto">
            {assets.slice(0, 20).map(asset => ( // Display top 20 for brevity
              <div key={asset.id} className="flex items-center gap-3">
                <img src={asset.image} alt={asset.name} className="h-6 w-6 rounded-full" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{asset.name}</div>
                  <div className="text-xs text-muted-foreground">{asset.symbol.toUpperCase()}</div>
                </div>
                <div className={`text-sm font-medium ${asset.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {asset.price_change_percentage_24h.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
