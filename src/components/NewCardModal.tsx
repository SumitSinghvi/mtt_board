import { useState, useEffect } from "react"
import {
  X,
  Plus,
  Clock,
  User,
  Phone,
  Mail,
  UserCheck,
  UserPlus,
  Check,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useCustomerStore } from "../store/customerStore"
import { useStaffStore, initialStaff } from "../store/staffStore"
import { CustomerCombobox } from "./CustomerCombobox"
import { PhoneInput } from "./ui/PhoneInput"
import type { Priority } from "../schemas/board"

interface NewCardModalProps {
  boardId: string
  defaultColumnId: string
  onClose: () => void
}

const priorityColors: Record<Priority, { bg: string; text: string; border: string }> = {
  urgent: { bg: "bg-red-50", text: "text-red-700", border: "border-red-300" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300" },
  low: { bg: "bg-stone-100", text: "text-stone-600", border: "border-stone-300" },
}

export function NewCardModal({ boardId, defaultColumnId, onClose }: NewCardModalProps) {
  const { boards, addTask } = useBoardStore()
  const currentBoard = boards.find((b) => b.id === boardId)

  const modules = currentBoard?.modules || {
    clientContact: true,
    subtasks: true,
  }

  const [selectedColumnId, setSelectedColumnId] = useState(defaultColumnId)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [assignee, setAssignee] = useState("")
  const [dueDate, setDueDate] = useState("")

  const { staff } = useStaffStore()
  const activeStaff = (staff.length > 0 ? staff : initialStaff).filter(
    (m) => m.status !== "inactive"
  )

  // Client info
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")

  const { customers, saveCustomer } = useCustomerStore()
  const trimmedCustName = customerName.trim()
  const isCustInDirectory = Boolean(
    trimmedCustName &&
    customers.some((c) => c.name.toLowerCase() === trimmedCustName.toLowerCase())
  )

  const handleAddCustToDirectory = (nameToSave?: string) => {
    const name = (nameToSave || trimmedCustName).trim()
    if (!name) return
    setCustomerName(name)
    saveCustomer({
      name,
      phone: customerPhone.trim() || undefined,
      email: customerEmail.trim() || undefined,
    })
  }

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  if (!currentBoard) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    if (modules.clientContact && customerName.trim()) {
      useCustomerStore.getState().saveCustomer({
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      })
    }

    addTask(boardId, selectedColumnId, {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assignee: assignee.trim() || undefined,
      customerName: modules.clientContact && customerName.trim() ? customerName.trim() : undefined,
      customerPhone: modules.clientContact && customerPhone.trim() ? customerPhone.trim() : undefined,
      customerEmail: modules.clientContact && customerEmail.trim() ? customerEmail.trim() : undefined,
      dueDate: dueDate || undefined,
      checklist: [],
    })

    onClose()
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
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/70 shrink-0">
          <div>
            <h2 className="text-base font-bold text-stone-900">Create New Card</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Add a new card to {currentBoard.title}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable Form Body with matching 2-column split */}
        <form id="new-card-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              Card Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Innova Service, Udaipur Package, Client Proposal..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* 2-Column Split: 7 cols left, 5 cols right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Columns */}
            <div className="space-y-5 lg:col-span-7">
              {/* Stage & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Stage / Column
                  </label>
                  <select
                    value={selectedColumnId}
                    onChange={(e) => setSelectedColumnId(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 focus:border-amber-500 focus:outline-none"
                  >
                    {currentBoard.columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold uppercase focus:outline-none ${
                      priorityColors[priority].bg
                    } ${priorityColors[priority].text} ${priorityColors[priority].border}`}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Notes & Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Task details, instructions, special requests..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 p-3 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Right 5 Columns */}
            <div className="space-y-5 lg:col-span-5">
              {/* Assignee & Due Date Card */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                  Assignment & Schedule
                </span>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                    <UserCheck className="size-3.5 text-stone-400" />
                    Assignee
                  </label>
                  <select
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {activeStaff.map((member) => (
                      <option key={member.id} value={member.name}>
                        {member.name} ({member.role.charAt(0).toUpperCase() + member.role.slice(1)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                    <Clock className="size-3.5 text-stone-400" />
                    Due / Deadline Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Client Details Section - when enabled */}
              {modules.clientContact && (
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3 animate-in fade-in-50">
                  <span className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                    Customer Information
                  </span>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <User className="size-3 text-stone-400" />
                        Client Name
                      </span>
                      {trimmedCustName && !isCustInDirectory && (
                        <button
                          type="button"
                          onClick={() => handleAddCustToDirectory()}
                          className="inline-flex items-center gap-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold transition cursor-pointer"
                          title="Save this client to the Customer Directory"
                        >
                          <UserPlus className="size-3 text-amber-600" />
                          <span>+ Add to Directory</span>
                        </button>
                      )}
                      {trimmedCustName && isCustInDirectory && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                          <Check className="size-3 text-emerald-600" />
                          <span>Saved in Directory</span>
                        </span>
                      )}
                      {!trimmedCustName && (
                        <span className="text-[10px] text-amber-600 font-normal">Autofills saved info</span>
                      )}
                    </label>
                    <CustomerCombobox
                      value={customerName}
                      onChange={setCustomerName}
                      onAddNewCustomer={handleAddCustToDirectory}
                      onSelectCustomer={(c) => {
                        setCustomerName(c.name)
                        if (c.phone) setCustomerPhone(c.phone)
                        if (c.email) setCustomerEmail(c.email)
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                      <Phone className="size-3 text-stone-400" />
                      Phone / WhatsApp
                    </label>
                    <PhoneInput
                      value={customerPhone}
                      onChange={setCustomerPhone}
                      placeholder="98290 12345"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                      <Mail className="size-3 text-stone-400" />
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="client@mail.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-stone-200 bg-stone-50/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-card-form"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 active:scale-95 transition"
          >
            <Plus className="size-4" />
            <span>Create Card</span>
          </button>
        </div>
      </div>
    </div>
  )
}
