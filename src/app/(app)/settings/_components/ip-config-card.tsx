"use client"

import React, { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Globe, ShieldCheck, ChevronDown, Copy } from "lucide-react"
import { Label } from "@/components/ui/label"

export function IpConfigCard() {
  const { toast } = useToast()
  const [isIpOpen, setIpOpen] = useState(true)
  const [clientIpAddress, setClientIpAddress] = useState<string | null>(null)
  const [serverIpAddress, setServerIpAddress] = useState<string | null>(null)

  useEffect(() => {
    const fetchIps = async () => {
        try {
            const clientRes = await fetch('/api/ip');
            const clientData = await clientRes.json();
            setClientIpAddress(clientData.ip);

            const serverRes = await fetch('/api/server-ip');
            const serverData = await serverRes.json();
            setServerIpAddress(serverData.ip);
        } catch (error) {
            console.error("Could not fetch IP addresses:", error);
            setClientIpAddress("Unavailable");
            setServerIpAddress("Unavailable");
        }
    };
    fetchIps();
  }, []);

  return (
    <Card className="bg-slate-950/50 border-slate-800 shadow-lg">
      <Collapsible open={isIpOpen} onOpenChange={setIpOpen}>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Globe className="text-primary"/> IP Address Configuration</CardTitle>
              <CardDescription>For API keys with IP restrictions, you must whitelist the server's outbound IP address.</CardDescription>
            </div>
            <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={isIpOpen ? "Collapse IP configuration" : "Expand IP configuration"}><ChevronDown className={cn("h-4 w-4 transition-transform", isIpOpen && "rotate-180")} /><span className="sr-only">Toggle</span></Button></CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
              <Alert className="bg-amber-950/20 border-amber-900/50 text-amber-200"><ShieldCheck className="h-4 w-4 text-amber-500" /><AlertTitle className="text-amber-400">Action Required for Restricted Keys</AlertTitle><AlertDescription>Your API keys are stored on the server for security. This means all requests to Binance originate from the server, not your browser. To use an IP-restricted key, you MUST add the **Server IP** below to your whitelist in the Binance API management panel.</AlertDescription></Alert>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/30 p-3"><div className="space-y-1"><Label className="text-slate-400">Your Browser IP (For Reference Only)</Label><p className="font-mono text-sm text-slate-300">{clientIpAddress || "Loading..."}</p></div></div>
              <div className="flex items-center justify-between rounded-lg border border-indigo-900/30 bg-indigo-950/20 p-3">
                  <div className="space-y-1"><Label>Application Server IP (Whitelist this one)</Label><p className="font-mono text-sm font-semibold text-primary">{serverIpAddress || "Loading..."}</p></div>
                  <Button variant="ghost" size="sm" onClick={() => { if(serverIpAddress) { navigator.clipboard.writeText(serverIpAddress); toast({ title: "Copied!", description: "Server IP copied to clipboard." }); } }} disabled={!serverIpAddress || serverIpAddress === 'Unavailable'}><Copy className="mr-2 h-4 w-4" /> Copy</Button>
              </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
