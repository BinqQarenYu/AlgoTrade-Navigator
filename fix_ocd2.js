const fs = require('fs');

let ocd = fs.readFileSync('src/components/order-flow/charts/order-count-distribution.tsx', 'utf-8');
ocd = ocd.replace(/<\/div>\n              <\/CardContent>/g, '</CardContent>');
fs.writeFileSync('src/components/order-flow/charts/order-count-distribution.tsx', ocd);
