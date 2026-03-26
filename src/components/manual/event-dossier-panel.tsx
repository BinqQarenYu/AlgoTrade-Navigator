"use client"
import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, FileText, Loader2, BrainCircuit } from "lucide-react"
import type { LiveBotStateForAsset, LiveBotConfig } from "@/lib/types"
import { predictMarket } from "@/ai/flows/predict-market-flow"
import { microstructureService } from "@/lib/microstructure-service"
import { useApi } from "@/context/api-context"

interface EventDossierPanelProps {
  bot: LiveBotConfig;
  botState?: LiveBotStateForAsset;
}

export function EventDossierPanel({ bot, botState }: EventDossierPanelProps) {
  const { geminiApiKey, geminiModel } = useApi();
  const [dossier, setDossier] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSignal = botState?.activePosition;
  const isRunning = botState?.status === 'running' || botState?.status === 'analyzing' || botState?.status === 'position_open';

  useEffect(() => {
    // Only fetch dossier if there's an active signal and bot is genuinely monitoring
    if (!activeSignal || !activeSignal.timestamp || !isRunning) {
        setDossier(null);
        return;
    }
    
    // Check if we already have the dossier for this exact signal timestamp
    if (dossier?.signal?.timestamp === activeSignal.timestamp) {
        return;
    }

    let isMounted = true;
    
    const fetchDossier = async () => {
        setIsAnalyzing(true);
        setError(null);
        
        try {
            // 1. Fetch microstructure data locally (synchronous logic, zero impact)
            const ms = microstructureService.getLatestMetrics(bot.asset);
            
            // 2. Format historical chart data for AI
            const chartDataJson = JSON.stringify(botState?.chartData?.slice(-30) || []);
            
            // 3. Formulate the prediction (Macro Analysis)
            const prediction = await predictMarket({
                symbol: bot.asset,
                recentData: chartDataJson,
                apiKey: geminiApiKey || undefined,
                model: geminiModel,
                microstructure: ms || undefined,
            });

            if (isMounted) {
                setDossier({ prediction, microstructure: ms, signal: activeSignal });
            }
        } catch (err: any) {
            console.error("Dossier generation failed", err);
            if (isMounted) setError(err.message || "Failed to generate AI dossier.");
        } finally {
            if (isMounted) setIsAnalyzing(false);
        }
    };
    
    fetchDossier(); // Unhandled promise intentionally, relies on side effects
    
    return () => { isMounted = false; };
  }, [activeSignal?.timestamp, isRunning, bot.asset, geminiApiKey, geminiModel, botState?.chartData]);

  if (!activeSignal || !isRunning) {
    return (
        <Card className="border-slate-800 bg-slate-900/50 shadow-inner col-span-12 w-full mt-2">
             <CardContent className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground min-h-[200px]">
                 <FileText className="w-8 h-8 mb-4 opacity-20" />
                 <p className="text-sm font-medium">Waiting for Strategy Trigger...</p>
                 <p className="text-xs opacity-50 max-w-[400px] mt-2 leading-relaxed">
                    The Event Dossier operates in deep standby. It will automatically spin up the AI Research and Microstructure (Order Flow) engines <b>only when your selected strategy identifies a real setup</b>.
                 </p>
             </CardContent>
        </Card>
    );
  }

  return (
    <Card className="border-purple-500/30 bg-purple-950/10 shadow-lg col-span-12 w-full mt-2">
      <CardHeader className="py-2 px-4 flex flex-row items-center border-b border-white/5 bg-slate-900/50">
        <FileText className="w-4 h-4 text-purple-400 mr-2 mt-1" />
        <CardTitle className="text-sm font-bold text-purple-300 flex items-center gap-2">
           Event Dossier - {bot.asset}
           {isAnalyzing && <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4">
          {error ? (
              <div className="flex items-start gap-2 text-red-400 p-3 bg-red-950/20 rounded border border-red-900/30">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <span className="text-xs">{error}</span>
              </div>
          ) : dossier ? (
               <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                   <div className="flex items-center gap-3 p-3 bg-slate-900/80 rounded border border-white/5">
                        <BrainCircuit className="w-6 h-6 text-indigo-400 shrink-0" />
                        <div>
                             <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-0.5">Macro AI Confluence</p>
                             <p className="text-sm tracking-tight text-white flex items-center gap-2">
                                 {dossier.prediction?.conservative?.prediction === activeSignal.action 
                                     ? <span className="text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">✅ Confluence Aligned (Strong Setup)</span>
                                     : <span className="text-yellow-400 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">⚠️ Divergent Bias. AI leans {dossier.prediction?.conservative?.prediction}</span>
                                 }
                             </p>
                        </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-4 bg-slate-900/80 rounded border border-white/5 flex flex-col justify-center">
                           <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                               <FileText className="w-3 h-3" /> AI Reasoning (Macro)
                           </p>
                           <p className="text-xs leading-relaxed text-slate-300">{dossier.prediction?.conservative?.reasoning || "Insufficient data for macro breakdown."}</p>
                       </div>
                       
                       <div className="p-4 bg-slate-900/80 rounded border border-white/5 flex flex-col justify-center">
                           <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                               <AlertCircle className="w-3 h-3" /> Microstructure (Order Flow)
                           </p>
                           <div className="space-y-2">
                               <p className="text-xs font-medium tracking-wide flex justify-between items-center bg-black/30 p-2 rounded">
                                  <span>Manipulation Threat:</span>
                                  <strong className={
                                      dossier.microstructure?.entropyScore > 7 ? 'text-red-400 animate-pulse' : 
                                      dossier.microstructure?.entropyScore > 4 ? 'text-yellow-400' : 
                                      'text-green-400'
                                  }>
                                      {dossier.microstructure?.entropyScore?.toFixed(1) || '0.0'}/10
                                  </strong>
                               </p>
                               {dossier.microstructure?.isSpoofing && <p className="text-[11px] text-red-500 font-black tracking-wide flex items-center gap-1"><AlertCircle className="w-3 h-3"/> ORDER SPOOFING DETECTED</p>}
                               {dossier.microstructure?.isToxicTrap && <p className="text-[11px] text-orange-500 font-black tracking-wide flex items-center gap-1"><AlertCircle className="w-3 h-3"/> TOXIC LIQUIDITY TRAP</p>}
                           </div>
                       </div>
                   </div>
               </div>
          ) : (
                <div className="flex flex-col items-center justify-center p-8 text-purple-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <span className="text-sm font-bold tracking-widest uppercase animate-pulse">Running Forensic AI Analysis...</span>
                  <span className="text-xs text-muted-foreground mt-2">Pulling order book telemetry & compiling macro models</span>
                </div>
          )}
      </CardContent>
    </Card>
  )
}
