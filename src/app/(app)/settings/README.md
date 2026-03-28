# 🛡️ Sentinel Machine: Settings Vault (The Command Center)
`Location: src/app/(app)/settings/`

## 📋 Mission Statement
> Centralize global configuration, API encryption, and Distributed Cluster Health monitoring.

---

## 🏗️ Distributed Architecture: "Child-is-King"
The AlgoTrade-Navigator operates on a resilient Mother-Child model to ensure 24/7 data fidelity:

- **CHILD NODE (Orange Pi / Edge Node)**:
    - **Role**: **Primary 24/7 Data Gatherer**.
    - **Sovereignty**: Operations are autonomous. Data is first vaulted to a local SQLite database (`sentry_vault.db`) to survive network partitions before syncing to the Mother.
- **MOTHER NODE (This Node)**:
    - **Role**: **Vault & Failover Sentinel**.
    - **Failover Watcher**: Continuously monitors the Child Node's heartbeat. If the Child is silent for >30s, the Mother automatically activates its own `HeadlessSentry` to prevent data gaps.
    - **UI Indication**: The Settings dashboard provides real-time "Pulse" monitoring of the distributed cluster.

---

## ⚡ Performance Profile (The Resource Tax)
*Measured on Orange Pi 5 / Edge Node Targets:*
- **CPU Target**: < 1% (Inactive until failover/config change).
- **RAM Ceiling**: 64MB.
- **Failover Latency**: High-fidelity detection within 15-30s.

---

## 🗃️ Data Dependency Map
*Which tables in `algo_trades.duckdb` does this machine touch?*

| Table Name | Operation | Purpose |
| :--- | :--- | :--- |
| `strategy_config` | **READ/WRITE** | Managing global trade parameter shifts. |
| `api_keys` | **READ/WRITE** | Persisting encoded trade keys. |
| `trades` | **MIGRATION** | Added `machine_id` for multi-node auditing. |
| `microstructure_events` | **MIGRATION** | Added `machine_id` for anomaly source tracking. |

---

## 🧩 Event Nervous System
*Key events this machine listens to or emits:*
- **Emits**: `CONFIG_REFRESH_CMD`, `GLOBAL_KILL_SWITCH`, `FAILOVER_ACTIVATED`
- **Listens**: `CHILD_HEARTBEAT` (Periodic pulse from distributed nodes).

---

## 🛰️ Sentinel Strategy (3-Stage Failover)
*Mother behavior during Child Node outage:*
1. **Detection**: `startFailoverWatch()` monitors `lastChildHeartbeat` timestamp every 15s.
2. **Auto-Respawn**: If `now() - pulse > 30s`, Mother automatically spawns `node child-node/index.js` to revive the Child. A **60s cooldown** prevents thrashing.
3. **Verification**: On the next 15s cycle, checks if the Child has sent a heartbeat. If yes → back to dormant.
4. **Failover**: If the Child is still silent after the respawn attempt, Mother activates its own `HeadlessSentry` scanners as a last resort.

---

## 🧪 Compliance Checklist
✅ **Non-Blocking**: Heartbeat monitoring runs in a background interval (15s).
✅ **Persistence**: All events are tagged with a `machine_id` for audit trails.
✅ **Auto-Migration**: Database schema automatically upgrades to include `machine_id` on startup.
✅ **Auto-Respawn**: Mother uses `child-spawner.ts` to restart the Child process with a 60s cooldown.
✅ **Autonomous**: Manual "Start" buttons replaced by a 3-stage self-healing indicator (Dormant → Respawning → Failover).
