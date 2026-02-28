# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2024-05-22 - IndexedDB O(N) Bottleneck
**Learning:** `getStats` and `getUntranslatedRepos` were performing full object store scans (O(N)) because no index existed for `translation_status`. Loading all values into memory just to check a property is extremely expensive for large datasets.
**Action:** Always create indexes for fields used in filtering or counting. Use `countFromIndex` and `openCursor(IDBKeyRange.only(...))` for O(1) or O(K) performance.
