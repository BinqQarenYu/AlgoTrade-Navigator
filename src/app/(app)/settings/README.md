# 🛡️ Sentinel Machine: Settings Vault (The Config Vault)
`Location: src/app/(app)/settings/`

## 📋 Mission Statement
> Centralize global configuration, API encryption, and Cluster environment variables.

---

## 🏗️ Cluster Role
- **Type**: **MOTHER (Config Orchestrator)**
- **Responsibility**: Global key-value pair management across all 8 machines.
- **Sovereignty**: **YES** (Must serve local config even if cloud/mother is offline).

---

## ⚡ Performance Profile (The Resource Tax)
*Measured on Orange Pi 5 / Edge Node Targets:*
- **CPU Target**: < 1% (Inactive until user config change).
- **RAM Ceiling**: 64MB.
- **GPU Acceleration**: **None** (UI Form logic only).
- **Network Load**: **Low** (Initial cluster config broadcast).

---

## 🗃️ Data Dependency Map
*Which tables in `algo_trades.duckdb` does this machine touch?*

| Table Name | Operation | Purpose |
| :--- | :--- | :--- |
| `strategy_config` | **READ/WRITE** | Managing global trade parameter shifts. |
| `api_keys` | **READ/WRITE** | Persisting encoded trade keys. |
| `user_profiles` | **READ/WRITE** | Storing cluster environment settings. |

---

## 🧩 Event Nervous System
*Key events this machine listens to or emits:*
- **Emits**: `CONFIG_REFRESH_CMD`, `GLOBAL_KILL_SWITCH`, `THEME_CHANGE`
- **Listens**: `API_LIMIT_REACHED` (to trigger throttled mode).

---

## 🛰️ Sentinel Strategy (Offline Mode)
*Behavior during Mother-Node Network Split:*
1. **Detection**: Sync heartbeat for global config updates fails.
2. **Persistence**: Writes local machine overrides to a `local_config.json`.
3. **Recovery**: Performs a 2-way sync with the Mother Node when online.

---

## 🧪 Compliance Checklist
✅ **Non-Blocking**: Config changes are pushed asynchronously to avoid UI lag.
✅ **Isolation**: Encrypts all `WRITE` keys before persisting to DuckDB.
✅ **Cleanup**: Form state is cleared on save to prevent memory leaks of sensitive data.
✅ **Integrity**: Every config change includes a `user_id` and `timestamp`.
