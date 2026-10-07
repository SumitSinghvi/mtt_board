import { create } from "zustand"
import { persist } from "zustand/middleware"
import { supabase } from "../lib/supabase"

export type StaffRole = "admin" | "visa" | "travel" | "accounts"

export interface StaffPermissions {
  allowedBoardIds?: string[] // undefined or empty = all boards; otherwise specific board IDs
  canCreateCards: boolean
  canEditCards: boolean
  canDeleteCards: boolean
  canViewCommercials: boolean
}

export interface StaffMember {
  id: string
  name: string
  phone: string
  email: string
  role: StaffRole
  status: "active" | "invited" | "inactive"
  permissions?: StaffPermissions
  joinedDate: string
}

interface StaffState {
  staff: StaffMember[]
  loading: boolean
  fetchStaffFromSupabase: () => Promise<void>
  addStaff: (member: Omit<StaffMember, "id" | "joinedDate">) => Promise<void>
  updateStaff: (id: string, updates: Partial<Omit<StaffMember, "id" | "joinedDate">>) => Promise<void>
  updateStaffRole: (id: string, role: StaffRole) => Promise<void>
  deleteStaff: (id: string) => Promise<void>
}

const initialStaff: StaffMember[] = [
  {
    id: "staff-1",
    name: "Mohit Singhvi",
    phone: "+91 98290 55441",
    email: "mohit@mohittours.com",
    role: "admin",
    status: "active",
    joinedDate: "2024-01-10",
  },
  {
    id: "staff-2",
    name: "Mahendra Singh",
    phone: "+91 94140 12345",
    email: "mahendra.s@mohittours.com",
    role: "travel",
    status: "active",
    joinedDate: "2024-03-15",
  },
  {
    id: "staff-3",
    name: "Pooja Rathore",
    phone: "+91 98291 99887",
    email: "pooja.visa@mohittours.com",
    role: "visa",
    status: "active",
    joinedDate: "2024-06-01",
  },
  {
    id: "staff-4",
    name: "Ramesh Kumar",
    phone: "+91 97110 33221",
    email: "ramesh.k@mohittours.com",
    role: "accounts",
    status: "active",
    joinedDate: "2024-08-20",
  },
]

export const useStaffStore = create<StaffState>()(
  persist(
    (set) => ({
      staff: initialStaff,
      loading: false,

      fetchStaffFromSupabase: async () => {
        try {
          set({ loading: true })
          const { data, error } = await supabase
            .from("profiles")
            .select("id, name, phone, email, role, status, created_at")
            .order("created_at", { ascending: false })

          if (error) {
            console.warn("Could not fetch profiles from Supabase, using local fallback:", error.message)
            return
          }

          if (data && data.length > 0) {
            const mapped: StaffMember[] = data.map((item) => ({
              id: item.id,
              name: item.name || item.email.split("@")[0],
              phone: item.phone || "",
              email: item.email,
              role: (["admin", "visa", "travel", "accounts"].includes(item.role)
                ? item.role
                : "travel") as StaffRole,
              status: (item.status as StaffMember["status"]) || "active",
              joinedDate: item.created_at ? item.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
            }))
            set({ staff: mapped })
          }
        } catch (err) {
          console.warn("fetchStaffFromSupabase error:", err)
        } finally {
          set({ loading: false })
        }
      },

      addStaff: async (member) => {
        const newStaff: StaffMember = {
          ...member,
          id: `staff-${Date.now()}`,
          joinedDate: new Date().toISOString().split("T")[0],
        }
        set((state) => ({ staff: [newStaff, ...state.staff] }))

        // Attempt sync to Supabase profiles if possible
        try {
          await supabase.from("profiles").insert({
            name: member.name,
            phone: member.phone,
            email: member.email,
            role: member.role,
            status: member.status,
          })
        } catch {
          // ignore offline/permission errors
        }
      },

      updateStaff: async (id, updates) => {
        set((state) => ({
          staff: state.staff.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }))

        try {
          await supabase
            .from("profiles")
            .update({
              name: updates.name,
              phone: updates.phone,
              role: updates.role,
              status: updates.status,
            })
            .eq("id", id)
        } catch {
          // ignore offline/permission errors
        }
      },

      updateStaffRole: async (id, role) => {
        set((state) => ({
          staff: state.staff.map((s) => (s.id === id ? { ...s, role } : s)),
        }))

        try {
          await supabase.from("profiles").update({ role }).eq("id", id)
        } catch {
          // ignore offline/permission errors
        }
      },

      deleteStaff: async (id) => {
        set((state) => ({
          staff: state.staff.filter((s) => s.id !== id),
        }))

        try {
          await supabase.from("profiles").delete().eq("id", id)
        } catch {
          // ignore offline/permission errors
        }
      },
    }),
    {
      name: "mtt-staff-storage",
    }
  )
)
