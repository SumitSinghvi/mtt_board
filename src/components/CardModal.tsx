import { useState, useEffect } from "react"
import {
  X,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Lock,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useStaffStore, initialStaff } from "../store/staffStore"
import { useAuthStore } from "../store/authStore"
import { getUserPermissions, canUserEditTask } from "../lib/permissions"
import { ActivitySection } from "./ActivitySection"
import { CardSubcardsSection } from "./card-modal/CardSubcardsSection"
import { CardDetailsSidebar } from "./card-modal/CardDetailsSidebar"
import { SubCardModal } from "./card-modal/SubCardModal"
import { formatDate } from "../lib/date"
import { markTaskCommentsRead } from "../lib/unreadComments"
import { type Priority, type Task, type ChecklistItem, type ActivityItem } from "../schemas/board"

interface CardModalProps {
  boardId: string
  columnId: string
  taskId: string
  onClose: () => void
}

export function CardModal({ boardId, columnId, taskId, onClose }: CardModalProps) {
  const { boards, updateTask, deleteTask, moveTask } = useBoardStore()
  const { staff } = useStaffStore()
  const staffList = staff.length > 0 ? staff : initialStaff
  const { profile } = useAuthStore()

  const currentBoard = boards.find((b) => b.id === boardId)
  const isArchived = !!currentBoard?.isArchived

  const permissions = getUserPermissions(profile)

  const currentColumn = currentBoard?.columns.find((c) => c.id === columnId)
  const currentTask = currentColumn?.tasks.find((t) => t.id === taskId)

  const canEditCard = currentTask ? canUserEditTask(currentTask, profile, isArchived) : false
  const canDeleteCard = !isArchived && permissions.canDeleteCards && (profile?.role === "admin" || canEditCard)

  // Sub-card Modal state
  const [activeSubCardId, setActiveSubCardId] = useState<string | null>(null)
  // Section collapsible states
  const [notesOpen, setNotesOpen] = useState(true)
  const [subcardsOpen, setSubcardsOpen] = useState(true)
  const [cardDetailsOpen, setCardDetailsOpen] = useState(true)

  // Local state buffering for text inputs to eliminate keystroke lag
  const [localTitle, setLocalTitle] = useState(currentTask?.title || "")
  const [localDescription, setLocalDescription] = useState(currentTask?.description || "")

  useEffect(() => {
    if (currentTask) {
      setLocalTitle(currentTask.title)
      setLocalDescription(currentTask.description || "")
    }
  }, [currentTask?.id])

  const modules = currentBoard?.modules || {
    clientContact: true,
    subtasks: true,
  }

  // Mark comments read on modal open
  useEffect(() => {
    if (taskId) {
      markTaskCommentsRead(taskId)
    }
  }, [taskId])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  if (!currentTask || !currentBoard) return null

  const currentUserName = profile?.name || profile?.email?.split("@")[0] || "Staff"

  const logTaskHistory = (content: string, fieldUpdates: Partial<Task> = {}) => {
    const historyEvent: ActivityItem = {
      id: `act-${crypto.randomUUID()}`,
      type: "history",
      author: currentUserName,
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
    if (!canEditCard && field !== "activities") return

    // Audit log significant changes
    if (field === "assignees") {
      const nextAssignees = (value as string[]) || []
      const msg =
        nextAssignees.length === 0
          ? "Unassigned all staff"
          : `Assignees updated: ${nextAssignees.join(", ")}`
      logTaskHistory(msg, {
        assignees: nextAssignees,
        assignee: nextAssignees[0] || undefined,
      })
      return
    }

    if (field === "assignee" && value !== currentTask.assignee) {
      const next = value ? [String(value)] : []
      const msg = value
        ? `Assigned to ${String(value)}`
        : `Unassigned (previously ${currentTask.assignee || "none"})`
      logTaskHistory(msg, { assignee: value as string, assignees: next })
      return
    }

    if (field === "leader" && value !== currentTask.leader) {
      const msg = value
        ? `Designated ${String(value)} as Team Leader`
        : `Removed Team Leader designation (was ${currentTask.leader || "none"})`
      logTaskHistory(msg, { leader: (value as string) || undefined })
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
    if (!canEditCard) return
    if (targetColId === columnId) return
    const targetCol = currentBoard.columns.find((c) => c.id === targetColId)
    const historyEvent: ActivityItem = {
      id: `act-${crypto.randomUUID()}`,
      type: "history",
      author: currentUserName,
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
      author: currentUserName,
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
        author: currentUserName,
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
        author: currentUserName,
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
        author: currentUserName,
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
      author: currentUserName,
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
    markTaskCommentsRead(taskId)
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-2 sm:p-4"
      onClick={onClose}
    >
      {/* Fixed Geometry Container */}
      <div
        className="relative flex w-full sm:w-[94vw] max-w-6xl xl:max-w-7xl h-[92vh] sm:h-[85vh] flex-col rounded-xl sm:rounded-2xl border border-stone-200 bg-white shadow-2xl animate-in fade-in-50 zoom-in-95 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-3.5 sm:px-6 py-3 sm:py-4 bg-stone-50/70 shrink-0">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <input
              type="text"
              disabled={!canEditCard}
              value={localTitle}
              onChange={(e) => {
                setLocalTitle(e.target.value)
                handleFieldChange("title", e.target.value)
              }}
              className="w-full text-base sm:text-xl font-bold text-stone-900 bg-transparent border-b border-transparent hover:border-stone-300 focus:border-amber-500 focus:bg-white focus:outline-none rounded px-1 -mx-1 transition disabled:opacity-85 disabled:cursor-not-allowed"
              placeholder="Card Title"
            />
            {isArchived && (
              <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-amber-900 border border-amber-300">
                Archived
              </span>
            )}
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

        {/* Read-Only Restriction Banner */}
        {!canEditCard && (
          <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200/80 px-4 py-2 text-xs text-amber-800 shrink-0">
            <Lock className="size-3.5 shrink-0 text-amber-700" />
            <span>Read-only: Only administrators, assigned staff, or the card creator can modify this card.</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            {/* Left Primary Section (7/12 width) */}
            <div className="space-y-6 lg:col-span-7">
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
                  {!notesOpen && localDescription && (
                    <span className="text-[11px] font-normal text-stone-400 truncate max-w-[240px]">
                      {localDescription}
                    </span>
                  )}
                </button>
                {notesOpen && (
                  <textarea
                    rows={5}
                    disabled={!canEditCard}
                    placeholder="Task details, instructions, special requests..."
                    value={localDescription}
                    onChange={(e) => {
                      setLocalDescription(e.target.value)
                      handleFieldChange("description", e.target.value)
                    }}
                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 leading-relaxed placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-stone-100 disabled:cursor-not-allowed"
                  />
                )}
              </div>

              {/* Sub-Cards Breakdown - Collapsible */}
              {modules.subtasks && (
                <CardSubcardsSection
                  checklist={checklist}
                  isOpen={subcardsOpen}
                  canEdit={canEditCard}
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
                readOnly={isArchived}
              />
            </div>

            {/* Right Meta Section (5/12 width) */}
            <div className="space-y-5 lg:col-span-5">
              {/* Card Details & Customer Box */}
              <CardDetailsSidebar
                currentTask={currentTask}
                currentBoard={currentBoard}
                columnId={columnId}
                staff={staffList}
                isOpen={cardDetailsOpen}
                canEdit={canEditCard}
                onToggleOpen={() => setCardDetailsOpen((prev) => !prev)}
                onChangeColumn={handleColumnChange}
                onChangeField={handleFieldChange}
                clientContactEnabled={!!modules.clientContact}
              />
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex items-center justify-between border-t border-stone-200 px-6 py-3.5 bg-stone-50/80 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
            {isArchived ? (
              <span className="font-semibold text-amber-800">
                Archived board — view only mode
              </span>
            ) : (
              <>
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                <span>Changes auto-save instantly</span>
              </>
            )}
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
          staff={staffList}
          canEdit={canEditCard}
          canDelete={canDeleteCard}
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
