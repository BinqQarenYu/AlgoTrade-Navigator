
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Upload, ChevronDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { cn } from '@/lib/utils'

type PineScriptEditorProps = {
  onLoadScript: (script: string) => void;
  isLoading: boolean;
};

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

export function PineScriptEditor({ onLoadScript, isLoading }: PineScriptEditorProps) {
  const [isOpen, setIsOpen] = usePersistentState<boolean>('backtest-pine-editor-open', false);
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

  const handleLoad = () => {
    onLoadScript(script);
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pine Script Editor</CardTitle>
            <CardDescription>
              Paste a supported script below and load it to run a backtest.
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
          <CardContent>
            <Textarea
              placeholder="Paste your Pine Script code here..."
              className="min-h-[250px] font-mono text-xs bg-muted/50"
              value={script}
              onChange={(e) => setScript(e.target.value)}
            />
          </CardContent>
          <CardFooter>
            <Button onClick={handleLoad} disabled={isLoading}>
              <Upload className="mr-2 h-4 w-4" />
              {isLoading ? 'Running...' : 'Load Script to Graph'}
            </Button>
          </CardFooter>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
