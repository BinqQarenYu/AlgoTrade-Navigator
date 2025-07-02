"use client";

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type { HistoricalData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

// Lightweight Charts expects time as a UTC timestamp in seconds.
const toTimestamp = (time: number) => time / 1000;

export function TradingChart({ data, symbol }: { data: HistoricalData[]; symbol: string; }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
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
    volumeSeries.setData(data.map(d => ({
        time: toTimestamp(d.time),
        value: d.volume,
        color: d.close >= d.open ? chartColors.volumeUpColor : chartColors.volumeDownColor,
    })));

    // Main candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: chartColors.barUpColor,
      downColor: chartColors.barDownColor,
      wickUpColor: chartColors.wickUpColor,
      wickDownColor: chartColors.wickDownColor,
      borderVisible: false,
    });
    candlestickSeries.setData(data.map(d => ({
      time: toTimestamp(d.time), open: d.open, high: d.high, low: d.low, close: d.close
    })));

    // Buy/Sell Markers
    const markers = data
      .map(d => {
        if (d.buySignal) {
          return { time: toTimestamp(d.time), position: 'belowBar', color: chartColors.buySignalColor, shape: 'arrowUp', text: 'Buy' };
        }
        if (d.sellSignal) {
          return { time: toTimestamp(d.time), position: 'aboveBar', color: chartColors.sellSignalColor, shape: 'arrowDown', text: 'Sell' };
        }
        return null;
      })
      .filter(m => m !== null);
    
    candlestickSeries.setMarkers(markers as any);
    
    // Indicator Lines
    const addLineSeries = (dataKey: keyof HistoricalData, color: string) => {
      if (data.some(d => d[dataKey] != null)) {
        const lineSeries = chart.addLineSeries({ color: color, lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
        lineSeries.setData(
          data
            .filter(d => d[dataKey] != null)
            .map(d => ({ time: toTimestamp(d.time), value: d[dataKey] as number }))
        );
      }
    };
    
    addLineSeries('sma_short', chartColors.smaShortColor);
    addLineSeries('sma_long', chartColors.smaLongColor);
    addLineSeries('ema_short', chartColors.smaShortColor);
    addLineSeries('ema_long', chartColors.smaLongColor);
    
    chart.timeScale().fitContent();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, symbol]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{symbol} Price Chart</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <div ref={chartContainerRef} className="w-full h-full" />
      </CardContent>
    </Card>
  );
}
