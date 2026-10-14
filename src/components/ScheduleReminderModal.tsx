import { useState, useMemo } from "react"
import {
  X,
  Bell,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Search,
} from "lucide-react"
import type { Priority, Task, Board } from "../schemas/board"
import { formatDate } from "../lib/date"
import { toast } from "sonner"

export interface FlattenedTaskItem {
  boardId: string
  boardTitle: string
  columnId: string
  columnTitle: string
  task: Task
}

interface ScheduleReminderModalProps {
  isOpen: boolean
  onClose: () => void
  defaultDate?: string
  defaultTaskId?: string
  defaultBoardId?: string
  defaultColumnId?: string
  boards: Board[]
  tasks: FlattenedTaskItem[]
  onSaveReminder: (
    boardId: string | undefined,
    columnId: string | undefined,
    taskId: string | undefined,
    reminder: {
      text: string
      dueDate: string
      dueTime?: string
      priority: Priority
    }
  ) => void
}

export function ScheduleReminderModal({
  isOpen,
  onClose,
  defaultDate,
  defaultTaskId,
  defaultBoardId,
  defaultColumnId,
  tasks,
  onSaveReminder,
}: ScheduleReminderModalProps) {
  const todayStr = new Date().toISOString().split("T")[0]

  const [selectedTaskKey, setSelectedTaskKey] = useState<string>(() => {
    if (defaultTaskId && defaultBoardId && defaultColumnId) {
      return `${defaultBoardId}:::${defaultColumnId}:::${defaultTaskId}`
    }
    return "general"
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [reminderText, setReminderText] = useState("")
  const [dueDate, setDueDate] = useState(defaultDate || todayStr)
  const [dueTime, setDueTime] = useState("09:00")
  const [priority, setPriority] = useState<Priority>("medium")
  const [error, setError] = useState("")

  // Filter tasks for selection
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks
    const q = searchQuery.toLowerCase()
    return tasks.filter(
      (t) =>
        t.task.title.toLowerCase().includes(q) ||
        t.boardTitle.toLowerCase().includes(q) ||
        (t.task.customerName && t.task.customerName.toLowerCase().includes(q)) ||
        (t.task.destination && t.task.destination.toLowerCase().includes(q))
    )
  }, [tasks, searchQuery])

  // Selected task object
  const currentSelectedTask = useMemo(() => {
    if (!selectedTaskKey) return null
    const [bId, cId, tId] = selectedTaskKey.split(":::")
    return tasks.find((t) => t.boardId === bId && t.columnId === cId && t.task.id === tId) || null
  }, [selectedTaskKey, tasks])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reminderText.trim()) {
      setError("Please enter the reminder text.")
      return
    }
    if (!dueDate) {
      setError("Please select a date for the reminder.")
      return
    }

    if (selectedTaskKey === "general" || !selectedTaskKey) {
      onSaveReminder(undefined, undefined, undefined, {
        text: reminderText.trim(),
        dueDate,
        dueTime: dueTime.trim() || undefined,
        priority,
      })
    } else {
      const [boardId, columnId, taskId] = selectedTaskKey.split(":::")
      onSaveReminder(boardId, columnId, taskId, {
        text: reminderText.trim(),
        dueDate,
        dueTime: dueTime.trim() || undefined,
        priority,
      })
    }

    toast.success("Reminder scheduled")
    onClose()
  }

  // Quick date jump helpers
  const handleSetQuickDate = (offsetDays: number) => {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    setDueDate(`${y}-${m}-${day}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 bg-stone-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-600 text-white shadow-2xs">
              <Bell className="size-4.5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900">
                Schedule Reminder
              </h2>
              <p className="text-[11px] text-stone-500">
                Operations Calendar &bull; General or Task-Linked Alerts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 transition cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* 1. Associated Task or General Reminder */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-stone-800">
                1. Reminder Context (General or Linked Task)
              </label>
              <span className="text-[10px] text-stone-400">Optional</span>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Search className="size-3.5 absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Filter tasks by title, customer, or destination..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-1.5 rounded-lg border border-stone-200 text-xs bg-stone-50/50 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <select
                value={selectedTaskKey}
                onChange={(e) => {
                  setSelectedTaskKey(e.target.value)
                  setError("")
                }}
                className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-medium text-stone-800 focus:border-amber-500 focus:outline-none shadow-2xs"
              >
                <option value="general">
                  📌 General Operational Reminder (Not associated with any staff / task)
                </option>
                {filteredTasks.length > 0 && (
                  <option disabled value="">
                    ────────── Or Link to an Upcoming Task / Booking ──────────
                  </option>
                )}
                {filteredTasks.map(({ boardId, boardTitle, columnId, task }) => (
                  <option
                    key={`${boardId}:::${columnId}:::${task.id}`}
                    value={`${boardId}:::${columnId}:::${task.id}`}
                  >
                    {task.title} &bull; [{boardTitle}] {task.customerName ? `(${task.customerName})` : ""}
                  </option>
                ))}
              </select>

              {/* Status explanation pill */}
              {selectedTaskKey === "general" ? (
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-2 text-[11px] text-stone-600 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-600 shrink-0" />
                  <span>General operational reminder &bull; Not tied to any staff member &bull; Visible team-wide on Operations Calendar</span>
                </div>
              ) : currentSelectedTask ? (
                <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 p-2 text-[11px] text-amber-900 flex items-center justify-between">
                  <div className="truncate">
                    <span className="font-bold">{currentSelectedTask.task.title}</span>
                    <span className="text-amber-700/80 ml-1.5 font-medium">
                      Board: {currentSelectedTask.boardTitle}
                    </span>
                  </div>
                  {(currentSelectedTask.task.dueDate || currentSelectedTask.task.travelStartDate) && (
                    <span className="shrink-0 font-semibold text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      Due/Trip: {formatDate(currentSelectedTask.task.travelStartDate || currentSelectedTask.task.dueDate)}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* 2. Reminder Date & Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-stone-800">
                2. Reminder Schedule Date & Time <span className="text-red-500">*</span>
              </label>
              {/* Quick Date Presets */}
              <div className="flex items-center gap-1 text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(0)}
                  className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(1)}
                  className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(7)}
                  className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                >
                  +7 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(30)}
                  className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                >
                  Next Month
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="relative">
                  <CalendarIcon className="size-3.5 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-8.5 pr-2.5 py-2 rounded-xl border border-stone-200 text-xs text-stone-800 font-medium focus:border-amber-500 focus:outline-none shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <Clock className="size-3.5 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full pl-8.5 pr-2.5 py-2 rounded-xl border border-stone-200 text-xs text-stone-800 font-medium focus:border-amber-500 focus:outline-none shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Text-Based Reminder Note */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-stone-800">
                3. Reminder Note / Action Instructions <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-stone-400">Clear operational instruction</span>
            </div>

            <textarea
              rows={3}
              required
              placeholder="e.g. Call client to collect remaining payment 35k before dispatching flight tickets..."
              value={reminderText}
              onChange={(e) => {
                setReminderText(e.target.value)
                setError("")
              }}
              className="w-full rounded-xl border border-stone-200 p-3 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none shadow-2xs"
            />
          </div>

          {/* 4. Priority */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5">
              4. Alert Priority
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["low", "medium", "high", "urgent"] as Priority[]).map((p) => {
                const isSelected = priority === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`rounded-xl border py-2 px-2 text-center text-xs font-bold capitalize transition cursor-pointer ${
                      isSelected
                        ? p === "urgent"
                          ? "bg-red-500 text-white border-red-600 shadow-2xs"
                          : p === "high"
                          ? "bg-orange-500 text-white border-orange-600 shadow-2xs"
                          : p === "medium"
                          ? "bg-amber-600 text-white border-amber-700 shadow-2xs"
                          : "bg-stone-600 text-white border-stone-700 shadow-2xs"
                        : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-stone-200 pt-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              <Check className="size-3.5" />
              <span>Schedule Reminder</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
