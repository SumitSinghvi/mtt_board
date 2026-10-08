import {
  Tag,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Clock,
  User,
  MessageCircle,
  UserPlus,
  Check,
  X,
  Crown,
} from "lucide-react"
import { CustomerCombobox } from "../CustomerCombobox"
import { useCustomerStore } from "../../store/customerStore"
import { formatDate } from "../../lib/date"
import { priorityColors } from "./priorityColors"
import { type Task, type Board, type Priority, getTaskAssignees } from "../../schemas/board"
import type { StaffMember } from "../../store/staffStore"
import { PhoneInput } from "../ui/PhoneInput"

interface CardDetailsSidebarProps {
  currentTask: Task
  currentBoard: Board
  columnId: string
  staff: StaffMember[]
  isOpen: boolean
  canEdit?: boolean
  onToggleOpen: () => void
  onChangeColumn: (colId: string) => void
  onChangeField: (field: keyof Task, value: unknown) => void
  clientContactEnabled: boolean
}

export function CardDetailsSidebar({
  currentTask,
  currentBoard,
  columnId,
  staff,
  isOpen,
  canEdit = true,
  onToggleOpen,
  onChangeColumn,
  onChangeField,
  clientContactEnabled,
}: CardDetailsSidebarProps) {
  const cleanPhone = currentTask.customerPhone?.replace(/[^0-9]/g, "") || ""
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`}`
    : null

  const { customers, saveCustomer } = useCustomerStore()
  const trimmedCustomerName = currentTask.customerName?.trim() || ""
  const isCustomerInDirectory = Boolean(
    trimmedCustomerName &&
    customers.some((c) => c.name.toLowerCase() === trimmedCustomerName.toLowerCase())
  )

  const handleAddCustomerToDirectory = (nameToSave?: string) => {
    const name = (nameToSave || trimmedCustomerName).trim()
    if (!name) return
    onChangeField("customerName", name)
    saveCustomer({
      name,
      phone: currentTask.customerPhone,
      email: currentTask.customerEmail,
    })
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3 shadow-2xs">
      {/* Header with Collapsible Trigger */}
      <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-700 hover:text-stone-900 transition cursor-pointer select-none"
        >
          {isOpen ? (
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

      {isOpen && (
        <>
          {/* Status Fields */}
          <div className="space-y-3 text-xs">
            {/* Stage / Column */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                Stage / Column
              </label>
              <select
                value={columnId}
                disabled={!canEdit}
                onChange={(e) => onChangeColumn(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-800 focus:border-amber-500 focus:outline-none disabled:bg-stone-100 disabled:cursor-not-allowed"
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
                disabled={!canEdit}
                onChange={(e) => onChangeField("priority", e.target.value as Priority)}
                className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold focus:outline-none uppercase disabled:opacity-75 disabled:cursor-not-allowed ${
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

            {/* Assignees */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <UserCheck className="size-3 text-stone-400" />
                  Assignees {getTaskAssignees(currentTask).length > 0 && `(${getTaskAssignees(currentTask).length})`}
                </span>
              </label>

              {/* Chips / Pills of current assignees */}
              <div className="flex flex-wrap gap-1 mb-1.5 min-h-[26px]">
                {getTaskAssignees(currentTask).length === 0 ? (
                  <span className="text-[11px] text-stone-400 italic py-0.5">Unassigned</span>
                ) : (
                  getTaskAssignees(currentTask).map((name) => {
                    const isLeader = currentTask.leader === name
                    return (
                      <span
                        key={name}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                          isLeader
                            ? "bg-amber-100 text-amber-900 border border-amber-300 font-semibold"
                            : "bg-stone-100 text-stone-700 border border-stone-200/80"
                        }`}
                      >
                        {isLeader && <Crown className="size-3 text-amber-700 shrink-0" />}
                        <span className="truncate max-w-[110px]">{name}</span>
                        {isLeader && <span className="text-[9px] uppercase font-bold text-amber-700">Lead</span>}
                        {canEdit && (
                          <div className="flex items-center gap-0.5 ml-0.5">
                            <button
                              type="button"
                              onClick={() => onChangeField("leader", isLeader ? undefined : name)}
                              className={`rounded p-0.5 cursor-pointer ${
                                isLeader
                                  ? "text-amber-700 hover:text-amber-900"
                                  : "text-stone-300 hover:text-amber-600"
                              }`}
                              title={isLeader ? "Unset Team Leader" : `Set ${name} as Team Leader`}
                            >
                              <Crown className="size-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = getTaskAssignees(currentTask).filter((n) => n !== name)
                                onChangeField("assignees", next)
                                if (isLeader) {
                                  onChangeField("leader", next[0] || undefined)
                                }
                              }}
                              className="hover:text-red-600 rounded p-0.5 text-stone-400 cursor-pointer"
                              title={`Remove ${name}`}
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        )}
                      </span>
                    )
                  })
                )}
              </div>

              {/* Add Assignee Dropdown */}
              {canEdit && (
                <select
                  value=""
                  onChange={(e) => {
                    const memberName = e.target.value
                    if (memberName) {
                      const cur = getTaskAssignees(currentTask)
                      if (!cur.includes(memberName)) {
                        onChangeField("assignees", [...cur, memberName])
                        if (!currentTask.leader) {
                          onChangeField("leader", memberName)
                        }
                      }
                    }
                  }}
                  className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-700 focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>+ Add assignee...</option>
                  {staff
                    .filter((m) => !getTaskAssignees(currentTask).includes(m.name))
                    .map((member) => (
                      <option key={member.id} value={member.name}>
                        {member.name} ({member.role.charAt(0).toUpperCase() + member.role.slice(1)})
                      </option>
                    ))}
                </select>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1 flex items-center gap-1">
                <Clock className="size-3 text-stone-400" />
                Due Date
              </label>
              <input
                type="date"
                disabled={!canEdit}
                value={currentTask.dueDate || ""}
                onChange={(e) => onChangeField("dueDate", e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none disabled:bg-stone-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Customer Section */}
          {clientContactEnabled && (
            <div className="pt-2.5 border-t border-stone-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                  <User className="size-3 text-stone-400" />
                  Customer
                </span>
                {canEdit && trimmedCustomerName && !isCustomerInDirectory && (
                  <button
                    type="button"
                    onClick={() => handleAddCustomerToDirectory()}
                    className="inline-flex items-center gap-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold transition cursor-pointer"
                    title="Save this client to the Customer Directory"
                  >
                    <UserPlus className="size-3 text-amber-600" />
                    <span>+ Add to Directory</span>
                  </button>
                )}
                {trimmedCustomerName && isCustomerInDirectory && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                    <Check className="size-3 text-emerald-600" />
                    <span>Saved in Directory</span>
                  </span>
                )}
              </div>

              <div>
                <CustomerCombobox
                  value={currentTask.customerName || ""}
                  disabled={!canEdit}
                  onChange={(name) => onChangeField("customerName", name)}
                  onAddNewCustomer={(name) => handleAddCustomerToDirectory(name)}
                  onSelectCustomer={(c) => {
                    onChangeField("customerName", c.name)
                    if (c.phone) onChangeField("customerPhone", c.phone)
                    if (c.email) onChangeField("customerEmail", c.email)
                  }}
                />
              </div>

              {/* Phone + WhatsApp row */}
              <div className="flex items-center gap-2">
                <PhoneInput
                  value={currentTask.customerPhone || ""}
                  disabled={!canEdit}
                  onChange={(val) => onChangeField("customerPhone", val)}
                  placeholder="Phone / Mobile"
                  className="flex-1"
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

          {/* Created info footer */}
          {(currentTask.createdBy || currentTask.createdAt) && (
            <div className="pt-2 border-t border-stone-200/60 space-y-1 text-[11px] text-stone-400">
              {currentTask.createdBy && (
                <div className="flex items-center justify-between">
                  <span>Created by:</span>
                  <span className="font-medium text-stone-700 truncate max-w-[140px]">
                    {currentTask.createdBy}
                  </span>
                </div>
              )}
              {currentTask.createdAt && (
                <div className="flex items-center justify-between">
                  <span>Created on:</span>
                  <span className="font-medium text-stone-600">
                    {formatDate(currentTask.createdAt)}
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
