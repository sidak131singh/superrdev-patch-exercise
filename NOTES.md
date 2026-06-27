# NOTES.md

## Summary of Changes

**Change 6 — Sort order: oldest first (Low):** `TaskRepository.java`, `search_tasks.sql`, `task_search_package.sql` — changed `ORDER BY created_at DESC` to `ASC` so task ID 1 (oldest) appears first and ID 49 (newest) last. Matches the natural expectation of a task list read top-to-bottom in creation order.

**Change 7 — Restore page on search clear (Low):** `App.jsx` — when the user starts typing a search the current page is saved in a `useRef`; when the search is fully cleared (backspace to empty) the saved page is restored. Previously clearing the search always jumped to page 1 regardless of where the user was browsing.

**Bug 1 — SQL operator precedence (High):** `TaskRepository.java`, `search_tasks.sql`, and the Oracle package all had a missing parenthesis around the `OR` condition. Because `AND` binds tighter than `OR`, the `archived = FALSE` filter only applied to title matches and the `status` filter only applied to description matches. Archived tasks leaked into results, and the status dropdown was effectively ignored for title-matched rows. Fix: wrapped both `LIKE` conditions in parentheses.

**Bug 2 — Artificial `Thread.sleep` delay (High):** `TaskController.java` slept up to 1000 ms per request (longer for shorter queries). The empty-search on initial page load incurred the full 1-second penalty. Removed the sleep and the dead variables entirely.

**Bug 3 — `setLoading(false)` missing on error (High):** In `useTasks.js`, the `.catch` branch set `error` but never cleared `loading`. `TaskTable` checks `loading` before `error`, so the UI was permanently stuck showing "Loading tasks…" after any fetch failure. Added `setLoading(false)` in the catch block.

**Bug 4 — Page not reset on filter change (Medium):** Changing the search query or status filter left the `page` counter at its previous value, silently returning an empty page. Wrapped the two state setters in `App.jsx` to also call `setPage(1)`.

**Bug 5 — No search debounce (Medium):** Every keystroke fired a backend request. Added a 300 ms debounce via `setTimeout`/`clearTimeout` inside `useTasks.js`. Also clears stale errors at the start of each new fetch.

## What I Chose Not to Change

Input validation on `pageSize`/`page` (negative values or absurdly large pages) — real fix requires schema-level guards; out of scope for a read-only exercise. No new endpoints or UI features added.

## Biggest Remaining Risk

The backend loads the **entire matching result set into memory** before slicing for pagination. For large datasets this will cause out-of-memory errors. The fix is SQL-level `LIMIT`/`OFFSET` (or Spring Data `Pageable`), but that requires a more invasive repository change.

## Tools / AI Used

Used Cursor (Claude Sonnet) to explore the codebase, identify bugs, and draft fixes. Each fix was manually reviewed and verified against live API responses before committing. Detailed explanations are in the handwritten notes.
