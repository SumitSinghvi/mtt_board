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
import { canUserEditTask, canUserDeleteTask, getAllowedBoards } from "../lib/permissions"
import { ActivitySection } from "./ActivitySection"
import { MentionTextarea } from "./MentionTextarea"
import { CardSubcardsSection } from "./card-modal/CardSubcardsSection"
import { CardRemindersSection } from "./card-modal/CardRemindersSection"
import { CardDetailsSidebar } from "./card-modal/CardDetailsSidebar"
import { CardHotelBookingSection } from "./card-modal/CardHotelBookingSection"
import { CardPaymentSection } from "./card-modal/CardPaymentSection"
import { CardOutgoingPaymentSection } from "./card-modal/CardOutgoingPaymentSection"
import { SubCardModal } from "./card-modal/SubCardModal"
import { formatDate } from "../lib/date"
import { markTaskCommentsRead } from "../lib/unreadComments"
import { generateId } from "../lib/utils"
import { type Priority, type Task, type ChecklistItem, type ActivityItem } from "../schemas/board"
import { toast } from "sonner"

interface CardModalProps {
  boardId: string
  columnId: string
  taskId: string
  onClose: () => void
}

export function CardModal({ boardId, columnId, taskId, onClose }: CardModalProps) {
  const {
    boards,
    updateTask,
    flushTask,
    deleteTask,
    moveTask,
    moveTaskToBoard,
    setActiveBoardId,
    setSelectedTask,
    addReminderToTask,
    toggleTaskReminder,
    deleteTaskReminder,
  } = useBoardStore()
  const { staff } = useStaffStore()
  const staffList = staff.length > 0 ? staff : initialStaff
  const { profile } = useAuthStore()

  const currentBoard = boards.find((b) => b.id === boardId)
  const isArchived = !!currentBoard?.isArchived

  const otherBoards = getAllowedBoards(boards, profile).filter((b) => b.id !== boardId && !b.isArchived)

  const currentColumn = currentBoard?.columns.find((c) => c.id === columnId)
  const currentTask = currentColumn?.tasks.find((t) => t.id === taskId)

  const canEditCard = currentTask ? canUserEditTask(currentTask, profile, isArchived) : false
  const canDeleteCard = currentTask ? canUserDeleteTask(currentTask, profile, isArchived) : false

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
    hotelBooking: false,
    paymentTracking: false,
    outgoingPayment: false,
  }

  // Flush pending changes to Supabase when modal unmounts
  useEffect(() => {
    return () => {
      if (taskId) {
        flushTask(taskId)
      }
    }
  }, [taskId, flushTask])

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
      id: generateId("act"),
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
      id: generateId("act"),
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
    setSelectedTask({
      boardId,
      columnId: targetColId,
      taskId,
    })
  }

  const handleBoardChange = (targetBoardId: string) => {
    if (!canEditCard) return
    if (targetBoardId === boardId) return

    const targetBoard = boards.find((b) => b.id === targetBoardId)
    if (!targetBoard || targetBoard.columns.length === 0) return

    // Smart match column by title if present on target board, else default to first column
    const matchingCol = targetBoard.columns.find(
      (c) => c.title.toLowerCase().trim() === currentColumn?.title.toLowerCase().trim()
    )
    const targetCol = matchingCol || targetBoard.columns[0]

    moveTaskToBoard(boardId, columnId, targetBoardId, targetCol.id, taskId, 0)
    setActiveBoardId(targetBoardId)
    setSelectedTask({
      boardId: targetBoardId,
      columnId: targetCol.id,
      taskId,
    })
  }

  const handleDelete = () => {
    if (confirm(`Delete card "${currentTask.title}"?`)) {
      deleteTask(boardId, columnId, taskId)
      toast.success("Card deleted")
      onClose()
    }
  }

  // Sub-cards handlers
  const checklist = currentTask.checklist || []

  const handleToggleChecklist = (itemId: string) => {
    const itemTarget = checklist.find((item) => item.id === itemId)
    const newDoneState = !itemTarget?.done
    const historyEvent: ActivityItem = {
      id: generateId("act"),
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
        id: generateId("act"),
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
        id: generateId("act"),
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
        id: generateId("act"),
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
      id: generateId("act"),
      type: "history",
      author: currentUserName,
      content: `Sub-card "${text}" created`,
      createdAt: nowIso,
    }
    const newItem: ChecklistItem = {
      id: generateId("subcard"),
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
      id: generateId("act"),
      type: "comment",
      author,
      content: comment,
      createdAt: new Date().toISOString(),
    }
    const currentActivities = currentTask.activities || []
    handleFieldChange("activities", [...currentActivities, newActivity])
  }

  const handleEditTaskComment = (commentId: string, newContent: string) => {
    const currentActivities = currentTask.activities || []
    const updated = currentActivities.map((act) => {
      if (act.id !== commentId) return act
      return {
        ...act,
        content: newContent,
        updatedAt: new Date().toISOString(),
      }
    })
    handleFieldChange("activities", updated)
  }

  const handleDeleteTaskComment = (commentId: string) => {
    const currentActivities = currentTask.activities || []
    const nowIso = new Date().toISOString()
    const updated = currentActivities.map((act) => {
      if (act.id !== commentId) return act
      return {
        ...act,
        isDeleted: true,
        deletedAt: nowIso,
        deletedBy: currentUserName,
      }
    })
    handleFieldChange("activities", updated)
  }

  const handleAddSubCardComment = (subCardId: string, comment: string, author: string) => {
    const newActivity: ActivityItem = {
      id: generateId("act"),
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
    updateTask(boardId, columnId, taskId, { checklist: updated })
  }

  const handleEditSubCardComment = (subCardId: string, commentId: string, newContent: string) => {
    const updated = checklist.map((item) => {
      if (item.id !== subCardId) return item
      const itemActivities = (item.activities || []).map((act) => {
        if (act.id !== commentId) return act
        return {
          ...act,
          content: newContent,
          updatedAt: new Date().toISOString(),
        }
      })
      return { ...item, activities: itemActivities }
    })
    updateTask(boardId, columnId, taskId, { checklist: updated })
  }

  const handleDeleteSubCardComment = (subCardId: string, commentId: string) => {
    const nowIso = new Date().toISOString()
    const updated = checklist.map((item) => {
      if (item.id !== subCardId) return item
      const itemActivities = (item.activities || []).map((act) => {
        if (act.id !== commentId) return act
        return {
          ...act,
          isDeleted: true,
          deletedAt: nowIso,
          deletedBy: currentUserName,
        }
      })
      return { ...item, activities: itemActivities }
    })
    updateTask(boardId, columnId, taskId, { checklist: updated })
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

          {/* Header Controls: Board & Stage Selectors + Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Board Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-stone-500 hidden sm:inline">
                Board:
              </span>
              <select
                aria-label="Board"
                value={boardId}
                disabled={!canEditCard || otherBoards.length === 0}
                onChange={(e) => handleBoardChange(e.target.value)}
                title={canEditCard ? "Change board" : "Current board"}
                className="h-8 sm:h-8.5 rounded-lg border border-stone-200 bg-white px-2 sm:px-2.5 text-xs font-semibold text-stone-800 shadow-2xs hover:border-stone-300 focus:border-amber-500 focus:outline-none disabled:bg-stone-100 disabled:text-stone-600 disabled:cursor-not-allowed max-w-[125px] sm:max-w-[170px] truncate"
              >
                <option value={currentBoard.id}>{currentBoard.title}</option>
                {otherBoards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-stone-500 hidden sm:inline">
                Stage:
              </span>
              <select
                aria-label="Stage"
                value={columnId}
                disabled={!canEditCard}
                onChange={(e) => handleColumnChange(e.target.value)}
                title={canEditCard ? "Change stage / column" : "Current stage"}
                className="h-8 sm:h-8.5 rounded-lg border border-stone-200 bg-white px-2 sm:px-2.5 text-xs font-semibold text-stone-800 shadow-2xs hover:border-stone-300 focus:border-amber-500 focus:outline-none disabled:bg-stone-100 disabled:text-stone-600 disabled:cursor-not-allowed max-w-[115px] sm:max-w-[150px] truncate"
              >
                {currentBoard.columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-4 w-px bg-stone-200 hidden sm:block" />

            {canDeleteCard && (
              <button
                type="button"
                title="Delete Card"
                onClick={handleDelete}
                className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
              >
                <Trash2 className="size-4" />
              </button>
            )}
            <button
              type="button"
              title="Close (Esc)"
              onClick={onClose}
              className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
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
                  <MentionTextarea
                    rows={5}
                    disabled={!canEditCard}
                    placeholder="Task details, instructions, special requests... Type @ to tag staff or @all"
                    value={localDescription}
                    onChange={(val) => {
                      setLocalDescription(val)
                      handleFieldChange("description", val)
                    }}
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

              {/* Scheduled Reminders & Alerts */}
              <CardRemindersSection
                reminders={currentTask.reminders || []}
                canEdit={canEditCard}
                onAddReminder={(rem) => addReminderToTask(boardId, columnId, taskId, rem)}
                onToggleReminder={(remId) => toggleTaskReminder(boardId, columnId, taskId, remId)}
                onDeleteReminder={(remId) => deleteTaskReminder(boardId, columnId, taskId, remId)}
              />

              {/* Main Task Activity Column */}
              <ActivitySection
                title="Task Activity & Comments"
                placeholder="Write a comment, operational note, status update... Type @ to mention staff or @all"
                activities={currentTask.activities || []}
                onAddComment={handleAddTaskComment}
                onEditComment={handleEditTaskComment}
                onDeleteComment={handleDeleteTaskComment}
                readOnly={isArchived}
              />
            </div>

            {/* Right Meta Section (5/12 width) */}
            <div className="space-y-4 lg:col-span-5">
              {/* Hotel Booking & Room Status Section (when module enabled) */}
              {modules.hotelBooking && (
                <CardHotelBookingSection
                  hotelBooking={currentTask.hotelBooking}
                  canEdit={canEditCard}
                  onChange={(updatedBooking) => handleFieldChange("hotelBooking", updatedBooking)}
                />
              )}

              {/* Payment & Installment Tracking Section (when module enabled) */}
              {modules.paymentTracking && (
                <CardPaymentSection
                  paymentTracking={currentTask.paymentTracking}
                  fallbackTotal={currentTask.amount}
                  canEdit={canEditCard}
                  onChange={(updatedPayment) => handleFieldChange("paymentTracking", updatedPayment)}
                  onSyncTotalAmount={(newTotal) => handleFieldChange("amount", newTotal)}
                />
              )}

              {/* Outgoing Payment Section (when module enabled) */}
              {modules.outgoingPayment && (
                <CardOutgoingPaymentSection
                  outgoingPayment={currentTask.outgoingPayment}
                  canEdit={canEditCard}
                  onChange={(updatedOutgoing) => handleFieldChange("outgoingPayment", updatedOutgoing)}
                />
              )}

              {/* Card Details & Customer Box */}
              <CardDetailsSidebar
                currentTask={currentTask}
                currentBoard={currentBoard}
                staff={staffList}
                isOpen={cardDetailsOpen}
                canEdit={canEditCard}
                onToggleOpen={() => setCardDetailsOpen((prev) => !prev)}
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
          onEditComment={handleEditSubCardComment}
          onDeleteComment={handleDeleteSubCardComment}
        />
      )}
    </div>
  )
}
