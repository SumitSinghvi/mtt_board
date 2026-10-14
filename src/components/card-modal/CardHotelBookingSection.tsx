import { useState } from "react"
import {
  Hotel,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertCircle,
  Hash,
  FileText,
} from "lucide-react"
import type { HotelBooking, HotelBookingStatus } from "../../schemas/board"
import { formatDate } from "../../lib/date"

interface CardHotelBookingSectionProps {
  hotelBooking?: HotelBooking
  canEdit?: boolean
  onChange: (booking: HotelBooking) => void
}

export function CardHotelBookingSection({
  hotelBooking,
  canEdit = true,
  onChange,
}: CardHotelBookingSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  const currentStatus: HotelBookingStatus = hotelBooking?.status || "none"
  const hotelName = hotelBooking?.hotelName || ""
  const holdUntil = hotelBooking?.holdUntil || ""
  const confirmationNo = hotelBooking?.confirmationNo || ""
  const notes = hotelBooking?.notes || ""

  const handleUpdate = (updates: Partial<HotelBooking>) => {
    onChange({
      status: currentStatus,
      hotelName: hotelName || undefined,
      holdUntil: holdUntil || undefined,
      confirmationNo: confirmationNo || undefined,
      notes: notes || undefined,
      ...updates,
    })
  }

  const isHoldExpired =
    currentStatus === "hold" &&
    holdUntil &&
    new Date(holdUntil) < new Date(new Date().toDateString())

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-700 hover:text-stone-900 transition cursor-pointer select-none"
        >
          {isOpen ? (
            <ChevronDown className="size-3.5 text-stone-400" />
          ) : (
            <ChevronRight className="size-3.5 text-stone-400" />
          )}
          <Hotel className="size-3.5 text-amber-600" />
          <span>Hotel Booking</span>
        </button>

        {/* Current status badge in header */}
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
            currentStatus === "hold"
              ? isHoldExpired
                ? "bg-red-50 text-red-700 border-red-300"
                : "bg-amber-100/90 text-amber-900 border-amber-300"
              : currentStatus === "blocked"
              ? "bg-purple-100/90 text-purple-900 border-purple-300"
              : currentStatus === "confirmed"
              ? "bg-emerald-100/90 text-emerald-900 border-emerald-300"
              : "bg-stone-200/70 text-stone-500 border-stone-300"
          }`}
        >
          {currentStatus === "hold" && isHoldExpired && (
            <AlertCircle className="size-2.5 text-red-600 shrink-0" />
          )}
          {currentStatus === "none" ? "Unbooked" : currentStatus}
        </span>
      </div>

      {isOpen && (
        <div className="space-y-3 text-xs">
          {/* Status Buttons */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1.5">
              Booking Status
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { value: "none", label: "None" },
                  { value: "hold", label: "Hold" },
                  { value: "blocked", label: "Blocked" },
                  { value: "confirmed", label: "Confirmed" },
                ] as const
              ).map((opt) => {
                const isActive = currentStatus === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleUpdate({ status: opt.value })}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center transition cursor-pointer border ${
                      isActive
                        ? opt.value === "hold"
                          ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                          : opt.value === "blocked"
                          ? "bg-purple-600 text-white border-purple-700 shadow-2xs"
                          : opt.value === "confirmed"
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                          : "bg-stone-700 text-white border-stone-800 shadow-2xs"
                        : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hotel Name */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">
              Hotel / Property Name
            </label>
            <input
              type="text"
              disabled={!canEdit}
              placeholder="e.g. Taj Jai Mahal, Oberoi, Bani Park Hotel"
              value={hotelName}
              onChange={(e) => handleUpdate({ hotelName: e.target.value })}
              className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-stone-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Hold Expiry / Cutoff Date (Prominent if Hold) */}
          {currentStatus === "hold" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 space-y-1.5">
              <label className="block text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                <Clock className="size-3 text-amber-700" />
                <span>Hold Release Cutoff / Follow-up Date</span>
              </label>
              <input
                type="date"
                disabled={!canEdit}
                value={holdUntil}
                onChange={(e) => handleUpdate({ holdUntil: e.target.value })}
                className="w-full rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-stone-100 disabled:cursor-not-allowed"
              />
              {holdUntil && (
                <div className="text-[10px] text-amber-800 flex items-center justify-between">
                  <span>
                    {isHoldExpired ? (
                      <strong className="text-red-700">⚠️ Hold cutoff date has passed!</strong>
                    ) : (
                      <>Cutoff: {formatDate(holdUntil)}</>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Confirmation / Voucher Number (Prominent if Confirmed or Blocked) */}
          {(currentStatus === "confirmed" || currentStatus === "blocked") && (
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 mb-1 flex items-center gap-1">
                <Hash className="size-3 text-stone-400" />
                <span>Confirmation / Voucher No</span>
              </label>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="e.g. VCH-8821, BKG-9923"
                value={confirmationNo}
                onChange={(e) => handleUpdate({ confirmationNo: e.target.value })}
                className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono disabled:bg-stone-100 disabled:cursor-not-allowed"
              />
            </div>
          )}

          {/* Hotel Notes & Room Terms */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1 flex items-center gap-1">
              <FileText className="size-3 text-stone-400" />
              <span>Room Category & Booking Notes</span>
            </label>
            <textarea
              rows={2}
              disabled={!canEdit}
              placeholder="e.g. 2 Deluxe Rooms, MAPAI meal plan, extra bed requested..."
              value={notes}
              onChange={(e) => handleUpdate({ notes: e.target.value })}
              className="w-full rounded-lg border border-stone-200 bg-white p-2 text-xs text-stone-800 leading-relaxed placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-stone-100 disabled:cursor-not-allowed resize-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}
