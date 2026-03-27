const fs = require('fs');
const content = fs.readFileSync('src/components/order-flow/order-flow-charts.tsx', 'utf-8');
const lines = content.split('\n');

const riskLevelChart = lines.slice(377, 575).join('\n');
const riskLevelFile = `import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceArea } from 'recharts';

interface RiskLevelChartProps {
  chartData: any[];
}

export function RiskLevelChart({ chartData }: RiskLevelChartProps) {
  return (
${riskLevelChart}
  );
}
`;

fs.writeFileSync('src/components/order-flow/charts/risk-level-chart.tsx', riskLevelFile);
console.log('Done!');
