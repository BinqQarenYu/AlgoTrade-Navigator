const fs = require('fs');
const content = fs.readFileSync('src/components/order-flow/order-flow-charts.tsx', 'utf-8');
const lines = content.split('\n');

const orderCountChart = lines.slice(575, 714).join('\n');
const orderCountFile = `import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';

interface OrderCountDistributionProps {
  chartData: any[];
}

export function OrderCountDistribution({ chartData }: OrderCountDistributionProps) {
  return (
${orderCountChart}
  );
}
`;

fs.writeFileSync('src/components/order-flow/charts/order-count-distribution.tsx', orderCountFile);
console.log('Done!');
