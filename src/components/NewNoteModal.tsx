import { useState, useEffect } from "react"
import { CheckSquare, X, Lock, Calendar, ArrowRight } from "lucide-react"
import { useTodoStore } from "../store/todoStore"
import { useAuthStore } from "../store/authStore"
import { useBoardStore } from "../store/boardStore"
import { getLocalDateString } from "../lib/date"
import { toast } from "sonner"

interface NewNoteModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NewNoteModal({ isOpen, onClose }: NewNoteModalProps) {
  const { addTodo } = useTodoStore()
  const { profile, user } = useAuthStore()
  const { setCurrentView, setSidebarOpen } = useBoardStore()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState<string>("")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [saving, setSaving] = useState(false)

  const todayStr = getLocalDateString(new Date())
  const tomorrowStr = getLocalDateString(new Date(Date.now() + 86400000))

  useEffect(() => {
    if (!isOpen) {
      setTitle("")
      setDescription("")
      setDueDate("")
      setPriority("medium")
      setSaving(false)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    setSaving(true)
    try {
      await addTodo({
        title: trimmed,
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        priority,
      })
      toast.success("Note added to your private checklist")
      onClose()
    } catch {
      toast.error("Failed to save note")
    } finally {
      setSaving(false)
    }
  }

  const handleGoToNotes = () => {
    onClose()
    setCurrentView("todos")
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <CheckSquare className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-900">New Note</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600 border border-stone-200">
                  <Lock className="size-2.5 text-stone-400" />
                  <span>Private</span>
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Visible only to {profile?.name || user?.email || "you"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Note / Task *
            </label>
            <textarea
              required
              autoFocus
              rows={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call client about Rajasthan package, verify itinerary..."
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Additional Details (optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes or context..."
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* Due date & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Due Date
              </label>
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDueDate(todayStr)}
                    className={`flex-1 rounded-lg border py-1 text-[11px] font-semibold transition ${
                      dueDate === todayStr
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueDate(tomorrowStr)}
                    className={`flex-1 rounded-lg border py-1 text-[11px] font-semibold transition ${
                      dueDate === tomorrowStr
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    Tomorrow
                  </button>
                </div>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2 size-3.5 text-stone-400 pointer-events-none" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 pl-8 pr-2 py-1 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 focus:border-amber-500 focus:outline-none"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={handleGoToNotes}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
            >
              <span>Go to Notes page</span>
              <ArrowRight className="size-3" />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-stone-200 px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="rounded-xl bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50 cursor-pointer transition"
              >
                {saving ? "Adding..." : "Add Note"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
