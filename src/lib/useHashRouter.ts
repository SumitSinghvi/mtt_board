import { useEffect, useRef } from "react"
import { useBoardStore } from "../store/boardStore"

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
  const isHandlingHashChangeRef = useRef(false)

  // 1. Listen for browser URL hash changes (mount, reload, back/forward button)
  useEffect(() => {
    const applyHashToState = () => {
      const parsed = parseHash(window.location.hash)
      const store = useBoardStore.getState()

      isHandlingHashChangeRef.current = true

      if (parsed.view !== store.currentView) {
        store.setCurrentView(parsed.view)
      }

      if (parsed.view === "board") {
        if (parsed.boardId && parsed.boardId !== store.activeBoardId) {
          if (store.boards.some((b) => b.id === parsed.boardId)) {
            store.setActiveBoardId(parsed.boardId)
          }
        }

        if (parsed.taskId) {
          let found = false
          for (const b of store.boards) {
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
        } else if (store.selectedTask) {
          store.setSelectedTask(null)
        }
      } else if (store.selectedTask) {
        store.setSelectedTask(null)
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

  // 1b. Also check if boards finished loading from Supabase and we have a board/card in the hash
  useEffect(() => {
    if (boards.length > 0 && window.location.hash) {
      const parsed = parseHash(window.location.hash)
      const store = useBoardStore.getState()
      if (parsed.view === "board" && parsed.boardId && store.boards.some((b) => b.id === parsed.boardId)) {
        if (store.activeBoardId !== parsed.boardId) {
          store.setActiveBoardId(parsed.boardId)
        }
      }
    }
  }, [boards])

  // 2. Sync React state changes to URL hash (when user clicks in app)
  useEffect(() => {
    if (isHandlingHashChangeRef.current) return

    const targetHash = buildHash(currentView, activeBoardId, selectedTask)
    if (window.location.hash !== targetHash) {
      // Replace hash so we don't spam history if user stays on same route, or push if changed
      window.location.hash = targetHash
    }
  }, [currentView, activeBoardId, selectedTask])
}
