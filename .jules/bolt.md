## 2024-03-14 - Duplicated usePersistentState hook
**Learning:** Found multiple identical copies of `usePersistentState` defined inline inside various dashboard components (`open-positions.tsx`, `portfolio-summary.tsx`, `trade-history.tsx`, `market-sentiment.tsx`, `backtest-results.tsx`) while a central one exists in `src/hooks/use-persistent-state.ts`. The central hook is robust and handles date parsing correctly.
**Action:** Deduplicate `usePersistentState` by importing the central hook from `@/hooks/use-persistent-state` instead of declaring it inline in multiple files. This reduces code size and improves maintainability.

## 2024-03-15 - $O(N \times P)$ Anti-pattern in Technical Indicators
**Learning:** Several technical indicators (Donchian, Ichimoku, Stochastic, WilliamsR, SMI) were implemented using `slice()` and `Math.max/min(...slice)` inside loops, leading to $O(N \times P)$ time complexity. This causes significant performance degradation as the data size or period increases.
**Action:** Use a monotonic deque algorithm for rolling maximum/minimum calculations to achieve $O(N)$ complexity. Implemented a centralized `calculateSlidingWindowExtreme` helper with a `head` pointer to avoid $O(P)$ `shift()` operations, ensuring true $O(1)$ amortized time per element.

## 2026-03-25 - $O(N \times W)$ Weighted Moving Average (WMA) Optimization in Coppock Curve
**Learning:** The WMA step in `calculateCoppockCurve` used nested loops, resulting in $O(N \times W)$ time complexity. A sliding window weighted sum recurrence relation ($Sum_i = Sum_{i-1} + W \cdot x_i - S_{window}$) can reduce this to $O(N)$ with $O(1)$ updates per element.
**Action:** Implemented sliding window WMA calculation using a running sum $S_{window}$ of window elements and rolling numerator updates. This achieves $O(N)$ complexity, speeding up Coppock Curve calculations significantly for long backtests.

## 2026-03-26 - Array Slicing and Reduce Overhead in CCI Calculation
**Learning:** In technical indicator loops, allocating arrays using `slice()` and iterating over them with `reduce()` inside $O(N \times P)$ loops creates significant garbage collection and heap allocation overhead. Removing `slice()` and using direct index-based offset loops on the original array completely avoids object allocation overhead and speeds up the indicator by 2x to 8x.
**Action:** Always prefer direct array indexing inside sliding-window calculations to avoid temporary array allocations, especially within loops traversing large datasets.
