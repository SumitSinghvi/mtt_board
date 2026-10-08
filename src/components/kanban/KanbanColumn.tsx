import { useState, memo } from "react"
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  GripVertical,
  MoreHorizontal,
  Pencil,
} from "lucide-react"
import { KanbanCard } from "./KanbanCard"
import type { Column } from "../../schemas/board"

interface KanbanColumnProps {
  column: Column
  colIdx: number
  totalColumns: number
  prevColumnTitle?: string
  prevColumnId?: string
  nextColumnTitle?: string
  nextColumnId?: string
  isDraggingThisCol: boolean
  isOverThisCol: boolean
  onColumnDragStart: (e: React.DragEvent, colIdx: number) => void
  onColumnDragOver: (e: React.DragEvent, colIdx: number) => void
  onColumnDragLeave: () => void
  onDropContainer: (e: React.DragEvent, colIdx: number, columnId: string) => void
  onResetDrag: () => void
  onUpdateColumnTitle: (columnId: string, title: string) => void
  onMoveColumn: (fromIdx: number, toIdx: number) => void
  onDeleteColumn: (columnId: string, title: string) => void
  canCreateCards?: boolean
  canDeleteCards?: boolean
  canViewCommercials?: boolean
  canEditCards?: boolean
  isAdmin?: boolean
  onAddCardClick: (columnId: string) => void
  onTaskDragStart: (e: React.DragEvent, taskId: string, sourceColId: string) => void
  onSelectTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onMoveTask: (taskId: string, targetColId: string) => void
}

export const KanbanColumn = memo(function KanbanColumn({
  column,
  colIdx,
  totalColumns,
  prevColumnTitle,
  prevColumnId,
  nextColumnTitle,
  nextColumnId,
  canCreateCards = true,
  canDeleteCards = true,
  canViewCommercials = true,
  canEditCards = true,
  isAdmin = false,
  isDraggingThisCol,
  isOverThisCol,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDragLeave,
  onDropContainer,
  onResetDrag,
  onUpdateColumnTitle,
  onMoveColumn,
  onDeleteColumn,
  onAddCardClick,
  onTaskDragStart,
  onSelectTask,
  onDeleteTask,
  onMoveTask,
}: KanbanColumnProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameTitle, setRenameTitle] = useState(column.title)

  const handleFinishRename = () => {
    if (renameTitle.trim() && renameTitle.trim() !== column.title) {
      onUpdateColumnTitle(column.id, renameTitle.trim())
    }
    setIsRenaming(false)
  }

  return (
    <div
      draggable={isAdmin}
      onDragStart={(e) => {
        if (!isAdmin) return
        onColumnDragStart(e, colIdx)
      }}
      onDragOver={(e) => {
        if (!isAdmin) return
        onColumnDragOver(e, colIdx)
      }}
      onDragLeave={onColumnDragLeave}
      onDrop={(e) => {
        if (!isAdmin) return
        onDropContainer(e, colIdx, column.id)
      }}
      onDragEnd={onResetDrag}
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
          {isAdmin && (
            <div
              title="Drag column to move left or right"
              className="cursor-grab active:cursor-grabbing p-0.5 text-stone-400 hover:text-amber-700 transition shrink-0"
            >
              <GripVertical className="size-4" />
            </div>
          )}

          {isRenaming ? (
            <input
              type="text"
              autoFocus
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleFinishRename()
                } else if (e.key === "Escape") {
                  setRenameTitle(column.title)
                  setIsRenaming(false)
                }
              }}
              className="w-full text-xs font-bold text-stone-900 bg-white border border-amber-500 rounded px-1.5 py-0.5 outline-none ring-1 ring-amber-400/50"
            />
          ) : (
            <span
              onDoubleClick={() => {
                if (!isAdmin) return
                setRenameTitle(column.title)
                setIsRenaming(true)
              }}
              title={isAdmin ? "Double-click to rename" : undefined}
              className={`text-xs font-bold text-stone-800 truncate ${
                isAdmin ? "cursor-pointer hover:text-amber-800" : ""
              }`}
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
          {canCreateCards && (
            <button
              type="button"
              title="Add Card to this column"
              onClick={() => onAddCardClick(column.id)}
              className="rounded p-1 text-stone-500 hover:bg-stone-200/60 hover:text-stone-800 transition"
            >
              <Plus className="size-3.5" />
            </button>
          )}

          {isAdmin && (
            <div className="relative">
              <button
                type="button"
                title="Column actions"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className={`rounded p-1 text-stone-500 hover:bg-stone-200/60 hover:text-stone-800 transition ${
                  isMenuOpen ? "bg-stone-200/70 text-stone-900" : ""
                }`}
              >
                <MoreHorizontal className="size-3.5" />
              </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-lg border border-stone-200 bg-white shadow-lg p-1 z-40 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false)
                      onAddCardClick(column.id)
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-stone-700 hover:bg-amber-50 hover:text-amber-900 transition"
                  >
                    <Plus className="size-3.5 text-stone-400" />
                    <span>Add Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false)
                      setRenameTitle(column.title)
                      setIsRenaming(true)
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
                      setIsMenuOpen(false)
                      onMoveColumn(colIdx, colIdx - 1)
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none transition"
                  >
                    <ArrowLeft className="size-3.5 text-stone-400" />
                    <span>Move Left</span>
                  </button>

                  <button
                    type="button"
                    disabled={colIdx === totalColumns - 1}
                    onClick={() => {
                      setIsMenuOpen(false)
                      onMoveColumn(colIdx, colIdx + 1)
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
                      setIsMenuOpen(false)
                      onDeleteColumn(column.id, column.title)
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
        )}
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {column.tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            columnId={column.id}
            colIdx={colIdx}
            totalColumns={totalColumns}
            prevColumnTitle={prevColumnTitle}
            prevColumnId={prevColumnId}
            nextColumnTitle={nextColumnTitle}
            nextColumnId={nextColumnId}
            canDeleteCard={canDeleteCards}
            canViewCommercials={canViewCommercials}
            canEditCard={canEditCards}
            onTaskDragStart={onTaskDragStart}
            onResetDrag={onResetDrag}
            onSelectTask={onSelectTask}
            onDeleteTask={onDeleteTask}
            onMoveTask={onMoveTask}
          />
        ))}

        {column.tasks.length === 0 && (
          <div className="py-6 text-center text-[11px] text-stone-400 border border-dashed border-stone-200 rounded-lg">
            No cards here
          </div>
        )}
      </div>

      {/* Column Footer */}
      {canCreateCards && (
        <div className="p-2 border-t border-stone-200 bg-white/50 rounded-b-xl">
          <button
            type="button"
            onClick={() => onAddCardClick(column.id)}
            className="flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200/60 transition"
          >
            <Plus className="size-3.5" />
            <span>Add Card</span>
          </button>
        </div>
      )}
    </div>
  )
})
