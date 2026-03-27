# 🛰️ Sentinel Machine: Dashboard (The Command Center)
`Location: src/app/(app)/dashboard/`

## 📋 Mission Statement
> Provide a zero-latency global heartbeat and centralized visualization for all 8 machines.

---

## 🏗️ Cluster Role
- **Type**: **MOTHER (Reader/Orchestrator)**
- **Responsibility**: Heartbeat monitoring, signal aggregation, and visual alert routing.
- **Sovereignty**: **YES** (Can run standalone using local cached snapshots from DuckDB).

---

## ⚡ Performance Profile (The Resource Tax)
*Measured on Orange Pi 5 / Edge Node Targets:*
- **CPU Target**: < 10% (Mainly DOM updates and Canvas rendering).
- **RAM Ceiling**: 128MB.
- **GPU Acceleration**: **Required** for the global anomaly scatter plot.
- **Network Load**: **High** (Listens to all synchronized asset streams from the Cluster).

---

## 🗃️ Data Dependency Map
*Which tables in `algo_trades.duckdb` does this machine touch?*

| Table Name | Operation | Purpose |
| :--- | :--- | :--- |
| `system_logs` | **READ** | Displaying global machine heartbeats. |
| `microstructure_events` | **READ** | Visualizing whale/liquidation spikes on the dashboard. |
| `active_trades` | **READ** | Summarizing current equity and PnL. |

---

## 🧩 Event Nervous System
*Key events this machine listens to or emits:*
- **Emits**: `DASHBOARD_HEARTBEAT`
- **Listens**: `WHALE_DETECTED`, `ORDER_FILLED`, `ERROR_ALERT`

---

## 🛰️ Sentinel Strategy (Offline Mode)
*Behavior during Mother-Node Network Split:*
1. **Detection**: Listens for `VAULT_DISCONNECT` event.
2. **Persistence**: Renders a "Last Known Good Snapshot" from the local IndexedDB bridge.
3. **Recovery**: Re-fetches the last 5 minutes of logs once the Mother Node is back.

---

## 🧪 Compliance Checklist
✅ **Non-Blocking**: HUD overlays use `translate3d` (No React re-renders).
✅ **Isolation**: Primarily a "Viewer" node; does not execute trades directly.
✅ **Cleanup**: Disposes of all Global WebSocket aggregators on unmount.
✅ **Integrity**: Every visualization is time-synced to the Master DuckDB clock.
