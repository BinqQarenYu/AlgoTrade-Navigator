## 2024-03-16 - [Array Mutation Performance in Indicators]
**Learning:** Found heavily nested loop/slice processing inside core indicators (`calculateSMA`, `calculateStandardDeviation`). Using `.slice()` and `.reduce()` repeatedly for moving averages causes an O(N * lookback) time complexity.
**Action:** Replace `slice().reduce()` in array processing with sliding window techniques to achieve O(N) complexity for backtesting performance, particularly as `calculateSMA` is used heavily by other indicators like Bollinger Bands and Awesome Oscillator.
