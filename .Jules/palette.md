## 2024-05-22 - [Missing ARIA Labels on Icon-Only Buttons]
**Learning:** The app frequently uses icon-only buttons (Lucide icons) for key actions (navigation, theme, sync) without providing `aria-label` or `title` (or relying only on `title`), making them inaccessible to screen reader users.
**Action:** When creating new icon-only buttons, strictly enforce the use of `aria-label`. Audit existing components like `Header` and `Sidebar` to retroactively add them.

## 2024-05-24 - [Semantic Navigation Elements]
**Learning:** Key navigation items in the Sidebar were implemented as `div`s with `onClick` handlers, lacking keyboard accessibility and proper semantic roles for screen readers.
**Action:** Always use `<button>` or `<a>` tags for interactive navigation elements. For button-like behavior in lists, ensure they have `type="button"` and retain visual styling (e.g., `text-left`, `w-full`) to match the design while ensuring accessibility.
