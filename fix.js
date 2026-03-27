const fs = require('fs');

const fixFile = (file) => {
    let content = fs.readFileSync(file, 'utf-8');
    // wrap the returned content in a fragment if it starts directly
    // and replace any leading `{/* ... */}` comments with standard JSX comments,
    // though the issue is that JSX expects a single root element without siblings
    // or the return statement has an issue

    // We can just find the return ( and put a <React.Fragment> after it and </React.Fragment> before );
    content = content.replace(/return\s*\(\s*/g, 'return (\n    <React.Fragment>\n');
    content = content.replace(/\s*\);\s*\}\s*$/g, '\n    </React.Fragment>\n  );\n}\n');
    fs.writeFileSync(file, content);
};

['src/components/order-flow/charts/buy-sell-flow-chart.tsx',
 'src/components/order-flow/charts/risk-level-chart.tsx',
 'src/components/order-flow/charts/order-count-distribution.tsx',
 'src/components/order-flow/charts/net-order-flow.tsx',
 'src/components/order-flow/charts/flow-analytics-summary.tsx'].forEach(fixFile);

console.log('Fixed JSX returns');
