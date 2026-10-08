export { cn } from "cn"

export function getWhatsAppUrl(phone?: string): string | null {
  if (!phone) return null
  const clean = phone.replace(/[^0-9]/g, "")
  if (!clean) return null
  return `https://wa.me/${clean.startsWith("91") ? clean : `91${clean}`}`
}
