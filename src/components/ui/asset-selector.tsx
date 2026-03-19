"use client"

import React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { assetRegistry } from "@/lib/asset-registry"

interface AssetSelectorProps {
  baseAsset: string
  quoteAsset: string
  onBaseChange: (base: string) => void
  onQuoteChange: (quote: string) => void
  disabled?: boolean
  availableQuotes: string[]
}

export function AssetSelector({
  baseAsset,
  quoteAsset,
  onBaseChange,
  onQuoteChange,
  disabled = false,
  availableQuotes,
}: AssetSelectorProps) {
  const topAssets = assetRegistry.getTopAssets()

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="base-asset" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Base
        </Label>
        <Select onValueChange={onBaseChange} value={baseAsset} disabled={disabled}>
          <SelectTrigger id="base-asset">
            <SelectValue placeholder="Base Asset" />
          </SelectTrigger>
          <SelectContent>
            {topAssets.map(asset => (
              <SelectItem key={asset.ticker} value={asset.ticker}>
                {asset.ticker}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="quote-asset" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Quote
        </Label>
        <Select
          onValueChange={onQuoteChange}
          value={quoteAsset}
          disabled={disabled || availableQuotes.length === 0}
        >
          <SelectTrigger id="quote-asset">
            <SelectValue placeholder="Quote Asset" />
          </SelectTrigger>
          <SelectContent>
            {availableQuotes.map(asset => (
              <SelectItem key={asset} value={asset}>
                {asset}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
