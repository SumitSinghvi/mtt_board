import { useState } from "react"
import { X, AlertCircle, Loader2 } from "lucide-react"
import type { StaffRole } from "../../store/staffStore"
import { PhoneInput } from "../ui/PhoneInput"

interface AddStaffModalProps {
  isOpen: boolean
  onClose: () => void
  onAddStaff: (data: {
    name: string
    phone: string
    email: string
    role: StaffRole
    password: string
  }) => Promise<{ error: string | null }>
}

export function AddStaffModal({ isOpen, onClose, onAddStaff }: AddStaffModalProps) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<StaffRole>("travel")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password.trim()) return

    setError(null)
    setSubmitting(true)
    try {
      const res = await onAddStaff({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        role,
        password: password.trim(),
      })

      if (res?.error) {
        setError(res.error)
        return
      }

      setName("")
      setPhone("")
      setEmail("")
      setPassword("")
      setRole("travel")
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-stone-200 bg-white p-4 sm:p-6 shadow-xl z-10">
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
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              autoFocus
              disabled={submitting}
              placeholder="e.g. Surendra Meena"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Mobile Phone *</label>
            <PhoneInput
              required
              disabled={submitting}
              placeholder="98290 00000"
              value={phone}
              onChange={setPhone}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              disabled={submitting}
              placeholder="surendra@mohittours.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Role & Responsibility</label>
            <select
              disabled={submitting}
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none disabled:opacity-50"
            >
              <option value="travel">Travel (Itineraries & Bookings)</option>
              <option value="visa">Visa (Applications & Liaison)</option>
              <option value="accounts">Accounts (Billing & Advances)</option>
              <option value="admin">Admin (Full Control)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Portal Password (for Staff Login) *
            </label>
            <input
              type="text"
              required
              minLength={4}
              disabled={submitting}
              placeholder="e.g. mtt2024"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none disabled:opacity-50"
            />
            <p className="text-[10px] text-stone-400 mt-1">
              Staff will use this password and their email to sign in to the portal.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 shadow-2xs disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Add Member</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
