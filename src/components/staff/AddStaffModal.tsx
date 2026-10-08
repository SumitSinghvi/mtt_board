import { useState } from "react"
import { X } from "lucide-react"
import type { StaffRole } from "../../store/staffStore"

interface AddStaffModalProps {
  isOpen: boolean
  onClose: () => void
  onAddStaff: (data: { name: string; phone: string; email: string; role: StaffRole }) => void
}

export function AddStaffModal({ isOpen, onClose, onAddStaff }: AddStaffModalProps) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<StaffRole>("travel")

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    onAddStaff({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      role,
    })

    setName("")
    setPhone("")
    setEmail("")
    setRole("travel")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl z-10">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <h2 className="text-sm font-bold text-stone-900">Add Staff Member</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
              onClick={onClose}
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
  )
}
