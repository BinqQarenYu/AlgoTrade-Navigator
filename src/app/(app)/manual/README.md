# 🛡️ Sentinel Machine: Manual Pilot (The Pilot Interface)
`Location: src/app/(app)/manual/`

## 📋 Mission Statement
> Provide high-precision manual trade entry and override controls with zero-latency hotkeys.

---

## 🏗️ Cluster Role
- **Type**: **HYBRID (User-Driven Executor)**
- **Responsibility**: Instant user intervention and trade parameter manual tuning.
- **Sovereignty**: **YES** (Must be able to execute trades even if AI is offline).

---

## ⚡ Performance Profile (The Resource Tax)
*Measured on Orange Pi 5 / Edge Node Targets:*
- **CPU Target**: < 5% (Mostly idle until user interaction).
- **RAM Ceiling**: 128MB.
- **GPU Acceleration**: **Optional** (Charting only).
- **Network Load**: **Low** (Until a manual trade is fired).

---

## 🗃️ Data Dependency Map
*Which tables in `algo_trades.duckdb` does this machine touch?*

| Table Name | Operation | Purpose |
| :--- | :--- | :--- |
| `active_trades` | **READ/WRITE** | Updating manually entered positions. |
| `pnl_ledger` | **READ** | Checking daily manual trade caps. |

---

## 🧩 Event Nervous System
*Key events this machine listens to or emits:*
- **Emits**: `MANUAL_ENTRY_SIG`, `MANUAL_OVERRIDE_CMD`, `GLOBAL_KILL_SWITCH`
- **Listens**: `ORDER_EXECUTED_DASH`, `SIGNAL_ALERT`

---

## 🛰️ Sentinel Strategy (Offline Mode)
*Behavior during Mother-Node Network Split:*
1. **Detection**: UI indicator "OFFLINE_VOICE" (System audio cue).
2. **Persistence**: Logs the manual order to a local memory buffer for retry once connectivity restored.
3. **Recovery**: Re-syncs the "Manual Log" to the Mother Node's vault.

---

## 🧪 Compliance Checklist
✅ **Non-Blocking**: Hotkeys are event-driven to avoid any input lag.
✅ **Isolation**: Can bypass AI logic but respects Global Risk Guardrails.
✅ **Cleanup**: All UI event listeners for keyboard shortcuts are cleaned up on unmount.
✅ **Integrity**: Stores the `source: MANUAL` flag in every trade record.
