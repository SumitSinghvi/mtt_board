import { useState, useEffect } from "react"
import {
  X,
  Trash2,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  MapPin,
  Car,
  Users,
  IndianRupee,
  CheckSquare,
  User,
  Plus,
  Clock,
  CheckCircle2,
  UserCheck,
  Tag,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useCustomerStore } from "../store/customerStore"
import { CustomerCombobox } from "./CustomerCombobox"
import type { Priority, Task, ChecklistItem } from "../schemas/board"

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

  const currentBoard = boards.find((b) => b.id === boardId)
  const currentColumn = currentBoard?.columns.find((c) => c.id === columnId)
  const currentTask = currentColumn?.tasks.find((t) => t.id === taskId)

  const [newChecklistText, setNewChecklistText] = useState("")

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

  const handleFieldChange = (field: keyof Task, value: unknown) => {
    updateTask(boardId, columnId, taskId, { [field]: value })
  }

  const handleColumnChange = (targetColId: string) => {
    if (targetColId === columnId) return
    moveTask(boardId, columnId, targetColId, taskId)
    onClose()
  }

  const handleDelete = () => {
    if (confirm(`Delete card "${currentTask.title}"?`)) {
      deleteTask(boardId, columnId, taskId)
      onClose()
    }
  }

  // Checklist handlers
  const checklist = currentTask.checklist || []
  const completedCount = checklist.filter((item) => item.done).length

  const handleToggleChecklist = (itemId: string) => {
    const updated = checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    )
    handleFieldChange("checklist", updated)
  }

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChecklistText.trim()) return
    const newItem: ChecklistItem = {
      id: `check-${crypto.randomUUID()}`,
      text: newChecklistText.trim(),
      done: false,
    }
    handleFieldChange("checklist", [...checklist, newItem])
    setNewChecklistText("")
  }

  const handleDeleteChecklistItem = (itemId: string) => {
    handleFieldChange(
      "checklist",
      checklist.filter((item) => item.id !== itemId)
    )
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
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-4 bg-stone-50/70 shrink-0">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <input
              type="text"
              value={currentTask.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              className="w-full text-lg sm:text-xl font-bold text-stone-900 bg-transparent border-b border-transparent hover:border-stone-300 focus:border-amber-500 focus:bg-white focus:outline-none rounded px-1 -mx-1 transition"
              placeholder="Card Title"
            />

            {/* Quick status controls */}
            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              {/* Column/Stage Picker */}
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <span className="font-medium text-stone-400">Stage:</span>
                <select
                  value={columnId}
                  onChange={(e) => handleColumnChange(e.target.value)}
                  className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-800 focus:border-amber-500 focus:outline-none"
                >
                  {currentBoard.columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Picker */}
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <span className="font-medium text-stone-400">Priority:</span>
                <select
                  value={currentTask.priority}
                  onChange={(e) => handleFieldChange("priority", e.target.value as Priority)}
                  className={`rounded-md border px-2 py-1 text-xs font-semibold focus:outline-none uppercase ${
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

              {/* Assignee Input */}
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <UserCheck className="size-3.5 text-stone-400" />
                <span className="font-medium text-stone-400">Assignee:</span>
                <input
                  type="text"
                  placeholder="Unassigned"
                  value={currentTask.assignee || ""}
                  onChange={(e) => handleFieldChange("assignee", e.target.value)}
                  className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none w-32"
                />
              </div>

              {/* Core Due Date */}
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <Clock className="size-3.5 text-stone-400" />
                <span className="font-medium text-stone-400">Due:</span>
                <input
                  type="date"
                  value={currentTask.dueDate || ""}
                  onChange={(e) => handleFieldChange("dueDate", e.target.value)}
                  className="rounded-md border border-stone-200 bg-white px-2 py-0.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 pt-1">
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

              {/* Notes & Description (Core) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Notes & Details
                </label>
                <textarea
                  rows={5}
                  placeholder="Task details, instructions, special requests..."
                  value={currentTask.description || ""}
                  onChange={(e) => handleFieldChange("description", e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 leading-relaxed placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Operations Checklist - when enabled */}
              {modules.subtasks && (
                <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                      <CheckSquare className="size-4 text-amber-600" />
                      <span>Checklist & Subtasks</span>
                    </div>
                    {checklist.length > 0 && (
                      <span className="text-[11px] font-medium text-stone-500">
                        {completedCount} / {checklist.length} done
                      </span>
                    )}
                  </div>

                  {checklist.length > 0 && (
                    <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className="h-full bg-amber-600 transition-all duration-300"
                        style={{
                          width: `${(completedCount / checklist.length) * 100}%`,
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 pt-1">
                    {checklist.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-stone-50 transition"
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs text-stone-700 flex-1">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => handleToggleChecklist(item.id)}
                            className="size-4 rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span className={item.done ? "line-through text-stone-400" : ""}>
                            {item.text}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteChecklistItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 transition"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddChecklistItem} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add subtask..."
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      className="flex-1 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs focus:border-amber-500 focus:bg-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-stone-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-900"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Right Meta Section (5/12 width) - ALWAYS anchored */}
            <div className="space-y-5 lg:col-span-5">
              {/* Client Contact Info - when enabled */}
              {modules.clientContact && (
                <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 space-y-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                    Client Contact
                  </h4>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <User className="size-3 text-stone-400" />
                        Customer Name
                      </span>
                      <span className="text-[10px] text-amber-600 font-normal">Autofills saved info</span>
                    </label>
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

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Phone / Mobile
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={currentTask.customerPhone || ""}
                      onChange={(e) => handleFieldChange("customerPhone", e.target.value)}
                      className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none"
                    />

                    {/* Quick Action links */}
                    {currentTask.customerPhone && (
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={`tel:${currentTask.customerPhone}`}
                          className="inline-flex items-center gap-1 rounded-md bg-stone-200/80 px-2 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-300 transition"
                        >
                          <Phone className="size-3 text-stone-600" />
                          <span>Call</span>
                        </a>
                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-200 transition"
                          >
                            <MessageCircle className="size-3 text-emerald-700" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Email Address
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="email"
                        placeholder="client@example.com"
                        value={currentTask.customerEmail || ""}
                        onChange={(e) => handleFieldChange("customerEmail", e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none"
                      />
                      {currentTask.customerEmail && (
                        <a
                          href={`mailto:${currentTask.customerEmail}`}
                          className="rounded-md border border-stone-200 bg-white p-1.5 text-stone-600 hover:bg-stone-50"
                        >
                          <Mail className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

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

              {/* Card Summary / Metadata Card (Ensures right column stays anchored) */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-600">
                  <Tag className="size-3.5 text-stone-500" />
                  <span>Card Info</span>
                </div>

                <div className="space-y-1.5 text-xs text-stone-600">
                  <div className="flex justify-between py-1 border-b border-stone-200/60">
                    <span className="text-stone-400">Board:</span>
                    <span className="font-semibold text-stone-800">{currentBoard.title}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200/60">
                    <span className="text-stone-400">Current Column:</span>
                    <span className="font-semibold text-stone-800">{currentColumn?.title}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200/60">
                    <span className="text-stone-400">Priority:</span>
                    <span className="font-semibold capitalize text-stone-800">{currentTask.priority}</span>
                  </div>
                  {currentTask.createdAt && (
                    <div className="flex justify-between py-1">
                      <span className="text-stone-400">Created:</span>
                      <span className="text-stone-600 text-[11px]">
                        {new Date(currentTask.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
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
    </div>
  )
}
