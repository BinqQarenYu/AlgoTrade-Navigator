
"use client";

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useApi } from '@/context/api-context';
import { useBot } from '@/context/bot-context';
import { useToast } from '@/hooks/use-toast';
import { screenAssets, ScreenAssetsInput, ScreenAssetsOutput } from '@/ai/flows/screen-assets-flow';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sparkles, Bot, Loader2, Info } from 'lucide-react';
import { formatLargeNumber } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const screenerSchema = z.object({
    marketCap: z.array(z.number()).min(2).max(2),
    volume24h: z.array(z.number()).min(2).max(2),
    volatility: z.enum(['low', 'medium', 'high', 'any']),
    assetAge: z.enum(['any', 'new', 'established']),
    performance: z.enum(['strong_7d', 'weak_7d', 'any']),
});

type ScreenerFormValues = z.infer<typeof screenerSchema>;

export default function AiScreenerPage() {
    const { toast } = useToast();
    const { isTradingActive } = useBot();
    const { isConnected, canUseAi, consumeAiCredit, coingeckoApiKey } = useApi();
    const [isPending, startTransition] = useTransition();
    const [results, setResults] = useState<ScreenAssetsOutput | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const formValuesRef = React.useRef<ScreenerFormValues | null>(null);

    const form = useForm<ScreenerFormValues>({
        resolver: zodResolver(screenerSchema),
        defaultValues: {
            marketCap: [1_000_000, 100_000_000_000],
            volume24h: [1_000_000, 10_000_000_000],
            volatility: 'medium',
            assetAge: 'any',
            performance: 'any',
        },
    });

    const handleFormSubmit = (values: ScreenerFormValues) => {
        if (canUseAi()) {
            formValuesRef.current = values;
            setIsConfirming(true);
        }
    };

    const runScreener = () => {
        if (!formValuesRef.current) return;
        
        consumeAiCredit();
        setResults(null);

        startTransition(async () => {
            const values = formValuesRef.current!;
            const input: ScreenAssetsInput = {
                criteria: {
                    minMarketCap: values.marketCap[0],
                    maxMarketCap: values.marketCap[1],
                    minVolume24h: values.volume24h[0],
                    maxVolume24h: values.volume24h[1],
                    volatilityPreference: values.volatility,
                    agePreference: values.assetAge,
                    performancePreference: values.performance,
                },
                coingeckoApiKey: coingeckoApiKey,
            };
            
            try {
                const screenResult = await screenAssets(input);
                setResults(screenResult);
                toast({ title: "Screening Complete", description: `Found ${screenResult.assets.length} potential assets.` });
            } catch (error: any) {
                console.error("Error screening assets:", error);
                toast({
                    title: "Screening Failed",
                    description: error.message || "An error occurred while analyzing assets.",
                    variant: "destructive",
                });
            } finally {
                formValuesRef.current = null;
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="text-left">
                <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                    <Sparkles size={32} /> AI Asset Screener
                </h1>
                <p className="text-muted-foreground mt-2">
                    Discover promising assets by defining your criteria and letting an AI analyst find the best matches.
                </p>
            </div>

            {isTradingActive && (
                <Alert variant="default" className="bg-primary/10 border-primary/20 text-primary">
                    <Bot className="h-4 w-4" />
                    <AlertTitle>Trading Session Active</AlertTitle>
                    <AlertDescription>
                        AI Screener is disabled to prioritize an active trading session.
                    </AlertDescription>
                </Alert>
            )}

            <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm AI Action</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will use one AI credit to screen for assets based on your criteria. Are you sure?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { setIsConfirming(false); runScreener(); }}>Confirm & Screen</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Screening Criteria</CardTitle>
                                    <CardDescription>Set your parameters for the AI analysis.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="marketCap"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Market Cap Range</FormLabel>
                                                <FormControl>
                                                    <Slider
                                                        min={1000000}
                                                        max={100000000000}
                                                        step={1000000}
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                        disabled={isPending}
                                                    />
                                                </FormControl>
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>${formatLargeNumber(field.value[0])}</span>
                                                    <span>${formatLargeNumber(field.value[1])}</span>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="volume24h"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>24h Volume Range</FormLabel>
                                                <FormControl>
                                                    <Slider
                                                        min={1000000}
                                                        max={10000000000}
                                                        step={1000000}
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                        disabled={isPending}
                                                    />
                                                </FormControl>
                                                 <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>${formatLargeNumber(field.value[0])}</span>
                                                    <span>${formatLargeNumber(field.value[1])}</span>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="volatility"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Volatility Preference</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="any">Any</SelectItem>
                                                        <SelectItem value="low">Low</SelectItem>
                                                        <SelectItem value="medium">Medium</SelectItem>
                                                        <SelectItem value="high">High</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="assetAge"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Asset Age</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="any">Any Age</SelectItem>
                                                        <SelectItem value="new">New ({'<'} 3 months)</SelectItem>
                                                        <SelectItem value="established">Established</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="performance"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Recent Performance (7d)</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="any">Any</SelectItem>
                                                        <SelectItem value="strong_7d">Strong Performers</SelectItem>
                                                        <SelectItem value="weak_7d">Weak Performers (Reversal)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" className="w-full" disabled={isPending || isTradingActive || !isConnected}>
                                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles />}
                                        {isPending ? 'Screening...' : 'Run AI Screener'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </form>
                    </Form>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Screener Results</CardTitle>
                            <CardDescription>Top assets matching your criteria, ranked by the AI.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">Rank</TableHead>
                                            <TableHead>Asset</TableHead>
                                            <TableHead>Justification</TableHead>
                                            <TableHead className="text-right">Market Cap</TableHead>
                                            <TableHead className="text-right">7d %</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isPending ? (
                                            Array.from({ length: 5 }).map((_, i) => (
                                                <TableRow key={`skel-${i}`}>
                                                    <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : results && results.assets.length > 0 ? (
                                            results.assets.map(asset => (
                                                <TableRow key={asset.symbol}>
                                                    <TableCell className="font-bold text-lg text-center">{asset.rank}</TableCell>
                                                    <TableCell>
                                                        <Link href={`/lab?symbol=${asset.symbol}`} className="hover:underline">
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarImage src={asset.imageUrl} data-ai-hint="crypto icon" />
                                                                    <AvatarFallback>{asset.symbol.slice(0,2)}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="font-medium">{asset.name}</span>
                                                                <span className="text-xs text-muted-foreground">{asset.symbol}</span>
                                                            </div>
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <p className="text-xs text-muted-foreground truncate max-w-xs">{asset.justification}</p>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-xs">
                                                                    <p>{asset.justification}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs">${formatLargeNumber(asset.marketCap)}</TableCell>
                                                    <TableCell className={`text-right font-mono text-xs ${asset.performance7d >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {asset.performance7d.toFixed(2)}%
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                                                    {results ? "No assets matched your criteria." : "Run the screener to see results."}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
