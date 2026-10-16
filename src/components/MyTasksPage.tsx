import { useState, useMemo } from "react"
import {
  UserCheck,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Kanban,
  User,
  Phone,
  MapPin,
  ListChecks,
  Bell,
  PlayCircle,
  CheckCircle,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useAuthStore } from "../store/authStore"
import { getAllowedBoards } from "../lib/permissions"
import { getTaskAssignees } from "../schemas/board"
import { formatDate } from "../lib/date"
import type { Task, Priority } from "../schemas/board"
import { CardModal } from "./CardModal"

export type TaskStage = "todo" | "in_progress" | "done"

export interface AssignedTaskItem {
  boardId: string
  boardTitle: string
  columnId: string
  columnTitle: string
  columnIndex: number
  totalColumns: number
  stage: TaskStage
  task: Task
  isLeader: boolean
  isOverdue: boolean
  isDueToday: boolean
}

const priorityColors: Record<Priority, { bg: string; text: string; border: string }> = {
  urgent: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  medium: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  low: { bg: "bg-stone-50", text: "text-stone-600", border: "border-stone-200" },
}

export function getTaskStage(columnTitle: string, columnIndex: number, totalColumns: number): TaskStage {
  const lower = columnTitle.toLowerCase().trim()
  if (
    lower.includes("done") ||
    lower.includes("complete") ||
    lower.includes("issued") ||
    lower.includes("closed") ||
    lower.includes("delivered") ||
    lower.includes("finish") ||
    (totalColumns > 1 && columnIndex === totalColumns - 1)
  ) {
    return "done"
  }

  if (
    columnIndex === 0 ||
    lower.includes("to do") ||
    lower.includes("todo") ||
    lower.includes("new") ||
    lower.includes("incoming") ||
    lower.includes("pending") ||
    lower.includes("queue") ||
    lower.includes("received")
  ) {
    return "todo"
  }

  return "in_progress"
}

