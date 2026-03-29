# Palette's Journal - Critical Learnings Only

## 2025-05-15 - Initial Setup
**Learning:** Started exploring the codebase for micro-UX improvements. Focus is on accessibility, feedback, and visual polish.
**Action:** Always check icon-only buttons for ARIA labels and interactive elements for focus states.

## 2026-03-28 - Missing focus states on custom UI overlays
**Learning:** Custom UI components like draggable overlays often miss focus indicators on their close buttons, making them inaccessible to keyboard users, despite having valid hover styles.
**Action:** Always ensure custom button elements explicitly define `focus-visible` styling and semantic `aria-label`s, especially when they only contain icons.

## 2025-05-15 - Missing ARIA labels on icon-only control buttons
**Learning:** Found that key interactive elements for managing monitor bots (add `+` and remove `trash`) on the manual trading page relied solely on icons without any text or `aria-label`s, making them invisible to screen readers and potentially confusing without tooltips.
**Action:** When adding functional icon-only buttons (like `PlusCircle` or `Trash2`) in Shadcn UI layouts, always explicitly include `aria-label` and `title` properties directly on the `<Button>` to ensure full accessibility and native tooltip support without needing full `TooltipProvider` wrappers.
