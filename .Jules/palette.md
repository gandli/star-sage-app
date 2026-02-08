## 2024-05-22 - [Missing ARIA Labels on Icon-Only Buttons]
**Learning:** The app frequently uses icon-only buttons (Lucide icons) for key actions (navigation, theme, sync) without providing `aria-label` or `title` (or relying only on `title`), making them inaccessible to screen reader users.
**Action:** When creating new icon-only buttons, strictly enforce the use of `aria-label`. Audit existing components like `Header` and `Sidebar` to retroactively add them.

## 2024-05-23 - [Inaccessible Form Inputs in SettingsModal]
**Learning:** Form inputs in `SettingsModal` had visual labels but lacked programmatic association (`id` + `htmlFor`), making them inaccessible to screen readers and harder to target in tests.
**Action:** Always ensure form inputs have a corresponding `id` that matches the label's `htmlFor` attribute. Use `getByLabelText` in tests to enforce this association.
