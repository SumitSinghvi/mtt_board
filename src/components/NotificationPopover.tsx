import { useState, useMemo } from "react"
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Trash2,
  Volume2,
  Calendar,
  AtSign,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useAuthStore } from "../store/authStore"
import { formatDate } from "../lib/date"
import type { TaskReminder, Task } from "../schemas/board"
import { isDoneColumn } from "../lib/utils"
import { toast } from "sonner"

interface ReminderItemWithContext {
  boardId: string
  boardTitle: string
  columnId: string
  columnTitle: string
  task: Task
  reminder: TaskReminder
}

interface MentionItemWithContext {
  id: string
  boardId: string
  boardTitle: string
  columnId: string
  columnTitle: string
  task: Task
  author: string
  content: string
  createdAt: string
  isRead: boolean
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
  const { profile, user } = useAuthStore()

  const [activeTab, setActiveTab] = useState<"urgent" | "mentions" | "upcoming" | "completed">("urgent")
  const [readMentionIds, setReadMentionIds] = useState<Record<string, boolean>>({})

  const todayStr = new Date().toISOString().split("T")[0]

  // Identifiers for current user
  const userIdentifiers = useMemo(() => {
    return [
      profile?.name?.toLowerCase().trim(),
      user?.email?.toLowerCase().trim(),
      user?.id,
      profile?.id,
    ].filter(Boolean) as string[]
  }, [profile, user])

