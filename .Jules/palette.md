## 2024-05-22 - [Missing ARIA Labels on Icon-Only Buttons]
**Learning:** The app frequently uses icon-only buttons (Lucide icons) for key actions (navigation, theme, sync) without providing `aria-label` or `title` (or relying only on `title`), making them inaccessible to screen reader users.
**Action:** When creating new icon-only buttons, strictly enforce the use of `aria-label`. Audit existing components like `Header` and `Sidebar` to retroactively add them.
