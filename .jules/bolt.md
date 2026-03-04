## 2025-05-15 - [Technical Indicators Optimization]
**Learning:** Core technical indicators (SMA, StdDev, VWAP) were implemented using `slice()` and `reduce()` inside loops, resulting in O(N * Period) complexity. This causes significant lag when backtesting over large historical datasets (e.g., 100k+ candles) or using long periods.
**Action:** Always use sliding window algorithms for rolling calculations. For SMA/VWAP, maintain running sums. For Standard Deviation, use the Sum of Squares rolling variance formula to achieve O(N) complexity.
