const fs = require('fs');
const file = 'src/app/(app)/order-flow/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldStr = `  function calculateMarketSentiment(): number {
    if (!stats || stats.totalOrders === 0) return 0.5;

    const recentOrders = orderFlowData.slice(-20); // Last 20 orders
    const buyOrders = recentOrders.filter(order => order.orderType === 'buy').length;
    const sellOrders = recentOrders.filter(order => order.orderType === 'sell').length;

    if (buyOrders + sellOrders === 0) return 0.5;`;

const newStr = `  function calculateMarketSentiment(): number {
    if (!stats || stats.totalOrders === 0) return 0.5;

    const recentOrders = orderFlowData.slice(-20); // Last 20 orders
    let buyOrders = 0;
    let sellOrders = 0;
    for (let i = 0; i < recentOrders.length; i++) {
      if (recentOrders[i].orderType === 'buy') buyOrders++;
      else if (recentOrders[i].orderType === 'sell') sellOrders++;
    }

    if (buyOrders + sellOrders === 0) return 0.5;`;

if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(file, content);
  console.log("Replaced successfully");
} else {
  console.log("Could not find the string to replace");
}
