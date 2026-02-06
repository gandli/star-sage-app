## 2024-05-22 - [Missing ARIA Labels on Icon-Only Buttons]
**Learning:** The app frequently uses icon-only buttons (Lucide icons) for key actions (navigation, theme, sync) without providing `aria-label` or `title` (or relying only on `title`), making them inaccessible to screen reader users.
**Action:** When creating new icon-only buttons, strictly enforce the use of `aria-label`. Audit existing components like `Header` and `Sidebar` to retroactively add them.

## 2024-05-23 - [Semantic Navigation Buttons]
**Learning:** The sidebar used `div` elements with `onClick` handlers for navigation items, which excluded them from the keyboard tab order and screen reader interactivity. Converting them to `<button type="button">` immediately restored accessibility while maintaining the design with `w-full` and `text-left`.
**Action:** Always prefer semantic `<button>` or `<a>` tags for interactive elements over `div`s. Use CSS to reset styles if necessary, but never compromise semantics for layout convenience.
