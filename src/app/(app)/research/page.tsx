"use client";

import React, { useState } from "react";
import AIResearchPage from "../ai-research/page";
import { ResearchDashboard } from "@/components/research-dashboard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, BarChart2 } from "lucide-react";

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState("ai-models");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Quantitative Research Terminal
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Institutional AI market forecasting, volumetric liquidity risk scans, and predictive signal matrix.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-2 w-full md:w-[320px] bg-background/60 backdrop-blur-md border border-white/10 p-1 rounded-xl">
            <TabsTrigger value="ai-models" className="flex items-center gap-2 rounded-lg text-xs font-semibold data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
              <Brain className="w-3.5 h-3.5" />
              <span>AI Intelligence</span>
            </TabsTrigger>
            <TabsTrigger value="quant-liquidity" className="flex items-center gap-2 rounded-lg text-xs font-semibold data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Liquidity & DEX</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "ai-models" ? (
        <AIResearchPage />
      ) : (
        <ResearchDashboard />
      )}
    </div>
  );
}