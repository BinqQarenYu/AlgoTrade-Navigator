const fs = require('fs');

const fixFile = (file) => {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace(/<Card className="border-2/g, '<Card className="border-2');
    fs.writeFileSync(file, content);
};
['src/components/order-flow/charts/buy-sell-flow-chart.tsx'].forEach(fixFile);
