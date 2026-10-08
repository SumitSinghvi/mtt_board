export interface Country {
  name: string
  dialCode: string
  code: string
  flag: string
}

export const COUNTRIES: Country[] = [
  // Primary & Popular travel corridors
  { name: "India (भारत)", dialCode: "+91", code: "IN", flag: "🇮🇳" },
  { name: "United States", dialCode: "+1", code: "US", flag: "🇺🇸" },
  { name: "United Kingdom", dialCode: "+44", code: "GB", flag: "🇬🇧" },
  { name: "United Arab Emirates", dialCode: "+971", code: "AE", flag: "🇦🇪" },
  { name: "Saudi Arabia", dialCode: "+966", code: "SA", flag: "🇸🇦" },
  { name: "Canada", dialCode: "+1", code: "CA", flag: "🇨🇦" },
  { name: "Australia", dialCode: "+61", code: "AU", flag: "🇦🇺" },
  { name: "Singapore", dialCode: "+65", code: "SG", flag: "🇸🇬" },
  { name: "Thailand", dialCode: "+66", code: "TH", flag: "🇹🇭" },
  { name: "Malaysia", dialCode: "+60", code: "MY", flag: "🇲🇾" },
  { name: "Qatar", dialCode: "+974", code: "QA", flag: "🇶🇦" },
  { name: "Oman", dialCode: "+968", code: "OM", flag: "🇴🇲" },
  { name: "Kuwait", dialCode: "+965", code: "KW", flag: "🇰🇼" },
  { name: "Bahrain", dialCode: "+973", code: "BH", flag: "🇧🇭" },
  { name: "Nepal", dialCode: "+977", code: "NP", flag: "🇳🇵" },
  { name: "Sri Lanka", dialCode: "+94", code: "LK", flag: "🇱🇰" },
  { name: "Maldives", dialCode: "+960", code: "MV", flag: "🇲🇻" },
  { name: "Indonesia", dialCode: "+62", code: "ID", flag: "🇮🇩" },
  { name: "Vietnam", dialCode: "+84", code: "VN", flag: "🇻🇳" },
  { name: "Japan", dialCode: "+81", code: "JP", flag: "🇯🇵" },
  { name: "Germany", dialCode: "+49", code: "DE", flag: "🇩🇪" },
  { name: "France", dialCode: "+33", code: "FR", flag: "🇫🇷" },
  { name: "Italy", dialCode: "+39", code: "IT", flag: "🇮🇹" },
  { name: "Spain", dialCode: "+34", code: "ES", flag: "🇪🇸" },
  { name: "Switzerland", dialCode: "+41", code: "CH", flag: "🇨🇭" },
  { name: "Netherlands", dialCode: "+31", code: "NL", flag: "🇳🇱" },
  { name: "Turkey", dialCode: "+90", code: "TR", flag: "🇹🇷" },
  { name: "New Zealand", dialCode: "+64", code: "NZ", flag: "🇳🇿" },
  { name: "South Africa", dialCode: "+27", code: "ZA", flag: "🇿🇦" },
  { name: "Mauritius", dialCode: "+230", code: "MU", flag: "🇲🇺" },

  // Rest of the world (alphabetical)
  { name: "Afghanistan", dialCode: "+93", code: "AF", flag: "🇦🇫" },
  { name: "Albania", dialCode: "+355", code: "AL", flag: "🇦🇱" },
  { name: "Algeria", dialCode: "+213", code: "DZ", flag: "🇩🇿" },
  { name: "Argentina", dialCode: "+54", code: "AR", flag: "🇦🇷" },
  { name: "Armenia", dialCode: "+374", code: "AM", flag: "🇦🇲" },
  { name: "Austria", dialCode: "+43", code: "AT", flag: "🇦🇹" },
  { name: "Azerbaijan", dialCode: "+994", code: "AZ", flag: "🇦🇿" },
  { name: "Bangladesh", dialCode: "+880", code: "BD", flag: "🇧🇩" },
  { name: "Belgium", dialCode: "+32", code: "BE", flag: "🇧🇪" },
  { name: "Bhutan", dialCode: "+975", code: "BT", flag: "🇧🇹" },
  { name: "Brazil", dialCode: "+55", code: "BR", flag: "🇧🇷" },
  { name: "Cambodia", dialCode: "+855", code: "KH", flag: "🇰🇭" },
  { name: "China", dialCode: "+86", code: "CN", flag: "🇨🇳" },
  { name: "Cyprus", dialCode: "+357", code: "CY", flag: "🇨🇾" },
  { name: "Czech Republic", dialCode: "+420", code: "CZ", flag: "🇨🇿" },
  { name: "Denmark", dialCode: "+45", code: "DK", flag: "🇩🇰" },
  { name: "Egypt", dialCode: "+20", code: "EG", flag: "🇪🇬" },
  { name: "Finland", dialCode: "+358", code: "FI", flag: "🇫🇮" },
  { name: "Georgia", dialCode: "+995", code: "GE", flag: "🇬🇪" },
  { name: "Greece", dialCode: "+30", code: "GR", flag: "🇬🇷" },
  { name: "Hong Kong", dialCode: "+852", code: "HK", flag: "🇭🇰" },
  { name: "Hungary", dialCode: "+36", code: "HU", flag: "🇭🇺" },
  { name: "Iceland", dialCode: "+354", code: "IS", flag: "🇮🇸" },
  { name: "Iran", dialCode: "+98", code: "IR", flag: "🇮🇷" },
  { name: "Iraq", dialCode: "+964", code: "IQ", flag: "🇮🇶" },
  { name: "Ireland", dialCode: "+353", code: "IE", flag: "🇮🇪" },
  { name: "Israel", dialCode: "+972", code: "IL", flag: "🇮🇱" },
  { name: "Jordan", dialCode: "+962", code: "JO", flag: "🇯🇴" },
  { name: "Kazakhstan", dialCode: "+7", code: "KZ", flag: "🇰🇿" },
  { name: "Kenya", dialCode: "+254", code: "KE", flag: "🇰🇪" },
  { name: "Lebanon", dialCode: "+961", code: "LB", flag: "🇱🇧" },
  { name: "Luxembourg", dialCode: "+352", code: "LU", flag: "🇱🇺" },
  { name: "Mexico", dialCode: "+52", code: "MX", flag: "🇲🇽" },
  { name: "Morocco", dialCode: "+212", code: "MA", flag: "🇲🇦" },
  { name: "Myanmar", dialCode: "+95", code: "MM", flag: "🇲🇲" },
  { name: "Nigeria", dialCode: "+234", code: "NG", flag: "🇳🇬" },
  { name: "Norway", dialCode: "+47", code: "NO", flag: "🇳🇴" },
  { name: "Pakistan", dialCode: "+92", code: "PK", flag: "🇵🇰" },
  { name: "Philippines", dialCode: "+63", code: "PH", flag: "🇵🇭" },
  { name: "Poland", dialCode: "+48", code: "PL", flag: "🇵🇱" },
  { name: "Portugal", dialCode: "+351", code: "PT", flag: "🇵🇹" },
  { name: "Romania", dialCode: "+40", code: "RO", flag: "🇷🇴" },
  { name: "Russia", dialCode: "+7", code: "RU", flag: "🇷🇺" },
  { name: "South Korea", dialCode: "+82", code: "KR", flag: "🇰🇷" },
  { name: "Sweden", dialCode: "+46", code: "SE", flag: "🇸🇪" },
  { name: "Taiwan", dialCode: "+886", code: "TW", flag: "🇹🇼" },
  { name: "Tanzania", dialCode: "+255", code: "TZ", flag: "🇹🇿" },
  { name: "Ukraine", dialCode: "+380", code: "UA", flag: "🇺🇦" },
  { name: "Uzbekistan", dialCode: "+998", code: "UZ", flag: "UZ" },
  { name: "Vietnam", dialCode: "+84", code: "VN", flag: "🇻🇳" },
]

export const SORTED_DIAL_CODES = [...COUNTRIES].sort(
  (a, b) => b.dialCode.length - a.dialCode.length
)

export function parsePhone(value?: string): { country: Country; nationalNumber: string } {
  if (!value || !value.trim()) {
    return { country: COUNTRIES[0], nationalNumber: "" }
  }

  const clean = value.trim()
  if (clean.startsWith("+")) {
    const matched = SORTED_DIAL_CODES.find((c) => clean.startsWith(c.dialCode))
    if (matched) {
      const rest = clean.slice(matched.dialCode.length).trim()
      return { country: matched, nationalNumber: rest }
    }
  }

  return { country: COUNTRIES[0], nationalNumber: clean }
}
