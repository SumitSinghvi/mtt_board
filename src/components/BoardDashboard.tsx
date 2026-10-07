import { useState } from "react"
import {
  TrendingUp,
  AlertCircle,
  IndianRupee,
  Car,
  Users,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldAlert,
} from "lucide-react"
import type { Board, Priority } from "../schemas/board"

interface BoardDashboardProps {
  board: Board
  onOpenTask: (columnId: string, taskId: string) => void
}

const priorityBadges: Record<Priority, { label: string; bg: string; text: string }> = {
  urgent: { label: "Urgent", bg: "bg-red-50 border-red-200", text: "text-red-700" },
  high: { label: "High", bg: "bg-orange-50 border-orange-200", text: "text-orange-700" },
  medium: { label: "Medium", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  low: { label: "Low", bg: "bg-stone-100 border-stone-200", text: "text-stone-600" },
}

function getTodayDateStr(): string {
  return new Date().toISOString().split("T")[0]
}

export function BoardDashboard({ board, onOpenTask }: BoardDashboardProps) {
  const modules = board.modules || {
    clientContact: true,
    tripLogistics: false,
    commercials: false,
    subtasks: true,
  }

  // Aggregate all tasks with their respective column info
  const allTasksWithCol = board.columns.flatMap((col) =>
    col.tasks.map((task) => ({ ...task, columnId: col.id, columnTitle: col.title }))
  )

  const totalCards = allTasksWithCol.length

  // Priority distribution
  const priorityCounts: Record<Priority, number> = {
    urgent: allTasksWithCol.filter((t) => t.priority === "urgent").length,
    high: allTasksWithCol.filter((t) => t.priority === "high").length,
    medium: allTasksWithCol.filter((t) => t.priority === "medium").length,
    low: allTasksWithCol.filter((t) => t.priority === "low").length,
  }

  // Commercials aggregates
  const totalAmount = allTasksWithCol.reduce((sum, t) => sum + (t.amount || 0), 0)
  const totalAdvance = allTasksWithCol.reduce((sum, t) => sum + (t.advancePaid || 0), 0)
  const totalPending = Math.max(0, totalAmount - totalAdvance)
  const commercialCardsCount = allTasksWithCol.filter((t) => typeof t.amount === "number" && t.amount > 0).length

  // Trip Logistics aggregates
  const totalPaxAdults = allTasksWithCol.reduce((sum, t) => sum + (t.paxAdults || 0), 0)
  const totalPaxKids = allTasksWithCol.reduce((sum, t) => sum + (t.paxKids || 0), 0)
  const totalPax = totalPaxAdults + totalPaxKids

  const vehicleStats: Record<string, number> = {}
  allTasksWithCol.forEach((t) => {
    if (t.vehicleType && t.vehicleType.trim()) {
      const v = t.vehicleType.trim()
      vehicleStats[v] = (vehicleStats[v] || 0) + 1
    }
  })

  // Subtasks aggregates
  const allChecklistItems = allTasksWithCol.flatMap((t) => t.checklist || [])
  const totalSubtasks = allChecklistItems.length
  const doneSubtasks = allChecklistItems.filter((i) => i.done).length
  const subtaskPct = totalSubtasks > 0 ? Math.round((doneSubtasks / totalSubtasks) * 100) : 0

  // Attention Needed List: Urgent / High priority or past due / due soon
  const [todayStr] = useState(getTodayDateStr)
  const attentionTasks = allTasksWithCol.filter((t) => {
    const isUrgent = t.priority === "urgent" || t.priority === "high"
    const isOverdue = t.dueDate && t.dueDate < todayStr
    return isUrgent || isOverdue
  }).slice(0, 6)

  // Upcoming Trips (if Trip Logistics ON)
  const upcomingTrips = allTasksWithCol
    .filter((t) => Boolean(t.travelStartDate))
    .sort((a, b) => (a.travelStartDate || "").localeCompare(b.travelStartDate || ""))
    .slice(0, 6)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* 1. Adaptive KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Core KPI: Total Cards */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Cards</span>
            <TrendingUp className="size-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{totalCards}</span>
            <span className="text-xs text-stone-500">across {board.columns.length} columns</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-stone-600">
            <span className="inline-block size-2 rounded-full bg-red-500" />
            <span>{priorityCounts.urgent} urgent</span>
            <span className="text-stone-300">•</span>
            <span className="inline-block size-2 rounded-full bg-orange-400" />
            <span>{priorityCounts.high} high</span>
          </div>
        </div>

        {/* Commercials KPI (if enabled) or Priority KPI */}
        {modules.commercials ? (
          <>
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Booked</span>
                <IndianRupee className="size-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-stone-900">
                  ₹{totalAmount.toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-stone-500">{commercialCardsCount} bookings</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-stone-600">
                <span>Recv: <strong className="text-emerald-700">₹{totalAdvance.toLocaleString("en-IN")}</strong></span>
                <span className="text-stone-300">•</span>
                <span>Due: <strong className="text-amber-700">₹{totalPending.toLocaleString("en-IN")}</strong></span>
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Pending Balance</span>
                <AlertCircle className="size-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-700">
                  ₹{totalPending.toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-stone-500">
                  {totalAmount > 0 ? `${Math.round((totalPending / totalAmount) * 100)}% pending` : "0%"}
                </span>
              </div>
              <div className="mt-3 w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-1.5 rounded-full transition-all"
                  style={{
                    width: `${totalAmount > 0 ? Math.min(100, Math.round((totalAdvance / totalAmount) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Urgent & High</span>
              <ShieldAlert className="size-4 text-red-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-stone-900">
                {priorityCounts.urgent + priorityCounts.high}
              </span>
              <span className="text-xs text-stone-500">require immediate attention</span>
            </div>
            <div className="mt-3 text-[11px] text-stone-500">
              {priorityCounts.urgent} critical priority items
            </div>
          </div>
        )}

        {/* Trip Logistics KPI (if enabled) */}
        {modules.tripLogistics ? (
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Passengers (Pax)</span>
              <Users className="size-4 text-sky-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-stone-900">{totalPax}</span>
              <span className="text-xs text-stone-500">passengers scheduled</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-stone-600">
              <span>{totalPaxAdults} adults</span>
              <span className="text-stone-300">•</span>
              <span>{totalPaxKids} kids</span>
            </div>
          </div>
        ) : modules.subtasks ? (
          /* Subtasks Completion KPI */
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Subtask Progress</span>
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-stone-900">{subtaskPct}%</span>
              <span className="text-xs text-stone-500">
                {doneSubtasks}/{totalSubtasks} completed
              </span>
            </div>
            <div className="mt-3 w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-600 h-1.5 rounded-full transition-all"
                style={{ width: `${subtaskPct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Columns</span>
              <Clock className="size-4 text-stone-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-stone-900">{board.columns.length}</span>
              <span className="text-xs text-stone-500">pipeline stages</span>
            </div>
            <div className="mt-3 text-[11px] text-stone-500">Workflow active</div>
          </div>
        )}
      </div>

      {/* 2. Pipeline Funnel (Card distribution across columns) */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs">
        <h2 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
          <span>Column Pipeline Breakdown</span>
          <span className="text-xs font-normal text-stone-500">({board.columns.length} stages)</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {board.columns.map((col) => {
            const count = col.tasks.length
            const pct = totalCards > 0 ? Math.round((count / totalCards) * 100) : 0

            return (
              <div
                key={col.id}
                className="rounded-lg border border-stone-200/80 bg-stone-50/50 p-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-stone-600 font-semibold mb-1">
                    <span className="truncate" title={col.title}>
                      {col.title}
                    </span>
                    <span className="rounded-full bg-stone-200/80 px-1.5 py-0.2 text-[10px] font-bold text-stone-700">
                      {count}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-400">{pct}% of total cards</div>
                </div>

                <div className="mt-3 w-full bg-stone-200/70 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-600 h-1.5 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Operational Grid: Attention Items & Upcoming Trips / Vehicles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs Attention Feed */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-red-600" />
              <h2 className="text-sm font-bold text-stone-900">Needs Attention</h2>
            </div>
            <span className="text-xs text-stone-400">Urgent & Overdue</span>
          </div>

          {attentionTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-stone-400">
              <CheckCircle2 className="size-8 text-stone-300 mb-2" />
              <p className="text-xs">No urgent or overdue cards right now.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {attentionTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onOpenTask(task.columnId, task.id)}
                  className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-50/80 rounded px-2 -mx-2 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-stone-800 truncate">
                        {task.title}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                          priorityBadges[task.priority].bg
                        } ${priorityBadges[task.priority].text}`}
                      >
                        {priorityBadges[task.priority].label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
                      <span className="font-medium text-stone-600">{task.columnTitle}</span>
                      {task.customerName && (
                        <>
                          <span className="text-stone-300">•</span>
                          <span className="truncate">{task.customerName}</span>
                        </>
                      )}
                      {task.dueDate && (
                        <>
                          <span className="text-stone-300">•</span>
                          <span className={task.dueDate < todayStr ? "text-red-600 font-semibold" : ""}>
                            Due {task.dueDate}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="size-4 text-stone-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modules-aware secondary block: Upcoming Trips OR Vehicles OR Checklists */}
        {modules.tripLogistics ? (
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-amber-600" />
                <h2 className="text-sm font-bold text-stone-900">Upcoming Departures</h2>
              </div>
              <span className="text-xs text-stone-400">Sorted by date</span>
            </div>

            {upcomingTrips.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-stone-400">
                <Calendar className="size-8 text-stone-300 mb-2" />
                <p className="text-xs">No upcoming trip dates set on cards.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {upcomingTrips.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onOpenTask(task.columnId, task.id)}
                    className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-50/80 rounded px-2 -mx-2 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-stone-800 truncate">
                          {task.title}
                        </span>
                        {task.destination && (
                          <span className="text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60 px-1.5 py-0.2 rounded">
                            {task.destination}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
                        <span className="font-semibold text-stone-700">{task.travelStartDate}</span>
                        {task.vehicleType && (
                          <>
                            <span className="text-stone-300">•</span>
                            <span className="flex items-center gap-1">
                              <Car className="size-3 text-stone-400" />
                              {task.vehicleType}
                            </span>
                          </>
                        )}
                        {task.customerName && (
                          <>
                            <span className="text-stone-300">•</span>
                            <span className="truncate">{task.customerName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <ArrowRight className="size-4 text-stone-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Priority Breakdown & Work Overview */
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-stone-900 mb-4">Task Priority Breakdown</h2>

            <div className="space-y-3">
              {(["urgent", "high", "medium", "low"] as Priority[]).map((p) => {
                const count = priorityCounts[p]
                const pct = totalCards > 0 ? Math.round((count / totalCards) * 100) : 0
                const badge = priorityBadges[p]

                return (
                  <div key={p}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold capitalize text-stone-700">{badge.label}</span>
                      <span className="text-stone-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          p === "urgent"
                            ? "bg-red-500"
                            : p === "high"
                            ? "bg-orange-500"
                            : p === "medium"
                            ? "bg-amber-500"
                            : "bg-stone-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
