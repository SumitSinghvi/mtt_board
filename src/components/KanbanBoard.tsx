import { useState } from "react"
import {
  Plus,
  Trash2,
  Phone,
  User,
  IndianRupee,
  ArrowRight,
  ArrowLeft,
  PlusCircle,
  FolderPlus,
  GripVertical,
  MapPin,
  Sliders,
  UserCheck,
  Clock,
  MoreHorizontal,
  Pencil,
  LayoutGrid,
  BarChart2,
  Calendar,
  Layers,
  UserCircle,
  AlertTriangle,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useAuthStore } from "../store/authStore"
import { CardModal } from "./CardModal"
import { NewCardModal } from "./NewCardModal"
import { BoardSettingsModal } from "./BoardSettingsModal"
import { BoardDashboard } from "./BoardDashboard"
import { BoardCalendar } from "./BoardCalendar"
import { formatDate } from "../lib/date"
import type { Priority } from "../schemas/board"

const priorityColors: Record<Priority, { bg: string; text: string; border: string }> = {
  urgent: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  low: { bg: "bg-stone-100", text: "text-stone-600", border: "border-stone-200" },
}

type DragType = "task" | "column" | null

export function KanbanBoard() {
  const {
    boards,
    activeBoardId,
    addColumn,
    deleteColumn,
    updateColumnTitle,
    moveColumn,
    deleteTask,
    moveTask,
    selectedTask: globalSelectedTask,
    setSelectedTask: setGlobalSelectedTask,
  } = useBoardStore()
  const { profile } = useAuthStore()

  const activeBoard = boards.find((b) => b.id === activeBoardId) || boards[0]

  // Quick Filter State: all | my_tasks | urgent | due_today
  const [quickFilter, setQuickFilter] = useState<"all" | "my_tasks" | "urgent" | "due_today">("all")

  // Board View Mode (Extensible switcher: board | dashboard | calendar)
  const [activeView, setActiveView] = useState<"board" | "dashboard" | "calendar">("board")

  // Add Column state
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState("")

  // New Card Modal state
  const [newCardColumnId, setNewCardColumnId] = useState<string | null>(null)

  // Board Settings Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Column Actions & Rename state
  const [menuColId, setMenuColId] = useState<string | null>(null)
  const [renamingColId, setRenamingColId] = useState<string | null>(null)
  const [renameTitle, setRenameTitle] = useState("")

  // Drag & drop state
  const [dragType, setDragType] = useState<DragType>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [draggedSourceColId, setDraggedSourceColId] = useState<string | null>(null)
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null)
  const [dragOverColIndex, setDragOverColIndex] = useState<number | null>(null)

  if (!activeBoard) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-stone-500">
        <FolderPlus className="size-12 text-stone-300 mb-3" />
        <h3 className="text-base font-semibold text-stone-800">No Board Selected</h3>
        <p className="text-xs text-stone-500 mt-1">Create or select a board from the sidebar.</p>
      </div>
    )
  }

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newColumnTitle.trim()) return
    addColumn(activeBoard.id, newColumnTitle.trim())
    setNewColumnTitle("")
    setIsAddingColumn(false)
  }

  // Drag handlers
  const handleResetDrag = () => {
    setDragType(null)
    setDraggedTaskId(null)
    setDraggedSourceColId(null)
    setDraggedColIndex(null)
    setDragOverColIndex(null)
  }

  // Column drag handlers
  const onColumnDragStart = (e: React.DragEvent, colIdx: number) => {
    setDragType("column")
    setDraggedColIndex(colIdx)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", `col:${colIdx}`)
  }

  const onColumnDragOver = (e: React.DragEvent, colIdx: number) => {
    e.preventDefault()
    if (dragType === "column" && draggedColIndex !== null && draggedColIndex !== colIdx) {
      setDragOverColIndex(colIdx)
    }
  }

  // Task drag handlers
  const onTaskDragStart = (e: React.DragEvent, taskId: string, sourceColId: string) => {
    e.stopPropagation()
    setDragType("task")
    setDraggedTaskId(taskId)
    setDraggedSourceColId(sourceColId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", `task:${taskId}`)
  }

  // Unified Drop handler
  const onDropContainer = (e: React.DragEvent, targetColIdx: number, targetColId: string) => {
    e.preventDefault()

    if (dragType === "column" && draggedColIndex !== null) {
      if (draggedColIndex !== targetColIdx) {
        moveColumn(activeBoard.id, draggedColIndex, targetColIdx)
      }
    } else if (dragType === "task" && draggedTaskId && draggedSourceColId) {
      moveTask(activeBoard.id, draggedSourceColId, targetColId, draggedTaskId)
    }

    handleResetDrag()
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-stone-100/70">
      {/* Board Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-6 py-3.5">
        <div>
          <h1 className="text-lg font-bold text-stone-900 tracking-tight">
            {activeBoard.title}
          </h1>
          {activeBoard.description && (
            <p className="text-xs text-stone-500 mt-0.5">{activeBoard.description}</p>
          )}
        </div>

        {/* Center: View Switcher & Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher: Board | Dashboard | Calendar */}
          <div className="flex items-center rounded-lg border border-stone-200 bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setActiveView("board")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                activeView === "board"
                  ? "bg-white text-stone-900 shadow-2xs border border-stone-200/70"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <LayoutGrid className="size-3.5 text-amber-700" />
              <span>Board</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                activeView === "dashboard"
                  ? "bg-white text-stone-900 shadow-2xs border border-stone-200/70"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <BarChart2 className="size-3.5 text-amber-700" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                activeView === "calendar"
                  ? "bg-white text-stone-900 shadow-2xs border border-stone-200/70"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <Calendar className="size-3.5 text-amber-700" />
              <span>Calendar</span>
            </button>
          </div>

          {/* Quick Filter Pills (Board View only) */}
          {activeView === "board" && (
            <div className="flex items-center gap-1 pl-1">
              <button
                type="button"
                onClick={() => setQuickFilter("all")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  quickFilter === "all"
                    ? "bg-stone-900 text-white shadow-2xs"
                    : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                All Cards
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter("my_tasks")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  quickFilter === "my_tasks"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <UserCircle className="size-3" />
                <span>My Tasks</span>
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter("urgent")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  quickFilter === "urgent"
                    ? "bg-red-600 text-white shadow-2xs"
                    : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <AlertTriangle className="size-3" />
                <span>Urgent Only</span>
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter("due_today")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  quickFilter === "due_today"
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <Clock className="size-3" />
                <span>Due Today</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Board Settings & Modules button */}
          <button
            type="button"
            title="Board Modules & Settings"
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 transition"
          >
            <Sliders className="size-3.5 text-amber-700" />
            <span>Modules</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Board View vs Dashboard View vs Calendar View */}
      {activeView === "dashboard" ? (
        <BoardDashboard
          board={activeBoard}
          onOpenTask={(columnId, taskId) =>
            setGlobalSelectedTask({
              boardId: activeBoard.id,
              columnId,
              taskId,
            })
          }
        />
      ) : activeView === "calendar" ? (
        <BoardCalendar
          board={activeBoard}
          onOpenTask={(columnId, taskId) =>
            setGlobalSelectedTask({
              boardId: activeBoard.id,
              columnId,
              taskId,
            })
          }
          onQuickAddForDate={() => {
            if (activeBoard.columns.length > 0) {
              setNewCardColumnId(activeBoard.columns[0].id)
            }
          }}
        />
      ) : (
        /* Columns Container (Board View) */
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex items-start gap-4 h-full pb-4">
          {activeBoard.columns.map((column, colIdx) => {
            const isDraggingThisCol = dragType === "column" && draggedColIndex === colIdx
            const isOverThisCol = dragType === "column" && dragOverColIndex === colIdx

            return (
              <div
                key={column.id}
                draggable
                onDragStart={(e) => onColumnDragStart(e, colIdx)}
                onDragOver={(e) => onColumnDragOver(e, colIdx)}
                onDragLeave={() => {
                  if (dragOverColIndex === colIdx) setDragOverColIndex(null)
                }}
                onDrop={(e) => onDropContainer(e, colIdx, column.id)}
                onDragEnd={handleResetDrag}
                className={`flex w-80 shrink-0 flex-col rounded-xl border bg-stone-50/90 shadow-2xs max-h-full transition-all duration-150 ${
                  isDraggingThisCol
                    ? "opacity-40 scale-[0.98] border-amber-400 border-dashed"
                    : isOverThisCol
                    ? "border-amber-500 ring-2 ring-amber-400/50 shadow-md translate-y-[-2px]"
                    : "border-stone-200/80"
                }`}
              >
                {/* Column Header */}
                <div className="relative flex items-center justify-between border-b border-stone-200 px-3 py-2 bg-white/80 rounded-t-xl select-none">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                    {/* Drag Grip Handle */}
                    <div
                      title="Drag column to move left or right"
                      className="cursor-grab active:cursor-grabbing p-0.5 text-stone-400 hover:text-amber-700 transition shrink-0"
                    >
                      <GripVertical className="size-4" />
                    </div>

                    {renamingColId === column.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={renameTitle}
                        onChange={(e) => setRenameTitle(e.target.value)}
                        onBlur={() => {
                          if (renameTitle.trim()) {
                            updateColumnTitle(activeBoard.id, column.id, renameTitle.trim())
                          }
                          setRenamingColId(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (renameTitle.trim()) {
                              updateColumnTitle(activeBoard.id, column.id, renameTitle.trim())
                            }
                            setRenamingColId(null)
                          } else if (e.key === "Escape") {
                            setRenamingColId(null)
                          }
                        }}
                        className="w-full text-xs font-bold text-stone-900 bg-white border border-amber-500 rounded px-1.5 py-0.5 outline-none ring-1 ring-amber-400/50"
                      />
                    ) : (
                      <span
                        onDoubleClick={() => {
                          setRenamingColId(column.id)
                          setRenameTitle(column.title)
                        }}
                        title="Double-click to rename"
                        className="text-xs font-bold text-stone-800 truncate cursor-pointer hover:text-amber-800"
                      >
                        {column.title}
                      </span>
                    )}

                    <span className="rounded-full bg-stone-200/80 px-1.5 py-0.2 text-[10px] font-semibold text-stone-600 shrink-0">
                      {column.tasks.length}
                    </span>
                  </div>

                  {/* Header Actions: Quick + Add Card & Three Dots Action Menu */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      title="Add Card to this column"
                      onClick={() => setNewCardColumnId(column.id)}
                      className="rounded p-1 text-stone-500 hover:bg-stone-200/60 hover:text-stone-800 transition"
                    >
                      <Plus className="size-3.5" />
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        title="Column actions"
                        onClick={() => setMenuColId(menuColId === column.id ? null : column.id)}
                        className={`rounded p-1 text-stone-500 hover:bg-stone-200/60 hover:text-stone-800 transition ${
                          menuColId === column.id ? "bg-stone-200/70 text-stone-900" : ""
                        }`}
                      >
                        <MoreHorizontal className="size-3.5" />
                      </button>

                      {menuColId === column.id && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setMenuColId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1.5 w-44 rounded-lg border border-stone-200 bg-white shadow-lg p-1 z-40 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setMenuColId(null)
                                setNewCardColumnId(column.id)
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-stone-700 hover:bg-amber-50 hover:text-amber-900 transition"
                            >
                              <Plus className="size-3.5 text-stone-400" />
                              <span>Add Card</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setMenuColId(null)
                                setRenamingColId(column.id)
                                setRenameTitle(column.title)
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-stone-700 hover:bg-stone-100 transition"
                            >
                              <Pencil className="size-3.5 text-stone-400" />
                              <span>Rename Column</span>
                            </button>

                            <button
                              type="button"
                              disabled={colIdx === 0}
                              onClick={() => {
                                setMenuColId(null)
                                moveColumn(activeBoard.id, colIdx, colIdx - 1)
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none transition"
                            >
                              <ArrowLeft className="size-3.5 text-stone-400" />
                              <span>Move Left</span>
                            </button>

                            <button
                              type="button"
                              disabled={colIdx === activeBoard.columns.length - 1}
                              onClick={() => {
                                setMenuColId(null)
                                moveColumn(activeBoard.id, colIdx, colIdx + 1)
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none transition"
                            >
                              <ArrowRight className="size-3.5 text-stone-400" />
                              <span>Move Right</span>
                            </button>

                            <div className="my-1 border-t border-stone-100" />

                            <button
                              type="button"
                              onClick={() => {
                                setMenuColId(null)
                                if (confirm(`Delete column "${column.title}" and its cards?`)) {
                                  deleteColumn(activeBoard.id, column.id)
                                }
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-red-600 hover:bg-red-50 transition"
                            >
                              <Trash2 className="size-3.5 text-red-500" />
                              <span>Delete Column</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tasks List */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                  {column.tasks
                    .filter((task) => {
                      if (quickFilter === "all") return true
                      if (quickFilter === "my_tasks") {
                        if (!profile?.name) return true
                        return (
                          task.assignee?.toLowerCase() === profile.name.toLowerCase() ||
                          task.checklist?.some(
                            (c) => c.assignee?.toLowerCase() === profile.name.toLowerCase()
                          )
                        )
                      }
                      if (quickFilter === "urgent") {
                        return task.priority === "urgent" || task.priority === "high"
                      }
                      if (quickFilter === "due_today") {
                        const todayStr = new Date().toISOString().split("T")[0]
                        return task.dueDate?.startsWith(todayStr)
                      }
                      return true
                    })
                    .map((task) => {
                      const checklistItems = task.checklist || []
                      const doneChecklist = checklistItems.filter((c) => c.done).length

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => onTaskDragStart(e, task.id, column.id)}
                          onDragEnd={handleResetDrag}
                          onClick={() =>
                            setGlobalSelectedTask({
                              boardId: activeBoard.id,
                              columnId: column.id,
                              taskId: task.id,
                            })
                          }
                          className="group rounded-lg border border-stone-200/90 bg-white p-3 shadow-2xs transition hover:border-amber-400 hover:shadow-xs cursor-pointer active:cursor-grabbing"
                        >
                          {/* Priority & Delete */}
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              priorityColors[task.priority].bg
                            } ${priorityColors[task.priority].text} ${
                              priorityColors[task.priority].border
                            }`}
                          >
                            {task.priority}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteTask(activeBoard.id, column.id, task.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 rounded p-1 text-stone-400 hover:text-red-600 transition"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-semibold text-stone-900 leading-snug group-hover:text-amber-800 transition-colors">
                          {task.title}
                        </h4>

                        {/* Description */}
                        {task.description && (
                          <p className="mt-1 text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Destination tag (if set) */}
                        {task.destination && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-amber-700 truncate">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{task.destination}</span>
                          </div>
                        )}

                        {/* Meta Tags: Assignee & Due Date */}
                        {(task.assignee || task.dueDate) && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {task.assignee && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded">
                                <UserCheck className="size-3 text-stone-500" />
                                <span>{task.assignee}</span>
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-stone-500">
                                <Clock className="size-3 text-stone-400" />
                                <span>{formatDate(task.dueDate)}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Customer & Amount details */}
                        {(task.customerName || task.amount || task.customerPhone) && (
                          <div className="mt-2.5 pt-2 border-t border-stone-100 space-y-1">
                            {task.customerName && (
                              <div className="flex items-center gap-1.5 text-[11px] text-stone-700">
                                <User className="size-3 text-stone-400" />
                                <span className="font-medium">{task.customerName}</span>
                              </div>
                            )}
                            {task.customerPhone && (
                              <div className="flex items-center gap-1.5 text-[11px] text-stone-600">
                                <Phone className="size-3 text-stone-400" />
                                <a
                                  href={`tel:${task.customerPhone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="hover:text-amber-600 hover:underline"
                                >
                                  {task.customerPhone}
                                </a>
                              </div>
                            )}
                            {task.amount !== undefined ? (
                              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-800">
                                <div className="flex items-center gap-0.5">
                                  <IndianRupee className="size-3 text-emerald-600" />
                                  <span>{task.amount.toLocaleString("en-IN")}</span>
                                </div>
                                {checklistItems.length > 0 && (
                                  <div
                                    title={`${doneChecklist} of ${checklistItems.length} sub-cards done`}
                                    className="flex items-center gap-1 text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded font-medium"
                                  >
                                    <Layers className="size-3 text-amber-600" />
                                    <span>
                                      {doneChecklist}/{checklistItems.length}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : checklistItems.length > 0 ? (
                              <div className="flex items-center justify-end text-[11px]">
                                <div
                                  title={`${doneChecklist} of ${checklistItems.length} sub-cards done`}
                                  className="flex items-center gap-1 text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded font-medium"
                                >
                                  <Layers className="size-3 text-amber-600" />
                                  <span>
                                    {doneChecklist}/{checklistItems.length} sub-cards
                                  </span>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {/* Quick Move controls */}
                        <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-stone-50 text-[10px] text-stone-400">
                          <div>
                            {colIdx > 0 && (
                              <button
                                type="button"
                                title={`Move to ${activeBoard.columns[colIdx - 1].title}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveTask(
                                    activeBoard.id,
                                    column.id,
                                    activeBoard.columns[colIdx - 1].id,
                                    task.id
                                  )
                                }}
                                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                              >
                                <ArrowLeft className="size-3" />
                                <span>{activeBoard.columns[colIdx - 1].title}</span>
                              </button>
                            )}
                          </div>

                          <div>
                            {colIdx < activeBoard.columns.length - 1 && (
                              <button
                                type="button"
                                title={`Move to ${activeBoard.columns[colIdx + 1].title}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveTask(
                                    activeBoard.id,
                                    column.id,
                                    activeBoard.columns[colIdx + 1].id,
                                    task.id
                                  )
                                }}
                                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                              >
                                <span>{activeBoard.columns[colIdx + 1].title}</span>
                                <ArrowRight className="size-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {column.tasks.length === 0 && (
                    <div className="py-6 text-center text-[11px] text-stone-400 border border-dashed border-stone-200 rounded-lg">
                      No cards here
                    </div>
                  )}
                </div>

                {/* Column Footer */}
                <div className="p-2 border-t border-stone-200 bg-white/50 rounded-b-xl">
                  <button
                    type="button"
                    onClick={() => setNewCardColumnId(column.id)}
                    className="flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200/60 transition"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Card</span>
                  </button>
                </div>
              </div>
            )
          })}

          {/* Add Column Button / Form */}
          {isAddingColumn ? (
            <div className="w-80 shrink-0 rounded-xl border border-stone-300 bg-white p-3 shadow-xs">
              <form onSubmit={handleAddColumn} className="space-y-2">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Column Title (e.g. In Review, Invoiced)"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  className="w-full rounded border border-stone-300 px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingColumn(false)}
                    className="rounded px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
                  >
                    Add Column
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="flex h-12 w-80 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 text-xs font-semibold text-stone-600 hover:border-amber-500 hover:text-amber-700 hover:bg-amber-50/50 transition"
            >
              <PlusCircle className="size-4" />
              <span>Add New Column</span>
            </button>
          )}
        </div>
      </div>
      )}

      {/* Board Settings & Modules Modal */}
      {isSettingsOpen && (
        <BoardSettingsModal
          boardId={activeBoard.id}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Centered Add Card Modal */}
      {newCardColumnId && (
        <NewCardModal
          boardId={activeBoard.id}
          defaultColumnId={newCardColumnId}
          onClose={() => setNewCardColumnId(null)}
        />
      )}

      {/* Centered Card Details Modal */}
      {globalSelectedTask && (
        <CardModal
          boardId={globalSelectedTask.boardId}
          columnId={globalSelectedTask.columnId}
          taskId={globalSelectedTask.taskId}
          onClose={() => setGlobalSelectedTask(null)}
        />
      )}
    </div>
  )
}
