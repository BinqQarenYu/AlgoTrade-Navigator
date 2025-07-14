

"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@radix-ui/react-zod"
import { z } from "zod"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useApi } from "@/context/api-context"
import { getAccountBalance } from "@/lib/binance-service"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Label } from "@/components/ui/label"
import { KeyRound, Power, PowerOff, Loader2, PlusCircle, Trash2, Edit, CheckCircle, ShieldAlert, Globe, Copy, ShieldCheck, Save, ChevronDown, BookOpen, Send, BrainCircuit, Wallet, TestTube, TrendingUp, TrendingDown, XCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import type { ApiProfile } from "@/lib/types"
import { ApiProfileForm, profileSchema } from "@/components/api-profile-form"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { useBot } from "@/context/bot-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { topAssets } from "@/lib/assets"
import Link from "next/link"

export default function SettingsPage() {
  const { toast } = useToast()
  const {
    profiles,
    activeProfile,
    setActiveProfile,
    addProfile,
    updateProfile,
    deleteProfile,
    isConnected,
    setIsConnected,
    apiLimit,
    setApiLimit,
    rateLimitThreshold,
    setRateLimitThreshold,
    coingeckoApiKey,
    setCoingeckoApiKey,
    coinmarketcapApiKey,
    setCoinmarketcapApiKey,
    aiQuota,
    setAiQuotaLimit,
    telegramBotToken,
    setTelegramBotToken,
    telegramChatId,
    setTelegramChatId,
  } = useApi()
  
  const { executeTestTrade, closeTestPosition } = useBot();

  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [clientIpAddress, setClientIpAddress] = useState<string | null>(null)
  const [serverIpAddress, setServerIpAddress] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ApiProfile | null>(null);
  const [cgKeyValue, setCgKeyValue] = useState(coingeckoApiKey || "");
  const [cmcKeyValue, setCmcKeyValue] = useState(coinmarketcapApiKey || "");
  const [aiQuotaLimitInput, setAiQuotaLimitInput] = useState(aiQuota.limit);
  const [telegramTokenInput, setTelegramTokenInput] = useState(telegramBotToken || "");
  const [telegramChatIdInput, setTelegramChatIdInput] = useState(telegramChatId || "");


  // State for test controls
  const [isTestCardOpen, setTestCardOpen] = usePersistentState<boolean>('settings-test-card-open', true);
  const [testSymbol, setTestSymbol] = usePersistentState<string>('settings-test-symbol', 'BTCUSDT');
  const [testCapital, setTestCapital] = usePersistentState<number>('settings-test-capital', 10);
  const [testLeverage, setTestLeverage] = usePersistentState<number>('settings-test-leverage', 1);

  // Collapsible states
  const [isConnectionOpen, setConnectionOpen] = useState(true);
  const [isIpOpen, setIpOpen] = useState(true);
  const [isIntegrationsOpen, setIntegrationsOpen] = useState(false);
  const [isRateLimitOpen, setRateLimitOpen] = useState(false);
  const [isAiQuotaOpen, setAiQuotaOpen] = useState(false);
  const [isProfilesOpen, setProfilesOpen] = useState(true);
  const [isFeesOpen, setIsFeesOpen] = useState(false);
  const [isTelegramOpen, setIsTelegramOpen] = useState(false);


  useEffect(() => {
    setCgKeyValue(coingeckoApiKey || "");
  }, [coingeckoApiKey]);

  useEffect(() => {
    setCmcKeyValue(coinmarketcapApiKey || "");
  }, [coinmarketcapApiKey]);

  useEffect(() => {
    setAiQuotaLimitInput(aiQuota.limit);
  }, [aiQuota.limit]);

  useEffect(() => {
    setTelegramTokenInput(telegramBotToken || "");
  }, [telegramBotToken]);
  
  useEffect(() => {
    setTelegramChatIdInput(telegramChatId || "");
  }, [telegramChatId]);


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

  const handleConnectToggle = async () => {
    if (!activeProfile) {
      toast({
        title: "No Active Profile",
        description: "Please activate an API profile before connecting.",
        variant: "destructive",
      })
      return;
    }

    if (!isConnected && apiLimit.used >= rateLimitThreshold) {
      toast({
        title: "Rate Limit Threshold Reached",
        description: `Used weight (${apiLimit.used}) is above your threshold (${rateLimitThreshold}). Please wait a moment.`,
        variant: "destructive",
      });
      return;
    }
    
    setConnectionError(null);
    setIsConnecting(true)

    if (!isConnected) {
      try {
        const { data: accountInfo, usedWeight } = await getAccountBalance(activeProfile.apiKey, activeProfile.secretKey)
        setIsConnected(true)
        toast({
          title: "Connection Successful",
          description: `Successfully connected using '${activeProfile.name}' profile.`,
        })
        setApiLimit({ used: usedWeight, limit: 1200 })
      } catch (error: any) {
        setIsConnected(false)
        if (error.message && error.message.includes('-2015')) {
            // Specific handling for the -2015 IP/permissions error
            setConnectionError(error.message);
        } else {
            toast({
                title: "Connection Failed",
                description: error.message || "Please check your API keys and permissions.",
                variant: "destructive",
            });
        }
      }
    } else {
      setIsConnected(false)
      toast({
        title: "Disconnected",
        description: "You have been disconnected from the Binance API.",
      })
    }
    setIsConnecting(false)
  }

  const handleFormSubmit = (values: z.infer<typeof profileSchema>) => {
    if (editingProfile) {
      updateProfile({ ...editingProfile, ...values });
      toast({ title: "Profile Updated", description: `The '${values.name}' profile has been updated.` });
    } else {
      addProfile({ ...values, id: Date.now().toString() });
      toast({ title: "Profile Added", description: `The '${values.name}' profile has been created.` });
    }
    setIsFormOpen(false);
    setEditingProfile(null);
  };

  const handleSaveCgKey = () => {
    setCoingeckoApiKey(cgKeyValue);
    toast({ title: "CoinGecko API Key Saved" });
  };
  
  const handleSaveCmcKey = () => {
    setCoinmarketcapApiKey(cmcKeyValue);
    toast({ title: "CoinMarketCap API Key Saved" });
  };
  
  const handleSaveAiQuota = () => {
    setAiQuotaLimit(aiQuotaLimitInput);
    toast({ title: "AI Quota Limit Updated", description: `Your new daily limit is ${aiQuotaLimitInput}.` });
  }

  const handleSaveTelegramConfig = () => {
    setTelegramBotToken(telegramTokenInput);
    setTelegramChatId(telegramChatIdInput);
    toast({ title: "Telegram Settings Saved" });
  };

  const openEditForm = (profile: ApiProfile) => {
    setEditingProfile(profile);
    setIsFormOpen(true);
  }

  const openAddForm = () => {
    setEditingProfile(null);
    setIsFormOpen(true);
  }

  const progressColorClass =
    apiLimit.used >= rateLimitThreshold
      ? "bg-red-500"
      : apiLimit.used >= rateLimitThreshold * 0.9
      ? "bg-yellow-500"
      : "bg-primary";

  const aiProgressColorClass =
    aiQuota.used >= aiQuota.limit
        ? "bg-red-500"
        : aiQuota.used >= aiQuota.limit * 0.9
        ? "bg-yellow-500"
        : "bg-primary";


  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <Card>
        <Collapsible open={isConnectionOpen} onOpenChange={setConnectionOpen}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  <span className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    isConnecting ? "bg-yellow-500 animate-pulse" : isConnected ? "bg-green-500" : "bg-red-500"
                  )} />
                  API Connection
                </CardTitle>
                <CardDescription>
                  {activeProfile 
                    ? `Manage your connection using the active profile: '${activeProfile.name}'.`
                    : "Activate a profile below to connect to the Binance API."}
                </CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isConnectionOpen && "rotate-180")} />
                      <span className="sr-only">Toggle</span>
                  </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                 {connectionError && (
                    <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>Connection Failed (Error -2015)</AlertTitle>
                        <AlertDescription>
                            <p>Binance rejected the connection. This is usually due to one of two issues:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>
                                    <strong>IP Whitelist:</strong> If your key has IP restrictions, you MUST add the server's IP address (shown below) to your key's whitelist in Binance.
                                </li>
                                <li>
                                    <strong>Permissions:</strong> Ensure your API key has "Enable Futures" permissions checked in Binance.
                                </li>
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Status: <span className={cn(
                      "font-semibold", 
                      isConnecting ? "text-yellow-500" : isConnected ? "text-green-500" : "text-red-500"
                    )}>
                      {isConnecting ? "Connecting..." : isConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                  <Button onClick={handleConnectToggle} disabled={isConnecting || !activeProfile} variant={isConnected ? "destructive" : "default"}>
                    {isConnecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isConnected ? (
                      <PowerOff className="mr-2 h-4 w-4" />
                    ) : (
                      <Power className="mr-2 h-4 w-4" />
                    )}
                    {isConnecting ? "Please wait" : isConnected ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              </CardContent>
              {isConnected && activeProfile && (
                <CardFooter className="flex-col items-start gap-4 border-t pt-6">
                  <div className="w-full">
                    <h3 className="text-sm font-medium mb-2">API Rate Limits (Requests per Minute)</h3>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Used: {apiLimit.used}</span>
                      <span>Limit: {apiLimit.limit}</span>
                    </div>
                    <Progress value={(apiLimit.used / apiLimit.limit) * 100} indicatorClassName={progressColorClass} />
                  </div>
                </CardFooter>
              )}
            </CollapsibleContent>
          </Collapsible>
      </Card>
      
      <Card>
        <Collapsible open={isIpOpen} onOpenChange={setIpOpen}>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Globe className="text-primary"/> IP Address Configuration</CardTitle>
                <CardDescription>For API keys with IP restrictions, you must whitelist the server's outbound IP address.</CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isIpOpen && "rotate-180")} />
                      <span className="sr-only">Toggle</span>
                  </Button>
              </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
                <Alert>
                    <ShieldCheck className="h-4 w-4" />
                    <AlertTitle>Action Required for Restricted Keys</AlertTitle>
                    <AlertDescription>
                        Your API calls originate from our server, not your computer. To use an IP-restricted key, add the Server IP below to your whitelist in the Binance API management panel.
                    </AlertDescription>
                </Alert>
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-1">
                        <Label>Your Browser IP</Label>
                        <p className="font-mono text-sm">{clientIpAddress || "Loading..."}</p>
                    </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-primary/10 p-3">
                    <div className="space-y-1">
                        <Label>Application Server IP (Whitelist this one)</Label>
                        <p className="font-mono text-sm font-semibold text-primary">{serverIpAddress || "Loading..."}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => {
                        if(serverIpAddress) {
                            navigator.clipboard.writeText(serverIpAddress);
                            toast({ title: "Copied!", description: "Server IP copied to clipboard." });
                        }
                    }} disabled={!serverIpAddress || serverIpAddress === 'Unavailable'}>
                        <Copy className="mr-2 h-4 w-4" /> Copy
                    </Button>
                </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
    </Card>

    <Card>
      <Collapsible open={isIntegrationsOpen} onOpenChange={setIntegrationsOpen}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Third-Party Integrations</CardTitle>
            <CardDescription>
              Manage API keys for external data services.
            </CardDescription>
          </div>
          <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isIntegrationsOpen && "rotate-180")} />
                  <span className="sr-only">Toggle</span>
              </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6">
             <div className="space-y-2">
                <Label htmlFor="telegram-token">Telegram Bot Token (Optional)</Label>
                <div className="flex items-center gap-2">
                    <Input
                    id="telegram-token"
                    type="password"
                    value={telegramTokenInput}
                    onChange={(e) => setTelegramTokenInput(e.target.value)}
                    placeholder="Enter your Telegram Bot Token"
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    Create a bot with BotFather on Telegram to get a token.
                </p>
            </div>
             <div className="space-y-2">
                <Label htmlFor="telegram-chat-id">Telegram Chat ID (Optional)</Label>
                <div className="flex items-center gap-2">
                    <Input
                    id="telegram-chat-id"
                    value={telegramChatIdInput}
                    onChange={(e) => setTelegramChatIdInput(e.target.value)}
                    placeholder="Enter your personal Chat ID"
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    You can get your Chat ID by messaging the "@userinfobot" on Telegram.
                </p>
            </div>
            <Button onClick={handleSaveTelegramConfig}><Save className="mr-2 h-4 w-4"/>Save Telegram Settings</Button>
            
            <hr className="border-border" />

            <div className="space-y-2">
                <Label htmlFor="coingecko-key">CoinGecko API Key (Optional)</Label>
                <div className="flex items-center gap-2">
                    <Input
                    id="coingecko-key"
                    type="password"
                    value={cgKeyValue}
                    onChange={(e) => setCgKeyValue(e.target.value)}
                    placeholder="Enter your CoinGecko API Key"
                    />
                    <Button onClick={handleSaveCgKey}><Save className="mr-2 h-4 w-4"/>Save</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Provides asset intelligence data. Recommended for higher rate limits.
                </p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="coinmarketcap-key">CoinMarketCap API Key (Optional)</Label>
                <div className="flex items-center gap-2">
                    <Input
                    id="coinmarketcap-key"
                    type="password"
                    value={cmcKeyValue}
                    onChange={(e) => setCmcKeyValue(e.target.value)}
                    placeholder="Enter your CoinMarketCap API Key"
                    />
                    <Button onClick={handleSaveCmcKey}><Save className="mr-2 h-4 w-4"/>Save</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    An alternative source for market and asset data.
                </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>

      <Card>
        <Collapsible open={isRateLimitOpen} onOpenChange={setRateLimitOpen}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><ShieldAlert/> Rate Limit Settings</CardTitle>
              <CardDescription>
                Set a threshold to prevent hitting Binance API rate limits. The official limit is 1200 requests per minute.
              </CardDescription>
            </div>
             <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isRateLimitOpen && "rotate-180")} />
                    <span className="sr-only">Toggle</span>
                </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="max-w-xs">
                <Label htmlFor="threshold">Safety Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={rateLimitThreshold}
                  onChange={(e) => setRateLimitThreshold(parseInt(e.target.value, 10) || 1200)}
                  placeholder="e.g., 1100"
                  max={1200}
                  min={1}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  The app will pause API requests when used weight exceeds this value.
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      
      <Card>
        <Collapsible open={isAiQuotaOpen} onOpenChange={setAiQuotaOpen}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><BrainCircuit/> AI Quota Management</CardTitle>
              <CardDescription>
                Set a custom daily limit for AI requests to manage your free tier quota.
              </CardDescription>
            </div>
            <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isAiQuotaOpen && "rotate-180")} />
                    <span className="sr-only">Toggle</span>
                </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              <div>
                  <Label>Daily Usage</Label>
                  <p className="text-2xl font-bold">{aiQuota.used} / {aiQuota.limit}</p>
                  <Progress value={(aiQuota.used / aiQuota.limit) * 100} indicatorClassName={aiProgressColorClass} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">Resets daily. Official free tier limit is 50 requests/day.</p>
              </div>
              <div className="max-w-xs">
                  <Label htmlFor="ai-limit">Set Daily Limit</Label>
                  <div className="flex items-center gap-2">
                      <Input
                          id="ai-limit"
                          type="number"
                          value={aiQuotaLimitInput}
                          onChange={(e) => setAiQuotaLimitInput(parseInt(e.target.value, 10) || 0)}
                          max={50}
                          min={1}
                      />
                      <Button onClick={handleSaveAiQuota}>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                      </Button>
                  </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Set a limit below 50 to avoid breaching your daily quota.
                  </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

    <Card>
        <Collapsible open={isTestCardOpen} onOpenChange={setTestCardOpen}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2"><TestTube/> API Test Controls</CardTitle>
                    <CardDescription>Manually execute trades to test your API connection and settings.</CardDescription>
                </div>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isTestCardOpen && "rotate-180")} />
                    </Button>
                </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
                <CardContent className="flex flex-col gap-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="test-symbol">Asset to Test</Label>
                            <Select onValueChange={setTestSymbol} value={testSymbol} disabled={!isConnected}>
                                <SelectTrigger id="test-symbol"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {topAssets.map(asset => (
                                        <SelectItem key={asset.ticker} value={`${asset.ticker}USDT`}>{asset.ticker}/USDT</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="test-capital">Test Capital ($)</Label>
                            <Input 
                                id="test-capital" 
                                type="number" 
                                value={testCapital}
                                onChange={(e) => setTestCapital(parseFloat(e.target.value) || 0)}
                                placeholder="10"
                                disabled={!isConnected}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="test-leverage">Test Leverage (x)</Label>
                            <Input
                                id="test-leverage"
                                type="number"
                                min="1"
                                value={testLeverage}
                                onChange={(e) => setTestLeverage(parseInt(e.target.value, 10) || 1)}
                                placeholder="1"
                                disabled={!isConnected}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            className="w-full"
                            disabled={!isConnected}
                            onClick={() => executeTestTrade(testSymbol, 'BUY', testCapital, testLeverage)}
                        >
                            <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                            Test Buy
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full"
                            disabled={!isConnected}
                            onClick={() => executeTestTrade(testSymbol, 'SELL', testCapital, testLeverage)}
                        >
                            <TrendingDown className="mr-2 h-4 w-4 text-red-500" />
                            Test Sell
                        </Button>
                    </div>
                    <Button 
                        variant="destructive" 
                        className="w-full"
                        disabled={!isConnected}
                        onClick={() => closeTestPosition(testSymbol, testCapital, testLeverage)}
                    >
                        <XCircle className="mr-2 h-4 w-4" />
                        Close Test Position
                    </Button>
                    <p className="text-xs text-muted-foreground pt-2">These actions will execute real trades on your account. Ensure the capital and leverage are set to amounts you are comfortable with for testing.</p>
                </CardContent>
            </CollapsibleContent>
        </Collapsible>
    </Card>

      <Card>
        <Collapsible open={isProfilesOpen} onOpenChange={setProfilesOpen}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><KeyRound/> API Profiles</CardTitle>
              <CardDescription>
                Manage your Binance API keys. You can save multiple profiles and activate one for trading.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                      <Button size="sm" onClick={openAddForm}>
                          <PlusCircle /> Add New Profile
                      </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                          <DialogTitle>{editingProfile ? "Edit" : "Add"} API Profile</DialogTitle>
                          <DialogDescription>
                              Provide a name and your Binance API keys. Keys are stored only in your browser.
                          </DialogDescription>
                      </DialogHeader>
                      <ApiProfileForm
                          onSubmit={handleFormSubmit}
                          onCancel={() => setIsFormOpen(false)}
                          defaultValues={editingProfile}
                      />
                  </DialogContent>
              </Dialog>
              <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isProfilesOpen && "rotate-180")} />
                      <span className="sr-only">Toggle</span>
                  </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
                <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[180px]">Profile Name</TableHead>
                            <TableHead>API Key</TableHead>
                            <TableHead>Permissions</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right w-[200px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {profiles.length > 0 ? (
                            profiles.map((profile) => (
                                <TableRow key={profile.id} className={cn(activeProfile?.id === profile.id && "bg-muted/50")}>
                                    <TableCell className="font-medium">{profile.name}</TableCell>
                                    <TableCell className="font-mono text-xs">{`${profile.apiKey.substring(0, 6)}...${profile.apiKey.slice(-4)}`}</TableCell>
                                    <TableCell>
                                        <Badge variant={profile.permissions === 'FuturesTrading' ? 'default' : 'secondary'}>
                                            {profile.permissions === 'FuturesTrading' ? 
                                                <Send className="mr-1 h-3 w-3"/> :
                                                <BookOpen className="mr-1 h-3 w-3"/>
                                            }
                                            {profile.permissions === 'FuturesTrading' ? 'Trading' : 'Read-Only'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {activeProfile?.id === profile.id && (
                                            <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                                                <CheckCircle className="mr-1 h-3 w-3" /> Active
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button 
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setActiveProfile(profile.id)}
                                                disabled={activeProfile?.id === profile.id || isConnected}
                                            >
                                                Activate
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(profile)} disabled={isConnected}>
                                                <Edit className="h-4 w-4"/>
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={isConnected}>
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete the profile '{profile.name}'. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteProfile(profile.id)} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No API profiles found. Add one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  )
}
