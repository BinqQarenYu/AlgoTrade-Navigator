"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Decimal } from "decimal.js";
import { useToast } from "@/hooks/use-toast";
import { DeepDomHeader } from "@/components/simulation/deepdom-header";
import { DeepDomBottomToolbar, DeepDomToolbarState } from "@/components/simulation/deepdom-bottom-toolbar";
import { DeepDomOrderEntry } from "@/components/simulation/deepdom-order-entry";
import { DeepDomReplayModal } from "@/components/simulation/deepdom-replay-modal";
import { DeepDomCanvasChart } from "@/components/simulation/deepdom-canvas-chart";
import { SeasonalAnalysis } from "@/components/seasonal-analysis";
import { TVLeftSidebar } from "@/components/simulation/tv-left-sidebar";
import { TVRightSidebar } from "@/components/simulation/tv-right-sidebar";
import { OrderFlowReplayEngine, ReplayFrameData } from "@/lib/orderflow/orderflow-replay-engine";
import { MBOBookEngine } from "@/lib/orderflow/mbo-book-engine";
import { ChevronDown, ChevronUp, Calendar } from "lucide-react";
import type {
  DOMOrderEntryState,
  ReplayConfig,
  FootprintBubble,
  OHLCVCandle,
  CVDPoint,
  VolumeProfileData,
  LiquidationEvent,
  CumulativeLiquidation,
  MarketProfileData,
} from "@/lib/orderflow/types";

