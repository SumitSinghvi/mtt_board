import { Phone, Mail, Pencil, Trash2 } from "lucide-react"
import type { StaffMember, StaffRole } from "../../store/staffStore"
import { roleLabels } from "./roleLabels"

interface StaffTableProps {
  staff: StaffMember[]
  onEditStaff: (member: StaffMember) => void
  onUpdateRole: (memberId: string, role: StaffRole) => void
  onDeleteStaff: (memberId: string, name: string) => void
}

export function StaffTable({ staff, onEditStaff, onUpdateRole, onDeleteStaff }: StaffTableProps) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-auto bg-white border border-stone-200 rounded-xl shadow-2xs">
      <table className="w-full min-w-[560px] text-left border-collapse text-xs">
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
                  onChange={(e) => onUpdateRole(member.id, e.target.value as StaffRole)}
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
                    onClick={() => onEditStaff(member)}
                    title="Edit Staff Details & Permissions"
                    className="p-1 rounded text-stone-500 hover:text-amber-700 hover:bg-stone-100 transition"
                  >
                    <Pencil className="size-3.5" />
                  </button>

                  {member.role !== "admin" && (
                    <button
                      type="button"
                      onClick={() => onDeleteStaff(member.id, member.name)}
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
  )
}
