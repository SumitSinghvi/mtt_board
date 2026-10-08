import { create } from "zustand"
import { supabase } from "../lib/supabase"
import type { User, Session } from "@supabase/supabase-js"
import type { StaffRole, StaffPermissions } from "./staffStore"
import { useStaffStore } from "./staffStore"

export interface UserProfile {
  id: string
  email: string
  name: string
  phone: string
  role: StaffRole
  status: string
  permissions?: StaffPermissions
}

interface AuthState {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  initializeAuth: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithPassword: (email: string, password: string, name: string, role?: StaffRole) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  fetchProfile: (userId: string, email: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  error: null,

  fetchProfile: async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, name, phone, role, status, permissions")
        .eq("id", userId)
        .maybeSingle()

      if (error) {
        console.warn("Error fetching profile:", error.message)
      }

      // Check if local staff store has linked permissions for this email or ID
      const localStaff = useStaffStore.getState().staff.find(
        (s) => s.id === userId || s.email.toLowerCase() === email.toLowerCase()
      )

      if (data) {
        set({
          profile: {
            id: data.id,
            email: data.email || email,
            name: data.name || email.split("@")[0],
            phone: data.phone || "",
            role: (["admin", "visa", "travel", "accounts"].includes(data.role)
              ? data.role
              : "travel") as StaffRole,
            status: data.status || "active",
            permissions: (data.permissions as StaffPermissions) || localStaff?.permissions,
          },
        })
      } else {
        // Fallback default admin for initial admin / first user
        const defaultRole: StaffRole =
          localStaff?.role ||
          (email.includes("admin") || email.includes("mohit") ? "admin" : "travel")
        const fallbackProfile: UserProfile = {
          id: userId,
          email,
          name: localStaff?.name || email.split("@")[0],
          phone: localStaff?.phone || "",
          role: defaultRole,
          status: "active",
          permissions: localStaff?.permissions,
        }
        set({ profile: fallbackProfile })

        // Auto-insert row into profiles
        try {
          await supabase.from("profiles").upsert({
            id: userId,
            email,
            name: email.split("@")[0],
            role: defaultRole,
            status: "active",
          })
        } catch {
          // ignore
        }
      }
    } catch (err: unknown) {
      console.warn("fetchProfile exception:", err)
    }
  },

  initializeAuth: async () => {
    try {
      set({ loading: true })
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        set({ user: session.user, session })
        await get().fetchProfile(session.user.id, session.user.email || "")
      } else {
        set({ user: null, session: null, profile: null })
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          set({ user: session.user, session })
          await get().fetchProfile(session.user.id, session.user.email || "")
        } else {
          set({ user: null, session: null, profile: null })
        }
      })
    } catch (err: unknown) {
      console.warn("initializeAuth error:", err)
    } finally {
      set({ loading: false })
    }
  },

  signInWithPassword: async (email, password) => {
    try {
      set({ error: null })
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        set({ error: error.message })
        return { error: error.message }
      }

      if (data.user) {
        set({ user: data.user, session: data.session })
        await get().fetchProfile(data.user.id, data.user.email || email)
      }

      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in"
      set({ error: msg })
      return { error: msg }
    }
  },

  signUpWithPassword: async (email, password, name, role = "travel") => {
    try {
      set({ error: null })
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            role,
          },
        },
      })

      if (error) {
        set({ error: error.message })
        return { error: error.message }
      }

      if (data.user) {
        set({ user: data.user, session: data.session })
        // Create profile directly in profiles table as well
        try {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: data.user.email || email,
            name: name.trim() || email.split("@")[0],
            role,
            status: "active",
          })
        } catch {
          // ignore
        }
        await get().fetchProfile(data.user.id, data.user.email || email)
      }

      return { error: null }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign up"
      set({ error: msg })
      return { error: msg }
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore
    } finally {
      set({ user: null, session: null, profile: null, error: null })
    }
  },
}))
