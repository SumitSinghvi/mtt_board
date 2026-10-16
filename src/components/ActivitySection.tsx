import { useState, useRef, useMemo } from "react"
import {
  MessageSquare,
  History,
  Send,
  Clock,
  UserCheck,
  Pencil,
  Trash2,
  Check,
} from "lucide-react"
import type { ActivityItem } from "../schemas/board"
import { formatDate } from "../lib/date"
import type { MentionOption } from "./MentionDropdown"
import {
  useMentionStaff,
  getMatchingMentions,
  MentionDropdown,
  renderFormattedMentions,
} from "./MentionDropdown"

interface ActivitySectionProps {
  activities?: ActivityItem[]
  onAddComment: (comment: string, author: string) => void
  onEditComment?: (id: string, newContent: string) => void
  onDeleteComment?: (id: string) => void
  title?: string
  placeholder?: string
  readOnly?: boolean
}

export function ActivitySection({
  activities = [],
  onAddComment,
  onEditComment,
  onDeleteComment,
  title = "Activity & History",
  placeholder = "Write a comment or update note... Type @ to mention staff or @all",
  readOnly = false,
}: ActivitySectionProps) {
  const [activeTab, setActiveTab] = useState<"all" | "comments" | "history">("comments")
  const [commentText, setCommentText] = useState("")
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Edit Comment State
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [dropdownPlacement, setDropdownPlacement] = useState<"top" | "bottom">("top")

  const { activeStaff, profile } = useMentionStaff()
  const authorName = profile?.name || "Mohit Tours Staff"
  const isAdmin = profile?.role === "admin"

  const matchingMentions = useMemo(
    () => getMatchingMentions(mentionQuery, activeStaff),
    [mentionQuery, activeStaff]
  )

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    const pos = e.target.selectionStart ?? val.length
    setCommentText(val)

    // Check if cursor is right after an '@' or word started with '@'
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
    const pos = textarea?.selectionStart ?? commentText.length
    const textBefore = commentText.slice(0, pos)
    const textAfter = commentText.slice(pos)

    const atIndex = textBefore.lastIndexOf("@")
    if (atIndex !== -1) {
      const tagText = target.isBroadcast ? target.tag : target.name
      const newBefore = textBefore.slice(0, atIndex) + `@${tagText} `
      const newFullText = newBefore + textAfter
      setCommentText(newFullText)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly || !commentText.trim()) return
    onAddComment(commentText.trim(), authorName)
    setCommentText("")
    setMentionQuery(null)
  }

  const handleStartEdit = (act: ActivityItem) => {
    setEditingCommentId(act.id)
    setEditContent(act.content)
  }

  const handleSaveEdit = (actId: string) => {
    if (!editContent.trim()) return
    onEditComment?.(actId, editContent.trim())
    setEditingCommentId(null)
    setEditContent("")
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditContent("")
  }

  const handleDelete = (actId: string) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      onDeleteComment?.(actId)
    }
  }

  const filteredActivities = activities
    .filter((item) => {
      if (activeTab === "comments") return item.type === "comment"
      if (activeTab === "history") return item.type === "history"
      return true
    })
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

  const commentsCount = activities.filter((a) => a.type === "comment").length
  const historyCount = activities.filter((a) => a.type === "history").length

  return (
    <div className="space-y-4 pt-1">
      {/* Header with Title & Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <MessageSquare className="size-3.5 text-amber-600" />
          <span>{title}</span>
        </h4>

        {/* Tab Controls */}
        <div className="inline-flex rounded-lg bg-stone-200/70 p-0.5 text-[11px] font-medium text-stone-600">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-2.5 py-1 rounded-md transition ${
              activeTab === "all"
                ? "bg-white text-stone-900 shadow-2xs font-semibold"
                : "hover:text-stone-900"
            }`}
          >
            All ({activities.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            className={`px-2.5 py-1 rounded-md transition ${
              activeTab === "comments"
                ? "bg-white text-stone-900 shadow-2xs font-semibold"
                : "hover:text-stone-900"
            }`}
          >
            Comments ({commentsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-2.5 py-1 rounded-md transition ${
              activeTab === "history"
                ? "bg-white text-stone-900 shadow-2xs font-semibold"
                : "hover:text-stone-900"
            }`}
          >
            History ({historyCount})
          </button>
        </div>
      </div>

      {/* New Comment Input Box with @mention Autocomplete */}
      {readOnly ? (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-center text-xs text-stone-500 italic">
          Board is archived. Comments and updates are disabled.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2 relative">
          {profile?.name && (
            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <div className="flex items-center gap-1.5">
                <span>Commenting as</span>
                <span className="font-semibold text-stone-700">{profile.name}</span>
                {profile.role && (
                  <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                    {profile.role}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-stone-400">Type @ to tag team members</span>
            </div>
          )}

          <div className="relative">
            {/* Mention Autocomplete Dropdown */}
            {mentionQuery !== null && (
              <MentionDropdown
                placement={dropdownPlacement}
                options={matchingMentions}
                selectedIndex={mentionIndex}
                onSelect={insertMention}
                onHoverIndex={setMentionIndex}
              />
            )}

            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                rows={2}
                value={commentText}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 rounded-lg border border-stone-200 bg-white p-2.5 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none resize-none shadow-2xs leading-relaxed"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="self-end rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-40 disabled:hover:bg-amber-600 transition shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Send className="size-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Activity Timeline List */}
      <div className="space-y-2.5 pt-1">
        {filteredActivities.length === 0 ? (
          <div className="py-4 text-center text-xs text-stone-400">
            No activity yet. Add a comment or update above.
          </div>
        ) : (
          filteredActivities.map((act) => {
            const isComment = act.type === "comment"
            const timeAgo = formatTime(act.createdAt)

            // Render trace if comment was deleted
            if (act.isDeleted) {
              const deleterLabel =
                act.deletedBy && act.deletedBy.toLowerCase() === act.author.toLowerCase()
                  ? "by author"
                  : act.deletedBy
                  ? `by ${act.deletedBy}`
                  : ""

              return (
                <div
                  key={act.id}
                  className="rounded-lg border border-dashed border-stone-200/90 bg-stone-50/60 px-3 py-2 text-xs text-stone-500 transition flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-1.5 text-stone-400">
                    <Trash2 className="size-3 text-stone-400 shrink-0" />
                    <span className="italic">
                      Comment by <span className="font-medium text-stone-500 not-italic">{act.author}</span> was deleted {deleterLabel}
                    </span>
                  </div>
                  <span
                    className="text-[10px] text-stone-400 shrink-0"
                    title={act.deletedAt ? new Date(act.deletedAt).toLocaleString() : ""}
                  >
                    {formatTime(act.deletedAt || act.createdAt)}
                  </span>
                </div>
              )
            }

            const isAuthor =
              act.author.toLowerCase() === authorName.toLowerCase()
            const canEdit = !readOnly && isComment && isAuthor
            const canDelete = !readOnly && isComment && (isAuthor || isAdmin)
            const isEditing = editingCommentId === act.id

            return (
              <div
                key={act.id}
                className={`rounded-lg border p-2.5 text-xs transition ${
                  isComment
                    ? "bg-white border-stone-200 shadow-2xs"
                    : "bg-stone-100/70 border-stone-200/60 text-stone-600"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-800">
                    {isComment ? (
                      <span className="flex items-center gap-1 text-amber-700">
                        <UserCheck className="size-3 text-amber-600" />
                        <span>{act.author}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-stone-700 font-medium">
                        <History className="size-3 text-stone-400" />
                        <span>{act.author || "System"}</span>
                      </span>
                    )}
                  </div>

                  {/* Timestamp & Edit/Delete Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="flex items-center gap-1 text-[10px] text-stone-400"
                      title={new Date(act.createdAt).toLocaleString()}
                    >
                      <Clock className="size-2.5" />
                      <span>{timeAgo}</span>
                    </span>

                    {act.updatedAt && (
                      <span
                        className="text-[10px] text-stone-400 italic"
                        title={`Edited at ${new Date(act.updatedAt).toLocaleString()}`}
                      >
                        (edited)
                      </span>
                    )}

                    {canEdit && !isEditing && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(act)}
                        title="Edit comment"
                        className="rounded p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer ml-1"
                      >
                        <Pencil className="size-3" />
                      </button>
                    )}

                    {canDelete && !isEditing && (
                      <button
                        type="button"
                        onClick={() => handleDelete(act.id)}
                        title="Delete comment"
                        className="rounded p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment Body or Inline Edit Form */}
                {isEditing ? (
                  <div className="space-y-2 mt-1.5 pt-1 border-t border-stone-100">
                    <textarea
                      rows={2}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Edit your comment..."
                      className="w-full rounded-lg border border-amber-300 bg-amber-50/20 p-2 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:bg-white focus:outline-none resize-none leading-relaxed"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-2.5 py-1 rounded-md text-[11px] font-medium text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(act.id)}
                        disabled={!editContent.trim()}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 transition shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <Check className="size-3" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`text-xs leading-relaxed whitespace-pre-wrap ${
                      isComment ? "text-stone-800" : "text-stone-600 italic"
                    }`}
                  >
                    {isComment
                      ? renderFormattedMentions(act.content, activeStaff, profile?.name)
                      : act.content}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(isoString)
  } catch {
    return "Recently"
  }
}
