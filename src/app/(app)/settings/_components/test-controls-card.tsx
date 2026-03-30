"use client"

import React from "react"
import { cn } from "@/lib/utils"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { TestTube, ChevronDown, TrendingUp, TrendingDown, XCircle } from "lucide-react"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { useBot } from "@/context/bot-context"
import { getAvailableQuotesForBase, parseSymbolString } from "@/lib/assets"
import { AssetSelector } from "@/components/ui/asset-selector"
import { useApi } from "@/context/api-context"

export function TestControlsCard() {
  const { isConnected } = useApi()
  const { executeTestTrade, closeTestPosition } = useBot()

  const [isTestCardOpen, setTestCardOpen] = usePersistentState<boolean>('settings-test-card-open', true)
  const [testSymbol, setTestSymbol] = usePersistentState<string>('settings-test-symbol', 'BTCUSDT')
  const [testCapital, setTestCapital] = usePersistentState<number>('settings-test-capital', 10)
  const [testLeverage, setTestLeverage] = usePersistentState<number>('settings-test-leverage', 1)

  return (
    <Card className="bg-slate-950/50 border-slate-800 shadow-lg">
        <Collapsible open={isTestCardOpen} onOpenChange={setTestCardOpen}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle className="flex items-center gap-2"><TestTube/> API Test Controls</CardTitle><CardDescription>Manually execute trades to test your API connection and settings.</CardDescription></div>
                <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={isTestCardOpen ? "Collapse test controls" : "Expand test controls"}><ChevronDown className={cn("h-4 w-4 transition-transform", isTestCardOpen && "rotate-180")} /></Button></CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
                <CardContent className="flex flex-col gap-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                        {(() => {
                            const parsed = parseSymbolString(testSymbol) || { base: testSymbol.replace('USDT', ''), quote: 'USDT' };
                            const availableQuotes = getAvailableQuotesForBase(parsed.base) || ['USDT'];
                            return (
                                <AssetSelector
                                    baseAsset={parsed.base}
                                    quoteAsset={parsed.quote}
                                    onBaseChange={(newBase) => setTestSymbol(`${newBase}${parsed.quote}`)}
                                    onQuoteChange={(newQuote) => setTestSymbol(`${parsed.base}${newQuote}`)}
                                    disabled={!isConnected}
                                    availableQuotes={availableQuotes}
                                />
                            );
                        })()}
                        </div>
                        <div className="space-y-2"><Label htmlFor="test-capital">Test Capital ($)</Label><Input id="test-capital" type="number" value={testCapital} onChange={(e) => setTestCapital(parseFloat(e.target.value) || 0)} placeholder="10" disabled={!isConnected}/></div>
                        <div className="space-y-2"><Label htmlFor="test-leverage">Test Leverage (x)</Label><Input id="test-leverage" type="number" min="1" value={testLeverage} onChange={(e) => setTestLeverage(parseInt(e.target.value, 10) || 1)} placeholder="1" disabled={!isConnected}/></div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="w-full" disabled={!isConnected} onClick={() => executeTestTrade(testSymbol, 'BUY', testCapital, testLeverage)}><TrendingUp className="mr-2 h-4 w-4 text-green-500" />Test Buy</Button>
                        <Button variant="outline" className="w-full" disabled={!isConnected} onClick={() => executeTestTrade(testSymbol, 'SELL', testCapital, testLeverage)}><TrendingDown className="mr-2 h-4 w-4 text-red-500" />Test Sell</Button>
                    </div>
                    <Button variant="destructive" className="w-full" disabled={!isConnected} onClick={() => closeTestPosition(testSymbol, testCapital, testLeverage)}><XCircle className="mr-2 h-4 w-4" />Close Test Position</Button>
                    <p className="text-xs text-muted-foreground pt-2">These actions will execute real trades on your account. Ensure the capital and leverage are set to amounts you are comfortable with for testing.</p>
                </CardContent>
            </CollapsibleContent>
        </Collapsible>
    </Card>
  )
}
