
"use client";

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';
import type { HistoricalData, TradeSignal } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

// Lightweight Charts expects time as a UTC timestamp in seconds.
const toTimestamp = (time: number) => time / 1000;

export function TradingChart({ data, symbol, interval, tradeSignal = null }: { data: HistoricalData[]; symbol: string; interval: string; tradeSignal?: TradeSignal | null; }) {
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
            smaShortColor: '#f59e0b',
            smaLongColor: '#8b5cf6',
            buySignalColor: '#22c55e',
            sellSignalColor: '#ef4444',
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

        chartRef.current = {
            chart,
            candlestickSeries,
            volumeSeries,
            smaShortSeries: chart.addLineSeries({ color: chartColors.smaShortColor, lineWidth: 2, lastValueVisible: false, priceLineVisible: false }),
            smaLongSeries: chart.addLineSeries({ color: chartColors.smaLongColor, lineWidth: 2, lastValueVisible: false, priceLineVisible: false }),
            priceLines: [],
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
    
    const { candlestickSeries, volumeSeries, smaShortSeries, smaLongSeries, chart } = chartRef.current;

    // Set candlestick and volume data
    if (data.length > 0) {
        candlestickSeries.setData(data.map(d => ({
          time: toTimestamp(d.time), open: d.open, high: d.high, low: d.low, close: d.close
        })));

        volumeSeries.setData(data.map(d => ({
            time: toTimestamp(d.time),
            value: d.volume,
            color: d.close >= d.open ? 'rgba(38, 166, 154, 0.4)' : 'rgba(239, 83, 80, 0.4)',
        })));
        
        // Indicators
        const addLineSeries = (series: any, dataKey: keyof HistoricalData) => {
          if (data.some(d => d[dataKey] != null)) {
            const lineData = data
              .filter(d => d[dataKey] != null)
              .map(d => ({ time: toTimestamp(d.time), value: d[dataKey] as number }))
            series.setData(lineData);
          } else {
            series.setData([]);
          }
        };

        addLineSeries(smaShortSeries, 'sma_short');
        addLineSeries(smaShortSeries, 'ema_short'); // Reuse same series for EMA
        addLineSeries(smaLongSeries, 'sma_long');
        addLineSeries(smaLongSeries, 'ema_long');   // Reuse same series for EMA

        // Markers
        const markers = data
          .map(d => {
            if (d.buySignal) {
              return { time: toTimestamp(d.time), position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'Buy' };
            }
            if (d.sellSignal) {
              return { time: toTimestamp(d.time), position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'Sell' };
            }
            return null;
          })
          .filter(m => m !== null);
        candlestickSeries.setMarkers(markers as any);

        chart.timeScale().fitContent();

    } else {
        // Clear all series data if no data is provided
        candlestickSeries.setData([]);
        volumeSeries.setData([]);
        smaShortSeries.setData([]);
        smaLongSeries.setData([]);
        candlestickSeries.setMarkers([]);
    }

  }, [data]);

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


  const formattedSymbol = symbol ? symbol.replace('USDT', '/USDT') : 'No Asset Selected';
  const chartTitle = `${formattedSymbol} Price Chart (${interval})`;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{chartTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <div ref={chartContainerRef} className="w-full h-full" />
      </CardContent>
    </Card>
  );
}
    
