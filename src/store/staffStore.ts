import { create } from "zustand"
import { persist } from "zustand/middleware"
import { supabase } from "../lib/supabase"
import { getDefaultRolePermissions } from "../lib/permissions"
import { useAuthStore } from "./authStore"

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
  addStaff: (member: Omit<StaffMember, "id" | "joinedDate">, password?: string) => Promise<{ error: string | null }>
  updateStaff: (id: string, updates: Partial<Omit<StaffMember, "id" | "joinedDate">>) => Promise<void>
  updateStaffPassword: (id: string, newPassword: string) => Promise<{ error: string | null }>
  updateStaffRole: (id: string, role: StaffRole) => Promise<void>
  deleteStaff: (id: string) => Promise<void>
}

export const initialStaff: StaffMember[] = [
  {
    id: "c8b71f88-d4a8-467d-b583-1afcb04954bb",
    name: "Sumit Jain",
    phone: "",
    email: "sumitjaindev@gmail.com",
    role: "admin",
    status: "active",
    permissions: getDefaultRolePermissions("admin"),
    joinedDate: "2024-01-01",
  },
  {
    id: "cf29ac52-56ed-4efd-b55f-d70f87cd01b2",
    name: "Hitesh Jain",
    phone: "",
    email: "hitesh@admin.com",
    role: "admin",
    status: "active",
    permissions: getDefaultRolePermissions("admin"),
    joinedDate: "2024-01-01",
  },
  {
    id: "bd6869dc-1511-495a-9a7f-d723edae793e",
    name: "Mohit Jain",
    phone: "",
    email: "mohitholidaysllp@gmail.com",
    role: "admin",
    status: "active",
    permissions: getDefaultRolePermissions("admin"),
    joinedDate: "2024-01-01",
  },
  {
    id: "8453d7bd-f8a7-4b9c-a8c9-f086d67ec5b7",
    name: "Kanchan Gurnani",
    phone: "",
    email: "kanchangurnani26@gmail.com",
    role: "travel",
    status: "active",
    permissions: getDefaultRolePermissions("travel"),
    joinedDate: "2024-02-01",
  },
  {
    id: "85bf8711-f158-474f-8710-61edb00a50cf",
    name: "POOJA DEVI",
    phone: "",
    email: "pooja@mohittours.com",
    role: "travel",
    status: "active",
    permissions: getDefaultRolePermissions("travel"),
    joinedDate: "2024-02-01",
  },
  {
    id: "33b69fec-5b0e-4e69-bee9-c591418d185b",
    name: "Naina Rathod",
    phone: "",
    email: "naina@mohittours.com",
    role: "travel",
    status: "active",
    permissions: getDefaultRolePermissions("travel"),
    joinedDate: "2024-02-01",
  },
  {
    id: "0eea8e93-83af-4af0-8824-b534e62c9d6e",
    name: "Sakshi",
    phone: "",
    email: "sakshi@mohittours.com",
    role: "travel",
    status: "active",
    permissions: getDefaultRolePermissions("travel"),
    joinedDate: "2024-02-01",
  },
  {
    id: "b752f325-089b-4b00-8da9-9cc5e483029c",
    name: "Sidharth",
    phone: "",
    email: "sidharth@gmail.com",
    role: "travel",
    status: "active",
    permissions: getDefaultRolePermissions("travel"),
    joinedDate: "2024-02-01",
  },
  {
    id: "31261bef-a7aa-4748-80c4-ae91c96919db",
    name: "Vishal Panchal",
    phone: "",
    email: "vishal@mohittours.com",
    role: "accounts",
    status: "active",
    permissions: getDefaultRolePermissions("accounts"),
    joinedDate: "2024-02-01",
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
            .select("id, name, phone, email, role, status, permissions, created_at")
            .order("created_at", { ascending: false })

          if (error) {
            console.warn("Could not fetch profiles from Supabase, using local fallback:", error.message)
            return
          }

          if (data && data.length > 0) {
            const mapped: StaffMember[] = data.map((item) => {
              const role = (["admin", "visa", "travel", "accounts"].includes(item.role)
                ? item.role
                : "travel") as StaffRole
              const permissions =
                (item.permissions as StaffPermissions) || getDefaultRolePermissions(role)

              return {
                id: item.id,
                name: item.name || item.email.split("@")[0],
                phone: item.phone || "",
                email: item.email,
                role,
                status: (item.status as StaffMember["status"]) || "active",
                permissions,
                joinedDate: item.created_at
                  ? item.created_at.split("T")[0]
                  : new Date().toISOString().split("T")[0],
              }
            })
            mapped.sort((a, b) => {
              const aIsAdmin = a.role === "admin" ? 1 : 0
              const bIsAdmin = b.role === "admin" ? 1 : 0
              if (aIsAdmin !== bIsAdmin) return bIsAdmin - aIsAdmin
              return a.name.localeCompare(b.name)
            })
            set({ staff: mapped })
          }
        } catch (err) {
          console.warn("fetchStaffFromSupabase error:", err)
        } finally {
          set({ loading: false })
        }
      },

      addStaff: async (member, password) => {
        const perms = member.permissions || getDefaultRolePermissions(member.role)
        const trimmedEmail = member.email.trim().toLowerCase()
        const trimmedPassword = password?.trim()

        if (!trimmedEmail) {
          return { error: "Email address is required." }
        }
        if (!trimmedPassword) {
          return { error: "Portal password is required for staff account." }
        }

        try {
          const { data, error } = await supabase.rpc("create_staff_user", {
            p_email: trimmedEmail,
            p_password: trimmedPassword,
            p_name: member.name.trim(),
            p_phone: member.phone.trim(),
            p_role: member.role,
            p_permissions: perms,
          })

          if (error) {
            console.error("create_staff_user RPC error:", error.message)
            return { error: error.message }
          }

          if (!data) {
            return { error: "Failed to create staff member in database." }
          }

          const newStaff: StaffMember = {
            id: data as string,
            name: member.name.trim(),
            phone: member.phone.trim(),
            email: trimmedEmail,
            role: member.role,
            status: member.status || "active",
            permissions: perms,
            joinedDate: new Date().toISOString().split("T")[0],
          }

          set((state) => ({ staff: [newStaff, ...state.staff.filter((s) => s.id !== data)] }))
          return { error: null }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "An unexpected error occurred."
          console.error("create_staff_user exception:", message)
          return { error: message }
        }
      },

      updateStaff: async (id, updates) => {
        set((state) => ({
          staff: state.staff.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }))

        // Sync with active Auth User if it is the same user
        const currentProfile = useAuthStore.getState().profile
        if (
          currentProfile &&
          (currentProfile.id === id ||
            (updates.email &&
              currentProfile.email.toLowerCase() === updates.email.toLowerCase()))
        ) {
          useAuthStore.setState({
            profile: {
              ...currentProfile,
              name: updates.name ?? currentProfile.name,
              phone: updates.phone ?? currentProfile.phone,
              role: updates.role ?? currentProfile.role,
              status: updates.status ?? currentProfile.status,
              permissions: updates.permissions ?? currentProfile.permissions,
            },
          })
        }

        try {
          await supabase.rpc("update_staff_profile", {
            p_staff_id: id,
            p_name: updates.name ?? null,
            p_phone: updates.phone ?? null,
            p_role: updates.role ?? null,
            p_status: updates.status ?? null,
            p_permissions: updates.permissions ?? null,
          })
        } catch (err) {
          console.warn("update_staff_profile error:", err)
        }
      },

      updateStaffRole: async (id, role) => {
        const callerProfile = useAuthStore.getState().profile
        if (callerProfile?.role !== "admin") {
          console.warn("Unauthorized: Only admins can change staff roles")
          return
        }

        const defaultPerms = getDefaultRolePermissions(role)
        set((state) => ({
          staff: state.staff.map((s) =>
            s.id === id
              ? {
                  ...s,
                  role,
                  permissions: s.permissions
                    ? {
                        ...s.permissions,
                        canDeleteCards: s.permissions.canDeleteCards ?? defaultPerms.canDeleteCards,
                        canViewCommercials: role === "admin" || role === "accounts",
                      }
                    : defaultPerms,
                }
              : s
          ),
        }))

        // Sync with active Auth User if matching
        const currentProfile = useAuthStore.getState().profile
        if (currentProfile && currentProfile.id === id) {
          useAuthStore.setState({
            profile: {
              ...currentProfile,
              role,
              permissions: currentProfile.permissions
                ? {
                    ...currentProfile.permissions,
                    canDeleteCards: currentProfile.permissions.canDeleteCards ?? defaultPerms.canDeleteCards,
                    canViewCommercials: role === "admin" || role === "accounts",
                  }
                : defaultPerms,
            },
          })
        }

        try {
          await supabase.from("profiles").update({ role }).eq("id", id)
        } catch {
          // ignore offline/permission errors
        }
      },

      updateStaffPassword: async (id, newPassword) => {
        try {
          const { error } = await supabase.rpc("update_staff_password", {
            p_user_id: id,
            p_new_password: newPassword,
          })
          if (error) return { error: error.message }
          return { error: null }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Failed to update password"
          return { error: msg }
        }
      },

      deleteStaff: async (id) => {
        const callerProfile = useAuthStore.getState().profile
        if (callerProfile?.role !== "admin") {
          console.warn("Unauthorized: Only admins can delete staff members")
          return
        }

        set((state) => ({
          staff: state.staff.filter((s) => s.id !== id),
        }))

        try {
          await supabase.rpc("delete_staff_user", { p_user_id: id })
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
