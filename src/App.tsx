import { useEffect, lazy, Suspense } from "react"
import { Toaster } from "sonner"
import { Topbar } from "./components/Topbar"
import { Sidebar } from "./components/Sidebar"
import { AuthModal } from "./components/AuthModal"
import { QuickActionFab } from "./components/QuickActionFab"
import { useBoardStore } from "./store/boardStore"
import { useAuthStore } from "./store/authStore"
import { useStaffStore } from "./store/staffStore"
import { useCustomerStore } from "./store/customerStore"
import { useHashRouter } from "./lib/useHashRouter"
import { useAssignedTaskReminders } from "./lib/useAssignedTaskReminders"
import { useStaffPresence } from "./lib/useStaffPresence"
import logoImg from "./assets/logo.png"

const MainDashboard = lazy(() => import("./components/MainDashboard").then((m) => ({ default: m.MainDashboard })))
const MyTasksPage = lazy(() => import("./components/MyTasksPage").then((m) => ({ default: m.MyTasksPage })))
const TodoPage = lazy(() => import("./components/TodoPage").then((m) => ({ default: m.TodoPage })))
const KanbanBoard = lazy(() => import("./components/KanbanBoard").then((m) => ({ default: m.KanbanBoard })))
const CustomersPage = lazy(() => import("./components/CustomersPage").then((m) => ({ default: m.CustomersPage })))
const StaffPage = lazy(() => import("./components/StaffPage").then((m) => ({ default: m.StaffPage })))
const SettingsPage = lazy(() => import("./components/SettingsPage").then((m) => ({ default: m.SettingsPage })))
const SecretActivityPage = lazy(() => import("./components/SecretActivityPage").then((m) => ({ default: m.SecretActivityPage })))

// These hooks subscribe to `boards`, which changes on every edit. Hosting them in a leaf
// that renders nothing keeps those updates from re-rendering the whole App tree.
function AppEffects() {
  useHashRouter()
  useAssignedTaskReminders()
  useStaffPresence()
  return null
}

export default function App() {
  const currentView = useBoardStore((s) => s.currentView)
  const fetchBoardsFromSupabase = useBoardStore((s) => s.fetchBoardsFromSupabase)
  const initializeAuth = useAuthStore((s) => s.initializeAuth)
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const loading = useAuthStore((s) => s.loading)
  const fetchStaffFromSupabase = useStaffStore((s) => s.fetchStaffFromSupabase)
  const fetchCustomersFromSupabase = useCustomerStore((s) => s.fetchCustomersFromSupabase)

  useEffect(() => {
    initializeAuth()
    if (window.innerWidth < 768) {
      useBoardStore.getState().setSidebarOpen(false)
    }
  }, [initializeAuth])

  const userId = user?.id

  useEffect(() => {
    if (userId) {
      fetchStaffFromSupabase()
      fetchCustomersFromSupabase()
      fetchBoardsFromSupabase()
    }
  }, [userId, fetchStaffFromSupabase, fetchCustomersFromSupabase, fetchBoardsFromSupabase])

  return (
    <>
      <AppEffects />
      {renderContent()}
    </>
  )

  function renderContent() {
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
        <Toaster position="top-right" richColors closeButton />
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
              ) : currentView === "my-tasks" ? (
                <MyTasksPage />
              ) : currentView === "todos" ? (
                <TodoPage />
              ) : currentView === "customers" ? (
                profile?.role === "admin" ? <CustomersPage /> : <MainDashboard />
              ) : currentView === "staff" ? (
                profile?.role === "admin" ? <StaffPage /> : <MainDashboard />
              ) : currentView === "settings" ? (
                profile?.role === "admin" ? <SettingsPage /> : <MainDashboard />
              ) : currentView === "audit-logs" ? (
                profile?.role === "admin" ? <SecretActivityPage /> : <MainDashboard />
              ) : (
                <KanbanBoard />
              )}
            </Suspense>
          </main>
        </div>
        <QuickActionFab />
      </div>
    )
  }
}
