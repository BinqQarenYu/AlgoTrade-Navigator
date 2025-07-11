
"use client"

import React, { useState, useEffect, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Upload, ChevronDown, Wand2, Loader2 } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { cn } from '@/lib/utils'
import { useApi } from '@/context/api-context'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast'
import type { AnalyzePineScriptOutput } from '@/ai/flows/analyze-pine-script'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Badge } from './ui/badge'

type PineScriptEditorProps = {
  onLoadScript: (script: string) => void;
  isLoading: boolean;
  onAnalyze: (script: string) => Promise<AnalyzePineScriptOutput>;
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

export function PineScriptEditor({ onLoadScript, isLoading, onAnalyze }: PineScriptEditorProps) {
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
  const [analysisResult, setAnalysisResult] = useState<AnalyzePineScriptOutput | null>(null);
  const [isAnalyzing, startTransition] = useTransition();
  const [isConfirming, setIsConfirming] = useState(false);
  const { canUseAi, consumeAiCredit } = useApi();
  const { toast } = useToast();

  const handleLoad = () => {
    onLoadScript(script);
  }

  const handleAnalyzeClick = () => {
      if(canUseAi()) {
        setIsConfirming(true);
      }
  }

  const handleConfirmAnalyze = () => {
    setIsConfirming(false);
    setAnalysisResult(null);
    consumeAiCredit();
    startTransition(async () => {
        try {
            const result = await onAnalyze(script);
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "The AI has provided feedback and revisions for your script." });
        } catch (e: any) {
            toast({ title: "Analysis Failed", description: e.message, variant: "destructive" });
        }
    });
  }
  
  const handleApplyRevision = () => {
    if (analysisResult?.revisedScript) {
        setScript(analysisResult.revisedScript);
        toast({ title: "Revision Applied", description: "The corrected script has been loaded into the editor." });
    }
  }

  const anyLoading = isLoading || isAnalyzing;

  return (
    <Card>
      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm AI Action</AlertDialogTitle>
                <AlertDialogDescription>
                    This action will use one AI credit to analyze and revise your Pine Script. Are you sure?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmAnalyze}>Confirm & Analyze</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pine Script Editor & Analyzer</CardTitle>
            <CardDescription>
              Paste a script, get AI feedback, and load it to the chart.
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
              disabled={anyLoading}
            />
            {analysisResult && (
                <div className="mt-4 space-y-4">
                    <Alert variant={analysisResult.hasErrors ? "destructive" : "default"}>
                        <AlertTitle className="flex items-center justify-between">
                            AI Analysis
                             <Badge variant={analysisResult.hasErrors ? "destructive" : "secondary"}>
                                {analysisResult.hasErrors ? "Errors Found" : "Looks Good"}
                            </Badge>
                        </AlertTitle>
                        <AlertDescription className="prose prose-sm dark:prose-invert max-w-none">
                            <pre className="text-xs whitespace-pre-wrap font-sans bg-transparent p-0">{analysisResult.analysis}</pre>
                        </AlertDescription>
                    </Alert>
                     <Button onClick={handleApplyRevision} size="sm" variant="outline" className="w-full">
                        Apply Revised Script to Editor
                    </Button>
                </div>
            )}
          </CardContent>
          <CardFooter className="flex-col sm:flex-row gap-2">
            <Button onClick={handleLoad} disabled={anyLoading}>
              <Upload className="mr-2 h-4 w-4" />
              {isLoading ? 'Running...' : 'Load Script to Graph'}
            </Button>
            <Button onClick={handleAnalyzeClick} disabled={anyLoading} variant="secondary">
                {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4" />}
                {isAnalyzing ? "Analyzing..." : "Analyze & Revise"}
            </Button>
          </CardFooter>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
