
"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, ShieldX, CheckCircle, Info, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface ManipulationAlertProps {
  isManipulationSuspected: boolean;
  confidence: number;
  currentPhase: 'Accumulation' | 'Pump' | 'Distribution' | 'None';
  reasoning: string;
  isAnalyzing: boolean;
}

export function ManipulationAlert({
  isManipulationSuspected,
  confidence,
  currentPhase,
  reasoning,
  isAnalyzing
}: ManipulationAlertProps) {
  
  if (!isManipulationSuspected && !isAnalyzing) {
    return (
        <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader className="py-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Manipulation Check: Passed
                </CardTitle>
                <CardDescription className="text-xs">
                    No significant "Pump and Dump" patterns were detected in the recent data.
                </CardDescription>
            </CardHeader>
        </Card>
    );
  }

  const confidencePercent = Math.round(confidence * 100);

  return (
    <Card className={cn(
      "border-2",
      isAnalyzing ? "opacity-50 grayscale animate-pulse pointer-events-none" : 
      isManipulationSuspected ? "border-red-500/40 bg-red-500/5" : "border-primary/10"
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg text-red-500">
              <ShieldX className="h-5 w-5" />
              Manipulation Detection Alert
            </CardTitle>
            <CardDescription className="text-xs">
              Forensic analysis of order-flow and price velocity patterns
            </CardDescription>
          </div>
          <Badge variant="destructive" className="px-3 py-1 font-bold shadow-sm animate-pulse">
            HIGH RISK
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-background border border-red-500/20 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pattern Detected</span>
            <div className="text-lg font-bold text-red-500 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {currentPhase.toUpperCase()} PHASE
            </div>
          </div>
          <div className="p-3 bg-background border border-primary/20 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">AI Confidence</span>
            <div className="text-lg font-bold text-primary">{confidencePercent}% SCORÉ</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider opacity-70">
            <Info className="h-3.5 w-3.5" />
            Forensic Findings
          </h4>
          <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/10 text-xs italic leading-relaxed text-muted-foreground">
            "{reasoning || "Analyzing data for manipulation patterns..."}"
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
