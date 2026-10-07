import { useState, useRef, useEffect } from "react"
import { User, Phone, Mail, ChevronDown, Check } from "lucide-react"
import { useCustomerStore } from "../store/customerStore"
import type { Customer } from "../schemas/customer"

interface CustomerComboboxProps {
  value: string
  onChange: (value: string) => void
  onSelectCustomer: (customer: { name: string; phone?: string; email?: string }) => void
  placeholder?: string
}

export function CustomerCombobox({
  value,
  onChange,
  onSelectCustomer,
  placeholder = "e.g. Rajesh Sharma",
}: CustomerComboboxProps) {
  const { customers } = useCustomerStore()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter matching customers
  const filtered = value.trim()
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(value.toLowerCase()) ||
          (c.phone && c.phone.includes(value))
      )
    : customers

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  const handleSelect = (customer: Customer) => {
    onChange(customer.name)
    onSelectCustomer({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    })
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
          }}
          className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 pr-8 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none"
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 focus:outline-none"
        >
          <ChevronDown className={`size-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Combobox Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-lg animate-in fade-in-50 zoom-in-95">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            {filtered.length > 0 ? "Saved Customers" : "No saved match"}
          </div>

          {filtered.map((customer) => {
            const isSelected = customer.name.toLowerCase() === value.trim().toLowerCase()

            return (
              <div
                key={customer.id}
                onClick={() => handleSelect(customer)}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 cursor-pointer text-xs transition ${
                  isSelected ? "bg-amber-50 text-amber-900 font-semibold" : "hover:bg-stone-50 text-stone-800"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <User className="size-3 text-stone-400 shrink-0" />
                    <span className="truncate">{customer.name}</span>
                  </div>

                  {(customer.phone || customer.email) && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-stone-400">
                      {customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-2.5" />
                          <span>{customer.phone}</span>
                        </span>
                      )}
                      {customer.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="size-2.5" />
                          <span className="truncate">{customer.email}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {isSelected && <Check className="size-3.5 text-amber-600 shrink-0 ml-2" />}
              </div>
            )
          })}

          {value.trim() && !customers.some((c) => c.name.toLowerCase() === value.trim().toLowerCase()) && (
            <div className="border-t border-stone-100 px-2.5 py-1.5 text-[11px] text-stone-500 italic">
              New customer will be saved automatically with card
            </div>
          )}
        </div>
      )}
    </div>
  )
}
