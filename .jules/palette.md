## 2025-03-29 - Tooltip Redundancy and Accessibility
**Learning:** `TooltipProvider` should be managed globally (e.g., in `providers.tsx`) to avoid redundant nesting. Additionally, `TooltipTrigger` does not fire on disabled elements in Radix UI; wrapping disabled buttons in a `<span>` ensures tooltips remain accessible.
**Action:** Centralize `TooltipProvider` and always wrap potentially disabled `TooltipTrigger` children in a `<span>`.
