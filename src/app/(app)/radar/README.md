# 🛡️ Sentinel Machine: Anomaly Radar (The Visual Oracle)
`Location: src/app/(app)/radar/`

## 📋 Mission Statement
> Visualize and track institutional Whale activity, Liquidation Cascades, and VPIN spikes across the Distributed Cluster. 

---

## 🏗️ Distributed Data Flow: "Child-is-King"
The Anomaly Radar no longer relies on a single node. Data is sourced from a distributed fleet:

- **PRIMARY SOURCE**: **Distributed Child Nodes (Orange Pi)**.
    - **Detection**: Real-time binning and filtering occur at the edge.
    - **Persistence**: Events are first saved to the Child's local `sentry_vault.db` (SQLite) to ensure no data loss during network splits.
    - **Sync**: Once the Mother Node is online, the Child flushes its vault into the central `algo_trades.duckdb`.
- **FAILOVER SOURCE**: **Mother Node (HeadlessSentry)**.
    - **Logic**: If no child pulse is detected for >30s, the Mother's `HeadlessSentry` activates to maintain radar coverage.

---

## ⚡ Performance Profile (The Resource Tax)
*Measured on Orange Pi 5 / Edge Node Targets:*
- **CPU Target**: < 30% (Filtering 1000+ trade events/sec).
- **RAM Ceiling**: 384MB (Maintains multi-asset trade buffers).
- **In-Memory Buffer**: Whales and spikes are queued for 5s before being flushed.

---

## 🗃️ Data Dependency Map
*Which tables in `algo_trades.duckdb` does this machine touch?*

| Table Name | Operation | Purpose |
| :--- | :--- | :--- |
| `microstructure_events` | **READ/WRITE** | Recording every Whale/Liquidation with `machine_id` tagging. |
| `trades` | **READ/WRITE** | Source of VPIN calculations and spoofing detection. |
| `anomaly_alerts` | **WRITE** | Global alerts triggered by the Cluster. |

---

## 🧩 Event Nervous System
*Key events this machine listens to or emits:*
- **Emits**: `WHALE_DETECTED`, `LIQUIDATION_CASCADE`, `VPIN_SPIKE_ALERT`
- **Listens**: `CHILD_INGEST_PULSE` (Updating UI to show the source node).

---

## 🛰️ Sentinel Strategy (Autonomous Resilience)
*Behavior during Network Partition:*
1. **Edge-Detection**: Child nodes continue detecting anomalies even if the Mother's dashboard is closed.
2. **Offline Vault**: Microstructure events are queued in the Child's local SSD vault.
3. **Re-Sync**: On reconnection, the `flushBuffer()` logic ensures every missed whale is pushed to the central vault.

---

## 🧪 Compliance Checklist
✅ **Non-Blocking**: Event processing runs in a headless background worker.
✅ **Traceability**: Every whale is tagged with the `machine_id` (e.g., `SENTINEL-CLUSTER-ALPHA`) showing which node detected it first.
✅ **Temporal Sync**: Uses `event_id` and Binance Transaction Time for nanosecond accuracy.
✅ **Autonomous**: Failover logic is invisible to the user; the Radar simply stays online regardless of which node is scanning.
