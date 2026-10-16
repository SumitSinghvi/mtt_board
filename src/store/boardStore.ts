import { create } from "zustand"
import { persist } from "zustand/middleware"
import { type Board, type Task, type BoardModules, type ActivityItem, type TaskReminder, BoardSchema } from "../schemas/board"
import {
  fetchBoardsFromSupabase as loadSupabaseBoards,
  syncBoardToSupabase,
  syncBoardModulesToSupabase,
  seedInitialBoardToSupabase,
  flushTaskSync,
  syncTaskToSupabase,
  deleteTaskFromSupabase,
  deleteBoardFromSupabase,
  syncColumnToSupabase,
  deleteColumnFromSupabase,
  archiveBoardInSupabase,
  reorderBoardsInSupabase,
  fetchGeneralRemindersFromSupabase,
  syncGeneralReminderToSupabase,
  deleteGeneralReminderFromSupabase,
} from "../lib/boardSync"
import { initialBoards } from "./initialBoards"
import { useAuthStore } from "./authStore"
import { generateId } from "../lib/utils"

interface BoardState {
  boards: Board[]
  activeBoardId: string | null
  currentView: "dashboard" | "board" | "todos" | "customers" | "staff" | "settings" | "my-tasks"
  sidebarOpen: boolean
  loading: boolean
  selectedTask: { boardId: string; columnId: string; taskId: string } | null

  // Actions
  fetchBoardsFromSupabase: () => Promise<void>
  setActiveBoardId: (id: string) => void
  setCurrentView: (view: "dashboard" | "board" | "todos" | "customers" | "staff" | "settings" | "my-tasks") => void
  setSelectedTask: (task: { boardId: string; columnId: string; taskId: string } | null) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  createBoard: (title: string, description?: string, modules?: Partial<BoardModules>) => string
  updateBoard: (id: string, updates: Partial<Pick<Board, "title" | "description">>) => void
  updateBoardModules: (boardId: string, modules: Partial<BoardModules>) => void
  permanentlyDeleteComponentGlobally: (key: keyof BoardModules) => void
  deleteBoard: (id: string) => void
  archiveBoard: (id: string, isArchived?: boolean) => void
  unarchiveBoard: (id: string) => void
  reorderBoards: (sourceIndex: number, targetIndex: number) => void

  addColumn: (boardId: string, title: string) => void
  deleteColumn: (boardId: string, columnId: string) => void
  updateColumnTitle: (boardId: string, columnId: string, title: string) => void
  moveColumn: (boardId: string, sourceIndex: number, targetIndex: number) => void

  addTask: (boardId: string, columnId: string, task: Omit<Task, "id" | "createdAt">) => void
  updateTask: (boardId: string, columnId: string, taskId: string, updates: Partial<Task>, immediate?: boolean) => void
  flushTask: (taskId: string) => Promise<void>
  deleteTask: (boardId: string, columnId: string, taskId: string) => void
  moveTask: (
    boardId: string,
    sourceColumnId: string,
    targetColumnId: string,
    taskId: string,
    targetIndex?: number
  ) => void
  moveTaskToBoard: (
    sourceBoardId: string,
    sourceColumnId: string,
    targetBoardId: string,
    targetColumnId: string,
    taskId: string,
    targetIndex?: number
  ) => void

  // Task Reminders
  addReminderToTask: (
    boardId: string,
    columnId: string,
    taskId: string,
    reminder: Omit<TaskReminder, "id" | "createdAt" | "completed"> & { completed?: boolean }
  ) => void
  updateTaskReminder: (
    boardId: string,
    columnId: string,
    taskId: string,
    reminderId: string,
    updates: Partial<TaskReminder>
  ) => void
  deleteTaskReminder: (
    boardId: string,
    columnId: string,
    taskId: string,
    reminderId: string
  ) => void
  toggleTaskReminder: (
    boardId: string,
    columnId: string,
    taskId: string,
    reminderId: string
  ) => void

  // General Reminders (Not associated with any staff / task)
  generalReminders: TaskReminder[]
  addGeneralReminder: (
    reminder: Omit<TaskReminder, "id" | "createdAt" | "completed"> & { completed?: boolean }
  ) => void
  updateGeneralReminder: (id: string, updates: Partial<TaskReminder>) => void
  deleteGeneralReminder: (id: string) => void
  toggleGeneralReminder: (id: string) => void
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      boards: initialBoards,
      generalReminders: [],
      activeBoardId: initialBoards[0].id,
      currentView: "dashboard",
      sidebarOpen: true,
      loading: false,
      selectedTask: null,

