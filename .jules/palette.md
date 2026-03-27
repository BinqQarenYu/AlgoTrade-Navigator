# Palette's Journal - Critical Learnings Only

## 2025-05-15 - Initial Setup
**Learning:** Started exploring the codebase for micro-UX improvements. Focus is on accessibility, feedback, and visual polish.
**Action:** Always check icon-only buttons for ARIA labels and interactive elements for focus states.

## 2026-03-27 - [Accessible Custom Interaction Elements]
**Learning:** Custom 'upload' areas built with `div`s are common but often lack keyboard accessibility and screen reader context. Using `role="button"` and `tabIndex={0}` is essential for making these elements navigable for all users.
**Action:** When creating custom interactive containers, always implement `onKeyDown` (for Enter/Space), appropriate ARIA roles, and clear focus-visible states.
