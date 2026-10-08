import type { Task } from "../schemas/board"

export function markTaskCommentsRead(taskId: string): void {
  try {
    localStorage.setItem(`mtt_seen_task_${taskId}`, new Date().toISOString())
    window.dispatchEvent(new CustomEvent("mtt_task_read", { detail: { taskId } }))
  } catch {
    // Ignore storage errors
  }
}

export function getTaskCommentsInfo(
  task: Task,
  currentUserName?: string | null
): { totalComments: number; unreadCount: number } {
  const taskComments = (task.activities || []).filter((a) => a.type === "comment")
  const subcardComments = (task.checklist || []).flatMap((c) =>
    (c.activities || []).filter((a) => a.type === "comment")
  )
  const allComments = [...taskComments, ...subcardComments]
  const totalComments = allComments.length

  if (totalComments === 0) {
    return { totalComments: 0, unreadCount: 0 }
  }

  let lastSeenTime = 0
  try {
    const stored = localStorage.getItem(`mtt_seen_task_${task.id}`)
    if (stored) {
      lastSeenTime = new Date(stored).getTime()
    }
  } catch {
    lastSeenTime = 0
  }

  const unreadComments = allComments.filter((c) => {
    // If current user authored the comment, they don't need a notification
    if (currentUserName && c.author && c.author.toLowerCase() === currentUserName.toLowerCase()) {
      return false
    }
    const commentTime = new Date(c.createdAt).getTime()
    if (lastSeenTime > 0) {
      return commentTime > lastSeenTime
    }
    // If card was never opened yet, mark recent comments (past 7 days) as unread
    return Date.now() - commentTime < 7 * 24 * 60 * 60 * 1000
  })

  return {
    totalComments,
    unreadCount: unreadComments.length,
  }
}
