# Codebase Analysis & Improvement Plan

## 1. Security (High Risk)

### Findings
*   **Token Storage:** GitHub Personal Access Tokens (PAT) are stored as `TEXT` in the `user_settings` Supabase table. This is a critical vulnerability; if the database is compromised, all tokens are leaked.
*   **XSS Vulnerability:** The application lacks a Content Security Policy (CSP), and tokens are stored in `sessionStorage`. While `sessionStorage` prevents CSRF, it is vulnerable to XSS.
*   **Access Control:** RLS policies are in place, but the `repos` table is globally readable by authenticated users ("Authenticated users can view repos"). This seems intended for the "social" aspect but should be verified against privacy requirements.

### Recommendations
*   **Implement Client-Side Encryption:** Encrypt tokens with a user-derived key (e.g., PBKDF2 from a PIN or password) before sending them to Supabase.
*   **Enforce CSP:** Add a strict `<meta http-equiv="Content-Security-Policy">` tag to `index.html`.
*   **Audit Dependencies:** Regularly run `bun audit`.

## 2. Performance (High Risk)

### Findings
*   **Rendering Bottleneck:** `RepoList.tsx` renders all repositories at once (`repos.map`). For users with thousands of stars, this causes severe DOM bloat and main-thread blocking.
*   **Database Queries:** `db.getStats()` iterates through the entire `repos` object store (O(N)) to count translated items. This is inefficient for large datasets.
*   **Image Loading:** `RepoCard` uses standard `<img>` tags without `loading="lazy"`. Loading 100+ GitHub avatars simultaneously will saturate the network.

### Recommendations
*   **Virtualization:** Implement `react-window` or `react-virtuoso` in `RepoList` to render only visible items.
*   **Database Indexing:** Add a `by-translation-status` index to IndexedDB to allow O(1) counting of translated repositories.
*   **Lazy Loading:** Add `loading="lazy"` to all avatar images.

## 3. Code Architecture & Maintainability

### Findings
*   **Component Complexity:** `RepoCard.tsx` is "fat", handling translation fetching, intersection observation, date formatting, and UI rendering. This violates the Single Responsibility Principle.
*   **Type Safety:** `src/utils/db.ts` uses `any` for metadata values.

### Recommendations
*   **Custom Hooks:** Extract logic into `useRepoTranslation` and `useRepoObserver` hooks.
*   **Strict Typing:** Define a `Metadata` union type for the database.

## 4. UI/UX & Accessibility

### Findings
*   **Accessibility:** Icon-only buttons (DeepWiki, ZRead links) lack `aria-label` attributes, making them inaccessible to screen readers.
*   **Keyboard Navigation:** `RepoCard` interactive elements should be verified for focus states.

### Recommendations
*   **ARIA Labels:** Add descriptive labels to all icon-only buttons.
*   **Focus Management:** Ensure custom interactive elements support `Tab` navigation.

## 5. Documentation

### Findings
*   **Missing Architecture Docs:** The complex data flow (Supabase -> Worker -> IndexedDB -> UI) is implicit in the code but not documented.

### Recommendations
*   **Create ARCHITECTURE.md:** Document the sync strategy and local-first data model.
