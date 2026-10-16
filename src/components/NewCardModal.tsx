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
  Crown,
  Hotel,
  IndianRupee,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useCustomerStore } from "../store/customerStore"
import { useStaffStore, initialStaff } from "../store/staffStore"
import { CustomerCombobox } from "./CustomerCombobox"
import { PhoneInput } from "./ui/PhoneInput"
import type { Priority, HotelBookingStatus, OutgoingPaymentStatus } from "../schemas/board"
import { useAuthStore } from "../store/authStore"
import { isBoardAllowed } from "../lib/permissions"
import { toast } from "sonner"

interface NewCardModalProps {
  boardId?: string
  defaultColumnId?: string
  onClose: () => void
}

const priorityColors: Record<Priority, { bg: string; text: string; border: string }> = {
  urgent: { bg: "bg-red-50", text: "text-red-700", border: "border-red-300" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300" },
  low: { bg: "bg-stone-100", text: "text-stone-600", border: "border-stone-300" },
}

export function NewCardModal({ boardId, defaultColumnId, onClose }: NewCardModalProps) {
  const { boards, addTask, activeBoardId } = useBoardStore()
  const { profile } = useAuthStore()

  const allowedBoards = boards.filter((b) => !b.isArchived && isBoardAllowed(b, profile))
  const [selectedBoardId, setSelectedBoardId] = useState<string>(() => {
    if (boardId && boards.some((b) => b.id === boardId)) return boardId
    if (activeBoardId && boards.some((b) => b.id === activeBoardId)) return activeBoardId
    return allowedBoards[0]?.id || boards[0]?.id || ""
  })

  const currentBoard = boards.find((b) => b.id === selectedBoardId) || boards[0]

  const modules = currentBoard?.modules || {
    clientContact: true,
    subtasks: true,
    hotelBooking: false,
    paymentTracking: false,
    outgoingPayment: false,
  }

  const [selectedColumnId, setSelectedColumnId] = useState(() => {
    if (defaultColumnId && currentBoard?.columns.some((c) => c.id === defaultColumnId)) {
      return defaultColumnId
    }
    return currentBoard?.columns[0]?.id || ""
  })

  const handleBoardChange = (newBoardId: string) => {
    setSelectedBoardId(newBoardId)
    const targetBoard = boards.find((b) => b.id === newBoardId)
    if (targetBoard && targetBoard.columns.length > 0) {
      setSelectedColumnId(targetBoard.columns[0].id)
    }
  }
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [assignees, setAssignees] = useState<string[]>([])
  const [leader, setLeader] = useState<string>("")
  const [dueDate, setDueDate] = useState("")

  // Hotel booking state
  const [hotelStatus, setHotelStatus] = useState<HotelBookingStatus>("none")
  const [hotelName, setHotelName] = useState("")
  const [hotelHoldUntil, setHotelHoldUntil] = useState("")
  const [hotelConfirmationNo, setHotelConfirmationNo] = useState("")
  const [hotelNotes, setHotelNotes] = useState("")

  // Payment tracking state
  const [totalBookingAmount, setTotalBookingAmount] = useState<string>("")
  const [advanceAmount, setAdvanceAmount] = useState<string>("")
  const [advanceDate, setAdvanceDate] = useState<string>("")
  const [advanceMode, setAdvanceMode] = useState<string>("UPI")

  // Outgoing payment state
  const [outgoingAmount, setOutgoingAmount] = useState<string>("")
  const [outgoingStatus, setOutgoingStatus] = useState<OutgoingPaymentStatus>("none")
  const [outgoingNotes, setOutgoingNotes] = useState<string>("")

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

    const hotelBooking =
      modules.hotelBooking && hotelStatus !== "none"
        ? {
            status: hotelStatus,
            hotelName: hotelName.trim() || undefined,
            holdUntil: hotelHoldUntil || undefined,
            confirmationNo: hotelConfirmationNo.trim() || undefined,
            notes: hotelNotes.trim() || undefined,
          }
        : undefined

    const totalAmountNum = totalBookingAmount ? Number(totalBookingAmount) : undefined
    const advanceAmountNum = advanceAmount ? Number(advanceAmount) : undefined

    const paymentTracking =
      modules.paymentTracking && (totalAmountNum !== undefined || advanceAmountNum !== undefined)
        ? {
            totalAmount: totalAmountNum,
            installments:
              advanceAmountNum !== undefined
                ? [
                    {
                      id: `inst-${Date.now()}`,
                      name: "Advance Payment",
                      amount: advanceAmountNum,
                      receivedDate: advanceDate || undefined,
                      paymentMode: advanceMode || undefined,
                    },
                  ]
                : [],
          }
        : undefined

    const outgoingAmountNum = outgoingAmount ? Number(outgoingAmount) : undefined
    const outgoingPayment =
      modules.outgoingPayment && (outgoingAmountNum !== undefined || outgoingNotes.trim())
        ? {
            amount: outgoingAmountNum,
            status: outgoingStatus,
            notes: outgoingNotes.trim() || undefined,
          }
        : undefined

    addTask(selectedBoardId, selectedColumnId, {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assignees,
      assignee: assignees[0] || undefined,
      leader: leader || (assignees.length > 0 ? assignees[0] : undefined),
      customerName: modules.clientContact && customerName.trim() ? customerName.trim() : undefined,
      customerPhone: modules.clientContact && customerPhone.trim() ? customerPhone.trim() : undefined,
      customerEmail: modules.clientContact && customerEmail.trim() ? customerEmail.trim() : undefined,
      amount: totalAmountNum,
      advancePaid: advanceAmountNum,
      dueDate: dueDate || undefined,
      hotelBooking,
      paymentTracking,
      outgoingPayment,
      checklist: [],
    })

    toast.success("Card created")
    onClose()
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
        <div className="flex items-center justify-between border-b border-stone-200 px-3.5 sm:px-6 py-3 sm:py-4 bg-stone-50/70 shrink-0">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-stone-900">Create New Card</h2>
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
        <form id="new-card-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5">
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
              <div className={`grid gap-3 ${allowedBoards.length > 1 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"}`}>
                {allowedBoards.length > 1 && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Board / Pipeline
                    </label>
                    <select
                      value={selectedBoardId}
                      onChange={(e) => handleBoardChange(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 focus:border-amber-500 focus:outline-none"
                    >
                      {allowedBoards.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <UserCheck className="size-3.5 text-stone-400" />
                      Assignees {assignees.length > 0 && `(${assignees.length})`}
                    </span>
                  </label>

                  {/* Selected Assignees Chips */}
                  <div className="flex flex-wrap gap-1 mb-1.5 min-h-[26px]">
                    {assignees.length === 0 ? (
                      <span className="text-xs text-stone-400 italic py-0.5">Unassigned</span>
                    ) : (
                      assignees.map((name) => {
                        const isLeader = (leader || assignees[0]) === name
                        return (
                          <span
                            key={name}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition ${
                              isLeader
                                ? "bg-amber-100 text-amber-900 border border-amber-300 font-semibold"
                                : "bg-stone-100 text-stone-700 border border-stone-200/80"
                            }`}
                          >
                            {isLeader && <Crown className="size-3 text-amber-700 shrink-0" />}
                            <span className="truncate max-w-[120px]">{name}</span>
                            {isLeader && <span className="text-[9px] uppercase font-bold text-amber-700">Lead</span>}
                            <div className="flex items-center gap-0.5 ml-0.5">
                              <button
                                type="button"
                                onClick={() => setLeader(name)}
                                className={`rounded p-0.5 cursor-pointer ${
                                  isLeader
                                    ? "text-amber-700"
                                    : "text-stone-300 hover:text-amber-600"
                                }`}
                                title={isLeader ? "Team Leader" : `Make ${name} Team Leader`}
                              >
                                <Crown className="size-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = assignees.filter((n) => n !== name)
                                  setAssignees(next)
                                  if (leader === name) {
                                    setLeader(next[0] || "")
                                  }
                                }}
                                className="hover:text-red-600 rounded p-0.5 text-stone-400 cursor-pointer"
                                title={`Remove ${name}`}
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          </span>
                        )
                      })
                    )}
                  </div>

                  {/* Add Assignee Dropdown */}
                  <select
                    value=""
                    onChange={(e) => {
                      const selected = e.target.value
                      if (selected && !assignees.includes(selected)) {
                        setAssignees((prev) => [...prev, selected])
                        if (!leader && assignees.length === 0) {
                          setLeader(selected)
                        }
                      }
                    }}
                    className="w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>+ Add assignee...</option>
                    {activeStaff
                      .filter((member) => !assignees.includes(member.name))
                      .map((member) => (
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

              {/* Hotel Booking Section - when enabled */}
              {modules.hotelBooking && (
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                      <Hotel className="size-3.5 text-amber-600" />
                      Hotel Booking
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                        hotelStatus === "hold"
                          ? "bg-amber-100/80 text-amber-900 border-amber-300"
                          : hotelStatus === "blocked"
                          ? "bg-purple-100/80 text-purple-900 border-purple-300"
                          : hotelStatus === "confirmed"
                          ? "bg-emerald-100/80 text-emerald-900 border-emerald-300"
                          : "bg-white text-stone-500 border-stone-200"
                      }`}
                    >
                      {hotelStatus === "none" ? "Unbooked" : hotelStatus}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Status
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(
                        [
                          { value: "none", label: "None" },
                          { value: "hold", label: "Hold" },
                          { value: "blocked", label: "Blocked" },
                          { value: "confirmed", label: "Confirmed" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setHotelStatus(opt.value)}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center transition cursor-pointer border ${
                            hotelStatus === opt.value
                              ? opt.value === "hold"
                                ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                                : opt.value === "blocked"
                                ? "bg-purple-600 text-white border-purple-700 shadow-2xs"
                                : opt.value === "confirmed"
                                ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                                : "bg-stone-700 text-white border-stone-800 shadow-2xs"
                              : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Hotel / Property Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Taj Jai Mahal, Oberoi"
                      value={hotelName}
                      onChange={(e) => setHotelName(e.target.value)}
                      className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {hotelStatus === "hold" && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 space-y-1">
                      <label className="block text-[11px] font-bold text-amber-900">
                        Hold Cutoff / Follow-up Date
                      </label>
                      <input
                        type="date"
                        value={hotelHoldUntil}
                        onChange={(e) => setHotelHoldUntil(e.target.value)}
                        className="w-full rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {(hotelStatus === "confirmed" || hotelStatus === "blocked") && (
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                        Confirmation / Voucher No
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. VCH-8821"
                        value={hotelConfirmationNo}
                        onChange={(e) => setHotelConfirmationNo(e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {hotelStatus !== "none" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                        Hotel & Room Notes
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. 2 Deluxe Rooms, MAPAI meal plan"
                        value={hotelNotes}
                        onChange={(e) => setHotelNotes(e.target.value)}
                        className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none resize-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Payment Tracking Section - when enabled */}
              {modules.paymentTracking && (
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                      <IndianRupee className="size-3.5 text-emerald-600" />
                      Payment & Advance
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Installment Tracking
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                        Total Package Value (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs">₹</span>
                        <input
                          type="number"
                          placeholder="e.g. 45000"
                          value={totalBookingAmount}
                          onChange={(e) => setTotalBookingAmount(e.target.value)}
                          className="w-full rounded-md border border-stone-200 bg-white pl-6 pr-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                        Advance Payment (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs">₹</span>
                        <input
                          type="number"
                          placeholder="e.g. 15000"
                          value={advanceAmount}
                          onChange={(e) => setAdvanceAmount(e.target.value)}
                          className="w-full rounded-md border border-stone-200 bg-white pl-6 pr-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {advanceAmount && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                          Advance Received Date
                        </label>
                        <input
                          type="date"
                          value={advanceDate}
                          onChange={(e) => setAdvanceDate(e.target.value)}
                          className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                          Payment Mode
                        </label>
                        <select
                          value={advanceMode}
                          onChange={(e) => setAdvanceMode(e.target.value)}
                          className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                        >
                          <option value="UPI">UPI / GPay / PhonePe</option>
                          <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                          <option value="Cash">Cash</option>
                          <option value="Card">Credit / Debit Card</option>
                          <option value="Cheque">Cheque</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Outgoing Payment Section - when enabled */}
              {modules.outgoingPayment && (
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                      <ArrowUpRight className="size-3.5 text-rose-600" />
                      Outgoing Payment
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        outgoingStatus === "done"
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                          : outgoingStatus === "pending"
                          ? "bg-rose-100 text-rose-900 border-rose-300"
                          : "bg-stone-100 text-stone-500 border-stone-200"
                      }`}
                    >
                      {outgoingStatus === "done" ? "Done" : outgoingStatus === "pending" ? "Pending" : "None"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                        Amount to Pay (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-medium">₹</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={outgoingAmount}
                          onChange={(e) => {
                            const val = e.target.value
                            setOutgoingAmount(val)
                            if (outgoingStatus === "none" && val && Number(val) > 0) {
                              setOutgoingStatus("pending")
                            }
                          }}
                          className="w-full rounded-md border border-stone-200 bg-white pl-6 pr-2.5 py-1.5 text-xs focus:border-rose-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                        Status
                      </label>
                      <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-0.5">
                        <button
                          type="button"
                          onClick={() => setOutgoingStatus("none")}
                          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] font-bold uppercase transition ${
                            outgoingStatus === "none"
                              ? "bg-stone-200 text-stone-700"
                              : "text-stone-400 hover:text-stone-700"
                          }`}
                        >
                          <span>None</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOutgoingStatus("pending")}
                          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] font-bold uppercase transition ${
                            outgoingStatus === "pending"
                              ? "bg-rose-100 text-rose-900 border border-rose-200"
                              : "text-stone-500 hover:text-stone-800"
                          }`}
                        >
                          <Clock className="size-2.5" />
                          <span>Pending</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOutgoingStatus("done")}
                          className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] font-bold uppercase transition ${
                            outgoingStatus === "done"
                              ? "bg-emerald-600 text-white"
                              : "text-stone-500 hover:text-stone-800"
                          }`}
                        >
                          <CheckCircle2 className="size-2.5" />
                          <span>Done</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Payee / Vendor Note (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Innova cab fare / Hotel balance"
                      value={outgoingNotes}
                      onChange={(e) => setOutgoingNotes(e.target.value)}
                      className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="flex items-center justify-end gap-2.5 px-3.5 sm:px-6 py-3 sm:py-3.5 border-t border-stone-200 bg-stone-50/80 shrink-0">
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
