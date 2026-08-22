"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Minus,
  Square,
  X,
  Play,
  Pause,
  RotateCcw,
  SlidersHorizontal,
  Calendar,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReplayConfig } from "@/lib/orderflow/types";

interface DeepDomReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ReplayConfig;
  onSpeedChange: (speed: number) => void;
  onSymbolChange: (symbol: string) => void;
  onIncludeMboChange: (include: boolean) => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  isPlaying: boolean;
}

export function DeepDomReplayModal({
  isOpen,
  onClose,
  config,
  onSpeedChange,
  onSymbolChange,
  onIncludeMboChange,
  onPlay,
  onPause,
  onReset,
  isPlaying,
}: DeepDomReplayModalProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 260, y: 320 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  const speedPresets = [1, 8, 40, 100, 200, 400];

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 420, dragRef.current.startPosX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 260, dragRef.current.startPosY + dy)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="fixed z-50 w-[420px] bg-[#141414]/95 backdrop-blur-md border border-[#303030] rounded-lg shadow-[0_12px_36px_rgba(0,0,0,0.8)] font-mono text-xs text-gray-200 select-none overflow-hidden"
    >
      {/* Title Bar */}
      <div
        onMouseDown={handleMouseDown}
        className="h-8 bg-[#1B1B1B] border-b border-[#2A2A2A] px-3 flex items-center justify-between cursor-move"
      >
        <div className="flex items-center gap-2 font-bold text-gray-300 text-xs">
          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
          <span>Replay Manage</span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-400">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:text-gray-100 hover:bg-[#282828] rounded"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button className="p-1 hover:text-gray-100 hover:bg-[#282828] rounded">
            <Square className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:text-red-400 hover:bg-[#282828] rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-3.5 space-y-3.5 bg-[#121212]">
          {/* Main Grid */}
          <div className="grid grid-cols-12 gap-3">
            {/* Left: Symbol Selector & Select button */}
            <div className="col-span-4 space-y-2">
              <span className="text-[11px] text-gray-400">Symbol</span>
              <Select
                value={config.symbol}
                onValueChange={(val) => onSymbolChange(val)}
              >
                <SelectTrigger className="h-7 bg-[#1C1C1C] border-[#303030] text-xs font-mono font-bold text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1C1C1C] border-[#303030] text-xs font-mono text-gray-100">
                  <SelectItem value="ES-232606">ES-232606</SelectItem>
                  <SelectItem value="ES-CME">ES-CME</SelectItem>
                  <SelectItem value="NQ-CME">NQ-CME</SelectItem>
                  <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                  <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
                </SelectContent>
              </Select>

              <button className="w-full h-7 bg-[#1C1C1C] hover:bg-[#262626] border border-[#303030] rounded text-[11px] text-gray-300 transition-colors">
                Select Symbols
              </button>
            </div>

            {/* Right: Date, Speed, MBO toggle */}
            <div className="col-span-8 space-y-2.5">
              {/* Start Date */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-gray-400">Start Date</span>
                <div className="flex items-center gap-1 bg-[#1C1C1C] px-2 py-0.5 rounded border border-[#303030] text-[11px]">
                  <Calendar className="w-3 h-3 text-cyan-400" />
                  <span className="text-gray-200">{config.startDate}</span>
                </div>
              </div>

              {/* Speed Slider & Readout */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">Speed</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#1C1C1C] border border-cyan-500/40 text-cyan-400 font-bold text-[11px]">
                    &lt; {config.speedMultiplier} &gt;
                  </span>
                </div>

                <Slider
                  min={1}
                  max={400}
                  step={1}
                  value={[config.speedMultiplier]}
                  onValueChange={(val) => onSpeedChange(val[0])}
                  className="py-1"
                />

                {/* Preset Pills */}
                <div className="grid grid-cols-6 gap-1 pt-1">
                  {speedPresets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => onSpeedChange(preset)}
                      className={`h-5 rounded text-[10px] font-bold border transition-all ${
                        config.speedMultiplier === preset
                          ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                          : "bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      x{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Include MBO Switch */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-gray-300 font-medium">Include MBO</span>
                <Switch
                  checked={config.includeMBO}
                  onCheckedChange={onIncludeMboChange}
                  className="scale-75 accent-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#262626]">
            <div className="flex items-center gap-1.5">
              <button
                onClick={onReset}
                className="px-3 h-7 bg-[#1E1E1E] hover:bg-[#2A2A2A] border border-[#363636] rounded text-gray-300 text-[11px] transition-colors"
              >
                Reset
              </button>
              <button className="px-3 h-7 bg-[#1E1E1E] hover:bg-[#2A2A2A] border border-[#363636] rounded text-gray-300 text-[11px] transition-colors">
                Set
              </button>
            </div>

            <Button
              onClick={isPlaying ? onPause : onPlay}
              className={`h-7 px-4 text-xs font-bold font-mono transition-all ${
                isPlaying
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 mr-1" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1" /> Play
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
