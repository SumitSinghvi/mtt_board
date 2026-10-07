import { useState, useEffect } from "react"
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  X,
  Phone,
  Mail,
  Pencil,
  Check,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react"
import { useStaffStore, type StaffRole, type StaffMember, type StaffPermissions } from "../store/staffStore"
import { useBoardStore } from "../store/boardStore"

const roleLabels: Record<StaffRole, { title: string; color: string; desc: string }> = {
  admin: {
    title: "Admin",
    color: "bg-red-50 text-red-800 border-red-200",
    desc: "Full access to all boards, financials, modules, staff controls, and team settings",
  },
  visa: {
    title: "Visa",
    color: "bg-purple-50 text-purple-900 border-purple-200",
    desc: "Dedicated visa applications, documentation tracking, embassy liaison, and passport status",
  },
  travel: {
    title: "Travel",
    color: "bg-sky-50 text-sky-800 border-sky-200",
    desc: "Tour itineraries, packages, flight/hotel bookings, vehicles, and customer trip operations",
  },
  accounts: {
    title: "Accounts",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    desc: "Financial commercials, invoices, advances received, and vendor settlements",
  },
}

export function StaffPage() {
  const { staff, loading, fetchStaffFromSupabase, addStaff, updateStaff, updateStaffRole, deleteStaff } =
    useStaffStore()
  const { boards } = useBoardStore()

  useEffect(() => {
    fetchStaffFromSupabase()
  }, [fetchStaffFromSupabase])

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<StaffRole>("travel")

  // Edit Staff Modal state
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editRole, setEditRole] = useState<StaffRole>("travel")
  const [editPermissions, setEditPermissions] = useState<StaffPermissions>({
    allowedBoardIds: undefined,
    canCreateCards: true,
    canEditCards: true,
    canDeleteCards: false,
    canViewCommercials: true,
  })

  const openEditModal = (member: StaffMember) => {
    setEditingStaff(member)
    setEditName(member.name)
    setEditPhone(member.phone)
    setEditEmail(member.email)
    setEditRole(member.role)
    setEditPermissions(
      member.permissions || {
        allowedBoardIds: undefined,
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: member.role === "admin",
        canViewCommercials: member.role === "admin" || member.role === "accounts",
      }
    )
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStaff || !editName.trim()) return

    updateStaff(editingStaff.id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      role: editRole,
      permissions: editPermissions,
    })

    setEditingStaff(null)
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    addStaff({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      role,
      status: "active",
      permissions: {
        allowedBoardIds: undefined,
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: role === "admin",
        canViewCommercials: role === "admin" || role === "accounts",
      },
    })

    setName("")
    setPhone("")
    setEmail("")
    setRole("travel")
    setIsInviteOpen(false)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-stone-100/70 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 bg-white px-6 py-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 tracking-tight">Staff & Role Access</h1>
            <p className="text-xs text-stone-500">
              Manage operators, drivers, tour coordinators, and role privileges
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchStaffFromSupabase()}
            title="Sync with Supabase"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-amber-600" : "text-stone-500"}`} />
            <span>Sync Profiles</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700 transition"
          >
            <UserPlus className="size-3.5" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Staff List Grid */}
      <div className="flex-1 overflow-y-auto bg-white border border-stone-200 rounded-xl shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-600">
              <th className="py-3 px-5">Staff Name</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">Role & Access</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {staff.map((member: StaffMember) => (
              <tr key={member.id} className="hover:bg-stone-50/50 transition">
                <td className="py-3.5 px-5 font-semibold text-stone-900">
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-full bg-stone-200 text-stone-700 font-bold flex items-center justify-center text-xs">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span>{member.name}</span>
                      <div className="text-[10px] text-stone-400 font-normal">
                        Joined {member.joinedDate}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="py-3.5 px-4 text-stone-600 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Phone className="size-3 text-stone-400" />
                    <span>{member.phone}</span>
                  </div>
                  {member.email && (
                    <div className="flex items-center gap-1.5 text-stone-400 text-[11px]">
                      <Mail className="size-3" />
                      <span>{member.email}</span>
                    </div>
                  )}
                </td>

                <td className="py-3.5 px-4">
                  <select
                    value={member.role}
                    onChange={(e) => updateStaffRole(member.id, e.target.value as StaffRole)}
                    className={`rounded px-2 py-1 text-[11px] font-semibold border outline-none cursor-pointer ${
                      roleLabels[member.role]?.color || "bg-stone-100 text-stone-800"
                    }`}
                  >
                    <option value="admin">Admin</option>
                    <option value="visa">Visa</option>
                    <option value="travel">Travel</option>
                    <option value="accounts">Accounts</option>
                  </select>
                </td>

                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(member)}
                      title="Edit Staff Details & Permissions"
                      className="p-1 rounded text-stone-500 hover:text-amber-700 hover:bg-stone-100 transition"
                    >
                      <Pencil className="size-3.5" />
                    </button>

                    {member.role !== "admin" && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove staff member "${member.name}"?`)) {
                            deleteStaff(member.id)
                          }
                        }}
                        title="Remove Staff Member"
                        className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs" onClick={() => setIsInviteOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl z-10">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h2 className="text-sm font-bold text-stone-900">Add Staff Member</h2>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Surendra Meena"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98290 00000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="surendra@mohittours.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Role & Responsibility</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                >
                  <option value="travel">Travel (Itineraries & Bookings)</option>
                  <option value="visa">Visa (Applications & Liaison)</option>
                  <option value="accounts">Accounts (Billing & Advances)</option>
                  <option value="admin">Admin (Full Control)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 shadow-2xs"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Details & Permissions Modal (Wider & Comprehensive) */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs"
            onClick={() => setEditingStaff(null)}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl z-10 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm">
                  {editName.charAt(0).toUpperCase() || "S"}
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">Edit Staff Member & Access</h2>
                  <p className="text-xs text-stone-500">Configure profile details, board visibility, and task action privileges</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Personal & Role info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Primary Role Title</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as StaffRole)}
                    className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="admin">Admin (Full Control)</option>
                    <option value="visa">Visa (Applications & Liaison)</option>
                    <option value="travel">Travel (Itineraries & Bookings)</option>
                    <option value="accounts">Accounts (Billing & Financials)</option>
                  </select>
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
                      onClick={() => setEditPermissions((p) => ({ ...p, allowedBoardIds: undefined }))}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                        !editPermissions.allowedBoardIds
                          ? "bg-amber-600 text-white"
                          : "bg-stone-200/70 text-stone-700 hover:bg-stone-300"
                      }`}
                    >
                      All Boards
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditPermissions((p) => ({
                          ...p,
                          allowedBoardIds: p.allowedBoardIds || boards.slice(0, 1).map((b) => b.id),
                        }))
                      }
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                        editPermissions.allowedBoardIds
                          ? "bg-amber-600 text-white"
                          : "bg-stone-200/70 text-stone-700 hover:bg-stone-300"
                      }`}
                    >
                      Selected Only
                    </button>
                  </div>
                </div>

                {editPermissions.allowedBoardIds && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-stone-200/70">
                    {boards.map((b) => {
                      const isAllowed = (editPermissions.allowedBoardIds || []).includes(b.id)
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
                              const current = editPermissions.allowedBoardIds || []
                              const updated = e.target.checked
                                ? [...current, b.id]
                                : current.filter((id) => id !== b.id)
                              setEditPermissions((p) => ({ ...p, allowedBoardIds: updated }))
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
                      checked={editPermissions.canCreateCards}
                      onChange={(e) =>
                        setEditPermissions((p) => ({ ...p, canCreateCards: e.target.checked }))
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
                      checked={editPermissions.canEditCards}
                      onChange={(e) =>
                        setEditPermissions((p) => ({ ...p, canEditCards: e.target.checked }))
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
                      checked={editPermissions.canDeleteCards}
                      onChange={(e) =>
                        setEditPermissions((p) => ({ ...p, canDeleteCards: e.target.checked }))
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
                      checked={editPermissions.canViewCommercials}
                      onChange={(e) =>
                        setEditPermissions((p) => ({ ...p, canViewCommercials: e.target.checked }))
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
                  onClick={() => setEditingStaff(null)}
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
      )}
    </div>
  )
}
