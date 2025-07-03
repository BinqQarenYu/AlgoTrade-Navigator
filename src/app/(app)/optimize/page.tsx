"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { validateStrategy, ValidateStrategyOutput } from "@/ai/flows/validate-strategy";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useBot } from "@/context/bot-context";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BrainCircuit, Loader2, Wand2, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const historicalDataPlaceholder = `Date,Open,High,Low,Close,Volume
2023-01-01,16541.7,16632.4,16518.4,16625.1,149999
2023-01-02,16625.1,16760.2,16591.1,16688.5,188730
2023-01-03,16688.5,16710.2,16615.9,16675.2,169520
...`;

const strategySchema = z.object({
  strategyParameters: z.string().min(10, "Please describe your strategy parameters."),
  historicalData: z.string().min(50, "Please provide sufficient historical data."),
});

export default function OptimizePage() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ValidateStrategyOutput | null>(null);
  const { toast } = useToast();
  const { isTradingActive, liveBotState } = useBot();

  const form = useForm<z.infer<typeof strategySchema>>({
    resolver: zodResolver(strategySchema),
    defaultValues: {
      strategyParameters: "Strategy: SMA Crossover. Parameters: short_window=14, long_window=28. Timeframe: 1h.",
      historicalData: historicalDataPlaceholder,
    },
  });

  const onSubmit = (values: z.infer<typeof strategySchema>) => {
    setResult(null);
    startTransition(async () => {
      try {
        const validationResult = await validateStrategy(values);
        setResult(validationResult);
      } catch (error) {
        console.error("Error validating strategy:", error);
        toast({
          title: "Optimization Failed",
          description: "An error occurred while analyzing the strategy. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center justify-center gap-2">
            <BrainCircuit size={32}/> AI Strategy Optimizer
        </h1>
        <p className="text-muted-foreground mt-2">
            Refine your trading strategies with AI-powered feedback for peak performance.
        </p>
      </div>

       {isTradingActive && (
        <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
            <Bot className="h-4 w-4" />
            <AlertTitle>Trading Session Active</AlertTitle>
            <AlertDescription>
                Strategy optimization is disabled to prioritize the active{' '}
                {liveBotState.isRunning ? <Link href="/live" className="font-bold underline">Live Bot</Link> : <Link href="/manual" className="font-bold underline">Manual Trade</Link>}.
            </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Analyze Your Strategy</CardTitle>
          <CardDescription>
            Provide your strategy parameters and historical data for the AI to analyze.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="strategyParameters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strategy Parameters</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Strategy: RSI, Parameters: period=14, overbought=70, oversold=30" {...field} disabled={isTradingActive} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="historicalData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Historical Market Data (CSV format)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={historicalDataPlaceholder}
                        className="min-h-[200px] font-mono text-xs"
                        {...field}
                        disabled={isTradingActive}
                      />
                    </FormControl>
                     <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isPending || isTradingActive}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                {isTradingActive ? "Trading Active..." : isPending ? "Analyzing..." : "Optimize Strategy"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      {isPending && (
          <Card>
            <CardHeader>
                <CardTitle>AI Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
      )}

      {result && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Optimization Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none">
              <p>{result.feedback}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
