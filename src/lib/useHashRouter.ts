import { useEffect, useRef } from "react"
import { useBoardStore } from "../store/boardStore"
import { useAuthStore } from "../store/authStore"
import { getAllowedBoards } from "./permissions"

export function parseHash(hash: string): {
  view: "dashboard" | "board" | "todos" | "customers" | "staff" | "settings"
  boardId?: string
  taskId?: string
} {
  const clean = hash.replace(/^#\/?/, "").trim()
  if (!clean || clean.toLowerCase() === "dashboard") return { view: "dashboard" }

  const parts = clean.split("/").filter(Boolean)
  const section = parts[0]?.toLowerCase()

  if (section === "dashboard") return { view: "dashboard" }
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
  view: "dashboard" | "board" | "todos" | "customers" | "staff" | "settings",
  activeBoardId: string | null,
  selectedTask: { boardId: string; taskId: string } | null
): string {
  if (view === "dashboard") return "#dashboard"
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
  const { profile } = useAuthStore()
  const isHandlingHashChangeRef = useRef(false)

  // 1. Listen for browser URL hash changes (mount, reload, back/forward button)
  useEffect(() => {
    const applyHashToState = () => {
      const parsed = parseHash(window.location.hash)
      const store = useBoardStore.getState()
      const currentProfile = useAuthStore.getState().profile
      const isAdmin = currentProfile?.role === "admin"

      isHandlingHashChangeRef.current = true

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
    if (!profile) return
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
  }, [profile, boards])

  // 2. Sync React state changes to URL hash (when user clicks in app)
  useEffect(() => {
    if (isHandlingHashChangeRef.current) return

    const targetHash = buildHash(currentView, activeBoardId, selectedTask)
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash
    }
  }, [currentView, activeBoardId, selectedTask])
}
