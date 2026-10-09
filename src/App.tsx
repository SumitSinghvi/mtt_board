import { useEffect, lazy, Suspense } from "react"
import { Topbar } from "./components/Topbar"
import { Sidebar } from "./components/Sidebar"
import { AuthModal } from "./components/AuthModal"
import { useBoardStore } from "./store/boardStore"
import { useAuthStore } from "./store/authStore"
import { useStaffStore } from "./store/staffStore"
import { useCustomerStore } from "./store/customerStore"
import { useHashRouter } from "./lib/useHashRouter"
import logoImg from "./assets/logo.png"

const MainDashboard = lazy(() => import("./components/MainDashboard").then((m) => ({ default: m.MainDashboard })))
const TodoPage = lazy(() => import("./components/TodoPage").then((m) => ({ default: m.TodoPage })))
const KanbanBoard = lazy(() => import("./components/KanbanBoard").then((m) => ({ default: m.KanbanBoard })))
const CustomersPage = lazy(() => import("./components/CustomersPage").then((m) => ({ default: m.CustomersPage })))
const StaffPage = lazy(() => import("./components/StaffPage").then((m) => ({ default: m.StaffPage })))
const SettingsPage = lazy(() => import("./components/SettingsPage").then((m) => ({ default: m.SettingsPage })))

export default function App() {
  const { currentView, fetchBoardsFromSupabase } = useBoardStore()
  const { initializeAuth, user, profile, loading } = useAuthStore()
  const { fetchStaffFromSupabase } = useStaffStore()
  const { fetchCustomersFromSupabase } = useCustomerStore()

  useHashRouter()

  useEffect(() => {
    initializeAuth()
    if (window.innerWidth < 768) {
      useBoardStore.getState().setSidebarOpen(false)
    }
  }, [initializeAuth])

  useEffect(() => {
    if (user) {
      fetchStaffFromSupabase()
      fetchCustomersFromSupabase()
      fetchBoardsFromSupabase()
    }
  }, [user, fetchStaffFromSupabase, fetchCustomersFromSupabase, fetchBoardsFromSupabase])

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-stone-100">
        <div className="flex flex-col items-center gap-3">
          <img src={logoImg} alt="Mohit Tours & Travels" className="h-10 w-auto object-contain animate-pulse" />
          <span className="text-xs font-semibold text-stone-500">Checking credentials...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthModal />
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-stone-100 font-sans antialiased">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 overflow-hidden">
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center bg-stone-100">
                <div className="size-6 animate-spin rounded-full border-2 border-stone-300 border-t-amber-600" />
              </div>
            }
          >
            {currentView === "dashboard" ? (
              <MainDashboard />
            ) : currentView === "todos" ? (
              <TodoPage />
            ) : currentView === "customers" ? (
              profile?.role === "admin" ? <CustomersPage /> : <MainDashboard />
            ) : currentView === "staff" ? (
              profile?.role === "admin" ? <StaffPage /> : <MainDashboard />
            ) : currentView === "settings" ? (
              profile?.role === "admin" ? <SettingsPage /> : <MainDashboard />
            ) : (
              <KanbanBoard />
            )}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
