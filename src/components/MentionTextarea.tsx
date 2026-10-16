import { useState, useRef, useMemo } from "react"
import { AtSign, Eye, Edit3 } from "lucide-react"
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

interface MentionTextareaProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
  className?: string
  allowPreview?: boolean
}

export function MentionTextarea({
  value,
  onChange,
  placeholder = "Write notes... Type @ to tag staff or @all",
  rows = 4,
  disabled = false,
  className = "",
  allowPreview = true,
}: MentionTextareaProps) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [previewMode, setPreviewMode] = useState(false)
  const [dropdownPlacement, setDropdownPlacement] = useState<"top" | "bottom">("bottom")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { profile } = useAuthStore()
  const { staff } = useStaffStore()
  const baseStaffList = staff.length > 0 ? staff : initialStaff

  // Merge profile into staff list if missing and deduplicate
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

  const matchingMentions = useMemo(() => {
    if (mentionQuery === null) return []
    const q = mentionQuery.toLowerCase().trim()

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
  }, [mentionQuery, activeStaff])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    const pos = e.target.selectionStart ?? val.length
    onChange(val)

    const textBefore = val.slice(0, pos)
    const atMatch = textBefore.match(/(?:^|\s)@([a-zA-Z0-9_\s]*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
      setMentionIndex(0)
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        if (spaceBelow < 250 && rect.top > 250) {
          setDropdownPlacement("top")
        } else {
          setDropdownPlacement("bottom")
        }
      }
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (target: MentionOption) => {
    const textarea = textareaRef.current
    const pos = textarea?.selectionStart ?? value.length
    const textBefore = value.slice(0, pos)
    const textAfter = value.slice(pos)

    const atIndex = textBefore.lastIndexOf("@")
    if (atIndex !== -1) {
      const tagText = target.isBroadcast ? target.tag : target.name
      const newBefore = textBefore.slice(0, atIndex) + `@${tagText} `
      const newFullText = newBefore + textAfter
      onChange(newFullText)
      setMentionQuery(null)

      setTimeout(() => {
        if (textarea) {
          textarea.focus()
          textarea.selectionStart = newBefore.length
          textarea.selectionEnd = newBefore.length
        }
      }, 0)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && matchingMentions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setMentionIndex((prev) => (prev + 1) % matchingMentions.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setMentionIndex((prev) => (prev - 1 + matchingMentions.length) % matchingMentions.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        insertMention(matchingMentions[mentionIndex])
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setMentionQuery(null)
        return
      }
    }
  }

  const hasMentions = /@all\b|@admins?\b|@[A-Za-z0-9_]+/i.test(value)

  return (
    <div className="relative space-y-1">
      {/* Optional Preview / Write Mode Switcher */}
      {allowPreview && (hasMentions || previewMode) && !disabled && (
        <div className="flex items-center justify-end gap-1 mb-1">
          <button
            type="button"
            onClick={() => setPreviewMode(false)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition ${
              !previewMode
                ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Edit3 className="size-2.5" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition ${
              previewMode
                ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Eye className="size-2.5" />
            <span>Preview Tags</span>
          </button>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {mentionQuery !== null && matchingMentions.length > 0 && !previewMode && (
        <div
          className={`${
            dropdownPlacement === "top"
              ? "bottom-full mb-1.5"
              : "top-full mt-1.5"
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
            {matchingMentions.map((m, idx) => {
              const isSelected = idx === mentionIndex
              const isAll = m.tag === "all"
              const isAdminBroadcast = m.tag === "admin"
              const isStaffAdmin = m.role?.toLowerCase() === "admin"

              return (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    insertMention(m)
                  }}
                  onMouseEnter={() => setMentionIndex(idx)}
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
      )}

      {/* Editor or Formatted Display */}
      {previewMode || (disabled && hasMentions) ? (
        <div
          onClick={() => !disabled && setPreviewMode(false)}
          className={`w-full rounded-xl border border-stone-200 bg-stone-50/50 p-3 text-xs text-stone-800 leading-relaxed whitespace-pre-wrap cursor-text min-h-[5.5rem] ${className}`}
        >
          {value ? (
            renderFormattedMentions(value, activeStaff, profile?.name)
          ) : (
            <span className="text-stone-400 italic">No notes added.</span>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          rows={rows}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-800 leading-relaxed placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-stone-100 disabled:cursor-not-allowed ${className}`}
        />
      )}
    </div>
  )
}

export function renderFormattedMentions(
  content: string,
  staffList: StaffMember[],
  currentUserName?: string
) {
  const mentionRegex = /(@all\b|@admins?\b|@[A-Za-z0-9_]+(?:\s+[A-Za-z0-9_]+)?)/gi
  const parts = content.split(mentionRegex)

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
