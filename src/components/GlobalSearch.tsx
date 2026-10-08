import { useState, useRef, useEffect } from "react"
import { Search, MapPin, Calendar, X } from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { formatDate } from "../lib/date"
import { getTaskAssignees } from "../schemas/board"

interface GlobalSearchProps {
  onSelectTask: (boardId: string, columnId: string, taskId: string) => void
}

export function GlobalSearch({ onSelectTask }: GlobalSearchProps) {
  const { boards } = useBoardStore()
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const trimmed = query.trim().toLowerCase()

  // Match tasks across all boards and columns
  const matchedTasks: {
    boardId: string
    boardTitle: string
    columnId: string
    columnTitle: string
    taskId: string
    title: string
    customerName?: string
    customerPhone?: string
    destination?: string
    amount?: number
    dueDate?: string
  }[] = []

  if (trimmed.length >= 2) {
    for (const b of boards) {
      for (const col of b.columns) {
        for (const t of col.tasks) {
          const matchTitle = t.title.toLowerCase().includes(trimmed)
          const matchCustomer = t.customerName?.toLowerCase().includes(trimmed)
          const matchPhone = t.customerPhone?.toLowerCase().includes(trimmed)
          const matchDest = t.destination?.toLowerCase().includes(trimmed)
          const matchPickup = t.pickupLocation?.toLowerCase().includes(trimmed)
          const matchNotes = t.description?.toLowerCase().includes(trimmed)
          const matchAssignee = getTaskAssignees(t).some((a) => a.toLowerCase().includes(trimmed))

          if (matchTitle || matchCustomer || matchPhone || matchDest || matchPickup || matchNotes || matchAssignee) {
            matchedTasks.push({
              boardId: b.id,
              boardTitle: b.title,
              columnId: col.id,
              columnTitle: col.title,
              taskId: t.id,
              title: t.title,
              customerName: t.customerName,
              customerPhone: t.customerPhone,
              destination: t.destination,
              amount: t.amount,
              dueDate: t.dueDate,
            })
          }
        }
      }
    }
  }

  const [mobileModalOpen, setMobileModalOpen] = useState(false)

  return (
    <>
      {/* Mobile search trigger button */}
      <button
        type="button"
        onClick={() => setMobileModalOpen(true)}
        title="Search bookings across boards"
        className="md:hidden rounded-lg p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition focus:outline-none"
      >
        <Search className="size-5" />
      </button>

      {/* Mobile search modal overlay */}
      {mobileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-stone-900/50 backdrop-blur-xs p-3 md:hidden animate-in fade-in-50"
          onClick={() => setMobileModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 p-3 border-b border-stone-200 bg-stone-50/80 shrink-0">
              <Search className="size-4 text-stone-400 shrink-0 ml-1" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search bookings, phone, destination..."
                className="flex-1 bg-transparent text-xs text-stone-900 placeholder-stone-400 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 text-stone-400 hover:text-stone-600"
                >
                  <X className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileModalOpen(false)
                  setQuery("")
                }}
                className="text-xs font-semibold text-stone-600 hover:text-stone-900 px-2 py-1 rounded"
              >
                Done
              </button>
            </div>

            <div className="overflow-y-auto p-2 flex-1">
              {trimmed.length < 2 ? (
                <div className="p-4 text-center text-xs text-stone-400">
                  Type at least 2 characters to search across all boards...
                </div>
              ) : matchedTasks.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-400">
                  No matching bookings, clients, or destinations found.
                </div>
              ) : (
                <div className="space-y-1">
                  {matchedTasks.slice(0, 15).map((item) => (
                    <div
                      key={`${item.boardId}-${item.taskId}`}
                      onClick={() => {
                        onSelectTask(item.boardId, item.columnId, item.taskId)
                        setMobileModalOpen(false)
                        setQuery("")
                      }}
                      className="group rounded-lg p-2.5 hover:bg-stone-50 border border-stone-100 hover:border-stone-200 transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-stone-900 group-hover:text-amber-800 truncate">
                          {item.title}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[10px] font-semibold bg-stone-100 text-stone-600 shrink-0">
                          {item.boardTitle}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500">
                        {item.customerName && (
                          <span className="font-medium text-stone-700">
                            {item.customerName}
                            {item.customerPhone ? ` (${item.customerPhone})` : ""}
                          </span>
                        )}

                        {item.destination && (
                          <span className="inline-flex items-center gap-1 text-stone-500">
                            <MapPin className="size-3 text-amber-600" />
                            {item.destination}
                          </span>
                        )}

                        {item.amount !== undefined && (
                          <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700">
                            ₹{item.amount.toLocaleString("en-IN")}
                          </span>
                        )}

                        {item.dueDate && (
                          <span className="inline-flex items-center gap-1 text-stone-400 ml-auto text-[10px]">
                            <Calendar className="size-3" />
                            {formatDate(item.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop inline search bar */}
      <div ref={containerRef} className="relative w-full max-w-md hidden md:block">
        <div className="relative flex items-center">
          <Search className="absolute left-3 size-4 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search bookings, client phone, destination across boards..."
            className="w-full rounded-lg border border-stone-200 bg-stone-50 pl-9 pr-8 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition shadow-2xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setIsOpen(false)
              }}
              className="absolute right-2 p-1 text-stone-400 hover:text-stone-600 rounded transition"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Desktop Results Dropdown */}
        {isOpen && trimmed.length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 max-h-96 overflow-y-auto rounded-xl border border-stone-200 bg-white p-2 shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 flex items-center justify-between">
              <span>Search Results ({matchedTasks.length})</span>
              <span>Press Esc to close</span>
            </div>

            {matchedTasks.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-400">
                No matching bookings, clients, or destinations found.
              </div>
            ) : (
              <div className="space-y-1 pt-1">
                {matchedTasks.slice(0, 8).map((item) => (
                  <div
                    key={`${item.boardId}-${item.taskId}`}
                    onClick={() => {
                      onSelectTask(item.boardId, item.columnId, item.taskId)
                      setIsOpen(false)
                      setQuery("")
                    }}
                    className="group rounded-lg p-2.5 hover:bg-stone-50 border border-transparent hover:border-stone-200 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-stone-900 group-hover:text-amber-800 truncate">
                        {item.title}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-stone-100 text-stone-600 shrink-0">
                        {item.boardTitle} • {item.columnTitle}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500">
                      {item.customerName && (
                        <span className="font-medium text-stone-700">
                          {item.customerName}
                          {item.customerPhone ? ` (${item.customerPhone})` : ""}
                        </span>
                      )}

                      {item.destination && (
                        <span className="inline-flex items-center gap-1 text-stone-500">
                          <MapPin className="size-3 text-amber-600" />
                          {item.destination}
                        </span>
                      )}

                      {item.amount !== undefined && (
                        <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700">
                          ₹{item.amount.toLocaleString("en-IN")}
                        </span>
                      )}

                      {item.dueDate && (
                        <span className="inline-flex items-center gap-1 text-stone-400 ml-auto text-[10px]">
                          <Calendar className="size-3" />
                          {formatDate(item.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
