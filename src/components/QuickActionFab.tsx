import { useState, useRef, useEffect, useMemo } from "react"
import { Plus, Bell, CheckSquare, Kanban, X } from "lucide-react"
import { useBoardStore } from "../store/boardStore"
import { useAuthStore } from "../store/authStore"
import { isBoardAllowed } from "../lib/permissions"
import { ScheduleReminderModal } from "./ScheduleReminderModal"
import { NewNoteModal } from "./NewNoteModal"
import { NewCardModal } from "./NewCardModal"

export function QuickActionFab() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<"reminder" | "notes" | "card" | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { boards, addReminderToTask, addGeneralReminder } = useBoardStore()
  const { profile } = useAuthStore()

  // Click outside to close menu
  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [menuOpen])

  // Flatten active non-archived boards and tasks
  const activeBoards = useMemo(() => {
    return boards.filter((b) => !b.isArchived && isBoardAllowed(b, profile))
  }, [boards, profile])

  const allFlattenedTasks = useMemo(() => {
    return activeBoards.flatMap((b) =>
      b.columns.flatMap((c) =>
        c.tasks.map((t) => ({
          boardId: b.id,
          boardTitle: b.title,
          columnId: c.id,
          columnTitle: c.title,
          task: t,
        }))
      )
    )
  }, [activeBoards])

  const handleSelectOption = (option: "reminder" | "notes" | "card") => {
    setMenuOpen(false)
    setActiveModal(option)
  }

  return (
    <>
      {/* Floating Action Button Container */}
      <div ref={containerRef} className="fixed bottom-6 right-6 z-40 sm:bottom-7 sm:right-7 select-none">
        {/* Popover Menu */}
        {menuOpen && (
          <div className="absolute bottom-16 right-0 mb-2 w-64 rounded-2xl border border-stone-200/90 bg-white/95 p-2 shadow-2xl backdrop-blur-md animate-in fade-in-50 zoom-in-95 slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 px-3 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Quick Create
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="mt-1 space-y-1">
              {/* Option 1: Reminder */}
              <button
                type="button"
                onClick={() => handleSelectOption("reminder")}
                className="w-full flex items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-amber-50/80 group cursor-pointer"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 transition group-hover:bg-amber-600 group-hover:text-white">
                  <Bell className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-amber-700">1)</span>
                    <span className="text-xs font-bold text-stone-800 group-hover:text-amber-900">
                      Reminder
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 line-clamp-1">
                    Schedule task or general reminder
                  </p>
                </div>
              </button>

              {/* Option 2: Notes */}
              <button
                type="button"
                onClick={() => handleSelectOption("notes")}
                className="w-full flex items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-amber-50/80 group cursor-pointer"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 transition group-hover:bg-amber-600 group-hover:text-white">
                  <CheckSquare className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-amber-700">2)</span>
                    <span className="text-xs font-bold text-stone-800 group-hover:text-amber-900">
                      Notes
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 line-clamp-1">
                    Add private note or checklist
                  </p>
                </div>
              </button>

              {/* Option 3: Card */}
              <button
                type="button"
                onClick={() => handleSelectOption("card")}
                className="w-full flex items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-amber-50/80 group cursor-pointer"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 transition group-hover:bg-amber-600 group-hover:text-white">
                  <Kanban className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-amber-700">3)</span>
                    <span className="text-xs font-bold text-stone-800 group-hover:text-amber-900">
                      Card
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 line-clamp-1">
                    Create lead or trip card on board
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Floating Circular Plus Button */}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          title="Create New (Reminder, Notes, Card)"
          className="flex size-14 items-center justify-center rounded-full bg-amber-600 text-white shadow-xl shadow-amber-900/25 ring-4 ring-amber-600/15 transition-all duration-200 hover:bg-amber-700 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
        >
          <Plus
            className={`size-6 transition-transform duration-200 ${
              menuOpen ? "rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* 1) Reminder Modal */}
      {activeModal === "reminder" && (
        <ScheduleReminderModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          boards={activeBoards}
          tasks={allFlattenedTasks}
          onSaveReminder={(boardId, columnId, taskId, reminder) => {
            if (boardId && columnId && taskId) {
              addReminderToTask(boardId, columnId, taskId, reminder)
            } else {
              addGeneralReminder(reminder)
            }
          }}
        />
      )}

      {/* 2) Notes Modal */}
      {activeModal === "notes" && (
        <NewNoteModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 3) Card Modal */}
      {activeModal === "card" && (
        <NewCardModal
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  )
}
