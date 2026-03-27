# 🛰️ Sentinel Machine: Live Trader (The Executor)
`Location: src/app/(app)/live/`

## 📋 Mission Statement
> Execute high-frequency trading signals with strict risk manageability and zero-latency order routing.

---

## 🏗️ Cluster Role
- **Type**: **MOTHER (Writer/Executor)**
- **Responsibility**: Real-time trade execution, API management, and safety-stop monitoring.
- **Sovereignty**: **YES** (Must maintain trade state even if the Dashboard is closed).

---

## ⚡ Performance Profile (The Resource Tax)
*Measured on Orange Pi 5 / Edge Node Targets:*
- **CPU Target**: < 15% (Optimized for tick-by-tick event loops).
- **RAM Ceiling**: 256MB.
- **GPU Acceleration**: **Optional** (Primarily logic-driven).
- **Network Load**: **Extreme** (Direct low-latency streams to Binance + Mother Vault sync).

---

## 🗃️ Data Dependency Map
*Which tables in `algo_trades.duckdb` does this machine touch?*

| Table Name | Operation | Purpose |
| :--- | :--- | :--- |
| `active_trades` | **WRITE** | Recording every execution event and trailing stop. |
| `pnl_ledger` | **APPEND** | Logging closed positions and fee calculations. |
| `api_keys` | **READ/SECURE** | Accessing encrypted trade keys for execution. |

---

## 🧩 Event Nervous System
*Key events this machine listens to or emits:*
- **Emits**: `ORDER_EXECUTED`, `POSITION_CLOSED`, `API_LIMIT_REACHED`
- **Listens**: `ANOMALY_SIGNAL`, `MANUAL_OVERRIDE_CMD`, `GLOBAL_KILL_SWITCH`

---

## 🛰️ Sentinel Strategy (Offline Mode)
*Behavior during Mother-Node Network Split:*
1. **Detection**: Constant ping to the Mother Vault Gateway.
2. **Persistence**: Writes all execution logs to a local `trades_offline.duckdb` on SSD.
3. **Recovery**: Performs a transactional merge with the Mother Vault once connectivity hits 100%.

---

## 🧪 Compliance Checklist
✅ **Non-Blocking**: The trade loop is isolated from UI interactions to ensure no order latency.
✅ **Isolation**: This is the ONLY machine with permission to write to the `active_trades` table.
✅ **Cleanup**: Closes all active WebSocket streams on unexpected crash/unmount.
✅ **Integrity**: Every order is signed with a unique `client_order_id` for duplicate prevention.
