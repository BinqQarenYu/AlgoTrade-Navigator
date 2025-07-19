

"use client";

import React, { useEffect, useRef, useMemo, useState } from 'react';
import { createChart, ColorType, LineStyle, PriceScaleMode } from 'lightweight-charts';
import type { HistoricalData, TradeSignal, BacktestResult, LiquidityEvent, LiquidityTarget, SpoofedWall, Wall, GridTrade, MatchedGridTrade, PhysicsChartConfig, QuantumFieldData } from '@/lib/types';
import type { DetectManipulationOutput } from '@/ai/flows/detect-manipulation-flow';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { parseSymbolString } from '@/lib/assets';
import { Camera, AlertTriangle, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { formatPrice, formatLargeNumber, intervalToMs } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

// Lightweight Charts expects time as a UTC timestamp in seconds.
const toTimestamp = (time: number) => time / 1000;

const intervals = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', 'label': '1D' },
];

const seriesConfig: Record<string, { color: string, lineWidth?: number, lineStyle?: LineStyle }> = {
    sma_short: { color: '#f59e0b' },
    sma_long: { color: '#8b5cf6' },
    ema_short: { color: '#f59e0b' },
    ema_medium: { color: '#fb923c' },
    ema_long: { color: '#8b5cf6' },
    bb_upper: { color: '#4ade80', lineStyle: LineStyle.Dotted },
    bb_middle: { color: 'rgba(148, 163, 184, 0.4)', lineStyle: LineStyle.Dotted },
    bb_lower: { color: '#f87171', lineStyle: LineStyle.Dotted },
    donchian_upper: { color: '#4ade80', lineStyle: LineStyle.Dotted },
    donchian_middle: { color: 'rgba(148, 163, 184, 0.4)', lineStyle: LineStyle.Dotted },
    donchian_lower: { color: '#f87171', lineStyle: LineStyle.Dotted },
    tenkan_sen: { color: '#38bdf8' },
    kijun_sen: { color: '#f472b6' },
    senkou_a: { color: 'rgba(38, 166, 154, 0.2)' },
    senkou_b: { color: 'rgba(239, 83, 80, 0.2)' },
    supertrend: { color: '#a78bfa', lineStyle: LineStyle.Dotted },
    poc: { color: '#eab308', lineWidth: 1, lineStyle: LineStyle.Dotted },
    vwap: { color: '#60a5fa' },
    psar: { color: '#a78bfa', lineStyle: LineStyle.Dotted },
};

