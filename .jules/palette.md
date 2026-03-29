
## 2024-05-15 - Dashboard Collapsible Panels Generic Toggle Labels
**Learning:** Collapsible panels across the dashboard were using either missing or generic "Toggle" `<span className="sr-only">` text. For screen readers, having multiple identical generic labels on a single page creates an ambiguous experience where the user doesn't know *what* they are toggling.
**Action:** When creating or modifying identical recurring collapsible or icon-only buttons on a single page, always ensure the screen reader text includes specific context (e.g., "Toggle Market Sentiment" instead of just "Toggle").
