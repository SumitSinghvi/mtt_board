/**
 * Formats any ISO string or YYYY-MM-DD date string to dd-monthname-yyyy with ordinal suffix:
 * e.g. "2026-10-12" -> "12th Oct 2026"
 * e.g. "2026-05-01" -> "1st May 2026"
 */

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

function getOrdinal(day: number): string {
  if (day > 3 && day < 21) return "th"
  switch (day % 10) {
    case 1:
      return "st"
    case 2:
      return "nd"
    case 3:
      return "rd"
    default:
      return "th"
  }
}

export function formatDate(input?: string | null): string {
  if (!input) return ""
  try {
    // If input is YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [yearStr, monthStr, dayStr] = input.split("-")
      const year = Number(yearStr)
      const monthIdx = Number(monthStr) - 1
      const day = Number(dayStr)
      if (monthIdx >= 0 && monthIdx < 12 && day >= 1 && day <= 31) {
        return `${day}${getOrdinal(day)} ${SHORT_MONTHS[monthIdx]} ${year}`
      }
    }

    const d = new Date(input)
    if (isNaN(d.getTime())) return input

    const day = d.getDate()
    const month = SHORT_MONTHS[d.getMonth()]
    const year = d.getFullYear()
    return `${day}${getOrdinal(day)} ${month} ${year}`
  } catch {
    return input
  }
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
