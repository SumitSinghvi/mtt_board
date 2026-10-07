import { useEffect } from "react"
import { Topbar } from "./components/Topbar"
import { Sidebar } from "./components/Sidebar"
import { KanbanBoard } from "./components/KanbanBoard"
import { CustomersPage } from "./components/CustomersPage"
import { StaffPage } from "./components/StaffPage"
import { SettingsPage } from "./components/SettingsPage"
import { useBoardStore } from "./store/boardStore"
import { useAuthStore } from "./store/authStore"
import { useStaffStore } from "./store/staffStore"
import { useCustomerStore } from "./store/customerStore"

export default function App() {
  const { currentView, fetchBoardsFromSupabase } = useBoardStore()
  const { initializeAuth } = useAuthStore()
  const { fetchStaffFromSupabase } = useStaffStore()
  const { fetchCustomersFromSupabase } = useCustomerStore()

  useEffect(() => {
    initializeAuth()
    fetchStaffFromSupabase()
    fetchCustomersFromSupabase()
    fetchBoardsFromSupabase()
  }, [initializeAuth, fetchStaffFromSupabase, fetchCustomersFromSupabase, fetchBoardsFromSupabase])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-stone-100 font-sans antialiased">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 overflow-hidden">
          {currentView === "customers" ? (
            <CustomersPage />
          ) : currentView === "staff" ? (
            <StaffPage />
          ) : currentView === "settings" ? (
            <SettingsPage />
          ) : (
            <KanbanBoard />
          )}
        </main>
      </div>
    </div>
  )
}
