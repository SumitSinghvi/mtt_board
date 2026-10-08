import type { StaffRole } from "../../store/staffStore"

export const roleLabels: Record<StaffRole, { title: string; color: string; desc: string }> = {
  admin: {
    title: "Admin",
    color: "bg-red-50 text-red-800 border-red-200",
    desc: "Full access to all boards, financials, modules, staff controls, and team settings",
  },
  visa: {
    title: "Visa",
    color: "bg-purple-50 text-purple-900 border-purple-200",
    desc: "Dedicated visa applications, documentation tracking, embassy liaison, and passport status",
  },
  travel: {
    title: "Travel",
    color: "bg-sky-50 text-sky-800 border-sky-200",
    desc: "Tour itineraries, packages, flight/hotel bookings, vehicles, and customer trip operations",
  },
  accounts: {
    title: "Accounts",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    desc: "Financial commercials, invoices, advances received, and vendor settlements",
  },
}
