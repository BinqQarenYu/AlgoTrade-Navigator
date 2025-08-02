
"use client";

import React from 'react';
import Link from 'next/link';
import { strategyMetadatas, getStrategyById, strategyIndicatorMap } from '@/lib/strategies';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function StrategiesPage() {
  const sortedStrategies = [...strategyMetadatas].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="text-left">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Strategy Handbook</h1>
        <p className="text-muted-foreground mt-2">
          Explore the built-in trading strategies. Click on any strategy to learn more or test it in the backtester.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedStrategies.map(({ id, name }) => {
          const strategy = getStrategyById(id);
          const indicators = strategyIndicatorMap[id] || [];
          
          return (
            <Card key={id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{name}</CardTitle>
                <CardDescription className="h-20 text-ellipsis overflow-hidden">
                    {strategy?.description || "No description available."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Core Indicators</h4>
                  <div className="flex flex-wrap gap-2">
                    {indicators.length > 0 ? (
                      indicators.map(indicator => (
                        <Badge key={indicator} variant="secondary">{indicator}</Badge>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">None</p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/backtest?strategy=${id}`}>
                    Test Strategy <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
