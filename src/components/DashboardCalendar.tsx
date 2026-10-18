import { useState, useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Crown,
  UserCheck,
  Filter,
  Bell,
  Plus,
  Check,
  X,
  AlertTriangle,
} from "lucide-react"
import type { Task, Board, Priority, TaskReminder } from "../schemas/board"
import { getTaskAssignees } from "../schemas/board"
import { ScheduleReminderModal } from "./ScheduleReminderModal"
import { ViewReminderModal } from "./ViewReminderModal"
import { useBoardStore } from "../store/boardStore"
import { toast } from "sonner"
import { isDoneColumn } from "../lib/utils"

export interface FlattenedTask {
  boardId: string
  boardTitle: string
  columnId: string
  columnTitle: string
  task: Task
}

export interface FlattenedReminder {
  boardId: string
  boardTitle: string
  columnId: string
  columnTitle: string
  task: Task
  reminder: TaskReminder
}

interface DashboardCalendarProps {
  tasks: FlattenedTask[]
  boards: Board[]
  onSelectTask: (boardId: string, columnId: string, taskId: string) => void
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const priorityDotColors: Record<Priority, string> = {
  urgent: "bg-red-500 ring-red-300",
  high: "bg-orange-500 ring-orange-300",
  medium: "bg-amber-500 ring-amber-300",
  low: "bg-stone-400 ring-stone-200",
}

export function DashboardCalendar({
  tasks,
  boards,
  onSelectTask,
}: DashboardCalendarProps) {
  const {
    addReminderToTask,
    updateTaskReminder,
    toggleTaskReminder,
    deleteTaskReminder,
    generalReminders,
    addGeneralReminder,
    updateGeneralReminder,
    toggleGeneralReminder,
    deleteGeneralReminder,
  } = useBoardStore()

  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedBoardId, setSelectedBoardId] = useState<string>("all")
  const [onlyShowReminders, setOnlyShowReminders] = useState<boolean>(false)

