"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Eye,
  EyeOff,
  Plus,
  Minus,
  RotateCcw,
  Maximize2,
  Sliders,
  Settings,
  Layers,
  Sparkles,
  TrendingUp,
  Activity,
  Crosshair,
  BarChart2,
  LineChart,
} from "lucide-react";
import type {
  FootprintBubble,
  OHLCVCandle,
  CVDPoint,
  VolumeProfileData,
  DOMOrderEntryState,
  TradeTick,
  LiquidationEvent,
  CumulativeLiquidation,
  MarketProfileData,
} from "@/lib/orderflow/types";
import { MBOBookEngine } from "@/lib/orderflow/mbo-book-engine";
import { DeepDomToolbarState } from "./deepdom-bottom-toolbar";

interface UserDrawing {
  id: string;
  type: 'HLINE' | 'RAY' | 'RECT';
  price1: number;
  time1: number;
  price2?: number;
  time2?: number;
  color: string;
}

interface DeepDomCanvasChartProps {
  currentPrice: number;
  bestBid: number;
  bestAsk: number;
  bubbles: FootprintBubble[];
  candles?: OHLCVCandle[];
  cvdHistory: CVDPoint[];
  volumeProfile: VolumeProfileData;
  heatmapSlices: Array<{ timestamp: number; levels: Map<number, number> }>;
  liquidations?: LiquidationEvent[];
  cumulativeLiquidations?: CumulativeLiquidation[];
  marketProfile?: MarketProfileData;
  mboBook: MBOBookEngine;
  toolbarState: DeepDomToolbarState;
  onToggleFeature?: (key: keyof DeepDomToolbarState) => void;
  orderEntryState: DOMOrderEntryState;
  tickSize?: number;
  selectedTimeframe?: string;
  onSelectTimeframe?: (tf: string) => void;
  chartMode?: "CANDLES" | "LINE";
  activeRange?: string;
}

