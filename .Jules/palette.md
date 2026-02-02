## 2024-05-22 - [Missing ARIA Labels on Icon-Only Buttons]
**Learning:** The app frequently uses icon-only buttons (Lucide icons) for key actions (navigation, theme, sync) without providing `aria-label` or `title` (or relying only on `title`), making them inaccessible to screen reader users.
**Action:** When creating new icon-only buttons, strictly enforce the use of `aria-label`. Audit existing components like `Header` and `Sidebar` to retroactively add them.

## 2025-02-14 - [Form Inputs Missing Label Associations]
**Learning:** Found inputs in modals (like `SettingsModal`) that have visual labels but lack programmatic `htmlFor`/`id` association, making them hard to target for testing and inaccessible to screen readers.
**Action:** Always link `label` and `input` with `htmlFor` and `id` when creating forms. This also enables easier testing with `getByLabelText`.
