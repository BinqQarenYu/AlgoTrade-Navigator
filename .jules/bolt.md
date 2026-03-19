## 2024-03-14 - Duplicated usePersistentState hook
**Learning:** Found multiple identical copies of `usePersistentState` defined inline inside various dashboard components (`open-positions.tsx`, `portfolio-summary.tsx`, `trade-history.tsx`, `market-sentiment.tsx`, `backtest-results.tsx`) while a central one exists in `src/hooks/use-persistent-state.ts`. The central hook is robust and handles date parsing correctly.
**Action:** Deduplicate `usePersistentState` by importing the central hook from `@/hooks/use-persistent-state` instead of declaring it inline in multiple files. This reduces code size and improves maintainability.

## 2024-03-15 - $O(N \times P)$ Anti-pattern in Technical Indicators
**Learning:** Several technical indicators (Donchian, Ichimoku, Stochastic, WilliamsR, SMI, Pivot Points) were implemented using `slice()` and `Math.max/min(...slice)` inside loops, leading to $O(N \times P)$ time complexity. This causes significant performance degradation as the data size or period increases.
**Action:** Use a monotonic deque algorithm for rolling maximum/minimum calculations to achieve $O(N)$ complexity. Implemented a centralized `calculateSlidingWindowExtreme` helper with a `head` pointer to avoid $O(P)$ `shift()` operations, ensuring true $O(1)$ amortized time per element.

## 2024-05-18 - High Performance WebSockets & DuckDB Migrations
**Learning:** Native Binance WebSockets emitting `@aggTrade` can easily DDoS the Node event loop and memory limits if every tick triggers a synchronous file read or an unbatched HTTP POST payload. DuckDB initialization requires `PRAGMA default_compression='zstd'` for persistent storage configurations, not `compression='zstd'`.
**Action:** When handling raw WebSocket streams, implement a `tradeBuffer` array with a `setInterval` (e.g., 1000ms) to flush batches. Only parse manifest JSON files synchronously once via a flag (`hasRecordedFirstPacket`). Ensure DB migration logic gracefully pauses stream engines natively before calling `fs.renameSync` on DB files.
