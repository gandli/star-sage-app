## 2024-05-22 - [Missing ARIA Labels on Icon-Only Buttons]
**Learning:** The app frequently uses icon-only buttons (Lucide icons) for key actions (navigation, theme, sync) without providing `aria-label` or `title` (or relying only on `title`), making them inaccessible to screen reader users.
**Action:** When creating new icon-only buttons, strictly enforce the use of `aria-label`. Audit existing components like `Header` and `Sidebar` to retroactively add them.

## 2025-02-18 - [Modal Close Buttons Accessibility]
**Learning:** Modals often use icon-only "X" buttons for closing. These are frequently missed in accessibility audits because they are transient UI elements.
**Action:** When auditing or building modals/dialogs, explicitly check the close button for an accessible name (aria-label) and verify it with a unit test.
