import { create } from "zustand"
import { persist } from "zustand/middleware"
import { type Customer, CustomerSchema } from "../schemas/customer"

interface CustomerState {
  customers: Customer[]
  saveCustomer: (data: { name: string; phone?: string; email?: string }) => Customer
  deleteCustomer: (id: string) => void
}

const initialCustomers: Customer[] = [
  {
    id: "cust-1",
    name: "Rajesh Sharma",
    phone: "+91 98290 11223",
    email: "rajesh.sharma@example.com",
    createdAt: new Date().toISOString(),
  },
  {
    id: "cust-2",
    name: "Vikram Malhotra",
    phone: "+91 97110 44556",
    email: "vikram.m@example.com",
    createdAt: new Date().toISOString(),
  },
  {
    id: "cust-3",
    name: "Sunil Verma",
    phone: "+91 94140 88990",
    email: "sunilverma@example.com",
    createdAt: new Date().toISOString(),
  },
  {
    id: "cust-4",
    name: "Ananya Roy",
    phone: "+91 99880 33445",
    email: "ananya.roy@example.com",
    createdAt: new Date().toISOString(),
  },
  {
    id: "cust-5",
    name: "David Miller",
    phone: "+1 555 234 5678",
    email: "david.miller@example.com",
    createdAt: new Date().toISOString(),
  },
]

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      customers: initialCustomers,

      saveCustomer: ({ name, phone, email }) => {
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

        return newCustomer
      },

      deleteCustomer: (id) => {
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        }))
      },
    }),
    {
      name: "mtt-customers-storage",
    }
  )
)
