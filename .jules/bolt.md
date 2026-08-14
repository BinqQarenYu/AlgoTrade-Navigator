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

## 2026-03-27 - Allocation and Spread Overhead in Hyper Peak Formation Strategy
**Learning:** Identified that `hyper-peak-formation.ts` used `.slice().map()` inside its main loop to determine the low/high since the Break of Structure (BOS). On every candle iteration of the loop, this allocated intermediate arrays and called a callback function, creating immense heap allocation and GC churn during backtesting and auto-tuning parameter optimization.
**Action:** Replaced `data.slice().map()` and `Math.min/max(...spread)` with direct, pointer-based single-pass index loops. This completely eliminated any array allocation or spread overhead inside the strategy's core calculation loop, resulting in highly efficient execution and lower memory footprint.
