import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useAuthStore } from "../store/authStore"
import { useBoardStore } from "../store/boardStore"
import { getTaskAssignees } from "../schemas/board"
import { playReminderChime } from "../components/NotificationPopover"
import { isDoneColumn } from "./utils"

export function useAssignedTaskReminders() {
  const { user, profile } = useAuthStore()
  const boards = useBoardStore((s) => s.boards)
  const setSelectedTask = useBoardStore((s) => s.setSelectedTask)
  const setActiveBoardId = useBoardStore((s) => s.setActiveBoardId)
  const setCurrentView = useBoardStore((s) => s.setCurrentView)

  // Track toasted IDs in session to prevent duplicate toasts on every re-render
  const toastedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!user && !profile) return

    const userIdentifiers = [
      profile?.name?.toLowerCase().trim(),
      user?.email?.toLowerCase().trim(),
      user?.id,
      profile?.id,
    ].filter(Boolean) as string[]

    if (userIdentifiers.length === 0) return

    const todayStr = new Date().toISOString().split("T")[0]

    for (const board of boards) {
      if (board.isArchived) continue

      for (const col of board.columns) {
        for (const task of col.tasks) {
          // Check @mentions in comments (whether assigned or not)
          const allComments = [
            ...(task.activities || []).filter((a) => a.type === "comment"),
            ...(task.checklist || []).flatMap((c) =>
              (c.activities || []).filter((a) => a.type === "comment")
            ),
          ]

          for (const c of allComments) {
            if (c.isDeleted) continue

            if (
              c.author &&
              profile?.name &&
              c.author.toLowerCase() === profile.name.toLowerCase()
            ) {
              continue // don't notify self
            }

            const contentLower = c.content.toLowerCase()
            const isAllMention = /\b@all\b/i.test(contentLower)
            const isAdminMention =
              profile?.role === "admin" &&
              (/\b@admin\b/i.test(contentLower) || /\b@admins\b/i.test(contentLower))
            const isDirectMention = userIdentifiers.some((id) =>
              contentLower.includes(`@${id.toLowerCase()}`)
            )

            if (!isAllMention && !isAdminMention && !isDirectMention) continue

            const toastKey = `mention-${c.id}`
            if (toastedRef.current.has(toastKey)) continue
            toastedRef.current.add(toastKey)

            const commentTime = new Date(c.createdAt).getTime()
            if (Date.now() - commentTime > 2 * 24 * 60 * 60 * 1000) continue

            playReminderChime()
            const toastTitle = isAllMention
              ? `📢 @${c.author} tagged @all team`
              : isAdminMention
              ? `🛡️ @${c.author} tagged @admin`
              : `@${c.author} tagged you in a comment`

            toast(toastTitle, {
              description: `"${c.content.slice(0, 90)}" • in ${task.title}`,
              duration: 9000,
              action: {
                label: "View Card",
                onClick: () => {
                  setActiveBoardId(board.id)
                  setCurrentView("board")
                  setSelectedTask({ boardId: board.id, columnId: col.id, taskId: task.id })
                },
              },
            })
          }

          // Check @mentions in task description & sub-card notes
          const noteTexts = [
            { source: "Notes & Details", text: task.description || "", id: `note-${task.id}` },
            ...(task.checklist || []).map((c) => ({
              source: `Sub-card "${c.text}"`,
              text: `${c.description || ""} ${c.notes || ""}`.trim(),
              id: `note-sub-${c.id}`,
            })),
          ]

          for (const n of noteTexts) {
            if (!n.text) continue
            const contentLower = n.text.toLowerCase()
            const isAllMention = /\b@all\b/i.test(contentLower)
            const isAdminMention =
              profile?.role === "admin" &&
              (/\b@admin\b/i.test(contentLower) || /\b@admins\b/i.test(contentLower))
            const isDirectMention = userIdentifiers.some((id) =>
              contentLower.includes(`@${id.toLowerCase()}`)
            )
            if (!isAllMention && !isAdminMention && !isDirectMention) continue

            const toastKey = `mention-${n.id}`
            if (toastedRef.current.has(toastKey)) continue
            toastedRef.current.add(toastKey)

            playReminderChime()
            const toastTitle = isAllMention
              ? `📢 Tagged @all in ${n.source}`
              : isAdminMention
              ? `🛡️ Tagged @admin in ${n.source}`
              : `Tagged you in ${n.source}`

            toast(toastTitle, {
              description: `"${n.text.slice(0, 90)}" • in ${task.title}`,
              duration: 9000,
              action: {
                label: "View Card",
                onClick: () => {
                  setActiveBoardId(board.id)
                  setCurrentView("board")
                  setSelectedTask({ boardId: board.id, columnId: col.id, taskId: task.id })
                },
              },
            })
          }

          const assignees = getTaskAssignees(task).map((a) => a.toLowerCase().trim())
          const isAssigned = userIdentifiers.some(
            (id) => assignees.includes(id) || task.leader?.toLowerCase().trim() === id
          )

          if (!isAssigned || isDoneColumn(col.title)) continue

          // 1. Task scheduled reminders
          if (task.reminders && task.reminders.length > 0) {
            for (const rem of task.reminders) {
              if (rem.completed || rem.dueDate > todayStr) continue

              const toastKey = `rem-${rem.id}`
              if (toastedRef.current.has(toastKey)) continue
              toastedRef.current.add(toastKey)

              const isOverdue = rem.dueDate < todayStr
              const createdByLabel = rem.createdBy ? ` • by ${rem.createdBy}` : ""
              playReminderChime()

              toast(isOverdue ? `Overdue Reminder: ${rem.text}` : `Reminder: ${rem.text}`, {
                description: `${task.title} • ${board.title}${createdByLabel}`,
                duration: 8000,
                action: {
                  label: "View Task",
                  onClick: () => {
                    setActiveBoardId(board.id)
                    setCurrentView("board")
                    setSelectedTask({ boardId: board.id, columnId: col.id, taskId: task.id })
                  },
                },
              })
            }
          }

          // 2. Task due date alert
          if (task.dueDate && task.dueDate <= todayStr) {
            const toastKey = `task-due-${task.id}-${task.dueDate}`
            if (!toastedRef.current.has(toastKey)) {
              toastedRef.current.add(toastKey)
              const isOverdue = task.dueDate < todayStr

              playReminderChime()
              toast(isOverdue ? `Task Overdue: ${task.title}` : `Task Due Today: ${task.title}`, {
                description: `Board: ${board.title} (${col.title})`,
                duration: 8000,
                action: {
                  label: "View Task",
                  onClick: () => {
                    setActiveBoardId(board.id)
                    setCurrentView("board")
                    setSelectedTask({ boardId: board.id, columnId: col.id, taskId: task.id })
                  },
                },
              })
            }
          }
        }
      }
    }
  }, [boards, user, profile, setActiveBoardId, setCurrentView, setSelectedTask])
}
