# 🛡️ Sentinel Machine: [MACHINE_NAME]

## 📋 Mission Statement
> One sentence defining the atomic purpose of this machine.
(e.g. "Real-time execution and risk guardrails for the BTC/USDT pair.")

---

## 🏗️ Cluster Role
- **Type**: [MOTHER (Writer) | CHILD (Reader) | HYBRID]
- **Responsibility**: [Monitoring | Execution | Analysis | Storage]
- **Sovereignty**: Can this machine run standalone for 10 hours if the Mother Node is offline? [YES | NO]

---

## ⚡ Performance Profile (The Resource Tax)
*Measured on Orange Pi 5 / Edge Node Targets:*
- **CPU Target**: < [X]% utilization during peak volatility.
- **RAM Ceiling**: [X] MB (Strict Memory Cap).
- **GPU Acceleration**: [Required | Optional] for [Canvas/Charting].
- **Network Load**: [High/Med/Low] (Binance WS Streams + Mother Sync).

---

## 🗃️ Data Dependency Map
*Which tables in `algo_trades.duckdb` does this machine touch?*

| Table Name | Operation | Purpose |
| :--- | :--- | :--- |
| `[table_name]` | [READ/WRITE/APPEND] | [Reason for access] |

---

## 🧩 Event Nervous System
*Key events this machine listens to or emits:*
- **Emits**: `[EVENT_NAME]` (e.g. `WHALE_DETECTED`)
- **Listens**: `[EVENT_NAME]` (e.g. `STOP_LOSS_TRIGGERED`)

---

## 🛰️ Sentinel Strategy (Offline Mode)
*Behavior during Mother-Node Network Split:*
1. **Detection**: How it knows the Mother is gone.
2. **Persistence**: Where it stores data locally (SSD Path).
3. **Recovery**: How it flushes to the Vault when online.

---

## 🧪 Compliance Checklist
✅ **Non-Blocking**: UI thread remains at 60fps during heavy work.
✅ **Isolation**: No shared state with other machines except via DuckDB/Broadcast Nerve.
✅ **Cleanup**: All WS streams and event listeners are disposed of on page unmount.
✅ **Integrity**: Every trade/signal is logged to `system_logs` for audit trails.
