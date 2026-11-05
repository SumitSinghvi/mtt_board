// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("../lib/supabase", () => ({ supabase: {}, fetchAllRows: vi.fn() }))
vi.mock("../lib/boardSync", () => {
  const ok = () => vi.fn(() => Promise.resolve())
  return {
    fetchBoardsFromSupabase: vi.fn(),
    fetchGeneralRemindersFromSupabase: vi.fn(() => Promise.resolve([])),
    syncBoardToSupabase: ok(),
    syncBoardModulesToSupabase: ok(),
    seedInitialBoardToSupabase: ok(),
    flushTaskSync: ok(),
    syncTaskToSupabase: ok(),
    syncTaskPositionsToSupabase: ok(),
    deleteTaskFromSupabase: vi.fn(() => Promise.resolve(true)),
    deleteBoardFromSupabase: ok(),
    syncColumnToSupabase: ok(),
    deleteColumnFromSupabase: ok(),
    archiveBoardInSupabase: ok(),
    reorderBoardsInSupabase: ok(),
    syncGeneralReminderToSupabase: ok(),
    deleteGeneralReminderFromSupabase: ok(),
  }
})

const sync = await import("../lib/boardSync")
const { useBoardStore } = await import("./boardStore")
const { initialBoards } = await import("./initialBoards")

const store = () => useBoardStore.getState()
const board = () => store().boards[0]

beforeEach(() => {
  vi.clearAllMocks()
  useBoardStore.setState({ boards: structuredClone(initialBoards), activeBoardId: initialBoards[0].id })
})

describe("fetchBoardsFromSupabase (seeding guard, C1)", () => {
  it("keeps local boards and never seeds when the fetch fails", async () => {
    vi.mocked(sync.fetchBoardsFromSupabase).mockRejectedValueOnce(new Error("JWT expired"))
    const before = store().boards
    await store().fetchBoardsFromSupabase()
    expect(sync.seedInitialBoardToSupabase).not.toHaveBeenCalled()
    expect(store().boards).toBe(before)
    expect(store().loading).toBe(false)
  })

  it("seeds only when the DB is confirmed empty", async () => {
    vi.mocked(sync.fetchBoardsFromSupabase).mockResolvedValueOnce([])
    await store().fetchBoardsFromSupabase()
    expect(sync.seedInitialBoardToSupabase).toHaveBeenCalledTimes(initialBoards.length)
  })

  it("replaces local boards with remote boards without seeding", async () => {
    const remote = [{ ...structuredClone(initialBoards[0]), id: "remote-1", title: "Remote" }]
    vi.mocked(sync.fetchBoardsFromSupabase).mockResolvedValueOnce(remote)
    await store().fetchBoardsFromSupabase()
    expect(sync.seedInitialBoardToSupabase).not.toHaveBeenCalled()
    expect(store().boards.map((b) => b.id)).toEqual(["remote-1"])
    expect(store().activeBoardId).toBe("remote-1")
  })
})

