import { useState, useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Car,
  MapPin,
  Calendar as CalendarIcon,
} from "lucide-react"
import type { Board, Priority } from "../schemas/board"

interface BoardCalendarProps {
  board: Board
  onOpenTask: (columnId: string, taskId: string) => void
  onQuickAddForDate?: (dateStr: string) => void
}

const priorityDotColors: Record<Priority, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-stone-400",
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

function getInitialCalendarState() {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth()
  const mStr = String(m + 1).padStart(2, "0")
  const dStr = String(d.getDate()).padStart(2, "0")
  return {
    year: y,
    month: m,
    todayStr: `${y}-${mStr}-${dStr}`,
  }
}

export function BoardCalendar({ board, onOpenTask, onQuickAddForDate }: BoardCalendarProps) {
  const [initCalendar] = useState(getInitialCalendarState)
  const [currentYear, setCurrentYear] = useState(initCalendar.year)
  const [currentMonth, setCurrentMonth] = useState(initCalendar.month)
  const todayStr = initCalendar.todayStr

  // Flatten all cards with their column info
  const allCards = useMemo(() => {
    return board.columns.flatMap((col) =>
      col.tasks.map((task) => ({ ...task, columnId: col.id, columnTitle: col.title }))
    )
  }, [board.columns])

  // Map cards to dates: supports travelStartDate, travelEndDate, or dueDate
  const cardsByDate = useMemo(() => {
    const map = new Map<string, typeof allCards>()

    const addCardToDate = (dateStr: string, card: (typeof allCards)[0]) => {
      const existing = map.get(dateStr) || []
      // Avoid duplicate if same card triggers multiple times on same day
      if (!existing.some((c) => c.id === card.id)) {
        existing.push(card)
        map.set(dateStr, existing)
      }
    }

    allCards.forEach((card) => {
      // 1. If has travelStartDate
      if (card.travelStartDate) {
        addCardToDate(card.travelStartDate, card)
      }
      // 2. If has travelEndDate and different from start
      if (card.travelEndDate && card.travelEndDate !== card.travelStartDate) {
        addCardToDate(card.travelEndDate, card)
      }
      // 3. If has dueDate (and no trip dates, or in addition)
      if (card.dueDate && card.dueDate !== card.travelStartDate && card.dueDate !== card.travelEndDate) {
        addCardToDate(card.dueDate, card)
      }
    })

    return map
  }, [allCards])

  // Month navigation
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
    setCurrentYear(initCalendar.year)
    setCurrentMonth(initCalendar.month)
  }

  // Days matrix generation for current month
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
      const mStr = String(prevMonth + 1).padStart(2, "0")
      const dStr = String(dayNum).padStart(2, "0")
      const dateStr = `${prevYear}-${mStr}-${dStr}`
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      })
    }

    // Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const mStr = String(currentMonth + 1).padStart(2, "0")
      const dStr = String(day).padStart(2, "0")
      const dateStr = `${currentYear}-${mStr}-${dStr}`
      cells.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      })
    }

    // Next month filler days to complete 35 or 42 grid slots
    const totalSlots = cells.length > 35 ? 42 : 35
    const remaining = totalSlots - cells.length
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
      const mStr = String(nextMonth + 1).padStart(2, "0")
      const dStr = String(day).padStart(2, "0")
      const dateStr = `${nextYear}-${mStr}-${dStr}`
      cells.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      })
    }

    return cells
  }, [currentYear, currentMonth, todayStr])

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-stone-100/70 p-6">
      {/* Calendar Control Bar */}
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-3 rounded-t-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-5 text-amber-700" />
            <h2 className="text-base font-bold text-stone-900">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleGoToday}
            className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100 transition"
            title="Previous Month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100 transition"
            title="Next Month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Week Day Header */}
      <div className="grid grid-cols-7 border-x border-stone-200 bg-stone-50/90 text-center text-[11px] font-bold text-stone-600 py-2 uppercase tracking-wider">
        {DAY_NAMES.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 border border-stone-200 bg-stone-200 gap-px rounded-b-xl overflow-hidden shadow-2xs">
        {calendarDays.map((cell) => {
          const cardsForThisDay = cardsByDate.get(cell.dateStr) || []

          return (
            <div
              key={cell.dateStr}
              className={`flex flex-col bg-white p-1.5 min-h-0 overflow-hidden transition-colors ${
                !cell.isCurrentMonth ? "bg-stone-50/60 text-stone-400" : "text-stone-900"
              } ${cell.isToday ? "bg-amber-50/30 ring-1 ring-inset ring-amber-400/50" : ""}`}
            >
              {/* Day Number Row */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex items-center justify-center text-xs font-semibold rounded-full size-6 ${
                    cell.isToday
                      ? "bg-amber-600 text-white font-bold"
                      : cell.isCurrentMonth
                      ? "text-stone-800"
                      : "text-stone-400"
                  }`}
                >
                  {cell.dayNum}
                </span>

                {onQuickAddForDate && cell.isCurrentMonth && (
                  <button
                    type="button"
                    onClick={() => onQuickAddForDate(cell.dateStr)}
                    title={`Add card for ${cell.dateStr}`}
                    className="opacity-0 hover:opacity-100 text-stone-400 hover:text-amber-700 p-0.5 rounded transition"
                  >
                    <Plus className="size-3" />
                  </button>
                )}
              </div>

              {/* Day Tasks List */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                {cardsForThisDay.map((card) => {
                  const isTripStart = card.travelStartDate === cell.dateStr
                  const isDueDate = card.dueDate === cell.dateStr

                  return (
                    <div
                      key={`${card.id}-${cell.dateStr}`}
                      onClick={() => onOpenTask(card.columnId, card.id)}
                      title={`${card.title} • ${card.columnTitle}`}
                      className="group flex flex-col p-1 rounded bg-stone-50 hover:bg-amber-50/80 border border-stone-200/80 hover:border-amber-300 cursor-pointer shadow-2xs transition text-[11px] leading-tight"
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span
                          className={`size-1.5 rounded-full shrink-0 ${
                            priorityDotColors[card.priority]
                          }`}
                        />
                        <span className="font-semibold text-stone-900 truncate group-hover:text-amber-900">
                          {card.title}
                        </span>
                      </div>

                      {/* Sub-label: Trip or Due badge */}
                      <div className="flex items-center gap-1 text-[9px] text-stone-500 mt-0.5 truncate">
                        {isTripStart && (
                          <span className="flex items-center gap-0.5 text-amber-800 font-medium truncate">
                            {card.destination ? (
                              <>
                                <MapPin className="size-2.5 shrink-0" />
                                <span className="truncate">{card.destination}</span>
                              </>
                            ) : (
                              "Trip Starts"
                            )}
                          </span>
                        )}

                        {isDueDate && !isTripStart && (
                          <span className="flex items-center gap-0.5 text-red-600 font-medium">
                            <Clock className="size-2.5 shrink-0" />
                            <span>Due</span>
                          </span>
                        )}

                        {card.vehicleType && isTripStart && (
                          <span className="flex items-center gap-0.5 text-stone-400 shrink-0">
                            <Car className="size-2.5" />
                            <span>{card.vehicleType}</span>
                          </span>
                        )}
                      </div>
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
