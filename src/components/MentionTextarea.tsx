import { useState, useRef, useMemo } from "react"
import { Eye, Edit3 } from "lucide-react"
import type { MentionOption } from "./MentionDropdown"
import {
  SPECIAL_MENTIONS,
  useMentionStaff,
  getMatchingMentions,
  MentionDropdown,
  renderFormattedMentions,
} from "./MentionDropdown"

export type { MentionOption }
export { SPECIAL_MENTIONS, renderFormattedMentions }

const HAS_MENTIONS_REGEX = /@all\b|@admins?\b|@[A-Za-z0-9_]+/i

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

  const { staffList, activeStaff, profile } = useMentionStaff()

  const matchingMentions = useMemo(
    () => getMatchingMentions(mentionQuery, activeStaff),
    [mentionQuery, activeStaff]
  )

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

  const hasMentions = HAS_MENTIONS_REGEX.test(value)

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
      {mentionQuery !== null && !previewMode && (
        <MentionDropdown
          placement={dropdownPlacement}
          options={matchingMentions}
          selectedIndex={mentionIndex}
          onSelect={insertMention}
          onHoverIndex={setMentionIndex}
        />
      )}

      {/* Editor or Formatted Display */}
      {previewMode || (disabled && hasMentions) ? (
        <div
          onClick={() => !disabled && setPreviewMode(false)}
          className={`w-full rounded-xl border border-stone-200 bg-stone-50/50 p-3 text-xs text-stone-800 leading-relaxed whitespace-pre-wrap cursor-text min-h-[5.5rem] ${className}`}
        >
          {value ? (
            renderFormattedMentions(value, staffList, profile?.name)
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
