## 2026-02-08 - [Critical: Unused Code Token Leak]
**Vulnerability:** Plaintext storage of GitHub Personal Access Tokens in Supabase via `useProfile.ts`'s `updateCloudConfig` function.
**Learning:** Even unused code paths can introduce critical vulnerabilities if they expose sensitive data handling logic that might be activated in future refactors or by unaware developers.
**Prevention:** Always sanitize or hash sensitive data at the boundary (API calls, DB writes) regardless of current usage. Never assume a function won't be called.
