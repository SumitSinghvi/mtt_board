import { useState, useEffect } from "react"
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Trash2,
  X,
  FileText,
} from "lucide-react"
import { useCustomerStore } from "../store/customerStore"
import { useBoardStore } from "../store/boardStore"

export function CustomersPage() {
  const { customers, fetchCustomersFromSupabase, saveCustomer, deleteCustomer } = useCustomerStore()
  const { boards } = useBoardStore()

  useEffect(() => {
    fetchCustomersFromSupabase()
  }, [fetchCustomersFromSupabase])

  const [search, setSearch] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  // Filter customers
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  )

  // Find linked cards across all boards for a customer
  const getCustomerBookings = (custName: string) => {
    const list: { boardTitle: string; cardTitle: string; amount?: number }[] = []
    boards.forEach((board) => {
      board.columns.forEach((col) => {
        col.tasks.forEach((t) => {
          if (t.customerName && t.customerName.toLowerCase() === custName.toLowerCase()) {
            list.push({
              boardTitle: board.title,
              cardTitle: t.title,
              amount: t.amount,
            })
          }
        })
      })
    })
    return list
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    saveCustomer({ name: name.trim(), phone: phone.trim() || undefined, email: email.trim() || undefined })
    setName("")
    setPhone("")
    setEmail("")
    setIsModalOpen(false)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-stone-100/70 p-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 bg-white px-6 py-4 rounded-t-xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              <Users className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-900 tracking-tight">Customer Directory</h1>
              <p className="text-xs text-stone-500">
                {customers.length} saved clients • autofills in cards across boards
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-lg border border-stone-300 bg-stone-50 pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700 transition"
          >
            <Plus className="size-3.5" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Customers Table / Card View */}
      <div className="flex-1 overflow-y-auto bg-white border-x border-b border-stone-200 rounded-b-xl shadow-2xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            <Users className="size-10 mx-auto text-stone-300 mb-2" />
            <p className="text-sm font-semibold text-stone-700">No customers found</p>
            <p className="text-xs text-stone-500 mt-1">Try another search or add a new customer.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-600">
                <th className="py-3 px-5">Customer Name</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Linked Trips / Cards</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((c) => {
                const bookings = getCustomerBookings(c.name)

                return (
                  <tr key={c.id} className="hover:bg-amber-50/30 transition">
                    <td className="py-3.5 px-5 font-semibold text-stone-900">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{c.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-stone-600">
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className="inline-flex items-center gap-1.5 hover:text-amber-700 font-medium"
                        >
                          <Phone className="size-3 text-stone-400" />
                          <span>{c.phone}</span>
                        </a>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-stone-600">
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="inline-flex items-center gap-1.5 hover:text-amber-700"
                        >
                          <Mail className="size-3 text-stone-400" />
                          <span>{c.email}</span>
                        </a>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-stone-600">
                      {bookings.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {bookings.slice(0, 2).map((b, idx) => (
                            <span
                              key={idx}
                              title={`${b.cardTitle} (${b.boardTitle})`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 border border-stone-200/80 text-[10px] text-stone-700 max-w-[180px] truncate"
                            >
                              <FileText className="size-2.5 text-stone-400 shrink-0" />
                              <span className="truncate">{b.cardTitle}</span>
                            </span>
                          ))}
                          {bookings.length > 2 && (
                            <span className="text-[10px] text-stone-400 font-medium">
                              +{bookings.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-stone-400">0 bookings</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove "${c.name}" from customer directory?`)) {
                            deleteCustomer(c.id)
                          }
                        }}
                        title="Delete Customer"
                        className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl z-10">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h2 className="text-sm font-bold text-stone-900">Add New Customer</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Vikram Malhotra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98290 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="vikram@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 shadow-2xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
