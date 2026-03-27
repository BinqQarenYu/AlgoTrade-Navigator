const fs = require('fs');
const babel = require('@babel/core');

const files = [
  'src/components/order-flow/charts/buy-sell-flow-chart.tsx',
  'src/components/order-flow/charts/risk-level-chart.tsx',
  'src/components/order-flow/charts/order-count-distribution.tsx',
  'src/components/order-flow/charts/net-order-flow.tsx',
  'src/components/order-flow/charts/flow-analytics-summary.tsx'
];

files.forEach(file => {
  const code = fs.readFileSync(file, 'utf-8');
  try {
    babel.parse(code, {
      filename: file,
      presets: ['@babel/preset-typescript', '@babel/preset-react']
    });
    console.log(`✅ ${file}`);
  } catch (e) {
    console.error(`❌ ${file} - ${e.message}`);
  }
});
