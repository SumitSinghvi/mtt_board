import { PanelLeftClose, PanelLeft } from "lucide-react"
import logoImg from "../assets/logo.png"
import { useBoardStore } from "../store/boardStore"

export function Topbar() {
  const { sidebarOpen, toggleSidebar, boards, activeBoardId } = useBoardStore()
  const activeBoard = boards.find((b) => b.id === activeBoardId)

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-stone-200 bg-white px-4 shadow-2xs">
      {/* Left: Sidebar trigger + Logo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus:outline-none"
        >
          {sidebarOpen ? <PanelLeftClose className="size-5" /> : <PanelLeft className="size-5" />}
        </button>

        <div className="h-5 w-px bg-stone-200 hidden sm:block" />

        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="Mohit Tours & Travels"
            className="h-8 sm:h-9 w-auto object-contain"
          />
        </div>
      </div>

      {/* Right / Breadcrumb */}
      {activeBoard && (
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span className="font-medium text-stone-400">Board:</span>
          <span className="font-semibold text-stone-800 bg-stone-100 px-2.5 py-1 rounded-md">
            {activeBoard.title}
          </span>
        </div>
      )}
    </header>
  )
}
