const fs = require('fs');

let ocd = fs.readFileSync('src/components/order-flow/charts/order-count-distribution.tsx', 'utf-8');
ocd = ocd.replace(/<\/CardContent>\n<\/Card>/g, '</div>\n</CardContent>\n</Card>');
fs.writeFileSync('src/components/order-flow/charts/order-count-distribution.tsx', ocd);
