import { useState, useEffect } from "react"
import { ShieldCheck, UserPlus, RefreshCw } from "lucide-react"
import { useStaffStore, type StaffRole, type StaffMember } from "../store/staffStore"
import { useBoardStore } from "../store/boardStore"
import { StaffTable } from "./staff/StaffTable"
import { AddStaffModal } from "./staff/AddStaffModal"
import { EditStaffModal } from "./staff/EditStaffModal"

import { getDefaultRolePermissions } from "../lib/permissions"

export function StaffPage() {
  const { staff, loading, fetchStaffFromSupabase, addStaff, updateStaff, updateStaffRole, deleteStaff } =
    useStaffStore()
  const { boards } = useBoardStore()

  useEffect(() => {
    fetchStaffFromSupabase()
  }, [fetchStaffFromSupabase])

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)

  const handleAddMember = async (data: {
    name: string
    phone: string
    email: string
    role: StaffRole
    password: string
  }) => {
    return await addStaff(
      {
        name: data.name,
        phone: data.phone,
        email: data.email,
        role: data.role,
        status: "active",
        permissions: getDefaultRolePermissions(data.role),
      },
      data.password
    )
  }

  const handleDeleteStaff = (memberId: string, memberName: string) => {
    if (confirm(`Remove staff member "${memberName}"?`)) {
      deleteStaff(memberId)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-stone-100/70 p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b border-stone-200 bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">Staff & Role Access</h1>
            <p className="text-xs text-stone-500">
              Manage operators, drivers, tour coordinators, and role privileges
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => fetchStaffFromSupabase()}
            title="Sync with Supabase"
            disabled={loading}
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-amber-600" : "text-stone-500"}`} />
            <span>Sync Profiles</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700 transition"
          >
            <UserPlus className="size-3.5" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Staff List Grid */}
      <StaffTable
        staff={staff}
        onEditStaff={(member) => setEditingStaff(member)}
        onUpdateRole={(id, role) => updateStaffRole(id, role)}
        onDeleteStaff={handleDeleteStaff}
      />

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onAddStaff={handleAddMember}
      />

      {/* Edit Staff Details & Permissions Modal */}
      <EditStaffModal
        member={editingStaff}
        boards={boards}
        onClose={() => setEditingStaff(null)}
        onSave={(id, updates) => updateStaff(id, updates)}
      />
    </div>
  )
}
