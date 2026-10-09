import { useState, useMemo } from "react"
import {
  Car,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  Users,
  ArrowRight,
  Phone,
  UserCheck,
  ChevronRight,
  Flame,
  Layers,
  Crown,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useAuthStore } from "../store/authStore"
import { isBoardAllowed } from "../lib/permissions"
import { CardModal } from "./CardModal"
import { formatDate } from "../lib/date"
import { type Task, type Priority, getTaskAssignees } from "../schemas/board"
import { DashboardCalendar } from "./DashboardCalendar"
import { DashboardCharts } from "./DashboardCharts"

interface FlattenedTask {
  boardId: string
  boardTitle: string
  columnId: string
  columnTitle: string
  task: Task
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0]
}

function getDayDiff(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const today = new Date(getTodayStr())
  const target = new Date(dateStr)
  if (isNaN(target.getTime())) return null
  const diffTime = target.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function MainDashboard() {
  const { boards, setActiveBoardId, setCurrentView } = useBoardStore()
  const { profile } = useAuthStore()

  const [tripFilter, setTripFilter] = useState<"7days" | "today" | "all">("7days")
  const [urgentFilter, setUrgentFilter] = useState<"all" | "overdue" | "urgent">("all")
  const [dashboardTab, setDashboardTab] = useState<"overview" | "calendar">("overview")

  // Active card modal state inside dashboard
  const [activeTaskModal, setActiveTaskModal] = useState<{
    boardId: string
    columnId: string
    taskId: string
  } | null>(null)

  const todayStr = getTodayStr()

  // Filter accessible, active (non-archived) boards
  const activeBoards = useMemo(() => {
    return boards.filter((b) => !b.isArchived && isBoardAllowed(b, profile))
  }, [boards, profile])

  // Flatten all tasks from accessible active boards
  const allFlattenedTasks = useMemo(() => {
    const list: FlattenedTask[] = []
    for (const b of activeBoards) {
      for (const col of b.columns) {
        for (const task of col.tasks) {
          list.push({
            boardId: b.id,
            boardTitle: b.title,
            columnId: col.id,
            columnTitle: col.title,
            task,
          })
        }
      }
    }
    return list
  }, [activeBoards])

  // 1. Operational Trip Dispatch List
  const tripDispatchTasks = useMemo(() => {
    return allFlattenedTasks
      .filter((item) => {
        const t = item.task
        // Must have logistics info
        const hasLogistics = !!(t.travelStartDate || t.pickupLocation || t.destination || t.vehicleType)
        if (!hasLogistics) return false

        const diff = getDayDiff(t.travelStartDate)
        if (tripFilter === "today") {
          return t.travelStartDate === todayStr
        }
        if (tripFilter === "7days") {
          // Departures from today up to next 7 days
          return diff !== null && diff >= 0 && diff <= 7
        }
        // "all": any with travelStartDate from today onwards, or with pickup/destination
        if (diff !== null) return diff >= 0
        return true
      })
      .sort((a, b) => {
        const dateA = a.task.travelStartDate || "9999-99-99"
        const dateB = b.task.travelStartDate || "9999-99-99"
        return dateA.localeCompare(dateB)
      })
  }, [allFlattenedTasks, tripFilter, todayStr])

  // 2. Urgent & Overdue Actions List
  const urgentTasks = useMemo(() => {
    return allFlattenedTasks
      .filter((item) => {
        const t = item.task
        const isUrgentOrHigh = t.priority === "urgent" || t.priority === "high"
        const isOverdue = t.dueDate ? t.dueDate < todayStr : false
        const isDueToday = t.dueDate === todayStr

        if (urgentFilter === "overdue") {
          return isOverdue
        }
        if (urgentFilter === "urgent") {
          return t.priority === "urgent"
        }
        // "all": urgent, high, or overdue/due today
        return isUrgentOrHigh || isOverdue || isDueToday
      })
      .sort((a, b) => {
        // Priority weight
        const priorityWeight = (p: Priority) => {
          if (p === "urgent") return 3
          if (p === "high") return 2
          if (p === "medium") return 1
          return 0
        }
        const weightDiff = priorityWeight(b.task.priority) - priorityWeight(a.task.priority)
        if (weightDiff !== 0) return weightDiff
        const dueA = a.task.dueDate || "9999-99-99"
        const dueB = b.task.dueDate || "9999-99-99"
        return dueA.localeCompare(dueB)
      })
  }, [allFlattenedTasks, urgentFilter, todayStr])

  // Summary Metrics
  const next7DaysTripCount = useMemo(() => {
    return allFlattenedTasks.filter((item) => {
      const diff = getDayDiff(item.task.travelStartDate)
      return diff !== null && diff >= 0 && diff <= 7
    }).length
  }, [allFlattenedTasks])

  const totalUrgentCount = useMemo(() => {
    return allFlattenedTasks.filter((item) => {
      const t = item.task
      const isOverdue = t.dueDate ? t.dueDate < todayStr : false
      return t.priority === "urgent" || t.priority === "high" || isOverdue
    }).length
  }, [allFlattenedTasks, todayStr])

  const handleJumpToBoard = (boardId: string) => {
    setActiveBoardId(boardId)
    setCurrentView("board")
  }

  return (
    <div className="flex-1 overflow-y-auto bg-stone-100/70 p-3 sm:p-5 space-y-4">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-stone-200/80">
        <div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            Operations Hub
          </h1>
          <p className="text-xs text-stone-500">
            Real-time departures, urgent actions, cross-board calendar & pipelines
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-stone-200/80 p-1 rounded-xl self-start sm:self-auto border border-stone-300/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setDashboardTab("overview")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              dashboardTab === "overview"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Layers className="size-3.5" />
            Overview
          </button>
          <button
            type="button"
            onClick={() => setDashboardTab("calendar")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              dashboardTab === "calendar"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Calendar className="size-3.5 text-amber-600" />
            Operations Calendar
          </button>
        </div>
      </div>

      {dashboardTab === "calendar" ? (
        <div className="space-y-4">
          <DashboardCalendar
            tasks={allFlattenedTasks}
            boards={activeBoards}
            onSelectTask={(boardId, columnId, taskId) =>
              setActiveTaskModal({ boardId, columnId, taskId })
            }
          />
        </div>
      ) : (
        <>
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Metric 1: Departures Next 7 Days */}
        <div className="rounded-xl sm:rounded-2xl border border-stone-200 bg-white p-3 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
              Departures (7 Days)
            </span>
            <span className="text-xl sm:text-3xl font-extrabold text-stone-900">
              {next7DaysTripCount}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-emerald-600 font-semibold mt-0.5">
              Scheduled this week
            </span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700">
            <Car className="size-5 sm:size-6" />
          </div>
        </div>

        {/* Metric 2: Urgent & Overdue Actions */}
        <div className="rounded-xl sm:rounded-2xl border border-stone-200 bg-white p-3 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
              Urgent & Overdue
            </span>
            <span className={`text-xl sm:text-3xl font-extrabold ${totalUrgentCount > 0 ? "text-red-600" : "text-stone-900"}`}>
              {totalUrgentCount}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-stone-500 font-medium mt-0.5">
              Requires attention
            </span>
          </div>
          <div className={`p-2.5 sm:p-3 rounded-xl border ${totalUrgentCount > 0 ? "bg-red-50 border-red-100 text-red-600 animate-pulse" : "bg-stone-50 border-stone-100 text-stone-500"}`}>
            <AlertTriangle className="size-5 sm:size-6" />
          </div>
        </div>

        {/* Metric 3: Total Active Cards */}
        <div className="rounded-xl sm:rounded-2xl border border-stone-200 bg-white p-3 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
              Active Bookings
            </span>
            <span className="text-xl sm:text-3xl font-extrabold text-stone-900">
              {allFlattenedTasks.length}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-stone-500 font-medium mt-0.5">
              In progress across boards
            </span>
          </div>
          <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-700">
            <Layers className="size-5 sm:size-6" />
          </div>
        </div>

        {/* Metric 4: Active Pipelines */}
        <div className="rounded-xl sm:rounded-2xl border border-stone-200 bg-white p-3 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
              Active Boards
            </span>
            <span className="text-xl sm:text-3xl font-extrabold text-stone-900">
              {activeBoards.length}
            </span>
            <span className="block text-[10px] sm:text-[11px] text-stone-500 font-medium mt-0.5">
              Operational workflows
            </span>
          </div>
          <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 text-stone-700">
            <CheckCircle2 className="size-6 text-stone-600" />
          </div>
        </div>
      </div>

      {/* Main Operational Split: Trip Dispatch & Urgent Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7/12): Operational Trip Dispatch */}
        <div className="lg:col-span-7 rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden flex flex-col">
          {/* Header */}
          <div className="border-b border-stone-200 px-5 py-4 bg-stone-50/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-600 text-white">
                <Car className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-stone-900">Operational Trip Dispatch</h2>
                <p className="text-[11px] text-stone-500">Upcoming vehicle pickups, routes, and passenger manifests</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex rounded-lg bg-stone-200/70 p-0.5 text-xs font-semibold text-stone-600">
              <button
                type="button"
                onClick={() => setTripFilter("7days")}
                className={`px-2.5 py-1 rounded-md transition ${tripFilter === "7days" ? "bg-white text-stone-900 shadow-2xs" : "hover:text-stone-900"}`}
              >
                Next 7 Days
              </button>
              <button
                type="button"
                onClick={() => setTripFilter("today")}
                className={`px-2.5 py-1 rounded-md transition ${tripFilter === "today" ? "bg-white text-stone-900 shadow-2xs" : "hover:text-stone-900"}`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setTripFilter("all")}
                className={`px-2.5 py-1 rounded-md transition ${tripFilter === "all" ? "bg-white text-stone-900 shadow-2xs" : "hover:text-stone-900"}`}
              >
                All Upcoming
              </button>
            </div>
          </div>

          {/* List of Trips */}
          <div className="divide-y divide-stone-100 max-h-[560px] overflow-y-auto p-2">
            {tripDispatchTasks.length === 0 ? (
              <div className="py-12 text-center text-stone-400">
                <Car className="size-8 mx-auto mb-2 text-stone-300" />
                <p className="text-xs font-semibold">No trips scheduled for this timeframe</p>
                <p className="text-[11px] text-stone-400 mt-0.5">Trips with travel dates and logistics appear here automatically.</p>
              </div>
            ) : (
              tripDispatchTasks.map(({ boardId, boardTitle, columnId, columnTitle, task }) => {
                const diff = getDayDiff(task.travelStartDate)
                const isToday = task.travelStartDate === todayStr
                const isTomorrow = diff === 1

                return (
                  <div
                    key={task.id}
                    onClick={() => setActiveTaskModal({ boardId, columnId, taskId: task.id })}
                    className="p-3.5 hover:bg-amber-50/40 rounded-xl transition cursor-pointer group flex flex-col gap-2.5"
                  >
                    {/* Top Row: Date, Status, Pipeline */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isToday ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-300">
                            <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            TODAY
                          </span>
                        ) : isTomorrow ? (
                          <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                            TOMORROW
                          </span>
                        ) : diff !== null && diff > 1 ? (
                          <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                            In {diff} days
                          </span>
                        ) : null}

                        {task.travelStartDate && (
                          <span className="text-xs font-semibold text-stone-800 flex items-center gap-1">
                            <Calendar className="size-3 text-stone-400" />
                            {formatDate(task.travelStartDate)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-stone-400 font-medium">{boardTitle}</span>
                        <span className="text-stone-300">•</span>
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 font-semibold text-stone-700">
                          {columnTitle}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Route (Pickup -> Destination) */}
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-900 group-hover:text-amber-800 transition">
                      <span className="truncate max-w-[180px] sm:max-w-[220px]">
                        {task.pickupLocation || "Pickup TBD"}
                      </span>
                      <ArrowRight className="size-3.5 text-amber-600 shrink-0" />
                      <span className="truncate max-w-[180px] sm:max-w-[220px]">
                        {task.destination || "Destination TBD"}
                      </span>
                    </div>

                    {/* Bottom Row: Vehicle, Pax, Client, Assignee */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100 text-[11px] text-stone-600">
                      <div className="flex flex-wrap items-center gap-3">
                        {task.vehicleType && (
                          <span className="inline-flex items-center gap-1 font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                            <Car className="size-3 text-stone-500" />
                            {task.vehicleType}
                          </span>
                        )}
                        {(task.paxAdults !== undefined || task.paxKids !== undefined) && (
                          <span className="inline-flex items-center gap-1 text-stone-600">
                            <Users className="size-3 text-stone-400" />
                            {task.paxAdults || 0}A {task.paxKids ? `+ ${task.paxKids}K` : ""}
                          </span>
                        )}
                        {task.customerName && (
                          <span className="text-stone-700 font-medium truncate max-w-[140px]">
                            {task.customerName}
                          </span>
                        )}
                        {task.customerPhone && (
                          <a
                            href={`tel:${task.customerPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-stone-500 hover:text-amber-700 transition"
                          >
                            <Phone className="size-2.5" />
                            <span>{task.customerPhone}</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {getTaskAssignees(task).length > 0 && (
                          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                            task.leader ? "font-semibold text-amber-900 bg-amber-100/90 border border-amber-300/80" : "font-medium text-stone-600 bg-stone-100"
                          }`}>
                            {task.leader ? (
                              <Crown className="size-3 text-amber-700 shrink-0" />
                            ) : (
                              <UserCheck className="size-3 text-stone-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[120px]">
                              {task.leader ? `${task.leader} (Lead)` : getTaskAssignees(task).join(", ")}
                            </span>
                          </span>
                        )}
                        <span className="text-amber-600 font-bold group-hover:translate-x-0.5 transition flex items-center text-[11px]">
                          View <ChevronRight className="size-3 ml-0.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column (5/12): Urgent & Overdue Actions */}
        <div className="lg:col-span-5 rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden flex flex-col">
          {/* Header */}
          <div className="border-b border-stone-200 px-5 py-4 bg-stone-50/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-red-600 text-white">
                <Flame className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-stone-900">Urgent & Overdue Actions</h2>
                <p className="text-[11px] text-stone-500">Critical tasks needing immediate operational follow-up</p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="inline-flex rounded-lg bg-stone-200/70 p-0.5 text-xs font-semibold text-stone-600">
              <button
                type="button"
                onClick={() => setUrgentFilter("all")}
                className={`px-2 py-1 rounded-md transition ${urgentFilter === "all" ? "bg-white text-stone-900 shadow-2xs" : "hover:text-stone-900"}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setUrgentFilter("overdue")}
                className={`px-2 py-1 rounded-md transition ${urgentFilter === "overdue" ? "bg-white text-stone-900 shadow-2xs" : "hover:text-stone-900"}`}
              >
                Overdue
              </button>
              <button
                type="button"
                onClick={() => setUrgentFilter("urgent")}
                className={`px-2 py-1 rounded-md transition ${urgentFilter === "urgent" ? "bg-white text-stone-900 shadow-2xs" : "hover:text-stone-900"}`}
              >
                Urgent
              </button>
            </div>
          </div>

          {/* List of Urgent Tasks */}
          <div className="divide-y divide-stone-100 max-h-[560px] overflow-y-auto p-2">
            {urgentTasks.length === 0 ? (
              <div className="py-12 text-center text-stone-400">
                <CheckCircle2 className="size-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-xs font-semibold text-stone-700">All caught up!</p>
                <p className="text-[11px] text-stone-400 mt-0.5">No overdue deadlines or urgent flags found.</p>
              </div>
            ) : (
              urgentTasks.map(({ boardId, boardTitle, columnId, columnTitle, task }) => {
                const isOverdue = task.dueDate ? task.dueDate < todayStr : false
                const isDueToday = task.dueDate === todayStr

                return (
                  <div
                    key={task.id}
                    onClick={() => setActiveTaskModal({ boardId, columnId, taskId: task.id })}
                    className="p-3.5 hover:bg-stone-50 rounded-xl transition cursor-pointer group flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-stone-900 group-hover:text-amber-800 transition truncate">
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mt-0.5">
                          <span>{boardTitle}</span>
                          <span>•</span>
                          <span className="text-stone-600 font-medium">{columnTitle}</span>
                        </div>
                      </div>

                      {/* Priority Badge */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                          task.priority === "urgent"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : task.priority === "high"
                            ? "bg-orange-100 text-orange-800 border border-orange-200"
                            : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    {/* Due Date & Assignee Status */}
                    <div className="flex items-center justify-between gap-2 text-[11px] pt-1">
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                          <AlertTriangle className="size-3" />
                          <span>Overdue ({formatDate(task.dueDate)})</span>
                        </span>
                      ) : isDueToday ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                          <Clock className="size-3" />
                          <span>Due Today</span>
                        </span>
                      ) : task.dueDate ? (
                        <span className="inline-flex items-center gap-1 text-stone-500">
                          <Calendar className="size-3 text-stone-400" />
                          <span>Due: {formatDate(task.dueDate)}</span>
                        </span>
                      ) : (
                        <span className="text-stone-400 text-[10px] italic">No due date set</span>
                      )}

                      {getTaskAssignees(task).length > 0 ? (
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                          task.leader ? "font-semibold text-amber-900 bg-amber-100/90 border border-amber-300/80" : "font-medium text-stone-600 bg-stone-100"
                        }`}>
                          {task.leader ? (
                            <Crown className="size-3 text-amber-700 shrink-0" />
                          ) : (
                            <UserCheck className="size-3 text-stone-400 shrink-0" />
                          )}
                          <span className="truncate max-w-[120px]">
                            {task.leader ? `${task.leader} (Lead)` : getTaskAssignees(task).join(", ")}
                          </span>
                        </span>
                      ) : (
                        <span className="text-stone-400 text-[10px]">Unassigned</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>


      {/* Analytics & Workload Charts */}
      <DashboardCharts
        tasks={allFlattenedTasks}
        boards={activeBoards}
        onSelectBoard={handleJumpToBoard}
      />

      {/* Pipelines & Boards Overview Section */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900">Active Pipelines & Workflows</h3>
            <p className="text-xs text-stone-500">Quick-jump to any operational board</p>
          </div>
          <span className="text-xs font-semibold text-stone-400">
            {activeBoards.length} Active Workflows
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeBoards.map((board) => {
            const cardCount = board.columns.reduce((acc, col) => acc + col.tasks.length, 0)
            const urgentInBoard = board.columns
              .flatMap((col) => col.tasks)
              .filter((t) => t.priority === "urgent" || t.priority === "high").length

            return (
              <div
                key={board.id}
                onClick={() => handleJumpToBoard(board.id)}
                className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 hover:border-amber-400 hover:bg-amber-50/20 transition cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-stone-900 group-hover:text-amber-800 transition">
                      {board.title}
                    </h4>
                    {urgentInBoard > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.2 rounded-full">
                        {urgentInBoard} urgent
                      </span>
                    )}
                  </div>
                  {board.description && (
                    <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">
                      {board.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-2.5 border-t border-stone-200/60 flex items-center justify-between text-xs text-stone-600">
                  <span className="font-semibold text-[11px] text-stone-700">
                    {cardCount} {cardCount === 1 ? "Card" : "Cards"} • {board.columns.length} Columns
                  </span>
                  <span className="text-amber-700 font-bold group-hover:translate-x-1 transition flex items-center text-[11px]">
                    Open <ChevronRight className="size-3.5 ml-0.5" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
        </>
      )}

      {/* Render Card Modal when a card is opened from the dashboard */}
      {activeTaskModal && (
        <CardModal
          boardId={activeTaskModal.boardId}
          columnId={activeTaskModal.columnId}
          taskId={activeTaskModal.taskId}
          onClose={() => setActiveTaskModal(null)}
        />
      )}
    </div>
  )
}
