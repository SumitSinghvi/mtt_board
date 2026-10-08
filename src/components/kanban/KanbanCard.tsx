import { memo, useState, useEffect } from "react"
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
  MessageSquare,
  Crown,
} from "lucide-react"
import { formatDate } from "../../lib/date"
import { getWhatsAppUrl } from "../../lib/utils"
import { useAuthStore } from "../../store/authStore"
import { getTaskCommentsInfo, markTaskCommentsRead } from "../../lib/unreadComments"
import { type Task, type Priority, getTaskAssignees } from "../../schemas/board"

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
  canDeleteCard?: boolean
  canViewCommercials?: boolean
  canEditCard?: boolean
  onTaskDragStart: (e: React.DragEvent, taskId: string, sourceColId: string) => void
  onResetDrag: () => void
  onSelectTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onMoveTask: (taskId: string, targetColId: string) => void
}

export const KanbanCard = memo(function KanbanCard({
  task,
  columnId,
  colIdx,
  totalColumns,
  prevColumnTitle,
  prevColumnId,
  nextColumnTitle,
  nextColumnId,
  canDeleteCard = true,
  canViewCommercials = true,
  canEditCard = true,
  onTaskDragStart,
  onResetDrag,
  onSelectTask,
  onDeleteTask,
  onMoveTask,
}: KanbanCardProps) {
  const checklistItems = task.checklist || []
  const doneChecklist = checklistItems.filter((c) => c.done).length

  const { profile, user } = useAuthStore()
  const currentUserName = profile?.name || user?.email?.split("@")[0] || ""
  const [, setReadVersion] = useState(0)

  useEffect(() => {
    const handleRead = (e: any) => {
      if (e.detail?.taskId === task.id) {
        setReadVersion((v) => v + 1)
      }
    }
    window.addEventListener("mtt_task_read", handleRead)
    return () => window.removeEventListener("mtt_task_read", handleRead)
  }, [task.id])

  const { totalComments, unreadCount } = getTaskCommentsInfo(task, currentUserName)

  return (
    <div
      draggable={canEditCard}
      onDragStart={(e) => {
        if (!canEditCard) return
        onTaskDragStart(e, task.id, columnId)
      }}
      onDragEnd={onResetDrag}
      onClick={() => {
        markTaskCommentsRead(task.id)
        onSelectTask(task.id)
      }}
      className={`group rounded-lg border border-stone-200/90 bg-white p-3 shadow-2xs transition hover:border-amber-400 hover:shadow-xs cursor-pointer ${
        canEditCard ? "active:cursor-grabbing" : ""
      }`}
    >
      {/* Priority, Comment Notification & Delete */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              priorityColors[task.priority].bg
            } ${priorityColors[task.priority].text} ${
              priorityColors[task.priority].border
            }`}
          >
            {task.priority}
          </span>

          {unreadCount > 0 ? (
            <span
              title={`${unreadCount} new comment${unreadCount > 1 ? "s" : ""}`}
              className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-1.5 py-0.2 text-[10px] font-bold text-red-600 shadow-2xs"
            >
              <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
              <MessageSquare className="size-2.5 text-red-500" />
              <span>{unreadCount}</span>
            </span>
          ) : totalComments > 0 ? (
            <span
              title={`${totalComments} comment${totalComments > 1 ? "s" : ""}`}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-400 group-hover:text-stone-500"
            >
              <MessageSquare className="size-2.5" />
              <span>{totalComments}</span>
            </span>
          ) : null}
        </div>

        {canDeleteCard && (
          <button
            type="button"
            title="Delete card"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Delete card "${task.title}"?`)) {
                onDeleteTask(task.id)
              }
            }}
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 rounded p-1 text-stone-400 hover:text-red-600 transition"
          >
            <Trash2 className="size-3" />
          </button>
        )}
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

      {/* Meta Tags: Assignees & Due Date */}
      {(() => {
        const allAssignees = getTaskAssignees(task)
        if (allAssignees.length === 0 && !task.dueDate) return null

        const leader = task.leader && allAssignees.includes(task.leader) ? task.leader : null
        const otherAssignees = leader ? allAssignees.filter((n) => n !== leader) : allAssignees
        const ordered = leader ? [leader, ...otherAssignees] : allAssignees

        return (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {ordered.slice(0, 2).map((name) => {
              const isLeader = name === leader
              return (
                <span
                  key={name}
                  className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                    isLeader
                      ? "font-semibold text-amber-900 bg-amber-100/90 border border-amber-300/80 shadow-2xs"
                      : "font-medium text-stone-700 bg-stone-100"
                  }`}
                >
                  {isLeader ? (
                    <Crown className="size-3 text-amber-700 shrink-0" />
                  ) : (
                    <UserCheck className="size-3 text-stone-500 shrink-0" />
                  )}
                  <span className="truncate max-w-[85px]">{name}</span>
                </span>
              )
            })}
            {ordered.length > 2 && (
              <span
                title={ordered.slice(2).join(", ")}
                className="text-[10px] font-semibold text-stone-600 bg-stone-200/80 px-1.5 py-0.5 rounded"
              >
                +{ordered.length - 2}
              </span>
            )}
            {task.dueDate && (
              <span className="inline-flex items-center gap-1 text-[10px] text-stone-500">
                <Clock className="size-3 text-stone-400" />
                <span>{formatDate(task.dueDate)}</span>
              </span>
            )}
          </div>
        )
      })()}

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
          {canViewCommercials && task.amount !== undefined ? (
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
      {canEditCard && (
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
      )}
    </div>
  )
})
