## 2024-05-24 - Single Pass Computation in Math Indicators
**Learning:** Chained array manipulation methods (`.map()`, `.filter()`, and spreading arrays) for processing historical trading data (like indicators) create significant memory allocations and GC overhead in Node.js, ballooning execution times. For instance, `calculateCoppockCurve` chaining maps took ~90ms for 100k points.
**Action:** Always rewrite chained map/reduce operations into single-pass, inline index evaluations using pre-allocated arrays to dramatically cut latency and memory overhead.
