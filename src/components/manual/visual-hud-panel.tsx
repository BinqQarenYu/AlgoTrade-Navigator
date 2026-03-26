"use client"
import React from "react"
import { LiquidityHeatmap } from "@/components/live/LiquidityHeatmap"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutDashboard } from "lucide-react"

interface VisualHudPanelProps {
  symbol: string;
}

export function VisualHudPanel({ symbol }: VisualHudPanelProps) {
  // Visual HUD mounts and unmounts dynamically to save RAM (Gold Standard Protocol - Memory Check)
  return (
    <Card className="border-indigo-500/30 bg-indigo-950/10 shadow-lg col-span-12 w-full mt-2">
      <CardHeader className="py-2 px-4 flex flex-row items-center border-b border-white/5 bg-slate-900/50">
        <LayoutDashboard className="w-4 h-4 text-indigo-400 mr-2 mt-1" />
        <CardTitle className="text-sm font-bold text-indigo-300">Visual HUD - {symbol}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* We place the Liquidity Heatmap here as the core of the Microstructure visualization */}
        {/* It uses Canvas for high tick performance. */}
        <div className="h-[400px] w-full relative border border-white/10 rounded-lg overflow-hidden bg-black/50">
           <LiquidityHeatmap symbol={symbol} />
        </div>
      </CardContent>
    </Card>
  )
}
