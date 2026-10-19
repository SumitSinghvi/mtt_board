import { useEffect, useRef } from "react"
import { supabase } from "./supabase"
import { useAuthStore } from "../store/authStore"
import { useBoardStore } from "../store/boardStore"

const HEARTBEAT_INTERVAL_MS = 60 * 1000 // Every 60 seconds
const SESSION_STORAGE_KEY = "mtt_staff_session_id"

export function getCurrentPageTitle(): string {
  try {
    const { currentView, activeBoardId, selectedTask, boards } = useBoardStore.getState()
    if (currentView === "dashboard") return "Dashboard"
    if (currentView === "my-tasks") return "My Tasks"
    if (currentView === "todos") return "To-do List"
    if (currentView === "customers") return "Customers"
    if (currentView === "staff") return "Staff Team"
    if (currentView === "settings") return "Settings"
    if (currentView === "audit-logs") return "Audit Log"
    if (currentView === "board") {
      const activeBoard = boards.find((b) => b.id === activeBoardId)
      const boardTitle = activeBoard?.title || "Board"
      if (selectedTask) {
        for (const col of activeBoard?.columns || []) {
          const t = col.tasks.find((task) => task.id === selectedTask.taskId)
          if (t) return `Card: ${t.customerName || t.title || "Card"} (${boardTitle})`
        }
      }
      return `Board: ${boardTitle}`
    }
  } catch {}
  return "Dashboard"
}

export function useStaffPresence() {
  const { user } = useAuthStore()
  const { currentView, activeBoardId, selectedTask } = useBoardStore()
  const sessionIdRef = useRef<string | null>(null)
  const lastPingTimeRef = useRef<number>(0)
  const lastPageRef = useRef<string>("")

  useEffect(() => {
    if (!user) {
      if (sessionIdRef.current) {
        void supabase.rpc("end_staff_session", { p_session_id: sessionIdRef.current })
        sessionIdRef.current = null
        try {
          sessionStorage.removeItem(SESSION_STORAGE_KEY)
        } catch {}
      }
      return
    }

    try {
      const storedId = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (storedId) {
        sessionIdRef.current = storedId
      }
    } catch {}

    let isMounted = true

    const sendHeartbeat = async () => {
      if (!user) return
      const currentPage = getCurrentPageTitle()
      lastPageRef.current = currentPage

      try {
        const { data, error } = await supabase.rpc("record_staff_heartbeat", {
          p_session_id: sessionIdRef.current || null,
          p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          p_current_page: currentPage,
        })

        if (!error && data && isMounted) {
          sessionIdRef.current = data as string
          lastPingTimeRef.current = Date.now()
          try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, data as string)
          } catch {}
        }
      } catch (err) {
        console.warn("Heartbeat error:", err)
      }
    }

    sendHeartbeat()

    const intervalId = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        sendHeartbeat()
      }
    }, HEARTBEAT_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastPingTimeRef.current
        if (elapsed > 30 * 1000) {
          sendHeartbeat()
        }
      }
    }

    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        void supabase.rpc("end_staff_session", { p_session_id: sessionIdRef.current })
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      isMounted = false
      clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [user?.id])

  // Immediate page change sync (debounced slightly to avoid burst on rapid navigation)
  useEffect(() => {
    if (!user || !sessionIdRef.current) return
    const currentPage = getCurrentPageTitle()
    if (currentPage !== lastPageRef.current) {
      lastPageRef.current = currentPage
      void supabase.rpc("record_staff_heartbeat", {
        p_session_id: sessionIdRef.current,
        p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        p_current_page: currentPage,
      })
    }
  }, [user, currentView, activeBoardId, selectedTask?.taskId])
}
