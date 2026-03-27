const fs = require('fs');

const fixFile = (file) => {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace(/  return \(\n    <Card/g, '  return (\n    <div className="card-container">\n      <Card');
    content = content.replace(/            <\/CardContent>\n          <\/Card>\n  \);\n}/g, '            </CardContent>\n          </Card>\n    </div>\n  );\n}');
    fs.writeFileSync(file, content);
};

['src/components/order-flow/charts/buy-sell-flow-chart.tsx',
 'src/components/order-flow/charts/risk-level-chart.tsx',
 'src/components/order-flow/charts/order-count-distribution.tsx',
 'src/components/order-flow/charts/net-order-flow.tsx',
 'src/components/order-flow/charts/flow-analytics-summary.tsx'].forEach(fixFile);

console.log('Fixed div wrapping');
