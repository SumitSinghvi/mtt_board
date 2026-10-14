import { useState, useMemo, useEffect } from "react"
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Trash2,
  Volume2,
  Calendar,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { formatDate } from "../lib/date"
import type { TaskReminder, Task } from "../schemas/board"
import { toast } from "sonner"

interface ReminderItemWithContext {
  boardId: string
  boardTitle: string
  columnId: string
  columnTitle: string
  task: Task
  reminder: TaskReminder
}

interface NotificationPopoverProps {
  isOpen: boolean
  onClose: () => void
  onSelectTask: (boardId: string, columnId: string, taskId: string) => void
}

export function playReminderChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15) // A5
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch {
    // AudioContext blocked by browser policy before user interaction
  }
}

export function NotificationPopover({
  isOpen,
  onClose,
  onSelectTask,
}: NotificationPopoverProps) {
  const {
    boards,
    toggleTaskReminder,
    deleteTaskReminder,
    generalReminders,
    toggleGeneralReminder,
    deleteGeneralReminder,
  } = useBoardStore()
  const [activeTab, setActiveTab] = useState<"urgent" | "upcoming" | "completed">("urgent")
  const [notificationsAllowed, setNotificationsAllowed] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  )

  const todayStr = new Date().toISOString().split("T")[0]

  // Flatten all task reminders and general reminders
  const allReminders = useMemo(() => {
    const list: ReminderItemWithContext[] = []

    // 1. Task-linked reminders
    for (const b of boards) {
      if (b.isArchived) continue
      for (const col of b.columns) {
        for (const task of col.tasks) {
          if (task.reminders && task.reminders.length > 0) {
            for (const rem of task.reminders) {
              list.push({
                boardId: b.id,
                boardTitle: b.title,
                columnId: col.id,
                columnTitle: col.title,
                task,
                reminder: rem,
              })
            }
          }
        }
      }
    }

    // 2. General operational reminders
    for (const rem of generalReminders) {
      list.push({
        boardId: "general",
        boardTitle: "General Operations",
        columnId: "general",
        columnTitle: "Operations",
        task: {
          id: `gen-${rem.id}`,
          title: rem.text,
          priority: rem.priority || "medium",
          createdAt: rem.createdAt,
        } as Task,
        reminder: rem,
      })
    }

    return list
  }, [boards, generalReminders])

  // Filter into categories
  const urgentReminders = useMemo(() => {
    return allReminders
      .filter((item) => !item.reminder.completed && item.reminder.dueDate <= todayStr)
      .sort((a, b) => a.reminder.dueDate.localeCompare(b.reminder.dueDate))
  }, [allReminders, todayStr])

  const upcomingReminders = useMemo(() => {
    return allReminders
      .filter((item) => !item.reminder.completed && item.reminder.dueDate > todayStr)
      .sort((a, b) => a.reminder.dueDate.localeCompare(b.reminder.dueDate))
  }, [allReminders, todayStr])

  const completedReminders = useMemo(() => {
    return allReminders
      .filter((item) => item.reminder.completed)
      .sort((a, b) => (b.reminder.completedAt || "").localeCompare(a.reminder.completedAt || ""))
  }, [allReminders])

  // Trigger browser notification if allowed and new urgent reminder found
  useEffect(() => {
    if (notificationsAllowed && urgentReminders.length > 0) {
      // Fire desktop notification for today's reminders
      const todayReminders = urgentReminders.filter((r) => r.reminder.dueDate === todayStr)
      if (todayReminders.length > 0) {
        try {
          const first = todayReminders[0]
          new Notification(`Reminder: ${first.reminder.text}`, {
            body: `Task: ${first.task.title} (${first.boardTitle})`,
            icon: "/favicon.svg",
          })
        } catch {
          // ignore notification block
        }
      }
    }
  }, [notificationsAllowed, urgentReminders.length, todayStr])

  const requestBrowserPermission = async () => {
    if (typeof Notification === "undefined") return
    try {
      const perm = await Notification.requestPermission()
      if (perm === "granted") {
        setNotificationsAllowed(true)
        playReminderChime()
        new Notification("MTT Operations Alerts Enabled", {
          body: "You will now receive desktop alerts for scheduled task reminders.",
          icon: "/favicon.svg",
        })
      }
    } catch {
      // ignore
    }
  }

  if (!isOpen) return null

  const displayedList =
    activeTab === "urgent"
      ? urgentReminders
      : activeTab === "upcoming"
      ? upcomingReminders
      : completedReminders

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popover Panel */}
      <div className="absolute right-0 top-12 z-50 w-[92vw] sm:w-[420px] rounded-2xl border border-stone-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[580px] animate-in fade-in slide-in-from-top-2 duration-150">
        {/* Header */}
        <div className="border-b border-stone-200 px-4 py-3 bg-stone-50/90 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-600 text-white shadow-2xs">
              <Bell className="size-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-stone-900 leading-tight">
                Scheduled Reminders & Alerts
              </h3>
              <p className="text-[10px] text-stone-500">
                Operations Calendar Task Notifications
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={playReminderChime}
            title="Test alert chime"
            className="rounded-lg p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            <Volume2 className="size-4" />
          </button>
        </div>

        {/* Browser Notification Banner (if not yet granted) */}
        {!notificationsAllowed && typeof Notification !== "undefined" && (
          <div className="bg-amber-50/80 border-b border-amber-200 px-3 py-2 flex items-center justify-between text-[11px] text-amber-900">
            <span className="font-medium">Get desktop alert notifications</span>
            <button
              type="button"
              onClick={requestBrowserPermission}
              className="text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded shadow-2xs transition cursor-pointer"
            >
              Enable
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 border-b border-stone-200 bg-stone-100/70 p-1 text-center text-xs font-semibold text-stone-600">
          <button
            type="button"
            onClick={() => setActiveTab("urgent")}
            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "urgent"
                ? "bg-white text-stone-900 shadow-2xs font-bold"
                : "hover:text-stone-900"
            }`}
          >
            <span>Due / Today</span>
            {urgentReminders.length > 0 && (
              <span className="size-4.5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {urgentReminders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "upcoming"
                ? "bg-white text-stone-900 shadow-2xs font-bold"
                : "hover:text-stone-900"
            }`}
          >
            <span>Upcoming</span>
            {upcomingReminders.length > 0 && (
              <span className="size-4.5 rounded-full bg-stone-300 text-stone-700 text-[10px] flex items-center justify-center font-bold">
                {upcomingReminders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "completed"
                ? "bg-white text-stone-900 shadow-2xs font-bold"
                : "hover:text-stone-900"
            }`}
          >
            <span>Done</span>
            {completedReminders.length > 0 && (
              <span className="text-[10px] text-stone-400">
                ({completedReminders.length})
              </span>
            )}
          </button>
        </div>

        {/* Reminders List */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-2 space-y-1">
          {displayedList.length === 0 ? (
            <div className="py-10 text-center text-stone-400">
              <CheckCircle2 className="size-8 mx-auto mb-2 text-stone-300" />
              <p className="text-xs font-semibold text-stone-600">
                {activeTab === "urgent"
                  ? "No due or overdue task reminders!"
                  : activeTab === "upcoming"
                  ? "No upcoming scheduled reminders."
                  : "No completed reminders."}
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Schedule reminders from the Operations Calendar.
              </p>
            </div>
          ) : (
            displayedList.map(({ boardId, boardTitle, columnId, task, reminder }) => {
              const isOverdue = reminder.dueDate < todayStr && !reminder.completed
              const isDueToday = reminder.dueDate === todayStr && !reminder.completed

              return (
                <div
                  key={reminder.id}
                  className={`p-2.5 rounded-xl transition flex items-start gap-2.5 group ${
                    isOverdue
                      ? "bg-red-50/70 border border-red-200/80"
                      : isDueToday
                      ? "bg-amber-50/80 border border-amber-200/80"
                      : reminder.completed
                      ? "bg-stone-50 opacity-60"
                      : "bg-white border border-stone-200/70 hover:border-amber-300"
                  }`}
                >
                  {/* Completion Checkbox */}
                  <button
                    type="button"
                    onClick={() => {
                      if (boardId === "general" || reminder.id.startsWith("rem-gen")) {
                        toggleGeneralReminder(reminder.id)
                      } else {
                        toggleTaskReminder(boardId, columnId, task.id, reminder.id)
                      }
                    }}
                    title={reminder.completed ? "Mark incomplete" : "Mark completed"}
                    className={`mt-0.5 size-4.5 rounded-md border flex items-center justify-center transition cursor-pointer shrink-0 ${
                      reminder.completed
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-stone-300 bg-white hover:border-amber-600"
                    }`}
                  >
                    {reminder.completed && <CheckCircle2 className="size-3.5" />}
                  </button>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-bold leading-snug ${
                        reminder.completed
                          ? "line-through text-stone-400"
                          : isOverdue
                          ? "text-red-900"
                          : "text-stone-900"
                      }`}
                    >
                      {reminder.text}
                    </p>

                    {/* Task & Board link or General label */}
                    {boardId === "general" ? (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-stone-500 font-medium">
                        <span className="font-semibold text-amber-800">📌 General Reminder</span>
                        <span className="text-stone-400">&bull;</span>
                        <span className="text-stone-400">Team-wide (No staff assigned)</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          onSelectTask(boardId, columnId, task.id)
                        }}
                        className="mt-1 flex items-center gap-1 text-[11px] text-stone-600 hover:text-amber-800 transition text-left cursor-pointer group/link truncate"
                      >
                        <span className="font-semibold truncate">{task.title}</span>
                        <span className="text-stone-400">&bull;</span>
                        <span className="text-stone-400 text-[10px] shrink-0">
                          {boardTitle}
                        </span>
                        <ChevronRight className="size-3 text-stone-400 group-hover/link:translate-x-0.5 transition shrink-0" />
                      </button>
                    )}

                    {/* Schedule Date & Time Badge */}
                    <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 font-bold text-red-700">
                          <AlertTriangle className="size-3 shrink-0" />
                          <span>Overdue ({formatDate(reminder.dueDate)})</span>
                        </span>
                      ) : isDueToday ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-800">
                          <Clock className="size-3 shrink-0" />
                          <span>Due Today {reminder.dueTime ? `at ${reminder.dueTime}` : ""}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-stone-500 font-medium">
                          <Calendar className="size-3 text-stone-400 shrink-0" />
                          <span>{formatDate(reminder.dueDate)} {reminder.dueTime ? `at ${reminder.dueTime}` : ""}</span>
                        </span>
                      )}

                      {reminder.priority && reminder.priority !== "medium" && (
                        <span
                          className={`uppercase text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            reminder.priority === "urgent"
                              ? "bg-red-100 text-red-800"
                              : reminder.priority === "high"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {reminder.priority}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm("Are you sure you want to delete this reminder?")) return
                      if (boardId === "general" || reminder.id.startsWith("rem-gen")) {
                        deleteGeneralReminder(reminder.id)
                      } else {
                        deleteTaskReminder(boardId, columnId, task.id, reminder.id)
                      }
                      toast.success("Reminder deleted")
                    }}
                    title="Delete reminder"
                    className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 transition cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
