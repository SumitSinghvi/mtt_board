import { create } from "zustand"
import { persist } from "zustand/middleware"
import { type Customer, CustomerSchema } from "../schemas/customer"
import { supabase, fetchAllRows } from "../lib/supabase"
import { useBoardStore } from "./boardStore"

type CustomerInput = { name: string; phone?: string; email?: string }

interface CustomerState {
  customers: Customer[]
  loading: boolean
  fetchCustomersFromSupabase: () => Promise<void>
  createCustomer: (data: CustomerInput) => Promise<Customer>
  updateCustomer: (id: string, data: CustomerInput) => Promise<Customer>
  deleteCustomer: (id: string) => Promise<void>
}

// Same rule as public.phone_key() in the customer_link migration: last 10 digits, null if < 7 digits.
export function phoneKey(phone?: string | null): string | null {
  const digits = (phone || "").replace(/\D/g, "")
  return digits.length >= 7 ? digits.slice(-10) : null
}

/** Existing customer that is probably this person: unique phone match, else unique name match without a phone conflict. */
export function findCustomerMatch(customers: Customer[], { name, phone }: CustomerInput): Customer | null {
  const pk = phoneKey(phone)
  if (pk) {
    const byPhone = customers.filter((c) => phoneKey(c.phone) === pk)
    if (byPhone.length === 1) return byPhone[0]
    if (byPhone.length > 1) return null
  }
  const nk = name.trim().toLowerCase()
  const byName = customers.filter((c) => c.name.trim().toLowerCase() === nk)
  if (byName.length !== 1) return null
  const cpk = phoneKey(byName[0].phone)
  return !pk || !cpk || cpk === pk ? byName[0] : null
}

/** Count of cards linked to a customer, across all boards. */
export function countCustomerBookings(customerId: string): number {
  let n = 0
  for (const b of useBoardStore.getState().boards)
    for (const col of b.columns) for (const t of col.tasks) if (t.customerId === customerId) n++
  return n
}

/** Link target for a card: offers an existing match (confirm), otherwise creates a new customer. */
export async function ensureCustomer(data: CustomerInput): Promise<Customer> {
  const match = findCustomerMatch(useCustomerStore.getState().customers, data)
  if (
    match &&
    window.confirm(
      `"${match.name}"${match.phone ? ` (${match.phone})` : ""} is already in the Customer Directory.\n\n` +
        `OK = link this card to them\nCancel = create a separate customer`
    )
  ) {
    return match
  }
  return useCustomerStore.getState().createCustomer(data)
}

const clean = (v?: string) => v?.trim() || undefined

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set) => ({
      customers: [],
      loading: false,

      fetchCustomersFromSupabase: async () => {
        try {
          set({ loading: true })
          const { data, error } = await fetchAllRows((from, to) =>
            supabase
              .from("customers")
              .select("id, name, phone, email, created_at")
              .order("created_at", { ascending: false })
              .order("id", { ascending: true })
              .range(from, to)
          )

          if (error) {
            console.warn("Error fetching customers from Supabase:", error.message)
            return
          }

          // A successful fetch is the source of truth, including an empty one (no demo seeding).
          const mapped: Customer[] = data.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || undefined,
            email: c.email || undefined,
            createdAt: c.created_at || new Date().toISOString(),
          }))
          set({ customers: mapped })
        } catch (err) {
          console.warn("fetchCustomersFromSupabase exception:", err)
        } finally {
          set({ loading: false })
        }
      },

      // Always a new record (never merges by name). Resolves only after the DB insert succeeds,
      // so a card is never linked to a customer that does not exist.
      createCustomer: async ({ name, phone, email }) => {
        const newCustomer: Customer = CustomerSchema.parse({
          id: `cust-${crypto.randomUUID()}`,
          name: name.trim(),
          phone: clean(phone),
          email: clean(email),
          createdAt: new Date().toISOString(),
        })

        const { error } = await supabase.from("customers").insert({
          id: newCustomer.id,
          name: newCustomer.name,
          phone: newCustomer.phone ?? null,
          email: newCustomer.email ?? null,
        })
        if (error) throw new Error(`Could not save customer: ${error.message}`)

        set((state) => ({ customers: [newCustomer, ...state.customers] }))
        return newCustomer
      },

      // DB trigger copies the change onto linked cards; mirror it locally (no card re-sync needed).
      // Empty phone/email keep the old value, so an edit never blanks stored contact info.
      updateCustomer: async (id, { name, phone, email }) => {
        const existing = useCustomerStore.getState().customers.find((c) => c.id === id)
        if (!existing) throw new Error("Customer not found")
        const updated: Customer = CustomerSchema.parse({
          ...existing,
          name: name.trim(),
          phone: clean(phone) ?? existing.phone,
          email: clean(email) ?? existing.email,
        })

        const { error } = await supabase
          .from("customers")
          .update({
            name: updated.name,
            phone: updated.phone ?? null,
            email: updated.email ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
        if (error) throw new Error(`Could not update customer: ${error.message}`)

        set((state) => ({ customers: state.customers.map((c) => (c.id === id ? updated : c)) }))
        useBoardStore.setState((state) => ({
          boards: state.boards.map((b) => ({
            ...b,
            columns: b.columns.map((col) => ({
              ...col,
              tasks: col.tasks.map((t) =>
                t.customerId === id
                  ? {
                      ...t,
                      customerName: updated.name,
                      customerPhone: updated.phone ?? t.customerPhone,
                      customerEmail: updated.email ?? t.customerEmail,
                    }
                  : t
              ),
            })),
          })),
        }))
        return updated
      },

      // Refuses while cards are linked, so booking history is never orphaned by accident.
      deleteCustomer: async (id) => {
        const linked = countCustomerBookings(id)
        if (linked > 0) {
          throw new Error(`Customer has ${linked} linked card${linked === 1 ? "" : "s"}. Unlink them first.`)
        }
        const { error } = await supabase.from("customers").delete().eq("id", id)
        if (error) throw new Error(`Could not delete customer: ${error.message}`)
        set((state) => ({ customers: state.customers.filter((c) => c.id !== id) }))
      },
    }),
    {
      name: "mtt-customers-storage",
    }
  )
)
