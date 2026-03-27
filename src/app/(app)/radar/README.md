# 🛡️ Sentinel Machine: Anomaly Radar (The Radar)
`Location: src/app/(app)/radar/`

## 📋 Mission Statement
> Detect institutional whale activity, liquidation cascades, and order-book spoofing in real-time.

---

## 🏗️ Cluster Role
- **Type**: **CHILD (Injestor/Viewer)**
- **Responsibility**: Nanosecond-level microstructure analysis.
- **Sovereignty**: **YES** (Must detect local liquidations even if Mother is unreachable).

---

## ⚡ Performance Profile (The Resource Tax)
*Measured on Orange Pi 5 / Edge Node Targets:*
- **CPU Target**: < 30% (Optimized for filtering 1000+ trade events per second).
- **RAM Ceiling**: 384MB (Maintains large in-memory trade buffers).
- **GPU Acceleration**: **Required** for real-time order-book point-charting.
- **Network Load**: **Extreme** (Pulls every raw trade and liquidation from Binance WS).

---

## 🗃️ Data Dependency Map
*Which tables in `algo_trades.duckdb` does this machine touch?*

| Table Name | Operation | Purpose |
| :--- | :--- | :--- |
| `microstructure_events` | **WRITE** | Recording every whale and liquidation event. |
| `order_book_snapshots` | **APPEND** | Periodically logging liquidity shifts. |
| `anomaly_alerts` | **WRITE** | Signaling the Cluster when a threshold is met. |

---

## 🧩 Event Nervous System
*Key events this machine listens to or emits:*
- **Emits**: `WHALE_DETECTED`, `LIQUIDATION_CASCADE`, `VOLATILITY_SPIKE`
- **Listens**: `ANOMALY_FILTER_CONFIG_CHANGE`

---

## 🛰️ Sentinel Strategy (Offline Mode)
*Behavior during Mother-Node Network Split:*
1. **Detection**: Fails to ping the Mother's centralized Anomaly Service.
2. **Persistence**: Activates the local **SSD Micro-Vault** for raw event storage.
3. **Recovery**: Flushes all missed microstructure data as a bulk `INSERT` query.

---

## 🧪 Compliance Checklist
✅ **Non-Blocking**: Processing is decoupled from the UI using **Shared Workers**.
✅ **Isolation**: Focuses strictly on event detection; zero trade execution logic.
✅ **Cleanup**: All raw WS trade filters are destroyed upon dashboard exit.
✅ **Integrity**: Every event includes a Binance `T` (Transaction Time) for absolute sync.
