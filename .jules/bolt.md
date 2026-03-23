## 2024-03-14 - Duplicated usePersistentState hook
**Learning:** Found multiple identical copies of `usePersistentState` defined inline inside various dashboard components (`open-positions.tsx`, `portfolio-summary.tsx`, `trade-history.tsx`, `market-sentiment.tsx`, `backtest-results.tsx`) while a central one exists in `src/hooks/use-persistent-state.ts`. The central hook is robust and handles date parsing correctly.
**Action:** Deduplicate `usePersistentState` by importing the central hook from `@/hooks/use-persistent-state` instead of declaring it inline in multiple files. This reduces code size and improves maintainability.

## 2024-03-15 - $O(N \times P)$ Anti-pattern in Technical Indicators
**Learning:** Several technical indicators (Donchian, Ichimoku, Stochastic, WilliamsR, SMI, Pivot Points) were implemented using `slice()` and `Math.max/min(...slice)` inside loops, leading to $O(N \times P)$ time complexity. This causes significant performance degradation as the data size or period increases.
**Action:** Use a monotonic deque algorithm for rolling maximum/minimum calculations to achieve $O(N)$ complexity. Implemented a centralized `calculateSlidingWindowExtreme` helper with a `head` pointer to avoid $O(P)$ `shift()` operations, ensuring true $O(1)$ amortized time per element.

## 2024-05-18 - High Performance WebSockets & DuckDB Migrations
**Learning:** Native Binance WebSockets emitting `@aggTrade` can easily DDoS the Node event loop and memory limits if every tick triggers a synchronous file read or an unbatched HTTP POST payload. DuckDB initialization requires `PRAGMA default_compression='zstd'` for persistent storage configurations, not `compression='zstd'`.
**Action:** When handling raw WebSocket streams, implement a `tradeBuffer` array with a `setInterval` (e.g., 1000ms) to flush batches. Only parse manifest JSON files synchronously once via a flag (`hasRecordedFirstPacket`). Ensure DB migration logic gracefully pauses stream engines natively before calling `fs.renameSync` on DB files.

## 2024-03-20 - Algorithmic Optimization of Pivot Points & Cloning Efficiency
**Learning:** `calculatePivotPoints` was a remaining $O(N \times P)$ bottleneck using `slice()` and `Math.max/min` inside its main loop. Additionally, frequent strategy re-calculations were bottlenecked by deep-cloning large candle datasets using `JSON.parse(JSON.stringify())`.
**Action:** Optimized `calculatePivotPoints` to $O(N)$ using the monotonic deque helper. Improved cloning efficiency by switching to `data.map(d => ({ ...d }))` for shallow cloning, which is significantly faster for this data structure.

## 2024-03-16 - [Array Mutation Performance in Indicators]
**Learning:** Found heavily nested loop/slice processing inside core indicators (`calculateSMA`, `calculateStandardDeviation`). Using `.slice()` and `.reduce()` repeatedly for moving averages causes an O(N * lookback) time complexity.
**Action:** Replace `slice().reduce()` in array processing with sliding window techniques to achieve O(N) complexity for backtesting performance, particularly as `calculateSMA` is used heavily by other indicators like Bollinger Bands and Awesome Oscillator.

## 2024-03-17 - [Avoid Nested slice/reduce in Sliding Window Calculations]
**Learning:** Found O(N * period) complexity in `calculateCMF` due to the use of `.slice().reduce()` to calculate rolling sums at each step. This significantly degraded performance (~8x slower) in large data sets. Pre-allocating arrays and maintaining running sums via a sliding window pattern avoids large memory allocations and redundant computation.
**Action:** Standardize replacing any chained array mutations (like `.slice().reduce()`) with O(N) sliding window computations (adding the new element, subtracting the element falling out of the window) in performance-critical areas like indicators and backtesting engines.

## 2024-05-18 - [Optimizing Indicators: Avoid slice() and reduce() on loops]
**Learning:** Using `array.slice().reduce()` inside an $O(N)$ loop triggers $O(N \times \text{period})$ array creations and allocations. This leads to heavy garbage collection pressure when running against historical crypto data (e.g., 100k+ candles).
**Action:** Replace `slice().reduce()` chains with inline `for` loops accumulating values directly. Use monotonic deques (like `calculateSlidingWindowExtreme`) instead of repeated `Math.max(...slice())` for localized bounds.

## 2024-05-20 - More $O(N \times P)$ Anti-patterns in Technical Indicators
**Learning:** Found more instances of `slice().reduce()` and `Math.max(...slice.map(...))` inside historical indicator loops, specifically in `calculateCCI` and `calculatePivotPoints`. These patterns force frequent garbage collection and redundant looping inside every tick calculation, leading to massive performance loss during large backtests.
**Action:** Replaced `slice().reduce()` in `calculateCCI` with an iterative calculation against precomputed SMA inside a fixed inner loop. For `calculatePivotPoints`, replaced `Math.max(...slice)` with the existing $O(N)$ central `calculateSlidingWindowExtreme` helper utilizing a monotonic deque algorithm.

## 2025-02-14 - Optimize Auto-Tune Backtests Loop
**Learning:** Sequential async operations in UI loops (like running many backtest simulations one after the other) drastically block the execution pipeline, leading to long delays.
**Action:** Use chunked parallel execution with `Promise.all` to batch the operations. This allows the network/computation overhead to run concurrently without overwhelming the backend or browser limits.


## 2025-02-14 - Replace O(N * P) WMA with O(N) Sliding Window
**Learning:** Found an $O(N \times P)$ complexity bottleneck in `calculateCoppockCurve` where a nested `for` loop was used to recalculate the numerator of a Weighted Moving Average (WMA) at every tick. This degraded performance during backtesting when computing across large arrays.
**Action:** Replaced the nested loop with an $O(N)$ sliding window by maintaining a `windowSum` alongside the running numerator. The new element is weighted at $P$, while all previous elements shift weight by exactly $-1$, reducing the WMA step to a single $O(1)$ calculation per tick.
