# Order Flow Navigator 🌊

The **Order Flow Navigator** is a high-performance suite of components designed for real-time analysis of market microstructure, capital deployment, technical indicators, and manipulation patterns. It provides traders with low-latency insights into how orders are being filled, where whales are moving, and whether the current price action is organic or manipulated.

## 🚀 Key Modules

### 🧭 System Overview & Telemetry
(`order-flow-overview.tsx`)
*   **Central Hub**: The primary dashboard bringing all metrics together.
*   **System Diagnostics**: Monitors buffer sizes, engine status, and sync state.
*   **Summarized Analysis**: Combines market sentiment, threat levels, and tactical recommendations.

### 📈 Trading Chart & Technicals
(`trading-chart-tab.tsx`)
*   **Composed Price Action**: Candlestick/line charts with volume and order flow risk overlays.
*   **Technical Integration**: Real-time extraction of RSI, MACD, Bollinger Bands, SMA, EMA.
*   **Live Pressure Metrics**: Live Buy vs Sell pressure indicators tied directly to chart intervals.

### 📉 Order Flow & Imbalance Charts
(`order-flow-charts.tsx`)
*   **Buy vs Sell Flow**: Area charts indicating bullish or bearish dominance.
*   **Risk Level Tracking**: Tracks live manipulation risk scores over time (0-10 scale).
*   **Order Count Distribution**: Bar charts showing absolute counts of buy and sell orders.
*   **Net Order Flow**: Evaluates the pure delta (buy volume - sell volume).

### 🐋 Whale Sonar & Activity Monitor
(`order-flow-whale-activity.tsx`)
*   **Target Locking**: Real-time detection of massive capital deployment.
*   **Risk Profiling**: Categorizes whale moves as 'Critical' or 'Extreme' based on volume density.

### 🛡️ Threat Pattern Detector
(`order-flow-threat-patterns.tsx`)
*   **Manipulation Flags**: Detects Spoofing, Layering, Scam Activity, and Order Padding in real-time.
*   **Severity Scoring**: Categorized hits by Low, Medium, High severity.

### 📊 Live Order Stream
(`order-flow-live-orders.tsx`)
*   **Dual-View Terminal**: Separate tracks for Buys and Sells.
*   **Impact Highlighting**: Highlights "Institutional-sized" orders for immediate visual recognition.

### 💡 Alpha Signals & Alerts
(`order-flow-signals.tsx` & `order-flow-alerts.tsx`)
*   **Sentiment Engine**: Algorithmic market sentiment based on total depth and order velocity.
*   **Real-time Alerts**: Notifications and guided alert popups for shifting market conditions.
*   **Stats Summary**: Modular `order-flow-stats.tsx` providing key high-level figures.

### 🌡️ Entropy HUD & Microstructure
(`entropy-hud.tsx`)
*   **Tactical Overlay**: Draggable glassmorphic HUD for real-time market state monitoring.
*   **Regime Classifier**: Identifies 'Toxic Pressure', 'Discovery', 'Bot Noise', and 'Chaos'.

---

## 🛠️ Architecture (HFT Performance Grade)

The module follows a highly optimized architecture following **Jules Rule for High-Frequency Data**:

1.  **Global Data Bus (`data-hub.ts`)**: Implements $O(1)$ transport cost via a **Global Batch Flush** strategy. Data for all symbols is pooled and flushed every 5 seconds in one batch request.
2.  **LOD Decimation (`use-order-flow.ts`)**: Enforces **Level of Detail (LOD)** decimation on state. Trade arrays are capped (e.g., 200 items) to prevent DOM-node inflation.
3.  **Canvas Drawing Engine (`trading-command-center.tsx`)**: Utilizes low-level HTML5 Canvas. Uses a `ResizeObserver` for passive dimensioning and price-windowed `Map` purging for the Volume Profile.
4.  **Microstructure AI (`microstructure-service.ts`)**: Deep analysis of Shannon Entropy, VPIN, and Order Book Skew.

## 🚦 Getting Started

To use the Order Flow suite:

```tsx
import OrderFlowPage from "@/app/(app)/order-flow/page";
```

## 📈 Optimization
The components heavily utilize **Ref-based tracking** and **Passive Canvas loops** to handle bursts (1,000+ trades/sec) securely buffered before reaching the UI or DB layer.

