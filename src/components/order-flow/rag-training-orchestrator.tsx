'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, RotateCcw, Database, Brain, Activity, Target } from "lucide-react";

interface TrainingStep {
  label: string;
  status: 'pending' | 'active' | 'done';
}

export function RAGTrainingOrchestrator({ symbol }: { symbol: string }) {
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [fineTunedWeights, setFineTunedWeights] = useState({
    imbalance: 1.0,
    entropy: 1.0,
    toxicity: 1.0,
    whaleImpact: 1.0
  });

  const steps: TrainingStep[] = [
    { label: 'Vectorizing DuckDB Vault...', status: 'pending' },
    { label: 'Feature Extraction (Entropy/VPIN/MFV)', status: 'pending' },
    { label: 'Backtesting Captured Signals (RAG)', status: 'pending' },
    { label: 'Loss Minimization & Bayesian Tuning', status: 'pending' },
    { label: 'Injecting Posterior Weights to Engine', status: 'pending' }
  ];

  const startTraining = () => {
    setIsTraining(true);
    setProgress(0);
    setCurrentStep(0);
  };

  useEffect(() => {
    if (!isTraining) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          return 100;
        }
        return prev + 1;
      });
    }, 150); // Simulated training speed

    return () => clearInterval(interval);
  }, [isTraining]);

  // Update steps based on progress
  useEffect(() => {
    const stepIdx = Math.floor((progress / 100) * steps.length);
    if (stepIdx < steps.length) {
      setCurrentStep(stepIdx);
    }

    // Dynamic Weight Simulation
    if (isTraining && progress > 50) {
        setFineTunedWeights({
            imbalance: 1.15 + (Math.random() * 0.1),
            entropy: 0.85 - (Math.random() * 0.05),
            toxicity: 1.25 + (Math.random() * 0.15),
            whaleImpact: 1.45 + (Math.random() * 0.2)
        });
    }
  }, [progress, isTraining, steps.length]);

  return (
    <Card className="bg-slate-900 border-indigo-500/40 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
         <Brain className="h-24 w-24 text-indigo-400" />
      </div>
      
      <CardHeader className="bg-slate-950 border-b border-white/5 flex flex-row items-center justify-between py-4">
        <div>
           <CardTitle className="text-sm font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
             <Database className="h-4 w-4" /> Bayesian RAG Training Engine
           </CardTitle>
           <p className="text-[10px] font-bold text-slate-500 uppercase italic">Symbol Context: {symbol}</p>
        </div>
        {!isTraining ? (
           <button 
             onClick={startTraining}
             className="flex items-center gap-2 px-3 py-1.5 rounded bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg border border-indigo-400"
           >
              <Play className="h-3 w-3 fill-white" /> Start 5-Min Training Loop
           </button>
        ) : (
           <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest border border-amber-500/30">
              <Activity className="h-3 w-3 animate-pulse" /> Training Engine Active... {progress}%
           </div>
        )}
      </CardHeader>

      <CardContent className="pt-6">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Step list */}
            <div className="space-y-3">
               <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Training Pipeline</h4>
               {steps.map((step, i) => (
                  <div key={i} className={`flex items-center gap-3 transition-opacity ${i > currentStep && !isTraining ? 'opacity-30' : 'opacity-100'}`}>
                     <div className={`h-1.5 w-1.5 rounded-full ${i < currentStep ? 'bg-emerald-400' : i === currentStep && isTraining ? 'bg-amber-400 animate-ping' : 'bg-slate-700'}`} />
                     <span className={`text-[10px] font-black uppercase tracking-tight ${i === currentStep && isTraining ? 'text-white' : i < currentStep ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {step.label}
                     </span>
                  </div>
               ))}
               
               <div className="mt-6 pt-4 border-t border-white/5">
                  <div className="text-[9px] font-black text-indigo-400 uppercase italic">
                    "Bayesian engine is isolating 'Toxic Traps' as primary failure vector."
                  </div>
               </div>
            </div>

            {/* Neural Weight Injector */}
            <div className="bg-slate-950/50 p-6 rounded-xl border border-white/5 ring-1 ring-white/5 shadow-inner">
               <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Target className="h-3 w-3 text-indigo-400" /> Posterior Weight Tuning
               </h4>
               
               <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: 'Imbalance', val: fineTunedWeights.imbalance, color: 'text-indigo-400' },
                    { label: 'Entropy', val: fineTunedWeights.entropy, color: 'text-rose-400' },
                    { label: 'VPIN (Tox)', val: fineTunedWeights.toxicity, color: 'text-amber-400' },
                    { label: 'Whale Impact', val: fineTunedWeights.whaleImpact, color: 'text-emerald-400' }
                  ].map((w, i) => (
                     <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                           <span>{w.label}</span>
                           <span className={w.color}>{w.val.toFixed(2)}</span>
                        </div>
                        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                           <div 
                             className={`h-full transition-all duration-300 ${w.color.replace('text-', 'bg-')}`} 
                             style={{ width: `${Math.min(100, (w.val / 2) * 100)}%` }} 
                           />
                        </div>
                     </div>
                  ))}
               </div>

               <div className="mt-8">
                  <Badge className={`w-full py-1 justify-center text-[10px] font-black tracking-[0.2em] border shadow-sm ${progress === 100 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {progress === 100 ? 'ENGINE SYNCHRONIZED' : 'TUNING NEURAL PROPRIETORS'}
                  </Badge>
               </div>
            </div>
         </div>
      </CardContent>
    </Card>
  );
}
