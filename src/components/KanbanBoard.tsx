import { useState } from "react"
import { FolderPlus, PlusCircle } from "lucide-react"
import { useBoardStore } from "../store/boardStore"
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
    selectedTask: globalSelectedTask,
    setSelectedTask: setGlobalSelectedTask,
  } = useBoardStore()

  const activeBoard = boards.find((b) => b.id === activeBoardId) || boards[0]

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

  const handleResetDrag = () => {
    setDragType(null)
    setDraggedTaskId(null)
    setDraggedSourceColId(null)
    setDraggedColIndex(null)
    setDragOverColIndex(null)
  }

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

  const onTaskDragStart = (e: React.DragEvent, taskId: string, sourceColId: string) => {
    e.stopPropagation()
    setDragType("task")
    setDraggedTaskId(taskId)
    setDraggedSourceColId(sourceColId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", `task:${taskId}`)
  }

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
      <KanbanBoardHeader
        boardTitle={activeBoard.title}
        boardDescription={activeBoard.description}
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

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
            if (activeBoard.columns.length > 0) {
              setNewCardColumnId(activeBoard.columns[0].id)
            }
          }}
        />
      ) : (
        /* Columns Container (Board View) */
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex items-start gap-4 h-full pb-4">
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
                onSelectTask={(taskId) =>
                  setGlobalSelectedTask({
                    boardId: activeBoard.id,
                    columnId: column.id,
                    taskId,
                  })
                }
                onDeleteTask={(taskId) => deleteTask(activeBoard.id, column.id, taskId)}
                onMoveTask={(taskId, targetColId) =>
                  moveTask(activeBoard.id, column.id, targetColId, taskId)
                }
              />
            ))}

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
