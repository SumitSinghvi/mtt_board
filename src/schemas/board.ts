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

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: PrioritySchema.default("medium"),
  assignee: z.string().optional(),
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
  createdAt: z.string(),
})
export type Task = z.infer<typeof TaskSchema>

export const ColumnSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Column name is required"),
  tasks: z.array(TaskSchema).default([]),
})
export type Column = z.infer<typeof ColumnSchema>

export const BoardModulesSchema = z.object({
  clientContact: z.boolean().default(true),
  tripLogistics: z.boolean().default(false),
  commercials: z.boolean().default(false),
  subtasks: z.boolean().default(true),
})
export type BoardModules = z.infer<typeof BoardModulesSchema>

export const BoardSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Board name is required"),
  description: z.string().optional(),
  icon: z.string().default("clipboard-list"),
  columns: z.array(ColumnSchema).default([]),
  modules: BoardModulesSchema.optional(),
  createdAt: z.string(),
})
export type Board = z.infer<typeof BoardSchema>
