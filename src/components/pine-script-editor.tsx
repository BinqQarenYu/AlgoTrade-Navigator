"use client"

import * as React from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { BrainCircuit } from "lucide-react"

type PineScriptEditorProps = {
  onAnalyze: (script: string) => void;
  isLoading: boolean;
};

export function PineScriptEditor({ onAnalyze, isLoading }: PineScriptEditorProps) {
  const [script, setScript] = React.useState(`// Paste your Pine Script here
// Example: Simple Moving Average Crossover
//@version=5
strategy("My SMA Crossover Strategy", overlay=true)

short_sma = ta.sma(close, 14)
long_sma = ta.sma(close, 28)

long_condition = ta.crossover(short_sma, long_sma)
if (long_condition)
    strategy.entry("Long", strategy.long)

short_condition = ta.crossunder(short_sma, long_sma)
if (short_condition)
    strategy.entry("Short", strategy.short)
`);

  const handleAnalyze = () => {
    onAnalyze(script);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pine Script Editor</CardTitle>
        <CardDescription>
          Import your TradingView strategy. Our AI can analyze it for optimization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Paste your Pine Script code here..."
          className="min-h-[250px] font-mono text-xs bg-muted/50"
          value={script}
          onChange={(e) => setScript(e.target.value)}
        />
      </CardContent>
      <CardFooter>
        <Button onClick={handleAnalyze} disabled={isLoading}>
          <BrainCircuit className="mr-2 h-4 w-4" />
          {isLoading ? 'Analyzing...' : 'Analyze with AI'}
        </Button>
      </CardFooter>
    </Card>
  )
}
