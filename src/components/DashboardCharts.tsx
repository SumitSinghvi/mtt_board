import { useState, useMemo } from "react"
import {
  Users,
  Crown,
  AlertTriangle,
  MapPin,
  Workflow,
  BarChart2,
} from "lucide-react"
import type { Task, Board } from "../schemas/board"
import { getTaskAssignees } from "../schemas/board"
import { useStaffStore } from "../store/staffStore"

export interface FlattenedTask {
  boardId: string
  boardTitle: string
  columnId: string
  columnTitle: string
  task: Task
}

interface DashboardChartsProps {
  tasks: FlattenedTask[]
  boards: Board[]
  onSelectBoard?: (boardId: string) => void
}

export function DashboardCharts({
  tasks,
  boards,
  onSelectBoard,
}: DashboardChartsProps) {
  const { staff } = useStaffStore()
  const [pipelineView, setPipelineView] = useState<"boards" | "destinations">("boards")

  // 1. Staff Workload Aggregation
  const staffWorkload = useMemo(() => {
    const map = new Map<
      string,
      { name: string; role?: string; total: number; lead: number; urgent: number }
    >()

    // Initialize with active staff from store
    for (const member of staff) {
      if (member.status === "active") {
        map.set(member.name, {
          name: member.name,
          role: member.role,
          total: 0,
          lead: 0,
          urgent: 0,
        })
      }
    }

    let unassignedCount = 0
    let unassignedUrgent = 0

    // Accumulate task assignments
    for (const item of tasks) {
      const t = item.task
      const assignees = getTaskAssignees(t)
      const isUrgent = t.priority === "urgent" || t.priority === "high"

      if (assignees.length === 0 && !t.leader) {
        unassignedCount++
        if (isUrgent) unassignedUrgent++
        continue
      }

      // Track leader
      if (t.leader) {
        const existing = map.get(t.leader) || {
          name: t.leader,
          total: 0,
          lead: 0,
          urgent: 0,
        }
        existing.lead += 1
        map.set(t.leader, existing)
      }

      // Track all unique assignees on the card
      const uniqueAssignees = Array.from(new Set([...assignees, ...(t.leader ? [t.leader] : [])]))
      for (const name of uniqueAssignees) {
        const existing = map.get(name) || {
          name,
          total: 0,
          lead: 0,
          urgent: 0,
        }
        existing.total += 1
        if (isUrgent) existing.urgent += 1
        map.set(name, existing)
      }
    }

    // Sort by total descending
    const list = Array.from(map.values()).sort((a, b) => b.total - a.total)

    return {
      list,
      unassignedCount,
      unassignedUrgent,
      maxTotal: Math.max(...list.map((s) => s.total), 1),
    }
  }, [tasks, staff])

  // 2. Board Distribution Aggregation
  const boardDistribution = useMemo(() => {
    const list = boards.map((b) => {
      const cardCount = b.columns.reduce((sum, c) => sum + c.tasks.length, 0)
      const urgentCount = b.columns
        .flatMap((c) => c.tasks)
        .filter((t) => t.priority === "urgent" || t.priority === "high").length
      return {
        id: b.id,
        title: b.title,
        count: cardCount,
        urgentCount,
      }
    })

    list.sort((a, b) => b.count - a.count)
    const totalCards = Math.max(tasks.length, 1)
    const maxCount = Math.max(...list.map((b) => b.count), 1)

    return { list, totalCards, maxCount }
  }, [boards, tasks.length])

  // 3. Top Destinations Aggregation
  const topDestinations = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of tasks) {
      const dest = item.task.destination?.trim()
      if (dest) {
        map.set(dest, (map.get(dest) || 0) + 1)
      }
    }

    const list = Array.from(map.entries())
      .map(([destination, count]) => ({ destination, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7)

    const maxCount = Math.max(...list.map((d) => d.count), 1)
    return { list, maxCount }
  }, [tasks])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart 1: Staff Workload Distribution */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60">
                <Users className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 leading-tight">
                  Staff Workload
                </h3>
                <p className="text-[11px] text-stone-500">
                  Active card allocation & leadership distribution
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
              {staffWorkload.list.length} Members
            </span>
          </div>

          <div className="mt-3.5 space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
            {staffWorkload.list.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">No staff members found.</p>
            ) : (
              staffWorkload.list.map((s) => {
                const percent = Math.round((s.total / staffWorkload.maxTotal) * 100)
                const isOverloaded = s.total >= 8 || s.urgent >= 3

                return (
                  <div key={s.name} className="group">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                        <span className="font-bold text-stone-800 truncate">{s.name}</span>
                        {s.role && (
                          <span className="text-[9px] uppercase font-bold text-stone-400 bg-stone-100 px-1 py-0.2 rounded">
                            {s.role}
                          </span>
                        )}
                        {s.lead > 0 && (
                          <span
                            title={`${s.lead} cards as designated team lead`}
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-full"
                          >
                            <Crown className="size-2.5" />
                            {s.lead}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {s.urgent > 0 && (
                          <span
                            title={`${s.urgent} urgent/high cards`}
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded"
                          >
                            <AlertTriangle className="size-2.5" />
                            {s.urgent}
                          </span>
                        )}
                        <span className="text-xs font-bold text-stone-900 w-6 text-right">
                          {s.total}
                        </span>
                      </div>
                    </div>

                    {/* Workload Progress Bar */}
                    <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOverloaded
                            ? "bg-red-500"
                            : s.total > 0
                            ? "bg-amber-500 group-hover:bg-amber-600"
                            : "bg-stone-300"
                        }`}
                        style={{ width: `${Math.max(percent, 4)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}

            {/* Unassigned Cards Notice if any */}
            {staffWorkload.unassignedCount > 0 && (
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span className="italic flex items-center gap-1 text-[11px]">
                  Unassigned Bookings
                  {staffWorkload.unassignedUrgent > 0 && (
                    <span className="text-red-600 font-semibold">
                      ({staffWorkload.unassignedUrgent} urgent)
                    </span>
                  )}
                </span>
                <span className="font-bold text-stone-600 text-[11px]">
                  {staffWorkload.unassignedCount} cards
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
          <span>👑 = Team Leader Cards</span>
          <span>Max: {staffWorkload.maxTotal} per staff</span>
        </div>
      </div>

      {/* Chart 2: Pipeline & Destination Distribution */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200/60">
                <BarChart2 className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 leading-tight">
                  Volume Breakdown
                </h3>
                <p className="text-[11px] text-stone-500">
                  {pipelineView === "boards" ? "Active workload per pipeline" : "Top booked destinations"}
                </p>
              </div>
            </div>

            {/* Sub-tab Switcher */}
            <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200/60">
              <button
                type="button"
                onClick={() => setPipelineView("boards")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition flex items-center gap-1 ${
                  pipelineView === "boards"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <Workflow className="size-3" />
                Pipelines
              </button>
              <button
                type="button"
                onClick={() => setPipelineView("destinations")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition flex items-center gap-1 ${
                  pipelineView === "destinations"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <MapPin className="size-3" />
                Destinations
              </button>
            </div>
          </div>

          <div className="mt-3.5 space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
            {pipelineView === "boards" ? (
              boardDistribution.list.length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center">No active boards.</p>
              ) : (
                boardDistribution.list.map((b) => {
                  const percent = Math.round((b.count / boardDistribution.maxCount) * 100)
                  const shareOfTotal = Math.round((b.count / boardDistribution.totalCards) * 100)

                  return (
                    <div
                      key={b.id}
                      onClick={() => onSelectBoard?.(b.id)}
                      className={`group ${onSelectBoard ? "cursor-pointer" : ""}`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                          <span className="font-bold text-stone-800 group-hover:text-amber-800 transition truncate">
                            {b.title}
                          </span>
                          {b.urgentCount > 0 && (
                            <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1 py-0.2 rounded">
                              {b.urgentCount} urgent
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-stone-400 font-medium">
                            {shareOfTotal}%
                          </span>
                          <span className="text-xs font-bold text-stone-900 w-6 text-right">
                            {b.count}
                          </span>
                        </div>
                      </div>

                      {/* Distribution Bar */}
                      <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-500 group-hover:bg-sky-600 transition-all duration-300"
                          style={{ width: `${Math.max(percent, 4)}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )
            ) : topDestinations.list.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">
                No destination tags found on active cards yet.
              </p>
            ) : (
              topDestinations.list.map((d) => {
                const percent = Math.round((d.count / topDestinations.maxCount) * 100)
                return (
                  <div key={d.destination} className="group">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="size-3 text-emerald-600 shrink-0" />
                        <span className="font-bold text-stone-800 truncate">{d.destination}</span>
                      </div>
                      <span className="text-xs font-bold text-stone-900 w-6 text-right">
                        {d.count}
                      </span>
                    </div>

                    {/* Destination Bar */}
                    <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 group-hover:bg-emerald-600 transition-all duration-300"
                        style={{ width: `${Math.max(percent, 4)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
          <span>
            {pipelineView === "boards" ? `${boardDistribution.totalCards} Total Cards across Boards` : `${topDestinations.list.length} Tracked Destinations`}
          </span>
          <span>Relative volume scaling</span>
        </div>
      </div>
    </div>
  )
}
