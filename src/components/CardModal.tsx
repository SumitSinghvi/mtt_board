import { useState, useEffect } from "react"
import {
  X,
  Trash2,
  MessageCircle,
  Calendar,
  MapPin,
  Car,
  Users,
  IndianRupee,
  User,
  Plus,
  Clock,
  CheckCircle2,
  UserCheck,
  Tag,
  Layers,
  ExternalLink,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useCustomerStore } from "../store/customerStore"
import { useStaffStore } from "../store/staffStore"
import { CustomerCombobox } from "./CustomerCombobox"
import { ActivitySection } from "./ActivitySection"
import { formatDate } from "../lib/date"
import type { Priority, Task, ChecklistItem, ActivityItem } from "../schemas/board"

interface CardModalProps {
  boardId: string
  columnId: string
  taskId: string
  onClose: () => void
}

const priorityColors: Record<Priority, { bg: string; text: string; border: string }> = {
  urgent: { bg: "bg-red-50", text: "text-red-700", border: "border-red-300" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300" },
  low: { bg: "bg-stone-100", text: "text-stone-600", border: "border-stone-300" },
}

export function CardModal({ boardId, columnId, taskId, onClose }: CardModalProps) {
  const { boards, updateTask, deleteTask, moveTask } = useBoardStore()
  const { staff } = useStaffStore()

  const currentBoard = boards.find((b) => b.id === boardId)
  const currentColumn = currentBoard?.columns.find((c) => c.id === columnId)
  const currentTask = currentColumn?.tasks.find((t) => t.id === taskId)

  const [newChecklistText, setNewChecklistText] = useState("")
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
  const completedCount = checklist.filter((item) => item.done).length

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

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChecklistText.trim()) return
    const nowIso = new Date().toISOString()
    const subCardTitle = newChecklistText.trim()
    const createEvent: ActivityItem = {
      id: `act-${crypto.randomUUID()}`,
      type: "history",
      author: "System",
      content: `Sub-card "${subCardTitle}" created`,
      createdAt: nowIso,
    }
    const newItem: ChecklistItem = {
      id: `subcard-${crypto.randomUUID()}`,
      text: subCardTitle,
      done: false,
      activities: [createEvent],
    }
    handleFieldChange("checklist", [...checklist, newItem])
    const taskActivities = currentTask.activities || []
    handleFieldChange("activities", [...taskActivities, createEvent])
    setNewChecklistText("")
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

  // Financial calculations
  const totalAmount = currentTask.amount || 0
  const advance = currentTask.advancePaid || 0
  const balanceDue = Math.max(0, totalAmount - advance)

  // Clean phone number for WhatsApp
  const cleanPhone = currentTask.customerPhone?.replace(/[^0-9]/g, "") || ""
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`}`
    : null

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
            {/* Title */}
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
            <button
              type="button"
              title="Delete Card"
              onClick={handleDelete}
              className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
            >
              <Trash2 className="size-4" />
            </button>
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

        {/* Scrollable Body with Stable 2-Column Split */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Primary Section (7/12 width) */}
            <div className="space-y-6 lg:col-span-7">
              {/* Trip Logistics Box - when enabled */}
              {modules.tripLogistics && (
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3.5 animate-in fade-in-50">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-600">
                    <MapPin className="size-3.5 text-amber-600" />
                    <span>Trip & Route Logistics</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                        Pickup Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Jaipur Airport, Hotel Jai Mahal"
                        value={currentTask.pickupLocation || ""}
                        onChange={(e) => handleFieldChange("pickupLocation", e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                        Destination / Circuit
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Udaipur, Jodhpur, Ranthambore"
                        value={currentTask.destination || ""}
                        onChange={(e) => handleFieldChange("destination", e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                        <Calendar className="size-3 text-stone-400" />
                        Travel Start Date
                      </label>
                      <input
                        type="date"
                        value={currentTask.travelStartDate || ""}
                        onChange={(e) => handleFieldChange("travelStartDate", e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                        <Calendar className="size-3 text-stone-400" />
                        Travel End / Return Date
                      </label>
                      <input
                        type="date"
                        value={currentTask.travelEndDate || ""}
                        onChange={(e) => handleFieldChange("travelEndDate", e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                        <Car className="size-3 text-stone-400" />
                        Vehicle Assigned
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Innova Crysta, Tempo 17s"
                        value={currentTask.vehicleType || ""}
                        onChange={(e) => handleFieldChange("vehicleType", e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                        <Users className="size-3 text-stone-400" />
                        Adults
                      </label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={currentTask.paxAdults ?? ""}
                        onChange={(e) =>
                          handleFieldChange(
                            "paxAdults",
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                        Kids
                      </label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={currentTask.paxKids ?? ""}
                        onChange={(e) =>
                          handleFieldChange(
                            "paxKids",
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes & Description (Core) - Collapsible */}
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

              {/* Sub-Cards / Operations Breakdown - Collapsible */}
              {modules.subtasks && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSubcardsOpen((prev) => !prev)}
                      className="flex items-center gap-1.5 text-xs font-bold text-stone-900 hover:text-amber-800 transition cursor-pointer select-none"
                    >
                      {subcardsOpen ? (
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

                  {subcardsOpen && (
                    <>

                  {/* Sub-Cards List */}
                  <div className="space-y-2 pt-1">
                    {checklist.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setActiveSubCardId(item.id)}
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
                            onChange={() => handleToggleChecklist(item.id)}
                            className="size-4 rounded text-amber-600 focus:ring-amber-500 shrink-0 cursor-pointer"
                          />
                          <span
                            onClick={() => setActiveSubCardId(item.id)}
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
                              setActiveSubCardId(item.id)
                            }}
                            title="Open Sub-Card Modal"
                            className="p-1 rounded text-stone-400 hover:text-amber-700 hover:bg-amber-50 transition"
                          >
                            <ExternalLink className="size-3.5" />
                          </button>

                          {/* Delete Sub-Card */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteChecklistItem(item.id)
                            }}
                            title="Delete sub-card"
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Sub-Card Quick Form */}
                  <form onSubmit={handleAddChecklistItem} className="flex gap-2 pt-1">
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
                </>
              )}
            </div>
          )}

              {/* Main Task Activity Column / Section */}
              <ActivitySection
                title="Task Activity & Comments"
                placeholder="Write a comment, operational note, or status update..."
                activities={currentTask.activities || []}
                onAddComment={handleAddTaskComment}
              />
            </div>

            {/* Right Meta Section (5/12 width) - ALWAYS anchored */}
            <div className="space-y-5 lg:col-span-5">
              {/* Single Unified Card Details & Customer Box - Collapsible & 1-Column */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3 shadow-2xs">
                {/* Header with Collapsible Trigger */}
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
                  <button
                    type="button"
                    onClick={() => setCardDetailsOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-700 hover:text-stone-900 transition cursor-pointer select-none"
                  >
                    {cardDetailsOpen ? (
                      <ChevronDown className="size-3.5 text-stone-400" />
                    ) : (
                      <ChevronRight className="size-3.5 text-stone-400" />
                    )}
                    <Tag className="size-3.5 text-amber-600" />
                    <span>Card Details</span>
                  </button>
                  <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide px-2 py-0.5 rounded bg-stone-200/60">
                    {currentBoard.title}
                  </span>
                </div>

                {cardDetailsOpen && (
                  <>
                    {/* Status Fields: Single 1-Column Layout */}
                    <div className="space-y-3 text-xs">
                      {/* Stage / Column */}
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                          Stage / Column
                        </label>
                        <select
                          value={columnId}
                          onChange={(e) => handleColumnChange(e.target.value)}
                          className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-800 focus:border-amber-500 focus:outline-none"
                        >
                          {currentBoard.columns.map((col) => (
                            <option key={col.id} value={col.id}>
                              {col.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                          Priority
                        </label>
                        <select
                          value={currentTask.priority}
                          onChange={(e) => handleFieldChange("priority", e.target.value as Priority)}
                          className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold focus:outline-none uppercase ${
                            priorityColors[currentTask.priority].bg
                          } ${priorityColors[currentTask.priority].text} ${
                            priorityColors[currentTask.priority].border
                          }`}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      {/* Assignee */}
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-500 mb-1 flex items-center gap-1">
                          <UserCheck className="size-3 text-stone-400" />
                          Assignee
                        </label>
                        <select
                          value={currentTask.assignee || ""}
                          onChange={(e) => handleFieldChange("assignee", e.target.value || undefined)}
                          className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 focus:border-amber-500 focus:outline-none"
                        >
                          <option value="">Unassigned</option>
                          {staff.map((member) => (
                            <option key={member.id} value={member.name}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Due Date */}
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-500 mb-1 flex items-center gap-1">
                          <Clock className="size-3 text-stone-400" />
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={currentTask.dueDate || ""}
                          onChange={(e) => handleFieldChange("dueDate", e.target.value)}
                          className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Concise Customer Section - integrated inside the same box */}
                    {modules.clientContact && (
                      <div className="pt-2.5 border-t border-stone-200/80 space-y-2">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                          <User className="size-3 text-stone-400" />
                          Customer
                        </span>

                        {/* Customer Name */}
                        <div>
                          <CustomerCombobox
                            value={currentTask.customerName || ""}
                            onChange={(name) => {
                              handleFieldChange("customerName", name)
                              if (name.trim()) {
                                useCustomerStore.getState().saveCustomer({
                                  name,
                                  phone: currentTask.customerPhone,
                                  email: currentTask.customerEmail,
                                })
                              }
                            }}
                            onSelectCustomer={(c) => {
                              handleFieldChange("customerName", c.name)
                              if (c.phone) handleFieldChange("customerPhone", c.phone)
                              if (c.email) handleFieldChange("customerEmail", c.email)
                            }}
                          />
                        </div>

                        {/* Customer Phone + WhatsApp concise row */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Phone / Mobile"
                            value={currentTask.customerPhone || ""}
                            onChange={(e) => handleFieldChange("customerPhone", e.target.value)}
                            className="flex-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none"
                          />
                          {whatsappUrl ? (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Open WhatsApp chat"
                              className="inline-flex items-center justify-center size-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shrink-0 shadow-2xs"
                            >
                              <MessageCircle className="size-4" />
                            </a>
                          ) : (
                            <span
                              title="Enter phone number to chat on WhatsApp"
                              className="inline-flex items-center justify-center size-8 rounded-lg bg-stone-200 text-stone-400 cursor-not-allowed shrink-0"
                            >
                              <MessageCircle className="size-4" />
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Created Timestamp footer */}
                    {currentTask.createdAt && (
                      <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-400">
                        <span>Created:</span>
                        <span className="font-medium text-stone-600">
                          {formatDate(currentTask.createdAt)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Commercials & Billing Card - when enabled */}
              {modules.commercials && (
                <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-600">
                    <IndianRupee className="size-3.5 text-emerald-600" />
                    <span>Commercials & Billing</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Total Quote Amount (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={currentTask.amount ?? ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "amount",
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      className="w-full rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Advance Collected (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={currentTask.advancePaid ?? ""}
                      onChange={(e) =>
                        handleFieldChange(
                          "advancePaid",
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      className="w-full rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 focus:border-amber-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Balance Calculated */}
                  <div className="rounded-lg bg-stone-50 border border-stone-100 p-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-600">Balance Pending:</span>
                    <span
                      className={`text-sm font-bold ${
                        balanceDue > 0 ? "text-amber-700" : "text-emerald-700"
                      }`}
                    >
                      ₹{balanceDue.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
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

      {/* Sub-Card Modal Window - Matches Main Task Modal Geometry */}
      {activeSubCard && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-stone-950/65 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in-50"
          onClick={() => setActiveSubCardId(null)}
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
                  checked={activeSubCard.done}
                  onChange={() => handleToggleChecklist(activeSubCard.id)}
                  className="size-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                  title={activeSubCard.done ? "Mark as incomplete" : "Mark as complete"}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold text-[11px] shrink-0">
                      <Layers className="size-3" />
                      Sub-Card
                    </span>
                    <span className="text-xs text-stone-400 truncate">
                      Parent: {currentTask.title}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={activeSubCard.text}
                    onChange={(e) =>
                      handleUpdateSubCard(activeSubCard.id, { text: e.target.value })
                    }
                    placeholder="Sub-card title / task..."
                    className={`w-full text-lg sm:text-xl font-bold bg-transparent border-b border-transparent hover:border-stone-300 focus:border-amber-500 focus:bg-white focus:outline-none rounded px-1 -mx-1 transition ${
                      activeSubCard.done ? "line-through text-stone-400" : "text-stone-900"
                    }`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  title="Delete Sub-Card"
                  onClick={() => handleDeleteChecklistItem(activeSubCard.id)}
                  className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  type="button"
                  title="Close Sub-Card (Esc)"
                  onClick={() => setActiveSubCardId(null)}
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
                      value={activeSubCard.description || ""}
                      onChange={(e) =>
                        handleUpdateSubCard(activeSubCard.id, {
                          description: e.target.value || undefined,
                        })
                      }
                      placeholder="Detailed description of what needs to be done for this sub-task..."
                      className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 leading-relaxed placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                      value={activeSubCard.notes || ""}
                      onChange={(e) =>
                        handleUpdateSubCard(activeSubCard.id, {
                          notes: e.target.value || undefined,
                        })
                      }
                      placeholder="Internal booking IDs, contact references, operational reminders..."
                      className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 leading-relaxed placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Sub-Card Activity Column (Comments & History) */}
                  <ActivitySection
                    title="Sub-Card Activity & Comments"
                    placeholder="Write a comment on this sub-card..."
                    activities={activeSubCard.activities || []}
                    onAddComment={(comment, author) =>
                      handleAddSubCardComment(activeSubCard.id, comment, author)
                    }
                  />
                </div>

                {/* Right Meta Section (5/12 width) - Anchored Details Box */}
                <div className="space-y-5 lg:col-span-5">
                  <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-700">
                        <Layers className="size-3.5 text-amber-600" />
                        <span>Sub-Card Details</span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          activeSubCard.done
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {activeSubCard.done ? "Completed" : "In Progress"}
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
                          value={activeSubCard.priority || "medium"}
                          onChange={(e) =>
                            handleUpdateSubCard(activeSubCard.id, {
                              priority: e.target.value as Priority,
                            })
                          }
                          className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 capitalize focus:border-amber-500 focus:outline-none"
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
                          value={activeSubCard.dueDate || ""}
                          onChange={(e) =>
                            handleUpdateSubCard(activeSubCard.id, {
                              dueDate: e.target.value || undefined,
                            })
                          }
                          className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                        />
                        {activeSubCard.dueDate && (
                          <p className="mt-1 text-[11px] text-stone-500">
                            {formatDate(activeSubCard.dueDate)}
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
                          value={activeSubCard.assignee || ""}
                          onChange={(e) =>
                            handleUpdateSubCard(activeSubCard.id, {
                              assignee: e.target.value || undefined,
                            })
                          }
                          className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                        >
                          <option value="">Unassigned</option>
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
                          {currentTask.title}
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
                <button
                  type="button"
                  onClick={() => handleDeleteChecklistItem(activeSubCard.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete Sub-Card</span>
                </button>
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-500 ml-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  <span>Changes auto-save instantly</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubCardId(null)}
                className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-stone-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
