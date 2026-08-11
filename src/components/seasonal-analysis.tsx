"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts"
import { LineChart as LineChartIcon, Table as TableIcon, Triangle, Loader2, Activity } from "lucide-react"
import { useDataManager } from "@/context/data-manager-context"
import type { HistoricalData } from "@/lib/types"

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PALETTE = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#9f1239", 
  "#eab308", "#06b6d4", "#f43f5e", "#60a5fa", "#8b5cf6", "#ef4444"
];

function getDayOfYear(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start;
  return Math.floor(diff / 86400000) - 1;
}

export function SeasonalAnalysis({ symbol }: { symbol?: string }) {
  const { getSeasonalData } = useDataManager();
  const [data, setData] = useState<HistoricalData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [showAverage, setShowAverage] = useState(false);
  const [scaleMode, setScaleMode] = useState<'percent' | 'regular'>('percent');

  useEffect(() => {
    if (!symbol) return;
    
    let isMounted = true;
    const fetch = async () => {
      setIsLoading(true);
      const res = await getSeasonalData(symbol, 7); // Fetch last 7 years
      if (isMounted) {
        setData(res);
        setIsLoading(false);
      }
    };
    fetch();
    return () => { isMounted = false; };
  }, [symbol, getSeasonalData]);

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const yearsMap = new Map<number, HistoricalData[]>();
    data.forEach(d => {
      const date = new Date(d.time);
      const year = date.getFullYear();
      if (!yearsMap.has(year)) yearsMap.set(year, []);
      yearsMap.get(year)!.push(d);
    });

    const YEARS = Array.from(yearsMap.keys()).sort((a, b) => b - a);
    
    const YEAR_COLORS: Record<number, string> = {};
    YEARS.forEach((year, i) => {
        YEAR_COLORS[year] = PALETTE[i % PALETTE.length];
    });

    // 1. Process Table Data
    const tableData = YEARS.map(year => {
      const yearDays = yearsMap.get(year)!;
      const monthlyReturns: (number | null)[] = Array(12).fill(null);
      
      for (let m = 0; m < 12; m++) {
        const monthDays = yearDays.filter(d => new Date(d.time).getMonth() === m);
        if (monthDays.length > 0) {
          monthDays.sort((a, b) => a.time - b.time);
          const firstOpen = monthDays[0].open;
          const lastClose = monthDays[monthDays.length - 1].close;
          monthlyReturns[m] = (lastClose - firstOpen) / firstOpen * 100; // Percentage
        }
      }
      
      yearDays.sort((a, b) => a.time - b.time);
      const yearFirstOpen = yearDays[0].open;
      const yearLastClose = yearDays[yearDays.length - 1].close;
      const yearReturn = (yearLastClose - yearFirstOpen) / yearFirstOpen * 100;
      
      return { year, returns: monthlyReturns, yearReturn };
    });

    const risesAndFalls = MONTHS.map((_, monthIdx) => {
      let rises = 0;
      let falls = 0;
      YEARS.forEach(year => {
        const row = tableData.find(d => d.year === year);
        if (row && row.returns[monthIdx] !== null) {
          if (row.returns[monthIdx]! > 0) rises++;
          else if (row.returns[monthIdx]! < 0) falls++;
        }
      });
      return { rises, falls };
    });
    const totalRises = risesAndFalls.reduce((acc, val) => acc + val.rises, 0);
    const totalFalls = risesAndFalls.reduce((acc, val) => acc + val.falls, 0);

    // 2. Process Chart Data
    const chartDataList: any[] = [];
    for (let i = 0; i < 366; i++) {
        let name = '';
        if (i === 0) name = 'Jan';
        else if (i === 31) name = 'Feb';
        else if (i === 59) name = 'Mar';
        else if (i === 90) name = 'Apr';
        else if (i === 120) name = 'May';
        else if (i === 151) name = 'Jun';
        else if (i === 181) name = 'Jul';
        else if (i === 212) name = 'Aug';
        else if (i === 243) name = 'Sep';
        else if (i === 273) name = 'Oct';
        else if (i === 304) name = 'Nov';
        else if (i === 334) name = 'Dec';
        
        chartDataList.push({ name, index: i });
    }

    const finalValues: Record<number | string, number> = {};
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentDayOfYear = getDayOfYear(today);

    YEARS.forEach(year => {
      const yearDays = yearsMap.get(year)!;
      if (yearDays.length === 0) return;
      
      yearDays.sort((a, b) => a.time - b.time);
      const firstOpen = yearDays[0].open;
      
      yearDays.forEach((d) => {
        const date = new Date(d.time);
        let dayOfYear = getDayOfYear(date);
        
        if (dayOfYear >= 366) dayOfYear = 365;
        if (dayOfYear < 0) dayOfYear = 0;
        
        if (scaleMode === 'percent') {
          chartDataList[dayOfYear][year] = ((d.close - firstOpen) / firstOpen) * 100;
        } else {
          chartDataList[dayOfYear][year] = d.close;
        }
      });
      
      let lastVal = 0;
      let hasStarted = false;
      for (let i = 0; i < 366; i++) {
         if (chartDataList[i][year] !== undefined) {
             lastVal = chartDataList[i][year];
             hasStarted = true;
         } else if (hasStarted) {
             if (year === currentYear && i > currentDayOfYear) {
                break;
             }
             chartDataList[i][year] = lastVal;
         }
      }
      
      finalValues[year] = lastVal;
    });

    for (let i = 0; i < 366; i++) {
        let sum = 0;
        let count = 0;
        YEARS.forEach(year => {
            if (chartDataList[i][year] !== undefined) {
                sum += chartDataList[i][year];
                count++;
            }
        });
        if (count > 0) {
            chartDataList[i]['Average'] = sum / count;
        }
    }
    finalValues['Average'] = chartDataList.slice().reverse().find(d => d['Average'] !== undefined)?.['Average'] ?? 0;

    const keys = showAverage ? [...YEARS, 'Average'] : YEARS;
    const globalMax = Math.max(...chartDataList.map(d => Math.max(...keys.map(k => d[k as keyof typeof d] ?? -Infinity))));
    const globalMin = Math.min(...chartDataList.map(d => Math.min(...keys.map(k => d[k as keyof typeof d] ?? Infinity))));

    return { YEARS, YEAR_COLORS, tableData, risesAndFalls, totalRises, totalFalls, chartDataList, finalValues, globalMax, globalMin };
  }, [data, scaleMode, showAverage]);

  const RADIAN = Math.PI / 180;
  const gaugeData = [
    { name: 'Strong sell', value: 20, color: '#ef4444' },
    { name: 'Sell', value: 20, color: '#f87171' },
    { name: 'Neutral', value: 20, color: '#e5e7eb' },
    { name: 'Buy', value: 20, color: '#86efac' },
    { name: 'Strong buy', value: 20, color: '#22c55e' },
  ];
  const cx = 150;
  const cy = 130;
  const iR = 90;
  const oR = 100;

  const needle = (value: number, data: any[], cx: number, cy: number, iR: number, oR: number, color: string) => {
    let total = 0;
    data.forEach((v) => {
      total += v.value;
    });
    const ang = 180.0 * (1 - value / total);
    const length = (iR + 2 * oR) / 3;
    const sin = Math.sin(-RADIAN * ang);
    const cos = Math.cos(-RADIAN * ang);
    const r = 4;
    const x0 = cx;
    const y0 = cy;
    const xba = x0 + r * sin;
    const yba = y0 - r * cos;
    const xbb = x0 - r * sin;
    const ybb = y0 + r * cos;
    const xp = x0 + length * cos;
    const yp = y0 + length * sin;

    return (
      <g>
        <circle cx={x0} cy={y0} r={r} fill={color} stroke="none" />
        <path d={`M${xba} ${yba}L${xbb} ${ybb} L${xp} ${yp} L${xba} ${yba}`} stroke="none" fill={color} />
      </g>
    );
  };

  const Gauge = ({ value, label }: { value: number, label: string }) => {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="relative w-[300px] h-[150px]">
          <span className="absolute left-0 bottom-6 text-xs text-muted-foreground">Strong sell</span>
          <span className="absolute left-10 top-6 text-xs text-muted-foreground">Sell</span>
          <span className="absolute left-1/2 -translate-x-1/2 top-0 text-xs text-muted-foreground">Neutral</span>
          <span className="absolute right-10 top-6 text-xs text-muted-foreground">Buy</span>
          <span className="absolute right-0 bottom-6 text-xs text-muted-foreground">Strong buy</span>
          
          <PieChart width={300} height={150}>
            <Pie
              dataKey="value"
              startAngle={180}
              endAngle={0}
              data={gaugeData}
              cx={cx}
              cy={cy}
              innerRadius={iR}
              outerRadius={oR}
              fill="#8884d8"
              stroke="none"
            >
              {gaugeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            {needle(value, gaugeData, cx, cy, iR, oR, 'currentColor')}
          </PieChart>
        </div>
        <div className="text-xl font-bold -mt-2">{label}</div>
      </div>
    );
  };

  const ViewToggle = () => (
    <div className="flex items-center space-x-1 p-1 bg-muted/50 rounded-md w-fit border border-border/50">
      <button 
        onClick={() => setView('chart')}
        className={`p-1.5 rounded-md flex items-center justify-center transition-all duration-200 ${view === 'chart' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <LineChartIcon className="w-4 h-4" />
      </button>
      <button 
        onClick={() => setView('table')}
        className={`p-1.5 rounded-md flex items-center justify-center transition-all duration-200 ${view === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <TableIcon className="w-4 h-4" />
      </button>
    </div>
  );

  const ChartView = () => {
    if (!processedData) return null;
    const { YEARS, YEAR_COLORS, chartDataList, finalValues, globalMax, globalMin } = processedData;

    return (
      <div className="w-full relative">
        <div className="relative h-1.5 bg-foreground/10 rounded-full mx-4 mb-8 mt-2 flex items-center shadow-inner">
          <div className="absolute w-4 h-4 bg-background border-2 border-foreground rounded-full left-0 -translate-x-1/2 cursor-pointer shadow-sm"></div>
          <div className="absolute w-4 h-4 bg-background border-2 border-foreground rounded-full right-0 translate-x-1/2 cursor-pointer shadow-sm"></div>
          <div className="w-full flex justify-between absolute -top-6 px-1 text-xs text-muted-foreground font-medium">
            {YEARS.slice().reverse().filter((_, i) => i % 2 === 0).map(y => (
              <span key={y}>{y}</span>
            ))}
          </div>
        </div>

        <div className="relative h-[400px] w-full flex pl-2">
          <div className="flex-1 min-w-0 pb-[5px] pt-[20px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartDataList}
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="hsl(var(--muted))" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval={30} // Roughly every month since we have 366 points
                  tickMargin={10}
                />
                <YAxis hide domain={[globalMin, globalMax]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  labelFormatter={() => ''}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(2)}${scaleMode === 'percent' ? '%' : ''}`, 
                    name === 'Average' ? 'Average' : name
                  ]}
                />
                {YEARS.map(year => (
                  <Line 
                    key={year}
                    type="monotone" 
                    dataKey={year} 
                    stroke={YEAR_COLORS[year]} 
                    strokeWidth={1.5} 
                    dot={false} 
                    activeDot={{ r: 4 }} 
                    isAnimationActive={false}
                  />
                ))}
                {showAverage && (
                  <Line 
                    key="Average"
                    type="monotone" 
                    dataKey="Average" 
                    stroke="var(--foreground)" 
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={false} 
                    activeDot={{ r: 4 }} 
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
            
            <div className="absolute right-0 top-[20px] bottom-[5px] w-12 pointer-events-none">
               {[...YEARS, ...(showAverage ? ['Average'] : [])].map(year => {
                  if (finalValues[year] === undefined) return null;
                  const isAvg = year === 'Average';
                  const percent = ((finalValues[year] - globalMin) / (globalMax - globalMin)) * 100;
                  const color = isAvg ? 'hsl(var(--foreground))' : YEAR_COLORS[year as number];
                  return (
                    <div 
                      key={year} 
                      className={`absolute right-0 flex items-center text-[10px] font-mono whitespace-nowrap translate-x-full transition-all ${isAvg ? 'z-10' : 'z-0'}`}
                      style={{ bottom: `${percent}%`, transform: 'translate(100%, 50%)' }}
                    >
                      <div className="px-1 py-[1px] text-white rounded-sm mr-1.5 text-center shadow-sm" style={{ backgroundColor: isAvg ? 'hsl(var(--foreground))' : color, color: isAvg ? 'hsl(var(--background))' : 'white' }}>
                        {year === 'Average' ? 'AVG' : year}
                      </div>
                      <span className="font-semibold shadow-sm px-1 rounded-sm bg-background/50 backdrop-blur-sm" style={{ color: color }}>
                        {finalValues[year].toFixed(1)}{scaleMode === 'percent' ? '%' : ''}
                      </span>
                    </div>
                  )
               })}
            </div>
          </div>
          <div className="w-16 shrink-0"></div>
        </div>
      </div>
    )
  }

  const formatCell = (val: number | null) => {
    if (val === null) return '-';
    return val.toFixed(2) + '%';
  };
  
  const getCellColor = (val: number | null) => {
    if (val === null) return '';
    if (val > 0) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
    if (val < 0) return 'bg-rose-500/20 text-rose-700 dark:text-rose-400';
    return 'bg-muted/50';
  }

  const TableView = () => {
    if (!processedData) return null;
    const { tableData, risesAndFalls, totalRises, totalFalls } = processedData;
    return (
      <div className="w-full overflow-x-auto pb-4">
        <table className="w-full text-xs text-center border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-border/60">
              <th className="p-2.5 font-medium text-muted-foreground text-left sticky left-0 bg-background z-10 w-20">Year</th>
              {MONTHS.map(m => (
                <th key={m} className="p-2.5 font-medium text-muted-foreground">{m}</th>
              ))}
              <th className="p-2.5 font-medium text-muted-foreground border-l border-border/60">Total</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row: any) => (
              <tr key={row.year} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                <td className="p-2.5 text-left font-medium sticky left-0 bg-background z-10 w-20 shadow-[1px_0_0_0_hsl(var(--border))]">
                  {row.year}
                </td>
                {row.returns.map((val: number | null, i: number) => (
                  <td key={i} className={`p-2.5 border-[0.5px] border-background ${getCellColor(val)}`}>
                    {formatCell(val)}
                  </td>
                ))}
                <td className={`p-2.5 font-bold border-l border-border/60 ${getCellColor(row.yearReturn)}`}>
                  {formatCell(row.yearReturn)}
                </td>
              </tr>
            ))}
            <tr className="font-medium text-[10px] bg-muted/20">
              <td className="p-2.5 text-left text-muted-foreground sticky left-0 bg-background z-10 w-20 shadow-[1px_0_0_0_hsl(var(--border))]">
                Rises / Falls
              </td>
              {risesAndFalls.map((rf: any, i: number) => (
                <td key={i} className="p-2.5">
                  <div className="flex items-center justify-center gap-2">
                    <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold">
                      <Triangle className="w-2.5 h-2.5 fill-current mr-0.5" /> {rf.rises}
                    </span>
                    <span className="flex items-center text-rose-600 dark:text-rose-400 font-bold">
                      <Triangle className="w-2.5 h-2.5 fill-current rotate-180 mr-0.5" /> {rf.falls}
                    </span>
                  </div>
                </td>
              ))}
              <td className="p-2.5 border-l border-border/60">
                <div className="flex items-center justify-center gap-2">
                  <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold">
                    <Triangle className="w-2.5 h-2.5 fill-current mr-0.5" /> {totalRises}
                  </span>
                  <span className="flex items-center text-rose-600 dark:text-rose-400 font-bold">
                    <Triangle className="w-2.5 h-2.5 fill-current rotate-180 mr-0.5" /> {totalFalls}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-transparent border-none shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <ViewToggle />
            
            <div className="flex flex-wrap items-center gap-2">
              {view === 'chart' && (
                <>
                  <Button 
                    variant={showAverage ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setShowAverage(!showAverage)}
                    className="h-8 text-xs font-medium"
                  >
                    <Activity className="w-3.5 h-3.5 mr-1.5" />
                    Average
                  </Button>
                  <select 
                    className="h-8 text-xs rounded-md border border-input bg-background px-2.5 py-1 font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={scaleMode}
                    onChange={(e) => setScaleMode(e.target.value as 'percent' | 'regular')}
                  >
                    <option value="percent">Percent</option>
                    <option value="regular">Regular</option>
                  </select>
                </>
              )}
              {isLoading && (
                <div className="flex items-center text-sm text-muted-foreground gap-2 ml-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Fetching data...</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 min-h-[400px]">
            {isLoading && !processedData ? (
              <div className="w-full h-[400px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !processedData ? (
              <div className="w-full h-[400px] flex items-center justify-center text-muted-foreground">
                No seasonal data available for {symbol}.
              </div>
            ) : (
              view === 'chart' ? <ChartView /> : <TableView />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border/50">
        <div>
          <h3 className="font-semibold mb-4 text-sm">Technicals</h3>
          <Gauge value={25} label="Sell" />
        </div>
        <div>
          <h3 className="font-semibold mb-4 text-sm">Analyst rating</h3>
          <Gauge value={75} label="Buy" />
        </div>
      </div>
    </div>
  )
}
