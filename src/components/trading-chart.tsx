"use client";

import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import type { HistoricalData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { format } from 'date-fns';

interface TradingChartProps {
  data: HistoricalData[];
}

const formatXAxis = (tickItem: number) => {
    // Show date if it's the first tick or midnight, otherwise show time
    const date = new Date(tickItem);
    if (date.getHours() === 0 && date.getMinutes() === 0) {
        return format(date, 'MMM dd');
    }
    return format(date, 'HH:mm');
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const timeLabel = format(new Date(label), "PPpp");
    return (
      <div className="p-2 bg-background/80 border rounded-lg shadow-lg text-sm">
        <p className="label font-bold">{timeLabel}</p>
        <p className="text-primary">{`Close: ${data.close?.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`}</p>
        <p className="text-muted-foreground">{`Volume: ${data.volume?.toLocaleString()}`}</p>
        
        {data.sma_short != null && <p style={{color: "hsl(var(--chart-4))"}}>{`SMA Short: ${data.sma_short?.toFixed(2)}`}</p>}
        {data.sma_long != null && <p style={{color: "hsl(var(--chart-5))"}}>{`SMA Long: ${data.sma_long?.toFixed(2)}`}</p>}

        {data.ema_short != null && <p style={{color: "hsl(var(--chart-4))"}}>{`EMA Short: ${data.ema_short?.toFixed(2)}`}</p>}
        {data.ema_long != null && <p style={{color: "hsl(var(--chart-5))"}}>{`EMA Long: ${data.ema_long?.toFixed(2)}`}</p>}

        {data.rsi != null && <p style={{color: "hsl(var(--chart-2))"}}>{`RSI: ${data.rsi?.toFixed(2)}`}</p>}

        {data.buySignal && <p className="text-green-500 font-bold mt-2">Buy Signal at ${data.buySignal.toFixed(2)}</p>}
        {data.sellSignal && <p className="text-red-500 font-bold mt-2">Sell Signal at ${data.sellSignal.toFixed(2)}</p>}
      </div>
    );
  }
  return null;
};


export function TradingChart({ data }: TradingChartProps) {
  const showSma = data.length > 0 && data.some(p => p.sma_short != null);
  const showEma = data.length > 0 && data.some(p => p.ema_short != null);
  const showRsi = data.length > 0 && data.some(p => p.rsi != null);
  
  return (
    <Card className="h-full flex flex-col">
        <CardHeader>
            <CardTitle>BTC/USDT Price Chart</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={data} 
              margin={{ top: 5, right: showRsi ? 40 : 20, left: -10, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))" 
                  tickFormatter={formatXAxis}
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                 />
                <YAxis 
                    yAxisId="left" 
                    stroke="hsl(var(--muted-foreground))" 
                    orientation="left" 
                    domain={['dataMin - 100', 'dataMax + 100']} 
                    allowDataOverflow 
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <YAxis yAxisId="right" stroke="hsl(var(--muted-foreground))" orientation="right" />
                {showRsi && <YAxis yAxisId="rsi" stroke="hsl(var(--muted-foreground))" orientation="right" domain={[0, 100]} tick={{ dx: 5 }} />}

                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="right" dataKey="volume" barSize={20} fill="hsl(var(--primary) / 0.2)" name="Volume" />
                <Line yAxisId="left" type="monotone" dataKey="close" strokeWidth={2} stroke="hsl(var(--primary))" name="Price" dot={false} />

                {/* SMA Lines */}
                {showSma && <Line yAxisId="left" type="monotone" dataKey="sma_short" stroke="hsl(var(--chart-4))" strokeWidth={1.5} name="SMA Short" dot={false} />}
                {showSma && <Line yAxisId="left" type="monotone" dataKey="sma_long" stroke="hsl(var(--chart-5))" strokeWidth={1.5} name="SMA Long" dot={false} />}

                {/* EMA Lines */}
                {showEma && <Line yAxisId="left" type="monotone" dataKey="ema_short" stroke="hsl(var(--chart-4))" strokeWidth={1.5} name="EMA Short" dot={false} />}
                {showEma && <Line yAxisId="left" type="monotone" dataKey="ema_long" stroke="hsl(var(--chart-5))" strokeWidth={1.5} name="EMA Long" dot={false} />}

                {/* RSI Line */}
                {showRsi && <Line yAxisId="rsi" type="monotone" dataKey="rsi" stroke="hsl(var(--chart-2))" strokeWidth={1.5} name="RSI" dot={false} />}
                
                <Scatter yAxisId="left" dataKey="buySignal" fill="hsl(var(--chart-2))" shape="triangle" name="Buy" />
                <Scatter yAxisId="left" dataKey="sellSignal" fill="hsl(var(--destructive))" shape="cross" name="Sell" />
            </ComposedChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
  );
}
