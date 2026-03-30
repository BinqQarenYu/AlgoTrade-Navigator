"use client"

import React, { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { BrainCircuit, ChevronDown, Save } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useApi } from "@/context/api-context"

export function AiQuotaCard() {
  const { toast } = useToast()
  const { aiQuota, setAiQuotaLimit } = useApi()

  const [isAiQuotaOpen, setAiQuotaOpen] = useState(false)
  const [aiQuotaLimitInput, setAiQuotaLimitInput] = useState(aiQuota.limit)

  useEffect(() => { setAiQuotaLimitInput(aiQuota.limit); }, [aiQuota.limit]);

  const handleSaveAiQuota = () => {
    setAiQuotaLimit(aiQuotaLimitInput);
    toast({ title: "AI Quota Limit Updated", description: `New daily limit is ${aiQuotaLimitInput}.` });
  }

  const aiProgressColorClass = aiQuota.used >= aiQuota.limit ? "bg-red-500" : aiQuota.used >= aiQuota.limit * 0.9 ? "bg-yellow-500" : "bg-primary";

  return (
    <Card className="bg-slate-950/50 border-slate-800 shadow-lg">
      <Collapsible open={isAiQuotaOpen} onOpenChange={setAiQuotaOpen}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><BrainCircuit/> AI Quota Management</CardTitle><CardDescription>Set a custom daily limit for AI requests to manage your free tier quota.</CardDescription></div>
          <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={isAiQuotaOpen ? "Collapse AI quota" : "Expand AI quota"}><ChevronDown className={cn("h-4 w-4 transition-transform", isAiQuotaOpen && "rotate-180")} /><span className="sr-only">Toggle</span></Button></CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            <div><Label>Daily Usage</Label><p className="text-2xl font-bold">{aiQuota.used} / {aiQuota.limit}</p><Progress value={(aiQuota.used / aiQuota.limit) * 100} indicatorClassName={aiProgressColorClass} className="mt-2" /><p className="text-xs text-muted-foreground mt-1">Resets daily. Official free tier limit is 50 requests/day.</p></div>
            <div className="max-w-xs"><Label htmlFor="ai-limit">Set Daily Limit</Label><div className="flex items-center gap-2"><Input id="ai-limit" type="number" value={aiQuotaLimitInput} onChange={(e) => setAiQuotaLimitInput(parseInt(e.target.value, 10) || 50)} max={50} min={1}/><Button onClick={handleSaveAiQuota}><Save className="mr-2 h-4 w-4" />Save</Button></div><p className="text-xs text-muted-foreground mt-2">Set a limit below 50 to avoid breaching your daily quota.</p></div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
