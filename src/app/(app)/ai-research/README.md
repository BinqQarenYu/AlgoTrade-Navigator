# 🛰️ Sentinel Machine: AI Research (The Research Lab)
`Location: src/app/(app)/ai-research/`

## 📋 Mission Statement
> Perform deep learning, technical analysis, and sentiment extraction to generate high-conviction signals.

---

## 🏗️ Cluster Role
- **Type**: **CHILD (Analysis Manager)**
- **Responsibility**: Strategic decision-making and pattern-matching.
- **Sovereignty**: **NO** (Requires high-volume data from the Mother Vault/API).

---

## ⚡ Performance Profile (The Resource Tax)
*Measured on Orange Pi 5 / Edge Node Targets:*
- **CPU Target**: **80-100%** (During inference/retraining).
- **RAM Ceiling**: 1024MB (Significant memory load for models).
- **GPU Acceleration**: **Requested** (WASM-based inference).
- **Network Load**: **Low** (Pulling pre-fetched candle windows).

---

## 🗃️ Data Dependency Map
*Which tables in `algo_trades.duckdb` does this machine touch?*

| Table Name | Operation | Purpose |
| :--- | :--- | :--- |
| `historical_candles` | **READ** | Slicing data for pattern recognition. |
| `ai_signals` | **WRITE** | Storing generated predictions for the Cluster. |
| `strategy_config` | **READ** | Matching AI outputs to current trade parameters. |

---

## 🧩 Event Nervous System
*Key events this machine listens to or emits:*
- **Emits**: `AI_SIGNAL_GENERATED`, `RESEARCH_COMPLETE`
- **Listens**: `NEW_CANDLE_CLOSED`, `AI_FORCE_RESCAN_CMD`

---

## 🛰️ Sentinel Strategy (Offline Mode)
*Behavior during Mother-Node Network Split:*
1. **Detection**: Connection heartbeat to the AI Model Gateway fails.
2. **Persistence**: Caches signals to a local `.ai_cache` on the SSD.
3. **Recovery**: Flushes all offline-generated signals to the Mother Vault for evaluation.

---

## 🧪 Compliance Checklist
✅ **Non-Blocking**: All model inference is running in **Headless Web Workers**.
✅ **Isolation**: Cannot emit trades directly; only emits signals to the #3 (Executor).
✅ **Cleanup**: Models are unloaded from memory when the page is closed to save RAM.
✅ **Integrity**: Every signal includes a `confidence_score` and `model_version` tag.
