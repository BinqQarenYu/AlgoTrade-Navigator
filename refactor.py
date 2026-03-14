import re

filepath = "src/app/(app)/order-flow/page.tsx"

with open(filepath, 'r') as f:
    lines = f.readlines()

# Find insertion point: line 293 (0-indexed 292)
# Let's search for "const [veryLargeActivityLog, setVeryLargeActivityLog] = useState<string[]>([]);"
insert_idx = -1
for i, line in enumerate(lines):
    if "const [veryLargeActivityLog, setVeryLargeActivityLog] = useState<string[]>([]);" in line:
        insert_idx = i + 1
        break

if insert_idx == -1:
    print("Could not find insertion point")
    exit(1)

use_memo_block = """
  const { buyOrderCount, sellOrderCount } = React.useMemo(() => {
    let buy = 0;
    let sell = 0;
    for (let i = 0; i < orderFlowData.length; i++) {
      if (orderFlowData[i].orderType === 'buy') buy++;
      else if (orderFlowData[i].orderType === 'sell') sell++;
    }
    return { buyOrderCount: buy, sellOrderCount: sell };
  }, [orderFlowData]);
"""

lines.insert(insert_idx, use_memo_block)

content = "".join(lines)

# Replace occurrences
content = content.replace("orderFlowData.filter(o => o.orderType === 'buy').length", "buyOrderCount")
content = content.replace("orderFlowData.filter(o => o.orderType === 'sell').length", "sellOrderCount")

# One subtle thing: in the getTradingSignal function, it uses recentOrders.filter instead of orderFlowData.filter.
# Looking at the code: `const buyOrders = recentOrders.filter(o => o.orderType === 'buy').length;`
# Our change only replaced orderFlowData.filter, which is correct because we only memoized over orderFlowData.

with open(filepath, 'w') as f:
    f.write(content)

print("Refactoring complete.")
