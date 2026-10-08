import {
  Trash2,
  Phone,
  User,
  IndianRupee,
  ArrowRight,
  ArrowLeft,
  MapPin,
  UserCheck,
  Clock,
  Layers,
} from "lucide-react"
import { formatDate } from "../../lib/date"
import { getWhatsAppUrl } from "../../lib/utils"
import type { Task, Priority } from "../../schemas/board"

const priorityColors: Record<Priority, { bg: string; text: string; border: string }> = {
  urgent: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  low: { bg: "bg-stone-100", text: "text-stone-600", border: "border-stone-200" },
}

interface KanbanCardProps {
  task: Task
  columnId: string
  colIdx: number
  totalColumns: number
  prevColumnTitle?: string
  prevColumnId?: string
  nextColumnTitle?: string
  nextColumnId?: string
  onTaskDragStart: (e: React.DragEvent, taskId: string, sourceColId: string) => void
  onResetDrag: () => void
  onSelectTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onMoveTask: (taskId: string, targetColId: string) => void
}

export function KanbanCard({
  task,
  columnId,
  colIdx,
  totalColumns,
  prevColumnTitle,
  prevColumnId,
  nextColumnTitle,
  nextColumnId,
  onTaskDragStart,
  onResetDrag,
  onSelectTask,
  onDeleteTask,
  onMoveTask,
}: KanbanCardProps) {
  const checklistItems = task.checklist || []
  const doneChecklist = checklistItems.filter((c) => c.done).length

  return (
    <div
      draggable
      onDragStart={(e) => onTaskDragStart(e, task.id, columnId)}
      onDragEnd={onResetDrag}
      onClick={() => onSelectTask(task.id)}
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
            onDeleteTask(task.id)
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
                href={getWhatsAppUrl(task.customerPhone) || `tel:${task.customerPhone}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Open WhatsApp chat"
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
          {colIdx > 0 && prevColumnId && prevColumnTitle && (
            <button
              type="button"
              title={`Move to ${prevColumnTitle}`}
              onClick={(e) => {
                e.stopPropagation()
                onMoveTask(task.id, prevColumnId)
              }}
              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            >
              <ArrowLeft className="size-3" />
              <span>{prevColumnTitle}</span>
            </button>
          )}
        </div>

        <div>
          {colIdx < totalColumns - 1 && nextColumnId && nextColumnTitle && (
            <button
              type="button"
              title={`Move to ${nextColumnTitle}`}
              onClick={(e) => {
                e.stopPropagation()
                onMoveTask(task.id, nextColumnId)
              }}
              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            >
              <span>{nextColumnTitle}</span>
              <ArrowRight className="size-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
