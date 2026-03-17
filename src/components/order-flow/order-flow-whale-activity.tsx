import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Timer } from "lucide-react";
import { type VeryLargeActivity } from "@/hooks/use-order-flow";

interface OrderFlowWhaleActivityProps {
  veryLargeActivities: VeryLargeActivity[];
  activeVeryLargeActivity: VeryLargeActivity | null;
  veryLargeActivityLog: string[];
  saveActivityLog: () => void;
}

export function OrderFlowWhaleActivity({
  veryLargeActivities,
  activeVeryLargeActivity,
  veryLargeActivityLog,
  saveActivityLog,
}: OrderFlowWhaleActivityProps) {
  return (
    <div className="space-y-4">
      <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
        <h3 className="font-semibold text-purple-800 mb-2">🐋 Very Large Activity Monitor</h3>
        <p className="text-sm text-purple-700">
          Track whale movements, massive order flows, and coordinated attacks. All activities are logged with timestamps.
        </p>
      </div>

      {/* Current Active Activity */}
      {activeVeryLargeActivity && (
        <Card className="border-2 border-purple-400 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Zap className="h-5 w-5 animate-pulse" />
              🚨 ACTIVE VERY LARGE ACTIVITY
            </CardTitle>
            <CardDescription>Live monitoring of current whale activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-white rounded-lg border animate-pulse">
              <div className="text-lg font-bold text-purple-800 mb-2">{activeVeryLargeActivity.description}</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Type:</span> {activeVeryLargeActivity.type.replace('_', ' ').toUpperCase()}</div>
                <div><span className="font-medium">Total Volume:</span> {activeVeryLargeActivity.totalVolume.toFixed(2)}</div>
                <div><span className="font-medium">Order Count:</span> {activeVeryLargeActivity.orderCount}</div>
                <div>
                  <span className="font-medium">Risk Level:</span> 
                  <Badge className={`ml-1 ${activeVeryLargeActivity.riskLevel === 'extreme' ? 'bg-red-600 text-white animate-bounce' : 'bg-orange-600 text-white'}`}>
                    {activeVeryLargeActivity.riskLevel.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2"><Timer className="h-5 w-5" /> Activity History</CardTitle>
              <CardDescription>Recent very large activities • {veryLargeActivities.length} total tracked</CardDescription>
            </div>
            <Button size="sm" onClick={saveActivityLog} disabled={veryLargeActivities.length === 0}>
              💾 Export Log
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {veryLargeActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No very large activities detected yet.</p>
              </div>
            ) : (
              veryLargeActivities.map((activity) => (
                <div key={activity.id} className={`p-4 rounded-lg border ${activity.isActive ? 'bg-gradient-to-r from-purple-100 to-indigo-100 border-purple-400 border-2' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={activity.riskLevel === 'extreme' ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'}>{activity.riskLevel.toUpperCase()}</Badge>
                      <Badge variant="outline">{activity.type.replace('_', ' ').toUpperCase()}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(activity.startTime).toLocaleString()}</div>
                  </div>
                  <div className="text-sm font-medium">{activity.description}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">📝 Activity Log</CardTitle>
          <CardDescription>Detailed log of events • {veryLargeActivityLog.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto space-y-2 p-2 bg-gray-50 rounded border font-mono text-xs">
            {veryLargeActivityLog.length === 0 ? <p className="text-muted-foreground text-center">No log entries yet.</p> : veryLargeActivityLog.map((log, i) => <div key={i}>{log}</div>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
