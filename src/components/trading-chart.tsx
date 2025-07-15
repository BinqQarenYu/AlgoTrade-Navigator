

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
  data, 
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
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [spoofZone, setSpoofZone] = useState<{ top: number, bottom: number, startTime: number } | null>(null);
  const spoofZoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    if (!chartContainer || chartRef.current) return; // Exit if container not ready or chart already initialized

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
        pocColor: '#eab308',
        buySignalColor: '#22c55e',
        sellSignalColor: '#ef4444',
        // Indicator Colors
        smaShortColor: '#f59e0b',
        smaLongColor: '#8b5cf6',
        emaMediumColor: '#fb923c', // orange-400
        donchianUpperColor: '#4ade80', // green-400
        donchianLowerColor: '#f87171', // red-400
        donchianMiddleColor: 'rgba(148, 163, 184, 0.4)', // slate-400
        tenkanColor: '#38bdf8', // sky-400
        kijunColor: '#f472b6', // pink-400
        senkouAColor: 'rgba(38, 166, 154, 0.2)',
        senkouBColor: 'rgba(239, 83, 80, 0.2)',
        // Manipulation Phase Colors
        accumulationColor: 'rgba(250, 204, 21, 0.8)', // Yellow
        pumpColor: 'rgba(34, 197, 94, 0.8)',      // Green
        distributionColor: 'rgba(239, 68, 68, 0.8)', // Red
        accumulationVolumeColor: 'rgba(250, 204, 21, 0.4)',
        pumpVolumeColor: 'rgba(34, 197, 94, 0.4)',
        distributionVolumeColor: 'rgba(239, 68, 68, 0.4)',
        projectionColor: isDarkMode ? 'rgba(107, 114, 128, 0.5)' : 'rgba(209, 213, 219, 0.7)',
        projectionWickColor: isDarkMode ? 'rgba(156, 163, 175, 0.5)' : 'rgba(156, 163, 175, 0.7)',
        quantumMeanColor: '#60a5fa', // blue-400
        quantumSigmaColor: 'rgba(96, 165, 250, 0.2)', // blue-400 transparent
    };
    
    const chart = createChart(chartContainer, {
      layout: {
        background: { type: ColorType.Solid, color: chartColors.background },
        textColor: chartColors.textColor,
        fontSize: 10,
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
    
    const spoofingZoneSeries = chart.addCandlestickSeries({
        priceScaleId: 'left',
        upColor: 'rgba(239, 68, 68, 0.05)', // semi-transparent red
        downColor: 'rgba(239, 68, 68, 0.05)',
        wickVisible: false,
        borderVisible: false,
        autoscaleInfoProvider: () => null, // Prevents this series from affecting the main price scale
    });

    const manipulationZoneSeries = chart.addCandlestickSeries({
        priceScaleId: 'left',
        upColor: 'transparent',
        downColor: 'transparent',
        wickVisible: false,
        borderVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
        autoscaleInfoProvider: () => null,
    });

    const targetZoneSeries = chart.addCandlestickSeries({
        priceScaleId: 'left',
        upColor: 'rgba(59, 130, 246, 0.2)', // semi-transparent blue
        downColor: 'rgba(59, 130, 246, 0.2)', // semi-transparent blue
        wickVisible: false,
        borderVisible: false,
        autoscaleInfoProvider: () => null, // Prevents this series from affecting the main price scale
    });
    
    const quantumFieldSeries = chart.addCandlestickSeries({
        priceScaleId: 'left',
        wickVisible: false,
        borderVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
        autoscaleInfoProvider: () => null,
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
    
    const commonPanelOptions = {
        height: 80,
        priceScaleId: '',
        lastValueVisible: false,
        priceLineVisible: false,
    };
    const commonIndicatorPanelOptions = {
        ...commonPanelOptions,
        priceFormat: { type: 'volume', precision: 4 },
        priceScale: { autoScale: true, scaleMargins: { top: 0.1, bottom: 0.1 } },
    }

    chartRef.current = {
        chart,
        candlestickSeries,
        mainLineSeries,
        volumeSeries,
        spoofingZoneSeries,
        targetZoneSeries,
        manipulationZoneSeries,
        quantumFieldSeries,
        quantumMeanSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.quantumMeanColor }),
        quantumSigmaAreaSeries: chart.addAreaSeries({ ...commonLineOptions, color: chartColors.quantumSigmaColor, topColor: 'rgba(0,0,0,0)', bottomColor: 'rgba(0,0,0,0)' }),
        chartColors, // Store colors for later use
        smaShortSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.smaShortColor }),
        smaLongSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.smaLongColor }),
        emaMediumSeries: chart.addLineSeries({ ...commonLineOptions, color: chartColors.emaMediumColor }),
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
        gridPriceLines: [],
        matchedGridTradeLine: null,
        gridTradePriceLines: [],
        volumeLegLineSeries: chart.addLineSeries({ ...commonLineOptions, color: '#facc15', lineStyle: LineStyle.Dashed }),
        volumeLegTextPriceLine: null,
        volumeLeg2LineSeries: chart.addLineSeries({ ...commonLineOptions, color: '#fb923c', lineStyle: LineStyle.Dashed }),
        volumeLeg2TextPriceLine: null,
        volumeLeg3LineSeries: chart.addLineSeries({ ...commonLineOptions, color: '#60a5fa', lineStyle: LineStyle.Dashed }),
        volumeLeg3TextPriceLine: null,
        dumpLineSeries: chart.addLineSeries({ color: '#ef4444', lineWidth: 1, lineStyle: LineStyle.Dashed, ...commonLineOptions }),
        dumpVolumeTextPriceLine: null,
        // Physics Panels
        depthTotalSeries: chart.addLineSeries({ ...commonIndicatorPanelOptions, color: '#a78bfa' }),
        depthImbalanceSeries: chart.addLineSeries({ ...commonIndicatorPanelOptions, color: '#f472b6' }),
        stiffnessSeries: chart.addLineSeries({ ...commonIndicatorPanelOptions, color: '#f59e0b' }),
        pressureSeries: chart.addLineSeries({ ...commonIndicatorPanelOptions, color: '#ef4444' }),
        bpiSeries: chart.addLineSeries({ ...commonIndicatorPanelOptions, color: '#22c55e' }),
        bpiThresholdLine: null,
        sentimentSeries: chart.addLineSeries({ ...commonIndicatorPanelOptions, color: '#60a5fa' }),
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

  useEffect(() => {
    if (!chartRef.current || !combinedData) return;
    
    const { candlestickSeries, mainLineSeries, volumeSeries, smaShortSeries, smaLongSeries, emaMediumSeries, pocSeries, donchianUpperSeries, donchianMiddleSeries, donchianLowerSeries, tenkanSeries, kijunSeries, senkouASeries, senkouBSeries, chart, chartColors } = chartRef.current;

    if (combinedData.length > 0) {
        const sortedData = [...combinedData].sort((a, b) => a.time - b.time);
        const uniqueData = sortedData.filter((candle, index, self) =>
            index === 0 || candle.time > self[index - 1].time
        );
        if (uniqueData.length === 0) return;

        const firstPrice = uniqueData[0].close;
        let finalPrecision: number;
        
        if (firstPrice > 1000) { // e.g. BTC
            finalPrecision = 2;
        } else if (firstPrice > 10) { // e.g., ETH, SOL
            finalPrecision = 4;
        } else if (firstPrice > 0.1) { // e.g., ADA
            finalPrecision = 5;
        } else if (firstPrice > 0.0001) { // e.g., SHIB
            finalPrecision = 8;
        } else { // e.g., PEPE
            finalPrecision = 10;
        }
        
        const minMove = 1 / Math.pow(10, finalPrecision);

        const priceScale = chart.priceScale('left');
        const newPriceFormat = {
          type: 'price',
          precision: finalPrecision,
          minMove: minMove,
        };
        
        priceScale.applyOptions({
            autoScale: true,
            priceFormat: newPriceFormat,
        });
        
        candlestickSeries.applyOptions({ priceFormat: newPriceFormat });
        mainLineSeries.applyOptions({ priceFormat: newPriceFormat });
        
        const highlightColor = '#3b82f6';
        
        const isTradeHighlighted = (d: HistoricalData): boolean => {
            if (!highlightedTrade) return false;
            // Check if it's a BacktestResult or MatchedGridTrade
            if ('exitTime' in highlightedTrade && 'entryTime' in highlightedTrade) {
                return d.time >= highlightedTrade.entryTime && d.time <= highlightedTrade.exitTime;
            }
            return false;
        };
        
        const volumeChartData = uniqueData.map(d => {
            const isHighlighted = isTradeHighlighted(d);
            
            let phaseColor: string | null = null;
            if (showManipulationOverlay && manipulationResult?.isManipulationSuspected) {
                const { accumulationPeriod, pumpPeriod, distributionPeriod } = manipulationResult;
                if (accumulationPeriod && d.time >= accumulationPeriod.startTime && d.time <= accumulationPeriod.endTime) {
                    phaseColor = chartColors.accumulationVolumeColor;
                } else if (pumpPeriod && d.time >= pumpPeriod.startTime && d.time <= pumpPeriod.endTime) {
                    phaseColor = chartColors.pumpVolumeColor;
                } else if (distributionPeriod && d.time >= distributionPeriod.startTime && d.time <= distributionPeriod.endTime) {
                    phaseColor = chartColors.distributionVolumeColor;
                }
            }

            const defaultColor = d.close >= d.open ? chartColors.volumeUpColor : chartColors.volumeDownColor;
            const highlightedColor = 'rgba(59, 130, 246, 0.4)';
            return {
                time: toTimestamp(d.time),
                value: d.volume,
                color: isHighlighted ? highlightedColor : phaseColor || defaultColor,
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
        addLineSeries(emaMediumSeries, 'ema_medium');
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
            let marker = null;
            if (d.buySignal) {
              marker = { time: toTimestamp(d.time), position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'Buy' };
            }
            if (d.sellSignal) {
              marker = { time: toTimestamp(d.time), position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'Sell' };
            }
             if (d.predicted_next_pump_prob && d.predicted_next_pump_prob > 0.7) {
              marker = { time: toTimestamp(d.time), position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'Pump?'};
            }
            if (d.predicted_next_dump_prob && d.predicted_next_dump_prob > 0.7) {
              marker = { time: toTimestamp(d.time), position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'Dump?'};
            }
            if (d.predicted_next_burst_prob && d.predicted_next_burst_prob > 0.8) {
               marker = marker || { time: toTimestamp(d.time), position: 'belowBar', color: '#f59e0b', shape: 'circle', text: 'Burst!'};
            }
            return marker;
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

        const manipulationMarkers: any[] = [];
        if (showManipulationOverlay && manipulationResult?.isManipulationSuspected) {
            const { accumulationPeriod, pumpPeriod, distributionPeriod } = manipulationResult;
            if (accumulationPeriod?.startTime) {
                manipulationMarkers.push({
                    time: toTimestamp(accumulationPeriod.startTime),
                    position: 'belowBar',
                    color: '#facc15', // yellow-400
                    shape: 'arrowUp',
                    text: 'A',
                    size: 2,
                });
            }
            if (pumpPeriod?.startTime) {
                manipulationMarkers.push({
                    time: toTimestamp(pumpPeriod.startTime),
                    position: 'belowBar',
                    color: '#4ade80', // green-400
                    shape: 'arrowUp',
                    text: 'P',
                    size: 2.5,
                });
            }
            if (distributionPeriod?.startTime) {
                manipulationMarkers.push({
                    time: toTimestamp(distributionPeriod.startTime),
                    position: 'aboveBar',
                    color: '#f87171', // red-400
                    shape: 'arrowDown',
                    text: 'D',
                    size: 2.5,
                });
            }
        }
        
        const unmatchedGridMarkers = unmatchedGridTrades ? unmatchedGridTrades.map(trade => ({
            time: toTimestamp(trade.time),
            position: trade.side === 'buy' ? 'belowBar' : 'aboveBar',
            color: trade.side === 'buy' ? '#22c55e' : '#ef4444',
            shape: trade.side === 'buy' ? 'arrowUp' : 'arrowDown',
            text: 'Unmatched',
            size: 0.8,
        })) : [];

        const allMarkers = [...signalMarkers, ...liquidityMarkers, ...manipulationMarkers, ...unmatchedGridMarkers].sort((a, b) => a.time - b.time);

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
            
            const candlestickChartData = uniqueData.map((d) => {
                const isHighlighted = isTradeHighlighted(d);
                const isProjected = d.isProjected;
                
                let phaseColor: string | null = null;
                if (showManipulationOverlay && manipulationResult?.isManipulationSuspected) {
                  const { accumulationPeriod, pumpPeriod, distributionPeriod } = manipulationResult;
                  if (accumulationPeriod && d.time >= accumulationPeriod.startTime && d.time <= accumulationPeriod.endTime) {
                      phaseColor = chartColors.accumulationColor;
                  } else if (pumpPeriod && d.time >= pumpPeriod.startTime && d.time <= pumpPeriod.endTime) {
                      phaseColor = chartColors.pumpColor;
                  } else if (distributionPeriod && d.time >= distributionPeriod.startTime && d.time <= distributionPeriod.endTime) {
                      phaseColor = chartColors.distributionColor;
                  }
                }

                let coloring = {};
                
                const baseUpColor = d.close >= d.open ? chartColors.barUpColor : chartColors.barDownColor;
                const baseWickColor = d.close >= d.open ? chartColors.wickUpColor : chartColors.wickDownColor;

                if (isHighlighted) {
                    coloring = { color: highlightColor, wickColor: highlightColor };
                } else if (isProjected) {
                    coloring = { color: baseUpColor + '80', wickColor: baseWickColor + '80', borderVisible: true, borderColor: baseUpColor + '99' }; // Add alpha for transparency
                } else if (phaseColor) {
                    coloring = { color: phaseColor, wickColor: phaseColor };
                }

                return {
                    time: toTimestamp(d.time),
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close,
                    ...coloring
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
        emaMediumSeries.setData([]);
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

  }, [combinedData, highlightedTrade, liquidityEvents, showAnalysis, chartType, manipulationResult, showManipulationOverlay, unmatchedGridTrades]);

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
            emaMediumSeries,
            donchianUpperSeries,
            donchianMiddleSeries,
            donchianLowerSeries,
            tenkanSeries,
            kijunSeries,
            senkouASeries,
            senkouBSeries,
        } = chartRef.current;

        const allSeries = [
            smaShortSeries, smaLongSeries, emaMediumSeries, donchianUpperSeries, donchianMiddleSeries,
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
      if (!chartRef.current?.chart || !highlightedTrade || !combinedData || combinedData.length < 2) return;

      const { chart } = chartRef.current;
      const timeScale = chart.timeScale();
      
      const entryTime = 'buy' in highlightedTrade ? highlightedTrade.buy.time : highlightedTrade.entryTime;
      const exitTime = 'sell' in highlightedTrade ? highlightedTrade.sell.time : highlightedTrade.exitTime;
      
      const intervalMs = exitTime === entryTime 
        ? (combinedData[1].time - combinedData[0].time)
        : (exitTime - entryTime);

      const paddingMs = intervalMs * 20;

      const fromVisible = toTimestamp(entryTime - paddingMs);
      const toVisible = toTimestamp(exitTime + paddingMs);

      timeScale.setVisibleRange({
          from: fromVisible,
          to: toVisible,
      });

    }, [highlightedTrade, combinedData]);

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
                const title = wall.type === 'bid' ? ` BID WALL` : ` ASK WALL`;
                const line = candlestickSeries.createPriceLine({
                    price: wall.price,
                    color: wall.type === 'bid' ? '#3b82f6' : '#8b5cf6',
                    lineWidth: lineWidth,
                    lineStyle: LineStyle.Dotted,
                    axisLabelVisible: true,
                    title: title,
                    axisLabelColor: '#FFFFFF',
                    axisLabelTextColor: wall.type === 'bid' ? '#3b82f6' : '#8b5cf6',
                });
                newLines.push(line);
            });
        }
        chartRef.current.wallPriceLines = newLines;

    }, [wallLevels, lineWidth, showAnalysis]);

    // Effect for SPOOFED walls
    useEffect(() => {
      if (!chartRef.current?.chart || !showAnalysis || spoofedWalls.length === 0) return;
    
      const latestSpoof = spoofedWalls[spoofedWalls.length - 1];
    
      // Reset the timeout whenever a new spoof comes in
      if (spoofZoneTimeoutRef.current) {
        clearTimeout(spoofZoneTimeoutRef.current);
      }
    
      setSpoofZone(prevZone => {
        if (prevZone) {
          return {
            ...prevZone,
            top: Math.max(prevZone.top, latestSpoof.price),
            bottom: Math.min(prevZone.bottom, latestSpoof.price),
          };
        } else {
          return {
            top: latestSpoof.price,
            bottom: latestSpoof.price,
            startTime: toTimestamp(Date.now()),
          };
        }
      });
    
      // Set a timer to clear the zone after 1 minute of inactivity
      spoofZoneTimeoutRef.current = setTimeout(() => {
        setSpoofZone(null);
      }, 60000); // 1 minute
    
      return () => {
        if (spoofZoneTimeoutRef.current) {
          clearTimeout(spoofZoneTimeoutRef.current);
        }
      };
    }, [spoofedWalls, showAnalysis]);

    // Effect to draw the spoofing zone
    useEffect(() => {
      if (!chartRef.current?.chart) return;
      const { spoofingZoneSeries } = chartRef.current;
      if (!spoofingZoneSeries) return;
    
      if (spoofZone && showAnalysis) {
        const zoneData = [{
          time: spoofZone.startTime,
          open: spoofZone.top,
          high: spoofZone.top,
          low: spoofZone.bottom,
          close: spoofZone.bottom,
        }];
        spoofingZoneSeries.setData(zoneData);
      } else {
        spoofingZoneSeries.setData([]);
      }
    }, [spoofZone, showAnalysis]);

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
                    title: isBuySide ? ` BST (${formatPrice(target.priceLevel)})` : ` SST (${formatPrice(target.priceLevel)})`,
                });
                newLines.push(line);
            });
        }
        chartRef.current.targetPriceLines = newLines;

    }, [liquidityTargets, lineWidth, showAnalysis]);

    // Effect to draw the target zone box
    useEffect(() => {
      if (!chartRef.current?.chart || !combinedData || combinedData.length < 2) {
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
          const lastCandle = combinedData[combinedData.length - 1];
          const intervalMs = combinedData[1].time - combinedData[0].time;
          const futureBars = 20;

          const topPrice = buySideTarget.priceLevel;
          const bottomPrice = sellSideTarget.priceLevel;

          const boxData = [];
          
          let lastTime = 0;
          for(const candle of combinedData) {
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

  }, [combinedData, liquidityEvents, liquidityTargets, showAnalysis]);


    // Effect to draw consensus price dot and arrow
    useEffect(() => {
      if (!chartRef.current?.chart || !combinedData || combinedData.length < 2) {
        if (chartRef.current?.consensusPointSeries) {
          chartRef.current.consensusPointSeries.setData([]);
          chartRef.current.consensusArrowSeries.setMarkers([]);
        }
        return;
      }
    
      const { consensusPointSeries, consensusArrowSeries } = chartRef.current;
      if (!consensusPointSeries || !consensusArrowSeries) return;

      if (consensusResult && showAnalysis) {
        const lastCandle = combinedData[combinedData.length - 1];
        const intervalMs = combinedData[1].time - combinedData[0].time;
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
    }, [consensusResult, combinedData, showAnalysis]);

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

      if (!showAnalysis || combinedData.length < 2 || liquidityEvents.length < 2) return;
      
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
          const startIndex = combinedData.findIndex(d => d.time >= startEvent!.time);
          const endIndex = combinedData.findIndex(d => d.time >= endEvent!.time);

          if (startIndex > -1 && endIndex > -1) {
              const relevantCandles = combinedData.slice(startIndex, endIndex + 1);
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
    }, [combinedData, liquidityEvents, showAnalysis]);

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

        if (!showAnalysis || combinedData.length < 2 || liquidityEvents.length < 2) return;

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
            const startIndex = combinedData.findIndex(d => d.time >= startEvent.time);
            const endIndex = combinedData.findIndex(d => d.time >= endEvent.time);

            if (startIndex > -1 && endIndex > -1 && startIndex <= endIndex) {
                const relevantCandles = combinedData.slice(startIndex, endIndex + 1);
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
    }, [combinedData, liquidityEvents, showAnalysis]);

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

        if (!showAnalysis || combinedData.length < 2 || liquidityEvents.length < 1) return;

        const sortedEvents = [...liquidityEvents].sort((a, b) => a.time - b.time);
        const startEvent = sortedEvents[sortedEvents.length - 1]; // The very last grab
        const endCandle = combinedData[combinedData.length - 1]; // The current candle

        if (startEvent && endCandle && startEvent.time < endCandle.time) {
            // Draw the line
            volumeLeg3LineSeries.setData([
                { time: toTimestamp(startEvent.time), value: startEvent.priceLevel },
                { time: toTimestamp(endCandle.time), value: endCandle.close },
            ]);

            // Calculate volume
            const startIndex = combinedData.findIndex(d => d.time >= startEvent.time);
            
            if (startIndex > -1) {
                const relevantCandles = combinedData.slice(startIndex);
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
    }, [combinedData, liquidityEvents, showAnalysis]);
    
    // Effect for the Dump Analysis Line
    useEffect(() => {
        if (!chartRef.current?.chart) return;
        const { dumpLineSeries, candlestickSeries, dumpVolumeTextPriceLine } = chartRef.current;

        // Clear existing lines
        if (dumpLineSeries) dumpLineSeries.setData([]);
        if (dumpVolumeTextPriceLine) {
            candlestickSeries.removePriceLine(dumpVolumeTextPriceLine);
            chartRef.current.dumpVolumeTextPriceLine = null;
        }

        if (showManipulationOverlay && manipulationResult?.distributionPeriod && combinedData.length > 0) {
            const { startTime } = manipulationResult.distributionPeriod;
            
            const startIndex = combinedData.findIndex(d => d.time >= startTime);
            const startCandle = combinedData[startIndex];
            const endCandle = combinedData[combinedData.length - 1];

            if (startCandle && endCandle) {
                // Draw the line
                dumpLineSeries.setData([
                    { time: toTimestamp(startCandle.time), value: startCandle.close },
                    { time: toTimestamp(endCandle.time), value: endCandle.close },
                ]);

                // Calculate volume
                const relevantCandles = combinedData.slice(startIndex);
                const totalVolume = relevantCandles.reduce((sum, d) => sum + d.volume, 0);
                const volumeText = `Vol (Dump): ${formatLargeNumber(totalVolume, 2)}`;
                const midpointPrice = (startCandle.close + endCandle.close) / 2;

                // Create the text label on the price axis
                chartRef.current.dumpVolumeTextPriceLine = candlestickSeries.createPriceLine({
                    price: midpointPrice,
                    color: 'transparent',
                    lineWidth: 0,
                    axisLabelVisible: true,
                    title: volumeText,
                });
            }
        }
    }, [combinedData, manipulationResult, showManipulationOverlay]);

    // Effect to handle price scale mode changes
    useEffect(() => {
        if (!chartRef.current?.chart) return;
        const { chart } = chartRef.current;
        chart.priceScale('left').applyOptions({
            mode: scaleMode === 'logarithmic' ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
        });
    }, [scaleMode]);

    // Effect to draw grid lines and auto-zoom
    useEffect(() => {
      if (!chartRef.current || !chartRef.current.chart) return;
      const { candlestickSeries, chart } = chartRef.current;

      // Clear existing grid lines
      if (chartRef.current.gridPriceLines) {
        chartRef.current.gridPriceLines.forEach((line: any) => candlestickSeries.removePriceLine(line));
      }
      const newLines: any[] = [];

      if (gridLevels && gridLevels.length > 0) {
        let minPrice = gridLevels[0];
        let maxPrice = gridLevels[0];

        gridLevels.forEach(price => {
          if (price < minPrice) minPrice = price;
          if (price > maxPrice) maxPrice = price;

          const line = candlestickSeries.createPriceLine({
            price: price,
            color: '#888888', // Muted gray color
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: '',
          });
          newLines.push(line);
        });

        const priceRange = maxPrice - minPrice;
        const padding = priceRange * 0.1; // 10% padding
        
        candlestickSeries.applyOptions({
            autoscaleInfo: () => ({
                priceRange: {
                    minValue: minPrice - padding,
                    maxValue: maxPrice + padding,
                },
            }),
        });

      } else {
        // If grid is cleared, let the chart autoscale normally
        candlestickSeries.applyOptions({
            autoscaleInfo: undefined,
        });
      }

      chartRef.current.gridPriceLines = newLines;
    }, [gridLevels]);

    // Effect to draw grid trade markers (dots)
    useEffect(() => {
        if (!chartRef.current || !chartRef.current.chart) return;
        const { candlestickSeries } = chartRef.current;

        // Clear previous lines
        if (chartRef.current.gridTradePriceLines) {
            chartRef.current.gridTradePriceLines.forEach((line: any) => candlestickSeries.removePriceLine(line));
        }
        
        const newLines: any[] = [];
        const tradesToDraw = gridTrades.length > 0 ? gridTrades : matchedGridTrades.flatMap(t => [t.buy, t.sell]);

        if (tradesToDraw.length > 0) {
            tradesToDraw.forEach(trade => {
                const dotLine = candlestickSeries.createPriceLine({
                    price: trade.price,
                    color: trade.side === 'buy' ? '#22c55e' : '#ef4444',
                    lineWidth: 4, // Make it a short, thick line to look like a dot
                    lineStyle: LineStyle.Solid,
                    axisLabelVisible: false,
                });
                newLines.push(dotLine);
            });
        }
        
        chartRef.current.gridTradePriceLines = newLines;

    }, [gridTrades, matchedGridTrades]);

    // Effect for matched grid trade connector line
    useEffect(() => {
        if (!chartRef.current || !chartRef.current.chart) return;
        const { matchedGridTradeLine, chart } = chartRef.current;

        // Clear previous line
        if (matchedGridTradeLine) {
            chart.removeSeries(matchedGridTradeLine);
            chartRef.current.matchedGridTradeLine = null;
        }

        if (highlightedTrade && 'buy' in highlightedTrade) {
            const newLine = chart.addLineSeries({
                color: 'rgba(148, 163, 184, 0.7)', // slate-400
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                priceScaleId: 'left',
                lastValueVisible: false,
                priceLineVisible: false,
            });
            newLine.setData([
                { time: toTimestamp(highlightedTrade.buy.time), value: highlightedTrade.buy.price },
                { time: toTimestamp(highlightedTrade.sell.time), value: highlightedTrade.sell.price },
            ]);
            chartRef.current.matchedGridTradeLine = newLine;
        }
    }, [highlightedTrade]);
    
    // Effect for Physics Panels
    useEffect(() => {
        if (!chartRef.current?.chart || !physicsConfig) return;
        const { chart, depthTotalSeries, depthImbalanceSeries, stiffnessSeries, pressureSeries, bpiSeries, sentimentSeries, bpiThresholdLine: existingThresholdLine } = chartRef.current;
        const { showDepth, showImbalance, showStiffness, showPressure, showBPI, showSentiment, bpiThreshold } = physicsConfig;
        
        const setDataForPanel = (series: any, dataKey: keyof HistoricalData, visible: boolean) => {
            if (visible && combinedData.some(d => d[dataKey] != null)) {
                const panelData = combinedData
                    .filter(d => d[dataKey] != null)
                    .map(d => ({ time: toTimestamp(d.time), value: d[dataKey] as number }));
                series.setData(panelData);
                series.applyOptions({ visible: true });
            } else {
                series.setData([]);
                series.applyOptions({ visible: false });
            }
        };

        setDataForPanel(depthTotalSeries, 'depthTotal', showDepth);
        setDataForPanel(depthImbalanceSeries, 'depth_imbalance_ratio', showImbalance);
        setDataForPanel(stiffnessSeries, 'k1_stiffness_range', showStiffness);
        setDataForPanel(pressureSeries, 'pressure_depth', showPressure);
        setDataForPanel(bpiSeries, 'burst_potential_index_N', showBPI);
        setDataForPanel(sentimentSeries, 'sentimentScore', showSentiment);
        
        // Handle BPI Threshold line
        if (existingThresholdLine) {
            bpiSeries.removePriceLine(existingThresholdLine);
            chartRef.current.bpiThresholdLine = null;
        }
        if (showBPI && bpiThreshold > 0) {
            const newLine = bpiSeries.createPriceLine({
                price: bpiThreshold,
                color: '#ef4444',
                lineWidth: 1,
                lineStyle: LineStyle.Dotted,
                axisLabelVisible: true,
                title: 'Burst Threshold',
            });
            chartRef.current.bpiThresholdLine = newLine;
        }

    }, [physicsConfig, combinedData]);

    // Effect for Quantum Field
    useEffect(() => {
        if (!chartRef.current?.chart) return;
        const { quantumFieldSeries, quantumMeanSeries, quantumSigmaAreaSeries, chartColors } = chartRef.current;
        if (!quantumFieldSeries) return;

        if (quantumFieldData && quantumFieldData.length > 0) {
            const fieldData = quantumFieldData.map(timeStep => {
                const significantLevels = timeStep.priceLevels.filter(p => p.probability > 0.01);
                if (significantLevels.length === 0) return null;

                const minPrice = Math.min(...significantLevels.map(p => p.price));
                const maxPrice = Math.max(...significantLevels.map(p => p.price));
                
                const peakProbability = Math.max(...timeStep.priceLevels.map(p => p.probability));
                const opacity = (Math.min(1, peakProbability * 5) * 0.2).toFixed(3);
                const color = `hsla(197, 78%, 52%, ${opacity})`;

                return {
                    time: toTimestamp(timeStep.time),
                    open: minPrice, high: maxPrice, low: minPrice, close: maxPrice,
                    color: color, borderColor: color,
                };
            }).filter((d): d is any => d !== null);

            const meanLineData = quantumFieldData
                .filter(d => d.mean !== undefined)
                .map(d => ({ time: toTimestamp(d.time), value: d.mean! }));
            
            const sigmaAreaData = quantumFieldData
                .filter(d => d.mean !== undefined && d.sigma !== undefined)
                .map(d => ({
                    time: toTimestamp(d.time),
                    value: d.mean! + d.sigma!,
                    value2: d.mean! - d.sigma!
                }));

            quantumFieldSeries.setData(fieldData);
            quantumMeanSeries.setData(meanLineData);
            
            // For AreaSeries, it uses value for top and value2 for bottom.
            const areaSeriesData = sigmaAreaData.map(d => ({ time: d.time, value: d.value, value2: d.value2 }));
            quantumSigmaAreaSeries.setData(areaSeriesData.map(d => ({ time: d.time, value: d.value, value2: d.value2 })));
            quantumSigmaAreaSeries.applyOptions({
              lineColor: 'transparent',
              topColor: chartColors.quantumSigmaColor,
              bottomColor: chartColors.quantumSigmaColor,
            });

        } else {
            quantumFieldSeries.setData([]);
            quantumMeanSeries.setData([]);
            quantumSigmaAreaSeries.setData([]);
        }
    }, [quantumFieldData]);



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
