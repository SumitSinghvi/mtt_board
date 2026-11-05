import { describe, it, expect, vi, beforeEach } from "vitest"

// Fake Supabase: each table is either a row array (served in .range() pages, capped like PostgREST) or an error.
const tables: Record<string, unknown[] | { error: string }> = {}
const SERVER_MAX_ROWS = 1000
const rangeCalls: string[] = []

vi.mock("./supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./supabase")>()
  const from = (table: string) => {
    const builder = {
      select: () => builder,
      order: () => builder,
      eq: () => builder,
      range: (start: number, end: number) => {
        rangeCalls.push(table)
        const t = tables[table] ?? []
        if (!Array.isArray(t)) return Promise.resolve({ data: null, error: { message: t.error } })
        const stop = Math.min(end + 1, start + SERVER_MAX_ROWS, t.length)
        return Promise.resolve({ data: t.slice(start, Math.max(start, stop)), error: null })
      },
    }
    return builder
  }
  return { ...actual, supabase: { from } }
})

const { fetchAllRows } = await import("./supabase")
const { fetchBoardsFromSupabase } = await import("./boardSync")

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k]
  rangeCalls.length = 0
})

describe("fetchAllRows", () => {
  const pager = (n: number, cap: number) => (from: number, to: number) => {
    const stop = Math.min(to + 1, from + cap, n)
    return Promise.resolve({ data: Array.from({ length: Math.max(0, stop - from) }, (_, i) => from + i), error: null })
  }

  it.each([
    [0, 1000],
    [999, 1000],
    [1000, 1000],
    [2500, 1000],
    [2500, 500], // server max-rows below our page size
  ])("returns all %i rows when server caps at %i", async (n, cap) => {
    const { data, error } = await fetchAllRows(pager(n, cap))
    expect(error).toBeNull()
    expect(data).toEqual(Array.from({ length: n }, (_, i) => i))
  })

  it("surfaces an error from a later page", async () => {
    let call = 0
    const { error } = await fetchAllRows(() =>
      Promise.resolve(call++ === 0 ? { data: [1, 2], error: null } : { data: null, error: { message: "boom" } })
    )
    expect(error?.message).toBe("boom")
  })
})

describe("fetchBoardsFromSupabase", () => {
  const board = { id: "b1", title: "B", position: 0, created_at: "2026-01-01" }
  const column = { id: "c1", board_id: "b1", title: "To Do", position: 0 }

  it("throws (does not return []) when any query fails", async () => {
    tables.boards = [board]
    tables.columns = [column]
    tables.tasks = { error: "JWT expired" }
    await expect(fetchBoardsFromSupabase()).rejects.toThrow("tasks: JWT expired")

    tables.boards = { error: "network" }
    tables.tasks = []
    await expect(fetchBoardsFromSupabase()).rejects.toThrow("boards: network")
  })

  it("returns [] only when boards table is confirmed empty", async () => {
    tables.boards = []
    tables.columns = []
    tables.tasks = []
    await expect(fetchBoardsFromSupabase()).resolves.toEqual([])
  })

  it("loads more than 1000 tasks (no silent PostgREST cap) and maps them to columns", async () => {
    tables.boards = [board]
    tables.columns = [column]
    tables.tasks = Array.from({ length: 2300 }, (_, i) => ({
      id: `t${i}`,
      column_id: "c1",
      title: `Task ${i}`,
      position: i,
      pax_adults: null,
      pax_kids: null,
    }))
    const boards = await fetchBoardsFromSupabase()
    expect(boards).toHaveLength(1)
    expect(boards[0].columns[0].tasks).toHaveLength(2300)
  })

  it("queries boards, columns and tasks in parallel", async () => {
    tables.boards = [board]
    tables.columns = [column]
    tables.tasks = []
    await fetchBoardsFromSupabase()
    // All three first pages are requested before any second page.
    expect(rangeCalls.slice(0, 3).sort()).toEqual(["boards", "columns", "tasks"])
  })
})
