import { create } from "zustand"
import { persist } from "zustand/middleware"
import { type Board, type Task, type BoardModules, type ActivityItem, BoardSchema } from "../schemas/board"
import { fetchBoardsFromSupabase as loadSupabaseBoards, syncBoardToSupabase } from "../lib/boardSync"

interface BoardState {
  boards: Board[]
  activeBoardId: string | null
  currentView: "board" | "customers" | "staff" | "settings"
  sidebarOpen: boolean
  loading: boolean

  // Actions
  fetchBoardsFromSupabase: () => Promise<void>
  setActiveBoardId: (id: string) => void
  setCurrentView: (view: "board" | "customers" | "staff" | "settings") => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  createBoard: (title: string, description?: string, modules?: Partial<BoardModules>) => string
  updateBoard: (id: string, updates: Partial<Pick<Board, "title" | "description">>) => void
  updateBoardModules: (boardId: string, modules: Partial<BoardModules>) => void
  deleteBoard: (id: string) => void

  addColumn: (boardId: string, title: string) => void
  deleteColumn: (boardId: string, columnId: string) => void
  updateColumnTitle: (boardId: string, columnId: string, title: string) => void
  moveColumn: (boardId: string, sourceIndex: number, targetIndex: number) => void

  addTask: (boardId: string, columnId: string, task: Omit<Task, "id" | "createdAt">) => void
  updateTask: (boardId: string, columnId: string, taskId: string, updates: Partial<Task>) => void
  deleteTask: (boardId: string, columnId: string, taskId: string) => void
  moveTask: (
    boardId: string,
    sourceColumnId: string,
    targetColumnId: string,
    taskId: string,
    targetIndex?: number
  ) => void
}

