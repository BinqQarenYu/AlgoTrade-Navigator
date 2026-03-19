## 2024-03-14 - Duplicated usePersistentState hook
**Learning:** Found multiple identical copies of `usePersistentState` defined inline inside various dashboard components (`open-positions.tsx`, `portfolio-summary.tsx`, `trade-history.tsx`, `market-sentiment.tsx`, `backtest-results.tsx`) while a central one exists in `src/hooks/use-persistent-state.ts`. The central hook is robust and handles date parsing correctly.
**Action:** Deduplicate `usePersistentState` by importing the central hook from `@/hooks/use-persistent-state` instead of declaring it inline in multiple files. This reduces code size and improves maintainability.

## 2024-03-15 - $O(N \times P)$ Anti-pattern in Technical Indicators
**Learning:** Several technical indicators (Donchian, Ichimoku, Stochastic, WilliamsR, SMI) were implemented using `slice()` and `Math.max/min(...slice)` inside loops, leading to $O(N \times P)$ time complexity. This causes significant performance degradation as the data size or period increases.
**Action:** Use a monotonic deque algorithm for rolling maximum/minimum calculations to achieve $O(N)$ complexity. Implemented a centralized `calculateSlidingWindowExtreme` helper with a `head` pointer to avoid $O(P)$ `shift()` operations, ensuring true $O(1)$ amortized time per element.

## 2024-03-16 - Pivot Points Optimization
**Learning:** `calculatePivotPoints` was a major bottleneck (~120ms for 10k points) because it used the $O(N \times P)$ slice/max/min pattern. Interestingly, it also used `slice` just to get the `close` value of the previous period, which is $O(P)$ instead of $O(1)$.
**Action:** Refactored `calculatePivotPoints` to use the $O(N)$ `calculateSlidingWindowExtreme` helper. Replaced the $O(P)$ `slice` for the previous close with a simple $O(1)$ index access `data[i-1].close`. Performance improved by ~3x.
