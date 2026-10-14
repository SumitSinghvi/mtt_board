import { useState } from "react"
import {
  IndianRupee,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
} from "lucide-react"
import {
  type PaymentTracking,
  type PaymentInstallment,
  getPaymentSummary,
  normalizeInstallments,
} from "../../schemas/board"

interface CardPaymentSectionProps {
  paymentTracking?: PaymentTracking
  fallbackTotal?: number
  canEdit?: boolean
  onChange: (updated: PaymentTracking) => void
  onSyncTotalAmount?: (amount: number | undefined) => void
}

export function CardPaymentSection({
  paymentTracking,
  fallbackTotal,
  canEdit = true,
  onChange,
  onSyncTotalAmount,
}: CardPaymentSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({})

  const summary = getPaymentSummary(paymentTracking, fallbackTotal)
  const currentTotal = paymentTracking?.totalAmount ?? fallbackTotal

  // Existing or normalized installments. Default to 1 empty installment if none exist.
  const rawInstallments = normalizeInstallments(paymentTracking)
  const installments: PaymentInstallment[] =
    rawInstallments.length > 0
      ? rawInstallments
      : [
          {
            id: "inst-1",
          },
        ]

  const handleUpdateTotal = (val: string) => {
    const num = val === "" ? undefined : Number(val)
    const next: PaymentTracking = {
      ...(paymentTracking || {}),
      totalAmount: num,
      installments,
    }
    onChange(next)
    if (onSyncTotalAmount) onSyncTotalAmount(num)
  }

  const handleUpdateInstallment = (id: string, updates: Partial<PaymentInstallment>) => {
    const updated = installments.map((inst) =>
      inst.id === id ? { ...inst, ...updates } : inst
    )
    onChange({
      ...(paymentTracking || {}),
      totalAmount: currentTotal,
      installments: updated,
    })
  }

  const handleAddInstallment = () => {
    const newInst: PaymentInstallment = {
      id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      amount: undefined, // blank - user types whatever was received
    }

    onChange({
      ...(paymentTracking || {}),
      totalAmount: currentTotal,
      installments: [...installments, newInst],
    })
  }

  const handleRemoveInstallment = (id: string) => {
    if (installments.length <= 1) {
      handleUpdateInstallment(id, { amount: undefined, receivedDate: undefined, notes: undefined })
      return
    }
    const filtered = installments.filter((inst) => inst.id !== id)
    onChange({
      ...(paymentTracking || {}),
      totalAmount: currentTotal,
      installments: filtered,
    })
  }

  const pctPaid =
    summary.total > 0
      ? Math.min(100, Math.round((summary.received / summary.total) * 100))
      : 0

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
          <IndianRupee className="size-3.5 text-emerald-600" />
          <span>Payment Tracker</span>
        </button>

        {/* Compact Status Pill */}
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
            summary.isFullyPaid
              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
              : summary.isPartiallyPaid
              ? "bg-amber-100 text-amber-900 border-amber-300"
              : "bg-stone-200 text-stone-600 border-stone-300"
          }`}
        >
          {summary.isFullyPaid ? (
            <>
              <CheckCircle2 className="size-2.5 text-emerald-700" />
              <span>Paid Full</span>
            </>
          ) : summary.isPartiallyPaid ? (
            <>
              <Clock className="size-2.5 text-amber-700" />
              <span>₹{summary.received.toLocaleString("en-IN")} Recv</span>
            </>
          ) : (
            <span>Unpaid</span>
          )}
        </span>
      </div>

      {isOpen && (
        <div className="space-y-2 text-xs">
          {/* Compact Total & Balance Strip */}
          <div className="rounded-lg border border-stone-200 bg-white p-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] font-semibold text-stone-500 shrink-0">Package:</span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-medium">₹</span>
                  <input
                    type="number"
                    disabled={!canEdit}
                    placeholder="0"
                    value={currentTotal ?? ""}
                    onChange={(e) => handleUpdateTotal(e.target.value)}
                    className="w-24 rounded border border-stone-200 bg-stone-50/50 pl-5 pr-1.5 py-0.5 text-xs font-bold text-stone-900 focus:border-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Received & Pending stats inline */}
              <div className="flex items-center gap-2 text-[11px] shrink-0 font-medium">
                <span title="Total Received">
                  Recv: <strong className="text-emerald-700">₹{summary.received.toLocaleString("en-IN")}</strong>
                </span>
                <span className="text-stone-300">•</span>
                <span title="Pending Balance">
                  Due:{" "}
                  <strong className={summary.pending > 0 ? "text-amber-800" : "text-stone-400"}>
                    ₹{summary.pending.toLocaleString("en-IN")}
                  </strong>
                </span>
              </div>
            </div>

            {/* 2px Slim Progress Line */}
            {summary.total > 0 && (
              <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    summary.isFullyPaid ? "bg-emerald-600" : "bg-amber-500"
                  }`}
                  style={{ width: `${pctPaid}%` }}
                />
              </div>
            )}
          </div>

          {/* Progressive Dynamic Rows */}
          <div className="space-y-1.5">
            {/* Table Header Labels */}
            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1">
              <div className="col-span-3">#</div>
              <div className="col-span-4">Amount (₹)</div>
              <div className="col-span-4">Date Recv</div>
              <div className="col-span-1 text-right"></div>
            </div>

            {installments.map((inst, index) => {
              const hasAmount = inst.amount !== undefined && inst.amount > 0
              const isReceived = hasAmount && Boolean(inst.receivedDate)
              const showNote = openNotes[inst.id] || Boolean(inst.notes)

              return (
                <div
                  key={inst.id}
                  className={`rounded-lg border px-2.5 py-1.5 transition ${
                    isReceived
                      ? "border-emerald-200/90 bg-emerald-50/30"
                      : hasAmount
                      ? "border-amber-200/90 bg-amber-50/30"
                      : "border-stone-200/90 bg-white"
                  }`}
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Simple Row Label */}
                    <div className="col-span-3 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`size-1.5 rounded-full shrink-0 ${
                            isReceived ? "bg-emerald-500" : hasAmount ? "bg-amber-500" : "bg-stone-300"
                          }`}
                        />
                        <span className="text-[11px] font-semibold text-stone-700 truncate">
                          Payment {index + 1}
                        </span>
                      </div>
                    </div>

                    {/* Amount Input */}
                    <div className="col-span-4 relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 text-[10px]">₹</span>
                      <input
                        type="number"
                        disabled={!canEdit}
                        placeholder="0"
                        value={inst.amount ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? undefined : Number(e.target.value)
                          handleUpdateInstallment(inst.id, { amount: val })
                        }}
                        className="w-full rounded border border-stone-200 bg-white pl-5 pr-1.5 py-1 text-xs font-semibold text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-stone-100"
                      />
                    </div>

                    {/* Date Input */}
                    <div className="col-span-4">
                      <input
                        type="date"
                        disabled={!canEdit}
                        value={inst.receivedDate || ""}
                        onChange={(e) =>
                          handleUpdateInstallment(inst.id, { receivedDate: e.target.value || undefined })
                        }
                        className="w-full rounded border border-stone-200 bg-white px-1.5 py-1 text-xs text-stone-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-stone-100"
                      />
                    </div>

                    {/* Delete action button */}
                    <div className="col-span-1 flex justify-end">
                      {canEdit && installments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveInstallment(inst.id)}
                          title="Remove row"
                          className="p-1 text-stone-300 hover:text-red-500 transition cursor-pointer"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Optional discreet Note / UTR reference line */}
                  {showNote ? (
                    <div className="mt-1 pt-1 border-t border-stone-100 flex items-center gap-1.5">
                      <input
                        type="text"
                        disabled={!canEdit}
                        placeholder="Payment mode / UTR ref (optional)"
                        value={inst.notes || ""}
                        onChange={(e) => handleUpdateInstallment(inst.id, { notes: e.target.value || undefined })}
                        className="w-full text-[10px] text-stone-600 bg-transparent border-none p-0 focus:outline-none placeholder-stone-400 font-mono"
                      />
                    </div>
                  ) : (
                    canEdit && (
                      <div className="mt-0.5 text-right">
                        <button
                          type="button"
                          onClick={() => setOpenNotes((prev) => ({ ...prev, [inst.id]: true }))}
                          className="text-[9px] text-stone-400 hover:text-stone-600 cursor-pointer"
                        >
                          + Ref / Note
                        </button>
                      </div>
                    )
                  )}
                </div>
              )
            })}
          </div>

          {/* Progressive Action: Add Next Payment Row if pending remains */}
          {canEdit && (
            <div>
              {summary.pending > 0 || summary.total === 0 ? (
                <button
                  type="button"
                  onClick={handleAddInstallment}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-dashed border-stone-300 bg-white hover:bg-stone-100/80 text-stone-600 hover:text-stone-900 text-xs font-medium transition cursor-pointer"
                >
                  <Plus className="size-3.5 text-stone-400" />
                  <span>+ Add Payment Row</span>
                </button>
              ) : (
                <div className="flex items-center justify-between px-1 text-[11px] text-emerald-800">
                  <span className="flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    Paid in full
                  </span>
                  <button
                    type="button"
                    onClick={handleAddInstallment}
                    className="text-[10px] text-stone-400 hover:text-stone-700 underline cursor-pointer"
                  >
                    + Add row
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
