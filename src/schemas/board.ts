import { z } from "zod"

export const PrioritySchema = z.enum(["low", "medium", "high", "urgent"])
export type Priority = z.infer<typeof PrioritySchema>

export const ActivityItemSchema = z.object({
  id: z.string(),
  type: z.enum(["comment", "history"]),
  author: z.string().default("Staff"),
  content: z.string(),
  createdAt: z.string(),
})
export type ActivityItem = z.infer<typeof ActivityItemSchema>

export const ChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  description: z.string().optional(),
  done: z.boolean().default(false),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  priority: PrioritySchema.optional(),
  notes: z.string().optional(),
  activities: z.array(ActivityItemSchema).optional(),
})
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>

export const TaskReminderSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Reminder text is required"),
  dueDate: z.string(), // YYYY-MM-DD
  dueTime: z.string().optional(), // HH:mm
  priority: PrioritySchema.default("medium").optional(),
  completed: z.boolean().default(false),
  completedAt: z.string().optional(),
  createdBy: z.string().optional(),
  createdAt: z.string(),
})
export type TaskReminder = z.infer<typeof TaskReminderSchema>

export const HotelBookingStatusSchema = z.enum(["none", "hold", "blocked", "confirmed"])
export type HotelBookingStatus = z.infer<typeof HotelBookingStatusSchema>

export const HotelBookingSchema = z.object({
  status: HotelBookingStatusSchema.default("none"),
  hotelName: z.string().optional(),
  holdUntil: z.string().optional(),
  confirmationNo: z.string().optional(),
  notes: z.string().optional(),
})
export type HotelBooking = z.infer<typeof HotelBookingSchema>

export const PaymentPhaseSchema = z.object({
  amount: z.number().optional(),
  receivedDate: z.string().optional(), // YYYY-MM-DD
  paymentMode: z.string().optional(), // UPI, Bank Transfer, Cash, Card, etc.
  notes: z.string().optional(),
})
export type PaymentPhase = z.infer<typeof PaymentPhaseSchema>

export const PaymentTrackingSchema = z.object({
  totalAmount: z.number().optional(),
  phase1: PaymentPhaseSchema.optional(), // Advance Payment
  phase2: PaymentPhaseSchema.optional(), // Second Payment
  phase3: PaymentPhaseSchema.optional(), // Final Payment
})
export type PaymentTracking = z.infer<typeof PaymentTrackingSchema>

export function getPaymentSummary(payment?: PaymentTracking, fallbackTotal?: number) {
  const total = payment?.totalAmount ?? fallbackTotal ?? 0
  const p1 = payment?.phase1?.amount || 0
  const p2 = payment?.phase2?.amount || 0
  const p3 = payment?.phase3?.amount || 0
  const received = p1 + p2 + p3
  const pending = Math.max(0, total - received)

  let paidCount = 0
  if (payment?.phase1?.receivedDate || p1 > 0) paidCount++
  if (payment?.phase2?.receivedDate || p2 > 0) paidCount++
  if (payment?.phase3?.receivedDate || p3 > 0) paidCount++

  const isFullyPaid = total > 0 && received >= total
  const isPartiallyPaid = received > 0 && !isFullyPaid

  return {
    total,
    received,
    pending,
    paidCount,
    isFullyPaid,
    isPartiallyPaid,
  }
}

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: PrioritySchema.default("medium"),
  assignee: z.string().optional(),
  assignees: z.array(z.string()).optional(),
  leader: z.string().optional(),
  createdBy: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  amount: z.number().optional(),
  advancePaid: z.number().optional(),
  dueDate: z.string().optional(),
  travelStartDate: z.string().optional(),
  travelEndDate: z.string().optional(),
  pickupLocation: z.string().optional(),
  destination: z.string().optional(),
  vehicleType: z.string().optional(),
  paxAdults: z.number().optional(),
  paxKids: z.number().optional(),
  checklist: z.array(ChecklistItemSchema).optional(),
  activities: z.array(ActivityItemSchema).optional(),
  reminders: z.array(TaskReminderSchema).optional(),
  hotelBooking: HotelBookingSchema.optional(),
  paymentTracking: PaymentTrackingSchema.optional(),
  createdAt: z.string(),
})
export type Task = z.infer<typeof TaskSchema>

export function getTaskAssignees(task?: Partial<Task> | null): string[] {
  if (!task) return []
  if (Array.isArray(task.assignees) && task.assignees.length > 0) {
    return task.assignees
  }
  return task.assignee ? [task.assignee] : []
}

export const ColumnSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Column name is required"),
  tasks: z.array(TaskSchema).default([]),
})
export type Column = z.infer<typeof ColumnSchema>

export const BoardModulesSchema = z.object({
  clientContact: z.boolean().default(true),
  subtasks: z.boolean().default(true),
  hotelBooking: z.boolean().default(false),
  paymentTracking: z.boolean().default(false),
})
export type BoardModules = z.infer<typeof BoardModulesSchema>

export const BoardSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Board name is required"),
  description: z.string().optional(),
  icon: z.string().default("clipboard-list"),
  columns: z.array(ColumnSchema).default([]),
  modules: BoardModulesSchema.optional(),
  isArchived: z.boolean().default(false).optional(),
  position: z.number().default(0).optional(),
  createdAt: z.string(),
})
export type Board = z.infer<typeof BoardSchema>
