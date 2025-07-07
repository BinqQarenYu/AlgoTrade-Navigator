
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, LineStyle, PriceScaleMode } from 'lightweight-charts';
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
  chartType = 'candlestick',
  scaleMode = 'linear',
  pricePrecision,
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
  chartType?: 'candlestick' | 'line';
  scaleMode?: 'linear' | 'logarithmic';
  pricePrecision?: number;
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

        const volumeSeries = chart.addHistogramSeries({
          priceFormat: { type: 'volume' },
          priceScaleId: '', 
          lastValueVisible: false,
          priceLineVisible: false,
        });
        volumeSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });

        const targetZoneSeries = chart.addCandlestickSeries({
            priceScaleId: 'left',
            upColor: 'rgba(59, 130, 246, 0.2)', // semi-transparent blue
            downColor: 'rgba(59, 130, 246, 0.2)', // semi-transparent blue
            wickVisible: false,
            borderVisible: false,
            autoscaleInfoProvider: () => null, // Prevents this series from affecting the main price scale
        });

        const candlestickSeries = chart.addCandlestickSeries({
          upColor: chartColors.barUpColor,
          downColor: chartColors.barDownColor,
          wickUpColor: chartColors.wickUpColor,
          wickDownColor: chartColors.wickDownColor,
          borderVisible: false,
          priceScaleId: 'left',
        });
        
        const commonLineOptions = { lineWidth: 2, lastValueVisible: false, priceLineVisible: false, priceScaleId: 'left' };
        
        const mainLineSeries = chart.addLineSeries({
            ...commonLineOptions,
            color: '#3b82f6',
        });

        chartRef.current = {
            chart,
            candlestickSeries,
            mainLineSeries,
            volumeSeries,
            targetZoneSeries,
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
              crosshairMarkerBackgroundColor: '#FFEB3B',
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
            volumeLegLineSeries: chart.addLineSeries({ ...commonLineOptions, color: '#facc15', lineStyle: LineStyle.Dashed }),
            volumeLegTextPriceLine: null,
            volumeLeg2LineSeries: chart.addLineSeries({ ...commonLineOptions, color: '#fb923c', lineStyle: LineStyle.Dashed }),
            volumeLeg2TextPriceLine: null,
            volumeLeg3LineSeries: chart.addLineSeries({ ...commonLineOptions, color: '#60a5fa', lineStyle: LineStyle.Dashed }),
            volumeLeg3TextPriceLine: null,
        };
    }
    
    const resizeObserver = new ResizeObserver(handleResize);
    if (chartContainer) {
      resizeObserver.observe(chartContainer);
    }
    
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
    
    const { candlestickSeries, mainLineSeries, volumeSeries, smaShortSeries, smaLongSeries, pocSeries, donchianUpperSeries, donchianMiddleSeries, donchianLowerSeries, tenkanSeries, kijunSeries, senkouASeries, senkouBSeries, chart } = chartRef.current;

    if (data.length > 0) {
        const sortedData = [...data].sort((a, b) => a.time - b.time);
        const uniqueData = sortedData.filter((candle, index, self) =>
            index === 0 || candle.time > self[index - 1].time
        );
        if (uniqueData.length === 0) return;

        let finalPrecision: number;
        
        if (pricePrecision !== undefined) {
            finalPrecision = pricePrecision;
        } else {
            const firstPrice = uniqueData[0].close;
            if (firstPrice > 1000) { // e.g., BTC
                finalPrecision = 2;
            } else if (firstPrice > 10) { // e.g., ETH, SOL
                finalPrecision = 4;
            } else if (firstPrice > 0.1) { // e.g., ADA, XRP
                finalPrecision = 5;
            } else if (firstPrice > 0.0001) { // e.g., SHIB
                finalPrecision = 8;
            } else { // e.g., PEPE
                finalPrecision = 10;
            }
        }
        
        const minMove = 1 / Math.pow(10, finalPrecision);

        const priceScale = chart.priceScale('left');
        const newPriceFormat = {
          type: 'price',
          precision: finalPrecision,
          minMove: minMove,
        };
        
        // ** FIX: Apply the price format to the scale itself **
        priceScale.applyOptions({
            autoScale: true,
            priceFormat: newPriceFormat,
        });
        
        candlestickSeries.applyOptions({ priceFormat: newPriceFormat });
        mainLineSeries.applyOptions({ priceFormat: newPriceFormat });
        
        const highlightColor = '#3b82f6';
        
        const volumeChartData = uniqueData.map(d => {
            const isHighlighted = highlightedTrade && d.time >= highlightedTrade.entryTime && d.time <= highlightedTrade.exitTime;
            const originalColor = d.close >= d.open ? 'rgba(38, 166, 154, 0.4)' : 'rgba(239, 83, 80, 0.4)';
            const highlightedVolumeColor = 'rgba(59, 130, 246, 0.4)';

            return {
                time: toTimestamp(d.time),
                value: d.volume,
                color: isHighlighted ? highlightedVolumeColor : originalColor,
            };
        });
        volumeSeries.setData(volumeChartData);
        
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
        
        addLineSeries(smaShortSeries, 'sma_short');
        addLineSeries(smaShortSeries, 'ema_short');
        addLineSeries(smaLongSeries, 'sma_long');
        addLineSeries(smaLongSeries, 'ema_long');
        addLineSeries(pocSeries, 'poc');
        addLineSeries(donchianUpperSeries, 'donchian_upper');
        addLineSeries(donchianMiddleSeries, 'donchian_middle');
        addLineSeries(donchianLowerSeries, 'donchian_lower');
        addLineSeries(tenkanSeries, 'tenkan_sen');
        addLineSeries(kijunSeries, 'kijun_sen');
        addLineSeries(senkouASeries, 'senkou_a');
        addLineSeries(senkouBSeries, 'senkou_b');

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

        if (chartType === 'line') {
            candlestickSeries.setData([]);
            candlestickSeries.setMarkers([]);
            const lineData = uniqueData.map(d => ({
                time: toTimestamp(d.time),
                value: d.close,
            }));
            mainLineSeries.setData(lineData);
        } else {
            mainLineSeries.setData([]);
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
            candlestickSeries.setMarkers(allMarkers);
        }

        chart.timeScale().fitContent();

    } else {
        candlestickSeries.setData([]);
        mainLineSeries.setData([]);
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

  }, [data, highlightedTrade, liquidityEvents, showAnalysis, chartType, pricePrecision]);

   // Effect to draw signal lines
    useEffect(() => {
        if (!chartRef.current?.chart) return;
        const { candlestickSeries } = chartRef.current;

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
                color: '#3b82f6',
                lineWidth: lineWidth,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'Entry',
            });
            const tpLine = candlestickSeries.createPriceLine({
                price: tradeSignal.takeProfit,
                color: '#22c55e',
                lineWidth: lineWidth,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: 'TP',
            });
            const slLine = candlestickSeries.createPriceLine({
                price: tradeSignal.stopLoss,
                color: '#ef4444',
                lineWidth: lineWidth,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: 'SL',
            });
            chartRef.current.priceLines = [entryLine, tpLine, slLine];
            
            if (tradeSignal.peakPrice) {
                chartRef.current.liquidityLevelLine = candlestickSeries.createPriceLine({
                    price: tradeSignal.peakPrice,
                    color: '#a8a29e',
                    lineWidth: 1,
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
      
      const intervalMs = data[1].time - data[0].time;
      const paddingMs = intervalMs * 20;

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
                    color: isBuySide ? '#f43f5e' : '#10b981',
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
  
      const sortedEvents = [...liquidityEvents].sort((a,b) => a.time - b.time);
      const lastGrabEvent = sortedEvents.length > 0 ? sortedEvents[sortedEvents.length - 1] : null;
      
      const buySideTarget = liquidityTargets.find(t => t.type === 'buy-side');
      const sellSideTarget = liquidityTargets.find(t => t.type === 'sell-side');
      
      if (showAnalysis && lastGrabEvent && buySideTarget && sellSideTarget) {
          const startTime = toTimestamp(lastGrabEvent.time);
          const lastCandle = data[data.length - 1];
          const intervalMs = data[1].time - data[0].time;
          const futureBars = 20;

          const topPrice = buySideTarget.priceLevel;
          const bottomPrice = sellSideTarget.priceLevel;

          const boxData = [];
          
          let lastTime = 0;
          for(const candle of data) {
              const candleTime = toTimestamp(candle.time);
              if (candleTime >= startTime) {
                  boxData.push({ time: candleTime, open: topPrice, high: topPrice, low: bottomPrice, close: bottomPrice });
              }
              lastTime = candleTime;
          }
          
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
        const futureBarOffset = 10;
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

     // Effect for volume leg line (Green to Red)
     useEffect(() => {
      if (!chartRef.current?.chart) return;
      const { volumeLegLineSeries, candlestickSeries, volumeLegTextPriceLine } = chartRef.current;

      // Clear existing lines
      volumeLegLineSeries.setData([]);
      if (volumeLegTextPriceLine) {
          candlestickSeries.removePriceLine(volumeLegTextPriceLine);
          chartRef.current.volumeLegTextPriceLine = null;
      }

      if (!showAnalysis || data.length < 2 || liquidityEvents.length < 2) return;
      
      const sortedEvents = [...liquidityEvents].sort((a, b) => a.time - b.time);
      let startEvent: LiquidityEvent | null = null;
      let endEvent: LiquidityEvent | null = null;
      
      // Find the last green -> red sequence
      for (let i = sortedEvents.length - 1; i > 0; i--) {
          if (sortedEvents[i].direction === 'bearish' && sortedEvents[i-1].direction === 'bullish') {
              startEvent = sortedEvents[i-1];
              endEvent = sortedEvents[i];
              break;
          }
      }
      
      if (startEvent && endEvent) {
          // Draw the line
          volumeLegLineSeries.setData([
              { time: toTimestamp(startEvent.time), value: startEvent.priceLevel },
              { time: toTimestamp(endEvent.time), value: endEvent.priceLevel },
          ]);

          // Calculate volume
          const startIndex = data.findIndex(d => d.time >= startEvent!.time);
          const endIndex = data.findIndex(d => d.time >= endEvent!.time);

          if (startIndex > -1 && endIndex > -1) {
              const relevantCandles = data.slice(startIndex, endIndex + 1);
              const totalVolume = relevantCandles.reduce((sum, d) => sum + d.volume, 0);
              const volumeText = `Vol (Up-Leg): ${formatLargeNumber(totalVolume, 2)}`;
              const midpointPrice = (startEvent.priceLevel + endEvent.priceLevel) / 2;
              
              // Create the text label on the price axis
              chartRef.current.volumeLegTextPriceLine = candlestickSeries.createPriceLine({
                  price: midpointPrice,
                  color: 'transparent',
                  lineWidth: 0,
                  axisLabelVisible: true,
                  title: volumeText,
              });
          }
      }
    }, [data, liquidityEvents, showAnalysis]);

    // Effect for volume leg line (Last 2 Grabs)
    useEffect(() => {
        if (!chartRef.current?.chart) return;
        const { volumeLeg2LineSeries, candlestickSeries, volumeLeg2TextPriceLine } = chartRef.current;

        // Clear existing lines
        if (volumeLeg2LineSeries) volumeLeg2LineSeries.setData([]);
        if (volumeLeg2TextPriceLine) {
            candlestickSeries.removePriceLine(volumeLeg2TextPriceLine);
            chartRef.current.volumeLeg2TextPriceLine = null;
        }

        if (!showAnalysis || data.length < 2 || liquidityEvents.length < 2) return;

        const sortedEvents = [...liquidityEvents].sort((a, b) => a.time - b.time);
        
        const endEvent = sortedEvents[sortedEvents.length - 1];
        const startEvent = sortedEvents[sortedEvents.length - 2];

        if (startEvent && endEvent) {
            // Draw the line
            volumeLeg2LineSeries.setData([
                { time: toTimestamp(startEvent.time), value: startEvent.priceLevel },
                { time: toTimestamp(endEvent.time), value: endEvent.priceLevel },
            ]);

            // Calculate volume
            const startIndex = data.findIndex(d => d.time >= startEvent.time);
            const endIndex = data.findIndex(d => d.time >= endEvent.time);

            if (startIndex > -1 && endIndex > -1 && startIndex <= endIndex) {
                const relevantCandles = data.slice(startIndex, endIndex + 1);
                const totalVolume = relevantCandles.reduce((sum, d) => sum + d.volume, 0);
                const volumeText = `Vol (Last 2): ${formatLargeNumber(totalVolume, 2)}`;
                const midpointPrice = (startEvent.priceLevel + endEvent.priceLevel) / 2;
                
                // Create the text label on the price axis
                chartRef.current.volumeLeg2TextPriceLine = candlestickSeries.createPriceLine({
                    price: midpointPrice,
                    color: 'transparent',
                    lineWidth: 0,
                    axisLabelVisible: true,
                    title: volumeText,
                });
            }
        }
    }, [data, liquidityEvents, showAnalysis]);

    // Effect for volume leg line (last grab to now)
    useEffect(() => {
        if (!chartRef.current?.chart) return;
        const { volumeLeg3LineSeries, candlestickSeries, volumeLeg3TextPriceLine } = chartRef.current;

        // Clear existing lines
        if (volumeLeg3LineSeries) volumeLeg3LineSeries.setData([]);
        if (volumeLeg3TextPriceLine) {
            candlestickSeries.removePriceLine(volumeLeg3TextPriceLine);
            chartRef.current.volumeLeg3TextPriceLine = null;
        }

        if (!showAnalysis || data.length < 2 || liquidityEvents.length < 1) return;

        const sortedEvents = [...liquidityEvents].sort((a, b) => a.time - b.time);
        const startEvent = sortedEvents[sortedEvents.length - 1]; // The very last grab
        const endCandle = data[data.length - 1]; // The current candle

        if (startEvent && endCandle) {
            // Draw the line
            volumeLeg3LineSeries.setData([
                { time: toTimestamp(startEvent.time), value: startEvent.priceLevel },
                { time: toTimestamp(endCandle.time), value: endCandle.close },
            ]);

            // Calculate volume
            const startIndex = data.findIndex(d => d.time >= startEvent.time);
            
            if (startIndex > -1) {
                const relevantCandles = data.slice(startIndex);
                const totalVolume = relevantCandles.reduce((sum, d) => sum + d.volume, 0);
                const volumeText = `Vol (Recent): ${formatLargeNumber(totalVolume, 2)}`;
                const midpointPrice = (startEvent.priceLevel + endCandle.close) / 2;
                
                // Create the text label on the price axis
                chartRef.current.volumeLeg3TextPriceLine = candlestickSeries.createPriceLine({
                    price: midpointPrice,
                    color: 'transparent',
                    lineWidth: 0,
                    axisLabelVisible: true,
                    title: volumeText,
                });
            }
        }
    }, [data, liquidityEvents, showAnalysis]);

    // Effect to handle price scale mode changes
    useEffect(() => {
        if (!chartRef.current?.chart) return;
        const { chart } = chartRef.current;
        chart.priceScale('left').applyOptions({
            mode: scaleMode === 'logarithmic' ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
        });
    }, [scaleMode]);


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
