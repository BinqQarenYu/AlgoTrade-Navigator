## 2024-05-18 - Screen Reader Labels for Identical-Looking Buttons
**Learning:** Adding screen reader text (e.g., `<span className="sr-only">`) to icon-only buttons is crucial, but it must be highly specific to the component's context (e.g., 'Configure Strategy Parameters' rather than a generic 'Settings') to distinguish identical-looking buttons on the same page.
**Action:** Always provide descriptive, action-oriented text for `sr-only` spans wrapping icon-only buttons to ensure clear accessibility.
