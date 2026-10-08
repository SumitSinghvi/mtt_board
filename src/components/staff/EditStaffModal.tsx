import { useState, useEffect } from "react"
import { X, LayoutDashboard, Check } from "lucide-react"
import { useStaffStore, type StaffMember, type StaffRole, type StaffPermissions } from "../../store/staffStore"
import type { Board } from "../../schemas/board"
import { PhoneInput } from "../ui/PhoneInput"

interface EditStaffModalProps {
  member: StaffMember | null
  boards: Board[]
  onClose: () => void
  onSave: (id: string, updates: Partial<StaffMember>) => void
}

export function EditStaffModal({ member, boards, onClose, onSave }: EditStaffModalProps) {
  const { updateStaffPassword } = useStaffStore()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [role, setRole] = useState<StaffRole>("travel")
  const [permissions, setPermissions] = useState<StaffPermissions>({
    allowedBoardIds: undefined,
    canCreateCards: true,
    canEditCards: true,
    canDeleteCards: false,
    canViewCommercials: true,
  })

  useEffect(() => {
    if (member) {
      setName(member.name)
      setPhone(member.phone)
      setEmail(member.email)
      setRole(member.role)
      setNewPassword("")
      setPermissions(
        member.permissions || {
          allowedBoardIds: undefined,
          canCreateCards: true,
          canEditCards: true,
          canDeleteCards: member.role === "admin",
          canViewCommercials: member.role === "admin" || member.role === "accounts",
        }
      )
    }
  }, [member])

  if (!member) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (newPassword.trim()) {
      await updateStaffPassword(member.id, newPassword.trim())
    }

    onSave(member.id, {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      role,
      permissions,
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-xl sm:rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-6 shadow-2xl z-10 animate-in fade-in-50 zoom-in-95">
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm">
              {name.charAt(0).toUpperCase() || "S"}
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Edit Staff Member & Access</h2>
              <p className="text-xs text-stone-500">
                Configure profile details, board visibility, and task action privileges
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Personal & Role info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Mobile Phone *</label>
              <PhoneInput
                required
                placeholder="98290 00000"
                value={phone}
                onChange={setPhone}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Primary Role Title</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
                className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
              >
                <option value="admin">Admin (Full Control)</option>
                <option value="visa">Visa (Applications & Liaison)</option>
                <option value="travel">Travel (Itineraries & Bookings)</option>
                <option value="accounts">Accounts (Billing & Financials)</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">Reset Portal Login Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep existing password"
                className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none placeholder:text-stone-400"
              />
            </div>
          </div>

          {/* 1. Board Visibility & Access Permissions */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <LayoutDashboard className="size-3.5 text-amber-700" />
                  <span>Board Access Permissions</span>
                </h3>
                <p className="text-[11px] text-stone-500">Choose which boards this staff member can view</p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPermissions((p) => ({ ...p, allowedBoardIds: undefined }))}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    !permissions.allowedBoardIds
                      ? "bg-amber-600 text-white"
                      : "bg-stone-200/70 text-stone-700 hover:bg-stone-300"
                  }`}
                >
                  All Boards
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPermissions((p) => ({
                      ...p,
                      allowedBoardIds: p.allowedBoardIds || boards.slice(0, 1).map((b) => b.id),
                    }))
                  }
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    permissions.allowedBoardIds
                      ? "bg-amber-600 text-white"
                      : "bg-stone-200/70 text-stone-700 hover:bg-stone-300"
                  }`}
                >
                  Selected Only
                </button>
              </div>
            </div>

            {permissions.allowedBoardIds && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-stone-200/70">
                {boards.map((b) => {
                  const isAllowed = (permissions.allowedBoardIds || []).includes(b.id)
                  return (
                    <label
                      key={b.id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer select-none transition text-xs ${
                        isAllowed
                          ? "bg-amber-50/80 border-amber-300 text-amber-950 font-medium"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAllowed}
                        onChange={(e) => {
                          const current = permissions.allowedBoardIds || []
                          const updated = e.target.checked
                            ? [...current, b.id]
                            : current.filter((id) => id !== b.id)
                          setPermissions((p) => ({ ...p, allowedBoardIds: updated }))
                        }}
                        className="rounded text-amber-600 focus:ring-amber-500 size-3.5"
                      />
                      <div className="truncate">
                        <div className="truncate">{b.title}</div>
                        <div className="text-[10px] text-stone-400">{b.columns.length} columns</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* 2. Task Level Permissions */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 space-y-3">
            <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <Check className="size-3.5 text-amber-700" />
              <span>Task Operations & Action Rights</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-stone-200 bg-white hover:border-amber-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={permissions.canCreateCards}
                  onChange={(e) =>
                    setPermissions((p) => ({ ...p, canCreateCards: e.target.checked }))
                  }
                  className="rounded text-amber-600 focus:ring-amber-500 size-3.5 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-stone-800">Create New Tasks / Cards</div>
                  <div className="text-[10px] text-stone-500">Can add new booking & vehicle cards to columns</div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-stone-200 bg-white hover:border-amber-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={permissions.canEditCards}
                  onChange={(e) =>
                    setPermissions((p) => ({ ...p, canEditCards: e.target.checked }))
                  }
                  className="rounded text-amber-600 focus:ring-amber-500 size-3.5 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-stone-800">Edit Existing Cards</div>
                  <div className="text-[10px] text-stone-500">Can update checklists, notes, dates, and move cards</div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-stone-200 bg-white hover:border-amber-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={permissions.canDeleteCards}
                  onChange={(e) =>
                    setPermissions((p) => ({ ...p, canDeleteCards: e.target.checked }))
                  }
                  className="rounded text-amber-600 focus:ring-amber-500 size-3.5 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-stone-800">Delete Tasks & Cards</div>
                  <div className="text-[10px] text-stone-500">Allow removing cards permanently from boards</div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-stone-200 bg-white hover:border-amber-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={permissions.canViewCommercials}
                  onChange={(e) =>
                    setPermissions((p) => ({ ...p, canViewCommercials: e.target.checked }))
                  }
                  className="rounded text-amber-600 focus:ring-amber-500 size-3.5 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-stone-800">View Commercials & Rates</div>
                  <div className="text-[10px] text-stone-500">Can view booking amounts and payments on cards</div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 shadow-2xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
