import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Timer, Target, CheckCircle } from "lucide-react";
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
  return (
    <div className="space-y-4">
      <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
        <h3 className="font-semibold text-red-800 mb-2">🚨 Active Alerts</h3>
        <p className="text-sm text-red-700">
          These alerts warn you about detected suspicious activities. Take extra caution when trading during these alerts.
        </p>
      </div>
      
      <div className="space-y-4">
        {hasHighRiskDetected && (
          <Alert className="border-red-200 bg-red-50 animate-pulse">
            <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />
            <AlertTitle className="text-red-800 animate-pulse">🔴 HIGH RISK: Large Order Manipulation Detected</AlertTitle>
            <AlertDescription className="text-red-700">
              <div className="space-y-2">
                <p>Unusually large order detected on {selectedSymbol} with high manipulation risk score.</p>
                <div className="text-xs">
                  <strong>What to do:</strong> Avoid trading until this alert clears. Large orders can artificially move prices.
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <Alert className="border-yellow-200 bg-yellow-50">
          <Timer className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">🟡 MEDIUM RISK: Wash Trading Suspected</AlertTitle>
          <AlertDescription className="text-yellow-700">
            <p className="text-sm">Repeated back-and-forth trading detected on {selectedSymbol} - possible fake volume creation.</p>
          </AlertDescription>
        </Alert>
        
        <Alert className="border-orange-200 bg-orange-50">
          <Target className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">🟠 LOW RISK: Order Padding Activity</AlertTitle>
          <AlertDescription className="text-orange-700">
            <p className="text-sm">Multiple small orders creating artificial volume on {selectedSymbol}.</p>
          </AlertDescription>
        </Alert>

        {manipulationPatterns.every(p => p.count === 0) && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">✅ All Clear</AlertTitle>
            <AlertDescription className="text-green-700">
              No suspicious activities detected for {selectedSymbol}. Trading appears normal.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
