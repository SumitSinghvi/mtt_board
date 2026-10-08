import { useState } from "react"
import {
  Layers,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Clock,
  ExternalLink,
  Trash2,
  Plus,
} from "lucide-react"
import { formatDate } from "../../lib/date"
import { priorityColors } from "./priorityColors"
import type { ChecklistItem } from "../../schemas/board"

interface CardSubcardsSectionProps {
  checklist: ChecklistItem[]
  isOpen: boolean
  canEdit?: boolean
  onToggleOpen: () => void
  onToggleItem: (id: string) => void
  onOpenSubCard: (id: string) => void
  onDeleteSubCard: (id: string) => void
  onAddSubCard: (text: string) => void
}

export function CardSubcardsSection({
  checklist,
  isOpen,
  canEdit = true,
  onToggleOpen,
  onToggleItem,
  onOpenSubCard,
  onDeleteSubCard,
  onAddSubCard,
}: CardSubcardsSectionProps) {
  const [newChecklistText, setNewChecklistText] = useState("")

  const completedCount = checklist.filter((item) => item.done).length

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChecklistText.trim()) return
    onAddSubCard(newChecklistText.trim())
    setNewChecklistText("")
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex items-center gap-1.5 text-xs font-bold text-stone-900 hover:text-amber-800 transition cursor-pointer select-none"
        >
          {isOpen ? (
            <ChevronDown className="size-3.5 text-stone-400" />
          ) : (
            <ChevronRight className="size-3.5 text-stone-400" />
          )}
          <Layers className="size-4 text-amber-600" />
          <span>Sub-Cards ({checklist.length})</span>
        </button>
        {checklist.length > 0 && (
          <span className="text-[11px] font-medium text-stone-500">
            {completedCount} / {checklist.length} completed
          </span>
        )}
      </div>

      {checklist.length > 0 && (
        <div className="h-1.5 w-full rounded-full bg-stone-200/70 overflow-hidden">
          <div
            className="h-full bg-amber-600 transition-all duration-300"
            style={{
              width: `${(completedCount / checklist.length) * 100}%`,
            }}
          />
        </div>
      )}

      {isOpen && (
        <>
          {/* Sub-Cards List */}
          <div className="space-y-2 pt-1">
            {checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenSubCard(item.id)}
                className={`group rounded-xl border p-2.5 transition flex items-center justify-between gap-3 cursor-pointer ${
                  item.done
                    ? "bg-white/60 border-stone-200/70 opacity-75 hover:border-stone-300"
                    : "bg-white border-stone-200 hover:border-amber-400 hover:shadow-xs shadow-2xs"
                }`}
              >
                {/* Checkbox & Title */}
                <div
                  className="flex items-center gap-2.5 flex-1 min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    disabled={!canEdit}
                    onChange={() => onToggleItem(item.id)}
                    className="size-4 rounded text-amber-600 focus:ring-amber-500 shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <span
                    onClick={() => onOpenSubCard(item.id)}
                    className={`text-xs font-semibold truncate cursor-pointer text-stone-900 group-hover:text-amber-900 ${
                      item.done ? "line-through text-stone-400 font-normal" : ""
                    }`}
                  >
                    {item.text}
                  </span>
                </div>

                {/* Sub-Card Badges & Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                  {item.priority && (
                    <span
                      className={`px-1.5 py-0.5 rounded border font-semibold uppercase ${
                        priorityColors[item.priority].bg
                      } ${priorityColors[item.priority].text} ${
                        priorityColors[item.priority].border
                      }`}
                    >
                      {item.priority}
                    </span>
                  )}

                  {item.assignee && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-medium">
                      <UserCheck className="size-2.5 text-stone-500" />
                      <span className="max-w-[75px] truncate">{item.assignee}</span>
                    </span>
                  )}

                  {item.dueDate && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                      <Clock className="size-2.5 text-stone-400" />
                      <span>{formatDate(item.dueDate)}</span>
                    </span>
                  )}

                  {/* Open Sub-Card Modal Trigger */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenSubCard(item.id)
                    }}
                    title="Open Sub-Card Modal"
                    className="p-1 rounded text-stone-400 hover:text-amber-700 hover:bg-amber-50 transition"
                  >
                    <ExternalLink className="size-3.5" />
                  </button>

                  {/* Delete Sub-Card */}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteSubCard(item.id)
                      }}
                      title="Delete sub-card"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Sub-Card Quick Form */}
          {canEdit && (
            <form onSubmit={handleAddSubmit} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Add new sub-card (e.g. Arrange airport taxi, Collect advance receipt)..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none shadow-2xs"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 shadow-2xs transition"
              >
                <Plus className="size-3.5" />
                <span>Add Sub-Card</span>
              </button>
            </form>
          )}
        </>
      )}
    </div>
  )
}
