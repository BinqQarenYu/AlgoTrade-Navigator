# 🛰️ Sentinel Machine: Backtester (The Simulator)
`Location: src/app/(app)/backtest/`

## 📋 Mission Statement
> Carry out high-fidelity historical strategy simulations using DuckDB's vectorized query engine.

---

## 🏗️ Cluster Role
- **Type**: **CLIENT (Reader/Heavylifter)**
- **Responsibility**: Performance simulation and metric generation (Risk/PnL/Sharpe).
- **Sovereignty**: **NO** (Requires historical data residing in the Mother Vault).

---

## ⚡ Performance Profile (The Resource Tax)
*Measured on Orange Pi 5 / Edge Node Targets:*
- **CPU Target**: **100%** (Single-threaded calculation peak).
- **RAM Ceiling**: 512MB (Strict Buffer Cap).
- **GPU Acceleration**: **Recommended** for multi-chart rendering.
- **Network Load**: **Low** (Pulling historical data packets).

---

## 🗃️ Data Dependency Map
*Which tables in `algo_trades.duckdb` does this machine touch?*

| Table Name | Operation | Purpose |
| :--- | :--- | :--- |
| `historical_candles` | **READ** | Feeding the strategy playback loop. |
| `backtest_results` | **APPEND** | Persisting simulation outcomes for future analysis. |
| `strategies` | **READ** | Loading the strategy logic for simulation. |

---

## 🧩 Event Nervous System
*Key events this machine listens to or emits:*
- **Emits**: `BACKTEST_COMPLETE`, `HEARTBEAT_BACKTEST`
- **Listens**: `BACKTEST_STOP_CMD`, `NEW_STRATEGY_ADDED`

---

## 🛰️ Sentinel Strategy (Offline Mode)
*Behavior during Mother-Node Network Split:*
1. **Detection**: Fails to fetch historical data from the Mother node.
2. **Persistence**: Caches results in the `backtest_results` local cache.
3. **Recovery**: Flushes the result packet as a `POST` to the Mother node when online.

---

## 🧪 Compliance Checklist
✅ **Non-Blocking**: Strategy execution is handled in a dedicated **Web Worker**.
✅ **Isolation**: Simulations run in a sandbox; cannot interact with live trade keys.
✅ **Cleanup**: Worker thread is terminated on page exit to prevent memory leaks.
✅ **Integrity**: Every backtest run is stamped with a unique `run_id` in the vault.
