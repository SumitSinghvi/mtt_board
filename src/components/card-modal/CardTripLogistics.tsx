import { MapPin, Calendar, Car, Users } from "lucide-react"
import type { Task } from "../../schemas/board"

interface CardTripLogisticsProps {
  pickupLocation?: string
  destination?: string
  travelStartDate?: string
  travelEndDate?: string
  vehicleType?: string
  paxAdults?: number
  paxKids?: number
  onChangeField: (field: keyof Task, value: unknown) => void
}

export function CardTripLogistics({
  pickupLocation,
  destination,
  travelStartDate,
  travelEndDate,
  vehicleType,
  paxAdults,
  paxKids,
  onChangeField,
}: CardTripLogisticsProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3.5 animate-in fade-in-50">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-600">
        <MapPin className="size-3.5 text-amber-600" />
        <span>Trip & Route Logistics</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-stone-600 mb-1">
            Pickup Location
          </label>
          <input
            type="text"
            placeholder="e.g. Jaipur Airport, Hotel Jai Mahal"
            value={pickupLocation || ""}
            onChange={(e) => onChangeField("pickupLocation", e.target.value)}
            className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-stone-600 mb-1">
            Destination / Circuit
          </label>
          <input
            type="text"
            placeholder="e.g. Udaipur, Jodhpur, Ranthambore"
            value={destination || ""}
            onChange={(e) => onChangeField("destination", e.target.value)}
            className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
            <Calendar className="size-3 text-stone-400" />
            Travel Start Date
          </label>
          <input
            type="date"
            value={travelStartDate || ""}
            onChange={(e) => onChangeField("travelStartDate", e.target.value)}
            className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
            <Calendar className="size-3 text-stone-400" />
            Travel End / Return Date
          </label>
          <input
            type="date"
            value={travelEndDate || ""}
            onChange={(e) => onChangeField("travelEndDate", e.target.value)}
            className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div>
          <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
            <Car className="size-3 text-stone-400" />
            Vehicle Assigned
          </label>
          <input
            type="text"
            placeholder="e.g. Innova Crysta, Tempo 17s"
            value={vehicleType || ""}
            onChange={(e) => onChangeField("vehicleType", e.target.value)}
            className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-stone-600 mb-1 flex items-center gap-1">
            <Users className="size-3 text-stone-400" />
            Adults
          </label>
          <input
            type="number"
            min={0}
            placeholder="0"
            value={paxAdults ?? ""}
            onChange={(e) =>
              onChangeField("paxAdults", e.target.value ? Number(e.target.value) : undefined)
            }
            className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-stone-600 mb-1">
            Kids
          </label>
          <input
            type="number"
            min={0}
            placeholder="0"
            value={paxKids ?? ""}
            onChange={(e) =>
              onChangeField("paxKids", e.target.value ? Number(e.target.value) : undefined)
            }
            className="w-full rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}
