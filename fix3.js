const fs = require('fs');

const fixFile = (file) => {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace(/<>\n/g, '');
    content = content.replace(/\n\s*<\/>\n/g, '\n          </Card>\n');

    fs.writeFileSync(file, content);
};

['src/components/order-flow/charts/buy-sell-flow-chart.tsx',
 'src/components/order-flow/charts/risk-level-chart.tsx',
 'src/components/order-flow/charts/order-count-distribution.tsx',
 'src/components/order-flow/charts/net-order-flow.tsx',
 'src/components/order-flow/charts/flow-analytics-summary.tsx'].forEach(fixFile);

console.log('Fixed Card tags');
