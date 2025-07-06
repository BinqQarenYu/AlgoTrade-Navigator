
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Loader2, Sparkles, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from '@/hooks/use-toast';
import { topAssets } from '@/lib/assets';
import { getLatestKlinesByLimit } from '@/lib/binance-service';
import { getFearAndGreedIndex } from '@/lib/fear-greed-service';
import { predictPrice, type PredictPriceOutput, type StrategyOutput } from '@/ai/flows/predict-price-flow';
import emaCrossoverStrategy, { defaultEmaCrossoverParams } from '@/lib/strategies/ema-crossover';
import rsiDivergenceStrategy, { defaultRsiDivergenceParams } from '@/lib/strategies/rsi-divergence';
import { cn, formatPrice } from '@/lib/utils';
import { useApi } from '@/context/api-context';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

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

export function AIAnalyticsCard() {
  const [asset, setAsset] = usePersistentState<string>('dashboard-ai-asset', 'BTCUSDT');
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictPriceOutput | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isOpen, setIsOpen] = usePersistentState<boolean>('dashboard-ai-card-open', true);
  const { toast } = useToast();
  const { isConnected, canUseAi, consumeAiCredit } = useApi();

  const handlePredictClick = () => {
    if (!isConnected) {
        toast({ title: "API Disconnected", description: "Please connect to the Binance API in settings.", variant: "destructive" });
        return;
    }
    if (canUseAi()) {
        setIsConfirming(true);
    }
  };

  const handleConfirmPredict = useCallback(async () => {
    setIsConfirming(false);
    consumeAiCredit();
    setIsLoading(true);
    setPrediction(null);

    try {
        const interval = '1h'; // Using a fixed interval for dashboard simplicity
        const data = await getLatestKlinesByLimit(asset, interval, 100);
        if (data.length < 50) throw new Error("Not enough historical data to analyze.");

        // Run a couple of simple strategies to get inputs
        const emaData = await emaCrossoverStrategy.calculate(data, defaultEmaCrossoverParams);
        const rsiData = await rsiDivergenceStrategy.calculate(data, defaultRsiDivergenceParams);
        
        const lastEma = emaData[emaData.length - 1];
        const lastRsi = rsiData[rsiData.length - 1];

        const strategyOutputs: StrategyOutput[] = [
            {
                strategyName: 'EMA Crossover',
                signal: lastEma.buySignal ? 'BUY' : lastEma.sellSignal ? 'SELL' : 'HOLD',
                indicatorValues: { 'ema_short': lastEma.ema_short ?? 0, 'ema_long': lastEma.ema_long ?? 0 }
            },
            {
                strategyName: 'RSI Divergence',
                signal: lastRsi.buySignal ? 'BUY' : lastRsi.sellSignal ? 'SELL' : 'HOLD',
                indicatorValues: { 'rsi': lastRsi.rsi ?? 50 }
            }
        ];

        const fng = await getFearAndGreedIndex();
        const marketContext = fng ? `The current Fear & Greed Index is ${fng.value} (${fng.valueClassification}).` : "Market context is neutral.";
        const lastCandle = data[data.length - 1];

        const predictionResult = await predictPrice({
            asset,
            interval,
            currentPrice: lastCandle.close,
            recentData: JSON.stringify(data.slice(-50).map(k => ({t: k.time, o: k.open, h: k.high, l: k.low, c:k.close, v:k.volume}))),
            strategyOutputs: strategyOutputs,
            marketContext
        });

        setPrediction(predictionResult);
        toast({ title: "Prediction Complete", description: `AI analysis for ${asset} is ready.` });

    } catch (e: any) {
        toast({ title: "Analysis Failed", description: e.message || "An unknown error occurred.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  }, [asset, toast, isConnected, consumeAiCredit]);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Sparkles /> AI Price Prediction</CardTitle>
            <CardDescription>
              Get an AI-powered price prediction for the next 1-hour candle.
            </CardDescription>
          </div>
           <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                  <span className="sr-only">Toggle</span>
              </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm AI Action</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will use one AI credit to generate a price prediction. Are you sure you want to proceed?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmPredict}>Confirm & Predict</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="flex gap-2">
                <Select onValueChange={setAsset} value={asset} disabled={isLoading}>
                    <SelectTrigger id="asset-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {topAssets.map(a => (
                            <SelectItem key={a.ticker} value={`${a.ticker}USDT`}>{a.ticker}/USDT</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={handlePredictClick} disabled={isLoading || !isConnected} className="flex-shrink-0">
                    {isLoading ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
                    {isLoading ? 'Analyzing...' : 'Predict'}
                </Button>
            </div>
            
            <div className="min-h-[140px] pt-4">
                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                ) : prediction ? (
                    <div className="space-y-4">
                        <div>
                            <Label className="text-sm text-muted-foreground">Predicted Price for {asset}</Label>
                            <p className="text-3xl font-bold text-primary">${formatPrice(prediction.predictedPrice)}</p>
                        </div>
                         <div>
                            <Label className="text-sm text-muted-foreground">Confidence</Label>
                            <div className="flex items-center gap-4">
                                <Progress value={prediction.confidence * 100} className="w-full" />
                                <span className="font-semibold">{(prediction.confidence * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                         <div>
                            <Label className="text-sm text-muted-foreground">Reasoning</Label>
                            <p className="text-xs text-foreground/80">{prediction.reasoning}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                        <p>Select an asset and click "Predict" to run the analysis.</p>
                    </div>
                )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
