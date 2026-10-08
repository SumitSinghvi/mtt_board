import { useState } from "react"
import {
  X,
  Sliders,
  User,
  CheckSquare,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  Archive,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import type { BoardModules } from "../schemas/board"

interface BoardSettingsModalProps {
  boardId: string
  onClose: () => void
}

interface ComponentMeta {
  key: keyof BoardModules
  title: string
  description: string
  icon: typeof User
  iconBg: string
  iconColor: string
}

const ALL_SYSTEM_COMPONENTS: ComponentMeta[] = [
  {
    key: "clientContact",
    title: "Client Contact Info",
    description: "Customer selection, phone with 1-click WhatsApp chat link, and email",
    icon: User,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-700",
  },
  {
    key: "subtasks",
    title: "Operations Checklist & Subtasks",
    description: "Sub-cards breakdown, per-subtask priority, due dates, assignees, and progress bar",
    icon: CheckSquare,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-700",
  },
]

export function BoardSettingsModal({ boardId, onClose }: BoardSettingsModalProps) {
  const { boards, updateBoard, updateBoardModules, permanentlyDeleteComponentGlobally, archiveBoard } =
    useBoardStore()
  const board = boards.find((b) => b.id === boardId)

  const [title, setTitle] = useState(board?.title || "")
  const [description, setDescription] = useState(board?.description || "")

  // Persistent globally deleted components across all boards
  const [deletedComponentKeys, setDeletedComponentKeys] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("mtt_deleted_components")
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Pending confirmation for permanent delete
  const [confirmDeleteComp, setConfirmDeleteComp] = useState<ComponentMeta | null>(null)

  const modules: BoardModules = board?.modules || {
    clientContact: true,
    subtasks: true,
  }

  if (!board) return null

  // Components that exist (not permanently deleted)
  const existingComponents = ALL_SYSTEM_COMPONENTS.filter(
    (c) => !deletedComponentKeys.includes(c.key)
  )

  // Components that were permanently deleted (can be restored/re-added)
  const deletedComponents = ALL_SYSTEM_COMPONENTS.filter((c) =>
    deletedComponentKeys.includes(c.key)
  )

  const handleToggleComponent = (key: keyof BoardModules, enabled: boolean) => {
    updateBoardModules(boardId, { [key]: enabled })
  }

  const handleExecutePermanentDelete = () => {
    if (!confirmDeleteComp) return
    const compKey = confirmDeleteComp.key

    // 1. Disable across all boards in store & Supabase
    permanentlyDeleteComponentGlobally(compKey)

    // 2. Mark as permanently deleted in local list
    const updatedDeleted = Array.from(new Set([...deletedComponentKeys, compKey]))
    setDeletedComponentKeys(updatedDeleted)
    try {
      localStorage.setItem("mtt_deleted_components", JSON.stringify(updatedDeleted))
    } catch {
      // ignore
    }

    setConfirmDeleteComp(null)
  }

  const handleRestoreComponent = (comp: ComponentMeta) => {
    const updated = deletedComponentKeys.filter((k) => k !== comp.key)
    setDeletedComponentKeys(updated)
    try {
      localStorage.setItem("mtt_deleted_components", JSON.stringify(updated))
    } catch {
      // ignore
    }
    // Enable on current board
    updateBoardModules(boardId, { [comp.key]: true })
  }

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    updateBoard(boardId, { title: title.trim(), description: description.trim() || undefined })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full sm:w-[92vw] max-w-xl h-[90vh] sm:h-[84vh] flex-col rounded-xl sm:rounded-2xl border border-stone-200 bg-white shadow-2xl animate-in fade-in-50 zoom-in-95 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-3.5 sm:px-6 py-3 sm:py-4 bg-stone-50/70 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="rounded-lg bg-amber-100 p-1.5 text-amber-800">
              <Sliders className="size-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-stone-900">Board Settings & Components</h3>
              <p className="text-[11px] sm:text-xs text-stone-500">Configure enabled components for {board.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-5 sm:space-y-6">
          {/* Active / Existing Components */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                Components ({existingComponents.length})
              </label>
              <span className="text-[11px] text-stone-400">Toggle to use on this board</span>
            </div>

            {existingComponents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 p-5 text-center text-xs text-stone-500 bg-stone-50/50">
                All components have been deleted. You can restore or add them from below.
              </div>
            ) : (
              <div className="space-y-2.5">
                {existingComponents.map((comp) => {
                  const Icon = comp.icon
                  const isEnabled = Boolean(modules[comp.key])

                  return (
                    <div
                      key={comp.key}
                      className={`group flex items-center justify-between p-3 rounded-xl border transition ${
                        isEnabled
                          ? "border-stone-200 bg-white shadow-2xs"
                          : "border-stone-200/60 bg-stone-50/60 opacity-80"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className={`rounded-lg ${comp.iconBg} p-2 ${comp.iconColor} shrink-0`}>
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-stone-900 flex items-center gap-2">
                            <span>{comp.title}</span>
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-semibold border ${
                                isEnabled
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-stone-100 text-stone-500 border-stone-200"
                              }`}
                            >
                              {isEnabled ? "In Use" : "Disabled"}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-500 truncate">
                            {comp.description}
                          </div>
                        </div>
                      </div>

                      {/* Right Controls: Use Toggle + Permanent Delete Button */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Toggle switch for using on this board */}
                        <label
                          className="flex items-center gap-1.5 cursor-pointer select-none"
                          title={isEnabled ? "Disable for this board" : "Enable for this board"}
                        >
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => handleToggleComponent(comp.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="relative w-8 h-4 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-600"></div>
                          <span className="text-[11px] font-semibold text-stone-600">
                            {isEnabled ? "On" : "Off"}
                          </span>
                        </label>

                        {/* Separate Permanent Delete Button */}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteComp(comp)}
                          title={`Permanently delete ${comp.title} from anywhere`}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Add Deleted / Restorable Components */}
          {deletedComponents.length > 0 && (
            <div className="pt-2 border-t border-stone-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                Deleted Components ({deletedComponents.length})
              </label>

              <div className="space-y-2">
                {deletedComponents.map((comp) => {
                  const Icon = comp.icon
                  return (
                    <div
                      key={comp.key}
                      className="flex items-center justify-between p-3 rounded-xl border border-dashed border-stone-300 bg-stone-50/60 hover:bg-white hover:border-amber-400 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="rounded-lg bg-stone-200/70 p-2 text-stone-600 shrink-0">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-stone-700">{comp.title}</div>
                          <div className="text-[11px] text-stone-400 truncate">
                            {comp.description}
                          </div>
                        </div>
                      </div>

                      {/* Add / Restore Component Button */}
                      <button
                        type="button"
                        onClick={() => handleRestoreComponent(comp)}
                        title={`Restore and add ${comp.title}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 shadow-2xs transition shrink-0 cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        <span>Add Back</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Board Details Form */}
          <form onSubmit={handleSaveInfo} className="space-y-3 pt-4 border-t border-stone-200">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Board Name
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-100">
              {board && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Archive board "${board.title}"? You can restore it anytime from Archived Boards in the sidebar.`)) {
                      archiveBoard(board.id, true)
                      onClose()
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition cursor-pointer"
                >
                  <Archive className="size-3.5" />
                  <span>Archive Board</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 transition shadow-2xs cursor-pointer"
                >
                  <Save className="size-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Confirmation Modal for Permanent Component Deletion */}
        {confirmDeleteComp && (
          <div
            className="fixed inset-0 z-70 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 animate-in fade-in-50"
            onClick={() => setConfirmDeleteComp(null)}
          >
            <div
              className="relative w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-red-100 p-2.5 text-red-700 shrink-0">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">
                    Permanently Delete &ldquo;{confirmDeleteComp.title}&rdquo;?
                  </h4>
                  <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                    This will delete this component from <span className="font-semibold text-stone-900">all boards</span> across the entire system.
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200">
                    💡 If you only want to turn it off on this board, use the <strong>On/Off toggle</strong> switch instead.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteComp(null)}
                  className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecutePermanentDelete}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 shadow-2xs transition cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>Yes, Delete Everywhere</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
