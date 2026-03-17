import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { type ManipulationPattern } from "@/hooks/use-order-flow";

interface OrderFlowThreatPatternsProps {
  manipulationPatterns: ManipulationPattern[];
  getPatternIcon: (type: string) => React.ReactNode;
  getSeverityColor: (severity: string) => string;
}

export function OrderFlowThreatPatterns({
  manipulationPatterns,
  getPatternIcon,
  getSeverityColor,
}: OrderFlowThreatPatternsProps) {
  return (
    <div className="space-y-4">
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">🎓 Understanding Market Manipulation</h3>
        <p className="text-sm text-blue-700">
          These patterns help identify when someone might be trying to manipulate the market. Higher numbers mean more suspicious activity.
        </p>
      </div>
      
      <div className="space-y-4">
        {manipulationPatterns.map((pattern, index) => (
          <Card key={index} className="border-l-4" style={{
            borderLeftColor: pattern.severity === 'high' ? '#ef4444' : 
                            pattern.severity === 'medium' ? '#f59e0b' : '#10b981'
          }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getPatternIcon(pattern.type)}
                  <div>
                    <CardTitle className="capitalize flex items-center gap-2">
                      {pattern.type === 'padding' ? '🎯 Order Padding' : 
                       pattern.type === 'scam' ? '⚠️ Scam Activity' : 
                       '⚡ Rag Pulling'}
                      <span className="text-sm font-normal text-muted-foreground">
                        ({pattern.count} instances)
                      </span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {pattern.type === 'padding' ? 
                        'Someone is placing many tiny orders to create fake trading volume. This makes the coin look more popular than it really is.' :
                       pattern.type === 'scam' ? 
                        'Detected suspicious trading patterns that might indicate fraudulent activity or coordinated manipulation.' :
                        'Rapid aggressive trades designed to quickly move the price up or down to mislead other traders.'}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={getSeverityColor(pattern.severity)}>
                    {pattern.severity === 'high' ? '🔴 HIGH RISK' : 
                     pattern.severity === 'medium' ? '🟡 MEDIUM' : 
                     '🟢 LOW RISK'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Threat Level:</span>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={pattern.severity === 'high' ? 85 : pattern.severity === 'medium' ? 55 : 25} 
                      className="w-24 h-2" 
                    />
                    <span className="font-mono text-xs">
                      {pattern.severity === 'high' ? '85%' : pattern.severity === 'medium' ? '55%' : '25%'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Detection Count:</span>
                  <span className="font-medium">{pattern.count} times in last hour</span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <strong>What this means:</strong> {
                      pattern.type === 'padding' ? 'Be cautious of artificially inflated volume numbers.' :
                      pattern.type === 'scam' ? 'Exercise extreme caution when trading this asset.' :
                      'Price movements may not reflect genuine market sentiment.'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
