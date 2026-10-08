import { useState } from "react"
import { MessageSquare, History, Send, Clock, UserCheck } from "lucide-react"
import type { ActivityItem } from "../schemas/board"
import { useAuthStore } from "../store/authStore"
import { formatDate } from "../lib/date"

interface ActivitySectionProps {
  activities?: ActivityItem[]
  onAddComment: (comment: string, author: string) => void
  title?: string
  placeholder?: string
}

export function ActivitySection({
  activities = [],
  onAddComment,
  title = "Activity & History",
  placeholder = "Write a comment or update note...",
}: ActivitySectionProps) {
  const [activeTab, setActiveTab] = useState<"all" | "comments" | "history">("comments")
  const [commentText, setCommentText] = useState("")
  const { profile } = useAuthStore()
  const authorName = profile?.name || "Mohit Tours Staff"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    onAddComment(commentText.trim(), authorName)
    setCommentText("")
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

      {/* New Comment Input Box */}
      <form onSubmit={handleSubmit} className="space-y-2">
        {profile?.name && (
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
            <span>Commenting as</span>
            <span className="font-semibold text-stone-700">{profile.name}</span>
            {profile.role && (
              <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                {profile.role}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            rows={2}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-stone-200 bg-white p-2.5 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none resize-none shadow-2xs"
          />
          <button
            type="submit"
            disabled={!commentText.trim()}
            className="self-end rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-40 disabled:hover:bg-amber-600 transition shadow-2xs flex items-center gap-1"
          >
            <Send className="size-3.5" />
            <span>Send</span>
          </button>
        </div>
      </form>

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

            return (
              <div
                key={act.id}
                className={`rounded-lg border p-2.5 text-xs transition ${
                  isComment
                    ? "bg-white border-stone-200 shadow-2xs"
                    : "bg-stone-100/70 border-stone-200/60 text-stone-600"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-800">
                    {isComment ? (
                      <span className="flex items-center gap-1 text-amber-700">
                        <UserCheck className="size-3 text-amber-600" />
                        <span>{act.author}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-stone-500 font-medium">
                        <History className="size-3 text-stone-400" />
                        <span>System / History</span>
                      </span>
                    )}
                  </div>

                  <span
                    className="flex items-center gap-1 text-[10px] text-stone-400"
                    title={new Date(act.createdAt).toLocaleString()}
                  >
                    <Clock className="size-2.5" />
                    <span>{timeAgo}</span>
                  </span>
                </div>

                <p
                  className={`text-xs leading-relaxed whitespace-pre-wrap ${
                    isComment ? "text-stone-800" : "text-stone-600 italic"
                  }`}
                >
                  {act.content}
                </p>
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
