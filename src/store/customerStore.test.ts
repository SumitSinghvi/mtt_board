// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"

let rows: unknown[] | { error: string } = []
const upsert = vi.fn(() => Promise.resolve({ error: null }))

vi.mock("../lib/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/supabase")>()
  const builder = {
    select: () => builder,
    order: () => builder,
    range: (start: number, end: number) =>
      Promise.resolve(
        Array.isArray(rows)
          ? { data: rows.slice(start, end + 1), error: null }
          : { data: null, error: { message: rows.error } }
      ),
    upsert,
  }
  return { ...actual, supabase: { from: () => builder } }
})

const { useCustomerStore } = await import("./customerStore")
const store = () => useCustomerStore.getState()

beforeEach(() => {
  upsert.mockClear()
  useCustomerStore.setState({ customers: [] })
})

describe("fetchCustomersFromSupabase (P6)", () => {
  it("starts with no demo customers", () => {
    expect(useCustomerStore.getInitialState().customers).toEqual([])
  })

  it("empty table clears stale local list and seeds nothing", async () => {
    useCustomerStore.setState({ customers: [{ id: "stale", name: "Old", createdAt: "2026-01-01" }] })
    rows = []
    await store().fetchCustomersFromSupabase()
    expect(store().customers).toEqual([])
    expect(upsert).not.toHaveBeenCalled()
  })

  it("keeps local list on fetch error", async () => {
    const local = [{ id: "c1", name: "Local", createdAt: "2026-01-01" }]
    useCustomerStore.setState({ customers: local })
    rows = { error: "network" }
    await store().fetchCustomersFromSupabase()
    expect(store().customers).toEqual(local)
  })

  it("loads more than 1000 customers", async () => {
    rows = Array.from({ length: 1500 }, (_, i) => ({ id: `c${i}`, name: `N${i}`, created_at: "2026-01-01" }))
    await store().fetchCustomersFromSupabase()
    expect(store().customers).toHaveLength(1500)
  })
})
