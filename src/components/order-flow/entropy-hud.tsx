import React, { useMemo, useEffect, useRef } from 'react';
import { DraggableOverlay } from './draggable-overlay';
import { type OrderFlowData } from '@/hooks/use-order-flow';
import { Activity, ShieldAlert, Cpu, Radiation, Target } from 'lucide-react';
import { aiTrainingService } from '@/lib/ai-training-service';

interface EntropyHUDProps {
  orderFlowData: OrderFlowData[];
}

/**
 * Professional Entropy HUD
 * Visualizes the 'Chaos Level' and 'Institutional Toxicity' in real-time.
 * Pattern: High-Fidelity Infrastructure HUD
 * INTEGRATION: Bayesian Signal Logger (RAG Test)
 */
export function EntropyHUD({ orderFlowData }: EntropyHUDProps) {
  const activeSignalIdRef = useRef<string | null>(null);
  const entryPriceRef = useRef<number | null>(null);
  const signalSideRef = useRef<'buy' | 'sell' | null>(null);

  // Extract latest microstructure metrics from the last 10 prints
  const metrics = useMemo(() => {
    if (orderFlowData.length === 0) return null;
    
    // Average metrics over the last 10 trades for stability
    const window = orderFlowData.slice(0, 10);

    // ⚡ Bolt Optimization: Consolidate multiple O(N) functional loops
    // into a single-pass `for` loop to minimize array allocations and CPU lag.
    let totalEntropy = 0;
    let totalToxicity = 0;
    let toxicTraps = 0;
    let buys = 0;
    let sells = 0;
    let latest = null;

    for (let i = 0; i < window.length; i++) {
      const o = window[i];
      const micro = o.microstructure;

      if (micro) {
        totalEntropy += micro.entropyScore || 0;
        totalToxicity += micro.vpin || 0;
        if (micro.isToxicTrap) toxicTraps++;
        if (!latest) latest = micro; // First non-null microstructure
      }

      if (o.orderType === 'buy') {
        buys += o.size;
      } else if (o.orderType === 'sell') {
        sells += o.size;
      }
    }

    const avgEntropy = totalEntropy / window.length;
    const avgToxicity = totalToxicity / window.length;
    
    // Safety check for first non-null microstructure
    if (!latest && avgEntropy === 0) return null;

    const imbalanceRatio = Math.max(buys, sells) / (Math.min(buys, sells) || 1);
    const dominantSide = buys > sells ? 'buy' : 'sell';

    // Absorption check: High toxicity (vpin) but low volatility in the window
    const priceMove = Math.abs(window[0].price - window[window.length-1].price);
    const isAbsorption = avgToxicity > 0.6 && priceMove < (window[0].price * 0.0001);

    const scalpScore = (1 - avgEntropy) * 35 + (1 - avgToxicity) * 35 + (toxicTraps === 0 ? 15 : 0) + (imbalanceRatio > 2.5 ? 15 : 0);
    const isGoodScalp = scalpScore > 75 && !isAbsorption && latest?.marketState !== 'Chaos';

    return {
      entropy: avgEntropy,
      vpin: avgToxicity,
      traps: toxicTraps,
      imbalance: imbalanceRatio,
      dominantSide,
      isAbsorption,
      isHighChaos: avgEntropy > 0.7 || latest?.marketState === 'Chaos',
      state: latest?.marketState || 'Equilibrium',
      implication: latest?.strategicImplication || 'Market is stable.',
      scalpScore,
      isGoodScalp
    };
  }, [orderFlowData]);

  // --- Bayesian RAG Logging Effect ---
  useEffect(() => {
    if (metrics?.isGoodScalp && !activeSignalIdRef.current) {
        const symbol = orderFlowData[0]?.symbol;
        const price = orderFlowData[0]?.price;
        const side = metrics.dominantSide === 'buy' ? 'BUY' : 'SELL';
        
        console.info(`[Bayesian] Signal Generated: ${side} @ ${price}`);
        
        aiTrainingService.logSignal({
            symbol,
            strategy_id: 'quant-expert-v3',
            signal_type: side as 'BUY' | 'SELL',
            entry_price: price,
            feature_vector: JSON.stringify(metrics)
        }).then(id => {
            if (id) {
                activeSignalIdRef.current = id;
                entryPriceRef.current = price;
                signalSideRef.current = metrics.dominantSide as 'buy' | 'sell';
            }
        });
    }
  }, [metrics?.isGoodScalp, orderFlowData]);

  // --- Bayesian Outcome Watcher (Log -> Learn) ---
  useEffect(() => {
    if (!activeSignalIdRef.current || !entryPriceRef.current || orderFlowData.length === 0) return;
    
    const currentPrice = orderFlowData[0].price;
    const entryPrice = entryPriceRef.current;
    const side = signalSideRef.current;
    
    const priceDiff = side === 'buy' ? (currentPrice - entryPrice) : (entryPrice - currentPrice);
    const pnlPercent = (priceDiff / entryPrice) * 100;
    
    // Outcome thresholds for RAG-Training (Tight 5-min scalp bounds)
    const PROFIT_THRESHOLD = 0.15; // 0.15% Win
    const LOSS_THRESHOLD = -0.10;  // 0.10% Loss
    
    if (pnlPercent >= PROFIT_THRESHOLD || pnlPercent <= LOSS_THRESHOLD) {
        const outcome = pnlPercent >= PROFIT_THRESHOLD ? 'WIN' : 'LOSS';
        const finalPnl = pnlPercent;
        const signalId = activeSignalIdRef.current;
        
        console.info(`[Bayesian] Signal Closed: ${outcome} (${pnlPercent.toFixed(3)}%)`);
        
        aiTrainingService.recordOutcome(signalId, outcome, currentPrice, finalPnl);
        
        // Reset local trackers for next signal
        activeSignalIdRef.current = null;
        entryPriceRef.current = null;
        signalSideRef.current = null;
    }
  }, [orderFlowData]);

  if (!metrics) return null;

  const entropyPercent = Math.min(100, Math.max(0, metrics.entropy * 100));
  const toxicityPercent = Math.min(100, Math.max(0, metrics.vpin * 100));

  const getStateStyles = (state: string) => {
    switch (state) {
      case 'Toxic pressure': return 'text-rose-700 border-rose-200 bg-rose-50';
      case 'Chaos': return 'text-orange-700 border-orange-200 bg-orange-50';
      case 'Discovery': return 'text-emerald-700 border-emerald-200 bg-emerald-50';
      case 'Bot Noise': return 'text-slate-600 border-slate-200 bg-slate-50';
      default: return 'text-blue-700 border-blue-200 bg-blue-50';
    }
  };

  return (
    <DraggableOverlay 
      id="entropy_hud" 
      defaultPosition={{ x: 20, y: 150 }} 
      className="w-80 border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-2 p-4 ring-1 ring-slate-100/50"
    >
      <div className="space-y-4 text-slate-900">
        
        {/* Header - High Contrast Title */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
             <div className={`p-2 rounded-lg shadow-sm ${metrics.isHighChaos ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                <Activity className="h-5 w-5" />
             </div>
             <div>
                <h1 className="font-black text-xs uppercase tracking-tight text-slate-800 leading-none">Quant Microstructure</h1>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Advanced Execution Intelligence</div>
             </div>
          </div>
          <div className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border-2 shadow-sm ${getStateStyles(metrics.state)}`}>
             {metrics.state}
          </div>
        </div>

        {/* Scalp Pulse Indicator */}
        <div className={`p-3 rounded-xl border-2 shadow-sm transition-all duration-500 overflow-hidden relative ${
          metrics.isGoodScalp 
            ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-100 animate-pulse' 
            : metrics.isAbsorption ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'
        }`}>
           <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                 <Cpu className={`h-3.5 w-3.5 ${metrics.isGoodScalp ? 'text-emerald-500' : 'text-slate-400'}`} />
                 5-Min Quant Pulse
              </div>
              <div className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${
                metrics.isGoodScalp ? 'bg-emerald-500 text-white shadow-sm' : 
                metrics.isAbsorption ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                 {metrics.isGoodScalp ? 'MOMENTUM IGNITION' : metrics.isAbsorption ? 'ABSORPTION' : 'NEUTRAL PULSE'}
              </div>
           </div>

            {/* AI Tracking State - NEW */}
            {(activeSignalIdRef.current || metrics.isGoodScalp) && (
               <div className="absolute top-2 right-2 flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 animate-pulse">
                  <Target className="h-2.5 w-2.5 text-indigo-500" />
                  <span className="text-[7px] font-black text-indigo-600 uppercase tracking-tighter">Bayesian Capture Active</span>
               </div>
            )}
            
           <div className="flex items-end gap-3">
              <div className={`text-2xl font-black font-mono leading-none ${metrics.isGoodScalp ? 'text-emerald-700' : 'text-slate-400'}`}>
                 {metrics.scalpScore.toFixed(0)}<span className="text-xs ml-0.5 font-bold">Q/V</span>
              </div>
              <div className="flex-1 pb-1">
                 <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div 
                       className={`h-full transition-all duration-1000 ${metrics.isGoodScalp ? 'bg-emerald-500' : 'bg-slate-400'}`}
                       style={{ width: `${metrics.scalpScore}%` }}
                    />
                 </div>
              </div>
           </div>
           
           <p className="mt-2.5 text-[10.5px] font-bold text-slate-700 leading-tight">
              {metrics.isGoodScalp 
                ? `High conviction ${metrics.dominantSide} imbalance detected. Predictable structure confirmed.` 
                : metrics.isAbsorption ? 'Passive limit orders absorbing momentum. Wait for sweep or exhaustion.' : 'Market microstructure is currently fragmented. Maintain patience for clean imbalance.'}
           </p>
        </div>

        {/* Expert Diagnostics Grid */}
        <div className="grid grid-cols-2 gap-2">
           <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex flex-col items-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Imbalance Ratio</span>
              <div className={`text-lg font-black font-mono ${metrics.imbalance > 1.8 ? (metrics.dominantSide === 'buy' ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-800'}`}>
                 {metrics.imbalance.toFixed(2)}x
              </div>
              <span className={`text-[8px] font-black uppercase ${metrics.dominantSide === 'buy' ? 'text-emerald-500' : 'text-rose-500'}`}>
                 DRIVING {metrics.dominantSide.toUpperCase()}
              </span>
           </div>
           <div className={`p-2.5 rounded-lg border flex flex-col items-center justify-center ${metrics.isAbsorption ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Execution Style</span>
              <div className={`text-[10px] font-black uppercase text-center ${metrics.isAbsorption ? 'text-amber-700' : 'text-blue-700'}`}>
                 {metrics.isAbsorption ? 'Passive Absorption' : 'Aggressive Sweeping'}
              </div>
              <ShieldAlert className={`h-3 w-3 mt-1 ${metrics.isAbsorption ? 'text-amber-500 animate-bounce' : 'text-blue-500'}`} />
           </div>
        </div>

        {/* Metrics Grid */}
        <div className="space-y-4">
          
          {/* Shannon Entropy Gauge */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs items-center font-bold">
              <span className="text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Radiation className="h-3 w-3" /> Shannon Entropy (Chaos)
              </span>
              <span className={`px-1.5 py-0.5 rounded font-mono border-2 ${metrics.entropy > 0.6 ? 'text-rose-600 border-rose-100 bg-rose-50' : 'text-emerald-600 border-emerald-100 bg-emerald-50'}`}>
                {(metrics.entropy * 10).toFixed(2)} Bits
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full border border-slate-200 overflow-hidden p-0.5">
               <div 
                 className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${metrics.entropy > 0.6 ? 'bg-gradient-to-r from-rose-500 to-orange-400' : 'bg-gradient-to-r from-emerald-500 to-blue-400'}`} 
                 style={{ width: `${entropyPercent}%` }} 
               />
            </div>
          </div>

          {/* VPIN Gauge */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs items-center font-bold">
              <span className="text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Activity className="h-3 w-3" /> VPIN Toxicity (Pressure)
              </span>
              <span className={`px-1.5 py-0.5 rounded font-mono border-2 ${metrics.vpin > 0.6 ? 'text-rose-600 border-rose-100 bg-rose-50' : 'text-blue-600 border-blue-100 bg-blue-50'}`}>
                {(metrics.vpin * 100).toFixed(1)} %
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full border border-slate-200 overflow-hidden p-0.5">
               <div 
                 className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${metrics.vpin > 0.6 ? 'bg-rose-500 animate-pulse' : 'bg-blue-600'}`} 
                 style={{ width: `${toxicityPercent}%` }} 
               />
            </div>
          </div>

        </div>

        {/* Strategic Analysis */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 relative overflow-hidden group shadow-inner">
           <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors ${metrics.isHighChaos ? 'bg-rose-500' : 'bg-blue-500'}`} />
           <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Radiation className="h-3.5 w-3.5 text-slate-400" /> Strategic Implication
           </div>
           <p className="text-xs font-bold leading-relaxed text-slate-700 italic">
              "{metrics.implication}"
           </p>
        </div>

        {/* Advanced Diagnostics Footer */}
        <div className="pt-2 flex justify-center">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 shadow-lg text-[9px] font-black text-white uppercase tracking-widest border border-black transform hover:scale-105 transition-transform cursor-default">
               <Activity className="h-3 w-3 text-emerald-400 animate-pulse" /> Quant Analysis Active
            </div>
        </div>

      </div>
    </DraggableOverlay>
  );
}
