const fs = require('fs');
const content = fs.readFileSync('src/components/order-flow/order-flow-charts.tsx', 'utf-8');
const lines = content.split('\n');

const summaryChart = lines.slice(871, 1010).join('\n');
const summaryFile = `import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Shield, Target } from "lucide-react";

interface FlowAnalyticsSummaryProps {
  chartData: any[];
}

export function FlowAnalyticsSummary({ chartData }: FlowAnalyticsSummaryProps) {
  return (
${summaryChart}
  );
}
`;

fs.writeFileSync('src/components/order-flow/charts/flow-analytics-summary.tsx', summaryFile);
console.log('Done!');
