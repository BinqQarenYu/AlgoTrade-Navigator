
"use client";

import React from 'react';
import type { RankedTradeSignal } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, CheckCircle } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface StrategyRecommendationProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  recommendation: RankedTradeSignal | null;
  onActivate: (strategyId: string) => void;
  onDismiss: () => void;
}

export function StrategyRecommendation({
  isOpen,
  onOpenChange,
  recommendation,
  onActivate,
  onDismiss
}: StrategyRecommendationProps) {
  
  if (!recommendation) return null;

  const handleActivate = () => {
    onActivate(recommendation.strategy);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Lightbulb className="text-yellow-500" />
            AI Strategy Adaptation
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your current strategy is underperforming. The AI has analyzed the market and suggests a new approach to better suit the current conditions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Recommended Action</span>
                    <Badge variant={recommendation.action === 'UP' ? 'default' : 'destructive'} className="text-lg">
                        {recommendation.action === 'UP' ? 'BUY / LONG' : 'SELL / SHORT'}
                    </Badge>
                </div>

                <Separator />

                <div className="grid gap-1.5 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Asset</span>
                        <span className="font-semibold">{recommendation.asset}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">New Strategy</span>
                        <span className="font-semibold">{recommendation.strategy}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="font-semibold">{(recommendation.confidence * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>

            <div className="prose prose-sm dark:prose-invert">
                <h4 className="!mb-2">Justification</h4>
                <p className="!mt-0 text-muted-foreground">{recommendation.justification}</p>
            </div>
        </div>

        <AlertDialogFooter>
          <Button variant="ghost" onClick={onDismiss}>Dismiss</Button>
          <Button onClick={handleActivate} className="bg-primary hover:bg-primary/90">
            <CheckCircle className="mr-2 h-4 w-4" />
            Activate Recommended Strategy
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
