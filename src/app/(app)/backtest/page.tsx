"use client"

import React from "react"
import { useToast } from "@/hooks/use-toast"
import { historicalData } from "@/lib/mock-data"
import { TradingChart } from "@/components/trading-chart"
import { PineScriptEditor } from "@/components/pine-script-editor"
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
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function BacktestPage() {
  const { toast } = useToast()
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2024, 0, 20),
    to: new Date(2024, 4, 28),
  })

  // This is a placeholder for the actual AI analysis logic
  const handleAnalyzeScript = (script: string) => {
    console.log("Analyzing script:", script);
    toast({
      title: "AI Analysis Started",
      description: "Your Pine Script is being analyzed for optimization.",
    });
    // In a real app, you would call the AI flow here.
    setTimeout(() => {
        toast({
            title: "AI Analysis Complete",
            description: "Suggestions are available on the Optimize page.",
            variant: "default",
        })
    }, 2000)
  };
  
  interface DateRange {
    from: Date;
    to?: Date;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
      <div className="xl:col-span-2 flex flex-col h-[600px] xl:h-auto">
        <TradingChart data={historicalData} />
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Backtest Controls</CardTitle>
            <CardDescription>Configure your backtesting parameters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy</Label>
              <Select>
                <SelectTrigger id="strategy">
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sma-crossover">SMA Crossover</SelectItem>
                  <SelectItem value="ema-crossover">EMA Crossover</SelectItem>
                  <SelectItem value="rsi-divergence">RSI Divergence</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
               <Label>Date range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(date.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-primary hover:bg-primary/90">Run Backtest</Button>
          </CardFooter>
        </Card>
        <PineScriptEditor onAnalyze={handleAnalyzeScript} isLoading={false} />
      </div>
    </div>
  )
}
