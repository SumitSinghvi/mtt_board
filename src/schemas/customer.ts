import { z } from "zod"

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().optional(),
  createdAt: z.string(),
})

export type Customer = z.infer<typeof CustomerSchema>
