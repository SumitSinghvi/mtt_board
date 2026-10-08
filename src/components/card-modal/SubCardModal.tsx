import {
  X,
  Trash2,
  Calendar,
  Layers,
  FileText,
  Tag,
  UserCheck,
  CheckCircle2,
} from "lucide-react"
import { ActivitySection } from "../ActivitySection"
import { formatDate } from "../../lib/date"
import type { ChecklistItem, Priority } from "../../schemas/board"
import type { StaffMember } from "../../store/staffStore"

interface SubCardModalProps {
  subCard: ChecklistItem | null
  parentTitle: string
  staff: StaffMember[]
  canEdit?: boolean
  canDelete?: boolean
  onClose: () => void
  onToggleDone: (itemId: string) => void
  onUpdateSubCard: (itemId: string, updates: Partial<ChecklistItem>) => void
  onDeleteSubCard: (itemId: string) => void
  onAddComment: (subCardId: string, comment: string, author: string) => void
}

export function SubCardModal({
  subCard,
  parentTitle,
  staff,
  canEdit = true,
  canDelete = true,
  onClose,
  onToggleDone,
  onUpdateSubCard,
  onDeleteSubCard,
  onAddComment,
}: SubCardModalProps) {
  if (!subCard) return null

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-stone-950/65 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in-50"
      onClick={onClose}
    >
      <div
        className="relative flex w-[94vw] max-w-6xl xl:max-w-7xl h-[85vh] flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl animate-in zoom-in-95 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sub-Card Fixed Header */}
        <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-6 py-4 bg-stone-50/70 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <input
              type="checkbox"
              checked={subCard.done}
              disabled={!canEdit}
              onChange={() => onToggleDone(subCard.id)}
              className="size-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
              title={subCard.done ? "Mark as incomplete" : "Mark as complete"}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold text-[11px] shrink-0">
                  <Layers className="size-3" />
                  Sub-Card
                </span>
                <span className="text-xs text-stone-400 truncate">
                  Parent: {parentTitle}
                </span>
              </div>
              <input
                type="text"
                disabled={!canEdit}
                value={subCard.text}
                onChange={(e) => onUpdateSubCard(subCard.id, { text: e.target.value })}
                placeholder="Sub-card title / task..."
                className={`w-full text-lg sm:text-xl font-bold bg-transparent border-b border-transparent hover:border-stone-300 focus:border-amber-500 focus:bg-white focus:outline-none rounded px-1 -mx-1 transition disabled:opacity-80 disabled:cursor-not-allowed ${
                  subCard.done ? "line-through text-stone-400" : "text-stone-900"
                }`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {canDelete && (
              <button
                type="button"
                title="Delete Sub-Card"
                onClick={() => onDeleteSubCard(subCard.id)}
                className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
              >
                <Trash2 className="size-4" />
              </button>
            )}
            <button
              type="button"
              title="Close Sub-Card (Esc)"
              onClick={onClose}
              className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Sub-Card Scrollable Body with Stable 2-Column Split */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Primary Section (7/12 width) */}
            <div className="space-y-6 lg:col-span-7">
              {/* Sub-Card Description */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                  <FileText className="size-3.5 text-stone-400" />
                  <span>Description</span>
                </label>
                <textarea
                  rows={4}
                  disabled={!canEdit}
                  value={subCard.description || ""}
                  onChange={(e) =>
                    onUpdateSubCard(subCard.id, {
                      description: e.target.value || undefined,
                    })
                  }
                  placeholder="Detailed description of what needs to be done for this sub-task..."
                  className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 leading-relaxed placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-stone-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Notes & Instructions */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                  <Tag className="size-3.5 text-stone-400" />
                  <span>Notes & Instructions</span>
                </label>
                <textarea
                  rows={3}
                  disabled={!canEdit}
                  value={subCard.notes || ""}
                  onChange={(e) =>
                    onUpdateSubCard(subCard.id, {
                      notes: e.target.value || undefined,
                    })
                  }
                  placeholder="Internal booking IDs, contact references, operational reminders..."
                  className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 leading-relaxed placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-stone-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Sub-Card Activity Column */}
              <ActivitySection
                title="Sub-Card Activity & Comments"
                placeholder="Write a comment on this sub-card..."
                activities={subCard.activities || []}
                onAddComment={(comment, author) => onAddComment(subCard.id, comment, author)}
                readOnly={!canEdit}
              />
            </div>

            {/* Right Meta Section (5/12 width) */}
            <div className="space-y-5 lg:col-span-5">
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-700">
                    <Layers className="size-3.5 text-amber-600" />
                    <span>Sub-Card Details</span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      subCard.done
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {subCard.done ? "Completed" : "In Progress"}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Priority */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                      <Tag className="size-3 text-stone-400" />
                      Priority
                    </label>
                    <select
                      value={subCard.priority || "medium"}
                      disabled={!canEdit}
                      onChange={(e) =>
                        onUpdateSubCard(subCard.id, {
                          priority: e.target.value as Priority,
                        })
                      }
                      className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 capitalize focus:border-amber-500 focus:outline-none disabled:bg-stone-100 disabled:cursor-not-allowed"
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                      <Calendar className="size-3 text-stone-400" />
                      Due Date
                    </label>
                    <input
                      type="date"
                      disabled={!canEdit}
                      value={subCard.dueDate || ""}
                      onChange={(e) =>
                        onUpdateSubCard(subCard.id, {
                          dueDate: e.target.value || undefined,
                        })
                      }
                      className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none disabled:bg-stone-100 disabled:cursor-not-allowed"
                    />
                    {subCard.dueDate && (
                      <p className="mt-1 text-[11px] text-stone-500">
                        {formatDate(subCard.dueDate)}
                      </p>
                    )}
                  </div>

                  {/* Assignee */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                      <UserCheck className="size-3 text-stone-400" />
                      Assignee
                    </label>
                    <select
                      value={subCard.assignee || ""}
                      disabled={!canEdit}
                      onChange={(e) =>
                        onUpdateSubCard(subCard.id, {
                          assignee: e.target.value || undefined,
                        })
                      }
                      className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none disabled:bg-stone-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Unassigned</option>
                      {subCard.assignee && !staff.some((m) => m.name === subCard.assignee) && (
                        <option value={subCard.assignee}>{subCard.assignee}</option>
                      )}
                      {staff.map((member) => (
                        <option key={member.id} value={member.name}>
                          {member.name} ({member.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Parent Card Info */}
                  <div className="pt-2 border-t border-stone-200/60">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                      Parent Task
                    </span>
                    <div className="rounded-lg bg-stone-100/70 p-2.5 text-xs font-medium text-stone-700 truncate">
                      {parentTitle}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Card Fixed Footer */}
        <div className="flex items-center justify-between border-t border-stone-200 px-6 py-3.5 bg-stone-50/80 shrink-0">
          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete sub-card "${subCard.text}"?`)) {
                    onDeleteSubCard(subCard.id)
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition"
              >
                <Trash2 className="size-3.5" />
                <span>Delete Sub-Card</span>
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-500 ml-2">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <span>Changes auto-save instantly</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-stone-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
