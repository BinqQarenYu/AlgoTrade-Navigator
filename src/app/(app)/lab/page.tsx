
"use client"

import React, { useState, useEffect, useMemo, useTransition, useRef } from "react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { TradingChart } from "@/components/trading-chart"
import { getHistoricalKlines } from "@/lib/binance-service"
import { useApi } from "@/context/api-context"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CalendarIcon, Loader2, Terminal, ChevronDown, FlaskConical, Wand2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { cn, formatPrice } from "@/lib/utils"
import { format, addDays } from "date-fns"
import type { HistoricalData } from "@/lib/types"
import { topAssets, getAvailableQuotesForBase } from "@/lib/assets"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { generateMarketReport, GenerateMarketReportOutput } from "@/ai/flows/generate-market-report"
import { Skeleton } from "@/components/ui/skeleton"
import { MarketHeatmap } from "@/components/dashboard/market-heatmap"
import { OrderBook } from "@/components/order-book"

interface DateRange {
  from?: Date;
  to?: Date;
}

export default function LabPage() {
  const { toast } = useToast()
  const { isConnected } = useApi();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState<DateRange | undefined>()
  const [isClient, setIsClient] = useState(false)
  const [baseAsset, setBaseAsset] = useState<string>("BTC");
  const [quoteAsset, setQuoteAsset] = useState<string>("USDT");
  const [availableQuotes, setAvailableQuotes] = useState<string[]>([]);
  const symbol = useMemo(() => `${baseAsset}${quoteAsset}`, [baseAsset, quoteAsset]);

  const [chartData, setChartData] = useState<HistoricalData[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [interval, setInterval] = useState<string>("1h");
  const [report, setReport] = useState<GenerateMarketReportOutput | null>(null);
  const [walls, setWalls] = useState<{ price: number; type: 'bid' | 'ask' }[]>([]);
  const notifiedWallsRef = useRef<Set<number>>(new Set());

  const [isControlsOpen, setControlsOpen] = useState(true);
  const [isReportOpen, setReportOpen] = useState(true);

  useEffect(() => {
    setIsClient(true)
    if (!date) {
        setDate({
            from: addDays(new Date(), -30),
            to: new Date(),
        })
    }
  }, [date])

  useEffect(() => {
    const quotes = getAvailableQuotesForBase(baseAsset);
    setAvailableQuotes(quotes);
    if (!quotes.includes(quoteAsset)) {
      setQuoteAsset(quotes[0] || '');
    }
  }, [baseAsset, quoteAsset]);

  useEffect(() => {
    // When the symbol changes, clear out old wall data
    setWalls([]);
  }, [symbol]);

  // Effect to handle notifications for new walls
  useEffect(() => {
    if (walls.length === 0) {
      notifiedWallsRef.current.clear();
      return;
    }

    walls.forEach(wall => {
      if (!notifiedWallsRef.current.has(wall.price)) {
        toast({
          title: `Large ${wall.type === 'bid' ? 'Buy' : 'Sell'} Wall Detected`,
          description: `A significant order wall was detected at $${formatPrice(wall.price)}.`,
        });
        notifiedWallsRef.current.add(wall.price);
      }
    });
  }, [walls, toast]);


  useEffect(() => {
    if (!isClient || !symbol) return;

    const fetchData = async () => {
        if (!isConnected || !date?.from || !date?.to) {
            setChartData([]);
            return;
        }
        setIsFetchingData(true);
        setChartData([]);
        setReport(null);
        toast({ title: "Fetching Market Data...", description: `Loading ${interval} data for ${symbol}.`});
        try {
            const klines = await getHistoricalKlines(symbol, interval, date.from.getTime(), date.to.getTime());
            setChartData(klines);
            toast({ title: "Data Loaded", description: `${klines.length} candles for ${symbol} are ready.` });
        } catch (error: any) {
            console.error("Failed to fetch historical data:", error);
            toast({
                title: "Failed to Load Data",
                description: error.message || "Could not retrieve historical data from Binance.",
                variant: "destructive"
            });
            setChartData([]);
        } finally {
            setIsFetchingData(false);
        }
    };

    fetchData();
  }, [symbol, date, interval, isConnected, isClient, toast]);

  const handleGenerateReport = () => {
    if (chartData.length < 20) {
      toast({ title: "Not Enough Data", description: "Please load more market data to generate a report.", variant: "destructive" });
      return;
    }
    setReport(null);
    startTransition(async () => {
      try {
        const reportData = await generateMarketReport({
          symbol,
          interval,
          historicalData: JSON.stringify(chartData.slice(-200).map(k => ({t: k.time, o: k.open, h: k.high, l: k.low, c:k.close, v:k.volume}))), // Use last 200 candles
        });
        setReport(reportData);
        setReportOpen(true);
        toast({ title: "Report Generated", description: "AI market analysis is complete." });
      } catch (error) {
        console.error("Error generating report:", error);
        toast({
          title: "Report Failed",
          description: "An error occurred while generating the AI report.",
          variant: "destructive",
        });
      }
    });
  };

  const anyLoading = isFetchingData || isPending;
  const canGenerateReport = !anyLoading && isConnected && chartData.length > 0;

  return (
    <div className="space-y-6">
       <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <FlaskConical size={32}/> Trading Lab
          </h1>
          <p className="text-muted-foreground mt-2">
              Experiment, simulate, and oversee market data with AI-powered analysis tools.
          </p>
      </div>

      {!isConnected && (
          <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>API Disconnected</AlertTitle>
              <AlertDescription>
                  Please <Link href="/settings" className="font-bold underline">connect to the Binance API</Link> in the Settings page to load market data.
              </AlertDescription>
          </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 flex flex-col h-[600px]">
          <TradingChart data={chartData} symbol={symbol} interval={interval} onIntervalChange={setInterval} wallLevels={walls} />
        </div>

        <div className="xl:col-span-2 space-y-6">
          <Card>
            <Collapsible open={isControlsOpen} onOpenChange={setControlsOpen}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Lab Controls</CardTitle>
                  <CardDescription>Configure your dataset and analysis.</CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isControlsOpen && "rotate-180")} />
                    </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="base-asset">Base</Label>
                        <Select onValueChange={setBaseAsset} value={baseAsset} disabled={!isConnected || anyLoading}>
                          <SelectTrigger id="base-asset"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            {topAssets.map(asset => (
                              <SelectItem key={asset.ticker} value={asset.ticker}>{asset.ticker} - {asset.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quote-asset">Quote</Label>
                        <Select onValueChange={setQuoteAsset} value={quoteAsset} disabled={!isConnected || anyLoading || availableQuotes.length === 0}>
                          <SelectTrigger id="quote-asset"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            {availableQuotes.map(asset => (
                              <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Date range</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                            disabled={!isConnected || anyLoading}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {isClient && date?.from ? (
                              date.to ? (
                                <>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>
                              ) : (format(date.from, "LLL dd, y"))
                            ) : ( <span>Pick a date</span> )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus mode="range" defaultMonth={date?.from}
                            selected={date} onSelect={setDate} numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={handleGenerateReport} disabled={!canGenerateReport}>
                    {anyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    {isFetchingData ? "Loading Data..." : isPending ? "Generating..." : "Generate AI Report"}
                  </Button>
                </CardFooter>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          <MarketHeatmap />

          <OrderBook symbol={symbol} onWallsUpdate={setWalls} />

           <Card>
              <Collapsible open={isReportOpen} onOpenChange={setReportOpen}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>AI Market Report</CardTitle>
                    <CardDescription>A detailed analysis of the market data.</CardDescription>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isReportOpen && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    {isPending ? (
                      <div className="space-y-4">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    ) : report ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                          <h3>{report.title}</h3>
                          <p><strong>Summary:</strong> {report.summary}</p>
                          <p><strong>Trend:</strong> {report.trendAnalysis}</p>
                          <p><strong>Volatility:</strong> {report.volatilityAnalysis}</p>
                          <p><strong>Key Levels:</strong> {report.keyLevels}</p>
                          <p><strong>Outlook:</strong> {report.outlook}</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-48 text-muted-foreground border border-dashed rounded-md">
                        <p>Generate a report to see the AI analysis here.</p>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
           </Card>

        </div>
      </div>
    </div>
  )
}
