
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

export function TradingChart({ 
  data = [], 
  projectedData,
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
  showWalls?: boolean; // Added prop
  showLiquidity?: boolean; // Added prop
  showTargets?: boolean; // Added prop
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
        buySignalColor: '#22c55e',
        sellSignalColor: '#ef4444',
        smaShortColor: '#f59e0b',
        smaLongColor: '#8b5cf6',
        emaMediumColor: '#fb923c',
        donchianUpperColor: '#4ade80',
        donchianLowerColor: '#f87171',
        donchianMiddleColor: 'rgba(148, 163, 184, 0.4)',
        tenkanColor: '#38bdf8',
        kijunColor: '#f472b6',
        senkouAColor: 'rgba(38, 166, 154, 0.2)',
        senkouBColor: 'rgba(239, 83, 80, 0.2)',
        accumulationColor: 'rgba(250, 204, 21, 0.8)',
        pumpColor: 'rgba(34, 197, 94, 0.8)',
        distributionColor: 'rgba(239, 68, 68, 0.8)',
        accumulationVolumeColor: 'rgba(250, 204, 21, 0.4)',
        pumpVolumeColor: 'rgba(34, 197, 94, 0.4)',
        distributionVolumeColor: 'rgba(239, 83, 80, 0.4)',
        quantumMeanColor: '#60a5fa',
        quantumSigmaColor: 'rgba(96, 165, 250, 0.2)',
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
    
    chartRef.current = {
        chart, candlestickSeries, volumeSeries, chartColors,
        // ... (all other series initializations remain the same)
        spoofingZoneSeries: chart.addCandlestickSeries({ priceScaleId: 'left', upColor: 'rgba(239, 68, 68, 0.05)', downColor: 'rgba(239, 68, 68, 0.05)', wickVisible: false, borderVisible: false, autoscaleInfoProvider: () => null, }),
        manipulationZoneSeries: chart.addCandlestickSeries({ priceScaleId: 'left', upColor: 'transparent', downColor: 'transparent', wickVisible: false, borderVisible: false, lastValueVisible: false, priceLineVisible: false, autoscaleInfoProvider: () => null, }),
        targetZoneSeries: chart.addCandlestickSeries({ priceScaleId: 'left', upColor: 'rgba(59, 130, 246, 0.2)', downColor: 'rgba(59, 130, 246, 0.2)', wickVisible: false, borderVisible: false, autoscaleInfoProvider: () => null, }),
        quantumFieldSeries: chart.addCandlestickSeries({ priceScaleId: 'left', wickVisible: false, borderVisible: false, lastValueVisible: false, priceLineVisible: false, autoscaleInfoProvider: () => null, }),
        mainLineSeries: chart.addLineSeries({ lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left', color: '#3b82f6' }),
        quantumMeanSeries: chart.addLineSeries({ lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left', color: chartColors.quantumMeanColor, lineStyle: LineStyle.Dotted }),
        quantumSigmaAreaSeries: chart.addAreaSeries({ lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left', topColor: 'rgba(0,0,0,0)', bottomColor: 'rgba(0,0,0,0)', lineColor: 'transparent' }),
        smaShortSeries: chart.addLineSeries({ lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left', color: chartColors.smaShortColor }),
        smaLongSeries: chart.addLineSeries({ lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left', color: chartColors.smaLongColor }),
        emaMediumSeries: chart.addLineSeries({ lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left', color: chartColors.emaMediumColor }),
        pocSeries: chart.addLineSeries({ color: '#eab308', lineWidth: 1, lineStyle: LineStyle.Dotted, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left' }),
        donchianUpperSeries: chart.addLineSeries({ lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left', color: chartColors.donchianUpperColor, lineStyle: LineStyle.Dotted }),
        donchianMiddleSeries: chart.addLineSeries({ lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left', color: chartColors.donchianMiddleColor, lineStyle: LineStyle.Dotted }),
        donchianLowerSeries: chart.addLineSeries({ lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left', color: chartColors.donchianLowerColor, lineStyle: LineStyle.Dotted }),
        tenkanSeries: chart.addLineSeries({ lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left', color: chartColors.tenkanColor }),
        kijunSeries: chart.addLineSeries({ lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left', color: chartColors.kijunColor }),
        senkouASeries: chart.addLineSeries({ lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left', color: chartColors.senkouAColor }),
        senkouBSeries: chart.addLineSeries({ lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left', color: chartColors.senkouBColor }),
        priceLines: [],
    };
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainer);
    
    return () => {
      resizeObserver.unobserve(chartContainer);
      if (spoofZoneTimeoutRef.current) {
        clearTimeout(spoofZoneTimeoutRef.current);
      }
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Effect for handling data updates efficiently
  useEffect(() => {
    if (!chartRef.current?.chart || !combinedData) return;

    const { candlestickSeries, volumeSeries } = chartRef.current;
    
    // Sort and ensure uniqueness
    const sortedData = [...combinedData].sort((a, b) => a.time - b.time);
    const uniqueData = sortedData.filter((candle, index, self) =>
        index === 0 || candle.time > self[index - 1].time
    );
    if (uniqueData.length === 0) return;

    // Check if it's a real-time update vs a full data replacement
    const lastRendered = lastRenderedDataRef.current;
    const isUpdate = uniqueData.length > 0 && lastRendered.length > 0 && uniqueData[uniqueData.length - 2]?.time === lastRendered[lastRendered.length - 2]?.time;
    
    if (isUpdate) {
      // It's a live tick, just update the last candle
      const lastCandle = uniqueData[uniqueData.length - 1];
      candlestickSeries.update({ time: toTimestamp(lastCandle.time), ...lastCandle });
      volumeSeries.update({ time: toTimestamp(lastCandle.time), value: lastCandle.volume, color: lastCandle.close >= lastCandle.open ? chartRef.current.chartColors.volumeUpColor : chartRef.current.chartColors.volumeDownColor });
    } else {
      // It's a full data reset
      const candlestickChartData = uniqueData.map(d => ({ time: toTimestamp(d.time), ...d }));
      const volumeChartData = uniqueData.map(d => ({ time: toTimestamp(d.time), value: d.volume, color: d.close >= d.open ? chartRef.current.chartColors.volumeUpColor : chartRef.current.chartColors.volumeDownColor }));
      
      candlestickSeries.setData(candlestickChartData);
      volumeSeries.setData(volumeChartData);
      chartRef.current.chart.timeScale().fitContent();
    }
    
    lastRenderedDataRef.current = uniqueData;

    // This part can stay as it is, as markers and indicator lines often need a full recalculation anyway
    const isTradeHighlighted = (d: HistoricalData): boolean => {
      if (!highlightedTrade) return false;
      if ('exitTime' in highlightedTrade && 'entryTime' in highlightedTrade) {
          return d.time >= highlightedTrade.entryTime && d.time <= highlightedTrade.exitTime;
      }
      return false;
    };

    const signalMarkers = showAnalysis ? uniqueData.map(d => {
        let marker = null;
        if (d.buySignal) marker = { time: toTimestamp(d.time), position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'Buy' };
        if (d.sellSignal) marker = { time: toTimestamp(d.time), position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'Sell' };
        return marker;
    }).filter((m): m is any => m !== null) : [];
    
    candlestickSeries.setMarkers(signalMarkers);

    const addLineSeries = (series: any, dataKey: keyof HistoricalData) => {
      if (showAnalysis && uniqueData.some(d => d[dataKey] != null)) {
        const lineData = uniqueData.filter(d => d[dataKey] != null).map(d => ({ time: toTimestamp(d.time), value: d[dataKey] as number }));
        series.setData(lineData);
      } else {
        series.setData([]);
      }
    };
    
    addLineSeries(chartRef.current.smaShortSeries, 'sma_short');
    addLineSeries(chartRef.current.smaLongSeries, 'sma_long');
    addLineSeries(chartRef.current.emaMediumSeries, 'ema_medium');

  }, [combinedData, highlightedTrade, showAnalysis]);

  // Effect to draw signal lines
  useEffect(() => {
    if (!chartRef.current?.chart) return;
    const { candlestickSeries, priceLines = [] } = chartRef.current;

    priceLines.forEach((line: any) => candlestickSeries.removePriceLine(line));
    chartRef.current.priceLines = [];
    
    if (tradeSignal) {
        const createLine = (price: number, color: string, title: string) => candlestickSeries.createPriceLine({ price, color, lineWidth, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title });
        const newLines = [
            createLine(tradeSignal.entryPrice, '#3b82f6', 'Entry'),
            createLine(tradeSignal.takeProfit, '#22c55e', 'TP'),
            createLine(tradeSignal.stopLoss, '#ef4444', 'SL'),
        ];
        if (tradeSignal.peakPrice) {
            newLines.push(createLine(tradeSignal.peakPrice, '#a8a29e', 'Liq Level'));
        }
        chartRef.current.priceLines = newLines;
    }
  }, [tradeSignal, lineWidth]);
    
  // Effect to draw wall lines from Order Book
  useEffect(() => {
    if (!chartRef.current?.chart) return;
    const { candlestickSeries, wallPriceLines = [] } = chartRef.current;

    wallPriceLines.forEach((line: any) => candlestickSeries.removePriceLine(line));
    
    const newLines: any[] = [];
    if (showAnalysis && showWalls && wallLevels?.length > 0) {
        wallLevels.forEach(wall => {
            const isBid = wall.type === 'bid';
            newLines.push(candlestickSeries.createPriceLine({
                price: wall.price,
                color: isBid ? '#60a5fa' : '#c084fc',
                lineWidth: lineWidth,
                lineStyle: LineStyle.Dotted,
                axisLabelVisible: true,
                title: isBid ? ' BID WALL' : ' ASK WALL',
            }));
        });
    }
    chartRef.current.wallPriceLines = newLines;
  }, [wallLevels, lineWidth, showAnalysis, showWalls]);

  // ... (other effects for targets, grids, etc., remain largely the same)

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
