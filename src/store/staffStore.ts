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
    id: "staff-1",
    name: "Mohit Singhvi",
    phone: "+91 98290 55441",
    email: "mohit@mohittours.com",
    role: "admin",
    status: "active",
    permissions: getDefaultRolePermissions("admin"),
    joinedDate: "2024-01-10",
  },
  {
    id: "staff-2",
    name: "Mahendra Singh",
    phone: "+91 94140 12345",
    email: "mahendra.s@mohittours.com",
    role: "travel",
    status: "active",
    permissions: getDefaultRolePermissions("travel"),
    joinedDate: "2024-03-15",
  },
  {
    id: "staff-3",
    name: "Pooja Rathore",
    phone: "+91 98291 99887",
    email: "pooja.visa@mohittours.com",
    role: "visa",
    status: "active",
    permissions: getDefaultRolePermissions("visa"),
    joinedDate: "2024-06-01",
  },
  {
    id: "staff-4",
    name: "Ramesh Kumar",
    phone: "+91 97110 33221",
    email: "ramesh.k@mohittours.com",
    role: "accounts",
    status: "active",
    permissions: getDefaultRolePermissions("accounts"),
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
                        canDeleteCards: role === "admin",
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
                    canDeleteCards: role === "admin",
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
