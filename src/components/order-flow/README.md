# Order Flow Navigator 🌊

The **Order Flow Navigator** is a high-performance suite of components designed for real-time analysis of market microstructure, capital deployment, and manipulation patterns. It provides traders with low-latency insights into how orders are being filled, where whales are moving, and whether the current price action is organic or manipulated.

## 🚀 Key Modules

### 🐋 Whale Sonar & Activity Monitor
(`order-flow-whale-activity.tsx`)
*   **Target Locking**: Real-time detection of massive capital deployment.
*   **Risk Profiling**: Categorizes whale moves as 'Critical' or 'Extreme' based on volume density.
*   **Sonar Logs**: Historical log of detected massive moves for post-analysis.

### 🛡️ Threat Pattern Detector
(`order-flow-threat-patterns.tsx`)
*   **Manipulation Flags**: Detects Spoofing, Layering, and Wash Trading in real-time.
*   **Severity Scoring**: Visual indicators for the health of the current order book.
*   **Contextual Alerts**: Provides human-readable explanations of detected suspicious activities.

### 📊 Live Order Stream
(`order-flow-live-orders.tsx`)
*   **Dual-View Terminal**: Separate tracks for Buys and Sells.
*   **Impact Highlighting**: Highlights "Institutional-sized" orders for immediate visual recognition.
*   **Real-time Velocity**: Tracks how fast the order book is turning over.

### 📉 Imbalance Charts
(`order-flow-charts.tsx`)
*   **Volume Imbalance**: Visualizes the delta between aggressive buyers and sellers.
*   **Heatmap Integration**: Tracks liquidity concentrations across the price ladder.
*   **Risk Overlay**: Overlays algorithmic risk scores directly on the price/volume data.

### 💡 Alpha Signals
(`order-flow-signals.tsx`)
*   **Sentiment Engine**: Algorithmic market sentiment based on total depth and order velocity.
*   **Trading Bias**: Provides 'Strong Buy' / 'Strong Sell' recommendations based on order flow delta.
*   **Volume Indicators**: Real-time "Flash" indicators for volume surges.

---

## 🛠️ Architecture

The module follows a highly modularized architecture to ensure performance and maintainability:

1.  **Core Data Hook (`useOrderFlow`)**: Centralized state management using WebSockets for real-time trade data.
2.  **Analyzers (`order-flow-analyzer.ts`)**: Pure logic utilities that flag manipulation and calculate risk scores.
3.  **Components**: Decoupled UI components that consume analyzed data via a consistent prop interface.
4.  **Exchange Proxy**: Secure routing of API requests to bypass CORS and ad-blockers for high-integrity data.

## 🚦 Getting Started

To use the Order Flow Navigator in a page:

```tsx
import { OrderFlowPage } from "@/components/order-flow/order-flow-overview";

export default function Page() {
  return <OrderFlowPage symbol="BTCUSDT" interval="1m" />;
}
```

## 📈 Optimization
The components use **Memoization** and **Ref-based tracking** to prevent unnecessary re-renders during high-frequency data bursts (100+ trades/sec), ensuring a smooth 60fps experience even during periods of extreme volatility.
