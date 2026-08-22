"use client";

import React from "react";
import {
  Menu,
  Search,
  ChevronDown,
  BarChart2,
  LineChart,
  Clock,
  RotateCcw,
  Undo2,
  Redo2,
  LayoutGrid,
  Settings,
  Maximize,
  Camera,
  Play
} from "lucide-react";

interface DeepDomHeaderProps {
  isReplayOpen?: boolean;
  onToggleReplayModal?: () => void;
  selectedTimeframe?: string;
  onSelectTimeframe?: (tf: string) => void;
  chartMode?: string;
  onSelectChartMode?: (mode: string) => void;
}

export function DeepDomHeader({
  isReplayOpen,
  onToggleReplayModal,
  selectedTimeframe = "15m",
  onSelectTimeframe,
  chartMode = "CANDLES",
  onSelectChartMode,
}: DeepDomHeaderProps) {
  return (
    <header className="h-12 bg-[#131722] border-b border-[#2A2E39] px-2 flex items-center justify-between select-none text-[13px] text-[#B2B5BE]">
      
      {/* Left Section */}
      <div className="flex items-center gap-1 h-full">
        {/* Menu & Logo */}
        <button className="p-2 hover:bg-[#2A2E39] rounded transition-colors text-[#D1D4DC]">
          <Menu className="w-5 h-5" />
        </button>
        <div className="font-bold text-white tracking-wide mr-2 text-lg">
          <span className="text-blue-500">T</span>V
        </div>

        <div className="w-px h-6 bg-[#2A2E39] mx-1" />

        {/* Symbol Search */}
        <button className="flex items-center gap-2 px-3 h-8 hover:bg-[#2A2E39] rounded transition-colors text-[#D1D4DC] font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">B</div>
            <span>BTCUSDT</span>
          </div>
          <Search className="w-4 h-4 ml-2" />
        </button>

        <div className="w-px h-6 bg-[#2A2E39] mx-1" />

        {/* Timeframes */}
        <div className="flex items-center h-full">
          {["1m", "5m", "15m", "1h", "4h", "D"].map((tf) => (
            <button 
              key={tf} 
              onClick={() => onSelectTimeframe?.(tf)}
              className={`px-2 h-8 rounded transition-colors font-medium ${
                selectedTimeframe === tf ? "text-[#2962FF] hover:bg-[#2A2E39]" : "hover:bg-[#2A2E39]"
              }`}
            >
              {tf}
            </button>
          ))}
          <button className="px-1 h-8 hover:bg-[#2A2E39] rounded transition-colors">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-px h-6 bg-[#2A2E39] mx-1" />

        {/* Chart Type */}
        <button 
          onClick={() => onSelectChartMode?.(chartMode === "CANDLES" ? "LINE" : "CANDLES")}
          className="px-2 h-8 hover:bg-[#2A2E39] rounded transition-colors flex items-center"
        >
          {chartMode === "CANDLES" ? <BarChart2 className="w-5 h-5 text-[#2962FF]" /> : <LineChart className="w-5 h-5" />}
        </button>

        <div className="w-px h-6 bg-[#2A2E39] mx-1" />

        {/* Indicators, Alert, Replay */}
        <button className="px-3 h-8 hover:bg-[#2A2E39] rounded transition-colors flex items-center gap-2 font-medium">
          <LineChart className="w-4 h-4" />
          <span>Indicators</span>
        </button>
        <button className="px-2 h-8 hover:bg-[#2A2E39] rounded transition-colors">
          <Clock className="w-4 h-4" />
        </button>
        <button 
          onClick={onToggleReplayModal}
          className={`px-3 h-8 rounded transition-colors flex items-center gap-2 font-medium ${isReplayOpen ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-[#2A2E39]'}`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Replay</span>
        </button>

        <div className="w-px h-6 bg-[#2A2E39] mx-1" />

        {/* Undo/Redo */}
        <button className="px-2 h-8 hover:bg-[#2A2E39] rounded transition-colors">
          <Undo2 className="w-4 h-4" />
        </button>
        <button className="px-2 h-8 hover:bg-[#2A2E39] rounded transition-colors">
          <Redo2 className="w-4 h-4 opacity-50" />
        </button>
      </div>

      {/* Center Section (Layout) */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        <button className="px-2 h-8 hover:bg-[#2A2E39] rounded transition-colors flex items-center gap-1">
          <LayoutGrid className="w-4 h-4" />
          <span className="hidden lg:inline text-xs border border-[#2A2E39] px-1 rounded bg-[#1E222D]">1</span>
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 h-full">
        {/* Settings, Fullscreen, Camera */}
        <button className="px-2 h-8 hover:bg-[#2A2E39] rounded transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <button className="px-2 h-8 hover:bg-[#2A2E39] rounded transition-colors">
          <Maximize className="w-4 h-4" />
        </button>
        <button className="px-2 h-8 hover:bg-[#2A2E39] rounded transition-colors">
          <Camera className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-[#2A2E39] mx-1" />

        {/* Trade and Publish */}
        <button className="px-4 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors text-[13px] ml-1">
          Trade
        </button>
        <button className="px-4 h-8 bg-[#2962FF] hover:bg-[#1E53E5] text-white rounded font-medium transition-colors text-[13px] ml-2 flex items-center gap-2">
          Publish <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
