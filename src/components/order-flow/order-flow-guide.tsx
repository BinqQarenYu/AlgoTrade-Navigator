import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle, Shield, Activity } from "lucide-react";

export function OrderFlowGuide() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <HelpCircle className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-blue-800">What is Order Flow Analysis?</h3>
          </div>
          <p className="text-sm text-blue-700">
            This tool watches trading activity to spot when someone might be trying to manipulate the market. 
            It helps protect you from fake trading patterns.
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-full">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-green-800">How It Protects You</h3>
          </div>
          <p className="text-sm text-green-700">
            By identifying suspicious patterns early, you can avoid making trades based on fake signals 
            and protect your investments from manipulation.
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-full">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-purple-800">How to Use</h3>
          </div>
          <p className="text-sm text-purple-700">
            Select a trading pair, start monitoring, and watch for alerts. Red scores (7-10) mean high risk, 
            green scores (0-3) are normal activity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
