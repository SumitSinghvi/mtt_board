import { useState } from "react"
import { PanelLeftClose, PanelLeft, LogOut, LogIn } from "lucide-react"
import logoImg from "../assets/logo.png"
import { useBoardStore } from "../store/boardStore"
import { useAuthStore } from "../store/authStore"
import { AuthModal } from "./AuthModal"

const roleBadgeColor: Record<string, string> = {
  admin: "bg-red-50 text-red-700 border-red-200",
  visa: "bg-purple-50 text-purple-700 border-purple-200",
  travel: "bg-sky-50 text-sky-700 border-sky-200",
  accounts: "bg-emerald-50 text-emerald-700 border-emerald-200",
}

export function Topbar() {
  const { sidebarOpen, toggleSidebar } = useBoardStore()
  const { user, profile, signOut } = useAuthStore()
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-stone-200 bg-white px-4 shadow-2xs">
        {/* Left: Sidebar trigger + Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus:outline-none"
          >
            {sidebarOpen ? <PanelLeftClose className="size-5" /> : <PanelLeft className="size-5" />}
          </button>

          <div className="h-5 w-px bg-stone-200 hidden sm:block" />

          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="Mohit Tours & Travels"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </div>
        </div>

        {/* Right: Auth Profile Status */}
        <div className="flex items-center gap-3">
          {user && profile ? (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 text-left">
                <div className="size-7 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-xs font-bold text-stone-700">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block leading-tight">
                  <span className="text-xs font-semibold text-stone-900 block truncate max-w-[130px]">
                    {profile.name}
                  </span>
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                      roleBadgeColor[profile.role] || "bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                  >
                    {profile.role}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signOut()}
                title="Sign Out"
                className="rounded-lg p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 transition ml-1"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-stone-800 transition"
            >
              <LogIn className="size-3.5" />
              <span>Staff Login</span>
            </button>
          )}
        </div>
      </header>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  )
}
