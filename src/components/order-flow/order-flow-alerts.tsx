import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Timer, Target, CheckCircle, BellRing } from "lucide-react";
import { type ManipulationPattern } from "@/hooks/use-order-flow";

interface OrderFlowAlertsProps {
  hasHighRiskDetected: boolean;
  selectedSymbol: string;
  manipulationPatterns: ManipulationPattern[];
}

export function OrderFlowAlerts({
  hasHighRiskDetected,
  selectedSymbol,
  manipulationPatterns,
}: OrderFlowAlertsProps) {
  const isAllClear = manipulationPatterns.every(p => p.count === 0) && !hasHighRiskDetected;

  return (
    <div className="space-y-6">
      <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 shadow-xl">
        <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight mb-2">
          <BellRing className="h-8 w-8 text-blue-400" />
          Active Situational Alerts
        </h3>
        <p className="text-slate-400 font-medium">
          Real-time security flags and system warnings triggered by immediate anomalous conditions for {selectedSymbol}.
        </p>
      </div>
      
      <div className="space-y-4">
        {hasHighRiskDetected && (
          <Alert className="border-2 border-red-500 bg-red-950/40 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse rounded-xl p-5">
            <AlertTriangle className="h-6 w-6 text-red-500 mt-1" />
            <div className="ml-4">
              <AlertTitle className="text-red-400 font-black text-xl tracking-tight uppercase mb-2">
                CRITICAL: Severe Manipulation Detected
              </AlertTitle>
              <AlertDescription className="text-slate-300 font-medium leading-relaxed">
                <div className="space-y-3">
                  <p>Unusually hostile order structure detected on <strong className="text-white font-mono">{selectedSymbol}</strong> with a maximum manipulation risk score.</p>
                  <div className="p-3 bg-red-900/30 border border-red-800/50 rounded text-sm text-red-200">
                    <strong className="text-red-400 font-black uppercase tracking-widest block mb-1">Defense Protocol</strong> 
                    Halt market execution on {selectedSymbol} until alert clears. Capital deployment at extreme risk of slippage or algorithmic trapping.
                  </div>
                </div>
              </AlertDescription>
            </div>
          </Alert>
        )}
        
        <Alert className="border border-orange-500/50 bg-orange-950/20 rounded-xl p-5">
          <Timer className="h-5 w-5 text-orange-500 mt-0.5" />
          <div className="ml-4">
            <AlertTitle className="text-orange-400 font-black text-lg tracking-tight uppercase mb-1">
              Elevated: Wash Trading Probability
            </AlertTitle>
            <AlertDescription className="text-slate-400 font-medium leading-relaxed">
              <p>Repeated back-and-forth execution pairing detected on <strong className="text-white font-mono">{selectedSymbol}</strong>. High likelihood of synthetic volume fabrication.</p>
            </AlertDescription>
          </div>
        </Alert>
        
        <Alert className="border border-yellow-500/50 bg-yellow-950/20 rounded-xl p-5">
          <Target className="h-5 w-5 text-yellow-500 mt-0.5" />
          <div className="ml-4">
            <AlertTitle className="text-yellow-400 font-black text-lg tracking-tight uppercase mb-1">
              Notice: Micro-Order Padding
            </AlertTitle>
            <AlertDescription className="text-slate-400 font-medium leading-relaxed">
              <p>Multiple high-frequency micro-orders padding the order book on <strong className="text-white font-mono">{selectedSymbol}</strong>.</p>
            </AlertDescription>
          </div>
        </Alert>

        {isAllClear && (
          <Alert className="border-2 border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] rounded-xl p-5">
            <CheckCircle className="h-6 w-6 text-emerald-500 mt-1" />
            <div className="ml-4">
              <AlertTitle className="text-emerald-400 font-black text-xl tracking-tight uppercase mb-1">
                System Clear
              </AlertTitle>
              <AlertDescription className="text-slate-300 font-medium leading-relaxed">
                No hostile activities or anomalies detected for <strong className="text-white font-mono">{selectedSymbol}</strong>. Market mechanics and trade flow appear normal. Proceed with standard execution.
              </AlertDescription>
            </div>
          </Alert>
        )}
      </div>
    </div>
  );
}
