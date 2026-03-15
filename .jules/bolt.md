## Bolt's Journal

## 2025-05-18 - Avoid Deep Cloning Large Arrays
**Learning:** Found multiple instances of `JSON.parse(JSON.stringify(data))` being used in strategy calculations. For arrays of historical data containing thousands of candlestick objects, this results in significant performance degradation (CPU and memory bottlenecks). This codebase pattern mostly modifies the objects by adding indicators, without needing deep copies.
**Action:** Replace `JSON.parse(JSON.stringify(data))` with `data.map(d => ({ ...d }))` to perform shallow cloning, which preserves original objects while isolating the newly added indicator fields.
