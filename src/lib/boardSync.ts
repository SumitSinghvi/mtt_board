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
        await supabase.from("tasks").upsert({
          id: t.id,
          board_id: board.id,
          column_id: col.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          assignee: t.assignee,
          customer_name: t.customerName,
          customer_phone: t.customerPhone,
          customer_email: t.customerEmail,
          amount: t.amount,
          advance_paid: t.advancePaid,
          due_date: t.dueDate,
          travel_start_date: t.travelStartDate,
          travel_end_date: t.travelEndDate,
          pickup_location: t.pickupLocation,
          destination: t.destination,
          vehicle_type: t.vehicleType,
          pax_adults: t.paxAdults,
          pax_kids: t.paxKids,
          position: tIdx,
          checklist: t.checklist || [],
          activities: t.activities || [],
        })
      }
    }
  } catch (err) {
    console.warn("syncBoardToSupabase error:", err)
  }
}
