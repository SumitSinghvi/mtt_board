import { useMemo } from "react"
import { AtSign } from "lucide-react"
import { useAuthStore } from "../store/authStore"
import { useStaffStore, initialStaff, type StaffMember } from "../store/staffStore"

export interface MentionOption {
  id: string
  name: string
  tag: string
  role?: string
  subtitle?: string
  isBroadcast?: boolean
}

export const SPECIAL_MENTIONS: MentionOption[] = [
  {
    id: "mention-all",
    name: "All Team Members",
    tag: "all",
    role: "BROADCAST",
    subtitle: "Notify everyone on team",
    isBroadcast: true,
  },
  {
    id: "mention-admin",
    name: "All Admins",
    tag: "admin",
    role: "ADMINS",
    subtitle: "Notify all administrators",
    isBroadcast: true,
  },
]

export const MENTION_PARSER_REGEX = /(@all\b|@admins?\b|@[A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)?)/gi

export function useMentionStaff() {
  const { profile } = useAuthStore()
  const { staff } = useStaffStore()
  const baseStaffList = staff.length > 0 ? staff : initialStaff

  const staffList = useMemo(() => {
    const list = [...baseStaffList]
    if (
      profile?.name &&
      !list.some((s) => s.name.toLowerCase() === profile.name.toLowerCase())
    ) {
      list.unshift({
        id: profile.id || "current-user",
        name: profile.name,
        email: profile.email || "",
        phone: profile.phone || "",
        role: profile.role || "travel",
        status: "active",
        joinedDate: "",
      })
    }
    const seen = new Set<string>()
    return list.filter((s) => {
      const key = s.name.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [baseStaffList, profile])

  const activeStaff = useMemo(
    () => staffList.filter((s) => s.status !== "inactive"),
    [staffList]
  )

  return { staffList, activeStaff, profile }
}

export function getMatchingMentions(
  query: string | null,
  activeStaff: StaffMember[]
): MentionOption[] {
  if (query === null) return []
  const q = query.toLowerCase().trim()

  // 1. Broadcast tags (@all, @admin)
  const specials = SPECIAL_MENTIONS.filter(
    (m) =>
      m.tag.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q)
  )

  // 2. Staff members sorted: Admins first, then alphabetical
  const staffMatches = activeStaff
    .filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    )
    .sort((a, b) => {
      const aIsAdmin = a.role === "admin" ? 1 : 0
      const bIsAdmin = b.role === "admin" ? 1 : 0
      if (aIsAdmin !== bIsAdmin) return bIsAdmin - aIsAdmin
      return a.name.localeCompare(b.name)
    })
    .map((s) => ({
      id: s.id,
      name: s.name,
      tag: s.name,
      role: s.role,
      subtitle: s.email,
      isBroadcast: false,
    }))

  return [...specials, ...staffMatches]
}

interface MentionDropdownProps {
  placement?: "top" | "bottom"
  options: MentionOption[]
  selectedIndex: number
  onSelect: (option: MentionOption) => void
  onHoverIndex: (index: number) => void
}

export function MentionDropdown({
  placement = "bottom",
  options,
  selectedIndex,
  onSelect,
  onHoverIndex,
}: MentionDropdownProps) {
  if (options.length === 0) return null

  return (
    <div
      className={`${
        placement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
      } absolute left-0 z-50 w-80 rounded-xl border border-stone-200 bg-white p-1.5 shadow-2xl animate-in fade-in-50 zoom-in-95`}
    >
      <div className="flex items-center justify-between px-2 py-1 border-b border-stone-100 text-[10px] font-bold uppercase tracking-wider text-stone-400">
        <span className="flex items-center gap-1 text-amber-700">
          <AtSign className="size-3" />
          <span>Tag Staff or Team</span>
        </span>
        <span>Tab / Enter</span>
      </div>

      <div className="mt-1 space-y-0.5 max-h-56 overflow-y-auto">
        {options.map((m, idx) => {
          const isSelected = idx === selectedIndex
          const isAll = m.tag === "all"
          const isAdminBroadcast = m.tag === "admin"
          const isStaffAdmin = m.role?.toLowerCase() === "admin"

          return (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(m)
              }}
              onMouseEnter={() => onHoverIndex(idx)}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                isSelected
                  ? isAll
                    ? "bg-purple-50 text-purple-950 font-semibold"
                    : isAdminBroadcast
                    ? "bg-rose-50 text-rose-950 font-semibold"
                    : "bg-amber-50 text-amber-950 font-semibold"
                  : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isAll ? (
                  <div className="size-6 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-xs shrink-0">
                    📢
                  </div>
                ) : isAdminBroadcast ? (
                  <div className="size-6 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center text-xs shrink-0">
                    🛡️
                  </div>
                ) : (
                  <div
                    className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isStaffAdmin
                        ? "bg-amber-200 text-amber-900 border border-amber-300"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <span className="text-xs truncate block font-medium">
                    {m.name}
                  </span>
                  {m.subtitle && (
                    <span className="text-[10px] text-stone-400 truncate block">
                      {m.subtitle}
                    </span>
                  )}
                </div>
              </div>

              <span
                className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                  isAll
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : isAdminBroadcast
                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                    : isStaffAdmin
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {m.role}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function renderFormattedMentions(
  content: string,
  staffList: StaffMember[],
  currentUserName?: string
) {
  const parts = content.split(MENTION_PARSER_REGEX)

  return parts.map((part, i) => {
    if (!part.startsWith("@")) return <span key={i}>{part}</span>

    const lower = part.toLowerCase().trim()

    // 1. Special Broadcast @all
    if (lower === "@all") {
      return (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-bold text-[11px] bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs"
          title="Broadcast to all team members"
        >
          <span>📢</span>
          <span>@all</span>
        </span>
      )
    }

    // 2. Special Broadcast @admin
    if (lower === "@admin" || lower === "@admins") {
      return (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-bold text-[11px] bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs"
          title="Broadcast to all administrators"
        >
          <span>🛡️</span>
          <span>@admin</span>
        </span>
      )
    }

    // 3. User Mention
    const mentionText = part.slice(1).trim().toLowerCase()
    const matchedStaff = staffList.find(
      (s) =>
        s.name.toLowerCase() === mentionText ||
        s.name.toLowerCase().startsWith(mentionText) ||
        mentionText.startsWith(s.name.toLowerCase())
    )

    if (matchedStaff) {
      const isSelf =
        currentUserName &&
        matchedStaff.name.toLowerCase() === currentUserName.toLowerCase()
      const isStaffAdmin = matchedStaff.role === "admin"

      return (
        <span
          key={i}
          className={`inline-flex items-center gap-1 px-1.5 py-0.2 mx-0.5 rounded-md text-[11px] shadow-2xs ${
            isSelf
              ? "bg-amber-200/90 text-amber-950 border border-amber-400 font-bold"
              : isStaffAdmin
              ? "bg-amber-100 text-amber-950 border border-amber-300 font-semibold"
              : "bg-amber-100/90 text-amber-900 border border-amber-300/80 font-medium"
          }`}
        >
          <AtSign className="size-2.5 text-amber-700" />
          <span>{matchedStaff.name}</span>
          {isStaffAdmin && (
            <span className="text-[9px] font-extrabold uppercase px-1 rounded bg-amber-200 text-amber-900">
              Admin
            </span>
          )}
        </span>
      )
    }

    return <span key={i}>{part}</span>
  })
}