  // Schedule Reminder Modal state
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false)
  const [reminderTargetDate, setReminderTargetDate] = useState<string>("")
  const [activeViewReminder, setActiveViewReminder] = useState<FlattenedReminder | null>(null)

  const mStr = String(today.getMonth() + 1).padStart(2, "0")
  const dStr = String(today.getDate()).padStart(2, "0")
  const todayStr = `${today.getFullYear()}-${mStr}-${dStr}`

  // Filter tasks by board if selected
  const filteredTasks = useMemo(() => {
    if (selectedBoardId === "all") return tasks
    return tasks.filter((t) => t.boardId === selectedBoardId)
  }, [tasks, selectedBoardId])

  // Map reminders to dates (both task reminders and general operational reminders)
  const remindersByDate = useMemo(() => {
    const map = new Map<string, FlattenedReminder[]>()

    // 1. Task-linked reminders
    filteredTasks.forEach((item) => {
      const { task, boardId, boardTitle, columnId, columnTitle } = item
      if (task.reminders && task.reminders.length > 0) {
        task.reminders.forEach((reminder) => {
          const existing = map.get(reminder.dueDate) || []
          existing.push({
            boardId,
            boardTitle,
            columnId,
            columnTitle,
            task,
            reminder,
          })
          map.set(reminder.dueDate, existing)
        })
      }
    })

    // 2. General operational reminders (not associated with staff / specific task)
    generalReminders.forEach((reminder) => {
      const existing = map.get(reminder.dueDate) || []
      existing.push({
        boardId: "general",
        boardTitle: "General Operations",
        columnId: "general",
        columnTitle: "Operations",
        task: {
          id: `gen-${reminder.id}`,
          title: reminder.text,
          priority: reminder.priority || "medium",
          createdAt: reminder.createdAt,
        } as Task,
        reminder,
      })
      map.set(reminder.dueDate, existing)
    })

    return map
  }, [filteredTasks, generalReminders])

  // Overdue and today reminders for alert banner
  const alertReminders = useMemo(() => {
    const list: FlattenedReminder[] = []
    filteredTasks.forEach((item) => {
      if (isDoneColumn(item.columnTitle)) return
      if (item.task.reminders) {
        item.task.reminders.forEach((rem) => {
          if (!rem.completed && rem.dueDate <= todayStr) {
            list.push({ ...item, reminder: rem })
          }
        })
      }
    })
    generalReminders.forEach((rem) => {
      if (!rem.completed && rem.dueDate <= todayStr) {
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
    })
    return list
  }, [filteredTasks, generalReminders, todayStr])

  // Map tasks to dates: supports travelStartDate, travelEndDate, and dueDate
  const tasksByDate = useMemo(() => {
    const map = new Map<string, FlattenedTask[]>()

    const addTaskToDate = (dateStr: string, item: FlattenedTask) => {
      const existing = map.get(dateStr) || []
      if (!existing.some((x) => x.task.id === item.task.id)) {
        existing.push(item)
        map.set(dateStr, existing)
      }
    }

    filteredTasks.forEach((item) => {
      const { task } = item
      if (task.travelStartDate) {
        addTaskToDate(task.travelStartDate, item)
      }
      if (task.travelEndDate && task.travelEndDate !== task.travelStartDate) {
        addTaskToDate(task.travelEndDate, item)
      }
      if (
        task.dueDate &&
        task.dueDate !== task.travelStartDate &&
        task.dueDate !== task.travelEndDate
      ) {
        addTaskToDate(task.dueDate, item)
      }
    })

    return map
  }, [filteredTasks])

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
  }

  const handleOpenScheduleReminder = (dateStr?: string) => {
    setReminderTargetDate(dateStr || todayStr)
    setIsReminderModalOpen(true)
  }

  // Days matrix for grid
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

    interface DayCell {
      dateStr: string
      dayNum: number
      isCurrentMonth: boolean
      isToday: boolean
    }

    const cells: DayCell[] = []

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const mPad = String(prevMonth + 1).padStart(2, "0")
      const dPad = String(dayNum).padStart(2, "0")
      cells.push({
        dateStr: `${prevYear}-${mPad}-${dPad}`,
        dayNum,
        isCurrentMonth: false,
        isToday: false,
      })
    }

    // Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const mPad = String(currentMonth + 1).padStart(2, "0")
      const dPad = String(day).padStart(2, "0")
      const dateStr = `${currentYear}-${mPad}-${dPad}`
      cells.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      })
    }

    // Next month filler days to complete 35 or 42 slots
    const totalSlots = cells.length > 35 ? 42 : 35
    const remaining = totalSlots - cells.length
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
      const mPad = String(nextMonth + 1).padStart(2, "0")
      const dPad = String(day).padStart(2, "0")
      cells.push({
        dateStr: `${nextYear}-${mPad}-${dPad}`,
        dayNum: day,
        isCurrentMonth: false,
        isToday: false,
      })
    }

    return cells
  }, [currentYear, currentMonth, todayStr])

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden flex flex-col">
      {/* Calendar Header Bar */}
      <div className="border-b border-stone-200 px-4 sm:px-6 py-3.5 bg-stone-50/80 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Title & Month */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-600 text-white shadow-2xs">
              <CalendarIcon className="size-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-stone-500">
                Operations Calendar &bull; Tasks, Trips &amp; Reminders
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoToday}
            className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 hover:border-amber-300 transition cursor-pointer shadow-2xs"
          >
            Today
          </button>
        </div>

        {/* Right: Actions + Board Filter + Month Navigators */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Quick Schedule Reminder Button */}
          <button
            type="button"
            onClick={() => handleOpenScheduleReminder()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <Bell className="size-3.5" />
            <span>+ Schedule Reminder</span>
          </button>

          {/* Toggle Reminders Filter */}
          <button
            type="button"
            onClick={() => setOnlyShowReminders((v) => !v)}
            title={onlyShowReminders ? "Show all cards and reminders" : "Filter calendar to show days with reminders"}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition cursor-pointer shadow-2xs flex items-center gap-1 ${
              onlyShowReminders
                ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
            }`}
          >
            <Bell className="size-3 text-amber-600" />
            <span>Reminders {onlyShowReminders ? "Only" : ""}</span>
          </button>

          {/* Board Selector Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="size-3.5 text-stone-400" />
            <select
              value={selectedBoardId}
              onChange={(e) => setSelectedBoardId(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-800 focus:border-amber-500 focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="all">All Workflows ({boards.length})</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>

          {/* Month Arrows */}
          <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200/80">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="rounded-md p-1.5 text-stone-600 hover:bg-white hover:text-stone-900 transition cursor-pointer shadow-2xs"
              title="Previous Month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded-md p-1.5 text-stone-600 hover:bg-white hover:text-stone-900 transition cursor-pointer shadow-2xs"
              title="Next Month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Operations Reminder Alert Banner */}
      {alertReminders.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <span className="flex size-2 rounded-full bg-amber-600 animate-ping" />
            <AlertTriangle className="size-4 text-amber-700 shrink-0" />
            <span>
              <strong>{alertReminders.length} reminder(s)</strong> scheduled for today or overdue requiring action!
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGoToday}
              className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
            >
              Jump to Today &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Weekdays Row */}
      <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center text-[11px] font-bold text-stone-600 py-2 uppercase tracking-wider">
        {DAY_NAMES.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 border-stone-200 bg-stone-200 gap-px">
        {calendarDays.map((cell) => {
          const itemsForDay = tasksByDate.get(cell.dateStr) || []
          const remindersForDay = remindersByDate.get(cell.dateStr) || []
          const hasReminders = remindersForDay.length > 0

          // If onlyShowReminders is active, dim cells that have no reminders
          const isDimmed = onlyShowReminders && !hasReminders

          return (
            <div
              key={cell.dateStr}
              className={`group/cell relative flex flex-col bg-white p-1.5 min-h-[95px] sm:min-h-[115px] overflow-hidden transition-colors ${
                !cell.isCurrentMonth
                  ? "bg-stone-50/50 text-stone-400"
                  : isDimmed
                  ? "opacity-35 bg-stone-50/40"
                  : "text-stone-900"
              } ${cell.isToday ? "bg-amber-50/30 ring-2 ring-inset ring-amber-400" : ""}`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-semibold rounded-full size-6 ${
                      cell.isToday
                        ? "bg-amber-600 text-white font-bold shadow-2xs"
                        : cell.isCurrentMonth
                        ? "text-stone-800"
                        : "text-stone-400"
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {/* Reminder Badge Indicator */}
                  {hasReminders && (
                    <span
                      title={`${remindersForDay.length} scheduled reminder(s)`}
                      className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 px-1.5 py-0.2 text-[9px] font-extrabold"
                    >
                      <Bell className="size-2.5 text-amber-700" />
                      <span>{remindersForDay.length}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* Quick Add Reminder on hover */}
                  {cell.isCurrentMonth && (
                    <button
                      type="button"
                      onClick={() => handleOpenScheduleReminder(cell.dateStr)}
                      title={`Schedule reminder for ${cell.dateStr}`}
                      className="opacity-0 group-hover/cell:opacity-100 rounded p-0.5 text-stone-400 hover:text-amber-800 hover:bg-amber-50 transition cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  )}

                  {!onlyShowReminders && itemsForDay.length > 0 && (
                    <span className="text-[10px] font-bold text-stone-400">
                      {itemsForDay.length} {itemsForDay.length === 1 ? "card" : "cards"}
                    </span>
                  )}
                </div>
              </div>

              {/* Day List: Reminders First, Then Tasks */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                {/* 1. Scheduled Reminders for this date */}
                {remindersForDay.map(({ boardId, boardTitle, columnId, task, reminder }) => {
                  const isOverdue = reminder.dueDate < todayStr && !reminder.completed
                  const isDueToday = reminder.dueDate === todayStr && !reminder.completed

                  return (
                    <div
                      key={`rem-${reminder.id}`}
                      onClick={() =>
                        setActiveViewReminder({
                          boardId,
                          boardTitle,
                          columnId,
                          columnTitle: "",
                          task,
                          reminder,
                        })
                      }
                      className={`group/rem relative flex flex-col p-1.5 rounded-lg border text-[11px] leading-tight transition cursor-pointer hover:shadow-xs ${
                        reminder.completed
                          ? "bg-stone-50/90 border-stone-200 text-stone-400 opacity-60 line-through"
                          : isOverdue
                          ? "bg-red-50/95 border-red-300 text-red-950 shadow-2xs hover:border-red-400"
                          : isDueToday
                          ? "bg-amber-50/95 border-amber-300 text-amber-950 shadow-2xs ring-1 ring-amber-300/50 hover:border-amber-400"
                          : "bg-amber-50/80 border-amber-200 text-amber-900 shadow-2xs hover:border-amber-300"
                      }`}
                    >
                      {/* Reminder Note + Toggle Complete */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-start gap-1.5 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (boardId === "general" || reminder.id.startsWith("rem-gen")) {
                                toggleGeneralReminder(reminder.id)
                              } else {
                                toggleTaskReminder(boardId, columnId, task.id, reminder.id)
                              }
                            }}
                            title={reminder.completed ? "Mark incomplete" : "Mark completed"}
                            className={`mt-0.5 size-3.5 rounded flex items-center justify-center shrink-0 transition cursor-pointer ${
                              reminder.completed
                                ? "bg-emerald-600 text-white"
                                : "border border-amber-400 hover:bg-amber-200 bg-white"
                            }`}
                          >
                            {reminder.completed && <Check className="size-2.5 text-white" />}
                          </button>

                          <div className="min-w-0 flex-1">
                            <span className="font-bold block truncate text-[11px]">
                              {reminder.text}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!window.confirm("Are you sure you want to delete this reminder?")) return
                            if (boardId === "general" || reminder.id.startsWith("rem-gen")) {
                              deleteGeneralReminder(reminder.id)
                            } else {
                              deleteTaskReminder(boardId, columnId, task.id, reminder.id)
                            }
                            toast.success("Reminder deleted")
                          }}
                          title="Delete reminder"
                          className="opacity-0 group-hover/rem:opacity-100 text-stone-400 hover:text-red-600 p-0.5 transition cursor-pointer shrink-0"
                        >
                          <X className="size-3" />
                        </button>
                      </div>

                      {/* Linked Task & Board or General Indicator */}
                      <div
                        onClick={(e) => {
                          if (boardId !== "general" && !task.id.startsWith("gen-")) {
                            e.stopPropagation()
                            onSelectTask(boardId, columnId, task.id)
                          }
                        }}
                        title={boardId === "general" ? "General Operational Reminder (No staff / task)" : `Linked Task: ${task.title} • ${boardTitle}`}
                        className={`mt-1 flex items-center justify-between text-[9px] font-medium truncate ${
                          boardId === "general" ? "text-stone-400" : "text-stone-500 hover:text-amber-800 cursor-pointer"
                        }`}
                      >
                        <span className="truncate max-w-[110px] font-semibold">
                          {boardId === "general" ? "📌 General" : `• ${task.title}`}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          {reminder.createdBy && (
                            <span className="text-[9px] text-stone-400 font-medium">
                              by {reminder.createdBy}
                            </span>
                          )}
                          {reminder.dueTime && (
                            <span className="text-stone-400 font-normal">
                              {reminder.dueTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* 2. Tasks Occurring on this date (unless filtered to reminders only) */}
                {!onlyShowReminders &&
                  itemsForDay.map(({ boardId, boardTitle, columnId, columnTitle, task }) => {
                    const isTripStart = task.travelStartDate === cell.dateStr
                    const isDueDate = task.dueDate === cell.dateStr
                    const isDone = isDoneColumn(columnTitle)
                    const assignees = getTaskAssignees(task)

                    return (
                      <div
                        key={`${task.id}-${cell.dateStr}`}
                        onClick={() => onSelectTask(boardId, columnId, task.id)}
                        title={`${task.title} • ${boardTitle} (${columnTitle})`}
                        className={`group flex flex-col p-1.5 rounded-lg border cursor-pointer shadow-2xs transition text-[11px] leading-tight ${
                          isDone
                            ? "bg-stone-50/80 hover:bg-stone-100 border-stone-200 text-stone-500 opacity-75"
                            : "bg-white hover:bg-amber-50 border-stone-200/90 hover:border-amber-300 text-stone-900"
                        }`}
                      >
                        {/* Priority Dot + Title */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`size-2 rounded-full ring-2 shrink-0 ${
                              isDone ? "bg-stone-400 ring-stone-200" : priorityDotColors[task.priority]
                            }`}
                          />
                          <span className={`font-semibold truncate group-hover:text-amber-900 ${
                            isDone ? "line-through text-stone-500" : "text-stone-900"
                          }`}>
                            {task.title}
                          </span>
                        </div>

                        {/* Board Tag + Logistics Sub-label */}
                        <div className="flex items-center justify-between gap-1 text-[9px] text-stone-500 mt-1 truncate">
                          <span className="font-medium text-stone-400 truncate max-w-[80px]">
                            {boardTitle}
                          </span>

                          {isTripStart && (
                            <span className="inline-flex items-center gap-0.5 text-amber-800 font-semibold truncate shrink-0">
                              {task.destination ? (
                                <>
                                  <MapPin className="size-2.5 shrink-0" />
                                  <span className="truncate max-w-[70px]">{task.destination}</span>
                                </>
                              ) : (
                                "Depart"
                              )}
                            </span>
                          )}

                          {isDone ? (
                            <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold shrink-0 bg-emerald-50 px-1 rounded">
                              <Check className="size-2.5 text-emerald-600" />
                              <span>Done</span>
                            </span>
                          ) : isDueDate && !isTripStart ? (
                            <span className="inline-flex items-center gap-0.5 text-red-600 font-semibold shrink-0">
                              <Clock className="size-2.5" />
                              <span>Due</span>
                            </span>
                          ) : null}
                        </div>

                        {/* Lead / Assignee indicator */}
                        {(task.leader || assignees.length > 0) && (
                          <div className="mt-1 flex items-center gap-1 text-[9px] text-stone-500 truncate">
                            {task.leader ? (
                              <span className="inline-flex items-center gap-0.5 font-semibold text-amber-800 truncate">
                                <Crown className="size-2.5 text-amber-600 shrink-0" />
                                <span className="truncate max-w-[90px]">{task.leader}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-stone-500 truncate">
                                <UserCheck className="size-2.5 shrink-0" />
                                <span className="truncate max-w-[90px]">{assignees[0]}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Schedule Reminder Modal */}
      {isReminderModalOpen && (
        <ScheduleReminderModal
          isOpen={isReminderModalOpen}
          onClose={() => setIsReminderModalOpen(false)}
          defaultDate={reminderTargetDate}
          boards={boards}
          tasks={tasks}
          onSaveReminder={(boardId, columnId, taskId, reminder) => {
            if (boardId && columnId && taskId) {
              addReminderToTask(boardId, columnId, taskId, reminder)
            } else {
              addGeneralReminder(reminder)
            }
          }}
        />
      )}

      {/* View / Edit Reminder Details Modal */}
      {activeViewReminder && (
        <ViewReminderModal
          isOpen={!!activeViewReminder}
          onClose={() => setActiveViewReminder(null)}
          reminder={activeViewReminder.reminder}
          boardId={activeViewReminder.boardId}
          boardTitle={activeViewReminder.boardTitle}
          columnId={activeViewReminder.columnId}
          task={activeViewReminder.task}
          onToggleComplete={() => {
            const { boardId, columnId, task, reminder } = activeViewReminder
            if (boardId === "general" || reminder.id.startsWith("rem-gen")) {
              toggleGeneralReminder(reminder.id)
            } else {
              toggleTaskReminder(boardId, columnId, task.id, reminder.id)
            }
            setActiveViewReminder((curr) =>
              curr
                ? {
                    ...curr,
                    reminder: {
                      ...curr.reminder,
                      completed: !curr.reminder.completed,
                      completedAt: !curr.reminder.completed ? new Date().toISOString() : undefined,
                    },
                  }
                : null
            )
          }}
          onDelete={() => {
            const { boardId, columnId, task, reminder } = activeViewReminder
            if (boardId === "general" || reminder.id.startsWith("rem-gen")) {
              deleteGeneralReminder(reminder.id)
            } else {
              deleteTaskReminder(boardId, columnId, task.id, reminder.id)
            }
            setActiveViewReminder(null)
          }}
          onUpdate={(updates) => {
            const { boardId, columnId, task, reminder } = activeViewReminder
            if (boardId === "general" || reminder.id.startsWith("rem-gen")) {
              updateGeneralReminder(reminder.id, updates)
            } else {
              updateTaskReminder(boardId, columnId, task.id, reminder.id, updates)
            }
            setActiveViewReminder((curr) =>
              curr
                ? {
                    ...curr,
                    reminder: {
                      ...curr.reminder,
                      ...updates,
                    },
                  }
                : null
            )
          }}
          onOpenTask={(bId, cId, tId) => {
            setActiveViewReminder(null)
            onSelectTask(bId, cId, tId)
          }}
        />
      )}
    </div>
  )
}
