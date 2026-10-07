import { create } from "zustand"
import { persist } from "zustand/middleware"

export type StaffRole = "admin" | "tour_coordinator" | "fleet_manager" | "accounts"

export interface StaffMember {
  id: string
  name: string
  phone: string
  email: string
  role: StaffRole
  status: "active" | "invited" | "inactive"
  assignedVehicles?: string
  joinedDate: string
}

interface StaffState {
  staff: StaffMember[]
  addStaff: (member: Omit<StaffMember, "id" | "joinedDate">) => void
  updateStaffRole: (id: string, role: StaffRole) => void
  deleteStaff: (id: string) => void
}

const initialStaff: StaffMember[] = [
  {
    id: "staff-1",
    name: "Mohit Singhvi",
    phone: "+91 98290 55441",
    email: "mohit@mohittours.com",
    role: "admin",
    status: "active",
    joinedDate: "2024-01-10",
  },
  {
    id: "staff-2",
    name: "Mahendra Singh",
    phone: "+91 94140 12345",
    email: "mahendra.s@mohittours.com",
    role: "fleet_manager",
    status: "active",
    assignedVehicles: "Tempo Traveller, Innova Crysta",
    joinedDate: "2024-03-15",
  },
  {
    id: "staff-3",
    name: "Pooja Rathore",
    phone: "+91 98291 99887",
    email: "pooja.tours@mohittours.com",
    role: "tour_coordinator",
    status: "active",
    joinedDate: "2024-06-01",
  },
  {
    id: "staff-4",
    name: "Ramesh Kumar",
    phone: "+91 97110 33221",
    email: "ramesh.k@mohittours.com",
    role: "fleet_manager",
    status: "active",
    assignedVehicles: "Innova Crysta (RJ 14 TA 4521)",
    joinedDate: "2024-08-20",
  },
]

export const useStaffStore = create<StaffState>()(
  persist(
    (set) => ({
      staff: initialStaff,

      addStaff: (member) => {
        const newStaff: StaffMember = {
          ...member,
          id: `staff-${Date.now()}`,
          joinedDate: new Date().toISOString().split("T")[0],
        }
        set((state) => ({ staff: [newStaff, ...state.staff] }))
      },

      updateStaffRole: (id, role) => {
        set((state) => ({
          staff: state.staff.map((s) => (s.id === id ? { ...s, role } : s)),
        }))
      },

      deleteStaff: (id) => {
        set((state) => ({
          staff: state.staff.filter((s) => s.id !== id),
        }))
      },
    }),
    {
      name: "mtt-staff-storage",
    }
  )
)