export default function SimulationPage() {
  const { toast } = useToast();

  // Engine instance reference
  const replayEngineRef = useRef<OrderFlowReplayEngine | null>(null);

  // Core OrderFlow State
  const [currentPrice, setCurrentPrice] = useState<number>(96500.0);
  const [bestBid, setBestBid] = useState<number>(96499.0);
  const [bestAsk, setBestAsk] = useState<number>(96501.0);
  const [bubbles, setBubbles] = useState<FootprintBubble[]>([]);
  const [candles, setCandles] = useState<OHLCVCandle[]>([]);
  const [cvdHistory, setCvdHistory] = useState<CVDPoint[]>([]);
  const [volumeProfile, setVolumeProfile] = useState<VolumeProfileData>({
    levels: [],
    pocPrice: 96500.0,
    pocVolume: 0,
    vahPrice: 96600.0,
    valPrice: 96400.0,
    totalVolume: 0,
    totalDelta: 0,
  });
  const [heatmapSlices, setHeatmapSlices] = useState<Array<{ timestamp: number; levels: Map<number, number> }>>([]);
  const [liquidations, setLiquidations] = useState<LiquidationEvent[]>([]);
  const [cumulativeLiquidations, setCumulativeLiquidations] = useState<CumulativeLiquidation[]>([]);
  const [marketProfile, setMarketProfile] = useState<MarketProfileData>({
    levels: [], pocPrice: 0, pocVolume: 0, vahPrice: 0, valPrice: 0,
    ibHigh: 0, ibLow: 0, openPrice: 0, closePrice: 0,
    currentLetter: 'a', sessionStart: Date.now(), totalTPOCount: 0,
  });
  const [mboBook, setMboBook] = useState<MBOBookEngine>(() => new MBOBookEngine(1.0));

  // Replay State
  const [isReplayOpen, setIsReplayOpen] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [replayConfig, setReplayConfig] = useState<ReplayConfig>({
    symbol: "BTCUSDT",
    startDate: new Date().toISOString().slice(0, 16).replace("T", " "),
    speedMultiplier: 100,
    includeMBO: true,
    isPlaying: true,
    currentTime: Date.now(),
    startTime: Date.now() - 3600 * 1000,
    endTime: Date.now(),
  });

  // Timeframe State
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("15m");
  const [chartMode, setChartMode] = useState<"CANDLES" | "LINE">("CANDLES");
  const [activeRange, setActiveRange] = useState<string>("1D");

  // DOM Order Entry State
  const [orderEntryState, setOrderEntryState] = useState<DOMOrderEntryState>({
    symbol: "BTCUSDT",
    openQty: 0,
    openPnl: 0.0,
    dailyPnl: 33524.45,
    quantity: 1,
    broker: "SIM",
    account: "test",
    ticksDiff: 1,
    ocoEnabled: true,
    ocoMode: "SL/TP",
    slEnabled: true,
    tpEnabled: true,
    ocoUnit: "MONEY",
    ocoValue: 5000,
    beTicks: 0,
    executionLocation: "CLIENT",
    linkPendingOrders: false,
  });

  // Bottom Toolbar Toggles State
  const [toolbarState, setToolbarState] = useState<DeepDomToolbarState>({
    showCandles: true,
    showBubbles: true,
    showVolume: true,
    showVwap: true,
    showCvd: true,
    showImpLiquidity: true,
    showVolumeProfile: true,
    showRsProfile: true,
    showDeltaSpeed: true,
    showDom: true,
    showTradePanel: true,
    showTbs: true,
    showSeasonal: false,
    showLiquidations: false,
    showMarketProfile: false,
  });

  // Simulated Trading Positions
  const simulatedPositionsRef = useRef<Array<{
    id: string;
    side: 'BUY' | 'SELL';
    price: number;
    qty: number;
  }>>([]);

  // Initialize Replay Engine on Mount with Live Real Feed
  useEffect(() => {
    const engine = new OrderFlowReplayEngine("BTCUSDT", 1.0);
    replayEngineRef.current = engine;
    setMboBook(engine.getBookEngine());

    const unsubscribe = engine.subscribe((frame: ReplayFrameData) => {
      setCurrentPrice(frame.currentPrice);
      setBestBid(frame.bestBid);
      setBestAsk(frame.bestAsk);
      setBubbles([...frame.bubbles]);
      setCandles([...(frame.candles || [])]);
      setCvdHistory([...frame.cvdHistory]);
      setVolumeProfile(frame.volumeProfile);
      setHeatmapSlices([...frame.heatmapSlices]);
      setLiquidations([...(frame.liquidations || [])]);
      setCumulativeLiquidations([...(frame.cumulativeLiquidations || [])]);
      setMarketProfile(frame.marketProfile);

      // Calculate Open PnL on every frame tick using Decimal
      if (simulatedPositionsRef.current.length > 0) {
        let totalPnl = new Decimal(0);
        let netQty = 0;
        const currentP = new Decimal(frame.currentPrice);

        for (const pos of simulatedPositionsRef.current) {
          const entryP = new Decimal(pos.price);
          const posQty = new Decimal(pos.qty);

          if (pos.side === 'BUY') {
            const pnl = currentP.minus(entryP).times(posQty);
            totalPnl = totalPnl.plus(pnl);
            netQty += pos.qty;
          } else {
            const pnl = entryP.minus(currentP).times(posQty);
            totalPnl = totalPnl.plus(pnl);
            netQty -= pos.qty;
          }
        }

        setOrderEntryState((prev) => ({
          ...prev,
          openQty: netQty,
          openPnl: totalPnl.toNumber(),
        }));
      }
    });

    setIsPlaying(true);

    return () => {
      unsubscribe();
      engine.disconnectLiveFeed();
    };
  }, []);

  // Toolbar Toggle Handler
  const handleToggleFeature = (key: keyof DeepDomToolbarState) => {
    setToolbarState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Replay Control Handlers
  const handlePlay = () => {
    replayEngineRef.current?.play();
    setIsPlaying(true);
  };

  const handlePause = () => {
    replayEngineRef.current?.pause();
    setIsPlaying(false);
  };

  const handleReset = () => {
    replayEngineRef.current?.reset();
    setIsPlaying(false);
  };

  const handleSpeedChange = (speed: number) => {
    setReplayConfig((prev) => ({ ...prev, speedMultiplier: speed }));
    replayEngineRef.current?.setSpeed(speed);
  };

  const handleSymbolChange = (symbol: string) => {
    setReplayConfig((prev) => ({ ...prev, symbol }));
    setOrderEntryState((prev) => ({ ...prev, symbol }));
    replayEngineRef.current?.setSymbol(symbol);
    simulatedPositionsRef.current = [];
    setOrderEntryState((prev) => ({ ...prev, openQty: 0, openPnl: 0 }));
  };

  const handleIncludeMboChange = (include: boolean) => {
    setReplayConfig((prev) => ({ ...prev, includeMBO: include }));
    replayEngineRef.current?.setIncludeMBO(include);
  };

  // Simulated Order Execution Handler
  const handleExecuteOrder = (
    side: 'BUY' | 'SELL',
    orderType: 'MKT' | 'BID' | 'ASK' | 'LMT' | 'STP' | 'STP_LMT'
  ) => {
    const qty = orderEntryState.quantity;
    let execPrice = currentPrice;

    if (orderType === 'MKT') {
      execPrice = side === 'BUY' ? bestAsk : bestBid;
      simulatedPositionsRef.current.push({
        id: `pos-${Date.now()}`,
        side,
        price: execPrice,
        qty,
      });

      toast({
        title: `⚡ ${side} MKT Filled`,
        description: `Executed ${qty} @ ${execPrice.toFixed(2)} (${orderEntryState.broker})`,
      });
    } else {
      const offsetTicks = orderType === 'BID' ? 0 : orderType === 'ASK' ? 0 : orderEntryState.ticksDiff;
      const tick = replayConfig.symbol.includes('BTC') ? 1.0 : replayConfig.symbol.includes('ETH') ? 0.1 : 0.25;
      const targetPrice = side === 'BUY'
        ? (orderType === 'BID' ? bestBid : currentPrice - offsetTicks * tick)
        : (orderType === 'ASK' ? bestAsk : currentPrice + offsetTicks * tick);

      const userOrderId = `user-ord-${Date.now()}`;
      mboBook.registerUserOrder(userOrderId, side === 'BUY' ? 'BID' : 'ASK', targetPrice, qty);

      toast({
        title: `📋 ${side} ${orderType} Placed`,
        description: `${qty} @ ${targetPrice.toFixed(2)} — Tracking Queue Position in MBO Book`,
      });
    }
  };

  // Liquidation / Cancel Actions
  const handleCancelAll = () => {
    mboBook.clear();
    toast({
      title: "Orders Cancelled",
      description: "All pending limit orders removed from book.",
    });
  };

  const handleBreakeven = () => {
    toast({
      title: "Breakeven Applied",
      description: "Stop-Loss moved to average entry price.",
    });
  };

  const handleCancelAndFlat = () => {
    const currentPnl = orderEntryState.openPnl;
    simulatedPositionsRef.current = [];
    mboBook.clear();

    setOrderEntryState((prev) => ({
      ...prev,
      openQty: 0,
      openPnl: 0,
      dailyPnl: new Decimal(prev.dailyPnl).plus(currentPnl).toNumber(),
    }));

    toast({
      title: "🚨 Position Flattened & Cancelled",
      description: `Closed all open positions. Realized P/L: ${currentPnl >= 0 ? '+' : ''}${currentPnl.toFixed(2)} $`,
      variant: currentPnl >= 0 ? "default" : "destructive",
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-[#121212] overflow-hidden select-none border border-[#222222] rounded-md shadow-2xl">
      {/* Top Header */}
      <DeepDomHeader
        isReplayOpen={isReplayOpen}
        onToggleReplayModal={() => setIsReplayOpen(!isReplayOpen)}
        selectedTimeframe={selectedTimeframe}
        onSelectTimeframe={setSelectedTimeframe}
        chartMode={chartMode}
        onSelectChartMode={(mode) => setChartMode(mode as any)}
      />

      {/* Main Workspace Area: Order Entry (Left) + Canvas Chart & Seasonal Dock (Center) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* TV Drawing Tools Sidebar (Left) */}
        <TVLeftSidebar />

        {/* Center Area: Chart on Top + Seasonal Analysis at the Bottom */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Main Canvas Chart Area */}
          <div className="flex-1 w-full min-h-[300px] relative">
            <DeepDomCanvasChart
              currentPrice={currentPrice}
              bestBid={bestBid}
              bestAsk={bestAsk}
              bubbles={bubbles}
              candles={candles}
              cvdHistory={cvdHistory}
              volumeProfile={volumeProfile}
              heatmapSlices={heatmapSlices}
              liquidations={liquidations}
              cumulativeLiquidations={cumulativeLiquidations}
              marketProfile={marketProfile}
              mboBook={mboBook}
              toolbarState={toolbarState}
              onToggleFeature={handleToggleFeature}
              orderEntryState={orderEntryState}
              tickSize={replayConfig.symbol.includes('BTC') ? 1.0 : replayConfig.symbol.includes('ETH') ? 0.1 : 0.25}
              selectedTimeframe={selectedTimeframe}
              onSelectTimeframe={setSelectedTimeframe}
              chartMode={chartMode}
              activeRange={activeRange}
            />

            {/* Floating Draggable Replay Manager Modal */}
            <DeepDomReplayModal
              isOpen={isReplayOpen}
              onClose={() => setIsReplayOpen(false)}
              config={replayConfig}
              onSpeedChange={handleSpeedChange}
              onSymbolChange={handleSymbolChange}
              onIncludeMboChange={handleIncludeMboChange}
              onPlay={handlePlay}
              onPause={handlePause}
              onReset={handleReset}
              isPlaying={isPlaying}
            />
          </div>

          {/* Seasonal Analysis Section Anchored at the Bottom of the Graph */}
          {toolbarState.showSeasonal && (
            <div className="h-[260px] border-t border-[#262626] bg-[#141414] flex flex-col overflow-hidden">
              <div className="h-7 bg-[#1A1A1A] border-b border-[#2A2A2A] px-3 flex items-center justify-between text-xs font-mono text-gray-300 select-none">
                <div className="flex items-center gap-2 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Seasonal Analysis ({orderEntryState.symbol}) — Live 7-Year Multi-Period Cycle</span>
                </div>
                <button
                  onClick={() => handleToggleFeature('showSeasonal')}
                  className="text-gray-400 hover:text-gray-200 p-0.5"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 p-2 overflow-y-auto no-scrollbar">
                <SeasonalAnalysis symbol={orderEntryState.symbol.replace(/[^a-zA-Z0-9]/g, '')} />
              </div>
            </div>
          )}
        </div>

        {/* TV Right Sidebar (Watchlist & Details & Order Panel) */}
        <TVRightSidebar>
          <DeepDomOrderEntry
            state={orderEntryState}
            onStateChange={setOrderEntryState}
            onExecuteOrder={handleExecuteOrder}
            onCancelAll={handleCancelAll}
            onBreakeven={handleBreakeven}
            onCancelAndFlat={handleCancelAndFlat}
            onSelectSymbol={handleSymbolChange}
            symbols={["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "ES-232606"]}
          />
        </TVRightSidebar>
      </div>

      {/* Bottom Control Toolbar */}
      <DeepDomBottomToolbar
        toolbarState={toolbarState}
        onToggleFeature={handleToggleFeature}
        activeRange={activeRange}
        onSelectRange={setActiveRange}
      />
    </div>
  );
}
