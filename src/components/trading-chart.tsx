
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';
import type { HistoricalData, TradeSignal, BacktestResult, LiquidityEvent } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { parseSymbolString } from '@/lib/assets';
import { Camera } from 'lucide-react';

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
  data, 
  symbol, 
  interval, 
  tradeSignal = null,
  highlightedTrade = null,
  onIntervalChange,
  wallLevels = [],
  liquidityEvents = [],
}: { 
  data: HistoricalData[]; 
  symbol: string; 
  interval: string; 
  tradeSignal?: TradeSignal | null;
  highlightedTrade?: BacktestResult | null;
  onIntervalChange?: (newInterval: string) => void;
  wallLevels?: { price: number; type: 'bid' | 'ask' }[];
  liquidityEvents?: LiquidityEvent[];
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current?.chart) {
        chartRef.current.chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    
    // Create chart only once
    if (!chartRef.current) {
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
            pocColor: '#eab308',
            buySignalColor: '#22c55e',
            sellSignalColor: '#ef4444',
            // Indicator Colors
            smaShortColor: '#f59e0b',
            smaLongColor: '#8b5cf6',
            donchianUpperColor: '#4ade80', // green-400
            donchianLowerColor: '#f87171', // red-400
            donchianMiddleColor: 'rgba(148, 163, 184, 0.4)', // slate-400
            tenkanColor: '#38bdf8', // sky-400
            kijunColor: '#f472b6', // pink-400
            senkouAColor: 'rgba(38, 166, 154, 0.2)',
            senkouBColor: 'rgba(239, 83, 80, 0.2)',
        };
        
        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: chartColors.background },
            textColor: chartColors.textColor,
          },
          grid: {
            vertLines: { color: chartColors.gridColor },
            horzLines: { color: chartColors.gridColor },
          },
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
          timeScale: {
            borderColor: chartColors.gridColor,
            timeVisible: true,
          },
          rightPriceScale: {
            visible: false,
          },
          leftPriceScale: {
            visible: true,
            borderColor: chartColors.gridColor,
          },
          crosshair: {
            mode: 1, // Magnet
          },
        });

        // Volume series on a separate pane-like area
        const volumeSeries = chart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: '', // Set to empty string to prevent it from affecting the price scale
          lastValueVisible: false,
          priceLineVisible: false,
        });
        volumeSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 }, // Top 80% for price, bottom 20% for volume
        });

        const candlestickSeries = chart.addCandlestickSeries({
          upColor: chartColors.barUpColor,
          downColor: chartColors.barDownColor,
          wickUpColor: chartColors.wickUpColor,
          wickDownColor: chartColors.wickDownColor,
          borderVisible: false,
        });
        
        const commonLineOptions = { lineWidth: 2, lastValueVisible: false, priceLineVisible: false };

        chartRef.current = {
            chart,
            candlestickSeries,
            volumeSeries,
            smaShortSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.smaShortColor }),
            smaLongSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.smaLongColor }),
            pocSeries: chart.addLineSeries({ color: chartColors.pocColor, lineWidth: 1, lineStyle: LineStyle.Dotted, lastValueVisible: false, priceLineVisible: false }),
            donchianUpperSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.donchianUpperColor, lineStyle: LineStyle.Dotted }),
            donchianMiddleSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.donchianMiddleColor, lineStyle: LineStyle.Dotted }),
            donchianLowerSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.donchianLowerColor, lineStyle: LineStyle.Dotted }),
            tenkanSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.tenkanColor }),
            kijunSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.kijunColor }),
            senkouASeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.senkouAColor }),
            senkouBSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.senkouBColor }),
            priceLines: [],
            wallPriceLines: [],
        };
        
        window.addEventListener('resize', handleResize);
    }
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current?.chart) {
          chartRef.current.chart.remove();
          chartRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !data) return;
    
    const { candlestickSeries, volumeSeries, smaShortSeries, smaLongSeries, pocSeries, donchianUpperSeries, donchianMiddleSeries, donchianLowerSeries, tenkanSeries, kijunSeries, senkouASeries, senkouBSeries, chart } = chartRef.current;

    // Set candlestick and volume data
    if (data.length > 0) {
        // Create a sorted copy of the data to avoid mutation and ensure ascending order for the chart.
        const sortedData = [...data].sort((a, b) => a.time - b.time);

        // Defensively filter out any items with duplicate timestamps to prevent chart errors.
        const uniqueData = sortedData.filter((candle, index, self) =>
            index === 0 || candle.time > self[index - 1].time
        );

        if (uniqueData.length === 0) return;

        const firstPrice = uniqueData[0].close;
        let precision = 2;
        if (firstPrice < 0.1) {
            precision = 8;
        } else if (firstPrice < 10) {
            precision = 4;
        }

        candlestickSeries.applyOptions({
          priceFormat: {
            type: 'price',
            precision: precision,
            minMove: 1 / Math.pow(10, precision),
          },
        });
        
        const highlightColor = '#3b82f6'; // Blue-500 for highlighting trades
        const candlestickChartData = uniqueData.map(d => {
            const isHighlighted = highlightedTrade && d.time >= highlightedTrade.entryTime && d.time <= highlightedTrade.exitTime;
            return {
                time: toTimestamp(d.time),
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
                ...(isHighlighted && {
                    color: highlightColor,
                    wickColor: highlightColor
                })
            };
        });
        candlestickSeries.setData(candlestickChartData);
        
        const volumeChartData = uniqueData.map(d => {
            const isHighlighted = highlightedTrade && d.time >= highlightedTrade.entryTime && d.time <= highlightedTrade.exitTime;
            const originalColor = d.close >= d.open ? 'rgba(38, 166, 154, 0.4)' : 'rgba(239, 83, 80, 0.4)';
            const highlightedVolumeColor = 'rgba(59, 130, 246, 0.4)'; // blue-500 with opacity

            return {
                time: toTimestamp(d.time),
                value: d.volume,
                color: isHighlighted ? highlightedVolumeColor : originalColor,
            };
        });
        volumeSeries.setData(volumeChartData);
        
        // Indicators
        const addLineSeries = (series: any, dataKey: keyof HistoricalData) => {
          if (uniqueData.some(d => d[dataKey] != null)) {
            const lineData = uniqueData
              .filter(d => d[dataKey] != null)
              .map(d => ({ time: toTimestamp(d.time), value: d[dataKey] as number }))
            series.setData(lineData);
          } else {
            series.setData([]);
          }
        };
        
        // Classic Indicators
        addLineSeries(smaShortSeries, 'sma_short');
        addLineSeries(smaShortSeries, 'ema_short'); // Reuse same series for EMA
        addLineSeries(smaLongSeries, 'sma_long');
        addLineSeries(smaLongSeries, 'ema_long');   // Reuse same series for EMA
        addLineSeries(pocSeries, 'poc');
        
        // Donchian Channels
        addLineSeries(donchianUpperSeries, 'donchian_upper');
        addLineSeries(donchianMiddleSeries, 'donchian_middle');
        addLineSeries(donchianLowerSeries, 'donchian_lower');
        
        // Ichimoku Cloud
        addLineSeries(tenkanSeries, 'tenkan_sen');
        addLineSeries(kijunSeries, 'kijun_sen');
        addLineSeries(senkouASeries, 'senkou_a');
        addLineSeries(senkouBSeries, 'senkou_b');

        // Markers
        const signalMarkers = uniqueData
          .map(d => {
            if (d.buySignal) {
              return { time: toTimestamp(d.time), position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'Buy' };
            }
            if (d.sellSignal) {
              return { time: toTimestamp(d.time), position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'Sell' };
            }
            return null;
          })
          .filter((m): m is any => m !== null);
          
        const liquidityMarkers = liquidityEvents.map(event => {
            return {
                time: toTimestamp(event.time),
                position: event.direction === 'bullish' ? 'belowBar' : 'aboveBar',
                color: event.direction === 'bullish' ? '#10b981' : '#f43f5e',
                shape: 'circle',
                text: '$',
                size: 1.2
            }
        });

        candlestickSeries.setMarkers([...signalMarkers, ...liquidityMarkers]);

        chart.timeScale().fitContent();

    } else {
        // Clear all series data if no data is provided
        candlestickSeries.setData([]);
        volumeSeries.setData([]);
        smaShortSeries.setData([]);
        smaLongSeries.setData([]);
        pocSeries.setData([]);
        donchianUpperSeries.setData([]);
        donchianMiddleSeries.setData([]);
        donchianLowerSeries.setData([]);
        tenkanSeries.setData([]);
        kijunSeries.setData([]);
        senkouASeries.setData([]);
        senkouBSeries.setData([]);
        candlestickSeries.setMarkers([]);
    }

  }, [data, highlightedTrade, liquidityEvents]);

   // Effect to draw signal lines
    useEffect(() => {
        if (!chartRef.current?.chart) return;
        const { candlestickSeries } = chartRef.current;

        // Clear previous lines
        if (chartRef.current.priceLines) {
            chartRef.current.priceLines.forEach((line: any) => candlestickSeries.removePriceLine(line));
        }
        chartRef.current.priceLines = [];

        if (tradeSignal) {
            const entryLine = candlestickSeries.createPriceLine({
                price: tradeSignal.entryPrice,
                color: '#3b82f6', // blue-500
                lineWidth: 2,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'Entry',
            });
            const tpLine = candlestickSeries.createPriceLine({
                price: tradeSignal.takeProfit,
                color: '#22c55e', // green-500
                lineWidth: 2,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: 'TP',
            });
            const slLine = candlestickSeries.createPriceLine({
                price: tradeSignal.stopLoss,
                color: '#ef4444', // red-500
                lineWidth: 2,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: 'SL',
            });
            chartRef.current.priceLines = [entryLine, tpLine, slLine];
        }

    }, [tradeSignal]);

    // Effect to focus on a specific trade
    useEffect(() => {
      if (!chartRef.current?.chart || !tradeSignal || !data || data.length < 2) return;

      const { chart } = chartRef.current;
      const timeScale = chart.timeScale();
      
      // Assuming data is sorted by time
      const intervalMs = data[1].time - data[0].time;
      const paddingMs = intervalMs * 20; // 20 bars padding

      const fromVisible = toTimestamp(tradeSignal.timestamp.getTime() - paddingMs);
      // If there's an exit time, pad after it. Otherwise, pad after the entry time.
      const endTime = tradeSignal.exitTimestamp ? tradeSignal.exitTimestamp.getTime() : tradeSignal.timestamp.getTime();
      const toVisible = toTimestamp(endTime + paddingMs * 2);

      timeScale.setVisibleRange({
          from: fromVisible,
          to: toVisible,
      });

    }, [tradeSignal, data]);

    // Effect to draw wall lines from Order Book
    useEffect(() => {
        if (!chartRef.current?.chart) return;
        const { candlestickSeries } = chartRef.current;

        // Clear previous wall lines
        if (chartRef.current.wallPriceLines) {
            chartRef.current.wallPriceLines.forEach((line: any) => candlestickSeries.removePriceLine(line));
        }
        
        const newLines: any[] = [];
        if (wallLevels && wallLevels.length > 0) {
            wallLevels.forEach(wall => {
                const line = candlestickSeries.createPriceLine({
                    price: wall.price,
                    color: wall.type === 'bid' ? '#22c55e' : '#ef4444',
                    lineWidth: 1,
                    lineStyle: LineStyle.Dotted,
                    axisLabelVisible: true,
                    title: ` ${wall.type.toUpperCase()} WALL`,
                });
                newLines.push(line);
            });
        }
        chartRef.current.wallPriceLines = newLines;

    }, [wallLevels]);


  const formattedSymbol = useMemo(() => {
    if (!symbol) return 'No Asset Selected';
    const parsed = parseSymbolString(symbol);
    return parsed ? `${parsed.base}/${parsed.quote}` : symbol;
  }, [symbol]);

  const handleTakeSnapshot = () => {
    if (!chartRef.current?.chart) return;

    const chart = chartRef.current.chart;
    const canvas = chart.takeScreenshot();
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `chart-snapshot-${symbol}-${interval}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartTitle = `${formattedSymbol} (${String(interval || '').toLocaleUpperCase()}) Price Chart`;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{chartTitle}</CardTitle>
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