const initialBoards: Board[] = [
  {
    id: "board-tour-bookings",
    title: "Tour Bookings",
    description: "Manage client travel inquiries, quotes, and confirmed trips",
    icon: "map-pin",
    createdAt: new Date().toISOString(),
    modules: {
      clientContact: true,
      tripLogistics: true,
      commercials: true,
      subtasks: true,
    },
    columns: [
      {
        id: "col-inquiry",
        title: "New Inquiries",
        tasks: [
          {
            id: "task-1",
            title: "Jaipur 3D/2N Family Package",
            description: "4 adults, 2 kids. Needs Innova Crysta + 4-star hotel in Bani Park.",
            priority: "high",
            customerName: "Rajesh Sharma",
            customerPhone: "+91 98290 11223",
            amount: 45000,
            dueDate: "2026-10-15",
            createdAt: new Date().toISOString(),
          },
          {
            id: "task-2",
            title: "Udaipur Honeymoon Circuit",
            description: "Lake view resort enquiry, airport pickup required.",
            priority: "medium",
            customerName: "Vikram Malhotra",
            customerPhone: "+91 97110 44556",
            amount: 62000,
            dueDate: "2026-10-20",
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: "col-quoted",
        title: "Quote Sent",
        tasks: [
          {
            id: "task-3",
            title: "Jaisalmer Desert Camp + Camel Safari",
            description: "Custom quote shared for 6 pax group, waiting for confirmation.",
            priority: "medium",
            customerName: "Sunil Verma",
            customerPhone: "+91 94140 88990",
            amount: 38000,
            dueDate: "2026-10-12",
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: "col-confirmed",
        title: "Advance Received",
        tasks: [
          {
            id: "task-4",
            title: "Ranthambore Tiger Safari",
            description: "Canter booking confirmed. 30% advance received via UPI.",
            priority: "urgent",
            customerName: "Ananya Roy",
            customerPhone: "+91 99880 33445",
            amount: 28000,
            dueDate: "2026-10-10",
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: "col-completed",
        title: "Completed",
        tasks: [
          {
            id: "task-5",
            title: "Delhi - Agra Same Day Cab",
            description: "Sedan trip concluded. Full payment settled.",
            priority: "low",
            customerName: "David Miller",
            amount: 7500,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ],
  },
  {
    id: "board-fleet",
    title: "Fleet & Vehicles",
    description: "Monitor vehicle availability, maintenance schedules, and inspections",
    icon: "car",
    createdAt: new Date().toISOString(),
    modules: {
      clientContact: false,
      tripLogistics: false,
      commercials: false,
      subtasks: true,
    },
    columns: [
      {
        id: "col-available",
        title: "Available Fleet",
        tasks: [
          {
            id: "task-f1",
            title: "Innova Crysta (RJ 14 TA 4521)",
            description: "Cleaned, sanitized, fueled. Driver: Ramesh Kumar.",
            priority: "low",
            createdAt: new Date().toISOString(),
          },
          {
            id: "task-f2",
            title: "Tempo Traveller 17 Seater (RJ 14 PA 8812)",
            description: "Ready for group tours. Driver: Mahendra Singh.",
            priority: "medium",
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: "col-active-trip",
        title: "On Active Trip",
        tasks: [
          {
            id: "task-f3",
            title: "Toyota Etios (RJ 14 TA 9102)",
            description: "On Delhi-Jaipur highway. ETA return: Tomorrow 6 PM.",
            priority: "medium",
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: "col-maintenance",
        title: "Scheduled Service",
        tasks: [
          {
            id: "task-f4",
            title: "Maruti Dzire (RJ 14 TA 1184)",
            description: "Brake pad replacement and oil change at service center.",
            priority: "high",
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ],
  },
]

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      boards: initialBoards,
      activeBoardId: initialBoards[0].id,
      currentView: "board",
      sidebarOpen: true,
      loading: false,

      fetchBoardsFromSupabase: async () => {
        try {
          set({ loading: true })
          const remoteBoards = await loadSupabaseBoards()
          if (remoteBoards && remoteBoards.length > 0) {
            set((state) => ({
              boards: remoteBoards,
              activeBoardId:
                state.activeBoardId && remoteBoards.some((b) => b.id === state.activeBoardId)
                  ? state.activeBoardId
                  : remoteBoards[0].id,
            }))
          } else {
            // Seed initial boards to Supabase if database empty
            for (const b of initialBoards) {
              await syncBoardToSupabase(b)
            }
          }
        } catch (err) {
          console.warn("fetchBoardsFromSupabase error:", err)
        } finally {
          set({ loading: false })
        }
      },

      setActiveBoardId: (id) => set({ activeBoardId: id, currentView: "board" }),
      setCurrentView: (view) => set({ currentView: view }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      createBoard: (title, description, modules) => {
        const newBoard: Board = BoardSchema.parse({
          id: `board-${Date.now()}`,
          title: title.trim(),
          description: description?.trim() || undefined,
          icon: "clipboard-list",
          createdAt: new Date().toISOString(),
          modules: {
            clientContact: true,
            tripLogistics: false,
            commercials: false,
            subtasks: true,
            ...modules,
          },
          columns: [
            { id: `col-${Date.now()}-1`, title: "To Do", tasks: [] },
            { id: `col-${Date.now()}-2`, title: "In Progress", tasks: [] },
            { id: `col-${Date.now()}-3`, title: "Done", tasks: [] },
          ],
        })

        set((state) => ({
          boards: [...state.boards, newBoard],
          activeBoardId: newBoard.id,
        }))

        return newBoard.id
      },

      updateBoard: (id, updates) => {
        set((state) => ({
          boards: state.boards.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        }))
      },

      updateBoardModules: (boardId, moduleUpdates) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  modules: {
                    clientContact: true,
                    tripLogistics: false,
                    commercials: false,
                    subtasks: true,
                    ...b.modules,
                    ...moduleUpdates,
                  },
                }
              : b
          ),
        }))
      },

      deleteBoard: (id) => {
        const { boards, activeBoardId } = get()
        const remaining = boards.filter((b) => b.id !== id)
        const nextActive =
          activeBoardId === id ? (remaining.length > 0 ? remaining[0].id : null) : activeBoardId

        set({
          boards: remaining,
          activeBoardId: nextActive,
        })
      },

      addColumn: (boardId, title) => {
        if (!title.trim()) return
        const newCol = {
          id: `col-${Date.now()}`,
          title: title.trim(),
          tasks: [],
        }

        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId ? { ...b, columns: [...b.columns, newCol] } : b
          ),
        }))
      },

      deleteColumn: (boardId, columnId) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? { ...b, columns: b.columns.filter((c) => c.id !== columnId) }
              : b
          ),
        }))
      },

      updateColumnTitle: (boardId, columnId, title) => {
        if (!title.trim()) return
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns.map((c) =>
                    c.id === columnId ? { ...c, title: title.trim() } : c
                  ),
                }
              : b
          ),
        }))
      },

      moveColumn: (boardId, sourceIndex, targetIndex) => {
        set((state) => {
          const board = state.boards.find((b) => b.id === boardId)
          if (!board) return state
          if (sourceIndex === targetIndex) return state
          if (sourceIndex < 0 || sourceIndex >= board.columns.length) return state
          if (targetIndex < 0 || targetIndex >= board.columns.length) return state

          const newColumns = [...board.columns]
          const [movedCol] = newColumns.splice(sourceIndex, 1)
          newColumns.splice(targetIndex, 0, movedCol)

          return {
            boards: state.boards.map((b) =>
              b.id === boardId ? { ...b, columns: newColumns } : b
            ),
          }
        })
      },

      addTask: (boardId, columnId, taskData) => {
        const nowIso = new Date().toISOString()
        const initialActivity: ActivityItem = {
          id: `act-${Date.now()}`,
          type: "history",
          author: "System",
          content: `Card created`,
          createdAt: nowIso,
        }
        const newTask: Task = {
          id: `task-${Date.now()}`,
          createdAt: nowIso,
          ...taskData,
          activities: [initialActivity, ...(taskData.activities || [])],
        }

        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns.map((col) =>
                    col.id === columnId ? { ...col, tasks: [newTask, ...col.tasks] } : col
                  ),
                }
              : b
          ),
        }))
      },

      updateTask: (boardId, columnId, taskId, updates) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns.map((col) =>
                    col.id === columnId
                      ? {
                          ...col,
                          tasks: col.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
                        }
                      : col
                  ),
                }
              : b
          ),
        }))
      },

      deleteTask: (boardId, columnId, taskId) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? {
                  ...b,
                  columns: b.columns.map((col) =>
                    col.id === columnId
                      ? { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) }
                      : col
                  ),
                }
              : b
          ),
        }))
      },

      moveTask: (boardId, sourceColumnId, targetColumnId, taskId, targetIndex) => {
        set((state) => {
          const board = state.boards.find((b) => b.id === boardId)
          if (!board) return state

          const sourceCol = board.columns.find((c) => c.id === sourceColumnId)
          const targetCol = board.columns.find((c) => c.id === targetColumnId)
          if (!sourceCol || !targetCol) return state

          const task = sourceCol.tasks.find((t) => t.id === taskId)
          if (!task) return state

          const newSourceTasks = sourceCol.tasks.filter((t) => t.id !== taskId)
          const newTargetTasks = sourceColumnId === targetColumnId ? newSourceTasks : [...targetCol.tasks]

          const insertIdx = targetIndex !== undefined ? targetIndex : newTargetTasks.length
          newTargetTasks.splice(insertIdx, 0, task)

          return {
            boards: state.boards.map((b) => {
              if (b.id !== boardId) return b
              return {
                ...b,
                columns: b.columns.map((col) => {
                  if (col.id === sourceColumnId && sourceColumnId === targetColumnId) {
                    return { ...col, tasks: newTargetTasks }
                  }
                  if (col.id === sourceColumnId) {
                    return { ...col, tasks: newSourceTasks }
                  }
                  if (col.id === targetColumnId) {
                    return { ...col, tasks: newTargetTasks }
                  }
                  return col
                }),
              }
            }),
          }
        })
      },
    }),
    {
      name: "mtt-boards-storage",
      partialize: (state) => ({
        boards: state.boards,
        activeBoardId: state.activeBoardId,
      }),
    }
  )
)
