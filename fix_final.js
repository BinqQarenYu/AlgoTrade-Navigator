const fs = require('fs');

const extractAndFix = (file, cardLines) => {
    const originalContent = fs.readFileSync('src/components/order-flow/order-flow-charts.tsx', 'utf-8');
    // We already overwrote order-flow-charts.tsx, so we can't extract from it anymore.
    // Instead, let's just fix the files directly.

    let content = fs.readFileSync(file, 'utf-8');
    // Remove the bad wrappers we added earlier
    content = content.replace(/<div className="card-container">\n/g, '');
    content = content.replace(/<\/Card>\n    <\/div>\n  \);\n\}/g, '</Card>\n  );\n}');
    // Remove any trailing `</Card>` that got appended because of regex match failures
    content = content.replace(/<\/Card>\n\s*<\/Card>\n  \);\n\}/g, '</Card>\n  );\n}');

    // Also remove any leading block comments if they are not wrapped in a fragment
    // E.g., `{/* Risk Level Chart */}`
    content = content.replace(/\{\/\*.*?\*\/\}\n\s*<Card/g, '<Card');

    // Some cards might have nested <divs> that broke the replace.
    // Let's just do a clean regex from `return (` to the end.

    fs.writeFileSync(file, content);
};

['src/components/order-flow/charts/buy-sell-flow-chart.tsx',
 'src/components/order-flow/charts/risk-level-chart.tsx',
 'src/components/order-flow/charts/order-count-distribution.tsx',
 'src/components/order-flow/charts/net-order-flow.tsx',
 'src/components/order-flow/charts/flow-analytics-summary.tsx'].forEach(file => {
    extractAndFix(file);
});
