"use client";

import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import type { HistoricalData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface TradingChartProps {
  data: HistoricalData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2 bg-background/80 border rounded-lg shadow-lg">
        <p className="label font-bold">{`Time: ${label}`}</p>
        <p className="text-primary">{`Close: ${data.close?.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`}</p>
        <p className="text-muted-foreground">{`Volume: ${data.volume?.toLocaleString()}`}</p>
        {data.buySignal && <p className="text-green-500 font-bold">Buy Signal</p>}
        {data.sellSignal && <p className="text-red-500 font-bold">Sell Signal</p>}
      </div>
    );
  }
  return null;
};


export function TradingChart({ data }: TradingChartProps) {
  return (
    <Card className="h-full flex flex-col">
        <CardHeader>
            <CardTitle>BTC/USDT Price Chart</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" orientation="left" />
                <YAxis yAxisId="right" stroke="hsl(var(--muted-foreground))" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="right" dataKey="volume" barSize={20} fill="hsl(var(--primary) / 0.2)" name="Volume" />
                <Line yAxisId="left" type="monotone" dataKey="close" strokeWidth={2} stroke="hsl(var(--primary))" name="Price" dot={false} />
                <Scatter yAxisId="left" dataKey="buySignal" fill="hsl(var(--chart-2))" shape="triangle" name="Buy" />
                <Scatter yAxisId="left" dataKey="sellSignal" fill="hsl(var(--destructive))" shape="cross" name="Sell" />
            </ComposedChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
  );
}
