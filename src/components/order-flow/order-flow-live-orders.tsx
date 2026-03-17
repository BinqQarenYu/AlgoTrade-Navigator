import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { type OrderFlowData, type VeryLargeActivity } from "@/hooks/use-order-flow";

interface OrderFlowLiveOrdersProps {
  orderFlowData: OrderFlowData[];
  activeVeryLargeActivity: VeryLargeActivity | null;
}

export function OrderFlowLiveOrders({
  orderFlowData,
  activeVeryLargeActivity,
}: OrderFlowLiveOrdersProps) {
  return (
    <div className="space-y-4">
      <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <h3 className="font-semibold text-purple-800 mb-2">📊 Live Order Stream</h3>
        <p className="text-sm text-purple-700">
          Watch orders as they happen. Red scores (7-10) indicate suspicious activity. Green scores (0-3) are normal.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Trading Activity
              </CardTitle>
              <CardDescription>
                Live orders with risk analysis • Most recent orders appear first
              </CardDescription>
            </div>
            <div className="flex gap-2 text-xs">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                BUY
              </div>
              <div className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-600" />
                SELL
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orderFlowData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No orders yet. Start monitoring to see live data.</p>
              </div>
            ) : (
              orderFlowData.slice(0, 10).map((order, index) => {
                const isVeryLargeOrder = activeVeryLargeActivity && 
                  (order.size > 25 || 
                   (activeVeryLargeActivity.startTime <= order.timestamp && 
                    order.timestamp <= Date.now() && 
                    Date.now() - activeVeryLargeActivity.startTime < 30000));

                return (
                  <div key={index} className={`relative flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isVeryLargeOrder ? 
                      'bg-gradient-to-r from-purple-100 to-indigo-100 border-purple-400 border-2 animate-pulse shadow-lg' :
                    order.riskScore >= 7 ? 'bg-red-50 border-red-200' :
                    order.riskScore >= 4 ? 'bg-yellow-50 border-yellow-200' :
                    'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center gap-4">
                      <Badge variant={order.orderType === 'buy' ? 'default' : 'secondary'} 
                             className={`${order.orderType === 'buy' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 
                                        'bg-red-100 text-red-800 hover:bg-red-200'} font-mono`}>
                        {order.orderType === 'buy' ? 
                          <><TrendingUp className="h-3 w-3 mr-1" /> BUY</> : 
                          <><TrendingDown className="h-3 w-3 mr-1" /> SELL</>}
                      </Badge>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {order.symbol}
                          <span className="text-sm font-normal text-muted-foreground">
                            {order.size.toFixed(order.size < 1 ? 6 : 3)} @ ${order.price.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.suspiciousFlags.length > 0 ? (
                            <span className="text-amber-600">🚩 {order.suspiciousFlags.join(', ')}</span>
                          ) : (
                            <span className="text-green-600">✅ Normal activity</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold font-mono ${
                        order.riskScore >= 7 ? 'text-red-600' :
                        order.riskScore >= 4 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {order.riskScore.toFixed(0)}/10
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(order.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    {isVeryLargeOrder && (
                      <div className="absolute -top-1 -right-1">
                        <Badge className="bg-purple-600 text-white text-xs animate-bounce">
                          🐋 WHALE
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