export function DeepDomCanvasChart({
  currentPrice,
  bestBid,
  bestAsk,
  bubbles,
  candles = [],
  cvdHistory,
  volumeProfile,
  heatmapSlices,
  liquidations = [],
  cumulativeLiquidations = [],
  marketProfile,
  mboBook,
  toolbarState,
  onToggleFeature,
  orderEntryState,
  tickSize = 0.25,
  selectedTimeframe = "1m",
  onSelectTimeframe,
  chartMode = "CANDLES",
  activeRange = "1D",
}: DeepDomCanvasChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport / Camera State
  const [viewport, setViewport] = useState({
    priceCenter: currentPrice || 7368.5,
    priceSpan: 36,
    timeWindowMs: 120000,
    offsetX: 0,
    offsetY: 0,
  });

  // Interactive Layer Visibility Toggles
  const [layers, setLayers] = useState({
    heatmap: true,
    candles: true,
    bubbles: true,
    volumeProfile: true,
    cvd: true,
    domLadder: true,
    algoDetection: true,
    gridlines: true,
    pocLine: true,
    volumeBars: true,
  });

  // Chart Style
  const [chartMode, setChartMode] = useState<'CANDLES' | 'BUBBLES' | 'LINE'>('CANDLES');

  // Drawing Tools State
  const [activeDrawingTool, setActiveDrawingTool] = useState<'NONE' | 'HLINE' | 'RAY'>('NONE');
  const [drawings, setDrawings] = useState<UserDrawing[]>([]);

  // Dragging & Scaling Mode
  const [dragMode, setDragMode] = useState<'PAN' | 'PRICE_SCALE' | 'TIME_SCALE' | 'RESIZE_VOL' | 'RESIZE_CVD' | 'RESIZE_LIQ' | 'RESIZE_DOM' | 'RESIZE_VP' | 'RESIZE_MP' | 'NONE'>('NONE');
  const [paneHeights, setPaneHeights] = useState({ volumeBars: 50, cvd: 80, liquidations: 80 });
  const [paneWidths, setPaneWidths] = useState({ domLadder: 120, volumeProfile: 85, marketProfile: 180 });
  const dragSnapshotRef = useRef<{
    startX: number;
    startY: number;
    startCenter: number;
    startSpan: number;
    startTimeWindow: number;
    startOffsetX: number;
    startVolumeHeight: number;
    startCvdHeight: number;
    startLiqHeight: number;
    startDomWidth: number;
    startVolWidth: number;
    startMpWidth: number;
  } | null>(null);

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Keep center aligned with market price initially
  useEffect(() => {
    if (currentPrice && Math.abs(viewport.priceCenter - currentPrice) > 100) {
      setViewport((prev) => ({ ...prev, priceCenter: currentPrice }));
    }
  }, [currentPrice]);

  // Effect to update time window when date range is selected
  useEffect(() => {
    let windowMs = 120000;
    switch(activeRange) {
      case "1D": windowMs = 24 * 60 * 60 * 1000; break;
      case "5D": windowMs = 5 * 24 * 60 * 60 * 1000; break;
      case "1M": windowMs = 30 * 24 * 60 * 60 * 1000; break;
      case "3M": windowMs = 90 * 24 * 60 * 60 * 1000; break;
      case "6M": windowMs = 180 * 24 * 60 * 60 * 1000; break;
      case "YTD": windowMs = (Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()); break;
      case "1Y": windowMs = 365 * 24 * 60 * 60 * 1000; break;
      case "5Y": windowMs = 5 * 365 * 24 * 60 * 60 * 1000; break;
      case "All": windowMs = 10 * 365 * 24 * 60 * 60 * 1000; break; // Arbitrary 10y limit
    }
    setViewport(prev => ({ ...prev, timeWindowMs: windowMs, offsetX: 0 }));
  }, [activeRange]);

  // Auto-Fit / Reset Viewport
  const handleAutoFit = useCallback(() => {
    setViewport({
      priceCenter: currentPrice,
      priceSpan: 36,
      timeWindowMs: 120000,
      offsetX: 0,
      offsetY: 0,
    });
  }, [currentPrice]);

  // === VIVID Heatmap Colormap (matching DeepDOM reference — bright cyan/teal) ===
  const getHeatmapColor = useCallback((volume: number, maxVol: number) => {
    if (volume <= 0) return "rgba(0, 0, 0, 0)";
    const ratio = Math.min(1, Math.max(0, volume / Math.max(1, maxVol)));

    if (ratio < 0.08) {
      return `rgba(0, 40, 60, ${0.55 + ratio * 3})`;
    } else if (ratio < 0.2) {
      return `rgba(0, 80, 120, ${0.65 + ratio * 1.5})`;
    } else if (ratio < 0.4) {
      return `rgba(0, 160, 200, ${0.7 + ratio * 0.5})`;
    } else if (ratio < 0.65) {
      return `rgba(0, 220, 255, ${0.8 + ratio * 0.15})`;
    } else if (ratio < 0.85) {
      // Hot orange/amber for large walls
      return `rgba(249, 115, 22, ${0.85 + ratio * 0.1})`;
    } else if (ratio < 0.95) {
      // Very hot - bright amber/yellow
      return `rgba(255, 200, 50, 0.95)`;
    } else {
      // Mega wall - near white glow
      return `rgba(255, 255, 220, 0.98)`;
    }
  }, []);

  // === Main Canvas Render Loop ===
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;

    // Layout dimensions
    const timeAxisHeight = 22;
    const volumeBarsHeight = (layers.volumeBars && toolbarState.showVolume) ? paneHeights.volumeBars : 0;
    const cvdHeight = (layers.cvd && toolbarState.showCvd) ? paneHeights.cvd : 0;
    const liqHeight = (toolbarState.showLiquidations) ? paneHeights.liquidations : 0;
    const priceScaleWidth = 65;
    const domLadderWidth = (layers.domLadder && toolbarState.showDom) ? paneWidths.domLadder : 0;
    const volumeProfileWidth = (layers.volumeProfile && toolbarState.showVolumeProfile) ? paneWidths.volumeProfile : 0;
    const rightMargin = priceScaleWidth + domLadderWidth + volumeProfileWidth;
    const bottomMargin = timeAxisHeight + volumeBarsHeight + cvdHeight + liqHeight;
    const chartHeight = height - bottomMargin;
    const chartWidth = width - rightMargin;

    // Clear canvas
    ctx.fillStyle = "#131722";
    ctx.fillRect(0, 0, width, height);

    // Price scaling coordinates
    const minPrice = viewport.priceCenter - viewport.priceSpan / 2 + viewport.offsetY;
    const maxPrice = viewport.priceCenter + viewport.priceSpan / 2 + viewport.offsetY;
    const priceToY = (p: number) =>
      chartHeight - ((p - minPrice) / (maxPrice - minPrice)) * chartHeight;
    const yToPrice = (y: number) =>
      minPrice + ((chartHeight - y) / chartHeight) * (maxPrice - minPrice);

    // Time scaling coordinates
    const now = heatmapSlices.length > 0
      ? heatmapSlices[heatmapSlices.length - 1].timestamp
      : Date.now();
    const startTime = now - viewport.timeWindowMs;
    const timeToX = (t: number) =>
      ((t - startTime) / viewport.timeWindowMs) * chartWidth + viewport.offsetX;
    const xToTime = (x: number) =>
      startTime + ((x - viewport.offsetX) / chartWidth) * viewport.timeWindowMs;

    // ============================================================
    // 1. Gridlines (subtle dark lines)
    // ============================================================
    if (layers.gridlines) {
      ctx.strokeStyle = "#1E222D";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      const priceStep = viewport.priceSpan > 100 ? 10.0 : viewport.priceSpan > 50 ? 5.0 : viewport.priceSpan > 20 ? 2.0 : 0.5;
      const startPriceGrid = Math.floor(minPrice / priceStep) * priceStep;

      for (let p = startPriceGrid; p <= maxPrice; p += priceStep) {
        const y = priceToY(p);
        if (y >= 0 && y <= chartHeight) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(chartWidth, y);
          ctx.stroke();
        }
      }

      // Vertical time gridlines
      const timeStepMs = viewport.timeWindowMs > 300000 ? 60000 : viewport.timeWindowMs > 60000 ? 30000 : 15000;
      const startTimeGrid = Math.floor(startTime / timeStepMs) * timeStepMs;
      for (let t = startTimeGrid; t <= now + timeStepMs; t += timeStepMs) {
        const x = timeToX(t);
        if (x >= 0 && x <= chartWidth) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, chartHeight);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]); // Reset line dash
    }

    // ============================================================
    // 2. VIVID Order Book Liquidity Heatmap (full coverage, bright cyan)
    // ============================================================
    if (layers.heatmap && heatmapSlices.length > 1) {
      let maxSliceVol = 50;
      for (const slice of heatmapSlices) {
        for (const [p, vol] of slice.levels.entries()) {
          if (p >= minPrice && p <= maxPrice && vol > maxSliceVol) {
            maxSliceVol = vol;
          }
        }
      }

      for (let i = 0; i < heatmapSlices.length - 1; i++) {
        const sliceA = heatmapSlices[i];
        const sliceB = heatmapSlices[i + 1];
        const x1 = timeToX(sliceA.timestamp);
        const x2 = timeToX(sliceB.timestamp);
        const blockW = Math.max(2, x2 - x1 + 1);

        for (const [p, vol] of sliceA.levels.entries()) {
          if (p >= minPrice - 2 && p <= maxPrice + 2) {
            const y = priceToY(p);
            const blockH = Math.max(3, Math.abs(priceToY(p - tickSize) - y) + 1);

            ctx.fillStyle = getHeatmapColor(vol, maxSliceVol);
            ctx.fillRect(x1, y - blockH / 2, blockW, blockH);
          }
        }
      }
    }

    // ============================================================
    // 3. POC & Value Area Lines
    // ============================================================
    if (layers.pocLine && volumeProfile && volumeProfile.pocPrice) {
      const pocY = priceToY(volumeProfile.pocPrice);
      if (pocY >= 0 && pocY <= chartHeight) {
        ctx.strokeStyle = "rgba(217, 70, 239, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(0, pocY);
        ctx.lineTo(chartWidth, pocY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#D946EF";
        ctx.font = "bold 9px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`POC ${volumeProfile.pocPrice.toFixed(2)}`, 10, pocY - 5);
      }
    }

    // ============================================================
    // 4. Japanese Candlesticks (thin, semi-transparent, always-on)
    // ============================================================
    if (chartMode === 'CANDLES' && layers.candles && candles && candles.length > 0) {
      const parseTimeframeToMs = (tf: string) => {
        const val = parseInt(tf.slice(0, -1)) || 1;
        const unit = tf.slice(-1);
        switch(unit) {
          case 's': return val * 1000;
          case 'm': return val * 60000;
          case 'h': return val * 3600000;
          case 'D': return val * 86400000;
          case 'W': return val * 604800000;
          default: return 60000;
        }
      };
      const candleSpanMs = parseTimeframeToMs(selectedTimeframe);
      const rawWidth = Math.abs(timeToX(startTime + candleSpanMs) - timeToX(startTime));
      // Adjust candle width to span the majority of the time bucket block (like footprint columns)
      const candleWidth = Math.max(2, rawWidth * 0.85);

      for (const candle of candles) {
        const cx = timeToX(candle.timestamp + candleSpanMs / 2);
        if (cx >= -20 && cx <= chartWidth + 20) {
          const isBullish = candle.close >= candle.open;
          const highY = priceToY(candle.high);
          const lowY = priceToY(candle.low);
          const openY = priceToY(candle.open);
          const closeY = priceToY(candle.close);
          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.max(1, Math.abs(closeY - openY));

          // Wick
          ctx.strokeStyle = isBullish ? "rgba(74, 222, 128, 0.9)" : "rgba(248, 113, 113, 0.9)";
          ctx.lineWidth = 2; // Slightly thicker wick for visibility
          ctx.beginPath();
          ctx.moveTo(cx, highY);
          ctx.lineTo(cx, lowY);
          ctx.stroke();

          // Body (semi-transparent so heatmap bleeds through)
          // Using very low alpha fill or just a stroke to match the "hollow" or transparent look in some footprint charts
          ctx.fillStyle = isBullish ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)";
          ctx.fillRect(cx - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

          // Body border
          ctx.strokeStyle = isBullish ? "rgba(74, 222, 128, 0.85)" : "rgba(248, 113, 113, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
        }
      }
    }

    // ============================================================
    // 5. Price Action Line (only in LINE mode)
    // ============================================================
    if (chartMode === 'LINE' && bubbles.length > 1) {
      ctx.strokeStyle = "rgba(200, 210, 220, 0.75)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        const bx = timeToX(b.timestamp);
        const by = priceToY(b.price);
        if (bx >= -20 && bx <= chartWidth + 20) {
          if (!started) { ctx.moveTo(bx, by); started = true; }
          else {
            const prev = bubbles[i - 1];
            ctx.lineTo(bx, priceToY(prev.price));
            ctx.lineTo(bx, by);
          }
        }
      }
      ctx.stroke();
    }

    // ============================================================
    // 6. Footprint Volume Bubbles — ALWAYS ON (like reference)
    // ============================================================
    if (layers.bubbles && toolbarState.showBubbles && bubbles.length > 0) {
      let maxBubbleVol = 30;
      for (const b of bubbles) {
        if (b.totalVolume > maxBubbleVol) maxBubbleVol = b.totalVolume;
      }

      const rMin = 4;
      const rMax = 22;

      for (const b of bubbles) {
        const bx = timeToX(b.timestamp);
        const by = priceToY(b.price);

        if (bx >= -40 && bx <= chartWidth + 40 && by >= -40 && by <= chartHeight + 40) {
          const ratio = b.totalVolume / maxBubbleVol;
          const radius = rMin + Math.sqrt(ratio) * (rMax - rMin);

          ctx.beginPath();
          ctx.arc(bx, by, radius, 0, Math.PI * 2);

          if (b.isBuyAggression) {
            ctx.fillStyle = "rgba(6, 200, 230, 0.45)";
            ctx.strokeStyle = "rgba(0, 242, 254, 0.85)";
            ctx.lineWidth = 1.5;
          } else {
            ctx.fillStyle = "rgba(217, 70, 239, 0.45)";
            ctx.strokeStyle = "rgba(244, 63, 94, 0.85)";
            ctx.lineWidth = 1.5;
          }

          ctx.fill();
          ctx.stroke();

          // Volume label — offset to the LEFT like DeepDOM reference
          if (b.totalVolume > maxBubbleVol * 0.15 || radius > 8) {
            const labelText = b.label || `${Math.round(b.totalVolume)}(${b.tradeCount})`;
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.font = "bold 9px ui-monospace, monospace";
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillText(labelText, bx - radius - 4, by);
          }
        }
      }
    }

    // ============================================================
    // 6.5 Liquidations Bubbles (Main Chart)
    // ============================================================
    if (toolbarState.showLiquidations && liquidations && liquidations.length > 0) {
      for (const liq of liquidations) {
        const lx = timeToX(liq.timestamp);
        const ly = priceToY(liq.price);
        
        if (lx >= -20 && lx <= chartWidth + 20 && ly >= -20 && ly <= chartHeight + 20) {
          // Calculate radius based on volume, similar to footprint bubbles
          const radius = Math.max(6, Math.min(24, Math.sqrt(liq.volume) * 0.1));
          
          ctx.beginPath();
          ctx.arc(lx, ly, radius, 0, Math.PI * 2);
          
          // REKT colors
          if (liq.side === "BUY") { // Short liquidation (buying to cover)
            ctx.fillStyle = "rgba(56, 189, 248, 0.6)"; // Sky Blue (Shorts REKT)
            ctx.strokeStyle = "rgba(14, 165, 233, 1)";
          } else { // Long liquidation (selling to cover)
            ctx.fillStyle = "rgba(251, 146, 60, 0.6)"; // Orange/Amber (Longs REKT)
            ctx.strokeStyle = "rgba(234, 88, 12, 1)";
          }
          
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();

          // X Icon in middle
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(lx - radius/2, ly - radius/2);
          ctx.lineTo(lx + radius/2, ly + radius/2);
          ctx.moveTo(lx + radius/2, ly - radius/2);
          ctx.lineTo(lx - radius/2, ly + radius/2);
          ctx.stroke();
          
          // Label above
          if (liq.volume > 1000) {
            const volStr = liq.volume > 1000 ? `${(liq.volume / 1000).toFixed(1)}k` : `${liq.volume.toFixed(0)}`;
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 9px ui-monospace, monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillText(volStr, lx, ly - radius - 2);
          }
        }
      }
    }
    // ============================================================
    // 6.6 Market Profile Overlay (TPO + Volume Profile + POC/VA/IB)
    // ============================================================
    if (toolbarState.showMarketProfile && marketProfile && marketProfile.levels.length > 0) {
      const mpTotalWidth = paneWidths.marketProfile;
      const mpProfileWidth = mpTotalWidth * 0.66; // pixel width for TPO columns
      const mpVolWidth = mpTotalWidth * 0.33;      // pixel width for volume histogram
      const mpGap = 3;            // gap between TPO and volume profile
      const mpStartX = 5;        // left margin

      // Find max TPO count and max volume for scaling
      let maxTPOCount = 1;
      let maxLevelVol = 1;
      for (const lvl of marketProfile.levels) {
        if (lvl.letters.length > maxTPOCount) maxTPOCount = lvl.letters.length;
        if (lvl.totalVolume > maxLevelVol) maxLevelVol = lvl.totalVolume;
      }

      // Calculate row height based on price aggregation
      const bucketSize = tickSize * 4;
      const rowH = Math.max(10, Math.abs(priceToY(0) - priceToY(bucketSize)));

      // Background overlay for the Market Profile area (semi-transparent)
      ctx.fillStyle = "rgba(8, 8, 15, 0.65)";
      ctx.fillRect(mpStartX - 2, 0, mpTotalWidth + 6, chartHeight);

      // Draw each TPO level
      for (const lvl of marketProfile.levels) {
        const y = priceToY(lvl.price);
        if (y < -rowH || y > chartHeight + rowH) continue;

        const letterBlockW = Math.max(8, (mpProfileWidth - 4) / Math.max(1, maxTPOCount));

        // TPO letter blocks
        for (let i = 0; i < lvl.letters.length; i++) {
          const letter = lvl.letters[i];
          const bx = mpStartX + i * letterBlockW;
          const by = y - rowH / 2;

          // Block background color
          if (lvl.isInsideVA) {
            ctx.fillStyle = "rgba(30, 60, 100, 0.55)"; // Blue-ish inside Value Area
          } else {
            ctx.fillStyle = "rgba(60, 30, 70, 0.40)";  // Purple-ish outside VA
          }
          ctx.fillRect(bx, by, letterBlockW - 1, rowH - 1);

          // Letter text
          ctx.fillStyle = lvl.isInsideVA ? "rgba(120, 180, 255, 0.9)" : "rgba(200, 150, 220, 0.8)";
          ctx.font = `bold ${Math.min(9, rowH - 2)}px ui-monospace, monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(letter, bx + letterBlockW / 2, y);
        }

        // Volume Profile histogram bar (right of TPO)
        const volBarX = mpStartX + mpProfileWidth + mpGap;
        const volBarMaxW = mpVolWidth - 4;
        const buyW = (lvl.buyVolume / maxLevelVol) * volBarMaxW;
        const sellW = (lvl.sellVolume / maxLevelVol) * volBarMaxW;

        // Buy volume (green)
        if (buyW > 0.5) {
          const buyColor = lvl.price === marketProfile.pocPrice
            ? "rgba(250, 204, 21, 0.85)" // Yellow POC highlight
            : (lvl.isInsideVA ? "rgba(34, 197, 94, 0.7)" : "rgba(34, 197, 94, 0.4)");
          ctx.fillStyle = buyColor;
          ctx.fillRect(volBarX, y - rowH / 2, buyW, rowH / 2 - 0.5);
        }

        // Sell volume (red)
        if (sellW > 0.5) {
          const sellColor = lvl.price === marketProfile.pocPrice
            ? "rgba(250, 204, 21, 0.85)"
            : (lvl.isInsideVA ? "rgba(239, 68, 68, 0.7)" : "rgba(239, 68, 68, 0.4)");
          ctx.fillStyle = sellColor;
          ctx.fillRect(volBarX, y, sellW, rowH / 2 - 0.5);
        }

        // Volume text value (beside the bar)
        if (lvl.totalVolume > maxLevelVol * 0.1) {
          ctx.fillStyle = "rgba(200, 200, 200, 0.6)";
          ctx.font = `${Math.min(8, rowH - 2)}px ui-monospace, monospace`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          const volText = lvl.totalVolume > 1000
            ? `${(lvl.totalVolume / 1000).toFixed(1)}k`
            : lvl.totalVolume.toFixed(0);
          ctx.fillText(volText, volBarX + Math.max(buyW, sellW) + 2, y);
        }
      }

      // POC Line (Yellow, dashed, full chart width)
      const mpPocY = priceToY(marketProfile.pocPrice);
      if (mpPocY >= 0 && mpPocY <= chartHeight) {
        ctx.strokeStyle = "rgba(250, 204, 21, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(0, mpPocY);
        ctx.lineTo(chartWidth, mpPocY);
        ctx.stroke();
        ctx.setLineDash([]);

        // POC label
        ctx.fillStyle = "#FACC15";
        ctx.font = "bold 9px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`POC ${marketProfile.pocPrice.toFixed(2)}`, mpStartX + mpTotalWidth + 10, mpPocY - 5);
      }

      // VAH Line (Cyan, dashed)
      const mpVahY = priceToY(marketProfile.vahPrice);
      if (mpVahY >= 0 && mpVahY <= chartHeight && marketProfile.vahPrice !== marketProfile.pocPrice) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(0, mpVahY);
        ctx.lineTo(chartWidth, mpVahY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#38BDF8";
        ctx.font = "bold 8px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`VAH ${marketProfile.vahPrice.toFixed(2)}`, mpStartX + mpTotalWidth + 10, mpVahY - 4);
      }

      // VAL Line (Cyan, dashed)
      const mpValY = priceToY(marketProfile.valPrice);
      if (mpValY >= 0 && mpValY <= chartHeight && marketProfile.valPrice !== marketProfile.pocPrice) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(0, mpValY);
        ctx.lineTo(chartWidth, mpValY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#38BDF8";
        ctx.font = "bold 8px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`VAL ${marketProfile.valPrice.toFixed(2)}`, mpStartX + mpTotalWidth + 10, mpValY + 10);
      }

      // Initial Balance Lines (Emerald/Teal, dotted)
      if (marketProfile.ibHigh > 0 && marketProfile.ibLow < Infinity) {
        const ibHighY = priceToY(marketProfile.ibHigh);
        const ibLowY = priceToY(marketProfile.ibLow);

        ctx.strokeStyle = "rgba(52, 211, 153, 0.6)";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);

        if (ibHighY >= 0 && ibHighY <= chartHeight) {
          ctx.beginPath();
          ctx.moveTo(0, ibHighY);
          ctx.lineTo(chartWidth, ibHighY);
          ctx.stroke();

          ctx.fillStyle = "#34D399";
          ctx.font = "bold 8px ui-monospace, monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(`IB High`, mpStartX + mpTotalWidth + 10, ibHighY - 4);
        }

        if (ibLowY >= 0 && ibLowY <= chartHeight) {
          ctx.beginPath();
          ctx.moveTo(0, ibLowY);
          ctx.lineTo(chartWidth, ibLowY);
          ctx.stroke();

          ctx.fillStyle = "#34D399";
          ctx.font = "bold 8px ui-monospace, monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(`IB Low`, mpStartX + mpTotalWidth + 10, ibLowY + 10);
        }

        ctx.setLineDash([]);

        // IB Range shading
        if (ibHighY >= 0 && ibLowY <= chartHeight) {
          ctx.fillStyle = "rgba(52, 211, 153, 0.04)";
          ctx.fillRect(0, Math.max(0, ibHighY), chartWidth, Math.min(chartHeight, ibLowY) - Math.max(0, ibHighY));
        }
      }

      // Open Price Marker (Red circle on the left)
      const openY = priceToY(marketProfile.openPrice);
      if (openY >= 0 && openY <= chartHeight && marketProfile.openPrice > 0) {
        ctx.beginPath();
        ctx.arc(mpStartX + 4, openY, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#EF4444";
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Close Price Marker (current — Green circle on the left)
      const closeY = priceToY(marketProfile.closePrice);
      if (closeY >= 0 && closeY <= chartHeight && marketProfile.closePrice > 0 && Math.abs(closeY - openY) > 6) {
        ctx.beginPath();
        ctx.arc(mpStartX + 4, closeY, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#22C55E";
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Current TPO Letter indicator (top-left corner)
      ctx.fillStyle = "rgba(20, 20, 30, 0.8)";
      ctx.fillRect(mpStartX, chartHeight - 22, 95, 18);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
      ctx.strokeRect(mpStartX, chartHeight - 22, 95, 18);
      ctx.fillStyle = "#38BDF8";
      ctx.font = "bold 9px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`TPO: ${marketProfile.currentLetter.toUpperCase()} | ${marketProfile.totalTPOCount} blks`, mpStartX + 4, chartHeight - 13);
    }

    // ============================================================
    // 7. Algo MBO Indicators: Icebergs & Spoofs
    // ============================================================
    if (layers.algoDetection) {
      const icebergs = mboBook.getRecentIcebergs();
      for (const ice of icebergs) {
        const ix = timeToX(ice.timestamp);
        const iy = priceToY(ice.price);
        if (ix >= 0 && ix <= chartWidth && iy >= 0 && iy <= chartHeight) {
          ctx.fillStyle = "#F59E0B";
          ctx.beginPath();
          ctx.arc(ix, iy, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.fillStyle = "#F59E0B";
          ctx.font = "bold 9px ui-monospace, monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(`⚡ICE ${ice.executedVolume}`, ix + 8, iy);
        }
      }
      const spoofs = mboBook.getRecentSpoofs();
      for (const sp of spoofs) {
        const sx = timeToX(sp.timestamp);
        const sy = priceToY(sp.price);
        if (sx >= 0 && sx <= chartWidth && sy >= 0 && sy <= chartHeight) {
          ctx.fillStyle = "rgba(244, 63, 94, 0.85)";
          ctx.font = "bold 9px ui-monospace, monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(`⚠ FAKE (${sp.size})`, sx + 5, sy - 8);
        }
      }
    }

    // ============================================================
    // 8. User Limit Orders & Queue Position
    // ============================================================
    const userOrders = mboBook.getAllUserTrackers();
    for (const uo of userOrders) {
      if (uo.status === "PENDING" || uo.status === "PARTIALLY_FILLED") {
        const uoy = priceToY(uo.price);
        ctx.strokeStyle = uo.side === "BID" ? "#22C55E" : "#D946EF";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(0, uoy);
        ctx.lineTo(chartWidth, uoy);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = uo.side === "BID" ? "#166534" : "#86198F";
        ctx.fillRect(chartWidth - 140, uoy - 10, 130, 20);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 9px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`YOUR #${uo.ordersAhead} (${uo.volumeAhead} vol)`, chartWidth - 135, uoy);
      }
    }

    // ============================================================
    // 9. User Drawings (S/R horizontal lines)
    // ============================================================
    for (const d of drawings) {
      if (d.type === 'HLINE') {
        const dy = priceToY(d.price1);
        ctx.strokeStyle = d.color || "#FBBF24";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, dy);
        ctx.lineTo(chartWidth, dy);
        ctx.stroke();

        ctx.fillStyle = d.color || "#FBBF24";
        ctx.font = "bold 9px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(d.price1.toFixed(2), 10, dy - 5);
      }
    }

    // ============================================================
    // 10. "Deepdom ®" Watermark (semi-transparent)
    // ============================================================
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.font = "bold 16px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("Deepdom ®", 15, chartHeight - 10);

    // ============================================================
    // 11. "Low Vola." Indicator (top-left canvas)
    // ============================================================
    ctx.fillStyle = "rgba(18, 18, 18, 0.7)";
    ctx.beginPath();
    ctx.arc(35, 55, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
    ctx.stroke();
    // Moon face icon
    ctx.fillStyle = "rgba(200, 200, 200, 0.7)";
    ctx.font = "16px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🌙", 35, 53);
    ctx.fillStyle = "rgba(200, 200, 200, 0.5)";
    ctx.font = "bold 9px ui-monospace, monospace";
    ctx.fillText("Low Vola.", 35, 78);

    // ============================================================
    // 12. RIGHT: Price Scale Column (65px)
    // ============================================================
    const psX = chartWidth;
    ctx.fillStyle = "#0D0D0D";
    ctx.fillRect(psX, 0, priceScaleWidth, chartHeight);
    ctx.strokeStyle = "#1E1E1E";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(psX, 0);
    ctx.lineTo(psX, chartHeight);
    ctx.stroke();

    // Price labels
    const priceStep = viewport.priceSpan > 100 ? 10.0 : viewport.priceSpan > 50 ? 5.0 : viewport.priceSpan > 20 ? 2.0 : 0.5;
    const startPriceGrid = Math.floor(minPrice / priceStep) * priceStep;
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let p = startPriceGrid; p <= maxPrice; p += priceStep) {
      const y = priceToY(p);
      if (y >= 10 && y <= chartHeight - 10) {
        const isAboveMid = p > currentPrice;
        ctx.fillStyle = isAboveMid ? "#E879F9" : "#4ADE80";
        ctx.fillText(p.toFixed(2), psX + priceScaleWidth - 4, y);
      }
    }

    // Current price beacon in price scale
    const cpY = priceToY(currentPrice);
    if (cpY >= 0 && cpY <= chartHeight) {
      // Background pill
      ctx.fillStyle = "#22C55E";
      ctx.fillRect(psX + 1, cpY - 9, priceScaleWidth - 2, 18);
      ctx.fillStyle = "#000000";
      ctx.font = "bold 10px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(currentPrice.toFixed(2), psX + priceScaleWidth / 2, cpY);

      // Arrow pointer
      ctx.fillStyle = "#22C55E";
      ctx.beginPath();
      ctx.moveTo(psX, cpY - 5);
      ctx.lineTo(psX - 5, cpY);
      ctx.lineTo(psX, cpY + 5);
      ctx.closePath();
      ctx.fill();
    }

    // Best bid/ask markers
    const bidY = priceToY(bestBid);
    const askY = priceToY(bestAsk);
    if (bidY >= 0 && bidY <= chartHeight) {
      ctx.fillStyle = "rgba(34, 197, 94, 0.3)";
      ctx.fillRect(psX + 1, bidY - 7, priceScaleWidth - 2, 14);
      ctx.fillStyle = "#4ADE80";
      ctx.font = "9px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(bestBid.toFixed(2), psX + priceScaleWidth / 2, bidY);
    }
    if (askY >= 0 && askY <= chartHeight) {
      ctx.fillStyle = "rgba(217, 70, 239, 0.3)";
      ctx.fillRect(psX + 1, askY - 7, priceScaleWidth - 2, 14);
      ctx.fillStyle = "#E879F9";
      ctx.font = "9px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(bestAsk.toFixed(2), psX + priceScaleWidth / 2, askY);
    }

    // ============================================================
    // 13. Volume Profile (far right, orange/amber)
    // ============================================================
    if (layers.volumeProfile && toolbarState.showVolumeProfile && volumeProfile) {
      const vpX = width - volumeProfileWidth;
      ctx.fillStyle = "#0A0A0A";
      ctx.fillRect(vpX, 0, volumeProfileWidth, chartHeight);
      ctx.strokeStyle = "#1A1A1A";
      ctx.beginPath();
      ctx.moveTo(vpX, 0);
      ctx.lineTo(vpX, chartHeight);
      ctx.stroke();

      // "OVP" label
      ctx.fillStyle = "#888888";
      ctx.font = "bold 9px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("OVP", vpX + volumeProfileWidth / 2, 4);

      const maxLevelVol = volumeProfile.pocVolume || 100;

      for (const lvl of volumeProfile.levels) {
        const y = priceToY(lvl.price);
        if (y >= 0 && y <= chartHeight) {
          const totalBarW = (lvl.totalVolume / maxLevelVol) * (volumeProfileWidth - 8);
          const barH = Math.max(2, chartHeight / (viewport.priceSpan / tickSize));

          // Orange/amber fill like the reference
          ctx.fillStyle = "rgba(249, 115, 22, 0.75)";
          ctx.fillRect(vpX + 3, y - barH / 2, totalBarW, barH);
        }
      }
    }

    // ============================================================
    // 14. DOM Depth Ladder with proportional color bars
    // ============================================================
    if (layers.domLadder && toolbarState.showDom) {
      const domX = chartWidth + priceScaleWidth;
      ctx.fillStyle = "#0B0B0B";
      ctx.fillRect(domX, 0, domLadderWidth, chartHeight);
      ctx.strokeStyle = "#1A1A1A";
      ctx.beginPath();
      ctx.moveTo(domX, 0);
      ctx.lineTo(domX, chartHeight);
      ctx.stroke();

      const l2 = mboBook.getL2Levels(40);
      const l2Map = new Map<number, { vol: number; side: "BID" | "ASK"; count: number }>();
      let maxDomVol = 10;
      for (const b of l2.bids) {
        l2Map.set(b.price, { vol: b.volume, side: "BID", count: b.orderCount });
        if (b.volume > maxDomVol) maxDomVol = b.volume;
      }
      for (const a of l2.asks) {
        l2Map.set(a.price, { vol: a.volume, side: "ASK", count: a.orderCount });
        if (a.volume > maxDomVol) maxDomVol = a.volume;
      }

      const rowH = Math.max(12, chartHeight / (viewport.priceSpan / tickSize));
      const startP = Math.floor(minPrice / tickSize) * tickSize;

      for (let p = startP; p <= maxPrice; p += tickSize) {
        const y = priceToY(p);
        if (y >= 4 && y <= chartHeight - 4) {
          const roundedP = mboBook.roundPrice(p);
          const entry = l2Map.get(roundedP);

          if (entry && entry.vol > 0) {
            const barRatio = Math.min(1, entry.vol / maxDomVol);
            const barW = barRatio * (domLadderWidth - 55);

            // Color-filled depth bar (matching reference)
            if (entry.side === "BID") {
              ctx.fillStyle = `rgba(0, 180, 220, ${0.15 + barRatio * 0.4})`;
              ctx.fillRect(domX + 50, y - rowH / 2, barW, rowH - 1);
            } else {
              ctx.fillStyle = `rgba(180, 50, 200, ${0.15 + barRatio * 0.4})`;
              ctx.fillRect(domX + 50, y - rowH / 2, barW, rowH - 1);
            }
          }

          // Price text
          ctx.fillStyle = "#777777";
          ctx.font = "9px ui-monospace, monospace";
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          ctx.fillText(roundedP.toFixed(2), domX + 48, y);

          // Volume text
          if (entry && entry.vol > 0) {
            ctx.fillStyle = entry.side === "BID" ? "#4ADE80" : "#E879F9";
            ctx.font = "bold 9px ui-monospace, monospace";
            ctx.textAlign = "left";
            ctx.fillText(`${entry.vol.toFixed(0)}`, domX + 52, y);
          }
        }
      }

      // Current Price Beacon in DOM
      if (cpY >= 0 && cpY <= chartHeight) {
        ctx.fillStyle = "#22C55E";
        ctx.fillRect(domX, cpY - 8, domLadderWidth, 16);
        ctx.fillStyle = "#000000";
        ctx.font = "bold 10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(currentPrice.toFixed(2), domX + domLadderWidth / 2, cpY);
      }
    }

    // ============================================================
    // 15. Time Axis (HH:MM:SS labels)
    // ============================================================
    const timeAxisY = chartHeight;
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, timeAxisY, width, timeAxisHeight);
    ctx.strokeStyle = "#1E1E1E";
    ctx.beginPath();
    ctx.moveTo(0, timeAxisY);
    ctx.lineTo(width, timeAxisY);
    ctx.stroke();

    const timeStepMs = viewport.timeWindowMs > 300000 ? 60000 : viewport.timeWindowMs > 60000 ? 30000 : 15000;
    const startTimeGrid = Math.floor(startTime / timeStepMs) * timeStepMs;
    ctx.font = "9px ui-monospace, monospace";
    ctx.fillStyle = "#777777";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let t = startTimeGrid; t <= now + timeStepMs; t += timeStepMs) {
      const x = timeToX(t);
      if (x >= 20 && x <= chartWidth - 20) {
        const d = new Date(t);
        const h = d.getHours().toString().padStart(2, '0');
        const m = d.getMinutes().toString().padStart(2, '0');
        const s = d.getSeconds().toString().padStart(2, '0');
        ctx.fillText(`${h}:${m}:${s}`, x, timeAxisY + timeAxisHeight / 2);
      }
    }

    // ============================================================
    // 16. Volume Bars Panel (separate, below chart)
    // ============================================================
    if (layers.volumeBars && toolbarState.showVolume && candles && candles.length > 0) {
      const volY = chartHeight + timeAxisHeight;
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, volY, width, volumeBarsHeight);
      ctx.strokeStyle = "#1A1A1A";
      ctx.beginPath();
      ctx.moveTo(0, volY);
      ctx.lineTo(width, volY);
      ctx.stroke();

      // "Volume" label
      ctx.fillStyle = "#555555";
      ctx.font = "bold 9px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Volume", 8, volY + 3);

      let maxCandleVol = 10;
      for (const c of candles) {
        if (c.volume > maxCandleVol) maxCandleVol = c.volume;
      }

      const parseTimeframeToMs = (tf: string) => {
        const val = parseInt(tf.slice(0, -1)) || 1;
        const unit = tf.slice(-1);
        switch(unit) {
          case 's': return val * 1000;
          case 'm': return val * 60000;
          case 'h': return val * 3600000;
          case 'D': return val * 86400000;
          case 'W': return val * 604800000;
          default: return 60000;
        }
      };
      const candleSpanMs = parseTimeframeToMs(selectedTimeframe);
      const barW = Math.max(2, Math.abs(timeToX(startTime + candleSpanMs) - timeToX(startTime)) * 0.6);

      for (const c of candles) {
        const cx = timeToX(c.timestamp + candleSpanMs / 2);
        if (cx >= -10 && cx <= chartWidth + 10) {
          const ratio = c.volume / maxCandleVol;
          const barH = ratio * (volumeBarsHeight - 16);
          const isBullish = c.close >= c.open;

          ctx.fillStyle = isBullish ? "rgba(34, 197, 94, 0.8)" : "rgba(239, 68, 68, 0.8)";
          ctx.fillRect(cx - barW / 2, volY + volumeBarsHeight - 4 - barH, barW, barH);
        }
      }
    }

    // ============================================================
    // 17. CVD & Delta Sub-Panel (bottom)
    // ============================================================
    if (layers.cvd && toolbarState.showCvd) {
      const cvdY = chartHeight + timeAxisHeight + volumeBarsHeight;
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, cvdY, width, cvdHeight);
      ctx.strokeStyle = "#1A1A1A";
      ctx.beginPath();
      ctx.moveTo(0, cvdY);
      ctx.lineTo(width, cvdY);
      ctx.stroke();

      const zeroY = cvdY + cvdHeight / 2;
      ctx.strokeStyle = "#222222";
      ctx.beginPath();
      ctx.moveTo(0, zeroY);
      ctx.lineTo(chartWidth, zeroY);
      ctx.stroke();

      ctx.fillStyle = "#555555";
      ctx.font = "bold 9px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("CVD", 8, cvdY + 3);

      if (cvdHistory.length > 1) {
        let maxAbsCvd = 100;
        let maxVol = 100;
        for (const c of cvdHistory) {
          if (Math.abs(c.cvd) > maxAbsCvd) maxAbsCvd = Math.abs(c.cvd);
          if (Math.abs(c.delta) > maxVol) maxVol = Math.abs(c.delta);
        }

        // Delta bars
        for (let i = 0; i < cvdHistory.length; i++) {
          const pt = cvdHistory[i];
          const bx = timeToX(pt.timestamp);
          const barH = (Math.abs(pt.delta) / Math.max(1, maxVol)) * (cvdHeight / 2 - 10);
          ctx.fillStyle = pt.delta >= 0 ? "rgba(34, 197, 94, 0.6)" : "rgba(217, 70, 239, 0.6)";
          ctx.fillRect(bx - 2, pt.delta >= 0 ? zeroY - barH : zeroY, 4, barH);
        }

        // CVD line
        ctx.strokeStyle = "#00D4FF";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < cvdHistory.length; i++) {
          const pt = cvdHistory[i];
          const cx = timeToX(pt.timestamp);
          const cy = zeroY - (pt.cvd / maxAbsCvd) * (cvdHeight / 2 - 10);
          if (cx >= 0 && cx <= chartWidth) {
            if (!started) { ctx.moveTo(cx, cy); started = true; }
            else { ctx.lineTo(cx, cy); }
          }
        }
        ctx.stroke();
      }
    }

    // ============================================================
    // 17.5 Liquidation Sub-Panel (bottom)
    // ============================================================
    if (toolbarState.showLiquidations) {
      const liqY = chartHeight + timeAxisHeight + volumeBarsHeight + cvdHeight;
      ctx.fillStyle = "#080808";
      ctx.fillRect(0, liqY, width, liqHeight);
      ctx.strokeStyle = "#1A1A1A";
      ctx.beginPath();
      ctx.moveTo(0, liqY);
      ctx.lineTo(width, liqY);
      ctx.stroke();

      ctx.fillStyle = "#555555";
      ctx.font = "bold 9px ui-monospace, monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Liquidations (Cumulative)", 8, liqY + 3);

      if (cumulativeLiquidations && cumulativeLiquidations.length > 1) {
        let maxCumLiq = 10;
        for (const c of cumulativeLiquidations) {
          if (c.longVol > maxCumLiq) maxCumLiq = c.longVol;
          if (c.shortVol > maxCumLiq) maxCumLiq = c.shortVol;
        }

        // Draw Long Liq line (Orange - longs rekt)
        ctx.strokeStyle = "#FB923C"; // Orange
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let startedL = false;
        for (let i = 0; i < cumulativeLiquidations.length; i++) {
          const pt = cumulativeLiquidations[i];
          const cx = timeToX(pt.timestamp);
          const cy = liqY + liqHeight - (pt.longVol / maxCumLiq) * (liqHeight - 15) - 5;
          if (cx >= 0 && cx <= chartWidth) {
            if (!startedL) { ctx.moveTo(cx, cy); startedL = true; }
            else { ctx.lineTo(cx, cy); }
          }
        }
        ctx.stroke();

        // Draw Short Liq line (Sky Blue - shorts rekt)
        ctx.strokeStyle = "#38BDF8"; // Sky Blue
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let startedS = false;
        for (let i = 0; i < cumulativeLiquidations.length; i++) {
          const pt = cumulativeLiquidations[i];
          const cx = timeToX(pt.timestamp);
          const cy = liqY + liqHeight - (pt.shortVol / maxCumLiq) * (liqHeight - 15) - 5;
          if (cx >= 0 && cx <= chartWidth) {
            if (!startedS) { ctx.moveTo(cx, cy); startedS = true; }
            else { ctx.lineTo(cx, cy); }
          }
        }
        ctx.stroke();
      }
    }

    // ============================================================
    // 18. Crosshair & HUD
    // ============================================================
    if (mousePos && mousePos.x <= chartWidth && mousePos.y <= chartHeight) {
      ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(width, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price tag on price scale
      const hoveredPrice = yToPrice(mousePos.y);
      ctx.fillStyle = "#1E222D"; // TradingView style dark
      ctx.fillRect(psX, mousePos.y - 9, priceScaleWidth, 18);
      ctx.strokeStyle = "#434651";
      ctx.strokeRect(psX, mousePos.y - 9, priceScaleWidth, 18);
      ctx.fillStyle = "#D1D5DB";
      ctx.font = "bold 10px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(hoveredPrice.toFixed(2), psX + priceScaleWidth / 2, mousePos.y);

      // Time tag on time axis
      const hoveredTime = xToTime(mousePos.x);
      const d = new Date(hoveredTime);
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
      ctx.fillStyle = "#1E222D";
      ctx.fillRect(mousePos.x - 28, chartHeight, 56, timeAxisHeight);
      ctx.strokeStyle = "#434651";
      ctx.strokeRect(mousePos.x - 28, chartHeight, 56, timeAxisHeight);
      ctx.fillStyle = "#D1D5DB";
      ctx.font = "9px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(timeStr, mousePos.x, chartHeight + timeAxisHeight / 2);
    }

    // ============================================================
    // 19. OHLC Tooltip HUD (TradingView style)
    // ============================================================
    if (mousePos && layers.candles && candles && candles.length > 0) {
      const hoveredTime = xToTime(mousePos.x);
      let nearest = candles[0];
      let minDist = Math.abs(hoveredTime - nearest.timestamp);
      for (const c of candles) {
        const dist = Math.abs(hoveredTime - c.timestamp);
        if (dist < minDist) {
          minDist = dist;
          nearest = c;
        }
      }
      
      if (minDist < 60000) { 
        const hudX = 15;
        const hudY = 32; 
        ctx.font = "11px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        
        const isBullish = nearest.close >= nearest.open;
        const color = isBullish ? "#4ADE80" : "#F87171";
        
        ctx.fillStyle = "#6B7280";
        ctx.fillText(`O`, hudX, hudY);
        ctx.fillStyle = color;
        ctx.fillText(`${nearest.open.toFixed(2)}`, hudX + 12, hudY);
        
        ctx.fillStyle = "#6B7280";
        ctx.fillText(`H`, hudX + 60, hudY);
        ctx.fillStyle = color;
        ctx.fillText(`${nearest.high.toFixed(2)}`, hudX + 72, hudY);
        
        ctx.fillStyle = "#6B7280";
        ctx.fillText(`L`, hudX + 120, hudY);
        ctx.fillStyle = color;
        ctx.fillText(`${nearest.low.toFixed(2)}`, hudX + 132, hudY);
        
        ctx.fillStyle = "#6B7280";
        ctx.fillText(`C`, hudX + 180, hudY);
        ctx.fillStyle = color;
        ctx.fillText(`${nearest.close.toFixed(2)}`, hudX + 192, hudY);
        
        ctx.fillStyle = "#6B7280";
        ctx.fillText(`Vol`, hudX + 240, hudY);
        ctx.fillStyle = "#E2E8F0";
        ctx.fillText(`${nearest.volume.toFixed(2)}`, hudX + 262, hudY);
      }
    }
  }, [
    viewport, currentPrice, bestBid, bestAsk, bubbles, candles, cvdHistory,
    volumeProfile, heatmapSlices, mboBook, toolbarState, layers, chartMode,
    drawings, getHeatmapColor, mousePos, tickSize,
    liquidations, cumulativeLiquidations, marketProfile,
  ]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        renderCanvas();
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderCanvas]);

  // RequestAnimationFrame Render Loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderCanvas();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [renderCanvas]);

  // Mouse Interaction: Wheel (Scroll Time vs Zoom)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom Time (TradingView defaults Ctrl+Wheel to time zoom)
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      setViewport((prev) => ({
        ...prev,
        timeWindowMs: Math.max(5000, Math.min(3600000, prev.timeWindowMs * zoomFactor)),
      }));
    } else {
      // Scroll Time (Pan left/right)
      const scrollFactor = e.deltaY > 0 ? 1 : -1;
      setViewport((prev) => ({
        ...prev,
        offsetX: prev.offsetX + scrollFactor * (prev.timeWindowMs * 0.05 / 1000) * 10, 
        // Just panning offsetX by raw pixels scaled slightly
        // e.deltaY is usually ~100 per tick.
      }));
    }
  };

  // Mouse Interaction: Pan & Scale Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const timeAxisHeight = 22;
    const volumeBarsHeight = (layers.volumeBars && toolbarState.showVolume) ? paneHeights.volumeBars : 0;
    const cvdHeight = (layers.cvd && toolbarState.showCvd) ? paneHeights.cvd : 0;
    const liqHeight = (toolbarState.showLiquidations) ? paneHeights.liquidations : 0;
    const priceScaleWidth = 65;
    const domLadderWidth = (layers.domLadder && toolbarState.showDom) ? paneWidths.domLadder : 0;
    const volumeProfileWidth = (layers.volumeProfile && toolbarState.showVolumeProfile) ? paneWidths.volumeProfile : 0;
    const chartHeight = rect.height - timeAxisHeight - volumeBarsHeight - cvdHeight - liqHeight;
    const chartWidth = rect.width - priceScaleWidth - domLadderWidth - volumeProfileWidth;

    dragSnapshotRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startCenter: viewport.priceCenter,
      startSpan: viewport.priceSpan,
      startTimeWindow: viewport.timeWindowMs,
      startOffsetX: viewport.offsetX,
      startVolumeHeight: paneHeights.volumeBars,
      startCvdHeight: paneHeights.cvd,
      startLiqHeight: paneHeights.liquidations,
    };

    // Drawing tool click
    if (activeDrawingTool === 'HLINE') {
      const clickedPrice = minPriceFromViewport() + ((chartHeight - y) / chartHeight) * viewport.priceSpan;
      setDrawings((prev) => [
        ...prev,
        { id: `draw-${Date.now()}`, type: 'HLINE', price1: clickedPrice, time1: Date.now(), color: '#FBBF24' },
      ]);
      setActiveDrawingTool('NONE');
      return;
    }

    const mpTotalWidth = (toolbarState.showMarketProfile && marketProfile) ? paneWidths.marketProfile : 0;
    const rightEdge = rect.width - priceScaleWidth;
    const domLeft = rightEdge - domLadderWidth;
    const volProfLeft = domLeft - volumeProfileWidth;

    if (layers.volumeBars && toolbarState.showVolume && Math.abs(y - (chartHeight + timeAxisHeight)) < 8) {
      setDragMode('RESIZE_VOL');
    } else if (layers.cvd && toolbarState.showCvd && Math.abs(y - (chartHeight + timeAxisHeight + volumeBarsHeight)) < 8) {
      setDragMode('RESIZE_CVD');
    } else if (toolbarState.showLiquidations && Math.abs(y - (chartHeight + timeAxisHeight + volumeBarsHeight + cvdHeight)) < 8) {
      setDragMode('RESIZE_LIQ');
    } else if (mpTotalWidth > 0 && Math.abs(x - (mpTotalWidth + 5)) < 6) { // +5 for margin
      setDragMode('RESIZE_MP');
    } else if (domLadderWidth > 0 && Math.abs(x - domLeft) < 6) {
      setDragMode('RESIZE_DOM');
    } else if (volumeProfileWidth > 0 && Math.abs(x - volProfLeft) < 6) {
      setDragMode('RESIZE_VP');
    } else if (x > chartWidth) {
      setDragMode('PRICE_SCALE');
    } else if (y > chartHeight) {
      setDragMode('TIME_SCALE');
    } else {
      setDragMode('PAN');
    }
  };

  const minPriceFromViewport = () => viewport.priceCenter - viewport.priceSpan / 2 + viewport.offsetY;

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    if (dragMode !== 'NONE' && dragSnapshotRef.current && canvasRef.current) {
      const snap = dragSnapshotRef.current;
      const dx = e.clientX - snap.startX;
      const dy = e.clientY - snap.startY;

      if (dragMode === 'PAN') {
        const timeAxisHeight = 22;
        const volumeBarsHeight = (layers.volumeBars && toolbarState.showVolume) ? paneHeights.volumeBars : 0;
        const cvdHeight = (layers.cvd && toolbarState.showCvd) ? paneHeights.cvd : 0;
        const liqHeight = (toolbarState.showLiquidations) ? paneHeights.liquidations : 0;
        const chartHeight = canvasRef.current.height - timeAxisHeight - volumeBarsHeight - cvdHeight - liqHeight;
        
        // Panning Price (Y axis) - TradingView pulls chart down when mouse moves down
        const priceDelta = (dy / Math.max(1, chartHeight)) * snap.startSpan;
        
        // Panning Time (X axis) - moving mouse right means showing older data (offsetX increases)
        const timeDeltaX = dx;
        
        setViewport((prev) => ({ 
          ...prev, 
          priceCenter: snap.startCenter + priceDelta,
          offsetX: snap.startOffsetX + timeDeltaX
        }));
      } else if (dragMode === 'PRICE_SCALE') {
        const scaleFactor = 1 - dy / 200;
        setViewport((prev) => ({
          ...prev,
          priceSpan: Math.max(2, Math.min(2000, snap.startSpan * scaleFactor)),
        }));
      } else if (dragMode === 'TIME_SCALE') {
        const scaleFactor = 1 - dx / 300;
        setViewport((prev) => ({
          ...prev,
          timeWindowMs: Math.max(5000, Math.min(7200000, snap.startTimeWindow * scaleFactor)),
        }));
      } else if (dragMode === 'RESIZE_VOL') {
        setPaneHeights((prev) => ({
          ...prev,
          volumeBars: Math.max(20, Math.min(600, snap.startVolumeHeight - dy)),
        }));
      } else if (dragMode === 'RESIZE_CVD') {
        setPaneHeights((prev) => ({
          ...prev,
          cvd: Math.max(20, Math.min(600, snap.startCvdHeight - dy)),
        }));
      } else if (dragMode === 'RESIZE_LIQ') {
        setPaneHeights((prev) => ({
          ...prev,
          liquidations: Math.max(20, Math.min(600, snap.startLiqHeight - dy)),
        }));
      } else if (dragMode === 'RESIZE_MP') {
        // dx > 0 means mouse moved right (increase width)
        setPaneWidths((prev) => ({
          ...prev,
          marketProfile: Math.max(80, Math.min(600, snap.startMpWidth + dx)),
        }));
      } else if (dragMode === 'RESIZE_DOM') {
        // dx < 0 means mouse moved left (increase width)
        setPaneWidths((prev) => ({
          ...prev,
          domLadder: Math.max(60, Math.min(400, snap.startDomWidth - dx)),
        }));
      } else if (dragMode === 'RESIZE_VP') {
        // dx < 0 means mouse moved left (increase width)
        setPaneWidths((prev) => ({
          ...prev,
          volumeProfile: Math.max(40, Math.min(300, snap.startVolWidth - dx)),
        }));
      }
    }
  };

  const handleMouseUp = () => {
    setDragMode('NONE');
    dragSnapshotRef.current = null;
  };

  const handleMouseLeave = () => {
    setDragMode('NONE');
    dragSnapshotRef.current = null;
    setMousePos(null);
  };

  const toggleLayer = (layerName: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layerName]: !prev[layerName] }));
  };

  const getCursorStyle = () => {
    if (dragMode === 'PRICE_SCALE') return 'cursor-ns-resize';
    if (dragMode === 'TIME_SCALE') return 'cursor-ew-resize';
    if (dragMode === 'RESIZE_VOL' || dragMode === 'RESIZE_CVD' || dragMode === 'RESIZE_LIQ') return 'cursor-row-resize';
    if (dragMode === 'RESIZE_MP' || dragMode === 'RESIZE_DOM' || dragMode === 'RESIZE_VP') return 'cursor-col-resize';
    
    if (mousePos) {
      const timeAxisHeight = 22;
      const volumeBarsHeight = (layers.volumeBars && toolbarState.showVolume) ? paneHeights.volumeBars : 0;
      const cvdHeight = (layers.cvd && toolbarState.showCvd) ? paneHeights.cvd : 0;
      const liqHeight = (toolbarState.showLiquidations) ? paneHeights.liquidations : 0;
      const priceScaleWidth = 65;
      const domLadderWidth = (layers.domLadder && toolbarState.showDom) ? paneWidths.domLadder : 0;
      const volumeProfileWidth = (layers.volumeProfile && toolbarState.showVolumeProfile) ? paneWidths.volumeProfile : 0;
      
      const chartHeight = (containerRef.current?.clientHeight || 0) - timeAxisHeight - volumeBarsHeight - cvdHeight - liqHeight;
      const chartWidth = (containerRef.current?.clientWidth || 0) - priceScaleWidth - domLadderWidth - volumeProfileWidth;

      const mpTotalWidth = (toolbarState.showMarketProfile && marketProfile) ? paneWidths.marketProfile : 0;
      const rightEdge = (containerRef.current?.clientWidth || 0) - priceScaleWidth;
      const domLeft = rightEdge - domLadderWidth;
      const volProfLeft = domLeft - volumeProfileWidth;

      if (layers.volumeBars && toolbarState.showVolume && Math.abs(mousePos.y - (chartHeight + timeAxisHeight)) < 8) return 'cursor-row-resize';
      if (layers.cvd && toolbarState.showCvd && Math.abs(mousePos.y - (chartHeight + timeAxisHeight + volumeBarsHeight)) < 8) return 'cursor-row-resize';
      if (toolbarState.showLiquidations && Math.abs(mousePos.y - (chartHeight + timeAxisHeight + volumeBarsHeight + cvdHeight)) < 8) return 'cursor-row-resize';
      
      if (mpTotalWidth > 0 && Math.abs(mousePos.x - (mpTotalWidth + 5)) < 6) return 'cursor-col-resize';
      if (domLadderWidth > 0 && Math.abs(mousePos.x - domLeft) < 6) return 'cursor-col-resize';
      if (volumeProfileWidth > 0 && Math.abs(mousePos.x - volProfLeft) < 6) return 'cursor-col-resize';

      if (mousePos.x > chartWidth) return 'cursor-ns-resize';
      if (mousePos.y > chartHeight) return 'cursor-ew-resize';
    }
    return 'cursor-crosshair';
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleAutoFit}
      className={`relative w-full h-full bg-[#0A0A0A] overflow-hidden select-none ${getCursorStyle()}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      {/* Top-Left Indicator Legend (matching TradingView) */}
      <div className="absolute top-2 left-2 z-30 flex flex-col gap-1 select-none pointer-events-auto">
        {/* Row 1: Symbol Info */}
        <div className="flex items-center gap-1.5 text-[13px]">
          <span className="font-semibold text-white">{orderEntryState.symbol}</span>
          <span className="text-[#B2B5BE]">Bitcoin / TetherUS • {selectedTimeframe} • BINANCE</span>
        </div>
        {/* Row 2: OHLCV */}
        <div className="flex items-center gap-2 text-[11px] font-mono mt-0.5">
          <span className="text-[#B2B5BE]">O<span className="text-[#089981] ml-0.5">{currentPrice.toFixed(2)}</span></span>
          <span className="text-[#B2B5BE]">H<span className="text-[#089981] ml-0.5">{(currentPrice + 5).toFixed(2)}</span></span>
          <span className="text-[#B2B5BE]">L<span className="text-[#F23645] ml-0.5">{(currentPrice - 3).toFixed(2)}</span></span>
          <span className="text-[#B2B5BE]">C<span className="text-[#089981] ml-0.5">{currentPrice.toFixed(2)}</span></span>
          <span className="text-[#B2B5BE] ml-2">Vol<span className="text-[#D1D4DC] ml-0.5">267.94K</span></span>
        </div>
        {/* Row 3: On-Chart Buy/Sell Buttons */}
        <div className="flex items-center gap-1 mt-2">
           <button 
             onClick={() => handleExecuteOrder('SELL')}
             className="flex items-center gap-2 px-3 py-1 bg-[#F23645]/10 hover:bg-[#F23645]/20 border border-[#F23645]/50 rounded text-[#F23645] transition-colors"
           >
              <span className="text-[10px] font-semibold">SELL</span>
              <span className="text-[13px] font-bold">{bestBid.toFixed(2)}</span>
           </button>
           <button className="flex flex-col items-center justify-center px-1 py-1 bg-[#1E222D] border border-[#2A2E39] rounded text-[#B2B5BE] w-6 hover:bg-[#2A2E39] transition-colors">
              <span className="text-[9px] font-mono leading-none">1.0</span>
           </button>
           <button 
             onClick={() => handleExecuteOrder('BUY')}
             className="flex items-center gap-2 px-3 py-1 bg-[#089981]/10 hover:bg-[#089981]/20 border border-[#089981]/50 rounded text-[#089981] transition-colors"
           >
              <span className="text-[13px] font-bold">{bestAsk.toFixed(2)}</span>
              <span className="text-[10px] font-semibold">BUY</span>
           </button>
        </div>
        
        {/* Indicator Row */}
        <div className="flex items-center gap-1 text-[11px] font-mono mt-2">
           <span className="text-[#B2B5BE]">Volume</span>
        </div>
      </div>
    </div>
  );
}
