import { create } from "zustand"
import { persist } from "zustand/middleware"
import { type Customer, CustomerSchema } from "../schemas/customer"
import { supabase, fetchAllRows } from "../lib/supabase"

interface CustomerState {
  customers: Customer[]
  loading: boolean
  fetchCustomersFromSupabase: () => Promise<void>
  saveCustomer: (data: { name: string; phone?: string; email?: string }) => Promise<Customer>
  deleteCustomer: (id: string) => Promise<void>
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
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

      saveCustomer: async ({ name, phone, email }) => {
        const trimmedName = name.trim()
        if (!trimmedName) {
          throw new Error("Customer name required")
        }

        const existing = get().customers.find(
          (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
        )

        if (existing) {
          const updated: Customer = {
            ...existing,
            phone: phone?.trim() || existing.phone,
            email: email?.trim() || existing.email,
          }

          set((state) => ({
            customers: state.customers.map((c) => (c.id === existing.id ? updated : c)),
          }))

          try {
            await supabase
              .from("customers")
              .update({
                phone: updated.phone,
                email: updated.email,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id)
          } catch {
            // ignore
          }

          return updated
        }

        const newCustomer: Customer = CustomerSchema.parse({
          id: `cust-${Date.now()}`,
          name: trimmedName,
          phone: phone?.trim() || undefined,
          email: email?.trim() || undefined,
          createdAt: new Date().toISOString(),
        })

        set((state) => ({
          customers: [newCustomer, ...state.customers],
        }))

        try {
          await supabase.from("customers").insert({
            id: newCustomer.id,
            name: newCustomer.name,
            phone: newCustomer.phone,
            email: newCustomer.email,
          })
        } catch {
          // ignore
        }

        return newCustomer
      },

      deleteCustomer: async (id) => {
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        }))

        try {
          await supabase.from("customers").delete().eq("id", id)
        } catch {
          // ignore
        }
      },
    }),
    {
      name: "mtt-customers-storage",
    }
  )
)
