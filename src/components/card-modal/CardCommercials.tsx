import { IndianRupee } from "lucide-react"
import type { Task } from "../../schemas/board"

interface CardCommercialsProps {
  amount?: number
  advancePaid?: number
  canEdit: boolean
  onChangeField: (field: keyof Task, value: unknown) => void
}

export function CardCommercials({
  amount,
  advancePaid,
  canEdit,
  onChangeField,
}: CardCommercialsProps) {
  const totalAmount = amount || 0
  const advance = advancePaid || 0
  const balanceDue = Math.max(0, totalAmount - advance)

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3.5 shadow-2xs">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-600">
        <IndianRupee className="size-3.5 text-emerald-600" />
        <span>Commercials & Billing</span>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
          Total Quote Amount (₹)
        </label>
        <input
          type="number"
          min={0}
          disabled={!canEdit}
          placeholder="0"
          value={amount ?? ""}
          onChange={(e) =>
            onChangeField("amount", e.target.value ? Number(e.target.value) : undefined)
          }
          className="w-full rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
          Advance Collected (₹)
        </label>
        <input
          type="number"
          min={0}
          disabled={!canEdit}
          placeholder="0"
          value={advancePaid ?? ""}
          onChange={(e) =>
            onChangeField(
              "advancePaid",
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          className="w-full rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 focus:border-amber-500 focus:bg-white focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
        />
      </div>

      {/* Balance Calculated */}
      <div className="rounded-lg bg-stone-50 border border-stone-100 p-2.5 flex items-center justify-between">
        <span className="text-xs font-medium text-stone-600">Balance Pending:</span>
        <span
          className={`text-sm font-bold ${
            balanceDue > 0 ? "text-amber-700" : "text-emerald-700"
          }`}
        >
          ₹{balanceDue.toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  )
}
