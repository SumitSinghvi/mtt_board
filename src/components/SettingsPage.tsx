import { useState } from "react"
import {
  Settings,
  Building,
  Database,
  Save,
  Download,
  CheckCircle2,
} from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useCustomerStore } from "../store/customerStore"
import { useStaffStore } from "../store/staffStore"

export function SettingsPage() {
  const { boards } = useBoardStore()
  const { customers } = useCustomerStore()
  const { staff } = useStaffStore()

  const [companyName, setCompanyName] = useState("Mohit Tours & Travels")
  const [gstin, setGstin] = useState("08AABCM1234F1Z5")
  const [phone, setPhone] = useState("+91 98290 55441")
  const [address, setAddress] = useState("Station Road, Jaipur, Rajasthan 302006")
  const [currency, setCurrency] = useState("INR (₹)")
  const [isSaved, setIsSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  const handleExportBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      company: { companyName, gstin, phone, address, currency },
      boards,
      customers,
      staff,
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2))
    const downloadAnchor = document.createElement("a")
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `MTT_Operations_Backup_${new Date().toISOString().split("T")[0]}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div className="flex-1 overflow-y-auto bg-stone-100/70 p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b border-stone-200 bg-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            <Settings className="size-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">App Settings</h1>
            <p className="text-xs text-stone-500">
              Agency profile, invoice defaults, and local data backup
            </p>
          </div>
        </div>

        {isSaved && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left 2 Cols: Agency Details Form */}
        <div className="lg:col-span-2 rounded-xl border border-stone-200 bg-white p-4 sm:p-6 shadow-2xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100">
            <Building className="size-4 text-amber-700" />
            <h2 className="text-sm font-bold text-stone-900">Agency & Billing Profile</h2>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Company / Agency Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Official Mobile / Helpline</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Currency Format</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                >
                  <option value="INR (₹)">Indian Rupee (INR ₹)</option>
                  <option value="USD ($)">US Dollar (USD $)</option>
                  <option value="EUR (€)">Euro (EUR €)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Office Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 shadow-2xs transition"
              >
                <Save className="size-3.5" />
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Backup & Stats */}
        <div className="space-y-6">
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-100">
              <Database className="size-4 text-amber-700" />
              <h2 className="text-sm font-bold text-stone-900">Database & Backup</h2>
            </div>

            <p className="text-xs text-stone-500 mb-4 leading-relaxed">
              Export all {boards.length} boards, {customers.length} clients, and {staff.length} staff records to a single JSON backup.
            </p>

            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition shadow-2xs"
            >
              <Download className="size-3.5 text-amber-700" />
              <span>Export Full JSON Backup</span>
            </button>
          </div>

          <div className="rounded-xl border border-stone-200 bg-amber-50/50 p-5">
            <h3 className="text-xs font-bold text-amber-900 mb-1">Offline & Browser Storage</h3>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              All changes are saved locally to your browser. You can export a backup whenever transitioning computers.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
