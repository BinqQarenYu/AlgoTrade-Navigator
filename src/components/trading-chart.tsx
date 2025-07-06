
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';
import type { HistoricalData, TradeSignal, BacktestResult, LiquidityEvent, LiquidityTarget } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { parseSymbolString } from '@/lib/assets';
import { Camera } from 'lucide-react';
import { formatPrice, formatLargeNumber } from '@/lib/utils';

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
  liquidityTargets = [],
  lineWidth = 2,
  consensusResult = null,
  showAnalysis = true,
}: { 
  data: HistoricalData[]; 
  symbol: string; 
  interval: string; 
  tradeSignal?: TradeSignal | null;
  highlightedTrade?: BacktestResult | null;
  onIntervalChange?: (newInterval: string) => void;
  wallLevels?: { price: number; type: 'bid' | 'ask' }[];
  liquidityEvents?: LiquidityEvent[];
  liquidityTargets?: LiquidityTarget[];
  lineWidth?: number;
  consensusResult?: { price: number; direction: 'UP' | 'DOWN' } | null;
  showAnalysis?: boolean;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const chartContainer = chartContainerRef.current;
    if (!chartContainer) return;

    const handleResize = () => {
      if (chartContainer && chartRef.current?.chart) {
        chartRef.current.chart.applyOptions({ 
          width: chartContainer.clientWidth,
          height: chartContainer.clientHeight
        });
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
        
        const chart = createChart(chartContainer, {
          layout: {
            background: { type: ColorType.Solid, color: chartColors.background },
            textColor: chartColors.textColor,
          },
          grid: {
            vertLines: { color: chartColors.gridColor },
            horzLines: { color: chartColors.gridColor },
          },
          width: chartContainer.clientWidth,
          height: chartContainer.clientHeight,
          timeScale: {
            borderColor: chartColors.gridColor,
            timeVisible: true,
            rightOffset: 20, // Add this to create future space
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
          // Add zoom and scroll options for clarity and to ensure they are enabled
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
          },
          handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
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
          priceScaleId: 'left',
        });

        const blueColor = '#3b82f6';
        const targetZoneSeries = chart.addCandlestickSeries({
          priceScaleId: 'left',
          upColor: 'transparent',
          downColor: 'transparent',
          wickVisible: false,
          borderVisible: true,
          borderUpColor: blueColor,
          borderDownColor: blueColor,
        });
        
        const commonLineOptions = { lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left' };

        chartRef.current = {
            chart,
            candlestickSeries,
            volumeSeries,
            smaShortSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.smaShortColor }),
            smaLongSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.smaLongColor }),
            pocSeries: chart.addLineSeries({ color: chartColors.pocColor, lineWidth: 1, lineStyle: LineStyle.Dotted, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left' }),
            donchianUpperSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.donchianUpperColor, lineStyle: LineStyle.Dotted }),
            donchianMiddleSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.donchianMiddleColor, lineStyle: LineStyle.Dotted }),
            donchianLowerSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.donchianLowerColor, lineStyle: LineStyle.Dotted }),
            tenkanSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.tenkanColor }),
            kijunSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.kijunColor }),
            senkouASeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.senkouAColor }),
            senkouBSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.senkouBColor }),
            consensusPointSeries: chart.addLineSeries({
              priceScaleId: 'left',
              lineWidth: 0,
              lastValueVisible: false,
              priceLineVisible: false,
              crosshairMarkerVisible: true,
              crosshairMarkerRadius: 10,
              crosshairMarkerBorderColor: '#000000',
              crosshairMarkerBackgroundColor: '#FFEB3B', // A bright yellow
            }),
            consensusArrowSeries: chart.addLineSeries({
              priceScaleId: 'left',
              lineWidth: 0,
              lastValueVisible: false,
              priceLineVisible: false,
            }),
            priceLines: [],
            liquidityLevelLine: null,
            wallPriceLines: [],
            liquidityPriceLines: [],
            targetPriceLines: [],
            targetZoneSeries,
        };
    }
    
    // Use ResizeObserver to handle container size changes
    const resizeObserver = new ResizeObserver(handleResize);
    if (chartContainer) {
      resizeObserver.observe(chartContainer);
    }
    
    // Cleanup on unmount
    return () => {
      if (chartContainer) {
        resizeObserver.unobserve(chartContainer);
      }
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
          if (showAnalysis && uniqueData.some(d => d[dataKey] != null)) {
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
        const signalMarkers = showAnalysis ? uniqueData
          .map(d => {
            if (d.buySignal) {
              return { time: toTimestamp(d.time), position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'Buy' };
            }
            if (d.sellSignal) {
              return { time: toTimestamp(d.time), position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'Sell' };
            }
            return null;
          })
          .filter((m): m is any => m !== null) : [];
          
        const liquidityMarkers = showAnalysis ? liquidityEvents.map(event => {
            return {
                time: toTimestamp(event.time),
                position: event.direction === 'bullish' ? 'belowBar' : 'aboveBar',
                color: event.direction === 'bullish' ? '#10b981' : '#f43f5e',
                shape: 'circle',
                text: '$',
                size: 1.2
            }
        }) : [];

        const allMarkers = [...signalMarkers, ...liquidityMarkers].sort((a, b) => a.time - b.time);
        candlestickSeries.setMarkers(allMarkers);

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

  }, [data, highlightedTrade, liquidityEvents, showAnalysis]);

   // Effect to draw signal lines
    useEffect(() => {
        if (!chartRef.current?.chart) return;
        const { candlestickSeries } = chartRef.current;

        // Clear previous lines
        if (chartRef.current.priceLines) {
            chartRef.current.priceLines.forEach((line: any) => candlestickSeries.removePriceLine(line));
        }
        chartRef.current.priceLines = [];
        
        if (chartRef.current.liquidityLevelLine) {
            candlestickSeries.removePriceLine(chartRef.current.liquidityLevelLine);
            chartRef.current.liquidityLevelLine = null;
        }

        if (tradeSignal) {
            const entryLine = candlestickSeries.createPriceLine({
                price: tradeSignal.entryPrice,
                color: '#3b82f6', // blue-500
                lineWidth: lineWidth,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'Entry',
            });
            const tpLine = candlestickSeries.createPriceLine({
                price: tradeSignal.takeProfit,
                color: '#22c55e', // green-500
                lineWidth: lineWidth,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: 'TP',
            });
            const slLine = candlestickSeries.createPriceLine({
                price: tradeSignal.stopLoss,
                color: '#ef4444', // red-500
                lineWidth: lineWidth,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: 'SL',
            });
            chartRef.current.priceLines = [entryLine, tpLine, slLine];
            
            if (tradeSignal.peakPrice) {
                chartRef.current.liquidityLevelLine = candlestickSeries.createPriceLine({
                    price: tradeSignal.peakPrice,
                    color: '#a8a29e', // stone-400
                    lineWidth: 1, // Keep this thin as it's a reference
                    lineStyle: LineStyle.Dashed,
                    axisLabelVisible: true,
                    title: ' Liquidity Level',
                });
            }
        }

    }, [tradeSignal, lineWidth]);
    
    // Effect to update line thickness on indicator series
    useEffect(() => {
        if (!chartRef.current?.chart) return;

        const {
            smaShortSeries,
            smaLongSeries,
            donchianUpperSeries,
            donchianMiddleSeries,
            donchianLowerSeries,
            tenkanSeries,
            kijunSeries,
            senkouASeries,
            senkouBSeries,
        } = chartRef.current;

        const allSeries = [
            smaShortSeries, smaLongSeries, donchianUpperSeries, donchianMiddleSeries,
            donchianLowerSeries, tenkanSeries, kijunSeries, senkouASeries, senkouBSeries
        ];
        
        allSeries.forEach(series => {
            if (series) {
                series.applyOptions({ lineWidth: lineWidth });
            }
        });
    }, [lineWidth]);

    // Effect to focus on a specific trade
    useEffect(() => {
      if (!chartRef.current?.chart || !highlightedTrade || !data || data.length < 2) return;

      const { chart } = chartRef.current;
      const timeScale = chart.timeScale();
      
      // Assuming data is sorted by time
      const intervalMs = data[1].time - data[0].time;
      const paddingMs = intervalMs * 20; // 20 bars padding

      const fromVisible = toTimestamp(highlightedTrade.entryTime - paddingMs);
      const toVisible = toTimestamp(highlightedTrade.exitTime + paddingMs);

      timeScale.setVisibleRange({
          from: fromVisible,
          to: toVisible,
      });

    }, [highlightedTrade, data]);

    // Effect to draw wall lines from Order Book
    useEffect(() => {
        if (!chartRef.current?.chart) return;
        const { candlestickSeries } = chartRef.current;

        // Clear previous wall lines
        if (chartRef.current.wallPriceLines) {
            chartRef.current.wallPriceLines.forEach((line: any) => candlestickSeries.removePriceLine(line));
        }
        
        const newLines: any[] = [];
        if (showAnalysis && wallLevels && wallLevels.length > 0) {
            wallLevels.forEach(wall => {
                const line = candlestickSeries.createPriceLine({
                    price: wall.price,
                    color: wall.type === 'bid' ? '#22c55e' : '#ef4444',
                    lineWidth: lineWidth,
                    lineStyle: LineStyle.Dotted,
                    axisLabelVisible: true,
                    title: ` ${wall.type.toUpperCase()} WALL`,
                });
                newLines.push(line);
            });
        }
        chartRef.current.wallPriceLines = newLines;

    }, [wallLevels, lineWidth, showAnalysis]);

    // Effect to draw historical liquidity target lines
    useEffect(() => {
        if (!chartRef.current?.chart) return;
        const { candlestickSeries } = chartRef.current;

        if (chartRef.current.targetPriceLines) {
            chartRef.current.targetPriceLines.forEach((line: any) => candlestickSeries.removePriceLine(line));
        }
        
        const newLines: any[] = [];
        if (showAnalysis && liquidityTargets && liquidityTargets.length > 0) {
            liquidityTargets.forEach(target => {
                const isBuySide = target.type === 'buy-side';
                const line = candlestickSeries.createPriceLine({
                    price: target.priceLevel,
                    color: isBuySide ? '#f43f5e' : '#10b981', // Red for potential resistance, Green for potential support
                    lineWidth: lineWidth,
                    lineStyle: LineStyle.LargeDashed,
                    axisLabelVisible: true,
                    title: isBuySide ? ` Buy-Side Target` : ` Sell-Side Target`,
                });
                newLines.push(line);
            });
        }
        chartRef.current.targetPriceLines = newLines;

    }, [liquidityTargets, lineWidth, showAnalysis]);

    // Effect to draw the target zone box
    useEffect(() => {
        if (!chartRef.current?.chart || !data || data.length < 2) {
            if (chartRef.current?.targetZoneSeries) {
                chartRef.current.targetZoneSeries.setData([]);
            }
            return;
        }

        const { targetZoneSeries } = chartRef.current;
        if (!targetZoneSeries) return;

        const firstGrabEvent = liquidityEvents.length > 0 ? liquidityEvents.sort((a,b) => a.time - b.time)[0] : null;
        const buySideTarget = liquidityTargets.find(t => t.type === 'buy-side');
        const sellSideTarget = liquidityTargets.find(t => t.type === 'sell-side');
        
        if (showAnalysis && firstGrabEvent && buySideTarget && sellSideTarget) {
            const startTime = toTimestamp(firstGrabEvent.time);
            const lastCandle = data[data.length - 1];
            const intervalMs = data[1].time - data[0].time;
            const futureBars = 20;

            const topPrice = buySideTarget.priceLevel;
            const bottomPrice = sellSideTarget.priceLevel;

            const boxData = [];
            
            // Add candles for the historical part of the box
            for(const candle of data) {
                const candleTime = toTimestamp(candle.time);
                if (candleTime >= startTime) {
                    boxData.push({ time: candleTime, open: topPrice, high: topPrice, low: bottomPrice, close: bottomPrice });
                }
            }
            
            // Add candles for the future part of the box
            let lastTime = toTimestamp(lastCandle.time);
            for(let i = 1; i <= futureBars; i++) {
                const futureTime = lastTime + i * (intervalMs / 1000);
                 boxData.push({ time: futureTime, open: topPrice, high: topPrice, low: bottomPrice, close: bottomPrice });
            }

            targetZoneSeries.setData(boxData);
        } else {
            targetZoneSeries.setData([]);
        }

    }, [data, liquidityEvents, liquidityTargets, showAnalysis]);


    // Effect to draw consensus price dot and arrow
    useEffect(() => {
      if (!chartRef.current?.chart || !data || data.length < 2) {
        if (chartRef.current?.consensusPointSeries) {
          chartRef.current.consensusPointSeries.setData([]);
          chartRef.current.consensusArrowSeries.setMarkers([]);
        }
        return;
      }
    
      const { consensusPointSeries, consensusArrowSeries } = chartRef.current;
      if (!consensusPointSeries || !consensusArrowSeries) return;

      if (consensusResult && showAnalysis) {
        const lastCandle = data[data.length - 1];
        const intervalMs = data[1].time - data[0].time;
        const futureBarOffset = 10; // Center of the 20-bar rightOffset
        const futureTime = toTimestamp(lastCandle.time + (futureBarOffset * intervalMs));
        
        consensusPointSeries.setData([{ time: futureTime, value: consensusResult.price }]);

        const arrowMarker = {
            time: futureTime,
            position: consensusResult.direction === 'UP' ? 'belowBar' : 'aboveBar',
            color: consensusResult.direction === 'UP' ? '#22c55e' : '#ef4444',
            shape: consensusResult.direction === 'UP' ? 'arrowUp' : 'arrowDown',
            size: 2,
        };

        consensusArrowSeries.setData([{ time: futureTime, value: consensusResult.price }]);
        consensusArrowSeries.setMarkers([arrowMarker]);

      } else {
        if (consensusPointSeries.setData) consensusPointSeries.setData([]);
        if (consensusArrowSeries.setMarkers) consensusArrowSeries.setMarkers([]);
      }
    }, [consensusResult, data, showAnalysis]);


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
