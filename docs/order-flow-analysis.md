# Order Flow Analysis & Architecture

*This document is maintained under the Gold Standard Protocol v2.0.*

## 1. System Components
- `order-flow-overview.tsx`: Central Hub monitoring buffers, engine status, and sync state. Summarizes market sentiment and threat levels.
- `trading-chart-tab.tsx`: Composed Price Action combining Candlestick/line charts with Volume, Technical Indicators (RSI, MACD, BB, SMA, EMA), and Manipulation Risk Level Overlays.
- `order-flow-charts.tsx`: Advanced microstructure area/bar charts displaying Net Order Flow, Order Count Distributions, and average Risk Level tracking.
- `order-flow-whale-activity.tsx`: Real-time detection of massive capital deployment and categorizing extreme target locks.
- `order-flow-threat-patterns.tsx`: Classifies manipulation signatures including Spoofing, Layering, Scam Activity, and Order Padding in real-time.
- `order-flow-live-orders.tsx`: Dual-view terminal streaming high-impact live buys/sells.
- `order-flow-signals.tsx` & `order-flow-alerts.tsx`: Notification and sentiment-biased signals for guided execution.

## 2. Architecture & Data Flow
- `useOrderFlow.ts` feeds inputs via WebSockets.
- `order-flow-analyzer.ts` calculates Risk Scores (0-10), tags suspicious flags (spoofing, scam).
- `db-service.ts` pipes all Data to the Vault (DuckDB `algo_trades.duckdb`) making all telemetry 100% backtest-ready.

## 3. The Gold Standard Protocol constraints
1. **Zero-Inference:** Reference this document before modifying Order Flow structures.
2. **Resource Tax:** Every component rendering 100+ ticks/sec must utilize strict React.memo(), ref-based tracking, or HTML5 Canvas. No standard DOM nodes.
3. **Simulation Integrity:** If a new data point is tracked in UI, it MUST have a corresponding column in DuckDB for AI backtesting.
4. **Scale Validated:** Code must execute in O(1) or O(n) complexity to support 100+ parallel assets.
