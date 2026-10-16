import { useState, useEffect } from "react"
import {
  X,
  Bell,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ExternalLink,
  Edit3,
  Check,
} from "lucide-react"
import type { Task, Priority, TaskReminder } from "../schemas/board"
import { formatDate } from "../lib/date"
import { toast } from "sonner"

interface ViewReminderModalProps {
  isOpen: boolean
  onClose: () => void
  reminder: TaskReminder | null
  boardId?: string
  boardTitle?: string
  columnId?: string
  task?: Task | null
  onToggleComplete: () => void
  onDelete: () => void
  onUpdate: (updates: Partial<TaskReminder>) => void
  onOpenTask?: (boardId: string, columnId: string, taskId: string) => void
}

export function ViewReminderModal({
  isOpen,
  onClose,
  reminder,
  boardId,
  boardTitle,
  columnId,
  task,
  onToggleComplete,
  onDelete,
  onUpdate,
  onOpenTask,
}: ViewReminderModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState("")
  const [editPriority, setEditPriority] = useState<Priority>("medium")

  useEffect(() => {
    if (reminder) {
      setEditText(reminder.text)
      setEditDate(reminder.dueDate)
      setEditTime(reminder.dueTime || "")
      setEditPriority(reminder.priority || "medium")
      setIsEditing(false)
    }
  }, [reminder])

  if (!isOpen || !reminder) return null

  const isGeneral = boardId === "general" || reminder.id.startsWith("rem-gen") || !task || task.id.startsWith("gen-")
  const todayStr = new Date().toISOString().split("T")[0]
  const isOverdue = reminder.dueDate < todayStr && !reminder.completed
  const isDueToday = reminder.dueDate === todayStr && !reminder.completed

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editText.trim() || !editDate) return

    onUpdate({
      text: editText.trim(),
      dueDate: editDate,
      dueTime: editTime.trim() || undefined,
      priority: editPriority,
    })
    toast.success("Reminder updated")
    setIsEditing(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 bg-stone-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl text-white shadow-2xs ${
                reminder.completed
                  ? "bg-emerald-600"
                  : reminder.priority === "urgent"
                  ? "bg-red-600"
                  : reminder.priority === "high"
                  ? "bg-orange-500"
                  : "bg-amber-600"
              }`}
            >
              <Bell className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-stone-900">
                  Reminder Details
                </h2>
                {isGeneral ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                    General
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Task-Linked
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500">
                Operations Calendar &bull; Scheduled Alert
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                title="Edit reminder"
                className="rounded-lg p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
              >
                <Edit3 className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 transition cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Status Alert Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              reminder.completed
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : isOverdue
                ? "bg-red-50 border-red-200 text-red-900"
                : isDueToday
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-stone-50 border-stone-200 text-stone-800"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {reminder.completed ? (
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              ) : isOverdue ? (
                <AlertTriangle className="size-4 text-red-600 shrink-0" />
              ) : (
                <Clock className="size-4 text-amber-600 shrink-0" />
              )}
              <span className="font-semibold truncate">
                {reminder.completed
                  ? "Completed"
                  : isOverdue
                  ? "Overdue - Action Required"
                  : isDueToday
                  ? "Due Today"
                  : "Scheduled Upcoming"}
              </span>
            </div>

            <button
              type="button"
              onClick={onToggleComplete}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs shrink-0 ${
                reminder.completed
                  ? "bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {reminder.completed ? "Mark Pending" : "Mark as Done"}
            </button>
          </div>

          {/* Edit Form OR View Details */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Reminder Text
                </label>
                <textarea
                  rows={3}
                  required
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Priority
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditPriority(p)}
                      className={`py-1.5 px-2 rounded-lg font-bold capitalize border transition cursor-pointer text-center ${
                        editPriority === p
                          ? "bg-amber-600 text-white border-amber-700 shadow-2xs"
                          : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-600 text-white px-4 py-1.5 text-xs font-bold hover:bg-amber-700 shadow-2xs"
                >
                  <Check className="size-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Reminder Text in Prominent Card */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Reminder Note
                </span>
                <p className="text-sm font-semibold text-stone-900 leading-relaxed whitespace-pre-wrap">
                  {reminder.text}
                </p>
              </div>

              {/* Schedule Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-stone-200 p-3 bg-white shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-1">
                    <CalendarIcon className="size-3 text-stone-400" /> Date
                  </span>
                  <span className="text-xs font-bold text-stone-800 block">
                    {formatDate(reminder.dueDate)}
                  </span>
                </div>

                <div className="rounded-xl border border-stone-200 p-3 bg-white shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-1">
                    <Clock className="size-3 text-stone-400" /> Time
                  </span>
                  <span className="text-xs font-bold text-stone-800 block">
                    {reminder.dueTime ? reminder.dueTime : "All Day"}
                  </span>
                </div>

                <div className="rounded-xl border border-stone-200 p-3 bg-white shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Priority
                  </span>
                  <span
                    className={`inline-block uppercase text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      reminder.priority === "urgent"
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : reminder.priority === "high"
                        ? "bg-orange-100 text-orange-800 border border-orange-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {reminder.priority || "Medium"}
                  </span>
                </div>

                {reminder.createdBy && (
                  <div className="rounded-xl border border-stone-200 p-3 bg-white shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      Created By
                    </span>
                    <span className="text-xs font-bold text-stone-800 block truncate" title={reminder.createdBy}>
                      {reminder.createdBy}
                    </span>
                  </div>
                )}
              </div>

              {/* Associated Task Context Section */}
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Associated Context
                </span>

                {isGeneral ? (
                  <div className="text-xs text-stone-600 flex items-start gap-2">
                    <span className="size-2 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                    <div>
                      <span className="font-bold text-stone-800 block">
                        General Operational Reminder
                      </span>
                      <span className="text-[11px] text-stone-500">
                        Not associated with any staff member or client booking. Visible team-wide across the Operations Calendar.
                      </span>
                    </div>
                  </div>
                ) : task ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-stone-900 block truncate">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-0.5">
                        <span>Board: {boardTitle}</span>
                        {task.customerName && (
                          <>
                            <span>&bull;</span>
                            <span>Client: {task.customerName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {onOpenTask && boardId && columnId && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onOpenTask(boardId, columnId, task.id)
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0"
                      >
                        <span>Open Task Card</span>
                        <ExternalLink className="size-3.5" />
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="border-t border-stone-200 pt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this reminder?")) {
                  onDelete()
                  toast.success("Reminder deleted")
                  onClose()
                }
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              <span>Delete Reminder</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 px-4 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
