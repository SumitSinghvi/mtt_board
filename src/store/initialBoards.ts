import type { Board } from "../schemas/board"

export const initialBoards: Board[] = [
  {
    id: "board-tour-bookings",
    title: "Tour Bookings",
    description: "Manage client travel inquiries, quotes, and confirmed trips",
    icon: "map-pin",
    createdAt: new Date().toISOString(),
    modules: {
      clientContact: true,
      subtasks: true,
    },
    columns: [
      {
        id: "col-inquiry",
        title: "New Inquiries",
        tasks: [
          {
            id: "task-1",
            title: "Jaipur 3D/2N Family Package",
            description: "4 adults, 2 kids. Needs Innova Crysta + 4-star hotel in Bani Park.",
            priority: "high",
            customerName: "Rajesh Sharma",
            customerPhone: "+91 98290 11223",
            amount: 45000,
            dueDate: "2026-10-15",
            createdAt: new Date().toISOString(),
          },
          {
            id: "task-2",
            title: "Udaipur Honeymoon Circuit",
            description: "Lake view resort enquiry, airport pickup required.",
            priority: "medium",
            customerName: "Vikram Malhotra",
            customerPhone: "+91 97110 44556",
            amount: 62000,
            dueDate: "2026-10-20",
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: "col-quoted",
        title: "Quote Sent",
        tasks: [
          {
            id: "task-3",
            title: "Jaisalmer Desert Camp + Camel Safari",
            description: "Custom quote shared for 6 pax group, waiting for confirmation.",
            priority: "medium",
            customerName: "Sunil Verma",
            customerPhone: "+91 94140 88990",
            amount: 38000,
            dueDate: "2026-10-12",
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: "col-confirmed",
        title: "Advance Received",
        tasks: [
          {
            id: "task-4",
            title: "Ranthambore Tiger Safari",
            description: "Canter booking confirmed. 30% advance received via UPI.",
            priority: "urgent",
            customerName: "Ananya Roy",
            customerPhone: "+91 99880 33445",
            amount: 28000,
            dueDate: "2026-10-10",
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: "col-completed",
        title: "Completed",
        tasks: [
          {
            id: "task-5",
            title: "Delhi - Agra Same Day Cab",
            description: "Sedan trip concluded. Full payment settled.",
            priority: "low",
            customerName: "David Miller",
            amount: 7500,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ],
  },
  {
    id: "board-fleet",
    title: "Fleet & Vehicles",
    description: "Monitor vehicle availability, maintenance schedules, and inspections",
    icon: "car",
    createdAt: new Date().toISOString(),
    modules: {
      clientContact: false,
      subtasks: true,
    },
    columns: [
      {
        id: "col-available",
        title: "Available Fleet",
        tasks: [
          {
            id: "task-f1",
            title: "Innova Crysta (RJ 14 TA 4521)",
            description: "Cleaned, sanitized, fueled. Driver: Ramesh Kumar.",
            priority: "low",
            createdAt: new Date().toISOString(),
          },
          {
            id: "task-f2",
            title: "Tempo Traveller 17 Seater (RJ 14 PA 8812)",
            description: "Ready for group tours. Driver: Mahendra Singh.",
            priority: "medium",
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: "col-active-trip",
        title: "On Active Trip",
        tasks: [
          {
            id: "task-f3",
            title: "Toyota Etios (RJ 14 TA 9102)",
            description: "On Delhi-Jaipur highway. ETA return: Tomorrow 6 PM.",
            priority: "medium",
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: "col-maintenance",
        title: "Scheduled Service",
        tasks: [
          {
            id: "task-f4",
            title: "Maruti Dzire (RJ 14 TA 1184)",
            description: "Brake pad replacement and oil change at service center.",
            priority: "high",
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ],
  },
]
