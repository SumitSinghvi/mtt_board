import { useState, useEffect } from "react"
import {
  X,
  Plus,
  MapPin,
  Calendar,
  Car,
  Users,
  IndianRupee,
  Clock,
  User,
  Phone,
  Mail,
  UserCheck,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useCustomerStore } from "../store/customerStore"
import { CustomerCombobox } from "./CustomerCombobox"
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
    tripLogistics: false,
    commercials: false,
    subtasks: true,
  }

  const [selectedColumnId, setSelectedColumnId] = useState(defaultColumnId)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [assignee, setAssignee] = useState("")
  const [dueDate, setDueDate] = useState("")

  // Client info
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")

  // Logistics
  const [pickupLocation, setPickupLocation] = useState("")
  const [destination, setDestination] = useState("")
  const [travelStartDate, setTravelStartDate] = useState("")
  const [travelEndDate, setTravelEndDate] = useState("")
  const [vehicleType, setVehicleType] = useState("")
  const [paxAdults, setPaxAdults] = useState<string>("")
  const [paxKids, setPaxKids] = useState<string>("")

  // Commercials
  const [amount, setAmount] = useState<string>("")
  const [advancePaid, setAdvancePaid] = useState<string>("")

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
      pickupLocation: modules.tripLogistics && pickupLocation.trim() ? pickupLocation.trim() : undefined,
      destination: modules.tripLogistics && destination.trim() ? destination.trim() : undefined,
      travelStartDate: modules.tripLogistics && travelStartDate ? travelStartDate : undefined,
      travelEndDate: modules.tripLogistics && travelEndDate ? travelEndDate : undefined,
      vehicleType: modules.tripLogistics && vehicleType.trim() ? vehicleType.trim() : undefined,
      paxAdults: modules.tripLogistics && paxAdults ? Number(paxAdults) : undefined,
      paxKids: modules.tripLogistics && paxKids ? Number(paxKids) : undefined,
      amount: modules.commercials && amount ? Number(amount) : undefined,
      advancePaid: modules.commercials && advancePaid ? Number(advancePaid) : undefined,
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

              {/* Trip & Route Logistics - when enabled */}
              {modules.tripLogistics && (
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3 animate-in fade-in-50">
                  <span className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                    Trip Logistics & Route
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                        <MapPin className="size-3 text-stone-400" />
                        Pickup Point
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Jaipur Railway Station"
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                        <MapPin className="size-3 text-stone-400" />
                        Destination
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Jodhpur - Jaisalmer"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                        <Calendar className="size-3 text-stone-400" />
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={travelStartDate}
                        onChange={(e) => setTravelStartDate(e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                        <Calendar className="size-3 text-stone-400" />
                        End Date
                      </label>
                      <input
                        type="date"
                        value={travelEndDate}
                        onChange={(e) => setTravelEndDate(e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
                        <Car className="size-3 text-stone-400" />
                        Vehicle
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Innova Crysta"
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
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
                        value={paxAdults}
                        onChange={(e) => setPaxAdults(e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
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
                        value={paxKids}
                        onChange={(e) => setPaxKids(e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                  <input
                    type="text"
                    placeholder="e.g. Ramesh K."
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none"
                  />
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
                      <span className="text-[10px] text-amber-600 font-normal">Autofills saved info</span>
                    </label>
                    <CustomerCombobox
                      value={customerName}
                      onChange={setCustomerName}
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
                    <input
                      type="text"
                      placeholder="+91 98290 12345"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
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

              {/* Financials & Deadline - when enabled */}
              {modules.commercials && (
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3 animate-in fade-in-50">
                  <span className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                    Billing Details
                  </span>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                      <IndianRupee className="size-3 text-emerald-600" />
                      Quote Amount (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Total package price"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                      <IndianRupee className="size-3 text-emerald-600" />
                      Advance Paid (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Advance deposit"
                      value={advancePaid}
                      onChange={(e) => setAdvancePaid(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
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
