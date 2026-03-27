const fs = require('fs');
let content = fs.readFileSync('src/components/order-flow/charts/order-count-distribution.tsx', 'utf-8');
content = content.replace(/<\/CardContent>\n\s*<\/Card>\n\s*\);\n\}/g, '</CardContent>\n            </Card>\n  );\n}');
// If it failed because of unterminated jsx contents, there might be a missing </Card> or </CardContent>
console.log(content.slice(-200));
