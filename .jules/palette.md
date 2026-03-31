# Palette's Journal - Critical Learnings Only

## 2025-05-15 - Initial Setup
**Learning:** Started exploring the codebase for micro-UX improvements. Focus is on accessibility, feedback, and visual polish.
**Action:** Always check icon-only buttons for ARIA labels and interactive elements for focus states.

## 2026-03-28 - Missing focus states on custom UI overlays
**Learning:** Custom UI components like draggable overlays often miss focus indicators on their close buttons, making them inaccessible to keyboard users, despite having valid hover styles.
**Action:** Always ensure custom button elements explicitly define `focus-visible` styling and semantic `aria-label`s, especially when they only contain icons.

## 2026-03-28 - Tooltip Nesting with Dialog Triggers
**Learning:** Nesting `TooltipTrigger` directly around other Radix triggers (like `AlertDialogTrigger`) can cause event propagation issues or focus management bugs when both use `asChild`.
**Action:** Wrap the inner trigger in a neutral element like a `span` when wrapping it with a `TooltipTrigger` to ensure clean event handling.
