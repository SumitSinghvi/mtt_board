import { create } from "zustand"
import { persist } from "zustand/middleware"
import { supabase } from "../lib/supabase"
import { useAuthStore } from "./authStore"

export interface StaffTodo {
  id: string
  title: string
  description?: string
  completed: boolean
  dueDate?: string
  priority: "low" | "medium" | "high" | "urgent"
  createdAt: string
}

interface TodoState {
  todos: StaffTodo[]
  loading: boolean
  fetchTodos: () => Promise<void>
  addTodo: (todo: Omit<StaffTodo, "id" | "createdAt" | "completed">) => Promise<StaffTodo>
  toggleTodo: (id: string) => Promise<void>
  updateTodo: (id: string, updates: Partial<Omit<StaffTodo, "id" | "createdAt">>) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      todos: [],
      loading: false,

      fetchTodos: async () => {
        const user = useAuthStore.getState().user
        if (!user) return
        set({ loading: true })
        try {
          const { data, error } = await supabase
            .from("staff_todos")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })

          if (error) {
            console.error("Failed to load todos from Supabase:", error)
            return
          }

          if (data) {
            const mapped: StaffTodo[] = data.map((row: any) => ({
              id: row.id,
              title: row.title,
              description: row.description || undefined,
              completed: row.completed,
              dueDate: row.due_date || undefined,
              priority: row.priority || "medium",
              createdAt: row.created_at,
            }))
            set({ todos: mapped })
          }
        } finally {
          set({ loading: false })
        }
      },

      addTodo: async (input) => {
        const user = useAuthStore.getState().user
        const newTodo: StaffTodo = {
          id: `todo-${crypto.randomUUID()}`,
          title: input.title,
          description: input.description,
          completed: false,
          dueDate: input.dueDate,
          priority: input.priority || "medium",
          createdAt: new Date().toISOString(),
        }

        // Optimistic state update
        set((state) => ({ todos: [newTodo, ...state.todos] }))

        if (user) {
          try {
            await supabase.from("staff_todos").insert({
              id: newTodo.id,
              user_id: user.id,
              title: newTodo.title,
              description: newTodo.description || null,
              completed: false,
              due_date: newTodo.dueDate || null,
              priority: newTodo.priority,
              created_at: newTodo.createdAt,
              updated_at: newTodo.createdAt,
            })
          } catch (err) {
            console.error("Error creating todo in Supabase:", err)
          }
        }

        return newTodo
      },

      toggleTodo: async (id) => {
        const target = get().todos.find((t) => t.id === id)
        if (!target) return
        const nextState = !target.completed

        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? { ...t, completed: nextState } : t)),
        }))

        const user = useAuthStore.getState().user
        if (user) {
          try {
            await supabase
              .from("staff_todos")
              .update({ completed: nextState, updated_at: new Date().toISOString() })
              .eq("id", id)
              .eq("user_id", user.id)
          } catch (err) {
            console.error("Error toggling todo in Supabase:", err)
          }
        }
      },

      updateTodo: async (id, updates) => {
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }))

        const user = useAuthStore.getState().user
        if (user) {
          try {
            const payload: Record<string, any> = { updated_at: new Date().toISOString() }
            if ("title" in updates) payload.title = updates.title
            if ("description" in updates) payload.description = updates.description || null
            if ("completed" in updates) payload.completed = updates.completed
            if ("dueDate" in updates) payload.due_date = updates.dueDate || null
            if ("priority" in updates) payload.priority = updates.priority

            await supabase
              .from("staff_todos")
              .update(payload)
              .eq("id", id)
              .eq("user_id", user.id)
          } catch (err) {
            console.error("Error updating todo in Supabase:", err)
          }
        }
      },

      deleteTodo: async (id) => {
        set((state) => ({
          todos: state.todos.filter((t) => t.id !== id),
        }))

        const user = useAuthStore.getState().user
        if (user) {
          try {
            await supabase.from("staff_todos").delete().eq("id", id).eq("user_id", user.id)
          } catch (err) {
            console.error("Error deleting todo from Supabase:", err)
          }
        }
      },
    }),
    {
      name: "mtt-private-todos",
      partialize: (state) => ({ todos: state.todos }),
    }
  )
)
