## 2026-02-17 - Prevent Plaintext Token Storage
**Vulnerability:** The `updateCloudConfig` function in `src/hooks/useProfile.ts` was blindly upserting the entire configuration object, including the sensitive GitHub Personal Access Token (PAT), into the `profiles` table in the database.
**Learning:** Even unused or legacy code paths (if accessible) can serve as vectors for data leaks. The codebase is in a transition state between `profiles` (legacy) and `user_settings` (new), and this ambiguity increased the risk.
**Prevention:** Implement strict redaction logic at the boundary of any data persistence layer. Adopt a "deny by default" strategy for sensitive fields. The `useAppConfig` hook already implemented this for local storage; `useProfile` needed to match this security posture.
