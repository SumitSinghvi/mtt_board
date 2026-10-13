import { useState, useId } from "react"
import { ArrowRightLeft, X, Check } from "lucide-react"
import { useBoardStore } from "../../store/boardStore"
import { useAuthStore } from "../../store/authStore"
import { getAllowedBoards } from "../../lib/permissions"
import type { Task, Board } from "../../schemas/board"

interface MoveCardModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task
  sourceBoard: Board
  sourceColumnId: string
  onMoveSuccess?: (targetBoardId: string, targetColId: string, switchBoard: boolean) => void
}

export function MoveCardModal({
  isOpen,
  onClose,
  task,
  sourceBoard,
  sourceColumnId,
  onMoveSuccess,
}: MoveCardModalProps) {
  const { boards, moveTaskToBoard, setActiveBoardId } = useBoardStore()
  const { profile } = useAuthStore()

  // Allowed destination boards: non-archived and not the current board
  const allowedBoards = getAllowedBoards(boards, profile).filter((b) => !b.isArchived)
  const targetBoards = allowedBoards.filter((b) => b.id !== sourceBoard.id)

  const sourceCol = sourceBoard.columns.find((c) => c.id === sourceColumnId)

  // Default to first other board
  const [selectedBoardId, setSelectedBoardId] = useState<string>(() => targetBoards[0]?.id || "")

  const activeTargetBoard = targetBoards.find((b) => b.id === selectedBoardId) || targetBoards[0]

  // Find smart default column (matching title or first column)
  const getSmartDefaultColId = (board?: Board): string => {
    if (!board || board.columns.length === 0) return ""
    if (sourceCol) {
      const match = board.columns.find(
        (c) => c.title.toLowerCase().trim() === sourceCol.title.toLowerCase().trim()
      )
      if (match) return match.id
    }
    return board.columns[0].id
  }

  const [selectedColId, setSelectedColId] = useState<string>(() =>
    getSmartDefaultColId(activeTargetBoard)
  )
  const [position, setPosition] = useState<"top" | "bottom">("top")
  const [switchBoard, setSwitchBoard] = useState(false)

  const boardSelectId = useId()
  const colSelectId = useId()
  const posSelectId = useId()
  const switchBoardId = useId()

  if (!isOpen) return null

  const handleBoardChange = (newBoardId: string) => {
    setSelectedBoardId(newBoardId)
    const newBoard = targetBoards.find((b) => b.id === newBoardId)
    setSelectedColId(getSmartDefaultColId(newBoard))
  }

  const handleConfirmMove = () => {
    if (!activeTargetBoard) return
    const targetCol = activeTargetBoard.columns.find((c) => c.id === selectedColId) || activeTargetBoard.columns[0]
    if (!targetCol) return

    const targetIndex = position === "bottom" ? targetCol.tasks.length : 0

    moveTaskToBoard(
      sourceBoard.id,
      sourceColumnId,
      activeTargetBoard.id,
      targetCol.id,
      task.id,
      targetIndex
    )

    if (switchBoard) {
      setActiveBoardId(activeTargetBoard.id)
    }

    onMoveSuccess?.(activeTargetBoard.id, targetCol.id, switchBoard)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 animate-in fade-in-50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl space-y-4 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              <ArrowRightLeft className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Move Card to Another Board</h3>
              <p className="text-[11px] text-stone-500">Transfer this card and all its history</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Card Details Card */}
        <div className="rounded-xl border border-stone-200/80 bg-stone-50/80 p-3 text-xs space-y-1">
          <div className="font-semibold text-stone-900 truncate">{task.title}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
            <span>Current:</span>
            <span className="font-medium text-stone-700">{sourceBoard.title}</span>
            <span>&bull;</span>
            <span className="text-stone-600">{sourceCol?.title || "Unknown column"}</span>
          </div>
        </div>

        {targetBoards.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-center text-xs text-amber-800">
            No other accessible active boards are currently available to receive this card.
          </div>
        ) : (
          <div className="space-y-3.5 text-xs">
            {/* Target Board */}
            <div>
              <label htmlFor={boardSelectId} className="block text-[11px] font-semibold text-stone-600 mb-1">
                Destination Board
              </label>
              <select
                id={boardSelectId}
                value={activeTargetBoard?.id || ""}
                onChange={(e) => handleBoardChange(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs font-semibold text-stone-800 focus:border-amber-500 focus:outline-none"
              >
                {targetBoards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.columns.length} columns)
                  </option>
                ))}
              </select>
            </div>

            {/* Target Column */}
            <div>
              <label htmlFor={colSelectId} className="block text-[11px] font-semibold text-stone-600 mb-1">
                Destination Column / Stage
              </label>
              {activeTargetBoard && activeTargetBoard.columns.length > 0 ? (
                <select
                  id={colSelectId}
                  value={selectedColId}
                  onChange={(e) => setSelectedColId(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs font-semibold text-stone-800 focus:border-amber-500 focus:outline-none"
                >
                  {activeTargetBoard.columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title} ({col.tasks.length} cards)
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
                  This board has no columns. Please create a column on it first.
                </div>
              )}
            </div>

            {/* Position */}
            <div>
              <label htmlFor={posSelectId} className="block text-[11px] font-semibold text-stone-600 mb-1">
                Position in Column
              </label>
              <select
                id={posSelectId}
                value={position}
                onChange={(e) => setPosition(e.target.value as "top" | "bottom")}
                className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs font-medium text-stone-700 focus:border-amber-500 focus:outline-none"
              >
                <option value="top">Top of column (First position)</option>
                <option value="bottom">Bottom of column (Last position)</option>
              </select>
            </div>

            {/* Switch Board Checkbox */}
            <div className="pt-1">
              <label htmlFor={switchBoardId} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id={switchBoardId}
                  type="checkbox"
                  checked={switchBoard}
                  onChange={(e) => setSwitchBoard(e.target.checked)}
                  className="size-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-[11px] font-medium text-stone-700">
                  Switch to destination board after moving
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 transition"
          >
            Cancel
          </button>
          {targetBoards.length > 0 && (
            <button
              type="button"
              disabled={!activeTargetBoard || activeTargetBoard.columns.length === 0}
              onClick={handleConfirmMove}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="size-3.5" />
              <span>Move Card</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
