import { Topbar } from "./components/Topbar"
import { Sidebar } from "./components/Sidebar"
import { KanbanBoard } from "./components/KanbanBoard"

export default function App() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-stone-100 font-sans antialiased">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 overflow-hidden">
          <KanbanBoard />
        </main>
      </div>
    </div>
  )
}
