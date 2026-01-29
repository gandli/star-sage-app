## 2025-02-12 - Worker Async Caching
**Learning:** Initializing UI with data computed in Web Workers causes a "flash of default content" or delay until the worker responds.
**Action:** Cache the worker's computation results (like stats) in `localStorage` on the main thread. Load this cache synchronously on startup to provide immediate data to the UI while the worker re-verifies/updates in the background.
