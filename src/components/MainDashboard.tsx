import { useState, useMemo } from "react"
import {
  Car,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  UserCheck,
  ChevronRight,
  Flame,
  Layers,
  Crown,
  Wallet,
  ArrowUpRight,
  Hotel,
  Square,
  Bell,
  X,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useAuthStore } from "../store/authStore"
import { isBoardAllowed, getUserPermissions } from "../lib/permissions"
import { CardModal } from "./CardModal"
import { formatDate } from "../lib/date"
import { isDoneColumn } from "../lib/utils"
import { type Task, type Priority, getTaskAssignees, getPaymentSummary } from "../schemas/board"
import { DashboardCalendar } from "./DashboardCalendar"
import { DashboardCharts } from "./DashboardCharts"
import { toast } from "sonner"

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

function formatINR(val: number): string {
  return "₹" + Math.round(val).toLocaleString("en-IN")
}

function getHoldBadge(holdUntil?: string) {
  if (!holdUntil) return { text: "No deadline", color: "bg-stone-100 text-stone-500 border-stone-200" }
  const diff = getDayDiff(holdUntil)
  if (diff === null) return { text: holdUntil, color: "bg-stone-100 text-stone-500 border-stone-200" }
  if (diff < 0) return { text: `Expired (${Math.abs(diff)}d ago)`, color: "bg-red-100 text-red-800 border-red-300 font-bold" }
  if (diff === 0) return { text: "Expires Today!", color: "bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse" }
  if (diff === 1) return { text: "Expires Tomorrow", color: "bg-amber-100 text-amber-900 border-amber-300 font-bold" }
  return { text: `Hold: ${diff} days left`, color: "bg-stone-100 text-stone-700 border-stone-200 font-medium" }
}

