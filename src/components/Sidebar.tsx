import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  CheckSquare,
  Plus,
  Trash2,
  X,
  ChevronRight,
  ChevronDown,
  Users,
  ShieldCheck,
  Settings,
  Archive,
  ArchiveRestore,
  GripVertical,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useAuthStore } from "../store/authStore"
import { getUserPermissions } from "../lib/permissions"

export function Sidebar() {
  const {
    boards,
    activeBoardId,
    setActiveBoardId,
    currentView,
    setCurrentView,
    createBoard,
    deleteBoard,
    archiveBoard,
    unarchiveBoard,
    reorderBoards,
    sidebarOpen,
    setSidebarOpen,
  } = useBoardStore()
  const { profile } = useAuthStore()

  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [filterQuery, setFilterQuery] = useState("")
  const [draggedBoardIdx, setDraggedBoardIdx] = useState<number | null>(null)
  const [dragOverBoardIdx, setDragOverBoardIdx] = useState<number | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const userRole = profile?.role || "travel"
  const permissions = getUserPermissions(profile)

  // Filter boards based on user's permissions & role:
  // 1. Explicit allowedBoardIds if configured by Admin
  // 2. Otherwise default role-based visibility
  const roleFilteredBoards = boards.filter((b) => {
    if (permissions.allowedBoardIds && permissions.allowedBoardIds.length > 0) {
      return permissions.allowedBoardIds.includes(b.id)
    }
    if (userRole === "admin" || userRole === "accounts") return true
    const titleLower = b.title.toLowerCase()
    if (userRole === "visa") {
      return titleLower.includes("visa") || !titleLower.includes("fleet")
    }
    if (userRole === "travel") {
      return !titleLower.includes("accounting") && !titleLower.includes("payroll")
    }
    return true
  })

  const activeRoleBoards = roleFilteredBoards.filter((b) => !b.isArchived)
  const archivedRoleBoards = roleFilteredBoards.filter((b) => b.isArchived)

  // Keep active board in sync with authorized boards (active or archived)
  useEffect(() => {
    if (roleFilteredBoards.length > 0 && !roleFilteredBoards.some((b) => b.id === activeBoardId)) {
      setActiveBoardId(activeRoleBoards[0]?.id || roleFilteredBoards[0].id)
    }
  }, [activeRoleBoards, roleFilteredBoards, activeBoardId, setActiveBoardId])

  const filteredBoards = activeRoleBoards.filter((b) =>
    b.title.toLowerCase().includes(filterQuery.toLowerCase())
  )

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedBoardIdx(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", `board:${index}`)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedBoardIdx !== null && draggedBoardIdx !== index) {
      setDragOverBoardIdx(index)
    }
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedBoardIdx !== null && draggedBoardIdx !== targetIndex) {
      const sourceBoard = filteredBoards[draggedBoardIdx]
      const targetBoard = filteredBoards[targetIndex]
      if (sourceBoard && targetBoard) {
        const globalSourceIdx = boards.findIndex((b) => b.id === sourceBoard.id)
        const globalTargetIdx = boards.findIndex((b) => b.id === targetBoard.id)
        if (globalSourceIdx !== -1 && globalTargetIdx !== -1) {
          reorderBoards(globalSourceIdx, globalTargetIdx)
        }
      }
    }
    setDraggedBoardIdx(null)
    setDragOverBoardIdx(null)
  }

  const handleArchive = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Archive board "${title}"? You can restore it anytime from Archived Boards.`)) {
      archiveBoard(id, true)
    }
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const modules = {
      clientContact: true,
      subtasks: true,
    }

    const newId = createBoard(newTitle.trim(), newDescription.trim() || undefined, modules)
    setActiveBoardId(newId)
    setNewTitle("")
    setNewDescription("")
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
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-stone-200 bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
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
            {userRole === "admin" && (
              <button
                type="button"
                title="Create New Board"
                onClick={() => setIsCreating(true)}
                className="rounded-md p-1.5 text-stone-600 hover:bg-stone-100 hover:text-amber-700 transition cursor-pointer"
              >
                <Plus className="size-4" />
              </button>
            )}
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

        {/* Dashboard & Personal Checklist Navigation Items */}
        <div className="p-2.5 pb-2 border-b border-stone-100 space-y-1">
          <button
            type="button"
            onClick={() => {
              setCurrentView("dashboard")
              if (window.innerWidth < 768) setSidebarOpen(false)
            }}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition cursor-pointer ${
              currentView === "dashboard"
                ? "bg-amber-600 text-white shadow-sm shadow-amber-600/20"
                : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className={`size-4 ${currentView === "dashboard" ? "text-white" : "text-amber-600"}`} />
              <span>Dashboard</span>
            </div>
            {currentView === "dashboard" ? (
              <span className="size-1.5 rounded-full bg-white animate-pulse" />
            ) : (
              <ChevronRight className="size-3.5 text-stone-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentView("todos")
              if (window.innerWidth < 768) setSidebarOpen(false)
            }}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition cursor-pointer ${
              currentView === "todos"
                ? "bg-amber-600 text-white shadow-sm shadow-amber-600/20"
                : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckSquare className={`size-4 ${currentView === "todos" ? "text-white" : "text-stone-500"}`} />
              <span>Notes</span>
            </div>
            {currentView === "todos" ? (
              <span className="size-1.5 rounded-full bg-white animate-pulse" />
            ) : (
              <ChevronRight className="size-3.5 text-stone-400" />
            )}
          </button>
        </div>

        {/* Boards List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          <div className="px-2 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Workflows & Pipelines
          </div>

          {filteredBoards.map((board, idx) => {
            const isActive = board.id === activeBoardId && currentView === "board"
            const totalTasks = board.columns.reduce((sum, col) => sum + col.tasks.length, 0)
            const isDragOver = dragOverBoardIdx === idx

            return (
              <div
                key={board.id}
                draggable={userRole === "admin"}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={() => setDragOverBoardIdx(null)}
                onDrop={(e) => handleDrop(e, idx)}
                onClick={() => {
                  setActiveBoardId(board.id)
                  if (currentView !== "board") setCurrentView("board")
                  if (window.innerWidth < 768) setSidebarOpen(false)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActiveBoardId(board.id)
                    if (currentView !== "board") setCurrentView("board")
                  }
                }}
                className={`group relative flex items-center justify-between rounded-lg px-2 py-2 text-xs font-medium cursor-pointer transition select-none ${
                  isActive
                    ? "bg-amber-50 text-amber-900 font-semibold shadow-2xs border border-amber-200/60"
                    : "text-stone-700 hover:bg-stone-100"
                } ${
                  isDragOver ? "ring-2 ring-amber-500 bg-amber-50/50" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {userRole === "admin" && (
                    <div
                      title="Drag to reorder"
                      className="opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab text-stone-400 p-0.5 -ml-1 shrink-0"
                    >
                      <GripVertical className="size-3.5" />
                    </div>
                  )}
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

                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      isActive ? "bg-amber-200/70 text-amber-900" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {totalTasks}
                  </span>
                  {userRole === "admin" && (
                    <>
                      <button
                        type="button"
                        title="Archive board"
                        onClick={(e) => handleArchive(board.id, board.title, e)}
                        className="opacity-0 group-hover:opacity-100 rounded p-1 text-stone-400 hover:bg-amber-100/70 hover:text-amber-700 transition cursor-pointer"
                      >
                        <Archive className="size-3.5" />
                      </button>
                      {activeRoleBoards.length > 1 && (
                        <button
                          type="button"
                          title="Delete board"
                          onClick={(e) => handleDelete(board.id, board.title, e)}
                          className="opacity-0 group-hover:opacity-100 rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </>
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

          {/* Archived Boards Collapsible Section */}
          {archivedRoleBoards.length > 0 && (
            <div className="pt-2 border-t border-stone-200/70 mt-3">
              <button
                type="button"
                onClick={() => setShowArchived((prev) => !prev)}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 hover:text-stone-600 transition cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Archive className="size-3 text-stone-400" />
                  <span>Archived ({archivedRoleBoards.length})</span>
                </span>
                <ChevronDown
                  className={`size-3 transition-transform ${showArchived ? "rotate-180" : ""}`}
                />
              </button>

              {showArchived && (
                <div className="space-y-1 mt-1.5">
                  {archivedRoleBoards.map((ab) => {
                    const isArchivedActive = ab.id === activeBoardId && currentView === "board"
                    return (
                      <div
                        key={ab.id}
                        onClick={() => {
                          setActiveBoardId(ab.id)
                          if (currentView !== "board") setCurrentView("board")
                          if (window.innerWidth < 768) setSidebarOpen(false)
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setActiveBoardId(ab.id)
                            if (currentView !== "board") setCurrentView("board")
                          }
                        }}
                        className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs cursor-pointer transition select-none ${
                          isArchivedActive
                            ? "bg-amber-100/70 text-amber-900 font-semibold shadow-2xs border border-amber-300"
                            : "text-stone-600 bg-stone-100/60 hover:bg-stone-200/60 border border-stone-200/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Archive className="size-3.5 text-stone-400 shrink-0" />
                          <span className="truncate flex-1 font-medium">
                            {ab.title}
                          </span>
                        </div>
                        {userRole === "admin" && (
                          <button
                            type="button"
                            title="Restore board"
                            onClick={(e) => {
                              e.stopPropagation()
                              unarchiveBoard(ab.id)
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 hover:text-amber-800 bg-white px-2 py-0.5 rounded border border-stone-200 hover:border-amber-300 shadow-2xs transition cursor-pointer shrink-0 ml-1.5"
                          >
                            <ArchiveRestore className="size-3" />
                            <span>Restore</span>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Management & Administration Pages Section - Admin Only */}
        {userRole === "admin" && (
          <div className="border-t border-stone-200 bg-white p-2.5 space-y-1 shrink-0">
            <div className="px-2 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Management
            </div>

            {/* Customers Page - Admin Only */}
            <button
              type="button"
              onClick={() => {
                setCurrentView("customers")
                if (window.innerWidth < 768) setSidebarOpen(false)
              }}
              className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                currentView === "customers"
                  ? "bg-amber-50 text-amber-900 font-semibold shadow-2xs border border-amber-200/60"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className={`size-4 ${currentView === "customers" ? "text-amber-600" : "text-stone-400"}`} />
                <span>Customers</span>
              </div>
              {currentView === "customers" && <ChevronRight className="size-3.5 text-amber-600" />}
            </button>

            {/* Staff & Roles Page - Admin Only */}
            <button
              type="button"
              onClick={() => {
                setCurrentView("staff")
                if (window.innerWidth < 768) setSidebarOpen(false)
              }}
              className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                currentView === "staff"
                  ? "bg-amber-50 text-amber-900 font-semibold shadow-2xs border border-amber-200/60"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className={`size-4 ${currentView === "staff" ? "text-amber-600" : "text-stone-400"}`} />
                <span>Staff & Roles</span>
              </div>
              {currentView === "staff" && <ChevronRight className="size-3.5 text-amber-600" />}
            </button>

            {/* Settings Page - Admin Only */}
            <button
              type="button"
              onClick={() => {
                setCurrentView("settings")
                if (window.innerWidth < 768) setSidebarOpen(false)
              }}
              className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                currentView === "settings"
                  ? "bg-amber-50 text-amber-900 font-semibold shadow-2xs border border-amber-200/60"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className={`size-4 ${currentView === "settings" ? "text-amber-600" : "text-stone-400"}`} />
                <span>Settings</span>
              </div>
              {currentView === "settings" && <ChevronRight className="size-3.5 text-amber-600" />}
            </button>
          </div>
        )}

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