describe("task positions (C3)", () => {
  it("updateTask sends the task's real index, not 0", () => {
    const col = board().columns.find((c) => c.tasks.length >= 2)!
    const second = col.tasks[1]
    store().updateTask(board().id, col.id, second.id, { title: "Edited" })
    expect(sync.syncTaskToSupabase).toHaveBeenCalledWith(
      board().id, col.id, expect.objectContaining({ id: second.id, title: "Edited" }), 1, false
    )
  })

  it("moveTask without targetIndex appends locally and persists that same index + sibling order", () => {
    const [src, dst] = board().columns
    const task = src.tasks[0]
    store().moveTask(board().id, src.id, dst.id, task.id)

    const dstAfter = board().columns.find((c) => c.id === dst.id)!
    const srcAfter = board().columns.find((c) => c.id === src.id)!
    const lastIdx = dstAfter.tasks.length - 1
    expect(dstAfter.tasks[lastIdx].id).toBe(task.id)
    expect(sync.syncTaskToSupabase).toHaveBeenCalledWith(board().id, dst.id, expect.objectContaining({ id: task.id }), lastIdx)
    expect(sync.syncTaskPositionsToSupabase).toHaveBeenCalledWith(board().id, dst.id, dstAfter.tasks.map((t) => t.id))
    expect(sync.syncTaskPositionsToSupabase).toHaveBeenCalledWith(board().id, src.id, srcAfter.tasks.map((t) => t.id))
  })

  it("addTask prepends and rewrites sibling positions", () => {
    const col = board().columns[0]
    const oldIds = col.tasks.map((t) => t.id)
    store().addTask(board().id, col.id, { title: "New", priority: "medium" })
    const ids = vi.mocked(sync.syncTaskPositionsToSupabase).mock.calls[0][2]
    expect(ids.slice(1)).toEqual(oldIds)
    expect(ids[0]).toMatch(/^task-/)
  })

  it("moveTaskToBoard persists order of both source and target columns", () => {
    const targetId = store().createBoard("Target")
    vi.clearAllMocks()
    const src = board().columns[0]
    const task = src.tasks[0]
    const target = store().boards.find((b) => b.id === targetId)!
    store().moveTaskToBoard(board().id, src.id, targetId, target.columns[0].id, task.id)
    expect(sync.syncTaskToSupabase).toHaveBeenCalledWith(targetId, target.columns[0].id, expect.objectContaining({ id: task.id }), 0, true)
    expect(sync.syncTaskPositionsToSupabase).toHaveBeenCalledWith(targetId, target.columns[0].id, [task.id])
    expect(sync.syncTaskPositionsToSupabase).toHaveBeenCalledWith(board().id, src.id, expect.not.arrayContaining([task.id]))
  })
})

describe("columns (H1)", () => {
  it("moveColumn persists every column's new position", () => {
    const ids = board().columns.map((c) => c.id)
    store().moveColumn(board().id, 0, ids.length - 1)
    const expected = [...ids.slice(1), ids[0]]
    expected.forEach((id, idx) => {
      expect(sync.syncColumnToSupabase).toHaveBeenCalledWith(board().id, id, expect.any(String), idx)
    })
  })

  it("updateColumnTitle keeps the column's position", () => {
    const col = board().columns[1]
    store().updateColumnTitle(board().id, col.id, "Renamed")
    expect(sync.syncColumnToSupabase).toHaveBeenCalledWith(board().id, col.id, "Renamed", 1)
  })

  it("createBoard saves its default columns after the board row", async () => {
    const id = store().createBoard("Fresh")
    expect(sync.syncBoardToSupabase).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(sync.syncColumnToSupabase).toHaveBeenCalledTimes(3))
    ;[0, 1, 2].forEach((idx) =>
      expect(sync.syncColumnToSupabase).toHaveBeenCalledWith(id, expect.any(String), expect.any(String), idx)
    )
  })
})

describe("debounced persistence (P1)", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const persistWrites = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.filter(([key]) => key === "mtt-boards-storage").length

  it("coalesces a burst of edits into one localStorage write", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem")
    const col = board().columns[0]
    const task = col.tasks[0]
    for (let i = 0; i < 25; i++) store().updateTask(board().id, col.id, task.id, { title: `typing ${i}` })
    expect(persistWrites(spy)).toBe(0)
    vi.advanceTimersByTime(1000)
    expect(persistWrites(spy)).toBe(1)
    const saved = JSON.parse(localStorage.getItem("mtt-boards-storage")!)
    expect(saved.state.boards[0].columns[0].tasks[0].title).toBe("typing 24")
    spy.mockRestore()
  })

  it("flushes immediately when the page is hidden", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem")
    const col = board().columns[0]
    store().updateTask(board().id, col.id, col.tasks[0].id, { title: "before hide" })
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })
    document.dispatchEvent(new Event("visibilitychange"))
    expect(persistWrites(spy)).toBe(1)
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
    spy.mockRestore()
  })
})
