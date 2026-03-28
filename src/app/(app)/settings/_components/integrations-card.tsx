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
import { Brain, Send, Globe, Activity, PlusCircle, ChevronDown, Save, Eye, EyeOff, Zap } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useApi } from "@/context/api-context"

export function IntegrationsCard() {
  const { toast } = useToast()
  const {
    coingeckoApiKey, setCoingeckoApiKey,
    coinmarketcapApiKey, setCoinmarketcapApiKey,
    geminiApiKey, setGeminiApiKey,
    telegramBotToken, setTelegramBotToken,
    telegramChatId, setTelegramChatId,
    geminiModel, setGeminiModel,
    aiQuota
  } = useApi()

  const [isIntegrationsOpen, setIntegrationsOpen] = useState(true)

  const [cgKeyValue, setCgKeyValue] = useState(coingeckoApiKey || "")
  const [cmcKeyValue, setCmcKeyValue] = useState(coinmarketcapApiKey || "")
  const [geminiKeyValue, setGeminiKeyValue] = useState(geminiApiKey || "")
  const [telegramTokenInput, setTelegramTokenInput] = useState(telegramBotToken || "")
  const [telegramChatIdInput, setTelegramChatIdInput] = useState(telegramChatId || "")

  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showCgKey, setShowCgKey] = useState(false)
  const [showCmcKey, setShowCmcKey] = useState(false)
  const [showTelegramToken, setShowTelegramToken] = useState(false)

  useEffect(() => { setCgKeyValue(coingeckoApiKey || ""); }, [coingeckoApiKey]);
  useEffect(() => { setGeminiKeyValue(geminiApiKey || ""); }, [geminiApiKey]);
  useEffect(() => { setCmcKeyValue(coinmarketcapApiKey || ""); }, [coinmarketcapApiKey]);
  useEffect(() => { setTelegramTokenInput(telegramBotToken || ""); }, [telegramBotToken]);
  useEffect(() => { setTelegramChatIdInput(telegramChatId || ""); }, [telegramChatId]);

  const handleSaveCgKey = () => { setCoingeckoApiKey(cgKeyValue); toast({ title: "CoinGecko API Key Saved" }); };
  const handleSaveGeminiKey = () => { setGeminiApiKey(geminiKeyValue); toast({ title: "Google AI API Key Saved" }); };
  const handleSaveCmcKey = () => { setCoinmarketcapApiKey(cmcKeyValue); toast({ title: "CoinMarketCap API Key Saved" }); };
  const handleSaveTelegramConfig = () => { setTelegramBotToken(telegramTokenInput); setTelegramChatId(telegramChatIdInput); toast({ title: "Telegram Settings Saved" }); };

  return (
    <Card className="bg-slate-950/50 border-slate-800 shadow-lg">
      <Collapsible open={isIntegrationsOpen} onOpenChange={setIntegrationsOpen}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Third-Party Integrations</CardTitle><CardDescription>Manage API keys for external data services and notifications. Add more providers as needed.</CardDescription></div>
          <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><ChevronDown className={cn("h-4 w-4 transition-transform", isIntegrationsOpen && "rotate-180")} /><span className="sr-only">Toggle</span></Button></CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4">

              {/* Google AI (Gemini) Provider */}
              <div className="flex flex-col p-4 bg-slate-900/50 rounded-2xl border border-slate-800 gap-3">
                <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <Label htmlFor="gemini-key" className="text-base font-bold">Google AI (Gemini)</Label>
                    <Badge variant="outline" className="ml-auto">AI & Intelligence</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Power your AI Research Lab, trade signal validation, and automated risk assessment.
                    Get your key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline">Google AI Studio</a>.
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                      <Input
                          id="gemini-key"
                          type={showGeminiKey ? "text" : "password"}
                          value={geminiKeyValue}
                          onChange={(e) => setGeminiKeyValue(e.target.value)}
                          placeholder="Paste your Gemini API Key here..."
                          className="pr-10 bg-background/50 border-primary/20 focus-visible:ring-primary"
                      />
                      <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowGeminiKey(!showGeminiKey)}
                      >
                          {showGeminiKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                  </div>
                  <Button onClick={handleSaveGeminiKey} className="shrink-0 shadow-sm shadow-primary/20">
                      <Save className="mr-2 h-4 w-4" /> Save
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="gemini-model" className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">Select AI Model</Label>
                    <Select value={geminiModel} onValueChange={setGeminiModel}>
                      <SelectTrigger id="gemini-model" className="w-full bg-background/50 border-primary/10">
                        <SelectValue placeholder="Select Model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-2.5-flash">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-orange-500" />
                            <span>Gemini 2.5 Flash (Budget/Fast)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="gemini-2.5-pro">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" />
                            <span>Gemini 2.5 Pro (Precision/High-Cost)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-3 bg-primary/5 border border-primary/10 rounded-2xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Daily Request Budget</span>
                      <span className="text-xs font-black">{aiQuota.used} / {aiQuota.limit}</span>
                    </div>
                    <Progress value={(aiQuota.used / aiQuota.limit) * 100} className="h-1" />
                  </div>
                </div>
              </div>

              {/* Telegram Provider */}
              <div className="flex flex-col p-4 bg-slate-900/50 rounded-2xl border border-slate-800 gap-3">
                <div className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-[#2AABEE]" />
                    <Label className="text-base font-bold">Telegram Notifications</Label>
                    <Badge variant="outline" className="ml-auto">Alerts</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Receive trade alerts and system notifications directly to your Telegram app.</p>
                <div className="space-y-3 mt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="telegram-token" className="text-xs font-medium">Bot Token</Label>
                    <div className="relative">
                        <Input
                            id="telegram-token"
                            type={showTelegramToken ? "text" : "password"}
                            value={telegramTokenInput}
                            onChange={(e) => setTelegramTokenInput(e.target.value)}
                            placeholder="Enter your Telegram Bot Token"
                            className="bg-background/50 border-primary/20 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowTelegramToken(!showTelegramToken)}
                        >
                          {showTelegramToken ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="telegram-chat-id" className="text-xs font-medium">Chat ID</Label>
                    <Input id="telegram-chat-id" value={telegramChatIdInput} onChange={(e) => setTelegramChatIdInput(e.target.value)} placeholder="Enter your personal Chat ID" className="bg-background/50 border-primary/20"/>
                  </div>
                  <Button onClick={handleSaveTelegramConfig} className="w-full sm:w-auto"><Save className="mr-2 h-4 w-4"/>Save Telegram Settings</Button>
                </div>
              </div>

              {/* CoinGecko Provider */}
              <div className="flex flex-col p-4 bg-slate-900/50 rounded-2xl border border-slate-800 gap-3">
                <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-green-500" />
                    <Label className="text-base font-bold">CoinGecko</Label>
                    <Badge variant="outline" className="ml-auto">Market Data</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Provides asset intelligence data. Recommended for higher rate limits.</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="relative flex-1">
                      <Input
                        id="coingecko-key"
                        type={showCgKey ? "text" : "password"}
                        value={cgKeyValue}
                        onChange={(e) => setCgKeyValue(e.target.value)}
                        placeholder="Enter your CoinGecko API Key"
                        className="bg-background/50 border-primary/20 pr-10"
                      />
                      <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowCgKey(!showCgKey)}
                      >
                          {showCgKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                  </div>
                  <Button onClick={handleSaveCgKey} className="shrink-0"><Save className="mr-2 h-4 w-4"/>Save</Button>
                </div>
              </div>

              {/* CoinMarketCap Provider */}
              <div className="flex flex-col p-4 bg-slate-900/50 rounded-2xl border border-slate-800 gap-3">
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <Label className="text-base font-bold">CoinMarketCap</Label>
                    <Badge variant="outline" className="ml-auto">Market Data</Badge>
                </div>
                <p className="text-xs text-muted-foreground">An alternative source for market and asset data.</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="relative flex-1">
                      <Input
                        id="coinmarketcap-key"
                        type={showCmcKey ? "text" : "password"}
                        value={cmcKeyValue}
                        onChange={(e) => setCmcKeyValue(e.target.value)}
                        placeholder="Enter your CoinMarketCap API Key"
                        className="bg-background/50 border-primary/20 pr-10"
                      />
                      <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowCmcKey(!showCmcKey)}
                      >
                          {showCmcKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                  </div>
                  <Button onClick={handleSaveCmcKey} className="shrink-0"><Save className="mr-2 h-4 w-4"/>Save</Button>
                </div>
              </div>

              {/* Placeholder for future providers */}
              <div className="flex items-center justify-center p-6 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" /> More providers coming soon...
                </p>
              </div>

            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
