const { performance } = require('perf_hooks');

// Mock data
const orderFlowData = Array.from({ length: 100000 }, (_, i) => ({
  orderType: Math.random() > 0.5 ? 'buy' : 'sell'
}));

function oldImplementation() {
  const recentOrders = orderFlowData.slice(-20);
  const buyOrders = recentOrders.filter(order => order.orderType === 'buy').length;
  const sellOrders = recentOrders.filter(order => order.orderType === 'sell').length;
  return { buyOrders, sellOrders };
}

function newImplementation() {
  const recentOrders = orderFlowData.slice(-20);
  let buyOrders = 0;
  let sellOrders = 0;
  for (let i = 0; i < recentOrders.length; i++) {
    if (recentOrders[i].orderType === 'buy') buyOrders++;
    else if (recentOrders[i].orderType === 'sell') sellOrders++;
  }
  return { buyOrders, sellOrders };
}

// Warmup
for (let i = 0; i < 1000; i++) {
  oldImplementation();
  newImplementation();
}

const ITERATIONS = 1000000;

let start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  oldImplementation();
}
let oldTime = performance.now() - start;

start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  newImplementation();
}
let newTime = performance.now() - start;

console.log(`Old Implementation (filter): ${oldTime.toFixed(2)} ms`);
console.log(`New Implementation (loop): ${newTime.toFixed(2)} ms`);
console.log(`Improvement: ${((oldTime - newTime) / oldTime * 100).toFixed(2)}%`);
