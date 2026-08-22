"use client";

import React, { useState } from "react";
import { ChevronDown, Moon } from "lucide-react";

export interface DeepDomToolbarState {
  showCandles: boolean;
  showBubbles: boolean;
  showVolume: boolean;
  showVwap: boolean;
  showCvd: boolean;
  showImpLiquidity: boolean;
  showVolumeProfile: boolean;
  showRsProfile: boolean;
  showDeltaSpeed: boolean;
  showDom: boolean;
  showTradePanel: boolean;
  showTbs: boolean;
  showSeasonal: boolean;
  showLiquidations: boolean;
  showMarketProfile: boolean;
}

interface DeepDomBottomToolbarProps {
  toolbarState: DeepDomToolbarState;
  onToggleFeature: (key: keyof DeepDomToolbarState) => void;
  activeRange?: string;
  onSelectRange?: (range: string) => void;
}

export function DeepDomBottomToolbar({
  toolbarState,
  onToggleFeature,
  activeRange = "1D",
  onSelectRange,
}: DeepDomBottomToolbarProps) {
  const [logScale, setLogScale] = useState(false);
  const [autoScale, setAutoScale] = useState(true);

  const ranges = ["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "5Y", "All"];

  return (
    <div className="h-8 bg-[#131722] border-t border-[#2A2E39] flex items-center justify-between text-[11px] select-none text-[#B2B5BE] shrink-0 w-full pl-12 pr-64">
      {/* Left: Date Range Selector (Pushed right to account for Left Sidebar width, and right to account for Right sidebar) */}
      <div className="flex items-center h-full">
        {ranges.map((range) => (
          <button
            key={range}
            onClick={() => onSelectRange?.(range)}
            className={`px-2 h-full hover:bg-[#2A2E39] transition-colors font-medium ${
              activeRange === range ? "text-[#2962FF]" : ""
            }`}
          >
            {range}
          </button>
        ))}
        <button className="px-2 h-full hover:bg-[#2A2E39] transition-colors flex items-center">
          <CalendarIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Scale Toggles & Timezone */}
      <div className="flex items-center h-full">
        {/* Go to... */}
        <button className="px-2 h-full hover:bg-[#2A2E39] transition-colors">
          Go to...
        </button>
        
        <div className="w-px h-4 bg-[#2A2E39] mx-1" />
        
        {/* Ext Hours */}
        <button className="px-2 h-full hover:bg-[#2A2E39] transition-colors flex items-center gap-1">
          <Moon className="w-3.5 h-3.5" />
          ext
        </button>
        
        <div className="w-px h-4 bg-[#2A2E39] mx-1" />
        
        {/* Scales */}
        <button 
          onClick={() => setLogScale(!logScale)}
          className={`px-2 h-full hover:bg-[#2A2E39] transition-colors ${logScale ? "text-[#2962FF] bg-[#2A2E39]" : ""}`}
        >
          log
        </button>
        <button 
          onClick={() => setAutoScale(!autoScale)}
          className={`px-2 h-full hover:bg-[#2A2E39] transition-colors ${autoScale ? "text-[#2962FF] bg-[#2A2E39]" : ""}`}
        >
          auto
        </button>
        
        <div className="w-px h-4 bg-[#2A2E39] mx-1" />
        
        {/* Timezone */}
        <button className="px-2 h-full hover:bg-[#2A2E39] transition-colors flex items-center gap-1 font-medium">
          07:35:05 (UTC) <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// Simple Calendar icon for the bottom bar since Lucide's Calendar is a bit thick
function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <rect x="2" y="4" width="14" height="12" rx="2" />
      <path d="M16 8H2M6 2v4M12 2v4" />
    </svg>
  );
}
