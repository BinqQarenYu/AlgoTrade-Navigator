const fs = require('fs');
const babel = require('@babel/core');

const code = fs.readFileSync('src/components/order-flow/charts/buy-sell-flow-chart.tsx', 'utf-8');
try {
  babel.parse(code, {
    filename: 'buy-sell-flow-chart.tsx',
    presets: ['@babel/preset-typescript', '@babel/preset-react']
  });
  console.log("Syntax is OK!");
} catch (e) {
  console.error("Syntax Error:", e.message);
}
