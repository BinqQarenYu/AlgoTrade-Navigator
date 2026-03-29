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


## 2025-02-14 - Optimize Indicators with Chained Array Methods
**Learning:** Functions like `calculateMACD`, `calculateBollingerBands`, and `calculateStandardDeviation` extensively used chained array mutations (e.g., `.map().filter()`, spreading arrays `[...Array(padding)]`, and pushing inside loops). In tight loops processing 100k+ candles, these functional abstractions create huge memory allocation/GC overhead and high execution latency compared to single-pass standard `for` loops.
**Action:** Replace all chained array mutations and dynamic `.push()` calls with single-pass iterative `for` loops. Pre-allocate the arrays upfront `new Array(data.length)` to drastically reduce garbage collection spikes and boost execution speed (e.g., improving MACD calculation speed by over ~25%).

## 2025-02-14 - WMA O(N*P) nested loops calculation
**Learning:** WMA Calculation in CoppockCurve indicator was bottlenecked by $O(N \times P)$ where P is the length of period the metric was calculated on.
**Action:** Convert to a sliding window iteration pattern updating `num` and `windowSum` in place: `num = num + P * new_value - windowSum` and `windowSum = windowSum + new_value - old_value` to reduce the calculation down to $O(N)$.

## 2026-03-26 - Persistent Headless Workers in Next.js Server
**Learning:** Background data ingestion processes (like `HeadlessSentry` for WebSocket anomaly tracking) die across hot-reloads and server restarts because Next.js has no default persistent entrypoint. Relying on user UI clicks to start a 24/7 worker defeats the purpose of "headless".
**Action:** Enable `experimental: { instrumentationHook: true }` in `next.config.mjs` and use `src/instrumentation.ts` to execute an `autoBoot()` function on the Node.js server init. Save the running state in a local file (`sentry-config.json`) so the instrumentation hook can rehydrate and resume the worker identically after restarts.

## 2026-03-26 - Gemini API Quota "Greediness" & Protection
**Learning:** Automatically triggering multiple parallel Gemini AI flows (`predict-market`, `detect-manipulation`) on component mount or high-frequency bot intervals (15s) results in immediate 429 "Quota Exceeded" errors for free-tier users. $50$ calls per day is insufficient for auto-running labs.
**Action:** Decoupled technical indicator calculation from AI analysis in the `AIResearchPage`. Implemented a **Manual Trigger** UI (Standby Mode) where AI is only invoked on explicit user click. Added a **10-minute AI Cooldown** per bot in `BotContext` to protect credits while keeping strategies active. Increased default `aiQuota` limit to $500$ to accommodate professional free-tier usage.

## 2024-05-28 - O(N) Order Flow Chart Generation Optimization
**Learning:** Using chained array methods like `.filter().reduce()` inside an `.map()` loop over time-series data creates an O(N^2) complexity with massive garbage collection overhead. In `generateTradingChartData`, 4 separate array filters were creating severe UI blockages due to allocating numerous intermediate arrays during every React render. Also, `.slice().forEach()` on state arrays allocations unnecessary shallow copies, which slows down high-frequency signal calculations in `use-order-flow.ts`.
**Action:** Replace `.filter().reduce()` inside loops with a single combined `for` loop that computes all required metrics simultaneously. Replace `.slice(-N).forEach()` with a simple index-based `for` loop starting from `Math.max(0, arr.length - N)`. Always favor direct index iteration over chained array methods in hot paths like charting loops.

## 2025-02-14 - Optimize Multiple Reduce Calls in React Render
**Learning:** Repeating identical or similar array aggregations (e.g. four separate `.reduce()` calls) directly within a React component's return block forces multiple full O(N) traversals on every render. For high-frequency charting components (like `order-flow-charts.tsx`), this causes significant main thread lag and CPU thrashing.
**Action:** Extract repeated `.reduce()` operations into a single-pass `for` loop inside a `useMemo` hook. Calculate all aggregates (`buyVol`, `sellVol`, `netFlow`, `avgRisk`) simultaneously to reduce the render complexity to strict O(N) and minimize array overhead.
