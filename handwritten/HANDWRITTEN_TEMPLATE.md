# Handwritten Notes Template

This file is a **placeholder only**. For each bug below, write the explanation by hand on paper,
photograph it, and replace this file with the image(s) placed in this `handwritten/` folder.

---

## Bug 1 — SQL Operator Precedence

- **File(s) / Layer:** `backend/src/main/java/com/internal/tasktracker/TaskRepository.java` (line 14–17); also `db/queries/search_tasks.sql` and `db/oracle/task_search_package.sql`
- **Where the bug is:** The `@Query` native SQL `WHERE` clause uses `AND` and `OR` without parentheses around the `OR` group
- **How it was discovered:** Ran `GET /api/tasks?q=api` and saw tasks with `archived: true` in the response; then ran `GET /api/tasks?q=api&status=OPEN` and saw a task with `status: "IN_PROGRESS"` returned
- **Root cause:** SQL operator precedence — `AND` binds more tightly than `OR`. The query `WHERE archived=FALSE AND title LIKE :term OR description LIKE :term AND (status=...)` evaluates as `(archived=FALSE AND title LIKE :term) OR (description LIKE :term AND (status=...))`. The `archived` guard and status filter only apply to one branch each.
- **Fix implemented:** Added parentheses: `WHERE archived = FALSE AND (title LIKE :term OR description LIKE :term) AND (:status IS NULL OR status = :status)`. Applied the same fix to `search_tasks.sql` and both SQL blocks in `task_search_package.sql`.
- **Why this approach:** Minimal targeted change — one set of parentheses restores the intended semantics without altering the query structure.

---

## Bug 2 — Artificial Thread.sleep Delay

- **File(s) / Layer:** `backend/src/main/java/com/internal/tasktracker/TaskController.java` (lines 36–42)
- **Where the bug is:** Inside the `searchTasks` handler, before calling the repository
- **How it was discovered:** Initial API calls took ~700–1000 ms even against the in-memory H2 database; tracing the code found `Thread.sleep(queryWeight)` where `queryWeight = (10 - query.length()) * 100`
- **Root cause:** A "complexity estimation" block sleeps up to 1000 ms — inversely proportional to query length, so empty or short searches are penalised most. The sleep has no relation to logging or any useful behaviour.
- **Fix implemented:** Deleted the `complexityScore`, `queryWeight`, and `Thread.sleep` block entirely. Kept the `System.out.println` log line (minus the `complexity` field).
- **Why this approach:** Removing dead code entirely is cleaner than commenting it out. No useful behaviour was lost.

---

## Bug 3 — Missing setLoading(false) on Error

- **File(s) / Layer:** `frontend/src/hooks/useTasks.js` (lines 19–21)
- **Where the bug is:** The `.catch` callback in the `useEffect`
- **How it was discovered:** Code review — `setLoading(true)` is called before the fetch, `setLoading(false)` is called in `.then`, but the `.catch` only calls `setError`. `TaskTable` renders the loading state before the error state, so a failed fetch leaves the UI showing "Loading tasks…" indefinitely.
- **Root cause:** Incomplete error handling — the loading flag is never cleared on failure.
- **Fix implemented:** Added `setLoading(false)` inside the `.catch` block.
- **Why this approach:** One-line fix, no side effects. Also added `setError(null)` at the top of the effect so stale errors are cleared when a new fetch starts (done as part of Bug 5 fix).

---

## Bug 4 — Page Not Reset on Filter Change

- **File(s) / Layer:** `frontend/src/App.jsx` (lines 24–25)
- **Where the bug is:** `setQuery` and `setStatus` are passed directly to child components; changing either does not reset `page`
- **How it was discovered:** If the user is on page 3 of results, changes the status filter, and the new filter has fewer than 20 results, the hook requests page 3 of an empty range and shows "No tasks found" even though results exist on page 1.
- **Root cause:** `page` is independent state that is never reset when the search parameters change.
- **Fix implemented:** Replaced `onChange={setQuery}` / `onChange={setStatus}` with wrapper functions `handleQueryChange` / `handleStatusChange` that call both the setter and `setPage(1)`.
- **Why this approach:** Minimal — no new state, no useEffect, no prop drilling change. Clear intent.

---

## Bug 5 — No Search Debounce

- **File(s) / Layer:** `frontend/src/hooks/useTasks.js`
- **Where the bug is:** `useEffect` fires immediately on every change of `query`, so every keystroke triggers a backend request
- **How it was discovered:** Observing the browser Network tab while typing a multi-character search term
- **Root cause:** No debounce mechanism — the effect re-runs on every render caused by `query` changing.
- **Fix implemented:** Wrapped `fetchTasks` in a `setTimeout` of 300 ms and returned a cleanup function that calls `clearTimeout`. The effect cancels the pending timer whenever `query` changes before 300 ms elapses.
- **Why this approach:** Native `setTimeout`/`clearTimeout` with no new dependencies. 300 ms is a standard debounce window — responsive but not noisy.

---

## Change 6 — Sort Order: Oldest First

- **File(s) / Layer:** `backend/src/main/java/com/internal/tasktracker/TaskRepository.java`; also `db/queries/search_tasks.sql` and `db/oracle/task_search_package.sql`
- **Where the change is:** The `ORDER BY` clause in every SQL query
- **How it was discovered:** The UI showed task ID 49 at the top and ID 1 at the bottom — reverse chronological order, which is counter-intuitive for a task tracker where you want to see the oldest (first-created) tasks first
- **Root cause:** `ORDER BY created_at DESC` was used in the original query
- **Fix implemented:** Changed to `ORDER BY created_at ASC` in all three SQL locations
- **Why this approach:** One-word change per file, no structural impact. ASC order matches the natural expectation of reading a task list created sequentially from top to bottom.

---

## Change 7 — Restore Page When Search Is Cleared

- **File(s) / Layer:** `frontend/src/App.jsx`
- **Where the change is:** `handleQueryChange` function
- **How it was discovered:** Navigating to page 3, typing a search query (which correctly resets to page 1), then clearing the search — the page stayed at 1 instead of returning to page 3
- **Root cause:** The earlier fix that resets `page` to 1 on every `query` change also triggered when the query was cleared back to empty, discarding the user's navigation position
- **Fix implemented:** Added a `useRef` (`preSearchPage`) to remember the page at the moment the user starts typing. When the query transitions from non-empty back to empty (search cleared), `setPage(preSearchPage.current)` restores it. When refining mid-search, page stays at 1.
- **Why this approach:** `useRef` persists across renders without causing extra renders, making it the right tool for storing a side-effect-free "memory" value. The logic covers three cases explicitly: search start (save + jump to 1), search clear (restore), mid-type (stay at 1).