  // Flatten all task reminders and general reminders
  const allReminders = useMemo(() => {
    const list: ReminderItemWithContext[] = []

    // 1. Task-linked reminders
    for (const b of boards) {
      if (b.isArchived) continue
      for (const col of b.columns) {
        if (isDoneColumn(col.title)) continue
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

  // Calculate all mentions targeting current user
  const allMentions = useMemo(() => {
    if (userIdentifiers.length === 0) return []
    const list: MentionItemWithContext[] = []

    for (const b of boards) {
      if (b.isArchived) continue
      for (const col of b.columns) {
        for (const task of col.tasks) {
          const allComments = [
            ...(task.activities || []).filter((a) => a.type === "comment"),
            ...(task.checklist || []).flatMap((c) =>
              (c.activities || []).filter((a) => a.type === "comment")
            ),
          ]

          for (const c of allComments) {
            if (c.isDeleted) continue

            if (
              c.author &&
              profile?.name &&
              c.author.toLowerCase() === profile.name.toLowerCase()
            ) {
              continue // self mention
            }
            const contentLower = c.content.toLowerCase()
            const isAllMention = /\b@all\b/i.test(contentLower)
            const isAdminMention =
              profile?.role === "admin" &&
              (/\b@admin\b/i.test(contentLower) || /\b@admins\b/i.test(contentLower))
            const isDirectMention = userIdentifiers.some((id) =>
              contentLower.includes(`@${id.toLowerCase()}`)
            )
            if (!isAllMention && !isAdminMention && !isDirectMention) continue

            const isRead =
              readMentionIds[c.id] || !!localStorage.getItem(`mtt_seen_mention_${c.id}`)

            list.push({
              id: c.id,
              boardId: b.id,
              boardTitle: b.title,
              columnId: col.id,
              columnTitle: col.title,
              task,
              author: c.author,
              content: c.content,
              createdAt: c.createdAt,
              isRead,
            })
          }

          // Also check notes & details
          const noteItems = [
            { source: "Notes", text: task.description || "", id: `note-${task.id}`, time: task.createdAt },
            ...(task.checklist || []).map((ck) => ({
              source: `Sub-card "${ck.text}"`,
              text: `${ck.description || ""} ${ck.notes || ""}`.trim(),
              id: `note-sub-${ck.id}`,
              time: task.createdAt,
            })),
          ]

          for (const n of noteItems) {
            if (!n.text) continue
            const contentLower = n.text.toLowerCase()
            const isAllMention = /\b@all\b/i.test(contentLower)
            const isAdminMention =
              profile?.role === "admin" &&
              (/\b@admin\b/i.test(contentLower) || /\b@admins\b/i.test(contentLower))
            const isDirectMention = userIdentifiers.some((id) =>
              contentLower.includes(`@${id.toLowerCase()}`)
            )
            if (!isAllMention && !isAdminMention && !isDirectMention) continue

            const isRead =
              readMentionIds[n.id] || !!localStorage.getItem(`mtt_seen_mention_${n.id}`)

            list.push({
              id: n.id,
              boardId: b.id,
              boardTitle: b.title,
              columnId: col.id,
              columnTitle: col.title,
              task,
              author: task.leader || n.source,
              content: n.text,
              createdAt: n.time || new Date().toISOString(),
              isRead,
            })
          }
        }
      }
    }

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [boards, userIdentifiers, profile?.name, profile?.role, readMentionIds])

  const unreadMentions = useMemo(
    () => allMentions.filter((m) => !m.isRead),
    [allMentions]
  )

  // Filter reminders into categories
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

  const handleOpenMention = (mention: MentionItemWithContext) => {
    try {
      localStorage.setItem(`mtt_seen_mention_${mention.id}`, "true")
      setReadMentionIds((prev) => ({ ...prev, [mention.id]: true }))
    } catch {
      // ignore
    }
    onClose()
    onSelectTask(mention.boardId, mention.columnId, mention.task.id)
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
      <div className="absolute right-0 top-12 z-50 w-[94vw] sm:w-[450px] rounded-2xl border border-stone-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[580px] animate-in fade-in slide-in-from-top-2 duration-150">
        {/* Header */}
        <div className="border-b border-stone-200 px-4 py-3 bg-stone-50/90 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-600 text-white shadow-2xs">
              <Bell className="size-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-stone-900 leading-tight">
                Notifications & Mentions
              </h3>
              <p className="text-[10px] text-stone-500">
                Reminders, due alerts, and @mentions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playReminderChime()
              toast.info("Alert chime tested")
            }}
            title="Test alert chime"
            className="rounded-lg p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            <Volume2 className="size-4" />
          </button>
        </div>

        {/* 4-Tab Switcher */}
        <div className="grid grid-cols-4 border-b border-stone-200 bg-stone-100/70 p-1 text-center text-xs font-semibold text-stone-600">
          <button
            type="button"
            onClick={() => setActiveTab("urgent")}
            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === "urgent"
                ? "bg-white text-stone-900 shadow-2xs font-bold"
                : "hover:text-stone-900"
            }`}
          >
            <span>Due</span>
            {urgentReminders.length > 0 && (
              <span className="size-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                {urgentReminders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mentions")}
            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === "mentions"
                ? "bg-white text-stone-900 shadow-2xs font-bold"
                : "hover:text-stone-900"
            }`}
          >
            <span>@Mentions</span>
            {unreadMentions.length > 0 && (
              <span className="size-4 rounded-full bg-amber-600 text-white text-[9px] flex items-center justify-center font-bold">
                {unreadMentions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === "upcoming"
                ? "bg-white text-stone-900 shadow-2xs font-bold"
                : "hover:text-stone-900"
            }`}
          >
            <span>Upcoming</span>
            {upcomingReminders.length > 0 && (
              <span className="text-[10px] text-stone-400">
                ({upcomingReminders.length})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-2 space-y-1">
          {activeTab === "mentions" ? (
            /* Mentions List */
            allMentions.length === 0 ? (
              <div className="py-12 text-center text-stone-400 space-y-1.5">
                <AtSign className="size-8 mx-auto text-stone-300 stroke-[1.5]" />
                <p className="text-xs font-semibold text-stone-600">No mentions yet</p>
                <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                  When team members tag you with @{profile?.name || "your name"} in comments, alerts will appear here.
                </p>
              </div>
            ) : (
              allMentions.map((mention) => {
                return (
                  <div
                    key={mention.id}
                    onClick={() => handleOpenMention(mention)}
                    className={`p-2.5 rounded-xl transition flex items-start gap-2.5 cursor-pointer border ${
                      !mention.isRead
                        ? "bg-amber-50/70 border-amber-200/90 shadow-2xs"
                        : "bg-white border-stone-200/70 hover:bg-stone-50/80"
                    }`}
                  >
                    <div className="size-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      <AtSign className="size-3.5 text-amber-700" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-stone-800 truncate">
                          {mention.author}{" "}
                          <span className="font-normal text-stone-500">
                            {/\b@all\b/i.test(mention.content)
                              ? "tagged @all"
                              : /\b@admins?\b/i.test(mention.content) && profile?.role === "admin"
                              ? "tagged @admin"
                              : "tagged you"}
                          </span>
                        </span>
                        <span className="text-[10px] text-stone-400 shrink-0">
                          {formatTime(mention.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-stone-700 line-clamp-2 mt-0.5 font-medium leading-relaxed bg-white/70 rounded p-1 border border-stone-100">
                        {mention.content}
                      </p>

                      <div className="mt-1 flex items-center justify-between text-[10px] text-stone-500">
                        <span className="font-semibold text-amber-800 truncate">
                          {mention.task.title}
                        </span>
                        <span className="text-stone-400 truncate">{mention.boardTitle}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )
          ) : (
            /* Reminders List */
            displayedList.length === 0 ? (
              <div className="py-12 text-center text-stone-400 space-y-1">
                <CheckCircle2 className="size-8 mx-auto text-emerald-500 stroke-[1.5]" />
                <p className="text-xs font-semibold text-stone-600">All clear!</p>
                <p className="text-[11px] text-stone-400">
                  {activeTab === "urgent"
                    ? "No overdue or today's reminders pending."
                    : activeTab === "upcoming"
                    ? "No upcoming scheduled reminders."
                    : "No completed reminders."}
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

                        {reminder.createdBy && (
                          <span className="text-[9px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded border border-stone-200">
                            by {reminder.createdBy}
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
            )
          )}
        </div>
      </div>
    </>
  )
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(isoString)
  } catch {
    return "Recently"
  }
}
