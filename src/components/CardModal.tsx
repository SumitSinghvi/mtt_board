import { useState, useEffect } from "react"
import {
  X,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useStaffStore } from "../store/staffStore"
import { useAuthStore } from "../store/authStore"
import { ActivitySection } from "./ActivitySection"
import { CardTripLogistics } from "./card-modal/CardTripLogistics"
import { CardSubcardsSection } from "./card-modal/CardSubcardsSection"
import { CardDetailsSidebar } from "./card-modal/CardDetailsSidebar"
import { CardCommercials } from "./card-modal/CardCommercials"
import { SubCardModal } from "./card-modal/SubCardModal"
import { formatDate } from "../lib/date"
import type { Priority, Task, ChecklistItem, ActivityItem } from "../schemas/board"

interface CardModalProps {
  boardId: string
  columnId: string
  taskId: string
  onClose: () => void
}

export function CardModal({ boardId, columnId, taskId, onClose }: CardModalProps) {
  const { boards, updateTask, deleteTask, moveTask } = useBoardStore()
  const { staff } = useStaffStore()
  const { profile } = useAuthStore()

  const userRole = profile?.role || "admin"
  const canViewCommercials = userRole === "admin" || userRole === "accounts"
  const canEditCommercials = userRole === "admin" || userRole === "accounts"
  const canDeleteCard = userRole === "admin"

  const currentBoard = boards.find((b) => b.id === boardId)
  const currentColumn = currentBoard?.columns.find((c) => c.id === columnId)
  const currentTask = currentColumn?.tasks.find((t) => t.id === taskId)

  // Sub-card Modal state
  const [activeSubCardId, setActiveSubCardId] = useState<string | null>(null)
  // Section collapsible states
  const [notesOpen, setNotesOpen] = useState(true)
  const [subcardsOpen, setSubcardsOpen] = useState(true)
  const [cardDetailsOpen, setCardDetailsOpen] = useState(true)

  const modules = currentBoard?.modules || {
    clientContact: true,
    tripLogistics: false,
    commercials: false,
    subtasks: true,
  }

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  if (!currentTask || !currentBoard) return null

  const logTaskHistory = (content: string, fieldUpdates: Partial<Task> = {}) => {
    const historyEvent: ActivityItem = {
      id: `act-${crypto.randomUUID()}`,
      type: "history",
      author: "System",
      content,
      createdAt: new Date().toISOString(),
    }
    const currentActivities = currentTask.activities || []
    updateTask(boardId, columnId, taskId, {
      ...fieldUpdates,
      activities: [...currentActivities, historyEvent],
    })
  }

  const handleFieldChange = (field: keyof Task, value: unknown) => {
    // Audit log significant changes
    if (field === "assignee" && value !== currentTask.assignee) {
      const msg = value
        ? `Assigned to ${String(value)}`
        : `Unassigned (previously ${currentTask.assignee || "none"})`
      logTaskHistory(msg, { assignee: value as string })
      return
    }

    if (field === "dueDate" && value !== currentTask.dueDate) {
      const msg = value
        ? `Due date set to ${formatDate(String(value))}`
        : `Due date cleared (was ${formatDate(currentTask.dueDate)})`
      logTaskHistory(msg, { dueDate: value as string })
      return
    }

    if (field === "priority" && value !== currentTask.priority) {
      logTaskHistory(`Priority changed from ${currentTask.priority} to ${String(value)}`, {
        priority: value as Priority,
      })
      return
    }

    updateTask(boardId, columnId, taskId, { [field]: value })
  }

  const handleColumnChange = (targetColId: string) => {
    if (targetColId === columnId) return
    const targetCol = currentBoard.columns.find((c) => c.id === targetColId)
    const historyEvent: ActivityItem = {
      id: `act-${crypto.randomUUID()}`,
      type: "history",
      author: "System",
      content: `Moved card from "${currentColumn?.title}" to "${targetCol?.title || targetColId}"`,
      createdAt: new Date().toISOString(),
    }
    const currentActivities = currentTask.activities || []
    updateTask(boardId, columnId, taskId, {
      activities: [...currentActivities, historyEvent],
    })
    moveTask(boardId, columnId, targetColId, taskId)
    onClose()
  }

  const handleDelete = () => {
    if (confirm(`Delete card "${currentTask.title}"?`)) {
      deleteTask(boardId, columnId, taskId)
      onClose()
    }
  }

  // Sub-cards handlers
  const checklist = currentTask.checklist || []

  const handleToggleChecklist = (itemId: string) => {
    const itemTarget = checklist.find((item) => item.id === itemId)
    const newDoneState = !itemTarget?.done
    const historyEvent: ActivityItem = {
      id: `act-${crypto.randomUUID()}`,
      type: "history",
      author: "System",
      content: newDoneState
        ? `Marked "${itemTarget?.text || "sub-card"}" as completed`
        : `Reopened "${itemTarget?.text || "sub-card"}"`,
      createdAt: new Date().toISOString(),
    }
    const updated = checklist.map((item) => {
      if (item.id !== itemId) return item
      const itemActivities = item.activities || []
      return {
        ...item,
        done: newDoneState,
        activities: [...itemActivities, historyEvent],
      }
    })
    const taskActivities = currentTask.activities || []
    handleFieldChange("checklist", updated)
    handleFieldChange("activities", [...taskActivities, historyEvent])
  }

  const handleUpdateSubCard = (itemId: string, updates: Partial<ChecklistItem>) => {
    const prevItem = checklist.find((item) => item.id === itemId)
    const historyEvents: ActivityItem[] = []

    if ("assignee" in updates && updates.assignee !== prevItem?.assignee) {
      historyEvents.push({
        id: `act-${crypto.randomUUID()}`,
        type: "history",
        author: "System",
        content: updates.assignee
          ? `Sub-card assigned to ${updates.assignee}`
          : `Sub-card unassigned`,
        createdAt: new Date().toISOString(),
      })
    }

    if ("dueDate" in updates && updates.dueDate !== prevItem?.dueDate) {
      historyEvents.push({
        id: `act-${crypto.randomUUID()}`,
        type: "history",
        author: "System",
        content: updates.dueDate
          ? `Sub-card due date set to ${formatDate(updates.dueDate)}`
          : `Sub-card due date removed`,
        createdAt: new Date().toISOString(),
      })
    }

    if ("priority" in updates && updates.priority !== prevItem?.priority) {
      historyEvents.push({
        id: `act-${crypto.randomUUID()}`,
        type: "history",
        author: "System",
        content: `Sub-card priority changed to ${updates.priority}`,
        createdAt: new Date().toISOString(),
      })
    }

    const updated = checklist.map((item) => {
      if (item.id !== itemId) return item
      const itemActivities = item.activities || []
      return {
        ...item,
        ...updates,
        activities: [...itemActivities, ...historyEvents],
      }
    })

    handleFieldChange("checklist", updated)
    if (historyEvents.length > 0) {
      const taskActivities = currentTask.activities || []
      handleFieldChange("activities", [...taskActivities, ...historyEvents])
    }
  }

  const handleAddChecklistItem = (text: string) => {
    const nowIso = new Date().toISOString()
    const createEvent: ActivityItem = {
      id: `act-${crypto.randomUUID()}`,
      type: "history",
      author: "System",
      content: `Sub-card "${text}" created`,
      createdAt: nowIso,
    }
    const newItem: ChecklistItem = {
      id: `subcard-${crypto.randomUUID()}`,
      text,
      done: false,
      activities: [createEvent],
    }
    handleFieldChange("checklist", [...checklist, newItem])
    const taskActivities = currentTask.activities || []
    handleFieldChange("activities", [...taskActivities, createEvent])
    setActiveSubCardId(newItem.id)
  }

  const handleDeleteChecklistItem = (itemId: string) => {
    handleFieldChange(
      "checklist",
      checklist.filter((item) => item.id !== itemId)
    )
    if (activeSubCardId === itemId) setActiveSubCardId(null)
  }

  const activeSubCard = checklist.find((item) => item.id === activeSubCardId)

  // Activity & Comment Handlers
  const handleAddTaskComment = (comment: string, author: string) => {
    const newActivity: ActivityItem = {
      id: `act-${crypto.randomUUID()}`,
      type: "comment",
      author,
      content: comment,
      createdAt: new Date().toISOString(),
    }
    const currentActivities = currentTask.activities || []
    handleFieldChange("activities", [...currentActivities, newActivity])
  }

  const handleAddSubCardComment = (subCardId: string, comment: string, author: string) => {
    const newActivity: ActivityItem = {
      id: `act-${crypto.randomUUID()}`,
      type: "comment",
      author,
      content: comment,
      createdAt: new Date().toISOString(),
    }
    const updated = checklist.map((item) => {
      if (item.id !== subCardId) return item
      const itemActivities = item.activities || []
      return { ...item, activities: [...itemActivities, newActivity] }
    })
    handleFieldChange("checklist", updated)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4"
      onClick={onClose}
    >
      {/* Fixed Geometry Container */}
      <div
        className="relative flex w-[94vw] max-w-6xl xl:max-w-7xl h-[85vh] flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl animate-in fade-in-50 zoom-in-95 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-6 py-4 bg-stone-50/70 shrink-0">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={currentTask.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              className="w-full text-lg sm:text-xl font-bold text-stone-900 bg-transparent border-b border-transparent hover:border-stone-300 focus:border-amber-500 focus:bg-white focus:outline-none rounded px-1 -mx-1 transition"
              placeholder="Card Title"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {canDeleteCard && (
              <button
                type="button"
                title="Delete Card"
                onClick={handleDelete}
                className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
              >
                <Trash2 className="size-4" />
              </button>
            )}
            <button
              type="button"
              title="Close (Esc)"
              onClick={onClose}
              className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Primary Section (7/12 width) */}
            <div className="space-y-6 lg:col-span-7">
              {/* Trip Logistics Box */}
              {modules.tripLogistics && (
                <CardTripLogistics
                  pickupLocation={currentTask.pickupLocation}
                  destination={currentTask.destination}
                  travelStartDate={currentTask.travelStartDate}
                  travelEndDate={currentTask.travelEndDate}
                  vehicleType={currentTask.vehicleType}
                  paxAdults={currentTask.paxAdults}
                  paxKids={currentTask.paxKids}
                  onChangeField={handleFieldChange}
                />
              )}

              {/* Notes & Description - Collapsible */}
              <div>
                <button
                  type="button"
                  onClick={() => setNotesOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-bold text-stone-700 mb-1.5 hover:text-stone-900 transition cursor-pointer select-none"
                >
                  <span className="flex items-center gap-1.5">
                    {notesOpen ? (
                      <ChevronDown className="size-3.5 text-stone-400" />
                    ) : (
                      <ChevronRight className="size-3.5 text-stone-400" />
                    )}
                    <span>Notes & Details</span>
                  </span>
                  {!notesOpen && currentTask.description && (
                    <span className="text-[11px] font-normal text-stone-400 truncate max-w-[240px]">
                      {currentTask.description}
                    </span>
                  )}
                </button>
                {notesOpen && (
                  <textarea
                    rows={5}
                    placeholder="Task details, instructions, special requests..."
                    value={currentTask.description || ""}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 leading-relaxed placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                )}
              </div>

              {/* Sub-Cards Breakdown - Collapsible */}
              {modules.subtasks && (
                <CardSubcardsSection
                  checklist={checklist}
                  isOpen={subcardsOpen}
                  onToggleOpen={() => setSubcardsOpen((prev) => !prev)}
                  onToggleItem={handleToggleChecklist}
                  onOpenSubCard={(id) => setActiveSubCardId(id)}
                  onDeleteSubCard={handleDeleteChecklistItem}
                  onAddSubCard={handleAddChecklistItem}
                />
              )}

              {/* Main Task Activity Column */}
              <ActivitySection
                title="Task Activity & Comments"
                placeholder="Write a comment, operational note, status update..."
                activities={currentTask.activities || []}
                onAddComment={handleAddTaskComment}
              />
            </div>

            {/* Right Meta Section (5/12 width) */}
            <div className="space-y-5 lg:col-span-5">
              {/* Card Details & Customer Box */}
              <CardDetailsSidebar
                currentTask={currentTask}
                currentBoard={currentBoard}
                columnId={columnId}
                staff={staff}
                isOpen={cardDetailsOpen}
                onToggleOpen={() => setCardDetailsOpen((prev) => !prev)}
                onChangeColumn={handleColumnChange}
                onChangeField={handleFieldChange}
                clientContactEnabled={!!modules.clientContact}
              />

              {/* Commercials & Billing Card */}
              {modules.commercials && canViewCommercials && (
                <CardCommercials
                  amount={currentTask.amount}
                  advancePaid={currentTask.advancePaid}
                  canEdit={canEditCommercials}
                  onChangeField={handleFieldChange}
                />
              )}
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex items-center justify-between border-t border-stone-200 px-6 py-3.5 bg-stone-50/80 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>Changes auto-save instantly</span>
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

      {/* Sub-Card Modal Window */}
      {activeSubCard && (
        <SubCardModal
          subCard={activeSubCard}
          parentTitle={currentTask.title}
          staff={staff}
          onClose={() => setActiveSubCardId(null)}
          onToggleDone={handleToggleChecklist}
          onUpdateSubCard={handleUpdateSubCard}
          onDeleteSubCard={handleDeleteChecklistItem}
          onAddComment={handleAddSubCardComment}
        />
      )}
    </div>
  )
}
