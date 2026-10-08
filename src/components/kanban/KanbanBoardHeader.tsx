import { LayoutGrid, BarChart2, Calendar, Sliders } from "lucide-react"

interface KanbanBoardHeaderProps {
  boardTitle: string
  boardDescription?: string
  activeView: "board" | "dashboard" | "calendar"
  onViewChange: (view: "board" | "dashboard" | "calendar") => void
  onOpenSettings: () => void
}

export function KanbanBoardHeader({
  boardTitle,
  boardDescription,
  activeView,
  onViewChange,
  onOpenSettings,
}: KanbanBoardHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-6 py-3.5">
      <div>
        <h1 className="text-lg font-bold text-stone-900 tracking-tight">{boardTitle}</h1>
        {boardDescription && <p className="text-xs text-stone-500 mt-0.5">{boardDescription}</p>}
      </div>

      {/* Center: View Switcher */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-stone-200 bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => onViewChange("board")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
              activeView === "board"
                ? "bg-white text-stone-900 shadow-2xs border border-stone-200/70"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <LayoutGrid className="size-3.5 text-amber-700" />
            <span>Board</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange("dashboard")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
              activeView === "dashboard"
                ? "bg-white text-stone-900 shadow-2xs border border-stone-200/70"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <BarChart2 className="size-3.5 text-amber-700" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
              activeView === "calendar"
                ? "bg-white text-stone-900 shadow-2xs border border-stone-200/70"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Calendar className="size-3.5 text-amber-700" />
            <span>Calendar</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          title="Board Modules & Settings"
          onClick={onOpenSettings}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 transition"
        >
          <Sliders className="size-3.5 text-amber-700" />
          <span>Modules</span>
        </button>
      </div>
    </div>
  )
}
