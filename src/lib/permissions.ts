import type { StaffRole, StaffPermissions } from "../store/staffStore"
import type { UserProfile } from "../store/authStore"
import type { Task, Board } from "../schemas/board"
import { getTaskAssignees } from "../schemas/board"

export function getDefaultRolePermissions(role: StaffRole): StaffPermissions {
  switch (role) {
    case "admin":
      return {
        allowedBoardIds: undefined,
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: true,
        canViewCommercials: true,
      }
    case "accounts":
      return {
        allowedBoardIds: undefined,
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: false,
        canViewCommercials: true,
      }
    case "travel":
      return {
        allowedBoardIds: undefined,
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: false,
        canViewCommercials: false,
      }
    case "visa":
      return {
        allowedBoardIds: undefined,
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: false,
        canViewCommercials: false,
      }
  }
}

export function getUserPermissions(profile: UserProfile | null): StaffPermissions {
  // If not authenticated, zero permissions
  if (!profile) {
    return {
      allowedBoardIds: [],
      canCreateCards: false,
      canEditCards: false,
      canDeleteCards: false,
      canViewCommercials: false,
    }
  }

  const roleDefaults = getDefaultRolePermissions(profile.role)

  // Explicit permissions set by admin override role defaults
  return {
    allowedBoardIds: profile.permissions?.allowedBoardIds ?? roleDefaults.allowedBoardIds,
    canCreateCards: profile.permissions?.canCreateCards ?? roleDefaults.canCreateCards,
    canEditCards: profile.permissions?.canEditCards ?? roleDefaults.canEditCards,
    canDeleteCards: profile.permissions?.canDeleteCards ?? roleDefaults.canDeleteCards,
    canViewCommercials: profile.permissions?.canViewCommercials ?? roleDefaults.canViewCommercials,
  }
}

export function isBoardAllowed(board: Board, profile: UserProfile | null): boolean {
  if (!profile) return false
  const perms = getUserPermissions(profile)
  if (perms.allowedBoardIds && perms.allowedBoardIds.length > 0) {
    return perms.allowedBoardIds.includes(board.id)
  }
  const role = profile.role || "travel"
  if (role === "admin" || role === "accounts") return true
  const titleLower = board.title.toLowerCase()
  if (role === "visa") {
    return titleLower.includes("visa") || !titleLower.includes("fleet")
  }
  if (role === "travel") {
    return !titleLower.includes("accounting") && !titleLower.includes("payroll")
  }
  return true
}

export function getAllowedBoards(boards: Board[], profile: UserProfile | null): Board[] {
  return boards.filter((b) => isBoardAllowed(b, profile))
}

/**
 * Checks if current user can edit a specific task.
 * Allowed if:
 * 1. User is an admin
 * 2. User created the card (task.createdBy or initial "Card created" activity author)
 * 3. User is explicitly assigned to the card (in assignees / assignee)
 */
export function canUserEditTask(
  task: Task,
  profile: UserProfile | null,
  isArchived = false
): boolean {
  if (isArchived || !profile) return false

  const perms = getUserPermissions(profile)
  if (!perms.canEditCards) return false

  // Admins can always edit any card
  if (profile.role === "admin") return true

  // Card creator can edit
  const creator = task.createdBy || task.activities?.find((a) => a.content === "Card created")?.author
  if (creator) {
    const creatorClean = creator.trim().toLowerCase()
    if (
      creatorClean === profile.name.trim().toLowerCase() ||
      creatorClean === profile.id.toLowerCase() ||
      creatorClean === profile.email.trim().toLowerCase()
    ) {
      return true
    }
  }

  // Assigned staff can edit
  const assignees = getTaskAssignees(task)
  const isAssigned = assignees.some((person) => {
    const clean = person.trim().toLowerCase()
    return (
      clean === profile.name.trim().toLowerCase() ||
      clean === profile.id.toLowerCase() ||
      clean === profile.email.trim().toLowerCase()
    )
  })

  if (isAssigned) return true

  // Sub-card assignees can edit
  const isSubcardAssigned = task.checklist?.some((item) => {
    if (!item.assignee) return false
    const clean = item.assignee.trim().toLowerCase()
    return (
      clean === profile.name.trim().toLowerCase() ||
      clean === profile.id.toLowerCase() ||
      clean === profile.email.trim().toLowerCase()
    )
  })

  return !!isSubcardAssigned
}
