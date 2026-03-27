# 🛰️ The Sentinel Cluster Infrastructure

This directory contains the **8 Primary Sentinel Machines**. Each page is designed for OS-level process isolation, allowing any one of them to reach 100% CPU utilization without impacting the responsiveness of the others.

## 🗺️ Machine Mapping

| # | Terminal Page | Directory | Mission Profile |
| :--- | :--- | :--- | :--- |
| **1** | **Dashboard** | `dashboard/` | Global heartbeat and data orchestration. |
| **2** | **Backtester** | `backtest/` | Maximum-load historical simulation. |
| **3** | **Live Trader** | `live/` | Real-time execution and risk guardrails. |
| **4** | **Manual Pilot** | `manual/` | Manual trade override and hotkeys. |
| **5** | **AI Research** | `ai-research/` | Deep learning and sentiment analysis. |
| **6** | **Anomaly Radar** | `radar/` | High-ingestion microstructure detection. |
| **7** | **Order Auditor** | `order-flow/` | Post-trade analysis and ledger integrity. |
| **8** | **Settings Vault** | `settings/` | Global configuration and secret keys. |

## 🔗 The Shared Nervous System
1. **Central Database**: All machines share the `algo_trades.duckdb` via the **Mother Ingestor**.
2. **State Sync**: Real-time events (e.g., Whale Detect) are broadcasted across windows via the **Broadcast Nerve Service**.
3. **Execution Guard**: Only the **Live Trader (#3)** and **Manual Pilot (#4)** machines have permission to emit Binance API write-keys.

---

## 🛡️ Sentinel Standards
Each machine MUST adhere to the **Gold Standard Protocol**:
- **Non-Blocking**: UI thread must remain responsive even during local workload spikes.
- **Fail-Safe**: Each machine must handle the 10-hour "Mother Offline" scenario.
- **Atomic Purpose**: No logical bleeding between machines (e.g. Backtest code stays in `backtest/`).
