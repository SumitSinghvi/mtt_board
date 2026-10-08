import { useState, useRef, useEffect, useMemo } from "react"
import { ChevronDown, Search, X } from "lucide-react"
import { COUNTRIES, parsePhone, type Country } from "../../lib/countries"

export interface PhoneInputProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
  id?: string
  name?: string
  autoFocus?: boolean
}

export function PhoneInput({
  value = "",
  onChange,
  placeholder = "Enter phone number",
  className = "",
  disabled = false,
  required = false,
  id,
  name,
  autoFocus = false,
}: PhoneInputProps) {
  const parsed = useMemo(() => parsePhone(value), [value])
  const [userCountryOverride, setUserCountryOverride] = useState<Country | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")

  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const numberInputRef = useRef<HTMLInputElement>(null)

  // Use explicit user-picked country if current value has no dialCode or matches it, otherwise parsed
  const selectedCountry = userCountryOverride || parsed.country

  // Click outside listener to dismiss country dropdown
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRIES
    const q = search.trim().toLowerCase()
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    )
  }, [search])

  const handleCountrySelect = (country: Country) => {
    setUserCountryOverride(country)
    setIsOpen(false)
    setSearch("")

    const num = parsed.nationalNumber.trim()
    onChange(num ? `${country.dialCode} ${num}` : "")
    numberInputRef.current?.focus()
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value

    // Auto-detect if user pasted full international number with '+'
    if (raw.startsWith("+")) {
      const detected = parsePhone(raw)
      setUserCountryOverride(detected.country)
      onChange(detected.nationalNumber ? `${detected.country.dialCode} ${detected.nationalNumber}` : "")
      return
    }

    const sanitized = raw.replace(/[^\d\s\-()]/g, "")
    if (!sanitized.trim()) {
      onChange("")
    } else {
      onChange(`${selectedCountry.dialCode} ${sanitized.trim()}`)
    }
  }

  return (
    <div ref={containerRef} className={`relative flex items-center ${className}`}>
      <div
        className={`flex w-full items-center rounded-lg border bg-white shadow-2xs transition focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 ${
          disabled ? "bg-stone-100 opacity-60 cursor-not-allowed" : "border-stone-200 hover:border-stone-300"
        }`}
      >
        {/* Country Code Picker Trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border-r border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-50 transition shrink-0 rounded-l-lg focus:outline-none"
          title={`Country: ${selectedCountry.name} (${selectedCountry.dialCode})`}
        >
          <span className="text-sm leading-none">{selectedCountry.flag}</span>
          <span className="text-[11px] font-semibold text-stone-800">{selectedCountry.dialCode}</span>
          <ChevronDown className="size-3 text-stone-400" />
        </button>

        {/* National Number Input */}
        <input
          ref={numberInputRef}
          type="tel"
          id={id}
          name={name}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={parsed.nationalNumber}
          onChange={handleNumberChange}
          className="flex-1 min-w-0 bg-transparent px-2.5 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none"
        />

        {/* Clear button if has value */}
        {parsed.nationalNumber && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange("")
              numberInputRef.current?.focus()
            }}
            className="p-1 mr-1 text-stone-400 hover:text-stone-600 rounded transition"
            title="Clear number"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {/* Country Selection Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 max-h-64 rounded-lg border border-stone-200 bg-white shadow-lg overflow-hidden animate-in fade-in-50 zoom-in-95 flex flex-col">
          {/* Search Bar */}
          <div className="p-2 border-b border-stone-100 bg-stone-50/70">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 size-3.5 text-stone-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or code..."
                className="w-full rounded-md border border-stone-200 bg-white pl-8 pr-2.5 py-1 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsOpen(false)
                    setSearch("")
                  }
                }}
              />
            </div>
          </div>

          {/* Country List */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-50">
            {filteredCountries.length === 0 ? (
              <div className="py-4 text-center text-xs text-stone-400">No countries found</div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = c.code === selectedCountry.code && c.dialCode === selectedCountry.dialCode
                return (
                  <button
                    key={`${c.code}-${c.dialCode}`}
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className={`flex items-center justify-between w-full px-3 py-1.5 text-xs text-left transition hover:bg-stone-50 ${
                      isSelected ? "bg-amber-50/60 font-semibold text-amber-900" : "text-stone-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="text-sm shrink-0">{c.flag}</span>
                      <span className="truncate">{c.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-stone-500 shrink-0">{c.dialCode}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
