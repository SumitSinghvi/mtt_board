import { useState } from "react"
import { Mail, Lock, User, AlertCircle, ArrowRight } from "lucide-react"
import { useAuthStore } from "../store/authStore"
import type { StaffRole } from "../store/staffStore"
import logoImg from "../assets/logo.png"

export function AuthModal({ onClose }: { onClose?: () => void }) {
  const { signInWithPassword, signUpWithPassword, error: authError } = useAuthStore()

  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<StaffRole>("travel")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSubmitting(true)

    try {
      if (mode === "login") {
        const res = await signInWithPassword(email, password)
        if (res.error) {
          setErrorMessage(res.error)
        } else if (onClose) {
          onClose()
        }
      } else {
        const res = await signUpWithPassword(email, password, name, role)
        if (res.error) {
          setErrorMessage(res.error)
        } else if (onClose) {
          onClose()
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-7 shadow-2xl animate-in zoom-in-95">
        <div className="flex flex-col items-center text-center mb-6">
          <img src={logoImg} alt="Mohit Tours & Travels" className="h-10 w-auto object-contain mb-3" />
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            {mode === "login" ? "Sign In to MTT Portal" : "Create Staff Account"}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {mode === "login"
              ? "Access your assigned boards, operations & financials"
              : "Register as an operator, visa executive, or accounts manager"}
          </p>
        </div>

        {(errorMessage || authError) && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-600" />
            <p>{errorMessage || authError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-stone-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 pl-9 pr-3 py-2 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 size-4 text-stone-400" />
              <input
                type="email"
                required
                placeholder="name@mohittours.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-300 pl-9 pr-3 py-2 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 size-4 text-stone-400" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-stone-300 pl-9 pr-3 py-2 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Assigned Department / Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
              >
                <option value="travel">Travel (Itineraries, Packages, Drivers)</option>
                <option value="visa">Visa (Applications & Liaison)</option>
                <option value="accounts">Accounts (Billing & Advances)</option>
                <option value="admin">Admin (Full Control)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700 transition disabled:opacity-50 cursor-pointer"
          >
            <span>{submitting ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}</span>
            <ArrowRight className="size-3.5" />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span>{mode === "login" ? "Need an account?" : "Already registered?"}</span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login")
              setErrorMessage(null)
            }}
            className="font-semibold text-amber-700 hover:text-amber-800 transition"
          >
            {mode === "login" ? "Register here" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  )
}
