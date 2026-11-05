# Phase 3 Audit: Quality & Performance

Date: 2026-11-06 · Branch: `fix/board-sync-integrity` (after commit `1301e09`).
Method: local `tsc -b`, `oxlint`, `vite build`, plus static review. No runtime profiling (React DevTools / Lighthouse) yet.

## Baseline

| Check | Result |
|---|---|
| `tsc -b` | clean |
| `oxlint` | 0 errors, 53 warnings (32 `react(purity)`, 8 `only-export-components`, 5 `set-state-in-effect`, 4 `exhaustive-deps`, 2 `preserve-manual-memoization`, 2 `immutability`) |
| `vite build` | ok; main chunk **641 kB (192 kB gzip)**, over the 500 kB warning |
| `any` usage | 6 occurrences in 6 files; no `@ts-ignore` / lint disables |
| Tests | none |

Note: `npx tsc` resolves to an old global TypeScript and fails on `tsconfig.app.json`. Use `npm run build` or `./node_modules/.bin/tsc`.

## High

### P1. Every keystroke re-serializes the whole dataset and re-renders the app
Title and description inputs in `CardModal.tsx:464` call `handleFieldChange` → `updateTask` on every keystroke, which:
1. Rebuilds `boards` (new array), then the `persist` middleware runs `JSON.stringify` on **all boards, tasks, activities and payments** into localStorage, synchronously, on the main thread.
2. Re-renders every component that calls `useBoardStore()` without a selector. Across all 5 stores there are **59 whole-store subscriptions in 32 files** versus 11 with selectors, including `App.tsx:26`, `useHashRouter.ts:62` (pulls `boards`) and `useAssignedTaskReminders` (re-scans every task and comment on each change).

Typing latency grows with data size. With a few hundred cards and long comment histories, every key press runs a full stringify and a full re-scan.
Fix:
- Use selectors (`useBoardStore((s) => s.currentView)`), or `useShallow` for multi-field picks.
- Keep title and description as local state and commit them to the store on blur or after a debounce (the sync is already debounced; the store write is not).
- Throttle persistence: use `persist`'s custom `storage` with a debounced `setItem`, or stop persisting `boards` altogether (this also helps Phase 2 H5).

### P2. Unpaginated fetches hit the PostgREST 1,000-row cap silently
`tasks`, `columns`, `customers`, `profiles`, `staff_todos` and `general_reminders` are fetched with `select("*")` and no `.range()`. Supabase's default `max-rows` is 1000, so once there are more than 1,000 tasks, cards **vanish from the UI with no error**. Customers are sorted newest first, so the oldest are dropped.
`tasks` also loads every task on every board (including archived) with full `activities` / `checklist` JSON on each login.
Fix: page with `.range()` until a short page comes back (quick), then load per board or skip archived boards (proper). Check the project's `max-rows` setting.

### P3. Sentry sees almost nothing useful
> **Resolved 2026-11-06:** Sentry removed entirely at owner's request; `Sentry.ErrorBoundary` replaced by a minimal built-in `ErrorBoundary` in `main.tsx`. Correction: the original audit wrongly said there was no error boundary; `main.tsx` did wrap `<App>` in `Sentry.ErrorBoundary`.

- ~~No `Sentry.ErrorBoundary` (or any error boundary)~~ (incorrect, see note above).
- No `captureException` anywhere. All sync failures go to `console.*` only (see Phase 2 C4), so failed saves never reach Sentry.
- No source maps are uploaded (`vite.config.ts` has no `build.sourcemap` and no Sentry Vite plugin), so production stack traces are minified.
- `tracesSampleRate: 1.0` traces 100% of sessions. Use 0.1–0.2 in production.
- A hard-coded DSN fallback (`main.tsx:10`) plus no `enabled` flag means local dev errors go to the production project, with `environment: "development"`.
- `Sentry.setUser({ id, email })` sends staff email (PII). Decide whether that's acceptable; `id` alone is enough for triage.

