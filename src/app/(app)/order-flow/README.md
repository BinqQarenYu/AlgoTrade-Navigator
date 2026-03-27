# 🛡️ Sentinel Machine: Order Auditor (The Auditor)
`Location: src/app/(app)/order-flow/`

## 📋 Mission Statement
> Provide deep historical order-flow analysis and forensic auditing of every Cluster trade.

---

## 🏗️ Cluster Role
- **Type**: **CHILD (Reader/Inquisitor)**
- **Responsibility**: Performance auditing and trade-log integrity.
- **Sovereignty**: **NO** (Requires historical trade data from the Mother Vault).

---

## ⚡ Performance Profile (The Resource Tax)
*Measured on Orange Pi 5 / Edge Node Targets:*
- **CPU Target**: < 5% (Mostly static query work).
- **RAM Ceiling**: 128MB.
- **GPU Acceleration**: **Optional** (Charting only).
- **Network Load**: **Low** (Pulling audit data summaries).

---

## 🗃️ Data Dependency Map
*Which tables in `algo_trades.duckdb` does this machine touch?*

| Table Name | Operation | Purpose |
| :--- | :--- | :--- |
| `active_trades` | **READ** | Auditing every historical trade entry. |
| `pnl_ledger` | **READ** | Calculating equity shifts and fee leaks. |
| `system_logs` | **READ/WRITE** | Inspecting errors and appending audit notes. |

---

## 🧩 Event Nervous System
*Key events this machine listens to or emits:*
- **Emits**: `AUDIT_REPORT_GENERATED`
- **Listens**: `TRADE_COMPLETED`, `HEARTBEAT_ALL`

---

## 🛰️ Sentinel Strategy (Offline Mode)
*Behavior during Mother-Node Network Split:*
1. **Detection**: Connection timeout on audit query.
2. **Persistence**: Renders the "Last Known Consolidated Snapshot."
3. **Recovery**: Re-fetches the trade ledger once the connection is alive.

---

## 🧪 Compliance Checklist
✅ **Non-Blocking**: Audit queries are throttled to ensure no performance tax.
✅ **Isolation**: Read-only access to execution tables (no trade capability).
✅ **Cleanup**: Temporary in-memory audit buffers are cleared on exit.
✅ **Integrity**: Every audit result is checksummed against the Master DuckDB ID.
