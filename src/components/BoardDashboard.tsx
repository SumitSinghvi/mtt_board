import { useState } from "react"
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Hotel,
  IndianRupee,
} from "lucide-react"
import { formatDate } from "../lib/date"
import { type Board, type Priority, getPaymentSummary } from "../schemas/board"

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
    subtasks: true,
    hotelBooking: false,
    paymentTracking: false,
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

  // Subtasks aggregates
  const allChecklistItems = allTasksWithCol.flatMap((t) => t.checklist || [])
  const totalSubtasks = allChecklistItems.length
  const doneSubtasks = allChecklistItems.filter((i) => i.done).length
  const subtaskPct = totalSubtasks > 0 ? Math.round((doneSubtasks / totalSubtasks) * 100) : 0

  // Hotel Booking aggregates
  const hotelTasks = allTasksWithCol.filter(
    (t) => t.hotelBooking && t.hotelBooking.status && t.hotelBooking.status !== "none"
  )
  const hotelCounts = {
    hold: hotelTasks.filter((t) => t.hotelBooking?.status === "hold").length,
    blocked: hotelTasks.filter((t) => t.hotelBooking?.status === "blocked").length,
    confirmed: hotelTasks.filter((t) => t.hotelBooking?.status === "confirmed").length,
  }
  const pendingHotelFollowups = hotelTasks
    .filter((t) => t.hotelBooking?.status === "hold" || t.hotelBooking?.status === "blocked")
    .sort((a, b) => {
      const aDate = a.hotelBooking?.holdUntil || "9999"
      const bDate = b.hotelBooking?.holdUntil || "9999"
      return aDate.localeCompare(bDate)
    })

  // Payment aggregates
  const paymentTasks = allTasksWithCol.filter(
    (t) => t.paymentTracking || t.amount !== undefined
  )
  const paymentSummaries = paymentTasks.map((t) => ({
    task: t,
    summary: getPaymentSummary(t.paymentTracking, t.amount),
  }))
  const totalReceived = paymentSummaries.reduce((acc, curr) => acc + curr.summary.received, 0)
  const totalPending = paymentSummaries.reduce((acc, curr) => acc + curr.summary.pending, 0)
  const fullyPaidCount = paymentSummaries.filter((p) => p.summary.isFullyPaid).length
  const pendingCollectionTasks = paymentSummaries
    .filter((p) => p.summary.pending > 0)
    .sort((a, b) => b.summary.pending - a.summary.pending)

  // Attention Needed List: Urgent / High priority or past due / due soon
  const [todayStr] = useState(getTodayDateStr)
  const attentionTasks = allTasksWithCol.filter((t) => {
    const isUrgent = t.priority === "urgent" || t.priority === "high"
    const isOverdue = t.dueDate && t.dueDate < todayStr
    return isUrgent || isOverdue
  }).slice(0, 6)

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* 1. Adaptive KPI Cards Grid */}
      <div
        className={`grid grid-cols-1 ${
          modules.hotelBooking ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"
        } gap-3 sm:gap-4`}
      >
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

        {/* Priority KPI */}
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

        {/* Subtasks Completion KPI */}
        {modules.subtasks ? (
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
              <span className="text-xs font-semibold uppercase tracking-wider">Workflow Columns</span>
              <TrendingUp className="size-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-stone-900">{board.columns.length}</span>
              <span className="text-xs text-stone-500">active stages</span>
            </div>
          </div>
        )}

        {/* Hotel Booking KPI (when module enabled) */}
        {modules.hotelBooking && (
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Hotel Bookings</span>
              <Hotel className="size-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-stone-900">
                {hotelCounts.hold + hotelCounts.blocked + hotelCounts.confirmed}
              </span>
              <span className="text-xs text-stone-500">reservations</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold flex-wrap">
              <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5">
                <span className="size-1.5 rounded-full bg-amber-500" />
                {hotelCounts.hold} Hold
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5">
                <span className="size-1.5 rounded-full bg-purple-500" />
                {hotelCounts.blocked} Blocked
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {hotelCounts.confirmed} Confirmed
              </span>
            </div>
          </div>
        )}

        {/* Payment Tracking KPI (when module enabled) */}
        {modules.paymentTracking && (
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Payment Collections</span>
              <IndianRupee className="size-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-stone-900">
                ₹{totalReceived.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-stone-500">received</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold flex-wrap">
              <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5">
                <span>₹{totalPending.toLocaleString("en-IN")} Pending</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {fullyPaidCount} Paid Full
              </span>
              {pendingCollectionTasks.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded bg-stone-100 text-stone-600 border border-stone-200 px-1.5 py-0.5">
                  {pendingCollectionTasks.length} Pending
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Operational Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Payment & Installment Tracking (when module enabled) */}
        {modules.paymentTracking && (
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <IndianRupee className="size-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-stone-900">Payment & Installment Collections</h2>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Total Collected: ₹{totalReceived.toLocaleString("en-IN")}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Pending: ₹{totalPending.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {pendingCollectionTasks.length === 0 ? (
              <div className="py-6 text-center text-stone-400">
                <CheckCircle2 className="size-7 mx-auto text-emerald-500 mb-1.5 opacity-80" />
                <p className="text-xs">All card payments are fully settled. No pending balances.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {pendingCollectionTasks.slice(0, 6).map(({ task, summary }) => (
                  <div
                    key={task.id}
                    onClick={() => onOpenTask(task.columnId, task.id)}
                    className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-50/80 rounded px-2 -mx-2 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-stone-900 truncate">
                          {task.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                            summary.isPartiallyPaid
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : "bg-stone-100 text-stone-600 border-stone-200"
                          }`}
                        >
                          {summary.paidCount}/3 Received
                        </span>
                        {task.customerName && (
                          <span className="text-xs text-stone-500 truncate">
                            • {task.customerName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-[11px] text-stone-500">
                        <span>
                          In <strong className="text-stone-700">{task.columnTitle}</strong>
                        </span>
                        <span>
                          Package: <strong className="text-stone-800">₹{summary.total.toLocaleString("en-IN")}</strong>
                        </span>
                        <span>
                          Received: <strong className="text-emerald-700">₹{summary.received.toLocaleString("en-IN")}</strong>
                        </span>
                        <span>
                          Pending: <strong className="text-amber-700">₹{summary.pending.toLocaleString("en-IN")}</strong>
                        </span>
                      </div>
                    </div>

                    <ArrowRight className="size-4 text-stone-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Hotel Follow-ups & Room Holds (when module enabled) */}
        {modules.hotelBooking && (
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Hotel className="size-4 text-amber-600" />
                <h2 className="text-sm font-bold text-stone-900">Hotel Follow-ups & Room Holds</h2>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {hotelCounts.hold} on Hold
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {hotelCounts.blocked} Blocked
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {hotelCounts.confirmed} Confirmed
                </span>
              </div>
            </div>

            {pendingHotelFollowups.length === 0 ? (
              <div className="py-6 text-center text-stone-400">
                <CheckCircle2 className="size-7 mx-auto text-emerald-500 mb-1.5 opacity-80" />
                <p className="text-xs">No active hotel holds or blocked bookings pending follow-up.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {pendingHotelFollowups.map((task) => {
                  const bkg = task.hotelBooking!
                  const isExpired = bkg.status === "hold" && bkg.holdUntil && bkg.holdUntil < todayStr
                  const isToday = bkg.holdUntil === todayStr
                  return (
                    <div
                      key={task.id}
                      onClick={() => onOpenTask(task.columnId, task.id)}
                      className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-50/80 rounded px-2 -mx-2 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-stone-900 truncate">
                            {task.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                              bkg.status === "hold"
                                ? isExpired
                                  ? "bg-red-50 text-red-700 border-red-300"
                                  : "bg-amber-100/90 text-amber-900 border-amber-300"
                                : "bg-purple-100/90 text-purple-900 border-purple-300"
                            }`}
                          >
                            {bkg.status}
                          </span>
                          {bkg.hotelName && (
                            <span className="text-xs text-stone-600 font-medium truncate">
                              • {bkg.hotelName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
                          <span>
                            In <strong className="text-stone-700">{task.columnTitle}</strong>
                          </span>
                          {task.customerName && (
                            <>
                              <span className="text-stone-300">•</span>
                              <span className="truncate">{task.customerName}</span>
                            </>
                          )}
                          {bkg.holdUntil && (
                            <>
                              <span className="text-stone-300">•</span>
                              <span
                                className={`inline-flex items-center gap-1 ${
                                  isExpired
                                    ? "text-red-600 font-bold"
                                    : isToday
                                    ? "text-amber-700 font-semibold"
                                    : "text-stone-500"
                                }`}
                              >
                                <Clock className="size-3" />
                                {isExpired
                                  ? `Cutoff Passed (${formatDate(bkg.holdUntil)})`
                                  : isToday
                                  ? "Cutoff Today!"
                                  : `Cutoff ${formatDate(bkg.holdUntil)}`}
                              </span>
                            </>
                          )}
                          {bkg.confirmationNo && (
                            <>
                              <span className="text-stone-300">•</span>
                              <span className="font-mono text-[10px] text-stone-400">
                                Ref: {bkg.confirmationNo}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <ArrowRight className="size-4 text-stone-400 shrink-0" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        {/* Needs Attention Column */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-red-500" />
              <h2 className="text-sm font-bold text-stone-900">Needs Immediate Action</h2>
            </div>
            <span className="text-xs text-stone-400">
              {attentionTasks.length} pending
            </span>
          </div>

          {attentionTasks.length === 0 ? (
            <div className="py-8 text-center text-stone-400">
              <CheckCircle2 className="size-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="text-xs">No overdue or high-urgency cards.</p>
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
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                          priorityBadges[task.priority].bg
                        } ${priorityBadges[task.priority].text}`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
                      <span>In <strong className="text-stone-700">{task.columnTitle}</strong></span>
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
                            Due {formatDate(task.dueDate)}
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

        {/* Priority Breakdown */}
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
                      className="h-2 rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor:
                          p === "urgent"
                            ? "#ef4444"
                            : p === "high"
                            ? "#f97316"
                            : p === "medium"
                            ? "#f59e0b"
                            : "#a8a29e",
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
