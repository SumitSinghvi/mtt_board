import type { StaffRole, StaffPermissions } from "../store/staffStore"
import type { UserProfile } from "../store/authStore"

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
