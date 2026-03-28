# Palette's Journal - Critical Learnings Only

## 2025-05-15 - Initial Setup
**Learning:** Started exploring the codebase for micro-UX improvements. Focus is on accessibility, feedback, and visual polish.
**Action:** Always check icon-only buttons for ARIA labels and interactive elements for focus states.

## 2025-05-15 - Accessible Custom Interactive Elements
**Learning:** When using non-interactive elements like `div` or `span` as clickable controls (e.g., file upload dropzones), they must be explicitly given a `role="button"`, `tabIndex={0}`, and keyboard event handlers (`Enter`/`Space`) to be accessible to screen readers and keyboard-only users.
**Action:** Always implement the `role="button"`, `tabIndex={0}`, and `onKeyDown` pattern for any custom interactive `div` or `span` elements.
