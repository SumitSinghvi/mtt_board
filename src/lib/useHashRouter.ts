import { useEffect, useRef } from "react"
import { useBoardStore } from "../store/boardStore"
import { useAuthStore } from "../store/authStore"
import { getAllowedBoards } from "./permissions"

export function parseHash(hash: string): {
  view: "dashboard" | "board" | "todos" | "customers" | "staff" | "settings" | "my-tasks"
  boardId?: string
  taskId?: string
} {
  const clean = hash.replace(/^#\/?/, "").trim()
  if (!clean || clean.toLowerCase() === "dashboard") return { view: "dashboard" }

  const parts = clean.split("/").filter(Boolean)
  const section = parts[0]?.toLowerCase()

  if (section === "dashboard") return { view: "dashboard" }
  if (section === "my-tasks" || section === "mytasks") return { view: "my-tasks" }
  if (section === "todos" || section === "todo") return { view: "todos" }
  if (section === "customers") return { view: "customers" }
  if (section === "staff") return { view: "staff" }
  if (section === "settings") return { view: "settings" }

  if (section === "board") {
    const boardId = parts[1]
    const cardKeyword = parts[2]?.toLowerCase()
    const taskId = cardKeyword === "card" ? parts[3] : undefined
    return { view: "board", boardId, taskId }
  }

  return { view: "board", boardId: parts[0] }
}

export function buildHash(
  view: "dashboard" | "board" | "todos" | "customers" | "staff" | "settings" | "my-tasks",
  activeBoardId: string | null,
  selectedTask: { boardId: string; taskId: string } | null
): string {
  if (view === "dashboard") return "#dashboard"
  if (view === "my-tasks") return "#my-tasks"
  if (view === "todos") return "#todos"
  if (view === "customers") return "#customers"
  if (view === "staff") return "#staff"
  if (view === "settings") return "#settings"

  if (view === "board") {
    if (selectedTask?.boardId && selectedTask?.taskId) {
      return `#board/${selectedTask.boardId}/card/${selectedTask.taskId}`
    }
    if (activeBoardId) {
      return `#board/${activeBoardId}`
    }
    return "#board"
  }

  return "#dashboard"
}

export function useHashRouter() {
  const { currentView, activeBoardId, selectedTask, boards } = useBoardStore()
  const { profile, loading: authLoading } = useAuthStore()
  const isHandlingHashChangeRef = useRef(false)

  // 1. Listen for browser URL hash changes (mount, reload, back/forward button)
  useEffect(() => {
    const applyHashToState = () => {
      const parsed = parseHash(window.location.hash)
      const store = useBoardStore.getState()
      const authState = useAuthStore.getState()
      const currentProfile = authState.profile
      const isAuthLoading = authState.loading

      isHandlingHashChangeRef.current = true

      // If auth is still resolving, optimistically sync parsed route to store
      // without triggering permission-based redirects to #dashboard
      if (isAuthLoading) {
        if (parsed.view === "board") {
          if (parsed.boardId && parsed.boardId !== store.activeBoardId) {
            store.setActiveBoardId(parsed.boardId)
          }
          if (parsed.taskId) {
            for (const b of store.boards) {
              for (const col of b.columns) {
                const task = col.tasks.find((t) => t.id === parsed.taskId)
                if (task) {
                  if (b.id !== store.activeBoardId) {
                    store.setActiveBoardId(b.id)
                  }
                  store.setSelectedTask({
                    boardId: b.id,
                    columnId: col.id,
                    taskId: task.id,
                  })
                  break
                }
              }
            }
          }
          if (store.currentView !== "board") {
            store.setCurrentView("board")
          }
        } else {
          if (parsed.view !== store.currentView) {
            store.setCurrentView(parsed.view)
          }
          if (store.selectedTask) {
            store.setSelectedTask(null)
          }
        }

        setTimeout(() => {
          isHandlingHashChangeRef.current = false
        }, 50)
        return
      }

      // If user not authenticated, let App.tsx render AuthModal without rewriting hash
      if (!authState.user) {
        setTimeout(() => {
          isHandlingHashChangeRef.current = false
        }, 50)
        return
      }

      const isAdmin = currentProfile?.role === "admin"

      // Guard: non-admins cannot access admin management views
      const isAdminView = parsed.view === "staff" || parsed.view === "settings" || parsed.view === "customers"
      if (isAdminView && !isAdmin) {
        store.setCurrentView("dashboard")
        window.location.hash = "#dashboard"
        setTimeout(() => {
          isHandlingHashChangeRef.current = false
        }, 50)
        return
      }

      if (parsed.view === "board") {
        const allowedBoards = getAllowedBoards(store.boards, currentProfile)
        const targetBoard = parsed.boardId
          ? allowedBoards.find((b) => b.id === parsed.boardId)
          : allowedBoards.find((b) => b.id === store.activeBoardId) || allowedBoards[0]

        if (parsed.boardId && !targetBoard) {
          // Attempted access to restricted or invalid board
          if (allowedBoards.length > 0) {
            store.setActiveBoardId(allowedBoards[0].id)
            store.setCurrentView("board")
          } else {
            store.setCurrentView("dashboard")
            window.location.hash = "#dashboard"
          }
          setTimeout(() => {
            isHandlingHashChangeRef.current = false
          }, 50)
          return
        }

        if (targetBoard && targetBoard.id !== store.activeBoardId) {
          store.setActiveBoardId(targetBoard.id)
        }

        if (parsed.taskId) {
          let found = false
          for (const b of allowedBoards) {
            for (const col of b.columns) {
              const task = col.tasks.find((t) => t.id === parsed.taskId)
              if (task) {
                found = true
                if (b.id !== store.activeBoardId) {
                  store.setActiveBoardId(b.id)
                }
                store.setSelectedTask({
                  boardId: b.id,
                  columnId: col.id,
                  taskId: task.id,
                })
                break
              }
            }
            if (found) break
          }
          if (!found && store.selectedTask) {
            store.setSelectedTask(null)
          }
        } else if (store.selectedTask) {
          store.setSelectedTask(null)
        }

        if (store.currentView !== "board") {
          store.setCurrentView("board")
        }
      } else {
        if (parsed.view !== store.currentView) {
          store.setCurrentView(parsed.view)
        }
        if (store.selectedTask) {
          store.setSelectedTask(null)
        }
      }

      // Small tick to ensure React state settled before allowing state -> hash sync
      setTimeout(() => {
        isHandlingHashChangeRef.current = false
      }, 50)
    }

    // Apply on mount (handles reload) and whenever hash changes
    applyHashToState()

    window.addEventListener("hashchange", applyHashToState)
    return () => window.removeEventListener("hashchange", applyHashToState)
  }, [])

  // 1b. Re-verify route when profile or boards finish loading
  useEffect(() => {
    if (authLoading || !profile) return
    const isAdmin = profile.role === "admin"
    const store = useBoardStore.getState()
    const isAdminView = store.currentView === "staff" || store.currentView === "settings" || store.currentView === "customers"

    if (isAdminView && !isAdmin) {
      store.setCurrentView("dashboard")
      window.location.hash = "#dashboard"
      return
    }

    if (store.currentView === "board" && store.boards.length > 0) {
      const allowedBoards = getAllowedBoards(store.boards, profile)
      const currentBoard = allowedBoards.find((b) => b.id === store.activeBoardId)
      if (!currentBoard) {
        if (allowedBoards.length > 0) {
          store.setActiveBoardId(allowedBoards[0].id)
        } else {
          store.setCurrentView("dashboard")
          window.location.hash = "#dashboard"
        }
      }
    }

    // Resolve card selection if URL contained a taskId and boards just finished loading
    const parsed = parseHash(window.location.hash)
    if (parsed.view === "board" && parsed.taskId && !store.selectedTask && store.boards.length > 0) {
      const allowedBoards = getAllowedBoards(store.boards, profile)
      for (const b of allowedBoards) {
        for (const col of b.columns) {
          const task = col.tasks.find((t) => t.id === parsed.taskId)
          if (task) {
            store.setSelectedTask({
              boardId: b.id,
              columnId: col.id,
              taskId: task.id,
            })
            break
          }
        }
        if (useBoardStore.getState().selectedTask) break
      }
    }
  }, [profile, boards, authLoading])

  // 2. Sync React state changes to URL hash (when user clicks in app)
  useEffect(() => {
    if (isHandlingHashChangeRef.current) return
    if (authLoading) return

    const targetHash = buildHash(currentView, activeBoardId, selectedTask)
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash
    }
  }, [currentView, activeBoardId, selectedTask, authLoading])
}
