import { useState } from "react"
import {
  LayoutDashboard,
  Plus,
  Trash2,
  X,
  ChevronRight,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"

export function Sidebar() {
  const {
    boards,
    activeBoardId,
    setActiveBoardId,
    createBoard,
    deleteBoard,
    sidebarOpen,
    setSidebarOpen,
  } = useBoardStore()

  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [boardType, setBoardType] = useState<"tour" | "general" | "fleet">("tour")
  const [filterQuery, setFilterQuery] = useState("")

  const filteredBoards = boards.filter((b) =>
    b.title.toLowerCase().includes(filterQuery.toLowerCase())
  )

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const modules =
      boardType === "tour"
        ? { clientContact: true, tripLogistics: true, commercials: true, subtasks: true }
        : boardType === "fleet"
        ? { clientContact: false, tripLogistics: false, commercials: false, subtasks: true }
        : { clientContact: true, tripLogistics: false, commercials: false, subtasks: true }

    const newId = createBoard(newTitle, newDescription, modules)
    setActiveBoardId(newId)
    setNewTitle("")
    setNewDescription("")
    setBoardType("tour")
    setIsCreating(false)
  }

  const handleDelete = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete board "${title}"? This cannot be undone.`)) {
      deleteBoard(id)
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/50 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-stone-200 bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        }`}
      >
        {/* Compact Header */}
        <div className="flex h-14 items-center justify-between border-b border-stone-200 px-3.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Pages / Boards ({boards.length})
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Create New Board"
              onClick={() => setIsCreating(true)}
              className="rounded-md p-1.5 text-stone-600 hover:bg-stone-100 hover:text-amber-700 transition"
            >
              <Plus className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 md:hidden"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Quick Search */}
        {boards.length > 3 && (
          <div className="p-2.5 border-b border-stone-100">
            <input
              type="text"
              placeholder="Filter boards..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:bg-white focus:outline-none"
            />
          </div>
        )}

        {/* Boards List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {filteredBoards.map((board) => {
            const isActive = board.id === activeBoardId
            const totalTasks = board.columns.reduce((sum, col) => sum + col.tasks.length, 0)

            return (
              <div
                key={board.id}
                onClick={() => {
                  setActiveBoardId(board.id)
                  if (window.innerWidth < 768) setSidebarOpen(false)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActiveBoardId(board.id)
                  }
                }}
                className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition select-none ${
                  isActive
                    ? "bg-amber-50 text-amber-900 font-semibold shadow-2xs border border-amber-200/60"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <LayoutDashboard
                    className={`size-4 shrink-0 ${isActive ? "text-amber-600" : "text-stone-400"}`}
                  />
                  <div className="truncate">
                    <div className="truncate">{board.title}</div>
                    {board.description && (
                      <div className="text-[10px] text-stone-400 truncate">{board.description}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      isActive ? "bg-amber-200/70 text-amber-900" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {totalTasks}
                  </span>
                  {boards.length > 1 && (
                    <button
                      type="button"
                      title="Delete board"
                      onClick={(e) => handleDelete(board.id, board.title, e)}
                      className="opacity-0 group-hover:opacity-100 rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                  {isActive && <ChevronRight className="size-3.5 text-amber-600" />}
                </div>
              </div>
            )
          })}

          {filteredBoards.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-stone-400">
              No boards found.
            </div>
          )}
        </div>

        {/* Create Board Modal */}
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4">
            <div className="relative w-[92vw] max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
                <h3 className="text-sm font-bold text-stone-900">New Kanban Board</h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded p-1 text-stone-400 hover:text-stone-600"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Board Title *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. VIP Bookings, Cab Maintenance"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Board Type & Headings
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBoardType("tour")}
                      className={`p-2 rounded-lg border text-center transition text-[11px] font-semibold ${
                        boardType === "tour"
                          ? "border-amber-600 bg-amber-50 text-amber-900"
                          : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      Tour Booking
                    </button>
                    <button
                      type="button"
                      onClick={() => setBoardType("general")}
                      className={`p-2 rounded-lg border text-center transition text-[11px] font-semibold ${
                        boardType === "general"
                          ? "border-amber-600 bg-amber-50 text-amber-900"
                          : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      General Task
                    </button>
                    <button
                      type="button"
                      onClick={() => setBoardType("fleet")}
                      className={`p-2 rounded-lg border text-center transition text-[11px] font-semibold ${
                        boardType === "fleet"
                          ? "border-amber-600 bg-amber-50 text-amber-900"
                          : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      Fleet / Ops
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">
                    {boardType === "tour"
                      ? "Includes Trip Logistics & Commercials"
                      : boardType === "fleet"
                      ? "Subtasks & Assignee only (no tour headings)"
                      : "Core tasks & Client contact"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short description of this board's workflow"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 shadow-2xs"
                  >
                    Create Board
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
