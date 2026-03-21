import React, { useEffect, useRef, useState, useMemo } from 'react';
import { type OrderFlowData, type VeryLargeActivity } from "@/hooks/use-order-flow";

interface TradingCommandCenterProps {
  orderFlowData: OrderFlowData[];
  activeVeryLargeActivity: VeryLargeActivity | null;
}

/**
 * High-performance HTML5 Canvas rendering engine for the Trading Command Center.
 * Meets the Jules Rule for handling 1,000s of data points over massive UI DOM-node inflation.
 */
export function TradingCommandCenter({ orderFlowData, activeVeryLargeActivity }: TradingCommandCenterProps) {
  const tapeCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const containerRef = useRef<HTMLDivElement>(null);

  // Internal visual state references so the animation loop doesn't require React re-renders to access data
  const visualStateRef = useRef({
    bubbles: [] as any[],
    spoofShadows: [] as any[],
    icebergs: [] as any[],
    volumeProfile: new Map<number, { buy: number, sell: number }>(),
    lastProcessedTimestamp: 0,
    lastProcessedId: '',
    priceRange: { min: Infinity, max: -Infinity },
  });

  // Track raw data mutations (The "Data Ingress" Worker)
  useEffect(() => {
    const state = visualStateRef.current;
    
    // In use-order-flow.ts, orderFlowData is PREPENDED (newest at index 0).
    // We need to find items newer than our last processed one.
    // We'll iterate from the end of the array (oldest) to the beginning (newest).
    const newOrdersIndices: number[] = [];
    
    for (let i = 0; i < orderFlowData.length; i++) {
      const order = orderFlowData[i];
      // Break if we hit an order we already processed
      if (order.timestamp < state.lastProcessedTimestamp) break;
      if (order.timestamp === state.lastProcessedTimestamp) {
          // If timestamp matches, verify by ID/Price to be sure it's the same
          // (Orders can arrive in the same ms)
          const orderId = order.id || `${order.price}-${order.size}`;
          if (orderId === state.lastProcessedId) break;
      }
      newOrdersIndices.push(i);
    }

    if (newOrdersIndices.length === 0) return;

    // Process from oldest to newest (of the new batch)
    for (let j = newOrdersIndices.length - 1; j >= 0; j--) {
      const order = orderFlowData[newOrdersIndices[j]];
      
      // 1. Tape Bubbles (Capped at 200 for LOD)
      state.bubbles.push({
        id: `${order.id || order.timestamp}-${Math.random()}`,
        price: order.price,
        size: Math.max(3, Math.min(order.size * 5, 40)), // Base radius scaling
        entropy: order.microstructure?.entropyScore || 0, // Glow
        type: order.orderType,
        x: 150 + (Math.random() * 40 - 20), // Center column roughly with scatter
        y: -50, // Start above the canvas and stream downwards
        speed: 1 + Math.random() * 2,
        alpha: 1
      });

      // 2. Heatmap & Volume Profile Aggregation
      const priceBucket = Math.floor(order.price / 10) * 10; // Bucket to nearest $10
      state.priceRange.min = Math.min(state.priceRange.min, priceBucket - 100);
      state.priceRange.max = Math.max(state.priceRange.max, priceBucket + 100);
      
      const existing = state.volumeProfile.get(priceBucket) || { buy: 0, sell: 0 };
      if (order.orderType === 'buy') existing.buy += order.size;
      else existing.sell += order.size;
      state.volumeProfile.set(priceBucket, existing);

      // 3. Truth Filters (Spoofing & Icebergs)
      if (order.microstructure?.isSpoofing) {
        state.spoofShadows.push({
          price: order.price,
          type: order.orderType,
          life: 300, 
          maxLife: 300 
        });
      }

      if (order.size > 15 || order.microstructure?.isToxicTrap) {
         state.icebergs.push({
           price: order.price,
           size: order.size,
           life: 1.0,
           type: order.orderType
         });
      }
    }

    // Update markers with the absolute newest order (index 0)
    const newest = orderFlowData[0];
    state.lastProcessedTimestamp = newest.timestamp;
    state.lastProcessedId = newest.id || `${newest.price}-${newest.size}`;

    // Memory Guard: Price-windowed Map purging & array culling (Circular Buffering)
    if (orderFlowData.length > 0) {
      const currentPrice = orderFlowData[0].price;
      const purgeThreshold = 500; // Purge buckets $500 away from current price
      
      for (let price of state.volumeProfile.keys()) {
        if (Math.abs(price - currentPrice) > purgeThreshold) {
          state.volumeProfile.delete(price);
        }
      }

      // Cap all auxiliary visual arrays to prevent O(n) memory growth
      if (state.bubbles.length > 200) state.bubbles = state.bubbles.slice(-200);
      if (state.spoofShadows.length > 100) state.spoofShadows = state.spoofShadows.slice(-100);
      if (state.icebergs.length > 50) state.icebergs = state.icebergs.slice(-50);
    }
  }, [orderFlowData]);

  // Main Canvas Render Loop (The "Graphics Controller")
  useEffect(() => {
    const renderLoop = () => {
      const tapeCanvas = tapeCanvasRef.current;
      const heatmapCanvas = heatmapCanvasRef.current;
      if (!tapeCanvas || !heatmapCanvas) {
         animationRef.current = requestAnimationFrame(renderLoop);
         return;
      }

      const tCtx = tapeCanvas.getContext('2d');
      const hCtx = heatmapCanvas.getContext('2d');
      if (!tCtx || !hCtx) return;

      const state = visualStateRef.current;
      const width = tapeCanvas.width;
      const height = tapeCanvas.height;
      const hWidth = heatmapCanvas.width;
      const hHeight = heatmapCanvas.height;

      // -----------------------------------------------------
      // RENDER TAPE (Bubble Stream)
      // -----------------------------------------------------
      tCtx.fillStyle = 'rgba(15, 23, 42, 0.3)'; 
      tCtx.fillRect(0, 0, width, height);

      for (let i = state.bubbles.length - 1; i >= 0; i--) {
        const bubble = state.bubbles[i];
        bubble.y += bubble.speed;
        
        const isBuy = bubble.type === 'buy';
        const coreColor = isBuy ? '57, 255, 20' : '255, 0, 127';
        const glowFactor = Math.floor((bubble.entropy || 0.5) * 20);
        
        tCtx.beginPath();
        tCtx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
        tCtx.shadowBlur = glowFactor;
        tCtx.shadowColor = `rgba(${coreColor}, 1)`;
        tCtx.fillStyle = `rgba(${coreColor}, ${bubble.alpha})`;
        tCtx.fill();
        
        tCtx.shadowBlur = 0;
        tCtx.beginPath();
        tCtx.arc(bubble.x - bubble.size * 0.3, bubble.y - bubble.size * 0.3, bubble.size * 0.2, 0, Math.PI * 2);
        tCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        tCtx.fill();

        if (bubble.y - bubble.size > height) {
          state.bubbles.splice(i, 1);
        }
      }

      // -----------------------------------------------------
      // RENDER HEATMAP & VOLUME PROFILE
      // -----------------------------------------------------
      hCtx.clearRect(0, 0, hWidth, hHeight);
      
      const { min: pMin, max: pMax } = state.priceRange;
      const priceSpan = pMax - pMin || 1000;
      const vpWidth = 120;
      const vpStartX = hWidth - vpWidth;
      
      hCtx.fillStyle = 'rgba(30, 41, 59, 0.4)'; 
      hCtx.fillRect(vpStartX, 0, vpWidth, hHeight);

      let maxVol = 0;
      state.volumeProfile.forEach(v => {
         if (v.buy + v.sell > maxVol) maxVol = v.buy + v.sell;
      });

      state.volumeProfile.forEach((v, price) => {
         const normalizedY = hHeight - ((price - pMin) / priceSpan) * hHeight;
         if (normalizedY < 0 || normalizedY > hHeight) return;

         const buyWidth = (v.buy / maxVol) * (vpWidth - 10);
         const sellWidth = (v.sell / maxVol) * (vpWidth - 10);
         const barHeight = Math.max(2, (10 / priceSpan) * hHeight);

         hCtx.fillStyle = 'rgba(57, 255, 20, 0.6)';
         hCtx.fillRect(vpStartX, normalizedY - barHeight/2, buyWidth, barHeight);
         
         hCtx.fillStyle = 'rgba(255, 0, 127, 0.6)';
         hCtx.fillRect(vpStartX + buyWidth, normalizedY - barHeight/2, sellWidth, barHeight);
      });

      // Truth Filters (Decay Logic & Rendering)
      for (let i = state.spoofShadows.length - 1; i >= 0; i--) {
        const shadow = state.spoofShadows[i];
        shadow.life -= 1;
        if (shadow.life <= 0) {
           state.spoofShadows.splice(i, 1);
           continue;
        }
        const normalizedY = hHeight - ((shadow.price - pMin) / priceSpan) * hHeight;
        const alpha = (shadow.life / shadow.maxLife) * 0.8;
        const spreadX = ((shadow.maxLife - shadow.life) / shadow.maxLife) * (hWidth - vpWidth);
        const shadowColor = shadow.type === 'buy' ? '57, 255, 20' : '255, 0, 127';
        
        const gradient = hCtx.createLinearGradient(0, 0, spreadX, 0);
        gradient.addColorStop(0, `rgba(${shadowColor}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${shadowColor}, 0)`);
        hCtx.fillStyle = gradient;
        hCtx.fillRect(hWidth/2 - spreadX/2, normalizedY - 5, spreadX, 10);
      }

      for (let i = state.icebergs.length - 1; i >= 0; i--) {
        const ice = state.icebergs[i];
        ice.life -= 0.005; 
        if (ice.life <= 0.1) {
           state.icebergs.splice(i, 1);
           continue;
        }
        const normalizedY = hHeight - ((ice.price - pMin) / priceSpan) * hHeight;
        hCtx.beginPath();
        hCtx.arc(100, normalizedY, Math.min(20, Math.max(5, ice.size)), 0, Math.PI * 2);
        hCtx.fillStyle = ice.type === 'buy' ? `rgba(57, 255, 20, ${ice.life * 0.5})` : `rgba(255, 0, 127, ${ice.life * 0.5})`;
        hCtx.shadowBlur = 15;
        hCtx.shadowColor = '#fff';
        hCtx.fill();
        hCtx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(renderLoop);
    };

    animationRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []); // Static loop: No dependencies to avoid recreation/flicker

  // Professional Resize Observer: Update canvas dimensions ONLY when layout shifts
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (tapeCanvasRef.current) {
          tapeCanvasRef.current.width = 300;
          tapeCanvasRef.current.height = entry.contentRect.height;
        }
        if (heatmapCanvasRef.current) {
          heatmapCanvasRef.current.width = entry.contentRect.width - 300;
          heatmapCanvasRef.current.height = entry.contentRect.height;
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col lg:flex-row h-[700px] w-full bg-[#0f172a] rounded-xl overflow-hidden shadow-2xl border border-slate-800">
      
      <div className="flex-1 relative border-r border-slate-800/80 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 overflow-hidden group">
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <h2 className="text-xl font-black text-white tracking-widest uppercase opacity-90">Microstructure Heatmap</h2>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full shadow-[0_0_10px_#39ff14] bg-[#39ff14]"></span> Bullish Volume
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full shadow-[0_0_10px_#ff007f] bg-[#ff007f]"></span> Bearish Volume
            </div>
          </div>
        </div>

        <canvas ref={heatmapCanvasRef} className="block absolute inset-0 w-full h-full" />
      </div>

      <div className="w-full lg:w-[300px] relative shrink-0 bg-[#0f172a] border-l-4 border-[#0f172a] shadow-[-10px_0_20px_rgba(0,0,0,0.5)] z-20">
        <div className="absolute top-0 right-0 w-full p-4 z-10 bg-gradient-to-b from-[#0f172a] to-transparent pointer-events-none">
           <div className="text-right font-black uppercase tracking-widest text-[#39ff14] text-xs">The Tape</div>
           <div className="text-right text-[10px] text-slate-400 font-mono mt-0.5">Size = Vol | Glow = Entropy</div>
        </div>

        <canvas ref={tapeCanvasRef} className="block absolute inset-0 w-full h-full" />
      </div>

    </div>
  );
}
