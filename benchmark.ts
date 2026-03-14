import { performance } from 'perf_hooks';

// Simulate BotPersistence types
interface LiveBotStateForAsset {
  status: 'idle' | 'running' | 'analyzing' | 'position_open' | 'error' | 'cooldown';
}

interface PersistedBotState {
  status: LiveBotStateForAsset['status'];
  lastActivity: number;
}

// Generate test data
const generateStates = (count: number, activeRatio: number) => {
  const states: Record<string, PersistedBotState> = {};
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const isActive = Math.random() < activeRatio;
    states[`bot-${i}`] = {
      status: isActive ? 'running' : 'idle',
      lastActivity: isActive ? now : now - (25 * 60 * 60 * 1000), // Active now, or older than 24h
    };
  }
  return states;
};

const count = 100000;
const allStates = generateStates(count, 0.2);
const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);

console.log(`Generated ${count} states`);

// Original approach
const measureOriginal = () => {
  const start = performance.now();

  let cleanedCount = 0;
  const activeStates: Record<string, PersistedBotState> = {};

  for (const [botId, state] of Object.entries(allStates)) {
    // Keep active bots or recently active bots
    if (state.status !== 'idle' && state.status !== 'error' || state.lastActivity > cutoffTime) {
      activeStates[botId] = state;
    } else {
      cleanedCount++;
    }
  }

  const end = performance.now();
  return { time: end - start, cleanedCount, keptCount: Object.keys(activeStates).length };
};

// Optimized approach 1: using for-in loop (avoids Object.entries allocation)
const measureOptimized1 = () => {
  const start = performance.now();

  let cleanedCount = 0;
  const activeStates: Record<string, PersistedBotState> = {};

  for (const botId in allStates) {
    const state = allStates[botId];
    if (state.status !== 'idle' && state.status !== 'error' || state.lastActivity > cutoffTime) {
      activeStates[botId] = state;
    } else {
      cleanedCount++;
    }
  }

  const end = performance.now();
  return { time: end - start, cleanedCount, keptCount: Object.keys(activeStates).length };
};

// Run multiple times for warmup and average
const ITERATIONS = 100;

// Warmup
for (let i = 0; i < 5; i++) {
  measureOriginal();
  measureOptimized1();
}

let totalOriginal = 0;
let totalOpt1 = 0;
let lastResult;

for (let i = 0; i < ITERATIONS; i++) {
  totalOriginal += measureOriginal().time;
  lastResult = measureOptimized1();
  totalOpt1 += lastResult.time;
}

console.log(`Original average: ${(totalOriginal / ITERATIONS).toFixed(2)} ms`);
console.log(`Optimized (for-in) average: ${(totalOpt1 / ITERATIONS).toFixed(2)} ms`);
console.log(`Improvement: ${(((totalOriginal - totalOpt1) / totalOriginal) * 100).toFixed(2)}%`);
console.log(`Results match: cleaned=${lastResult.cleanedCount}, kept=${lastResult.keptCount}`);

// Optimized approach 2: using Object.keys() which might be faster than for-in on V8 sometimes
const measureOptimized2 = () => {
  const start = performance.now();

  let cleanedCount = 0;
  const activeStates: Record<string, PersistedBotState> = {};

  const keys = Object.keys(allStates);
  for (let i = 0; i < keys.length; i++) {
    const botId = keys[i];
    const state = allStates[botId];
    if (state.status !== 'idle' && state.status !== 'error' || state.lastActivity > cutoffTime) {
      activeStates[botId] = state;
    } else {
      cleanedCount++;
    }
  }

  const end = performance.now();
  return { time: end - start, cleanedCount, keptCount: Object.keys(activeStates).length };
};

let totalOpt2 = 0;

for (let i = 0; i < 5; i++) {
  measureOptimized2();
}

for (let i = 0; i < ITERATIONS; i++) {
  totalOpt2 += measureOptimized2().time;
}

console.log(`Optimized (Object.keys) average: ${(totalOpt2 / ITERATIONS).toFixed(2)} ms`);
console.log(`Improvement: ${(((totalOriginal - totalOpt2) / totalOriginal) * 100).toFixed(2)}%`);
