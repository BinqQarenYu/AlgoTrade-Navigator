"use client"

import React, { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Power, PowerOff, Loader2, Globe, ShieldAlert, ChevronDown } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useApi } from "@/context/api-context"

export function ApiConnectionCard() {
  const { toast } = useToast()
  const {
    activeProfile, isConnected, setIsConnected, apiLimit,
    testConnection, rateLimitThreshold
  } = useApi()

  const [isConnectionOpen, setConnectionOpen] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const handleConnectToggle = async () => {
    if (!activeProfile) {
      toast({ title: "No Active Profile", description: "Please activate an API profile before connecting.", variant: "destructive" })
      return;
    }

    if (!isConnected && apiLimit.used >= rateLimitThreshold) {
      toast({ title: "Rate Limit Threshold Reached", description: `Used weight (${apiLimit.used}) is above your threshold (${rateLimitThreshold}). Please wait.`, variant: "destructive" });
      return;
    }

    setConnectionError(null);
    setIsConnecting(true)

    if (!isConnected) {
      try {
        const success = await testConnection();
        if (success) {
            setIsConnected(true);
            toast({ title: "Connection Successful", description: `Successfully connected using '${activeProfile.name}' profile.` });
        } else {
             throw new Error("Failed to connect. The proxy might have failed or keys are invalid.");
        }
      } catch (error: any) {
        setIsConnected(false);
        const errorMessage = error.message || "An unknown error occurred.";
        if (errorMessage.includes('Service unavailable') || errorMessage.includes('restricted location') || errorMessage.includes('-2015')) {
            setConnectionError(errorMessage);
        } else {
            toast({ title: "Connection Failed", description: errorMessage, variant: "destructive" });
        }
      }
    } else {
      setIsConnected(false);
      toast({ title: "Disconnected", description: "You have been disconnected from the Binance API." });
    }
    setIsConnecting(false);
  }

  const progressColorClass = apiLimit.used >= rateLimitThreshold ? "bg-red-500" : apiLimit.used >= rateLimitThreshold * 0.9 ? "bg-yellow-500" : "bg-primary";

  return (
    <Card className="bg-slate-950/50 border-slate-800 shadow-lg">
      <Collapsible open={isConnectionOpen} onOpenChange={setConnectionOpen}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3">
                <span className={cn( "h-2.5 w-2.5 rounded-full", isConnecting ? "bg-yellow-500 animate-pulse" : isConnected ? "bg-green-500" : "bg-red-500" )} />
                API Connection
              </CardTitle>
              <CardDescription>
                {activeProfile ? `Manage your connection using the active profile: '${activeProfile.name}'.` : "Activate a profile below to connect."}
              </CardDescription>
            </div>
            <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={isConnectionOpen ? "Collapse connection status" : "Expand connection status"}><ChevronDown className={cn("h-4 w-4 transition-transform", isConnectionOpen && "rotate-180")} /><span className="sr-only">Toggle</span></Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
               {connectionError && (
                  <Alert variant="destructive">
                      {connectionError.includes('Service unavailable') ? <Globe className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                      <AlertTitle>{connectionError.includes('Service unavailable') ? 'Geo-Restriction Error' : 'Connection Failed'}</AlertTitle>
                      <AlertDescription>
                          {connectionError.includes('-2015') ? (
                              <>
                               <p>Binance rejected the connection (Error -2015). This is usually due to one of two issues:</p>
                               <ul className="list-disc pl-5 mt-2 space-y-1">
                                   <li><strong>IP Whitelist:</strong> If your key has IP restrictions, you MUST add the server's IP address (shown below) to your key's whitelist in Binance.</li>
                                   <li><strong>Permissions:</strong> Ensure your API key has "Enable Futures" permissions checked in Binance.</li>
                               </ul>
                              </>
                          ) : (<p>{connectionError}</p>)}
                      </AlertDescription>
                  </Alert>
              )}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Status: <span className={cn( "font-semibold", isConnecting ? "text-yellow-500" : isConnected ? "text-green-500" : "text-red-500" )}>{isConnecting ? "Connecting..." : isConnected ? "Connected" : "Disconnected"}</span></div>
                <Button onClick={handleConnectToggle} disabled={isConnecting || !activeProfile} variant={isConnected ? "destructive" : "default"}>
                  {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isConnected ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
                  {isConnecting ? "Please wait" : isConnected ? "Disconnect" : "Connect"}
                </Button>
              </div>
            </CardContent>
            {isConnected && activeProfile && (
              <CardFooter className="flex-col items-start gap-4 border-t pt-6">
                <div className="w-full">
                  <h3 className="text-sm font-medium mb-2">API Rate Limits (Requests per Minute)</h3>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Used: {apiLimit.used}</span><span>Limit: {apiLimit.limit}</span>
                  </div>
                  <Progress value={(apiLimit.used / apiLimit.limit) * 100} indicatorClassName={progressColorClass} />
                </div>
              </CardFooter>
            )}
          </CollapsibleContent>
        </Collapsible>
    </Card>
  )
}
