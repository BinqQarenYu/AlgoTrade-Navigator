
"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface PriceLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: number;
}

interface KeyPriceLevelsProps {
  levels: PriceLevel[];
  isAnalyzing: boolean;
}

export function KeyPriceLevels({ levels, isAnalyzing }: KeyPriceLevelsProps) {
  return (
    <Card className={cn(
      "border-primary/10 transition-opacity",
      isAnalyzing && "opacity-50 grayscale animate-pulse pointer-events-none"
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" />
              Key Intelligence Levels
            </CardTitle>
            <CardDescription className="text-xs">
              Algorithmic price points where high liquidity or rejection is expected.
            </CardDescription>
          </div>
          {levels.length > 0 && (
            <Badge variant="outline" className="text-[10px] tracking-widest uppercase">
              {levels.length} LEVELS DETECTED
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {levels.length > 0 ? (
            levels.map((level, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-primary/10 bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    level.type === 'resistance' ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                  )}>
                    {level.type === 'resistance' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <Badge 
                      variant="outline"
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0 mb-1",
                        level.type === 'resistance' ? "text-red-500 border-red-500/20" : "text-green-500 border-green-500/20"
                      )}
                    >
                      {level.type.toUpperCase()}
                    </Badge>
                    <div className="font-mono text-lg font-bold leading-none">
                      ${level.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">Strength</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm">{Math.round(level.strength)}%</span>
                    <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full", level.type === 'resistance' ? "bg-red-500" : "bg-green-500")}
                        style={{ width: `${level.strength}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center text-muted-foreground py-12 flex flex-col items-center gap-2 border-2 border-dashed border-primary/5 rounded-2xl">
              <Activity className="h-8 w-8 opacity-20" />
              <p className="text-sm">Run market research to identify key price levels.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
