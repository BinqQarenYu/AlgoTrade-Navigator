"use client";

import React, { useState } from "react";
import {
  List,
  Bell,
  Newspaper,
  Flame,
  CalendarDays,
  Lightbulb,
  MessageSquare,
  Activity,
  Box,
  AlignJustify,
  Plus,
  MoreHorizontal
} from "lucide-react";

interface TVRightSidebarProps {
  children?: React.ReactNode;
}

export function TVRightSidebar({ children }: TVRightSidebarProps) {
  const [activeTab, setActiveTab] = useState("watchlist");

  const navIcons = [
    { id: "watchlist", icon: List, title: "Watchlist and details" },
    { id: "alerts", icon: Bell, title: "Alerts" },
    { id: "news", icon: Newspaper, title: "News" },
    { id: "data", icon: Activity, title: "Data Window" },
    { id: "hotlists", icon: Flame, title: "Hotlists" },
    { id: "calendar", icon: CalendarDays, title: "Calendar" },
    { id: "ideas", icon: Lightbulb, title: "My Ideas" },
    { id: "chats", icon: MessageSquare, title: "Chats" },
    { id: "dom", icon: AlignJustify, title: "DOM" },
    { id: "order", icon: Box, title: "Order Panel" },
  ];

  return (
    <div className="flex h-full border-l border-[#2A2E39] bg-[#131722] text-[#B2B5BE] shrink-0">
      
      {/* Main Panel Area (collapsible based on active tab) */}
      {activeTab && (
        <div className="w-[300px] flex flex-col h-full border-r border-[#2A2E39]">
          
          {/* Watchlist Tab Content */}
          {activeTab === "watchlist" && (
            <>
              {/* Watchlist Header */}
              <div className="h-12 border-b border-[#2A2E39] flex items-center justify-between px-3">
                <div className="font-bold text-white">Watchlist</div>
                <div className="flex items-center gap-1">
                  <button className="p-1 hover:bg-[#2A2E39] rounded"><Plus className="w-4 h-4" /></button>
                  <button className="p-1 hover:bg-[#2A2E39] rounded"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Watchlist Table Columns */}
              <div className="flex items-center text-[11px] font-semibold text-[#787B86] px-3 py-1 border-b border-[#2A2E39]">
                <div className="flex-1">Symbol</div>
                <div className="w-16 text-right">Last</div>
                <div className="w-12 text-right">Chg</div>
                <div className="w-12 text-right">Chg%</div>
              </div>

              {/* Watchlist Rows */}
              <div className="flex-1 overflow-y-auto no-scrollbar py-1">
                {[
                  { sym: "BTCUSDT", last: "77758.1", chg: "-857.9", pct: "-1.09%", up: false },
                  { sym: "ETHUSDT", last: "2445.21", chg: "-75.69", pct: "-3.00%", up: false },
                  { sym: "SOLUSDT", last: "95.17", chg: "+1.44", pct: "1.54%", up: true },
                  { sym: "BNBUSDT", last: "707.07", chg: "+17.09", pct: "2.48%", up: true },
                ].map((row) => (
                  <div key={row.sym} className="flex items-center text-[13px] px-3 py-1 hover:bg-[#2A2E39] cursor-pointer">
                    <div className="flex-1 font-semibold text-[#D1D4DC]">{row.sym}</div>
                    <div className={`w-16 text-right ${row.up ? 'text-[#089981]' : 'text-[#F23645]'}`}>{row.last}</div>
                    <div className={`w-12 text-right ${row.up ? 'text-[#089981]' : 'text-[#F23645]'}`}>{row.chg}</div>
                    <div className={`w-12 text-right ${row.up ? 'text-[#089981]' : 'text-[#F23645]'}`}>{row.pct}</div>
                  </div>
                ))}
              </div>

              {/* Details Section */}
              <div className="h-[250px] border-t border-[#2A2E39] flex flex-col p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">B</div>
                  <div>
                    <div className="font-bold text-white text-sm">BTCUSDT</div>
                    <div className="text-[11px]">Bitcoin / TetherUS • BINANCE</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4 text-[13px]">
                  <span className="font-bold text-2xl text-[#F23645]">77,758.1</span>
                  <span className="text-[#B2B5BE]">USDT</span>
                  <span className="text-[#F23645] font-medium">-857.9</span>
                  <span className="text-[#F23645] font-medium">-1.09%</span>
                </div>
                
                <div className="flex items-center gap-1 mt-1 text-[11px] text-[#089981]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#089981]" />
                  Market open
                </div>

                <div className="mt-4 border border-[#2A2E39] rounded p-2 bg-[#1E222D]">
                  <div className="font-semibold text-[11px] text-[#D1D4DC] mb-1">Key stats</div>
                  <div className="flex justify-between text-[11px]">
                    <span>Volume</span>
                    <span className="text-[#D1D4DC]">267.94K</span>
                  </div>
                  <div className="flex justify-between text-[11px] mt-1">
                    <span>Average Volume (30D)</span>
                    <span className="text-[#D1D4DC]">145.2K</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Order Panel Tab Content (where our DeepDomOrderEntry goes) */}
          {activeTab === "order" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
               <div className="h-12 border-b border-[#2A2E39] flex items-center px-3 font-bold text-white">Order Panel</div>
               <div className="flex-1 overflow-hidden">
                 {children}
               </div>
            </div>
          )}

          {/* Other Tabs placeholder */}
          {activeTab !== "watchlist" && activeTab !== "order" && (
            <div className="flex-1 flex items-center justify-center text-sm font-medium">
              {navIcons.find(n => n.id === activeTab)?.title} (Coming Soon)
            </div>
          )}
        </div>
      )}

      {/* Slim Nav Bar */}
      <div className="w-12 h-full flex flex-col items-center py-2 gap-3 shrink-0 bg-[#131722]">
        {navIcons.map((nav) => (
          <button 
            key={nav.id}
            onClick={() => setActiveTab(activeTab === nav.id ? "" : nav.id)}
            title={nav.title}
            className={`p-1.5 rounded transition-colors ${activeTab === nav.id ? 'text-[#2962FF]' : 'text-[#B2B5BE] hover:text-[#D1D4DC]'}`}
          >
            <nav.icon className="w-5 h-5" />
          </button>
        ))}
      </div>
    </div>
  );
}
