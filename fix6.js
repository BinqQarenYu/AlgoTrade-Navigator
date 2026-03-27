const fs = require('fs');

let rlc = fs.readFileSync('src/components/order-flow/charts/risk-level-chart.tsx', 'utf-8');
rlc = rlc.replace(/\{\/\* Order Count and Net Flow \*\/\}\n\s*<\/Card>/g, '');
fs.writeFileSync('src/components/order-flow/charts/risk-level-chart.tsx', rlc);

let ocd = fs.readFileSync('src/components/order-flow/charts/order-count-distribution.tsx', 'utf-8');
ocd = ocd.replace(/<\/CardContent>\n\s*<\/Card>\n\s*\);\n\}/g, '</CardContent>\n            </Card>\n  );\n}');
fs.writeFileSync('src/components/order-flow/charts/order-count-distribution.tsx', ocd);

let nof = fs.readFileSync('src/components/order-flow/charts/net-order-flow.tsx', 'utf-8');
nof = nof.replace(/<\/div>\n\s*<\/Card>\n\s*\);\n\}/g, ');\n}');
fs.writeFileSync('src/components/order-flow/charts/net-order-flow.tsx', nof);
