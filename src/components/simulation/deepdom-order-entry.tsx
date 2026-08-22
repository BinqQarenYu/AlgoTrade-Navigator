"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  Minus,
  Plus,
  ShieldCheck,
  Zap,
  RotateCcw,
  Check,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DOMOrderEntryState } from "@/lib/orderflow/types";

interface DeepDomOrderEntryProps {
  state: DOMOrderEntryState;
  onStateChange: (updater: (prev: DOMOrderEntryState) => DOMOrderEntryState) => void;
  onExecuteOrder: (side: 'BUY' | 'SELL', orderType: 'MKT' | 'BID' | 'ASK' | 'LMT' | 'STP' | 'STP_LMT') => void;
  onCancelAll: () => void;
  onBreakeven: () => void;
  onCancelAndFlat: () => void;
  symbols?: string[];
  onSelectSymbol?: (sym: string) => void;
}

export function DeepDomOrderEntry({
  state,
  onStateChange,
  onExecuteOrder,
  onCancelAll,
  onBreakeven,
  onCancelAndFlat,
  symbols = ["ES-232606", "BTCUSDT", "ETHUSDT", "NQ-CME"],
  onSelectSymbol,
}: DeepDomOrderEntryProps) {
  const [ocoOpen, setOcoOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleQtyDelta = (delta: number) => {
    onStateChange((prev) => ({
      ...prev,
      quantity: Math.max(1, prev.quantity + delta),
    }));
  };

  if (isMinimized) {
    return (
      <div className="w-10 bg-[#121212] border-r border-[#262626] flex flex-col h-full font-mono text-xs select-none text-gray-200 p-2 items-center">
        <button
          onClick={() => setIsMinimized(false)}
          className="p-1.5 hover:bg-[#2C2C2C] rounded transition-colors text-gray-400 hover:text-white mt-0.5 border border-transparent hover:border-[#333]"
          title="Expand Order Entry"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="mt-8 text-gray-500 font-bold tracking-widest uppercase flex flex-col items-center gap-2">
          {state.symbol.split('').map((char, i) => (
            <span key={i} className="text-[10px] leading-none">{char}</span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[280px] bg-[#121212] border-r border-[#262626] flex flex-col h-full overflow-y-auto no-scrollbar font-mono text-xs select-none text-gray-200 p-2.5 space-y-3 transition-all">
      {/* Symbol Selector & Collapse Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
        <Select
          value={state.symbol}
          onValueChange={(val) => {
            onStateChange((prev) => ({ ...prev, symbol: val }));
            if (onSelectSymbol) onSelectSymbol(val);
          }}
        >
          <SelectTrigger className="h-8 bg-[#181818] border-[#2C2C2C] text-gray-100 font-bold tracking-tight text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#181818] border-[#2C2C2C] text-gray-100 font-mono">
            {symbols.map((sym) => (
              <SelectItem key={sym} value={sym} className="focus:bg-cyan-950/50">
                {sym}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="p-1.5 bg-[#181818] border border-[#2C2C2C] hover:bg-[#2C2C2C] rounded transition-colors text-gray-400 hover:text-white"
          title="Minimize Order Entry"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Position & PnL Summary */}
      <div className="bg-[#181818] p-2.5 rounded border border-[#242424] space-y-1.5">
        <div className="flex justify-between items-center text-gray-400">
          <span className="text-[11px]">Open Qty</span>
          <span className={`font-bold ${state.openQty > 0 ? "text-cyan-400" : state.openQty < 0 ? "text-purple-400" : "text-gray-300"}`}>
            {state.openQty}
          </span>
        </div>

        <div className="flex justify-between items-center text-gray-400">
          <span className="text-[11px]">Open P/L</span>
          <span className={`font-bold ${state.openPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {state.openPnl >= 0 ? `+${state.openPnl.toFixed(2)} $` : `${state.openPnl.toFixed(2)} $`}
          </span>
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-[#2A2A2A]">
          <span className="text-[11px] font-semibold text-gray-300">Daily P/L</span>
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 font-extrabold text-xs shadow-[0_0_10px_rgba(34,197,94,0.25)]">
            {state.dailyPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
          </span>
        </div>
      </div>

      {/* Parameters Grid */}
      <div className="space-y-2">
        {/* Qty with Stepper */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-400 text-[11px] w-16">Qty</span>
          <div className="flex items-center gap-1 flex-1">
            <button
              onClick={() => handleQtyDelta(-1)}
              className="w-7 h-7 bg-[#1E1E1E] border border-[#303030] hover:bg-[#2A2A2A] rounded flex items-center justify-center text-gray-300"
            >
              <Minus className="w-3 h-3" />
            </button>
            <Input
              type="number"
              value={state.quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 1;
                onStateChange((prev) => ({ ...prev, quantity: Math.max(1, val) }));
              }}
              className="h-7 text-center font-bold bg-[#181818] border-[#303030] text-gray-100 px-1 text-xs"
            />
            <button
              onClick={() => handleQtyDelta(1)}
              className="w-7 h-7 bg-[#1E1E1E] border border-[#303030] hover:bg-[#2A2A2A] rounded flex items-center justify-center text-gray-300"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Broker Select */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-400 text-[11px] w-16">Broker</span>
          <Select
            value={state.broker}
            onValueChange={(val) => onStateChange((prev) => ({ ...prev, broker: val }))}
          >
            <SelectTrigger className="h-7 bg-[#181818] border-[#303030] text-xs font-mono text-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#181818] border-[#303030] text-xs font-mono text-gray-200">
              <SelectItem value="SIM">SIM</SelectItem>
              <SelectItem value="RITHMIC">Rithmic</SelectItem>
              <SelectItem value="CQG">CQG</SelectItem>
              <SelectItem value="BINANCE">Binance SIM</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Account Select */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-400 text-[11px] w-16">Account</span>
          <Select
            value={state.account}
            onValueChange={(val) => onStateChange((prev) => ({ ...prev, account: val }))}
          >
            <SelectTrigger className="h-7 bg-[#181818] border-[#303030] text-xs font-mono text-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#181818] border-[#303030] text-xs font-mono text-gray-200">
              <SelectItem value="test">test</SelectItem>
              <SelectItem value="sim_algo_01">sim_algo_01</SelectItem>
              <SelectItem value="prop_eval_25k">prop_eval_25k</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ticks Diff */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-400 text-[11px] w-16">Ticks diff.</span>
          <Input
            type="number"
            value={state.ticksDiff}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10) || 1;
              onStateChange((prev) => ({ ...prev, ticksDiff: val }));
            }}
            className="h-7 bg-[#181818] border-[#303030] text-center font-bold text-gray-100 text-xs"
          />
        </div>
      </div>

      {/* 2-Column Execution Matrix */}
      <div className="space-y-1.5 pt-1">
        {/* Matrix Header */}
        <div className="grid grid-cols-2 gap-1.5 text-center font-bold text-[11px]">
          <div className="text-emerald-400 py-0.5 bg-emerald-950/40 border border-emerald-500/30 rounded">
            BUY
          </div>
          <div className="text-purple-400 py-0.5 bg-purple-950/40 border border-purple-500/30 rounded">
            SELL
          </div>
        </div>

        {/* MKT Row */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onExecuteOrder("BUY", "MKT")}
            className="h-7 bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-600/50 text-emerald-300 font-bold rounded text-xs transition-all active:scale-[0.98]"
          >
            MKT
          </button>
          <button
            onClick={() => onExecuteOrder("SELL", "MKT")}
            className="h-7 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-600/50 text-purple-300 font-bold rounded text-xs transition-all active:scale-[0.98]"
          >
            MKT
          </button>
        </div>

        {/* BID / ASK Row */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onExecuteOrder("BUY", "BID")}
            className="h-7 bg-[#16291C] hover:bg-[#1E3B28] border border-emerald-700/40 text-emerald-400 font-medium rounded text-xs transition-all active:scale-[0.98]"
          >
            BID
          </button>
          <button
            onClick={() => onExecuteOrder("SELL", "ASK")}
            className="h-7 bg-[#2A162B] hover:bg-[#3D1E3E] border border-purple-700/40 text-purple-400 font-medium rounded text-xs transition-all active:scale-[0.98]"
          >
            ASK
          </button>
        </div>

        {/* LMT Row */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onExecuteOrder("BUY", "LMT")}
            className="h-7 bg-[#16291C] hover:bg-[#1E3B28] border border-emerald-700/40 text-emerald-400 font-medium rounded text-xs transition-all active:scale-[0.98]"
          >
            LMT
          </button>
          <button
            onClick={() => onExecuteOrder("SELL", "LMT")}
            className="h-7 bg-[#2A162B] hover:bg-[#3D1E3E] border border-purple-700/40 text-purple-400 font-medium rounded text-xs transition-all active:scale-[0.98]"
          >
            LMT
          </button>
        </div>

        {/* STP Row */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onExecuteOrder("BUY", "STP")}
            className="h-7 bg-[#16291C] hover:bg-[#1E3B28] border border-emerald-700/40 text-emerald-400 font-medium rounded text-xs transition-all active:scale-[0.98]"
          >
            STP
          </button>
          <button
            onClick={() => onExecuteOrder("SELL", "STP")}
            className="h-7 bg-[#2A162B] hover:bg-[#3D1E3E] border border-purple-700/40 text-purple-400 font-medium rounded text-xs transition-all active:scale-[0.98]"
          >
            STP
          </button>
        </div>

        {/* STP LMT Row */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onExecuteOrder("BUY", "STP_LMT")}
            className="h-7 bg-[#16291C] hover:bg-[#1E3B28] border border-emerald-700/40 text-emerald-400 font-medium rounded text-xs transition-all active:scale-[0.98]"
          >
            STP LMT
          </button>
          <button
            onClick={() => onExecuteOrder("SELL", "STP_LMT")}
            className="h-7 bg-[#2A162B] hover:bg-[#3D1E3E] border border-purple-700/40 text-purple-400 font-medium rounded text-xs transition-all active:scale-[0.98]"
          >
            STP LMT
          </button>
        </div>
      </div>

      {/* Action Buttons: Cancel, Breakeven & Alert Orange Cancel and Flat */}
      <div className="space-y-1.5 pt-1">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onCancelAll}
            className="h-7 bg-[#1E1E1E] hover:bg-[#2A2A2A] border border-[#3A3A3A] text-gray-200 font-semibold rounded text-xs transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onBreakeven}
            className="h-7 bg-[#1B232E] hover:bg-[#243242] border border-blue-600/40 text-blue-300 font-semibold rounded text-xs transition-all"
          >
            Breakeven
          </button>
        </div>

        {/* Full-width High Alert Orange Button */}
        <button
          onClick={onCancelAndFlat}
          className="w-full h-8 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold rounded text-xs tracking-wide shadow-[0_0_12px_rgba(249,115,22,0.4)] transition-all active:scale-[0.99]"
        >
          Cancel and Flat
        </button>
      </div>

      {/* OCO Strategy Block */}
      <div className="bg-[#161616] p-2.5 rounded border border-[#262626] space-y-2 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-300">OCO Strategy</span>
          <Switch
            checked={state.ocoEnabled}
            onCheckedChange={(checked) =>
              onStateChange((prev) => ({ ...prev, ocoEnabled: checked }))
            }
            className="scale-75"
          />
        </div>

        {state.ocoEnabled && (
          <div className="space-y-2 pt-1 border-t border-[#242424]">
            {/* Mode */}
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Mode</span>
              <Select
                value={state.ocoMode}
                onValueChange={(val: any) =>
                  onStateChange((prev) => ({ ...prev, ocoMode: val }))
                }
              >
                <SelectTrigger className="h-6 w-24 bg-[#1C1C1C] border-[#303030] text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1C1C1C] border-[#303030] text-[11px] font-mono">
                  <SelectItem value="SL/TP">SL / TP</SelectItem>
                  <SelectItem value="TRAILING">Trailing</SelectItem>
                  <SelectItem value="BREAKEVEN">Breakeven</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* SL / TP Checks & Units */}
            <div className="flex items-center justify-between gap-1 text-gray-300">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.slEnabled}
                  onChange={(e) =>
                    onStateChange((prev) => ({ ...prev, slEnabled: e.target.checked }))
                  }
                  className="accent-emerald-500"
                />
                <span>SL</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.tpEnabled}
                  onChange={(e) =>
                    onStateChange((prev) => ({ ...prev, tpEnabled: e.target.checked }))
                  }
                  className="accent-emerald-500"
                />
                <span>TP</span>
              </label>

              <div className="flex items-center gap-1 bg-[#1C1C1C] px-1 py-0.5 rounded border border-[#2E2E2E]">
                <button
                  onClick={() =>
                    onStateChange((prev) => ({ ...prev, ocoUnit: "MONEY" }))
                  }
                  className={`px-1 rounded ${
                    state.ocoUnit === "MONEY" ? "bg-cyan-500/20 text-cyan-400 font-bold" : "text-gray-500"
                  }`}
                >
                  Money
                </button>
                <span className="text-gray-600">|</span>
                <button
                  onClick={() =>
                    onStateChange((prev) => ({ ...prev, ocoUnit: "TICKS" }))
                  }
                  className={`px-1 rounded ${
                    state.ocoUnit === "TICKS" ? "bg-cyan-500/20 text-cyan-400 font-bold" : "text-gray-500"
                  }`}
                >
                  Ticks
                </button>
              </div>
            </div>

            {/* OCO Value input */}
            <div className="flex items-center justify-between gap-2">
              <Input
                type="number"
                value={state.ocoValue}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  onStateChange((prev) => ({ ...prev, ocoValue: val }));
                }}
                className="h-6 bg-[#1A1A1A] border-[#303030] text-right font-mono font-bold text-emerald-400 text-xs px-2"
              />
              <span className="text-gray-400">{state.ocoUnit === "MONEY" ? "$" : "ticks"}</span>
            </div>

            {/* B/E Ticks */}
            <div className="flex items-center justify-between">
              <span className="text-gray-400">B/E Ticks</span>
              <Input
                type="number"
                value={state.beTicks}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  onStateChange((prev) => ({ ...prev, beTicks: val }));
                }}
                className="h-6 w-16 bg-[#1A1A1A] border-[#303030] text-center font-bold text-xs"
              />
            </div>

            {/* Server vs Client Radio */}
            <div className="flex items-center justify-around pt-1 text-gray-400">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="execLoc"
                  checked={state.executionLocation === "SERVER"}
                  onChange={() =>
                    onStateChange((prev) => ({ ...prev, executionLocation: "SERVER" }))
                  }
                  className="accent-cyan-500"
                />
                <span>Server</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="execLoc"
                  checked={state.executionLocation === "CLIENT"}
                  onChange={() =>
                    onStateChange((prev) => ({ ...prev, executionLocation: "CLIENT" }))
                  }
                  className="accent-cyan-500"
                />
                <span>Client</span>
              </label>
            </div>

            {/* Link Pending Orders Button */}
            <button
              onClick={() =>
                onStateChange((prev) => ({
                  ...prev,
                  linkPendingOrders: !prev.linkPendingOrders,
                }))
              }
              className={`w-full h-6 rounded border flex items-center justify-center gap-1 text-[10px] transition-colors ${
                state.linkPendingOrders
                  ? "bg-cyan-950/50 border-cyan-500/50 text-cyan-300 font-bold"
                  : "bg-[#181818] border-[#2A2A2A] text-gray-400 hover:text-gray-200"
              }`}
            >
              <LinkIcon className="w-2.5 h-2.5" />
              <span>Link pending orders</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
