import { useState, useCallback } from "react"
import { FolderPlus, PlusCircle, Archive, ArchiveRestore } from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useAuthStore } from "../store/authStore"
import { getUserPermissions } from "../lib/permissions"
import { CardModal } from "./CardModal"
import { NewCardModal } from "./NewCardModal"
import { BoardSettingsModal } from "./BoardSettingsModal"
import { BoardDashboard } from "./BoardDashboard"
import { BoardCalendar } from "./BoardCalendar"
import { KanbanBoardHeader } from "./kanban/KanbanBoardHeader"
import { KanbanColumn } from "./kanban/KanbanColumn"

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
    unarchiveBoard,
    selectedTask: globalSelectedTask,
    setSelectedTask: setGlobalSelectedTask,
  } = useBoardStore()

  const activeBoard = boards.find((b) => b.id === activeBoardId) || boards[0]
  const isArchived = !!activeBoard?.isArchived

  const { profile } = useAuthStore()
  const permissions = getUserPermissions(profile)
  const isAdmin = profile?.role === "admin" || !profile

  // Board View Mode
  const [activeView, setActiveView] = useState<"board" | "dashboard" | "calendar">("board")

  // Add Column state
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState("")

  // Modals state
  const [newCardColumnId, setNewCardColumnId] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Drag & drop state
  const [dragType, setDragType] = useState<DragType>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [draggedSourceColId, setDraggedSourceColId] = useState<string | null>(null)
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null)
  const [dragOverColIndex, setDragOverColIndex] = useState<number | null>(null)

  const handleResetDrag = useCallback(() => {
    setDragType(null)
    setDraggedTaskId(null)
    setDraggedSourceColId(null)
    setDraggedColIndex(null)
    setDragOverColIndex(null)
  }, [])

  const onColumnDragStart = useCallback((e: React.DragEvent, colIdx: number) => {
    if (isArchived) return
    setDragType("column")
    setDraggedColIndex(colIdx)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", `col:${colIdx}`)
  }, [isArchived])

  const onColumnDragOver = useCallback((e: React.DragEvent, colIdx: number) => {
    if (isArchived) return
    e.preventDefault()
    setDragOverColIndex((prev) => (prev !== colIdx ? colIdx : prev))
  }, [isArchived])

  const onTaskDragStart = useCallback((e: React.DragEvent, taskId: string, sourceColId: string) => {
    if (isArchived) return
    e.stopPropagation()
    setDragType("task")
    setDraggedTaskId(taskId)
    setDraggedSourceColId(sourceColId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", `task:${taskId}`)
  }, [isArchived])

  const onDropContainer = useCallback((e: React.DragEvent, targetColIdx: number, targetColId: string) => {
    if (isArchived || !activeBoard) return
    e.preventDefault()

    if (dragType === "column" && draggedColIndex !== null) {
      if (isAdmin && draggedColIndex !== targetColIdx) {
        moveColumn(activeBoard.id, draggedColIndex, targetColIdx)
      }
    } else if (dragType === "task" && draggedTaskId && draggedSourceColId) {
      moveTask(activeBoard.id, draggedSourceColId, targetColId, draggedTaskId)
    }

    handleResetDrag()
  }, [isArchived, activeBoard, dragType, draggedColIndex, draggedTaskId, draggedSourceColId, isAdmin, moveColumn, moveTask, handleResetDrag])

  const handleSelectTask = useCallback((taskId: string, columnId: string) => {
    if (!activeBoard) return
    setGlobalSelectedTask({
      boardId: activeBoard.id,
      columnId,
      taskId,
    })
  }, [activeBoard, setGlobalSelectedTask])

  const handleDeleteTask = useCallback((columnId: string, taskId: string) => {
    if (!activeBoard) return
    deleteTask(activeBoard.id, columnId, taskId)
  }, [activeBoard, deleteTask])

  const handleMoveTaskDirect = useCallback((columnId: string, taskId: string, targetColId: string) => {
    if (!activeBoard) return
    moveTask(activeBoard.id, columnId, targetColId, taskId)
  }, [activeBoard, moveTask])

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

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-stone-100/70">
      {/* Board Header Bar */}
      <KanbanBoardHeader
        boardTitle={activeBoard.title}
        boardDescription={activeBoard.description}
        activeView={activeView}
        isAdmin={isAdmin}
        onViewChange={setActiveView}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Archived Read-Only Notice Banner */}
      {isArchived && (
        <div className="bg-amber-100/90 border-b border-amber-300 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 shrink-0">
          <div className="flex items-center gap-2">
            <Archive className="size-4 text-amber-700 shrink-0" />
            <span>
              <strong>Archived Board (Read-Only)</strong> — You are viewing an archived workflow. Cards and columns cannot be added, edited, or moved.
            </span>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => unarchiveBoard(activeBoard.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-600 text-white font-semibold hover:bg-amber-700 transition shadow-2xs cursor-pointer"
            >
              <ArchiveRestore className="size-3.5" />
              <span>Restore Board</span>
            </button>
          )}
        </div>
      )}

      {/* Main Content Area */}
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
            if (permissions.canCreateCards && activeBoard.columns.length > 0) {
              setNewCardColumnId(activeBoard.columns[0].id)
            }
          }}
        />
      ) : (
        /* Columns Container (Board View) */
        <div className="flex-1 overflow-x-auto p-3 sm:p-4 md:p-6">
          <div className="flex items-start gap-3 sm:gap-4 h-full pb-4">
            {activeBoard.columns.map((column, colIdx) => (
              <KanbanColumn
                key={column.id}
                column={column}
                colIdx={colIdx}
                totalColumns={activeBoard.columns.length}
                prevColumnTitle={colIdx > 0 ? activeBoard.columns[colIdx - 1].title : undefined}
                prevColumnId={colIdx > 0 ? activeBoard.columns[colIdx - 1].id : undefined}
                nextColumnTitle={
                  colIdx < activeBoard.columns.length - 1
                    ? activeBoard.columns[colIdx + 1].title
                    : undefined
                }
                nextColumnId={
                  colIdx < activeBoard.columns.length - 1
                    ? activeBoard.columns[colIdx + 1].id
                    : undefined
                }
                canCreateCards={!isArchived && permissions.canCreateCards}
                canDeleteCards={!isArchived && permissions.canDeleteCards}
                canViewCommercials={permissions.canViewCommercials}
                canEditCards={!isArchived && permissions.canEditCards}
                isAdmin={!isArchived && isAdmin}
                isDraggingThisCol={dragType === "column" && draggedColIndex === colIdx}
                isOverThisCol={dragType === "column" && dragOverColIndex === colIdx}
                onColumnDragStart={onColumnDragStart}
                onColumnDragOver={onColumnDragOver}
                onColumnDragLeave={() => {
                  if (dragOverColIndex === colIdx) setDragOverColIndex(null)
                }}
                onDropContainer={onDropContainer}
                onResetDrag={handleResetDrag}
                onUpdateColumnTitle={(colId, title) => updateColumnTitle(activeBoard.id, colId, title)}
                onMoveColumn={(fromIdx, toIdx) => moveColumn(activeBoard.id, fromIdx, toIdx)}
                onDeleteColumn={(colId, title) => {
                  if (confirm(`Delete column "${title}" and its cards?`)) {
                    deleteColumn(activeBoard.id, colId)
                  }
                }}
                onAddCardClick={(colId) => setNewCardColumnId(colId)}
                onTaskDragStart={onTaskDragStart}
                onSelectTask={(taskId) => handleSelectTask(taskId, column.id)}
                onDeleteTask={(taskId) => handleDeleteTask(column.id, taskId)}
                onMoveTask={(taskId, targetColId) => handleMoveTaskDirect(column.id, taskId, targetColId)}
              />
            ))}

            {/* Add Column Button / Form (Admin Only, Active Boards Only) */}
            {!isArchived && isAdmin && (
              isAddingColumn ? (
                <div className="w-[82vw] max-w-xs sm:w-80 shrink-0 rounded-xl border border-stone-300 bg-white p-3 shadow-xs">
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
                  className="flex h-12 w-[82vw] max-w-xs sm:w-80 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 text-xs font-semibold text-stone-600 hover:border-amber-500 hover:text-amber-700 hover:bg-amber-50/50 transition"
                >
                  <PlusCircle className="size-4" />
                  <span>Add New Column</span>
                </button>
              )
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
