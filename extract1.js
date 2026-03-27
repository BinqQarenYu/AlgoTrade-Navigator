const fs = require('fs');
const content = fs.readFileSync('src/components/order-flow/order-flow-charts.tsx', 'utf-8');
const lines = content.split('\n');

const buySellFlowChart = lines.slice(101, 377).join('\n');
const buySellFlowFile = `import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { TrendingUp } from "lucide-react";

interface BuySellFlowChartProps {
  chartData: any[];
  isMonitoring: boolean;
}

export function BuySellFlowChart({ chartData, isMonitoring }: BuySellFlowChartProps) {
  return (
${buySellFlowChart}
  );
}
`;

fs.writeFileSync('src/components/order-flow/charts/buy-sell-flow-chart.tsx', buySellFlowFile);
console.log('Done!');
