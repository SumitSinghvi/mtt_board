import { useState } from "react"
import {
  X,
  Sliders,
  MapPin,
  IndianRupee,
  User,
  CheckSquare,
  Check,
  Save,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"

interface BoardSettingsModalProps {
  boardId: string
  onClose: () => void
}

export function BoardSettingsModal({ boardId, onClose }: BoardSettingsModalProps) {
  const { boards, updateBoard, updateBoardModules } = useBoardStore()
  const board = boards.find((b) => b.id === boardId)

  const [title, setTitle] = useState(board?.title || "")
  const [description, setDescription] = useState(board?.description || "")

  const modules = board?.modules || {
    clientContact: true,
    tripLogistics: false,
    commercials: false,
    subtasks: true,
  }

  if (!board) return null

  const handleToggle = (moduleKey: keyof typeof modules) => {
    updateBoardModules(boardId, { [moduleKey]: !modules[moduleKey] })
  }

  const applyPreset = (preset: "tour" | "fleet" | "general") => {
    if (preset === "tour") {
      updateBoardModules(boardId, {
        clientContact: true,
        tripLogistics: true,
        commercials: true,
        subtasks: true,
      })
    } else if (preset === "fleet") {
      updateBoardModules(boardId, {
        clientContact: false,
        tripLogistics: false,
        commercials: false,
        subtasks: true,
      })
    } else {
      updateBoardModules(boardId, {
        clientContact: true,
        tripLogistics: false,
        commercials: false,
        subtasks: true,
      })
    }
  }

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    updateBoard(boardId, { title: title.trim(), description: description.trim() || undefined })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-[92vw] max-w-xl h-[80vh] flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl animate-in fade-in-50 zoom-in-95 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-100 p-1.5 text-amber-800">
              <Sliders className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Board Settings & Modules</h3>
              <p className="text-xs text-stone-500">Configure enabled headings for {board.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              Quick Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyPreset("tour")}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 text-center hover:bg-amber-100/80 transition"
              >
                <span className="text-xs font-bold text-amber-900">Tour Booking</span>
                <span className="text-[10px] text-amber-700 mt-0.5">All modules ON</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset("general")}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-center hover:bg-stone-100 transition"
              >
                <span className="text-xs font-bold text-stone-800">General Task</span>
                <span className="text-[10px] text-stone-500 mt-0.5">Core only</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset("fleet")}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-center hover:bg-stone-100 transition"
              >
                <span className="text-xs font-bold text-stone-800">Fleet / Internal</span>
                <span className="text-[10px] text-stone-500 mt-0.5">Subtasks only</span>
              </button>
            </div>
          </div>

          {/* Module Toggles */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              Section Modules on Cards
            </label>
            <div className="space-y-2">
              {/* Trip Logistics Toggle */}
              <div
                onClick={() => handleToggle("tripLogistics")}
                className="flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:border-amber-400 bg-white cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
                    <MapPin className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900">Trip & Route Logistics</div>
                    <div className="text-[11px] text-stone-500">
                      Pickup point, destination circuit, travel dates, vehicle, pax
                    </div>
                  </div>
                </div>
                <div
                  className={`size-5 rounded-md flex items-center justify-center border transition ${
                    modules.tripLogistics
                      ? "bg-amber-600 border-amber-600 text-white"
                      : "border-stone-300 bg-stone-50"
                  }`}
                >
                  {modules.tripLogistics && <Check className="size-3.5 stroke-3" />}
                </div>
              </div>

              {/* Commercials Toggle */}
              <div
                onClick={() => handleToggle("commercials")}
                className="flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:border-amber-400 bg-white cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                    <IndianRupee className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900">Commercials & Billing</div>
                    <div className="text-[11px] text-stone-500">
                      Total quote amount, advance collected, and balance due
                    </div>
                  </div>
                </div>
                <div
                  className={`size-5 rounded-md flex items-center justify-center border transition ${
                    modules.commercials
                      ? "bg-amber-600 border-amber-600 text-white"
                      : "border-stone-300 bg-stone-50"
                  }`}
                >
                  {modules.commercials && <Check className="size-3.5 stroke-3" />}
                </div>
              </div>

              {/* Client Contact Toggle */}
              <div
                onClick={() => handleToggle("clientContact")}
                className="flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:border-amber-400 bg-white cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-sky-50 p-2 text-sky-700">
                    <User className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900">Client Contact Info</div>
                    <div className="text-[11px] text-stone-500">
                      Customer name, phone with 1-click Call/WhatsApp, and email
                    </div>
                  </div>
                </div>
                <div
                  className={`size-5 rounded-md flex items-center justify-center border transition ${
                    modules.clientContact
                      ? "bg-amber-600 border-amber-600 text-white"
                      : "border-stone-300 bg-stone-50"
                  }`}
                >
                  {modules.clientContact && <Check className="size-3.5 stroke-3" />}
                </div>
              </div>

              {/* Operations Checklist Toggle */}
              <div
                onClick={() => handleToggle("subtasks")}
                className="flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:border-amber-400 bg-white cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
                    <CheckSquare className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900">Operations Checklist & Subtasks</div>
                    <div className="text-[11px] text-stone-500">
                      Checklist items with progress tracker
                    </div>
                  </div>
                </div>
                <div
                  className={`size-5 rounded-md flex items-center justify-center border transition ${
                    modules.subtasks
                      ? "bg-amber-600 border-amber-600 text-white"
                      : "border-stone-300 bg-stone-50"
                  }`}
                >
                  {modules.subtasks && <Check className="size-3.5 stroke-3" />}
                </div>
              </div>
            </div>
          </div>

          {/* Board Details Form */}
          <form onSubmit={handleSaveInfo} className="space-y-3 pt-2 border-t border-stone-200">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Board Name
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
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
                className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100"
              >
                Close
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 transition"
              >
                <Save className="size-3.5" />
                <span>Save Name</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
