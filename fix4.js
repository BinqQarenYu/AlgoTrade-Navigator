const fs = require('fs');

const fixFile = (file) => {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace(/import \{ AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip \} from 'recharts';/g, "import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';");
    content = content.replace(/<Card className/g, '<Card className');
    fs.writeFileSync(file, content);
};

['src/components/order-flow/charts/buy-sell-flow-chart.tsx',
 'src/components/order-flow/charts/risk-level-chart.tsx',
 'src/components/order-flow/charts/order-count-distribution.tsx',
 'src/components/order-flow/charts/net-order-flow.tsx',
 'src/components/order-flow/charts/flow-analytics-summary.tsx'].forEach(fixFile);
