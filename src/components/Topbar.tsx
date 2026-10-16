import { useState, useMemo } from "react"
import { PanelLeftClose, PanelLeft, LogOut, Bell } from "lucide-react"
import logoImg from "../assets/logo.png"
import { useBoardStore } from "../store/boardStore"
import { useAuthStore } from "../store/authStore"
import { GlobalSearch } from "./GlobalSearch"
import { NotificationPopover } from "./NotificationPopover"

const roleBadgeColor: Record<string, string> = {
  admin: "bg-red-50 text-red-700 border-red-200",
  visa: "bg-purple-50 text-purple-700 border-purple-200",
  travel: "bg-sky-50 text-sky-700 border-sky-200",
  accounts: "bg-emerald-50 text-emerald-700 border-emerald-200",
}

export function Topbar() {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const boards = useBoardStore((s) => s.boards)
  const generalReminders = useBoardStore((s) => s.generalReminders)
  const sidebarOpen = useBoardStore((s) => s.sidebarOpen)
  const toggleSidebar = useBoardStore((s) => s.toggleSidebar)
  const setSelectedTask = useBoardStore((s) => s.setSelectedTask)
  const setActiveBoardId = useBoardStore((s) => s.setActiveBoardId)
  const setCurrentView = useBoardStore((s) => s.setCurrentView)
  const { user, profile, signOut } = useAuthStore()

  const todayStr = new Date().toISOString().split("T")[0]
  const alertCount = useMemo(() => {
    let count = 0
    for (const b of boards) {
      if (b.isArchived) continue
      for (const col of b.columns) {
        for (const task of col.tasks) {
          if (task.reminders) {
            for (const rem of task.reminders) {
              if (!rem.completed && rem.dueDate <= todayStr) {
                count++
              }
            }
          }
        }
      }
    }
    for (const rem of generalReminders) {
      if (!rem.completed && rem.dueDate <= todayStr) {
        count++
      }
    }

    // 3. Unread @mentions
    if (profile?.name || user?.email) {
      const myName = profile?.name?.toLowerCase().trim()
      const userIdentifiers = [
        profile?.name?.toLowerCase().trim(),
        user?.email?.toLowerCase().trim(),
        user?.id,
        profile?.id,
      ].filter(Boolean) as string[]
      const isAdmin = profile?.role === "admin"

      for (const b of boards) {
        if (b.isArchived) continue
        for (const col of b.columns) {
          for (const task of col.tasks) {
            const allComments = [
              ...(task.activities || []).filter((a) => a.type === "comment"),
              ...(task.checklist || []).flatMap((c) =>
                (c.activities || []).filter((a) => a.type === "comment")
              ),
            ]
            for (const c of allComments) {
              if (c.isDeleted) continue
              if (c.author && myName && c.author.toLowerCase() === myName) continue
              const contentLower = c.content.toLowerCase()
              const isAllMention = /\b@all\b/i.test(contentLower)
              const isAdminMention =
                isAdmin && (/\b@admin\b/i.test(contentLower) || /\b@admins\b/i.test(contentLower))
              const isDirectMention = userIdentifiers.some((id) =>
                contentLower.includes(`@${id.toLowerCase()}`)
              )

              if (isAllMention || isAdminMention || isDirectMention) {
                try {
                  if (!localStorage.getItem(`mtt_seen_mention_${c.id}`)) {
                    count++
                  }
                } catch {
                  // ignore
                }
              }
            }

            // Also check notes & details
            const noteTexts = [
              task.description ? { id: `note-${task.id}`, text: task.description } : null,
              ...(task.checklist || []).map((ck) =>
                ck.description || ck.notes
                  ? { id: `note-sub-${ck.id}`, text: `${ck.description || ""} ${ck.notes || ""}` }
                  : null
              ),
            ].filter(Boolean) as Array<{ id: string; text: string }>

            for (const n of noteTexts) {
              const contentLower = n.text.toLowerCase()
              const isAllMention = /\b@all\b/i.test(contentLower)
              const isAdminMention =
                isAdmin && (/\b@admin\b/i.test(contentLower) || /\b@admins\b/i.test(contentLower))
              const isDirectMention = userIdentifiers.some((id) =>
                contentLower.includes(`@${id.toLowerCase()}`)
              )

              if (isAllMention || isAdminMention || isDirectMention) {
                try {
                  if (!localStorage.getItem(`mtt_seen_mention_${n.id}`)) {
                    count++
                  }
                } catch {
                  // ignore
                }
              }
            }
          }
        }
      }
    }

    return count
  }, [boards, generalReminders, todayStr, profile?.name, profile?.role, profile?.id, user?.id, user?.email])

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between gap-2 sm:gap-4 border-b border-stone-200 bg-white px-3 sm:px-4 shadow-2xs">
        {/* Left: Sidebar trigger + Logo */}
        <div className="flex items-center gap-3 shrink-0">
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

        {/* Center: Global Cross-Board Search */}
        <div className="flex-1 flex justify-center max-w-lg">
          <GlobalSearch
            onSelectTask={(boardId, columnId, taskId) => {
              setActiveBoardId(boardId)
              setCurrentView("board")
              setSelectedTask({ boardId, columnId, taskId })
            }}
          />
        </div>

        {/* Right: Notifications & Auth Profile Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification Bell Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationOpen((prev) => !prev)}
              title="Scheduled Task Reminders & Alerts"
              className={`relative rounded-xl p-2 transition cursor-pointer ${
                isNotificationOpen
                  ? "bg-amber-100 text-amber-900 shadow-2xs"
                  : alertCount > 0
                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/80"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-transparent"
              }`}
            >
              <Bell className="size-4.5" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-red-600 text-[10px] font-extrabold text-white shadow-2xs animate-pulse ring-2 ring-white">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </button>

            <NotificationPopover
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
              onSelectTask={(boardId, columnId, taskId) => {
                setActiveBoardId(boardId)
                setCurrentView("board")
                setSelectedTask({ boardId, columnId, taskId })
              }}
            />
          </div>

          <div className="h-5 w-px bg-stone-200" />
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 text-left">
              <div className="size-7 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-xs font-bold text-stone-700">
                {(profile?.name || user?.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block leading-tight">
                <span className="text-xs font-semibold text-stone-900 block truncate max-w-[130px]">
                  {profile?.name || user?.email?.split("@")[0]}
                </span>
                {profile?.role && (
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                      roleBadgeColor[profile.role] || "bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                  >
                    {profile.role}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => signOut()}
              title="Sign Out"
              className="rounded-lg p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 transition ml-1 cursor-pointer"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