export function MyTasksPage() {
  const { boards, setActiveBoardId, setCurrentView, setSelectedTask } = useBoardStore()
  const { user, profile } = useAuthStore()

  const [activeTab, setActiveTab] = useState<TaskStage | "all">("todo")
  const [searchQuery, setSearchQuery] = useState("")
  const [boardFilter, setBoardFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [activeModal, setActiveModal] = useState<{ boardId: string; columnId: string; taskId: string } | null>(null)

  const todayStr = new Date().toISOString().split("T")[0]

  // Permitted boards
  const allowedBoards = useMemo(() => getAllowedBoards(boards, profile), [boards, profile])

  // Collect all tasks assigned to current user with stage calculation
  const assignedTasks = useMemo(() => {
    const list: AssignedTaskItem[] = []
    const userIdentifiers = [
      profile?.name?.toLowerCase().trim(),
      user?.email?.toLowerCase().trim(),
      user?.id,
      profile?.id,
    ].filter(Boolean) as string[]

    if (userIdentifiers.length === 0) return list

    for (const b of allowedBoards) {
      if (b.isArchived) continue
      const totalColumns = b.columns.length

      b.columns.forEach((col, colIdx) => {
        const stage = getTaskStage(col.title, colIdx, totalColumns)

        for (const task of col.tasks) {
          const assignees = getTaskAssignees(task).map((a) => a.toLowerCase().trim())
          const isLeader = !!task.leader && userIdentifiers.includes(task.leader.toLowerCase().trim())
          const isAssigned = userIdentifiers.some((id) => assignees.includes(id)) || isLeader

          if (isAssigned) {
            const hasOverdueReminder = task.reminders?.some((r) => !r.completed && r.dueDate < todayStr)
            const isTaskOverdue = !!(task.dueDate && task.dueDate < todayStr)
            const hasDueTodayReminder = task.reminders?.some((r) => !r.completed && r.dueDate === todayStr)
            const isTaskDueToday = !!(task.dueDate && task.dueDate === todayStr)

            list.push({
              boardId: b.id,
              boardTitle: b.title,
              columnId: col.id,
              columnTitle: col.title,
              columnIndex: colIdx,
              totalColumns,
              stage,
              task,
              isLeader,
              isOverdue: isTaskOverdue || !!hasOverdueReminder,
              isDueToday: isTaskDueToday || !!hasDueTodayReminder,
            })
          }
        }
      })
    }
    return list
  }, [allowedBoards, user, profile, todayStr])

  // Metrics summary
  const metrics = useMemo(() => {
    let overdueCount = 0
    let dueTodayCount = 0
    let todoCount = 0
    let inProgressCount = 0
    let doneCount = 0

    for (const item of assignedTasks) {
      if (item.isOverdue) overdueCount++
      if (item.isDueToday) dueTodayCount++

      if (item.stage === "todo") todoCount++
      else if (item.stage === "in_progress") inProgressCount++
      else if (item.stage === "done") doneCount++
    }

    return {
      overdueCount,
      dueTodayCount,
      todoCount,
      inProgressCount,
      doneCount,
      totalCount: assignedTasks.length,
    }
  }, [assignedTasks])

  // Filtered list
  const filteredTasks = useMemo(() => {
    let result = assignedTasks

    // Tab filter: To Do, In Progress, Done, All
    if (activeTab !== "all") {
      result = result.filter((i) => i.stage === activeTab)
    }

    // Board filter
    if (boardFilter !== "all") {
      result = result.filter((i) => i.boardId === boardFilter)
    }

    // Priority filter
    if (priorityFilter !== "all") {
      result = result.filter((i) => i.task.priority === priorityFilter)
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (i) =>
          i.task.title.toLowerCase().includes(q) ||
          i.boardTitle.toLowerCase().includes(q) ||
          i.columnTitle.toLowerCase().includes(q) ||
          i.task.customerName?.toLowerCase().includes(q) ||
          i.task.customerPhone?.toLowerCase().includes(q) ||
          i.task.destination?.toLowerCase().includes(q)
      )
    }

    // Sort: overdue first, then due today, then priority, then due date
    return result.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1
      if (!a.isOverdue && b.isOverdue) return 1
      if (a.isDueToday && !b.isDueToday) return -1
      if (!a.isDueToday && b.isDueToday) return 1

      const priorityOrder: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
      const pDiff = (priorityOrder[a.task.priority] ?? 2) - (priorityOrder[b.task.priority] ?? 2)
      if (pDiff !== 0) return pDiff

      return (a.task.dueDate || "9999").localeCompare(b.task.dueDate || "9999")
    })
  }, [assignedTasks, activeTab, boardFilter, priorityFilter, searchQuery])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-50">
      {/* Top Header */}
      <div className="border-b border-stone-200 bg-white px-4 sm:px-6 py-4 shrink-0 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-2xs">
                <UserCheck className="size-4.5" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-stone-900">
                My Tasks & Operations Workstation
              </h1>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Assigned cards, pending deadlines, and operations alerts for{" "}
              <span className="font-semibold text-stone-800">
                {profile?.name || user?.email?.split("@")[0]}
              </span>
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search my tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-8 pr-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-amber-500 focus:outline-none shadow-2xs"
            />
          </div>
        </div>

        {/* Top KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          <div
            onClick={() => {
              setActiveTab("all")
              setPriorityFilter("urgent")
            }}
            className="p-3 rounded-xl border bg-white border-stone-200 hover:border-red-300 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Overdue / Urgent
              </span>
              <AlertTriangle className="size-3.5 text-red-600" />
            </div>
            <div className="text-xl font-extrabold text-red-600 mt-1">
              {metrics.overdueCount}
            </div>
          </div>

          <div
            onClick={() => setActiveTab("todo")}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              activeTab === "todo"
                ? "bg-amber-50/80 border-amber-300 ring-1 ring-amber-400"
                : "bg-white border-stone-200 hover:border-amber-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                To Do (Pending)
              </span>
              <Clock className="size-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-extrabold text-amber-700 mt-1">
              {metrics.todoCount}
            </div>
          </div>

          <div
            onClick={() => setActiveTab("in_progress")}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              activeTab === "in_progress"
                ? "bg-sky-50/80 border-sky-300 ring-1 ring-sky-400"
                : "bg-white border-stone-200 hover:border-sky-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                In Progress
              </span>
              <PlayCircle className="size-3.5 text-sky-600" />
            </div>
            <div className="text-xl font-extrabold text-sky-700 mt-1">
              {metrics.inProgressCount}
            </div>
          </div>

          <div
            onClick={() => setActiveTab("done")}
            className={`p-3 rounded-xl border transition cursor-pointer ${
              activeTab === "done"
                ? "bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400"
                : "bg-white border-stone-200 hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Done / Completed
              </span>
              <CheckCircle className="size-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold text-emerald-700 mt-1">
              {metrics.doneCount}
            </div>
          </div>
        </div>

        {/* Tab & Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mt-4 pt-3 border-t border-stone-100">
          {/* Tabs: To Do, In Progress, Done, All */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab("todo")
                if (priorityFilter === "urgent") setPriorityFilter("all")
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "todo"
                  ? "bg-white text-stone-900 shadow-2xs font-extrabold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <span>To Do</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "todo" ? "bg-amber-100 text-amber-800" : "bg-stone-200 text-stone-600"
                }`}
              >
                {metrics.todoCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("in_progress")
                if (priorityFilter === "urgent") setPriorityFilter("all")
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "in_progress"
                  ? "bg-white text-stone-900 shadow-2xs font-extrabold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <span>In Progress</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "in_progress" ? "bg-sky-100 text-sky-800" : "bg-stone-200 text-stone-600"
                }`}
              >
                {metrics.inProgressCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("done")
                if (priorityFilter === "urgent") setPriorityFilter("all")
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "done"
                  ? "bg-white text-stone-900 shadow-2xs font-extrabold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <span>Done</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "done" ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"
                }`}
              >
                {metrics.doneCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("all")
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "all"
                  ? "bg-white text-stone-900 shadow-2xs font-extrabold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <span>All</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === "all" ? "bg-stone-200 text-stone-800" : "bg-stone-200/70 text-stone-500"
                }`}
              >
                {metrics.totalCount}
              </span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="size-3.5 text-stone-400" />
              <select
                value={boardFilter}
                onChange={(e) => setBoardFilter(e.target.value)}
                className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700 focus:border-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="all">All Boards</option>
                {allowedBoards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700 focus:border-amber-500 focus:outline-none cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Task List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-stone-400 bg-white rounded-2xl border border-stone-200 p-8 shadow-2xs max-w-md mx-auto mt-6">
            <CheckCircle2 className="size-10 mx-auto text-emerald-500 mb-3" />
            <h3 className="text-sm font-bold text-stone-800">
              {activeTab === "todo"
                ? "No pending tasks in 'To Do'"
                : activeTab === "in_progress"
                ? "No tasks currently 'In Progress'"
                : activeTab === "done"
                ? "No completed tasks yet"
                : "No matching tasks found"}
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              {activeTab === "todo"
                ? "You have cleared your initial task queue."
                : activeTab === "in_progress"
                ? "Move a task to in-progress when you start working on it."
                : activeTab === "done"
                ? "Tasks moved to the final stage of any board will appear here."
                : "No tasks assigned to your account match the selected filters."}
            </p>
          </div>
        ) : (
          filteredTasks.map(({ boardId, boardTitle, columnId, columnTitle, task, isLeader, isOverdue, isDueToday }) => {
            const pStyle = priorityColors[task.priority] || priorityColors.medium
            const checklist = task.checklist || []
            const doneChecklist = checklist.filter((c) => c.done).length
            const reminders = task.reminders || []
            const pendingReminders = reminders.filter((r) => !r.completed)

            return (
              <div
                key={`${boardId}-${columnId}-${task.id}`}
                onClick={() => setActiveModal({ boardId, columnId, taskId: task.id })}
                className={`p-4 rounded-2xl border bg-white shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${
                  isOverdue
                    ? "border-red-200 bg-red-50/20 hover:border-red-400"
                    : isDueToday
                    ? "border-amber-200 bg-amber-50/20 hover:border-amber-400"
                    : "border-stone-200 hover:border-amber-400"
                }`}
              >
                {/* Left Task Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Board and Stage Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200 flex items-center gap-1">
                      <Kanban className="size-3 text-stone-500" />
                      <span>{boardTitle}</span>
                    </span>

                    <span className="text-stone-400">&bull;</span>

                    <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                      {columnTitle}
                    </span>

                    {isLeader && (
                      <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 text-[10px]">
                        Leader
                      </span>
                    )}

                    <span
                      className={`uppercase text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  {/* Task Title */}
                  <h3 className="text-sm font-bold text-stone-900 group-hover:text-amber-700 transition leading-snug">
                    {task.title}
                  </h3>

                  {/* Customer Info & Trip Context */}
                  {(task.customerName || task.destination || task.customerPhone) && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                      {task.customerName && (
                        <span className="flex items-center gap-1 font-semibold text-stone-700">
                          <User className="size-3 text-stone-400" />
                          <span>{task.customerName}</span>
                        </span>
                      )}

                      {task.customerPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3 text-stone-400" />
                          <span>{task.customerPhone}</span>
                        </span>
                      )}

                      {task.destination && (
                        <span className="flex items-center gap-1 text-amber-800 font-medium">
                          <MapPin className="size-3 text-amber-600" />
                          <span>{task.destination}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Checklist & Reminders Tags */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] pt-1">
                    {checklist.length > 0 && (
                      <div className="flex items-center gap-1.5 text-stone-600">
                        <ListChecks className="size-3.5 text-stone-400" />
                        <span className="font-medium">
                          {doneChecklist}/{checklist.length} subtasks
                        </span>
                        <div className="w-16 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${(doneChecklist / checklist.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {pendingReminders.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Bell className="size-3.5 text-amber-600" />
                        {pendingReminders.slice(0, 2).map((rem) => (
                          <span
                            key={rem.id}
                            className="bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1"
                          >
                            <span>{rem.text}</span>
                            {rem.createdBy && (
                              <span className="text-stone-400 text-[9px]">by {rem.createdBy}</span>
                            )}
                          </span>
                        ))}
                        {pendingReminders.length > 2 && (
                          <span className="text-stone-400 text-[10px]">
                            +{pendingReminders.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Status & Actions */}
                <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 self-stretch sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
                  {/* Due Date Indicator */}
                  {task.dueDate ? (
                    <div className="text-right">
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                          <AlertTriangle className="size-3.5" />
                          <span>Overdue ({formatDate(task.dueDate)})</span>
                        </span>
                      ) : isDueToday ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                          <Clock className="size-3.5" />
                          <span>Due Today</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-500">
                          <Calendar className="size-3.5 text-stone-400" />
                          <span>Due {formatDate(task.dueDate)}</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-stone-400">No deadline</span>
                  )}

                  {/* Shortcut to view on Kanban Board */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveBoardId(boardId)
                        setCurrentView("board")
                        setSelectedTask({ boardId, columnId, taskId: task.id })
                      }}
                      title="Switch to Kanban board"
                      className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-amber-800 hover:bg-stone-50 transition cursor-pointer text-xs font-semibold flex items-center gap-1"
                    >
                      <span>Board</span>
                      <ExternalLink className="size-3" />
                    </button>

                    <ChevronRight className="size-4 text-stone-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Embedded In-Place Card Modal */}
      {activeModal && (
        <CardModal
          boardId={activeModal.boardId}
          columnId={activeModal.columnId}
          taskId={activeModal.taskId}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  )
}
