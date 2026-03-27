const fs = require('fs');

let ocd = fs.readFileSync('src/components/order-flow/charts/order-count-distribution.tsx', 'utf-8');
ocd = ocd.replace(/<div className="grid grid-cols-1 md:grid-cols-2 gap-4">\n/g, '');
fs.writeFileSync('src/components/order-flow/charts/order-count-distribution.tsx', ocd);