export function TradingChart({ 
  data = [], 
  projectedData = [],
  symbol, 
  interval, 
  tradeSignal = null,
  highlightedTrade = null,
  onIntervalChange,
  wallLevels = [],
  spoofedWalls = [],
  liquidityEvents = [],
  liquidityTargets = [],
  gridLevels = [],
  gridTrades = [],
  matchedGridTrades = [],
  unmatchedGridTrades = [],
  lineWidth = 2,
  consensusResult = null,
  showAnalysis = true,
  chartType = 'candlestick',
  scaleMode = 'linear',
  manipulationResult = null,
  showManipulationOverlay = true,
  physicsConfig,
  quantumFieldData = [],
}: { 
  data: HistoricalData[];
  projectedData?: HistoricalData[];
  symbol: string; 
  interval: string; 
  tradeSignal?: TradeSignal | null;
  highlightedTrade?: BacktestResult | MatchedGridTrade | null;
  onIntervalChange?: (newInterval: string) => void;
  wallLevels?: Wall[];
  spoofedWalls?: SpoofedWall[];
  liquidityEvents?: LiquidityEvent[];
  liquidityTargets?: LiquidityTarget[];
  gridLevels?: number[];
  gridTrades?: GridTrade[];
  matchedGridTrades?: MatchedGridTrade[];
  unmatchedGridTrades?: GridTrade[];
  lineWidth?: number;
  consensusResult?: { price: number; direction: 'UP' | 'DOWN' } | null;
  showAnalysis?: boolean;
  chartType?: 'candlestick' | 'line';
  scaleMode?: 'linear' | 'logarithmic';
  manipulationResult?: DetectManipulationOutput | null;
  showManipulationOverlay?: boolean;
  physicsConfig?: PhysicsChartConfig;
  quantumFieldData?: QuantumFieldData[];
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [spoofZone, setSpoofZone] = useState<{ top: number, bottom: number, startTime: number } | null>(null);
  const spoofZoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRenderedDataRef = useRef<HistoricalData[]>([]);

  const combinedData = useMemo(() => {
    return [...data, ...(projectedData || [])];
  }, [data, projectedData]);
  
  const lastCandle = combinedData.length > 0 ? combinedData[combinedData.length - 1] : null;
  const previousCandle = combinedData.length > 1 ? combinedData[combinedData.length - 2] : null;

  const priceChange = lastCandle && previousCandle ? lastCandle.close - previousCandle.close : 0;
  const priceChangePercent = previousCandle && previousCandle.close !== 0 ? (priceChange / previousCandle.close) * 100 : 0;
  const priceColor = priceChange >= 0 ? 'text-green-500' : 'text-red-500';

  const getChangePrecision = (price: number | null) => {
    if (price === null) return 2;
    if (price > 1000) return 2;
    if (price > 1) return 4;
    return 6;
  };
  const changePrecision = getChangePrecision(lastCandle?.close ?? null);

  useEffect(() => {
    const chartContainer = chartContainerRef.current;
    if (!chartContainer || chartRef.current) return;

    const handleResize = () => {
      if (chartContainer && chartRef.current?.chart) {
        chartRef.current.chart.applyOptions({ 
          width: chartContainer.clientWidth,
          height: chartContainer.clientHeight
        });
      }
    };
    
    const isDarkMode = document.documentElement.classList.contains('dark');
    const chartColors = {
        background: isDarkMode ? '#222222' : '#FFFFFF',
        textColor: isDarkMode ? '#D1D5DB' : '#1F2937',
        gridColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#E5E7EB',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        barUpColor: '#26a69a',
        barDownColor: '#ef5350',
        volumeUpColor: 'rgba(38, 166, 154, 0.4)',
        volumeDownColor: 'rgba(239, 83, 80, 0.4)',
    };
    
    const chart = createChart(chartContainer, {
      layout: { background: { type: ColorType.Solid, color: chartColors.background }, textColor: chartColors.textColor, fontSize: 10 },
      grid: { vertLines: { color: chartColors.gridColor }, horzLines: { color: chartColors.gridColor } },
      width: chartContainer.clientWidth,
      height: chartContainer.clientHeight,
      timeScale: { borderColor: chartColors.gridColor, timeVisible: true, rightOffset: 20 },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: true, borderColor: chartColors.gridColor },
      crosshair: { mode: 1 },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    const volumeSeries = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '', lastValueVisible: false, priceLineVisible: false });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: chartColors.barUpColor, downColor: chartColors.barDownColor,
      wickUpColor: chartColors.wickUpColor, wickDownColor: chartColors.wickDownColor,
      borderVisible: false, priceScaleId: 'left',
    });
    
    const lineSeriesContainer: Record<string, any> = {};
    Object.keys(seriesConfig).forEach(key => {
        lineSeriesContainer[key] = chart.addLineSeries({
            lineWidth: seriesConfig[key].lineWidth || 2,
            lineStyle: seriesConfig[key].lineStyle || LineStyle.Solid,
            color: seriesConfig[key].color,
            priceScaleId: 'left',
            lastValueVisible: false,
            priceLineVisible: false,
        });
    });

    chartRef.current = { chart, candlestickSeries, volumeSeries, chartColors, lineSeriesContainer, priceLines: [], tradePriceLines: [] };
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainer);
    
    return () => {
      resizeObserver.unobserve(chartContainer);
      if (spoofZoneTimeoutRef.current) clearTimeout(spoofZoneTimeoutRef.current);
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Effect for handling data updates efficiently
  useEffect(() => {
    if (!chartRef.current?.chart || !combinedData) return;

    const { candlestickSeries, volumeSeries, chartColors, lineSeriesContainer } = chartRef.current;
    
    const sortedData = [...combinedData].sort((a, b) => a.time - b.time);
    const uniqueData = sortedData.filter((candle, index, self) => index === 0 || candle.time > self[index - 1].time);
    if (uniqueData.length === 0) return;

    const historicalCandles = uniqueData.filter(d => !d.isProjected);
    const projectedCandles = uniqueData.filter(d => d.isProjected);

    const isUpdate = uniqueData.length > 0 && lastRenderedDataRef.current.length > 0 && uniqueData[uniqueData.length - 2]?.time === lastRenderedDataRef.current[lastRenderedDataRef.current.length - 2]?.time;
    
    const candlestickChartData = uniqueData.map(d => ({ 
        time: toTimestamp(d.time), 
        open: d.ha_open ?? d.open, 
        high: d.ha_high ?? d.high, 
        low: d.ha_low ?? d.low, 
        close: d.ha_close ?? d.close, 
        color: d.isProjected ? 'rgba(139, 92, 246, 0.5)' : undefined,
        borderColor: d.isProjected ? 'rgba(139, 92, 246, 1)' : undefined,
        wickColor: d.isProjected ? 'rgba(139, 92, 246, 1)' : undefined,
    }));
    const volumeChartData = uniqueData.map(d => {
        let isUp = d.close >= d.open;
        if (d.ha_close !== undefined && d.ha_open !== undefined) {
            isUp = d.ha_close >= d.ha_open;
        }
        return { 
            time: toTimestamp(d.time), 
            value: d.volume, 
            color: d.isProjected ? 'rgba(107, 114, 128, 0.4)' : (isUp ? chartColors.volumeUpColor : chartColors.volumeDownColor) 
        };
    });
    
    candlestickSeries.setData(candlestickChartData);
    volumeSeries.setData(volumeChartData);

    // Dynamically update line series based on available data keys
    Object.keys(lineSeriesContainer).forEach(key => {
        if (showAnalysis && uniqueData.some(d => d[key as keyof HistoricalData] != null)) {
            const lineData = uniqueData
                .filter(d => d[key as keyof HistoricalData] != null)
                .map(d => ({ time: toTimestamp(d.time), value: d[key as keyof HistoricalData] as number }));
            lineSeriesContainer[key].setData(lineData);
        } else {
            lineSeriesContainer[key].setData([]);
        }
    });
    
    const signalMarkers = showAnalysis ? uniqueData.map(d => {
        if (d.buySignal) return { time: toTimestamp(d.time), position: 'belowBar', color: chartColors.barUpColor, shape: 'arrowUp', text: 'Buy' };
        if (d.sellSignal) return { time: toTimestamp(d.time), position: 'aboveBar', color: chartColors.barDownColor, shape: 'arrowDown', text: 'Sell' };
        return null;
    }).filter(Boolean) : [];
    
    candlestickSeries.setMarkers(signalMarkers);

    if (!isUpdate) {
      chartRef.current.chart.timeScale().fitContent();
    }
    
    lastRenderedDataRef.current = uniqueData;

  }, [combinedData, showAnalysis]);

  // Effect to draw signal lines
  useEffect(() => {
    if (!chartRef.current?.chart) return;
    const { candlestickSeries, priceLines = [] } = chartRef.current;

    priceLines.forEach((line: any) => candlestickSeries.removePriceLine(line));
    chartRef.current.priceLines = [];
    
    if (tradeSignal) {
        const createLine = (price: number, color: string, title: string) => candlestickSeries.createPriceLine({ price, color, lineWidth: 2, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title });
        const newLines = [
            createLine(tradeSignal.entryPrice, '#3b82f6', 'Entry'),
            createLine(tradeSignal.takeProfit, '#22c55e', 'TP'),
            createLine(tradeSignal.stopLoss, '#ef4444', 'SL'),
        ];
        if (tradeSignal.peakPrice) newLines.push(createLine(tradeSignal.peakPrice, '#a8a29e', 'Liq Level'));
        chartRef.current.priceLines = newLines;
    }
  }, [tradeSignal]);
    
  // Effect to draw wall lines from Order Book
  useEffect(() => {
    if (!chartRef.current?.chart) return;
    const { candlestickSeries, wallPriceLines = [] } = chartRef.current;

    wallPriceLines.forEach((line: any) => candlestickSeries.removePriceLine(line));
    
    const newLines: any[] = [];
    if (showAnalysis && wallLevels?.length > 0) {
        wallLevels.forEach(wall => {
            const isBid = wall.type === 'bid';
            newLines.push(candlestickSeries.createPriceLine({
                price: wall.price,
                color: isBid ? '#60a5fa' : '#c084fc',
                lineWidth: 2,
                lineStyle: LineStyle.Dotted,
                axisLabelVisible: true,
                title: isBid ? ' BID WALL' : ' ASK WALL',
            }));
        });
    }
    chartRef.current.wallPriceLines = newLines;
  }, [wallLevels, showAnalysis]);

  // Effect to highlight a selected trade from the backtest results
  useEffect(() => {
      if (!chartRef.current?.chart || !combinedData) return;
      const { candlestickSeries, tradePriceLines = [] } = chartRef.current;

      tradePriceLines.forEach((line: any) => line.series ? chartRef.current.chart.removeSeries(line) : candlestickSeries.removePriceLine(line));
      chartRef.current.tradePriceLines = [];

      if (highlightedTrade) {
          const isMatchedGridTrade = 'buy' in highlightedTrade && 'sell' in highlightedTrade;
          
          let entryTime, exitTime, entryPrice, exitPrice, type;
          if (isMatchedGridTrade) {
              const trade = highlightedTrade as MatchedGridTrade;
              entryTime = trade.buy.time;
              exitTime = trade.sell.time;
              entryPrice = trade.buy.price;
              exitPrice = trade.sell.price;
              type = 'long'; // Grid trades are effectively long
          } else {
              const trade = highlightedTrade as BacktestResult;
              entryTime = trade.entryTime;
              exitTime = trade.exitTime;
              entryPrice = trade.entryPrice;
              exitPrice = trade.exitPrice;
              type = trade.type;
          }
          
          // Safeguard against invalid time values
          if (typeof entryTime !== 'number' || typeof exitTime !== 'number') {
            console.warn("Skipping trade highlight due to invalid time values", highlightedTrade);
            return;
          }

          const fromTime = toTimestamp(entryTime);
          const toTime = toTimestamp(exitTime);

          const newLines = [
              candlestickSeries.createPriceLine({ price: entryPrice, color: '#3b82f6', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Entry' }),
              candlestickSeries.createPriceLine({ price: exitPrice, color: type === 'long' ? '#16a34a' : '#dc2626', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Exit' })
          ];
          
          chartRef.current.tradePriceLines = newLines;

          chartRef.current.chart.timeScale().setVisibleRange({ from: fromTime - intervalToMs(interval)/1000 * 10, to: toTime + intervalToMs(interval)/1000 * 10 });
          
          const highlightColor = type === 'long' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)';
          
          const highlightSeries = chartRef.current.chart.addLineSeries({
              priceScaleId: 'left',
              color: highlightColor,
              lineWidth: 100, 
              lastValueVisible: false,
              priceLineVisible: false,
              crosshairMarkerVisible: false,
          });
          
          highlightSeries.setData([
              { time: fromTime, value: (entryPrice + exitPrice) / 2 },
              { time: toTime, value: (entryPrice + exitPrice) / 2 },
          ]);
          
          chartRef.current.tradePriceLines.push(highlightSeries);
      }
  }, [highlightedTrade, combinedData, interval]);

  const formattedSymbol = useMemo(() => {
    if (!symbol) return 'No Asset Selected';
    const parsed = parseSymbolString(symbol);
    return parsed ? `${parsed.base}/${parsed.quote}` : symbol;
  }, [symbol]);

  const handleTakeSnapshot = () => {
    if (!chartRef.current?.chart) return;
    const canvas = chartRef.current.chart.takeScreenshot();
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `chart-snapshot-${symbol}-${interval}.png`;
    link.click();
  };

  const chartTitle = `${formattedSymbol} (${String(interval || '').toLocaleUpperCase()})`;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
            <CardTitle className="text-sm font-medium">{chartTitle}</CardTitle>
            {lastCandle ? (
                <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-xl font-bold ${priceColor}`}>
                        {formatPrice(lastCandle.close)}
                    </span>
                    <span className={`text-xs font-medium ${priceColor}`}>
                        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(changePrecision)} ({priceChangePercent.toFixed(2)}%)
                    </span>
                </div>
            ) : (
                <div className="mt-1">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-24 mt-2" />
                </div>
            )}
        </div>
        <div className="flex items-center gap-2">
            {onIntervalChange && (
              <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                {intervals.map((item) => (
                  <Button
                    key={item.value}
                    variant={interval === item.value ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onIntervalChange(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            )}
             <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleTakeSnapshot}
                title="Take Snapshot"
              >
                <Camera className="h-4 w-4" />
              </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <div ref={chartContainerRef} className="w-full h-full" />
      </CardContent>
    </Card>
  );
}