export function MainDashboard() {
  const {
    boards,
    setActiveBoardId,
    setCurrentView,
    generalReminders,
    toggleTaskReminder,
    toggleGeneralReminder,
  } = useBoardStore()
  const { profile } = useAuthStore()

  const [urgentFilter, setUrgentFilter] = useState<"all" | "overdue" | "urgent">("all")
  const [actionTab, setActionTab] = useState<"urgent" | "reminders" | "hotels">("urgent")
  const [dashboardTab, setDashboardTab] = useState<"overview" | "calendar">("overview")

  // Active card modal state inside dashboard
  const [activeTaskModal, setActiveTaskModal] = useState<{
    boardId: string
    columnId: string
    taskId: string
  } | null>(null)

  // Commercial detail modal state: "receivables" | "payables" | null
  const [commercialModal, setCommercialModal] = useState<"receivables" | "payables" | null>(null)

  const todayStr = getTodayStr()
  const perms = getUserPermissions(profile)
  const canViewCommercials = profile?.role === "admin" || profile?.role === "accounts" || perms.canViewCommercials

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

  const activeFlattenedTasks = useMemo(() => {
    return allFlattenedTasks.filter((item) => !isDoneColumn(item.columnTitle))
  }, [allFlattenedTasks])

  const completedTasksCount = useMemo(() => {
    return allFlattenedTasks.length - activeFlattenedTasks.length
  }, [allFlattenedTasks, activeFlattenedTasks])



  // 2. Urgent & Overdue Actions List
  const urgentTasks = useMemo(() => {
    return allFlattenedTasks
      .filter((item) => {
        if (isDoneColumn(item.columnTitle)) return false
        const t = item.task
        const isUrgentOrHigh = t.priority === "urgent" || t.priority === "high"
        const isOverdue = t.dueDate ? t.dueDate < todayStr : false
        const isDueToday = t.dueDate === todayStr

        if (urgentFilter === "overdue") return isOverdue
        if (urgentFilter === "urgent") return t.priority === "urgent"
        return isUrgentOrHigh || isOverdue || isDueToday
      })
      .sort((a, b) => {
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

  // 3. Today's Reminders & Follow-ups
  const todayReminders = useMemo(() => {
    const list: Array<{
      id: string
      text: string
      dueDate: string
      dueTime?: string
      priority?: Priority
      completed: boolean
      createdBy?: string
      isGeneral: boolean
      boardId?: string
      boardTitle?: string
      columnId?: string
      taskId?: string
      taskTitle?: string
    }> = []

    for (const item of allFlattenedTasks) {
      if (isDoneColumn(item.columnTitle)) continue
      if (item.task.reminders) {
        for (const rem of item.task.reminders) {
          if (!rem.completed && rem.dueDate <= todayStr) {
            list.push({
              id: rem.id,
              text: rem.text,
              dueDate: rem.dueDate,
              dueTime: rem.dueTime,
              priority: rem.priority,
              completed: rem.completed,
              createdBy: rem.createdBy,
              isGeneral: false,
              boardId: item.boardId,
              boardTitle: item.boardTitle,
              columnId: item.columnId,
              taskId: item.task.id,
              taskTitle: item.task.title,
            })
          }
        }
      }
    }

    for (const rem of generalReminders) {
      if (!rem.completed && rem.dueDate <= todayStr) {
        list.push({
          id: rem.id,
          text: rem.text,
          dueDate: rem.dueDate,
          dueTime: rem.dueTime,
          priority: rem.priority,
          completed: rem.completed,
          createdBy: rem.createdBy,
          isGeneral: true,
        })
      }
    }

    return list.sort((a, b) => {
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      return (a.dueTime || "99:99").localeCompare(b.dueTime || "99:99")
    })
  }, [allFlattenedTasks, generalReminders, todayStr])

  // 4. Hotel Hold Deadlines Tracker
  const hotelHoldTasks = useMemo(() => {
    return allFlattenedTasks
      .filter((item) => {
        if (isDoneColumn(item.columnTitle)) return false
        const h = item.task.hotelBooking
        return h && (h.status === "hold" || h.status === "blocked")
      })
      .sort((a, b) => {
        const dateA = a.task.hotelBooking?.holdUntil || "9999-99-99"
        const dateB = b.task.hotelBooking?.holdUntil || "9999-99-99"
        return dateA.localeCompare(dateB)
      })
  }, [allFlattenedTasks])

  // 5. Commercials & Cash Flow Metrics (Admin & Accounts only)
  const commercialStats = useMemo(() => {
    let totalBookingsValue = 0
    let totalCollected = 0
    let totalPendingReceivable = 0
    let pendingOutgoingAmount = 0
    let pendingOutgoingCount = 0
    let settledOutgoingAmount = 0

    for (const item of allFlattenedTasks) {
      const summary = getPaymentSummary(item.task.paymentTracking, item.task.amount)
      totalBookingsValue += summary.total
      totalCollected += summary.received
      totalPendingReceivable += summary.pending

      const out = item.task.outgoingPayment
      if (out && out.status === "pending" && out.amount) {
        pendingOutgoingAmount += out.amount
        pendingOutgoingCount++
      } else if (out && out.status === "done" && out.amount) {
        settledOutgoingAmount += out.amount
      }
    }

    const collectionPercent =
      totalBookingsValue > 0 ? Math.round((totalCollected / totalBookingsValue) * 100) : 0

    return {
      totalBookingsValue,
      totalCollected,
      totalPendingReceivable,
      collectionPercent,
      pendingOutgoingAmount,
      pendingOutgoingCount,
      settledOutgoingAmount,
    }
  }, [allFlattenedTasks])

  // Detailed lists for Commercial Modals
  const receivablesList = useMemo(() => {
    return allFlattenedTasks
      .map((item) => {
        const summary = getPaymentSummary(item.task.paymentTracking, item.task.amount)
        const isDone = isDoneColumn(item.columnTitle)
        return {
          ...item,
          summary,
          isDone,
        }
      })
      .filter((x) => x.summary.total > 0)
      .sort((a, b) => b.summary.pending - a.summary.pending)
  }, [allFlattenedTasks])

  const payablesList = useMemo(() => {
    return allFlattenedTasks
      .filter((item) => {
        const out = item.task.outgoingPayment
        return out && out.amount !== undefined && out.amount > 0
      })
      .map((item) => {
        const out = item.task.outgoingPayment!
        const isDone = isDoneColumn(item.columnTitle)
        return {
          ...item,
          outgoing: out,
          isDone,
        }
      })
      .sort((a, b) => {
        // Pending first, then by amount desc
        if (a.outgoing.status === "pending" && b.outgoing.status !== "pending") return -1
        if (a.outgoing.status !== "pending" && b.outgoing.status === "pending") return 1
        return (b.outgoing.amount || 0) - (a.outgoing.amount || 0)
      })
  }, [allFlattenedTasks])

  // Summary Metrics
  const next7DaysTripCount = useMemo(() => {
    return allFlattenedTasks.filter((item) => {
      if (isDoneColumn(item.columnTitle)) return false
      const diff = getDayDiff(item.task.travelStartDate)
      return diff !== null && diff >= 0 && diff <= 7
    }).length
  }, [allFlattenedTasks])

  const totalUrgentCount = useMemo(() => {
    return allFlattenedTasks.filter((item) => {
      if (isDoneColumn(item.columnTitle)) return false
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
          {/* Compact Operations Cockpit Ticker Bar */}
          <div className="rounded-xl border border-stone-200/90 bg-white shadow-2xs px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Core Operational Metrics */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Metric 1: Departures */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/80 border border-amber-200/70 text-amber-900 font-semibold">
                <Car className="size-3.5 text-amber-700 shrink-0" />
                <span className="text-stone-500 font-normal">Departures:</span>
                <span className="font-extrabold text-amber-950">{next7DaysTripCount}</span>
                <span className="text-[10px] text-amber-700/80 font-medium hidden sm:inline">(7d)</span>
              </div>

              {/* Metric 2: Urgent & Overdue */}
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold ${
                totalUrgentCount > 0
                  ? "bg-red-50 border-red-200 text-red-900 animate-pulse"
                  : "bg-stone-50 border-stone-200 text-stone-700"
              }`}>
                <AlertTriangle className={`size-3.5 shrink-0 ${totalUrgentCount > 0 ? "text-red-600" : "text-stone-400"}`} />
                <span className="text-stone-500 font-normal">Urgent:</span>
                <span className={`font-extrabold ${totalUrgentCount > 0 ? "text-red-700" : "text-stone-900"}`}>
                  {totalUrgentCount}
                </span>
              </div>

              {/* Metric 3: Active Bookings */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/70 border border-blue-200/70 text-blue-950 font-semibold">
                <Layers className="size-3.5 text-blue-600 shrink-0" />
                <span className="text-stone-500 font-normal">Active:</span>
                <span className="font-extrabold text-blue-900">{activeFlattenedTasks.length}</span>
                {completedTasksCount > 0 && (
                  <span className="text-[10px] text-stone-400 font-normal hidden md:inline">
                    ({completedTasksCount} done)
                  </span>
                )}
              </div>

              {/* Metric 4: Active Boards */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 font-semibold">
                <CheckCircle2 className="size-3.5 text-stone-500 shrink-0" />
                <span className="text-stone-500 font-normal">Pipelines:</span>
                <span className="font-extrabold text-stone-900">{activeBoards.length}</span>
              </div>
            </div>

            {/* Commercials & Cash Flow Overview (Interactive dense pill buttons) */}
            {canViewCommercials && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Receivables Pill Button */}
                <button
                  type="button"
                  onClick={() => setCommercialModal("receivables")}
                  title="Click to view detailed customer receivables breakdown"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 text-emerald-950 font-medium transition cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]"
                >
                  <Wallet className="size-3.5 text-emerald-700 shrink-0" />
                  <span className="text-stone-500 text-[11px]">Receivables:</span>
                  <span className="font-extrabold text-stone-900">{formatINR(commercialStats.totalPendingReceivable)}</span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.2 rounded">
                    {commercialStats.collectionPercent}%
                  </span>
                  <span className="text-[9px] text-emerald-700 underline font-semibold ml-0.5">
                    View
                  </span>
                </button>

                {/* Payables Pill Button */}
                <button
                  type="button"
                  onClick={() => setCommercialModal("payables")}
                  title="Click to view detailed outgoing vendor payables breakdown"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50/90 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 text-rose-950 font-medium transition cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98]"
                >
                  <ArrowUpRight className="size-3.5 text-rose-700 shrink-0" />
                  <span className="text-stone-500 text-[11px]">Payables:</span>
                  <span className="font-extrabold text-rose-800">{formatINR(commercialStats.pendingOutgoingAmount)}</span>
                  {commercialStats.pendingOutgoingCount > 0 && (
                    <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.2 rounded">
                      {commercialStats.pendingOutgoingCount} due
                    </span>
                  )}
                  <span className="text-[9px] text-rose-700 underline font-semibold ml-0.5">
                    View
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Operational Action Center (Urgent, Follow-ups, Hotel Holds) */}
          <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden flex flex-col">
              {/* Header with 3 Tab Switcher */}
              <div className="border-b border-stone-200 px-3.5 py-2.5 bg-stone-50/70 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg text-white ${
                      actionTab === "urgent" ? "bg-red-600" : actionTab === "reminders" ? "bg-amber-600" : "bg-purple-600"
                    }`}>
                      {actionTab === "urgent" ? (
                        <Flame className="size-3.5" />
                      ) : actionTab === "reminders" ? (
                        <Bell className="size-3.5" />
                      ) : (
                        <Hotel className="size-3.5" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                        {actionTab === "urgent"
                          ? "Urgent Actions"
                          : actionTab === "reminders"
                          ? "Today's Follow-ups"
                          : "Hotel Holds"}
                      </h2>
                      <p className="text-[10px] text-stone-500">
                        {actionTab === "urgent"
                          ? "Immediate follow-up required"
                          : actionTab === "reminders"
                          ? "Checklist of due reminders"
                          : "Room hold expiry tracking"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3 Main Action Tabs */}
                <div className="flex items-center gap-1 bg-stone-200/80 p-0.5 rounded-lg text-[11px] font-bold text-stone-600">
                  <button
                    type="button"
                    onClick={() => setActionTab("urgent")}
                    className={`flex-1 py-1 px-1.5 rounded-md transition flex items-center justify-center gap-1.5 ${
                      actionTab === "urgent"
                        ? "bg-white text-stone-900 shadow-2xs font-bold"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <span>Urgent</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      urgentTasks.length > 0 ? "bg-red-100 text-red-800" : "bg-stone-200 text-stone-600"
                    }`}>
                      {urgentTasks.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionTab("reminders")}
                    className={`flex-1 py-1 px-1.5 rounded-md transition flex items-center justify-center gap-1.5 ${
                      actionTab === "reminders"
                        ? "bg-white text-stone-900 shadow-2xs font-bold"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <span>Follow-ups</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      todayReminders.length > 0 ? "bg-amber-200 text-amber-900 animate-pulse" : "bg-stone-200 text-stone-600"
                    }`}>
                      {todayReminders.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionTab("hotels")}
                    className={`flex-1 py-1 px-1.5 rounded-md transition flex items-center justify-center gap-1.5 ${
                      actionTab === "hotels"
                        ? "bg-white text-stone-900 shadow-2xs font-bold"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <span>Hotel Holds</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      hotelHoldTasks.length > 0 ? "bg-purple-100 text-purple-900" : "bg-stone-200 text-stone-600"
                    }`}>
                      {hotelHoldTasks.length}
                    </span>
                  </button>
                </div>

                {/* Sub-filter if on Urgent tab */}
                {actionTab === "urgent" && (
                  <div className="flex items-center justify-end gap-1 pt-0.5 text-[11px] font-semibold">
                    <span className="text-stone-400 text-[10px] mr-1">Filter:</span>
                    <button
                      type="button"
                      onClick={() => setUrgentFilter("all")}
                      className={`px-2 py-0.5 rounded transition ${urgentFilter === "all" ? "bg-white text-stone-900 shadow-2xs border border-stone-200" : "text-stone-500 hover:text-stone-800"}`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrgentFilter("overdue")}
                      className={`px-2 py-0.5 rounded transition ${urgentFilter === "overdue" ? "bg-white text-stone-900 shadow-2xs border border-stone-200" : "text-stone-500 hover:text-stone-800"}`}
                    >
                      Overdue
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrgentFilter("urgent")}
                      className={`px-2 py-0.5 rounded transition ${urgentFilter === "urgent" ? "bg-white text-stone-900 shadow-2xs border border-stone-200" : "text-stone-500 hover:text-stone-800"}`}
                    >
                      Urgent
                    </button>
                  </div>
                )}
              </div>

              {/* Action Center Content Body */}
              <div className="divide-y divide-stone-100 max-h-[580px] overflow-y-auto p-1.5">
                {/* 1. Tab: Urgent & Overdue Tasks */}
                {actionTab === "urgent" && (
                  urgentTasks.length === 0 ? (
                    <div className="py-10 text-center text-stone-400">
                      <CheckCircle2 className="size-7 mx-auto mb-1.5 text-emerald-500" />
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
                          className="py-2 px-2.5 hover:bg-stone-50 rounded-lg transition cursor-pointer group flex flex-col gap-1.5"
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

                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${
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

                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            {isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-red-600 font-bold text-[10px]">
                                <AlertTriangle className="size-3" />
                                <span>Overdue ({formatDate(task.dueDate)})</span>
                              </span>
                            ) : isDueToday ? (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[10px]">
                                <Clock className="size-3" />
                                <span>Due Today</span>
                              </span>
                            ) : task.dueDate ? (
                              <span className="inline-flex items-center gap-1 text-stone-500 text-[10px]">
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
                  )
                )}

                {/* 2. Tab: Today's Follow-up Reminders */}
                {actionTab === "reminders" && (
                  todayReminders.length === 0 ? (
                    <div className="py-10 text-center text-stone-400">
                      <CheckCircle2 className="size-7 mx-auto mb-1.5 text-emerald-500" />
                      <p className="text-xs font-semibold text-stone-700">No pending follow-ups today!</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">Reminders scheduled for today or overdue will appear here.</p>
                    </div>
                  ) : (
                    todayReminders.map((rem) => {
                      const isOverdue = rem.dueDate < todayStr
                      return (
                        <div
                          key={rem.id}
                          onClick={() => {
                            if (!rem.isGeneral && rem.boardId && rem.columnId && rem.taskId) {
                              setActiveTaskModal({ boardId: rem.boardId, columnId: rem.columnId, taskId: rem.taskId })
                            }
                          }}
                          className={`py-2 px-2.5 transition flex items-start gap-2.5 group rounded-lg ${
                            !rem.isGeneral ? "hover:bg-amber-50/40 cursor-pointer" : "hover:bg-stone-50"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (rem.isGeneral) {
                                toggleGeneralReminder(rem.id)
                              } else if (rem.boardId && rem.columnId && rem.taskId) {
                                toggleTaskReminder(rem.boardId, rem.columnId, rem.taskId, rem.id)
                              }
                              toast.success("Reminder marked completed")
                            }}
                            className="mt-0.5 text-stone-400 hover:text-emerald-600 transition cursor-pointer"
                            title="Mark completed"
                          >
                            <Square className="size-3.5" />
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-stone-900 group-hover:text-amber-800 transition">
                                {rem.text}
                              </span>
                              {isOverdue ? (
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-red-100 text-red-800 border border-red-200 shrink-0">
                                  Overdue
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                                  Today {rem.dueTime ? `• ${rem.dueTime}` : ""}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-stone-500">
                              {rem.isGeneral ? (
                                <span className="text-purple-700 font-semibold text-[9px] bg-purple-50 px-1 rounded border border-purple-200">
                                  General Ops
                                </span>
                              ) : (
                                <span className="truncate">
                                  <span className="font-semibold text-stone-700">{rem.taskTitle}</span>
                                  <span className="text-stone-400 mx-1">•</span>
                                  <span>{rem.boardTitle}</span>
                                </span>
                              )}
                              {rem.createdBy && (
                                <span className="text-stone-400 text-[10px] ml-auto shrink-0">
                                  by {rem.createdBy}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )
                )}

                {/* 3. Tab: Hotel Hold Deadlines */}
                {actionTab === "hotels" && (
                  hotelHoldTasks.length === 0 ? (
                    <div className="py-10 text-center text-stone-400">
                      <Hotel className="size-7 mx-auto mb-1.5 text-stone-300" />
                      <p className="text-xs font-semibold text-stone-700">No rooms currently on hold</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">Cards with hotel booking status set to 'Hold' or 'Blocked' appear here.</p>
                    </div>
                  ) : (
                    hotelHoldTasks.map(({ boardId, boardTitle, columnId, task }) => {
                      const h = task.hotelBooking!
                      const badge = getHoldBadge(h.holdUntil)
                      const isHold = h.status === "hold"

                      return (
                        <div
                          key={task.id}
                          onClick={() => setActiveTaskModal({ boardId, columnId, taskId: task.id })}
                          className="py-2 px-2.5 hover:bg-amber-50/40 rounded-lg transition cursor-pointer group space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border shrink-0 ${
                                  isHold ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-purple-100 text-purple-900 border-purple-300"
                                }`}>
                                  {h.status}
                                </span>
                                <h4 className="text-xs font-bold text-stone-900 truncate group-hover:text-amber-800 transition">
                                  {h.hotelName || "Hotel Not Specified"}
                                </h4>
                              </div>
                              <p className="text-[10px] text-stone-600 truncate mt-0.5">
                                Booking: <span className="font-semibold text-stone-800">{task.title}</span> • {boardTitle}
                              </p>
                            </div>

                            <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${badge.color}`}>
                              {badge.text}
                            </span>
                          </div>

                          {h.notes && (
                            <p className="text-[10px] text-stone-500 italic truncate font-mono bg-stone-50 px-1.5 py-0.5 rounded">
                              {h.notes}
                            </p>
                          )}
                        </div>
                      )
                    })
                  )
                )}
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
                let activeInBoard = 0
                let doneInBoard = 0
                let urgentInBoard = 0

                for (const col of board.columns) {
                  const isDone = isDoneColumn(col.title)
                  for (const t of col.tasks) {
                    if (isDone) {
                      doneInBoard++
                    } else {
                      activeInBoard++
                      if (t.priority === "urgent" || t.priority === "high") {
                        urgentInBoard++
                      }
                    }
                  }
                }

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
                        {activeInBoard} active {doneInBoard > 0 ? `• ${doneInBoard} done` : ""}
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

      {/* Commercial Details Modal (Receivables & Payables breakdown) */}
      {commercialModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setCommercialModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-xl border border-stone-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
              commercialModal === "receivables" ? "bg-emerald-50/70 border-emerald-100" : "bg-rose-50/70 border-rose-100"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl text-white ${
                  commercialModal === "receivables" ? "bg-emerald-600" : "bg-rose-600"
                }`}>
                  {commercialModal === "receivables" ? (
                    <Wallet className="size-5" />
                  ) : (
                    <ArrowUpRight className="size-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-stone-900">
                      {commercialModal === "receivables" ? "Customer Receivables Breakdown" : "Vendor & Outgoing Payables"}
                    </h2>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      commercialModal === "receivables"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}>
                      {commercialModal === "receivables" ? `${receivablesList.length} Bookings` : `${payablesList.length} Payouts`}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    {commercialModal === "receivables"
                      ? `Total Pending: ${formatINR(commercialStats.totalPendingReceivable)} • Collected: ${formatINR(commercialStats.totalCollected)} (${commercialStats.collectionPercent}%)`
                      : `Total Due: ${formatINR(commercialStats.pendingOutgoingAmount)} across ${commercialStats.pendingOutgoingCount} pending items`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Switcher Tab within modal */}
                <div className="inline-flex rounded-lg bg-stone-200/80 p-0.5 text-xs font-semibold text-stone-600">
                  <button
                    type="button"
                    onClick={() => setCommercialModal("receivables")}
                    className={`px-2.5 py-1 rounded-md transition ${
                      commercialModal === "receivables"
                        ? "bg-white text-emerald-900 shadow-2xs font-bold"
                        : "hover:text-stone-900"
                    }`}
                  >
                    Receivables
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommercialModal("payables")}
                    className={`px-2.5 py-1 rounded-md transition ${
                      commercialModal === "payables"
                        ? "bg-white text-rose-900 shadow-2xs font-bold"
                        : "hover:text-stone-900"
                    }`}
                  >
                    Payables
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setCommercialModal(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                  title="Close modal"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Table / List */}
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-2 sm:p-3">
              {commercialModal === "receivables" ? (
                receivablesList.length === 0 ? (
                  <div className="py-12 text-center text-stone-400">
                    <Wallet className="size-8 mx-auto mb-2 text-stone-300" />
                    <p className="text-xs font-semibold text-stone-700">No bookings with payment tracking found</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">Cards with amount or payment phases set will appear here.</p>
                  </div>
                ) : (
                  receivablesList.map(({ boardId, boardTitle, columnId, columnTitle, task, summary, isDone }) => {
                    const percent = summary.total > 0 ? Math.round((summary.received / summary.total) * 100) : 0
                    return (
                      <div
                        key={task.id}
                        onClick={() => {
                          setCommercialModal(null)
                          setActiveTaskModal({ boardId, columnId, taskId: task.id })
                        }}
                        className="py-2.5 px-3 hover:bg-stone-50 rounded-xl transition cursor-pointer group flex flex-col gap-1.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-stone-900 group-hover:text-emerald-800 transition truncate">
                                {task.title}
                              </span>
                              {task.customerName && (
                                <span className="text-[11px] text-stone-500 font-medium">
                                  ({task.customerName})
                                </span>
                              )}
                              {isDone && (
                                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                  Stage: Done
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-0.5">
                              <span>{boardTitle}</span>
                              <span>•</span>
                              <span className="text-stone-600 font-medium">{columnTitle}</span>
                              {task.leader && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-800 font-semibold">Lead: {task.leader}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-stone-900 block">
                              {summary.pending > 0 ? (
                                <span className="text-amber-800">{formatINR(summary.pending)} pending</span>
                              ) : (
                                <span className="text-emerald-600 font-extrabold">Fully Paid</span>
                              )}
                            </span>
                            <span className="text-[10px] text-stone-500 block">
                              Total: {formatINR(summary.total)}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar & Sub-stats */}
                        <div className="flex items-center gap-3 pt-0.5">
                          <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200/60">
                            <div
                              className="h-full bg-emerald-600 rounded-full transition-all"
                              style={{ width: `${Math.min(100, percent)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-stone-600 shrink-0">
                            {formatINR(summary.received)} ({percent}%)
                          </span>
                          <span className="text-emerald-700 font-bold group-hover:translate-x-0.5 transition flex items-center text-[10px] ml-auto shrink-0">
                            Open Card <ChevronRight className="size-3 ml-0.5" />
                          </span>
                        </div>
                      </div>
                    )
                  })
                )
              ) : (
                payablesList.length === 0 ? (
                  <div className="py-12 text-center text-stone-400">
                    <ArrowUpRight className="size-8 mx-auto mb-2 text-stone-300" />
                    <p className="text-xs font-semibold text-stone-700">No outgoing payments recorded</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">Cards with Outgoing Payment module set appear here.</p>
                  </div>
                ) : (
                  payablesList.map(({ boardId, boardTitle, columnId, columnTitle, task, outgoing, isDone }) => {
                    const isPending = outgoing.status === "pending"
                    return (
                      <div
                        key={task.id}
                        onClick={() => {
                          setCommercialModal(null)
                          setActiveTaskModal({ boardId, columnId, taskId: task.id })
                        }}
                        className="py-2.5 px-3 hover:bg-stone-50 rounded-xl transition cursor-pointer group flex flex-col gap-1.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-stone-900 group-hover:text-rose-800 transition truncate">
                                {task.title}
                              </span>
                              {task.customerName && (
                                <span className="text-[11px] text-stone-500 font-medium">
                                  ({task.customerName})
                                </span>
                              )}
                              {isDone && (
                                <span className="text-[9px] font-bold text-stone-600 bg-stone-100 border border-stone-200 px-1.5 py-0.2 rounded">
                                  Stage: Done
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-0.5">
                              <span>{boardTitle}</span>
                              <span>•</span>
                              <span className="text-stone-600 font-medium">{columnTitle}</span>
                              {task.leader && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-800 font-semibold">Lead: {task.leader}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-sm font-black block ${
                              isPending ? "text-rose-700" : "text-emerald-700"
                            }`}>
                              {formatINR(outgoing.amount || 0)}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded inline-block mt-0.5 border ${
                              isPending
                                ? "bg-rose-100 text-rose-800 border-rose-200"
                                : "bg-emerald-100 text-emerald-800 border-emerald-200"
                            }`}>
                              {isPending ? "Pending Due" : "Settled"}
                            </span>
                          </div>
                        </div>

                        {outgoing.notes && (
                          <div className="flex items-center justify-between text-[10px] text-stone-500 bg-stone-50 px-2 py-1 rounded border border-stone-200/50">
                            <span className="truncate italic">
                              Note: {outgoing.notes}
                            </span>
                            <span className="text-rose-700 font-bold group-hover:translate-x-0.5 transition flex items-center shrink-0 ml-2">
                              Open Card <ChevronRight className="size-3 ml-0.5" />
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/70 flex items-center justify-between text-xs text-stone-500">
              <span>Clicking any item opens its card modal directly.</span>
              <button
                type="button"
                onClick={() => setCommercialModal(null)}
                className="px-3 py-1 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg text-xs font-semibold text-stone-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
