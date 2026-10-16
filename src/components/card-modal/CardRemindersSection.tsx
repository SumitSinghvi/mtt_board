import { useState } from "react"
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  X,
  Check,
} from "lucide-react"
import type { TaskReminder, Priority } from "../../schemas/board"
import { formatDate } from "../../lib/date"
import { toast } from "sonner"
import { useAuthStore } from "../../store/authStore"

interface CardRemindersSectionProps {
  reminders: TaskReminder[]
  canEdit?: boolean
  onAddReminder: (reminder: Omit<TaskReminder, "id" | "createdAt">) => void
  onToggleReminder: (reminderId: string) => void
  onDeleteReminder: (reminderId: string) => void
}

export function CardRemindersSection({
  reminders,
  canEdit = true,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
}: CardRemindersSectionProps) {
  const { profile, user } = useAuthStore()
  const [isOpen, setIsOpen] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const todayStr = new Date().toISOString().split("T")[0]

  const [text, setText] = useState("")
  const [dueDate, setDueDate] = useState(todayStr)
  const [dueTime, setDueTime] = useState("09:00")
  const [priority, setPriority] = useState<Priority>("medium")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !dueDate) return

    const creator = profile?.name || user?.email?.split("@")[0] || "Staff"

    onAddReminder({
      text: text.trim(),
      dueDate,
      dueTime: dueTime.trim() || undefined,
      priority,
      completed: false,
      createdBy: creator,
    })
    toast.success("Reminder scheduled")

    setText("")
    setIsAdding(false)
  }

  const activeCount = reminders.filter((r) => !r.completed).length

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3.5 sm:p-4 space-y-3 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs font-bold text-stone-800 hover:text-amber-800 transition cursor-pointer select-none"
        >
          {isOpen ? (
            <ChevronDown className="size-3.5 text-stone-400" />
          ) : (
            <ChevronRight className="size-3.5 text-stone-400" />
          )}
          <Bell className="size-3.5 text-amber-600" />
          <span>Scheduled Reminders &amp; Alerts</span>
          {reminders.length > 0 && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 ml-1">
              {activeCount}
            </span>
          )}
        </button>

        {canEdit && !isAdding && (
          <button
            type="button"
            onClick={() => {
              setIsOpen(true)
              setIsAdding(true)
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.8 rounded-lg transition cursor-pointer"
          >
            <Plus className="size-3" />
            <span>Add Reminder</span>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="space-y-2.5">
          {/* Add Reminder Form */}
          {isAdding && (
            <form onSubmit={handleSubmit} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-900">
                  New Scheduled Reminder
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Verify passport copy, follow up payment, confirm cab..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-white p-2 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white p-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                    Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white p-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full rounded-lg border border-stone-200 bg-white p-1.5 text-xs text-stone-800 capitalize focus:border-amber-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 text-xs font-bold shadow-2xs cursor-pointer"
                >
                  <Check className="size-3" />
                  <span>Save Reminder</span>
                </button>
              </div>
            </form>
          )}

          {/* Existing Reminders List */}
          {reminders.length === 0 ? (
            <p className="text-[11px] text-stone-400 italic py-1">
              No reminders scheduled for this task yet. Schedule reminders in advance to receive alerts on the Operations Calendar.
            </p>
          ) : (
            <div className="divide-y divide-stone-100 space-y-1">
              {reminders.map((rem) => {
                const isOverdue = rem.dueDate < todayStr && !rem.completed
                const isDueToday = rem.dueDate === todayStr && !rem.completed

                return (
                  <div
                    key={rem.id}
                    className={`flex items-start justify-between gap-2 p-2 rounded-lg transition ${
                      rem.completed
                        ? "bg-stone-50/70 text-stone-400 opacity-60"
                        : isOverdue
                        ? "bg-red-50/80 border border-red-200/80"
                        : isDueToday
                        ? "bg-amber-50/80 border border-amber-200/80"
                        : "hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => onToggleReminder(rem.id)}
                        className={`mt-0.5 size-4 rounded border flex items-center justify-center transition cursor-pointer shrink-0 ${
                          rem.completed
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-stone-300 bg-white hover:border-amber-600"
                        }`}
                      >
                        {rem.completed && <CheckCircle2 className="size-3 text-white" />}
                      </button>

                      <div className="min-w-0 flex-1 leading-tight">
                        <span className={`text-xs font-semibold block ${rem.completed ? "line-through text-stone-400" : "text-stone-800"}`}>
                          {rem.text}
                        </span>

                        <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-1">
                          {isOverdue ? (
                            <span className="font-bold text-red-600 inline-flex items-center gap-0.5">
                              <AlertTriangle className="size-2.5" />
                              <span>Overdue ({formatDate(rem.dueDate)})</span>
                            </span>
                          ) : isDueToday ? (
                            <span className="font-bold text-amber-700 inline-flex items-center gap-0.5">
                              <Clock className="size-2.5" />
                              <span>Due Today {rem.dueTime ? `at ${rem.dueTime}` : ""}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5">
                              <Calendar className="size-2.5 text-stone-400" />
                              <span>{formatDate(rem.dueDate)} {rem.dueTime ? `at ${rem.dueTime}` : ""}</span>
                            </span>
                          )}

                          {rem.priority && rem.priority !== "medium" && (
                            <span
                              className={`uppercase text-[9px] font-bold px-1 py-0.2 rounded ${
                                rem.priority === "urgent"
                                  ? "bg-red-100 text-red-700"
                                  : rem.priority === "high"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {rem.priority}
                            </span>
                          )}

                          {rem.createdBy && (
                            <span className="text-[9px] font-medium text-stone-500 bg-stone-100 px-1 py-0.2 rounded border border-stone-200">
                              by {rem.createdBy}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this reminder?")) {
                            onDeleteReminder(rem.id)
                            toast.success("Reminder deleted")
                          }
                        }}
                        title="Delete reminder"
                        className="text-stone-400 hover:text-red-600 p-1 rounded transition cursor-pointer"
                      >
                        <Trash2 className="size-3" />
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
  )
}
