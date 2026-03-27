const { execSync } = require('child_process');

try {
  const result = execSync('npx eslint src/components/order-flow/charts/buy-sell-flow-chart.tsx', { encoding: 'utf-8' });
  console.log(result);
} catch(e) {
  console.log(e.stdout);
}
