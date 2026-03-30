"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ShieldAlert, ChevronDown } from "lucide-react"
import { useApi } from "@/context/api-context"

export function RateLimitCard() {
  const { rateLimitThreshold, setRateLimitThreshold } = useApi()
  const [isRateLimitOpen, setRateLimitOpen] = useState(false)

  return (
    <Card className="bg-slate-950/50 border-slate-800 shadow-lg">
      <Collapsible open={isRateLimitOpen} onOpenChange={setRateLimitOpen}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><ShieldAlert/> Rate Limit Settings</CardTitle><CardDescription>Set a threshold to prevent hitting Binance API rate limits. The official limit is 1200 requests per minute.</CardDescription></div>
           <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={isRateLimitOpen ? "Collapse rate limit settings" : "Expand rate limit settings"}><ChevronDown className={cn("h-4 w-4 transition-transform", isRateLimitOpen && "rotate-180")} /><span className="sr-only">Toggle</span></Button></CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="max-w-xs"><Label htmlFor="threshold">Safety Threshold</Label><Input id="threshold" type="number" value={rateLimitThreshold} onChange={(e) => setRateLimitThreshold(parseInt(e.target.value, 10) || 1200)} placeholder="e.g., 1100" max={1200} min={1}/><p className="text-xs text-muted-foreground mt-2">The app will pause API requests when used weight exceeds this value.</p></div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
