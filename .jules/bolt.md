## 2024-03-16 - [Array Mutation Performance in Indicators]
**Learning:** Found heavily nested loop/slice processing inside core indicators (`calculateSMA`, `calculateStandardDeviation`). Using `.slice()` and `.reduce()` repeatedly for moving averages causes an O(N * lookback) time complexity.
**Action:** Replace `slice().reduce()` in array processing with sliding window techniques to achieve O(N) complexity for backtesting performance, particularly as `calculateSMA` is used heavily by other indicators like Bollinger Bands and Awesome Oscillator.

## 2025-02-14 - Optimize Auto-Tune Backtests Loop
**Learning:** Sequential async operations in UI loops (like running many backtest simulations one after the other) drastically block the execution pipeline, leading to long delays.
**Action:** Use chunked parallel execution with `Promise.all` to batch the operations. This allows the network/computation overhead to run concurrently without overwhelming the backend or browser limits.
