# Phase 2 Audit: Correctness & Data Integrity

Date: 2026-11-05 · Scope: `src/lib/boardSync.ts`, `src/store/boardStore.ts`, `src/store/authStore.ts`, payments, reminders, `useHashRouter`.
Method: static review + small runtime checks (node). Live DB schema **not** inspected (Supabase MCP denied access to project `eflwqmybzutiddnokljn`).

## Critical

### C1. Fetch failure or empty result re-seeds demo boards over real data
`boardSync.ts:12-14` returns `[]` on *any* error (network, RLS, expired JWT). `boardStore.ts:141-146` treats `[]` as "DB empty" and runs `seedInitialBoardToSupabase` → **upserts** `board-tour-bookings`, `col-inquiry`, `task-1..` with demo content.
- If those IDs still exist in prod (the DB was originally seeded from them), real rows get overwritten with demo titles, customers, amounts.
- If an admin deletes every board, the next load brings the demo boards back.
- Fix: return `{ data, error }` and seed only on confirmed `data.length === 0 && !error`. Better: remove client seeding and seed via a migration.

### C2. Whole-row upsert = last write wins on JSON columns (comments, payments, reminders)
`syncTaskToSupabase` (`boardSync.ts:236`) upserts the full task, including `activities`, `checklist`, `reminders`, `payment_tracking` JSON blobs. There is no realtime subscription (`fetchBoardsFromSupabase` only runs on login, `App.tsx:48`), so each user edits a stale copy.
- Scenario: staff A adds a comment and staff B records an installment on the same card → whichever save lands last wipes the other's change. Payment records and comments are silently lost.
- Fix (short term): add `updated_at` optimistic concurrency (`.eq("updated_at", prev)`; on 0 rows, refetch + toast). Long term: move activities/installments to child tables and add Supabase realtime.

### C3. Task position is reset to 0 on every edit
`updateTask` calls `syncTaskToSupabase(..., task, 0, ...)` (`boardStore.ts:457`). `addTask` uses 0. `moveTask` uses `targetIndex ?? 0`, and `KanbanBoard.tsx:101,123` never passes `targetIndex`, so a dropped card goes to the bottom locally and to position 0 in the DB. Sibling positions are never rewritten.
- Result: after reload, card order differs from what users saw. Every edited card jumps to the top.
- Fix: never send `position` from `updateTask` (omit the field). On move, rewrite positions for the affected column(s) in one batched upsert.

### C4. Sync errors are swallowed; the local cache diverges from the DB
Every `boardSync` function only calls `console.error`. `deleteTaskFromSupabase` returns a boolean that `deleteTask` ignores (`boardStore.ts:481`). The store persists to localStorage (`mtt-boards-storage`), so a failed write *looks* saved until the next successful fetch replaces local state and the change vanishes.
- Fix: surface failures (sonner toast), roll back the optimistic update or mark the item "unsynced", and await the delete before removing it from the UI.

## High

### H1. Column order and column titles not persisted correctly
- `moveColumn` (`boardStore.ts:367`) never syncs → column order is lost on reload.
- `updateColumnTitle` calls `syncColumnToSupabase(boardId, columnId, title)` with default `position = 0` (`boardStore.ts:364`) → renaming a column moves it to first place after reload.

### H2. Deleting a column silently drops its tasks
`deleteColumn` removes the column and its tasks locally and deletes only the `columns` row. If `tasks.column_id` has no `ON DELETE CASCADE`, orphan tasks remain in the DB (invisible, still counted nowhere). If it does cascade, cards are hard-deleted with no confirmation of the count. **Verify FK rules** (not checked; MCP access denied). The same applies to `deleteBoard`.

### H3. `@all` / `@admin` mentions never match
`/\b@all\b/i`: `\b` before `@` needs a word character in front. Verified: `"hey @all"` → false, `"@all team"` → false, `"a@all"` → true. Used in 7 places (`useAssignedTaskReminders.ts`, `NotificationPopover.tsx`, `Topbar.tsx`, …). Fix: `/(^|\s)@all\b/i`.