      fetchBoardsFromSupabase: async () => {
        try {
          set({ loading: true })
          const [remoteBoards, remoteGeneralReminders] = await Promise.all([
            loadSupabaseBoards(),
            fetchGeneralRemindersFromSupabase(),
          ])
          if (remoteGeneralReminders && remoteGeneralReminders.length > 0) {
            set({ generalReminders: remoteGeneralReminders })
          }
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
              await seedInitialBoardToSupabase(b)
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
            subtasks: true,
            hotelBooking: false,
            paymentTracking: false,
            outgoingPayment: false,
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
          boards: state.boards.map((b) => {
            if (b.id !== id) return b
            const updated = { ...b, ...updates }
            if ("description" in updates && (!updates.description || !updates.description.trim())) {
              updated.description = undefined
            }
            return updated
          }),
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
                    subtasks: true,
                    hotelBooking: false,
                    paymentTracking: false,
                    outgoingPayment: false,
                    ...b.modules,
                    ...moduleUpdates,
                  },
                }
              : b
          ),
        }))

        const target = get().boards.find((b) => b.id === boardId)
        if (target) syncBoardModulesToSupabase(boardId, target.modules)
      },

      permanentlyDeleteComponentGlobally: (key) => {
        set((state) => ({
          boards: state.boards.map((b) => ({
            ...b,
            modules: {
              clientContact: true,
              subtasks: true,
              hotelBooking: false,
              paymentTracking: false,
              outgoingPayment: false,
              ...b.modules,
              [key]: false,
            },
          })),
        }))

        // Sync all updated boards to Supabase
        const updatedBoards = get().boards
        for (const b of updatedBoards) {
          syncBoardModulesToSupabase(b.id, b.modules)
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

      archiveBoard: (id, isArchived = true) => {
        set((state) => {
          const updated = state.boards.map((b) =>
            b.id === id ? { ...b, isArchived } : b
          )
          let newActiveId = state.activeBoardId
          if (state.activeBoardId === id && isArchived) {
            const nextActive = updated.find((b) => !b.isArchived)
            newActiveId = nextActive ? nextActive.id : null
          }
          return { boards: updated, activeBoardId: newActiveId }
        })
        archiveBoardInSupabase(id, isArchived)
      },

      unarchiveBoard: (id) => {
        set((state) => {
          const updated = state.boards.map((b) =>
            b.id === id ? { ...b, isArchived: false } : b
          )
          return {
            boards: updated,
            activeBoardId: state.activeBoardId || id,
          }
        })
        archiveBoardInSupabase(id, false)
      },

      reorderBoards: (sourceIndex, targetIndex) => {
        set((state) => {
          const newBoards = [...state.boards]
          const [moved] = newBoards.splice(sourceIndex, 1)
          newBoards.splice(targetIndex, 0, moved)
          const withPositions = newBoards.map((b, idx) => ({ ...b, position: idx }))

          reorderBoardsInSupabase(withPositions.map((b) => ({ id: b.id, position: b.position })))

          return { boards: withPositions }
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
        const userProfile = useAuthStore.getState().profile
        const author = userProfile?.name || userProfile?.email?.split("@")[0] || "System"
        const initialActivity: ActivityItem = {
          id: `act-${Date.now()}`,
          type: "history",
          author,
          content: `Card created`,
          createdAt: nowIso,
        }
        const assignees =
          Array.isArray(taskData.assignees) && taskData.assignees.length > 0
            ? taskData.assignees
            : taskData.assignee
            ? [taskData.assignee]
            : []

        const leader = taskData.leader || (assignees.length > 0 ? assignees[0] : undefined)

        const newTask: Task = {
          id: `task-${Date.now()}`,
          createdAt: nowIso,
          createdBy: taskData.createdBy || userProfile?.name || author,
          ...taskData,
          assignees,
          assignee: assignees[0] || undefined,
          leader,
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

      updateTask: (boardId, columnId, taskId, updates, immediate = false) => {
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
          syncTaskToSupabase(boardId, columnId, task, 0, immediate)
        }
      },

      flushTask: async (taskId: string) => {
        await flushTaskSync(taskId)
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

      moveTaskToBoard: (sourceBoardId, sourceColumnId, targetBoardId, targetColumnId, taskId, targetIndex) => {
        const { boards } = get()
        const sourceBoard = boards.find((b) => b.id === sourceBoardId)
        const targetBoard = boards.find((b) => b.id === targetBoardId)
        if (!sourceBoard || !targetBoard) return

        const sourceCol = sourceBoard.columns.find((c) => c.id === sourceColumnId)
        if (!sourceCol) return

        const task = sourceCol.tasks.find((t) => t.id === taskId)
        if (!task) return

        const targetCol = targetBoard.columns.find((c) => c.id === targetColumnId) || targetBoard.columns[0]
        if (!targetCol) return

        if (sourceBoardId === targetBoardId) {
          get().moveTask(sourceBoardId, sourceColumnId, targetCol.id, taskId, targetIndex)
          return
        }

        const userProfile = useAuthStore.getState().profile
        const author = userProfile?.name || userProfile?.email?.split("@")[0] || "Staff"
        const historyEvent: ActivityItem = {
          id: `act-${Date.now()}`,
          type: "history",
          author,
          content: `Moved card from "${sourceBoard.title}" (${sourceCol.title}) to "${targetBoard.title}" (${targetCol.title})`,
          createdAt: new Date().toISOString(),
        }

        const updatedTask: Task = {
          ...task,
          activities: [...(task.activities || []), historyEvent],
        }

        set((state) => ({
          boards: state.boards.map((b) => {
            if (b.id === sourceBoardId) {
              return {
                ...b,
                columns: b.columns.map((col) =>
                  col.id === sourceColumnId
                    ? { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) }
                    : col
                ),
              }
            }
            if (b.id === targetBoardId) {
              return {
                ...b,
                columns: b.columns.map((col) => {
                  if (col.id === targetCol.id) {
                    const newTasks = [...col.tasks]
                    const insertAt = targetIndex !== undefined ? targetIndex : 0
                    newTasks.splice(insertAt, 0, updatedTask)
                    return { ...col, tasks: newTasks }
                  }
                  return col
                }),
              }
            }
            return b
          }),
        }))

        // Cloud sync moved task with new board_id and column_id
        syncTaskToSupabase(targetBoardId, targetCol.id, updatedTask, targetIndex ?? 0, true)
      },

      addReminderToTask: (boardId, columnId, taskId, reminder) => {
        const currentUser = useAuthStore.getState().profile?.name || useAuthStore.getState().user?.email?.split("@")[0] || "Staff"
        const newReminder: TaskReminder = {
          completed: false,
          createdBy: reminder.createdBy || currentUser,
          ...reminder,
          id: generateId("rem"),
          createdAt: new Date().toISOString(),
        }
        const board = get().boards.find((b) => b.id === boardId)
        const col = board?.columns.find((c) => c.id === columnId)
        const task = col?.tasks.find((t) => t.id === taskId)
        if (!task) return
        const currentReminders = task.reminders || []
        get().updateTask(boardId, columnId, taskId, {
          reminders: [...currentReminders, newReminder],
        })
      },

      updateTaskReminder: (boardId, columnId, taskId, reminderId, updates) => {
        const board = get().boards.find((b) => b.id === boardId)
        const col = board?.columns.find((c) => c.id === columnId)
        const task = col?.tasks.find((t) => t.id === taskId)
        if (!task) return
        const nextReminders = (task.reminders || []).map((r) =>
          r.id === reminderId ? { ...r, ...updates } : r
        )
        get().updateTask(boardId, columnId, taskId, { reminders: nextReminders })
      },

      deleteTaskReminder: (boardId, columnId, taskId, reminderId) => {
        const board = get().boards.find((b) => b.id === boardId)
        const col = board?.columns.find((c) => c.id === columnId)
        const task = col?.tasks.find((t) => t.id === taskId)
        if (!task) return
        const nextReminders = (task.reminders || []).filter((r) => r.id !== reminderId)
        get().updateTask(boardId, columnId, taskId, { reminders: nextReminders })
      },

      toggleTaskReminder: (boardId, columnId, taskId, reminderId) => {
        const board = get().boards.find((b) => b.id === boardId)
        const col = board?.columns.find((c) => c.id === columnId)
        const task = col?.tasks.find((t) => t.id === taskId)
        if (!task) return
        const nextReminders = (task.reminders || []).map((r) =>
          r.id === reminderId
            ? {
                ...r,
                completed: !r.completed,
                completedAt: !r.completed ? new Date().toISOString() : undefined,
              }
            : r
        )
        get().updateTask(boardId, columnId, taskId, { reminders: nextReminders })
      },

      addGeneralReminder: (reminder) => {
        const currentUser = useAuthStore.getState().profile?.name || useAuthStore.getState().user?.email?.split("@")[0] || "Staff"
        const newReminder: TaskReminder = {
          completed: false,
          createdBy: reminder.createdBy || currentUser,
          ...reminder,
          id: generateId("rem-gen"),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          generalReminders: [newReminder, ...state.generalReminders],
        }))
        syncGeneralReminderToSupabase(newReminder)
      },

      updateGeneralReminder: (id, updates) => {
        set((state) => ({
          generalReminders: state.generalReminders.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }))
        const updated = get().generalReminders.find((r) => r.id === id)
        if (updated) syncGeneralReminderToSupabase(updated)
      },

      deleteGeneralReminder: (id) => {
        set((state) => ({
          generalReminders: state.generalReminders.filter((r) => r.id !== id),
        }))
        deleteGeneralReminderFromSupabase(id)
      },

      toggleGeneralReminder: (id) => {
        set((state) => ({
          generalReminders: state.generalReminders.map((r) =>
            r.id === id
              ? {
                  ...r,
                  completed: !r.completed,
                  completedAt: !r.completed ? new Date().toISOString() : undefined,
                }
              : r
          ),
        }))
        const updated = get().generalReminders.find((r) => r.id === id)
        if (updated) syncGeneralReminderToSupabase(updated)
      },
    }),
    {
      name: "mtt-boards-storage",
      partialize: (state) => ({
        boards: state.boards,
        activeBoardId: state.activeBoardId,
        generalReminders: state.generalReminders,
      }),
    }
  )
)