## Medium

### P4. Bundle: Sentry Replay and Supabase load eagerly
Route pages are already lazy (`App.tsx:16-23`, good). The 641 kB main chunk is mostly react-dom, `@supabase/supabase-js`, zod, sonner and `@sentry/react`. A separate 142 kB `utils` chunk contains the Sentry core. `replayIntegration` alone is roughly 50–70 kB gzip and is needed only for 10% of sessions.
Fix: load Replay with `Sentry.lazyLoadIntegration("replayIntegration")` after first paint. Optionally split vendor chunks via `build.rolldownOptions.output.codeSplitting` so app-code deploys don't bust the vendor cache.

### P5. `memo` on Kanban components is defeated
`KanbanCard` and `KanbanColumn` are wrapped in `memo` but call `useAuthStore()` with no selector (`KanbanCard.tsx:74`, `KanbanColumn.tsx:77`). Any auth-store change (profile refresh, error field) re-renders every card. Use `useAuthStore((s) => s.profile)`.

### P6. Customers seeded with demo data when the table is empty
`customerStore.ts:80-90`: same pattern as Phase 2 C1, but milder because errors *are* handled first. An empty customers table gets demo customers written into production. An empty result also keeps the stale persisted list.

### P7. Board load does 3 sequential round-trips
`fetchBoardsFromSupabase` awaits boards → columns → tasks one after another. Columns and tasks don't depend on boards' results. Run them with `Promise.all` to save about two RTTs per login.

### P8. Lint hot spots worth fixing (real bugs, not style)
- `CardModal.tsx:78-79`: effect syncs `localTitle`/`localDescription` from `currentTask` with missing deps, so the local state can go stale after a remote refresh or card switch.
- `useStaffPresence.ts:42`: missing `user` dep, so the heartbeat effect may keep a stale user after re-login.
- `SecretActivityPage.tsx:269`: `useMemo` missing `isSessionOnline`, so online status can be stale.
- 32 `react(purity)` warnings: `Date.now()` / `new Date()` called during render. Mostly harmless, but it makes "today" and "overdue" flip only on unrelated re-renders.

## Low
- 46 `catch` blocks that only log or ignore. These are covered by P3 and Phase 2 C4.
- 6 `any` (`boardSync.ts` `modules: any`, `todoStore.ts` row mapping, and others). Type the Supabase rows with `supabase gen types`.
- `only-export-components` warnings break Fast Refresh in 8 files (dev-only).
- `cn` 0.4.0 is a pre-1.0 replacement for clsx + tailwind-merge. It works, but it's young; pin it exactly.

## Test gaps (none exist; minimum to add)
No test runner is installed. Vitest fits Vite with zero config. Highest value first:
1. `getPaymentSummary` / `normalizeInstallments`: money math, legacy phases, negatives, overpayment.
2. `boardStore` move/add/update: local order matches the positions sent to sync (mock `boardSync`). This guards the Phase 2 C3 fix.
3. `fetchBoardsFromSupabase` error vs empty: seeding happens only on a confirmed-empty result. This guards C1.
4. `parseHash` / `buildHash` round-trip.
5. Mention matching (`@all`, `@name`, substring false positives). This guards Phase 2 H3 once fixed.
6. `formatDate` / `getLocalDateString`.

## Suggested fix order
1. P1 (selectors + debounced persist): biggest UX win.
2. P2 (pagination): latent data-loss bug, cheap to fix.
3. P3 (error boundary, captureException in sync, source maps, sample rate).
4. Add Vitest plus tests 1–3.
5. P4, P5, P7, P8.

## Not verified
- Actual render counts and typing latency. Needs React DevTools Profiler on a realistic dataset.
- The project's PostgREST `max-rows` setting and current table sizes (no DB access).
- Exact per-library bundle breakdown. Run a visualizer (e.g. `rollup-plugin-visualizer`) for precise numbers.