### H4. "Today" is computed in UTC
`new Date().toISOString().split("T")[0]` appears in 12 files (13 uses), including reminders, dashboards, My Tasks and Topbar. In IST (UTC+5:30), from 00:00 to 05:30 "today" is still yesterday, so due-today and overdue badges and reminder toasts are wrong for 5.5 h each day. `getLocalDateString()` already exists in `src/lib/date.ts`; use it everywhere.

### H5. Logout leaves the previous user's boards and customer PII in the store and localStorage
`signOut` (`authStore.ts:215`) clears only the auth state. `mtt-boards-storage` keeps every board, customer phone number and payment. The next user on the same browser sees that data until their fetch finishes, or permanently if the fetch fails (see C1). Fix: `useBoardStore.persist.clearStorage()` and reset state on sign-out. Also overlaps with Phase 1.

## Medium

### M1. ID collisions via `Date.now()`
`task-${Date.now()}`, `col-${Date.now()}`, `board-${Date.now()}`, `act-${Date.now()}` (`boardStore.ts`). Two clients creating in the same millisecond, or a fast double-click, produce the same ID, and `upsert` **overwrites** the other row. `generateId()` (crypto UUID) already exists in `utils.ts`; use it.

### M2. Payment amounts unvalidated
- `<input type="number">` with `Number(val)` accepts negatives, so a negative installment reduces "received" (`CardPaymentSection.tsx:245`). Add `min=0` and clamp.
- Overpayment is hidden: `pending = Math.max(0, total - received)` and the excess is never shown.
- `advancePaid` is written by `NewCardModal.tsx:216` but ignored by `getPaymentSummary`, so the advance never counts as received unless it is re-entered as an installment.
- Fetch maps `amount: row.amount ? … : undefined` (`boardSync.ts:52-53`), so a ₹0 amount or advance becomes undefined. Use `!= null`.

### M3. Reminder and mention toast spam on every load
- Description and sub-card note mentions have no age cutoff (`useAssignedTaskReminders.ts:101-145`), and dedupe is in memory only (`toastedRef`), so every reload or new tab re-toasts every historic mention and overdue reminder, with a chime each time.
- Fix: persist seen keys (the `mtt_seen_mention_*` pattern already exists) and apply the 2-day cutoff to notes too.

### M4. Reminders ignore `dueTime` and never fire on their own
The effect runs only when `boards` change. There is no timer, so a reminder due at 15:00 fires at load time (any hour of that day), and one coming due while the app sits open never fires.

### M5. Substring mention matching
`contentLower.includes("@" + id)` means user `raj` is notified for `@rajesh`. Match on a word boundary.

## Low
- `paxAdults: row.pax_adults !== null ? Number(...)`: an undefined column gives `NaN` (`boardSync.ts:60-61`).
- Fetch default `modules` omits `outgoingPayment` while `createBoard` includes it (cosmetic inconsistency).
- Router guard 1b (`useHashRouter.ts:227`) omits `audit-logs`. Rendering is still gated in `App.tsx:94`, so this is a URL/UX issue only.
- `fetchBoardsFromSupabase` keeps stale persisted `generalReminders` when the remote list is empty (`boardStore.ts:130`), so deleted reminders reappear locally.

## Suggested fix order
1. C1 (guard seeding): small change, prevents catastrophic overwrite.
2. C3 + H1 (positions): stop sending `position` on edit; persist column order.
3. C4 (surface errors and roll back).
4. H3, H4, M1: mechanical find-and-replace fixes.
5. H5 (clear store on logout).
6. C2 (concurrency): needs a design choice (optimistic lock vs. child tables + realtime).

## Not verified
- Live FK and cascade rules for `tasks`/`columns`/`boards` (H2).
- Whether prod still contains the seed IDs (impact of C1).
- No runtime multi-user reproduction was done. C2 and C3 are derived from the code.
