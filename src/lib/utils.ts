export { cn } from "cn"

export function getWhatsAppUrl(phone?: string): string | null {
  if (!phone) return null
  const clean = phone.replace(/[^0-9]/g, "")
  if (!clean) return null
  return `https://wa.me/${clean.startsWith("91") ? clean : `91${clean}`}`
}

export function generateId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}
