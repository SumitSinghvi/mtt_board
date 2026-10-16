import { useState } from "react"
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
} from "lucide-react"
import type { OutgoingPayment, OutgoingPaymentStatus } from "../../schemas/board"

interface CardOutgoingPaymentSectionProps {
  outgoingPayment?: OutgoingPayment
  canEdit?: boolean
  onChange: (updated: OutgoingPayment) => void
}

export function CardOutgoingPaymentSection({
  outgoingPayment,
  canEdit = true,
  onChange,
}: CardOutgoingPaymentSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  const currentAmount = outgoingPayment?.amount
  const currentStatus: OutgoingPaymentStatus = outgoingPayment?.status || "none"
  const currentNotes = outgoingPayment?.notes || ""

  const handleUpdate = (updates: Partial<OutgoingPayment>) => {
    onChange({
      status: currentStatus,
      amount: currentAmount,
      notes: currentNotes || undefined,
      ...updates,
    })
  }

  const handleAmountChange = (val: string) => {
    const num = val === "" ? undefined : Number(val)
    const nextStatus =
      currentStatus === "none" && num !== undefined && num > 0 ? "pending" : currentStatus
    handleUpdate({ amount: num, status: nextStatus })
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3 space-y-2.5 shadow-2xs">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
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
          <ArrowUpRight className="size-3.5 text-rose-600" />
          <span>Outgoing Payment</span>
        </button>

        {/* Compact Status Pill */}
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
            currentStatus === "done"
              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
              : currentStatus === "pending"
              ? "bg-rose-100 text-rose-900 border-rose-300"
              : "bg-stone-100 text-stone-500 border-stone-200"
          }`}
        >
          {currentStatus === "done" ? (
            <>
              <CheckCircle2 className="size-2.5 text-emerald-700" />
              <span>Done</span>
            </>
          ) : currentStatus === "pending" ? (
            <>
              <Clock className="size-2.5 text-rose-700" />
              <span>Pending</span>
            </>
          ) : (
            <span>None</span>
          )}
        </span>
      </div>

      {isOpen && (
        <div className="space-y-2 text-xs">
          {/* Main Controls: Amount to pay & Status Toggle */}
          <div className="rounded-lg border border-stone-200 bg-white p-2.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Amount to pay */}
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-semibold text-stone-600 shrink-0">
                  Amount to Pay:
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-medium">₹</span>
                  <input
                    type="number"
                    disabled={!canEdit}
                    placeholder="0"
                    value={currentAmount ?? ""}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-28 rounded border border-stone-200 bg-stone-50/50 pl-6 pr-2 py-1 text-xs font-bold text-stone-900 focus:border-rose-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Status Selector Tabs: None | Pending | Done */}
              <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-100 p-0.5">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => handleUpdate({ status: "none" })}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition cursor-pointer disabled:cursor-not-allowed ${
                    currentStatus === "none"
                      ? "bg-white text-stone-700 shadow-2xs border border-stone-200/80"
                      : "text-stone-400 hover:text-stone-700"
                  }`}
                >
                  <span>None</span>
                </button>

                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => handleUpdate({ status: "pending" })}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition cursor-pointer disabled:cursor-not-allowed ${
                    currentStatus === "pending"
                      ? "bg-white text-rose-800 shadow-2xs border border-stone-200/80"
                      : "text-stone-400 hover:text-stone-800"
                  }`}
                >
                  <Clock className="size-2.5 text-rose-600" />
                  <span>Pending</span>
                </button>

                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => handleUpdate({ status: "done" })}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition cursor-pointer disabled:cursor-not-allowed ${
                    currentStatus === "done"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-stone-400 hover:text-stone-800"
                  }`}
                >
                  <CheckCircle2 className="size-2.5 text-white" />
                  <span>Done</span>
                </button>
              </div>
            </div>

            {/* Optional Note / Payee line */}
            <div className="border-t border-stone-100 pt-1.5">
              <input
                type="text"
                disabled={!canEdit}
                placeholder="Payee or vendor note (optional)..."
                value={currentNotes}
                onChange={(e) => handleUpdate({ notes: e.target.value || undefined })}
                className="w-full text-[11px] text-stone-600 bg-transparent border-none p-0 focus:outline-none placeholder-stone-400 font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
