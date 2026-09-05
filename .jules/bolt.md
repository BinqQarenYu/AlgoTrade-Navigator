## 2024-03-14 - Duplicated usePersistentState hook
**Learning:** Found multiple identical copies of `usePersistentState` defined inline inside various dashboard components (`open-positions.tsx`, `portfolio-summary.tsx`, `trade-history.tsx`, `market-sentiment.tsx`, `backtest-results.tsx`) while a central one exists in `src/hooks/use-persistent-state.ts`. The central hook is robust and handles date parsing correctly.
**Action:** Deduplicate `usePersistentState` by importing the central hook from `@/hooks/use-persistent-state` instead of declaring it inline in multiple files. This reduces code size and improves maintainability.

## 2024-03-15 - $O(N \times P)$ Anti-pattern in Technical Indicators
**Learning:** Several technical indicators (Donchian, Ichimoku, Stochastic, WilliamsR, SMI) were implemented using `slice()` and `Math.max/min(...slice)` inside loops, leading to $O(N \times P)$ time complexity. This causes significant performance degradation as the data size or period increases.
**Action:** Use a monotonic deque algorithm for rolling maximum/minimum calculations to achieve $O(N)$ complexity. Implemented a centralized `calculateSlidingWindowExtreme` helper with a `head` pointer to avoid $O(P)$ `shift()` operations, ensuring true $O(1)$ amortized time per element.

## 2026-03-25 - $O(N \times W)$ Weighted Moving Average (WMA) Optimization in Coppock Curve
**Learning:** The WMA step in `calculateCoppockCurve` used nested loops, resulting in $O(N \times W)$ time complexity. A sliding window weighted sum recurrence relation ($Sum_i = Sum_{i-1} + W \cdot x_i - S_{window}$) can reduce this to $O(N)$ with $O(1)$ updates per element.
**Action:** Implemented sliding window WMA calculation using a running sum $S_{window}$ of window elements and rolling numerator updates. This achieves $O(N)$ complexity, speeding up Coppock Curve calculations significantly for long backtests.

## 2026-03-26 - $O(N \times P)$ Allocation and Callback Overhead in Commodity Channel Index (CCI)
**Learning:** Identified that `calculateCCI` fell into the same slice/reduce loop anti-pattern as previous indicators. Inside the main loop, it allocated an intermediate array via `.slice()` and invoked a callback via `.reduce()` on every single candle. For large datasets, this creates significant GC pressure and slows execution.
**Action:** Replaced the `.slice().reduce()` pattern inside `calculateCCI` with a direct, pointer-based index loop. This achieved a 3.0x speedup (reducing execution time from ~33ms to ~11ms for 20k elements) and resulted in a completely allocation-free calculation loop.

## 2026-03-27 - Elimination of Array Map Pre-allocations in Money Flow Index (MFI)
**Learning:** `calculateMFI` pre-allocated two full $O(N)$ arrays (`typicalPrices` and `rawMoneyFlows`) using `data.map()`. Evaluating typical prices and raw money flow on-demand inside the sliding window loop eliminates $O(N)$ array allocations and heap churn.
**Action:** Replace `data.map()` calls in `calculateMFI` with a lightweight helper function called inside the sliding window loop. This resulted in an ~1.81x speedup (~9.28ms to ~5.13ms for 50,000 candles) and reduced GC overhead.

## 2026-03-28 - Monotonic Deque Optimization for RSI Divergence Lookback
**Learning:** Strategy lookback calculations like RSI divergence relied on scanning `params.lookback` items on every candle iteration, causing $O(N \times L)$ execution time.
**Action:** Maintain monotonic deques with head pointers across sliding window $[i - \text{lookback}, i - 5)$ for minimum low and maximum high indices, reducing lookback time complexity to $O(N)$ and speeding up calculation by ~4.1x.

## 2026-03-29 - Elimination of Intermediate Array Allocations and `.filter()` in SMI Calculation
**Learning:** `calculateSMI` performed multiple array `.filter()` calls and spread allocations `[...Array(...).fill(null), ...]`, causing heap churn and unnecessary linear passes over large datasets.
**Action:** Replace `.filter()` and array spread operations with a single-pass loop to collect valid values and pre-allocated fixed-length arrays (`new Array(...)`), eliminating GC overhead and achieving ~1.8x execution speedup.
