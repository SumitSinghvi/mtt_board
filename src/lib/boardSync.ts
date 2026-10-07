import { supabase } from "../lib/supabase"
import type { Board, Column, Task } from "../schemas/board"

export async function fetchBoardsFromSupabase(): Promise<Board[]> {
  try {
    const { data: boardsData, error: boardsErr } = await supabase
      .from("boards")
      .select("*")
      .order("created_at", { ascending: true })

    if (boardsErr || !boardsData || boardsData.length === 0) {
      return []
    }

    const { data: colsData, error: colsErr } = await supabase
      .from("columns")
      .select("*")
      .order("position", { ascending: true })

    if (colsErr) {
      console.warn("colsErr:", colsErr.message)
    }

    const { data: tasksData, error: tasksErr } = await supabase
      .from("tasks")
      .select("*")
      .order("position", { ascending: true })

    if (tasksErr) {
      console.warn("tasksErr:", tasksErr.message)
    }

    const tasksMap = new Map<string, Task[]>()
    ;(tasksData || []).forEach((row) => {
      const task: Task = {
        id: row.id,
        title: row.title,
        description: row.description || undefined,
        priority: row.priority || "medium",
        assignee: row.assignee || undefined,
        customerName: row.customer_name || undefined,
        customerPhone: row.customer_phone || undefined,
        customerEmail: row.customer_email || undefined,
        amount: row.amount ? Number(row.amount) : undefined,
        advancePaid: row.advance_paid ? Number(row.advance_paid) : undefined,
        dueDate: row.due_date || undefined,
        travelStartDate: row.travel_start_date || undefined,
        travelEndDate: row.travel_end_date || undefined,
        pickupLocation: row.pickup_location || undefined,
        destination: row.destination || undefined,
        vehicleType: row.vehicle_type || undefined,
        paxAdults: row.pax_adults !== null ? Number(row.pax_adults) : undefined,
        paxKids: row.pax_kids !== null ? Number(row.pax_kids) : undefined,
        checklist: Array.isArray(row.checklist) ? row.checklist : [],
        activities: Array.isArray(row.activities) ? row.activities : [],
        createdAt: row.created_at || new Date().toISOString(),
      }
      const existing = tasksMap.get(row.column_id) || []
      existing.push(task)
      tasksMap.set(row.column_id, existing)
    })

    const colsMap = new Map<string, Column[]>()
    ;(colsData || []).forEach((cRow) => {
      const col: Column = {
        id: cRow.id,
        title: cRow.title,
        tasks: tasksMap.get(cRow.id) || [],
      }
      const existing = colsMap.get(cRow.board_id) || []
      existing.push(col)
      colsMap.set(cRow.board_id, existing)
    })

    return boardsData.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description || undefined,
      icon: b.icon || "clipboard-list",
      modules: b.modules || {
        clientContact: true,
        tripLogistics: false,
        commercials: false,
        subtasks: true,
      },
      columns: colsMap.get(b.id) || [],
      createdAt: b.created_at || new Date().toISOString(),
    }))
  } catch (err) {
    console.warn("fetchBoardsFromSupabase error:", err)
    return []
  }
}

export async function syncBoardToSupabase(board: Board): Promise<void> {
  try {
    await supabase.from("boards").upsert({
      id: board.id,
      title: board.title,
      description: board.description,
      icon: board.icon,
      modules: board.modules,
    })

    for (let cIdx = 0; cIdx < board.columns.length; cIdx++) {
      const col = board.columns[cIdx]
      await supabase.from("columns").upsert({
        id: col.id,
        board_id: board.id,
        title: col.title,
        position: cIdx,
      })

      for (let tIdx = 0; tIdx < col.tasks.length; tIdx++) {
        const t = col.tasks[tIdx]
        await syncTaskToSupabase(board.id, col.id, t, tIdx)
      }
    }
  } catch (err) {
    console.warn("syncBoardToSupabase error:", err)
  }
}

export async function syncTaskToSupabase(
  boardId: string,
  columnId: string,
  task: Task,
  position = 0
): Promise<void> {
  try {
    await supabase.from("tasks").upsert({
      id: task.id,
      board_id: boardId,
      column_id: columnId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      assignee: task.assignee,
      customer_name: task.customerName,
      customer_phone: task.customerPhone,
      customer_email: task.customerEmail,
      amount: task.amount,
      advance_paid: task.advancePaid,
      due_date: task.dueDate,
      travel_start_date: task.travelStartDate,
      travel_end_date: task.travelEndDate,
      pickup_location: task.pickupLocation,
      destination: task.destination,
      vehicle_type: task.vehicleType,
      pax_adults: task.paxAdults,
      pax_kids: task.paxKids,
      position,
      checklist: task.checklist || [],
      activities: task.activities || [],
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn("syncTaskToSupabase error:", err)
  }
}

export async function deleteTaskFromSupabase(taskId: string): Promise<void> {
  try {
    await supabase.from("tasks").delete().eq("id", taskId)
  } catch (err) {
    console.warn("deleteTaskFromSupabase error:", err)
  }
}

export async function deleteBoardFromSupabase(boardId: string): Promise<void> {
  try {
    await supabase.from("boards").delete().eq("id", boardId)
  } catch (err) {
    console.warn("deleteBoardFromSupabase error:", err)
  }
}

export async function syncColumnToSupabase(
  boardId: string,
  columnId: string,
  title: string,
  position = 0
): Promise<void> {
  try {
    await supabase.from("columns").upsert({
      id: columnId,
      board_id: boardId,
      title,
      position,
    })
  } catch (err) {
    console.warn("syncColumnToSupabase error:", err)
  }
}

export async function deleteColumnFromSupabase(columnId: string): Promise<void> {
  try {
    await supabase.from("columns").delete().eq("id", columnId)
  } catch (err) {
    console.warn("deleteColumnFromSupabase error:", err)
  }
}
