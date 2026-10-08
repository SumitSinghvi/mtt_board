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
} from "lucide-react"
import type { Task, Board, Priority } from "../schemas/board"
import { getTaskAssignees } from "../schemas/board"

export interface FlattenedTask {
  boardId: string
  boardTitle: string
  columnId: string
  columnTitle: string
  task: Task
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
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedBoardId, setSelectedBoardId] = useState<string>("all")

  const mStr = String(today.getMonth() + 1).padStart(2, "0")
  const dStr = String(today.getDate()).padStart(2, "0")
  const todayStr = `${today.getFullYear()}-${mStr}-${dStr}`

  // Filter tasks by board if selected
  const filteredTasks = useMemo(() => {
    if (selectedBoardId === "all") return tasks
    return tasks.filter((t) => t.boardId === selectedBoardId)
  }, [tasks, selectedBoardId])

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
            <div className="p-1.5 rounded-lg bg-amber-600 text-white">
              <CalendarIcon className="size-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-stone-500">
                Operations & Tour Schedule
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

        {/* Right: Board Filter + Month Navigators */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
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

          return (
            <div
              key={cell.dateStr}
              className={`flex flex-col bg-white p-1.5 min-h-[90px] sm:min-h-[110px] overflow-hidden transition-colors ${
                !cell.isCurrentMonth ? "bg-stone-50/50 text-stone-400" : "text-stone-900"
              } ${cell.isToday ? "bg-amber-50/30 ring-2 ring-inset ring-amber-400" : ""}`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-1">
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

                {itemsForDay.length > 0 && (
                  <span className="text-[10px] font-bold text-stone-400">
                    {itemsForDay.length} {itemsForDay.length === 1 ? "card" : "cards"}
                  </span>
                )}
              </div>

              {/* Day Tasks List */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                {itemsForDay.map(({ boardId, boardTitle, columnId, task }) => {
                  const isTripStart = task.travelStartDate === cell.dateStr
                  const isDueDate = task.dueDate === cell.dateStr
                  const assignees = getTaskAssignees(task)

                  return (
                    <div
                      key={`${task.id}-${cell.dateStr}`}
                      onClick={() => onSelectTask(boardId, columnId, task.id)}
                      title={`${task.title} • ${boardTitle}`}
                      className="group flex flex-col p-1.5 rounded-lg bg-stone-50 hover:bg-amber-50 border border-stone-200/90 hover:border-amber-300 cursor-pointer shadow-2xs transition text-[11px] leading-tight"
                    >
                      {/* Priority Dot + Title */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`size-2 rounded-full ring-2 shrink-0 ${
                            priorityDotColors[task.priority]
                          }`}
                        />
                        <span className="font-semibold text-stone-900 truncate group-hover:text-amber-900">
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

                        {isDueDate && !isTripStart && (
                          <span className="inline-flex items-center gap-0.5 text-red-600 font-semibold shrink-0">
                            <Clock className="size-2.5" />
                            <span>Due</span>
                          </span>
                        )}
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
    </div>
  )
}
