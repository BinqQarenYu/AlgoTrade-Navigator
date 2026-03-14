const orderFlowData = Array.from({ length: 1000 }, (_, i) => ({
  id: `order-${i}`,
  symbol: 'BTCUSDT',
  orderType: Math.random() > 0.5 ? 'buy' : 'sell',
  size: Math.random() * 10,
  price: 50000 + Math.random() * 1000,
  timestamp: Date.now() + i * 1000
}));

const NUM_RENDERS = 1000;
const OCCURRENCES_PER_RENDER = 10;

console.time('Baseline (Array.filter multiple times)');
for (let r = 0; r < NUM_RENDERS; r++) {
  let a = 0;
  let b = 0;
  for (let o = 0; o < OCCURRENCES_PER_RENDER; o++) {
    a += orderFlowData.filter(o => o.orderType === 'buy').length;
    b += orderFlowData.filter(o => o.orderType === 'sell').length;
  }
}
console.timeEnd('Baseline (Array.filter multiple times)');

console.time('Optimized (O(N) single pass per render via useMemo)');
for (let r = 0; r < NUM_RENDERS; r++) {
  // simulate useMemo recalculating on data change
  let buyOrderCount = 0;
  let sellOrderCount = 0;
  for (let i = 0; i < orderFlowData.length; i++) {
    if (orderFlowData[i].orderType === 'buy') buyOrderCount++;
    else if (orderFlowData[i].orderType === 'sell') sellOrderCount++;
  }

  let a = 0;
  let b = 0;
  for (let o = 0; o < OCCURRENCES_PER_RENDER; o++) {
    a += buyOrderCount;
    b += sellOrderCount;
  }
}
console.timeEnd('Optimized (O(N) single pass per render via useMemo)');
