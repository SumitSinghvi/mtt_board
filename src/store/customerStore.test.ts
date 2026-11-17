// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"

let rows: unknown[] | { error: string } = []
let writeError: { message: string } | null = null
const upsert = vi.fn(() => Promise.resolve({ error: null }))
const insert = vi.fn(() => Promise.resolve({ error: writeError }))
const update = vi.fn(() => ({ eq: () => Promise.resolve({ error: writeError }) }))
const del = vi.fn(() => ({ eq: () => Promise.resolve({ error: writeError }) }))

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
    insert,
    update,
    delete: del,
  }
  return { ...actual, supabase: { from: () => builder } }
})

const { useCustomerStore, phoneKey, findCustomerMatch } = await import("./customerStore")
const { useBoardStore } = await import("./boardStore")
const store = () => useCustomerStore.getState()

beforeEach(() => {
  upsert.mockClear()
  insert.mockClear()
  update.mockClear()
  del.mockClear()
  writeError = null
  useCustomerStore.setState({ customers: [] })
  useBoardStore.setState({ boards: [] })
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

describe("customer identity", () => {
  const rajesh1 = { id: "c1", name: "Rajesh Sharma", phone: "+91 98290 11223", createdAt: "x" }
  const rajesh2 = { id: "c2", name: "Rajesh Sharma", phone: "+91 97110 44556", createdAt: "x" }
  const anita = { id: "c3", name: "Anita", createdAt: "x" }

  it("phoneKey matches the SQL phone_key: last 10 digits, null when too short", () => {
    expect(phoneKey("+91 98290 11223")).toBe("9829011223")
    expect(phoneKey("09829011223")).toBe("9829011223")
    expect(phoneKey("12345")).toBeNull()
    expect(phoneKey(undefined)).toBeNull()
  })

  it("matches by phone first, never by an ambiguous name", () => {
    const list = [rajesh1, rajesh2, anita]
    expect(findCustomerMatch(list, { name: "R. Sharma", phone: "9829011223" })).toBe(rajesh1)
    expect(findCustomerMatch(list, { name: "Rajesh Sharma" })).toBeNull() // two Rajesh: ambiguous
    expect(findCustomerMatch(list, { name: "anita " })).toBe(anita)
  })

  it("does not match a same-name customer whose phone differs", () => {
    expect(findCustomerMatch([rajesh1], { name: "Rajesh Sharma", phone: "9999999999" })).toBeNull()
  })

  it("createCustomer never merges two people with the same name", async () => {
    useCustomerStore.setState({ customers: [rajesh1] })
    const created = await store().createCustomer({ name: "Rajesh Sharma", phone: "97110 44556" })
    expect(created.id).not.toBe(rajesh1.id)
    expect(store().customers).toHaveLength(2)
    expect(store().customers.find((c) => c.id === "c1")?.phone).toBe(rajesh1.phone) // untouched
  })

  it("createCustomer throws and adds nothing locally when the DB insert fails", async () => {
    writeError = { message: "RLS denied" }
    await expect(store().createCustomer({ name: "X" })).rejects.toThrow("RLS denied")
    expect(store().customers).toEqual([])
  })

  it("updateCustomer keeps old phone when the new one is empty, and updates linked cards locally", async () => {
    useCustomerStore.setState({ customers: [rajesh1] })
    useBoardStore.setState({
      boards: [
        {
          id: "b1",
          title: "B",
          icon: "x",
          createdAt: "x",
          columns: [
            {
              id: "col",
              title: "C",
              tasks: [
                { id: "t1", title: "T", priority: "medium", createdAt: "x", customerId: "c1", customerName: "Rajesh Sharma" },
                { id: "t2", title: "T", priority: "medium", createdAt: "x", customerName: "Rajesh Sharma" },
              ],
            },
          ],
        },
      ],
    })
    await store().updateCustomer("c1", { name: "Rajesh K. Sharma", phone: "" })
    expect(store().customers[0]).toMatchObject({ name: "Rajesh K. Sharma", phone: rajesh1.phone })
    const [linked, unlinked] = useBoardStore.getState().boards[0].columns[0].tasks
    expect(linked.customerName).toBe("Rajesh K. Sharma")
    expect(unlinked.customerName).toBe("Rajesh Sharma") // unlinked card not touched
  })

  it("deleteCustomer refuses while cards are linked", async () => {
    useCustomerStore.setState({ customers: [rajesh1] })
    useBoardStore.setState({
      boards: [
        {
          id: "b1",
          title: "B",
          icon: "x",
          createdAt: "x",
          columns: [{ id: "col", title: "C", tasks: [{ id: "t1", title: "T", priority: "medium", createdAt: "x", customerId: "c1" }] }],
        },
      ],
    })
    await expect(store().deleteCustomer("c1")).rejects.toThrow("1 linked card")
    expect(del).not.toHaveBeenCalled()
    expect(store().customers).toHaveLength(1)
  })
})
