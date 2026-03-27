const fs = require('fs');
const content = fs.readFileSync('src/components/order-flow/order-flow-charts.tsx', 'utf-8');
const lines = content.split('\n');

const netFlowChart = lines.slice(714, 871).join('\n');
const netFlowFile = `import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Shield, Target } from "lucide-react";

interface NetOrderFlowProps {
  chartData: any[];
}

export function NetOrderFlow({ chartData }: NetOrderFlowProps) {
  return (
${netFlowChart}
  );
}
`;

fs.writeFileSync('src/components/order-flow/charts/net-order-flow.tsx', netFlowFile);
console.log('Done!');
