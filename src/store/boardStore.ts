import { create } from "zustand"
import { persist } from "zustand/middleware"
import { type Board, type Task, type BoardModules, type ActivityItem, BoardSchema } from "../schemas/board"
import {
  fetchBoardsFromSupabase as loadSupabaseBoards,
  syncBoardToSupabase,
  syncTaskToSupabase,
  deleteTaskFromSupabase,
  deleteBoardFromSupabase,
  syncColumnToSupabase,
  deleteColumnFromSupabase,
} from "../lib/boardSync"
import { initialBoards } from "./initialBoards"

interface BoardState {
  boards: Board[]
  activeBoardId: string | null
  currentView: "board" | "customers" | "staff" | "settings"
  sidebarOpen: boolean
  loading: boolean
  selectedTask: { boardId: string; columnId: string; taskId: string } | null

  // Actions
  fetchBoardsFromSupabase: () => Promise<void>
  setActiveBoardId: (id: string) => void
  setCurrentView: (view: "board" | "customers" | "staff" | "settings") => void
  setSelectedTask: (task: { boardId: string; columnId: string; taskId: string } | null) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  createBoard: (title: string, description?: string, modules?: Partial<BoardModules>) => string
  updateBoard: (id: string, updates: Partial<Pick<Board, "title" | "description">>) => void
  updateBoardModules: (boardId: string, modules: Partial<BoardModules>) => void
  permanentlyDeleteComponentGlobally: (key: keyof BoardModules) => void
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

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      boards: initialBoards,
      activeBoardId: initialBoards[0].id,
      currentView: "board",
      sidebarOpen: true,
      loading: false,
      selectedTask: null,

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
      setSelectedTask: (task) => {
        if (task) {
          set({
            activeBoardId: task.boardId,
            currentView: "board",
            selectedTask: task,
          })
        } else {
          set({ selectedTask: null })
        }
      },
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

        syncBoardToSupabase(newBoard)
        return newBoard.id
      },

      updateBoard: (id, updates) => {
        set((state) => ({
          boards: state.boards.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        }))

        const target = get().boards.find((b) => b.id === id)
        if (target) syncBoardToSupabase(target)
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

        const target = get().boards.find((b) => b.id === boardId)
        if (target) syncBoardToSupabase(target)
      },

      permanentlyDeleteComponentGlobally: (key) => {
        set((state) => ({
          boards: state.boards.map((b) => ({
            ...b,
            modules: {
              clientContact: true,
              tripLogistics: false,
              commercials: false,
              subtasks: true,
              ...b.modules,
              [key]: false,
            },
          })),
        }))

        // Sync all updated boards to Supabase
        const updatedBoards = get().boards
        for (const b of updatedBoards) {
          syncBoardToSupabase(b)
        }
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

        deleteBoardFromSupabase(id)
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

        const b = get().boards.find((x) => x.id === boardId)
        syncColumnToSupabase(boardId, newCol.id, newCol.title, (b?.columns.length || 1) - 1)
      },

      deleteColumn: (boardId, columnId) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === boardId
              ? { ...b, columns: b.columns.filter((c) => c.id !== columnId) }
              : b
          ),
        }))

        deleteColumnFromSupabase(columnId)
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

        syncColumnToSupabase(boardId, columnId, title.trim())
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

        syncTaskToSupabase(boardId, columnId, newTask, 0)
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

        const board = get().boards.find((b) => b.id === boardId)
        const col = board?.columns.find((c) => c.id === columnId)
        const task = col?.tasks.find((t) => t.id === taskId)
        if (task) {
          syncTaskToSupabase(boardId, columnId, task)
        }
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

        deleteTaskFromSupabase(taskId)
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

        // Cloud sync moved task to new column in Supabase
        const board = get().boards.find((b) => b.id === boardId)
        const targetCol = board?.columns.find((c) => c.id === targetColumnId)
        const movedTask = targetCol?.tasks.find((t) => t.id === taskId)
        if (movedTask) {
          syncTaskToSupabase(boardId, targetColumnId, movedTask, targetIndex ?? 0)
        }
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
