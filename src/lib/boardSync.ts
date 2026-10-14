import { supabase } from "../lib/supabase"
import type { Board, Column, Task, TaskReminder } from "../schemas/board"

export async function fetchBoardsFromSupabase(): Promise<Board[]> {
  try {
    const { data: boardsData, error: boardsErr } = await supabase
      .from("boards")
      .select("*")
      .order("position", { ascending: true })
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
      const rawAssignees = Array.isArray(row.assignees) ? row.assignees : []
      const fallbackAssignee = row.assignee || undefined
      const assignees = rawAssignees.length > 0 ? rawAssignees : (fallbackAssignee ? [fallbackAssignee] : [])

      const task: Task = {
        id: row.id,
        title: row.title,
        description: row.description || undefined,
        priority: row.priority || "medium",
        assignee: assignees[0] || undefined,
        assignees,
        leader: row.leader || undefined,
        createdBy: row.created_by || undefined,
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
        reminders: Array.isArray(row.reminders) ? row.reminders : [],
        hotelBooking: row.hotel_booking || undefined,
        paymentTracking: row.payment_tracking || undefined,
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

    return boardsData.map((b, idx) => ({
      id: b.id,
      title: b.title,
      description: b.description || undefined,
      icon: b.icon || "clipboard-list",
      modules: {
        clientContact: true,
        subtasks: true,
        hotelBooking: false,
        paymentTracking: false,
        ...(b.modules || {}),
      },
      isArchived: b.is_archived ?? false,
      position: b.position ?? idx,
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
    const { error } = await supabase.from("boards").upsert({
      id: board.id,
      title: board.title,
      description: board.description?.trim() ? board.description.trim() : null,
      icon: board.icon,
      modules: board.modules,
      is_archived: board.isArchived ?? false,
      position: board.position ?? 0,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      console.error("syncBoardToSupabase error:", error.message)
    }
  } catch (err) {
    console.warn("syncBoardToSupabase error:", err)
  }
}

export async function syncBoardModulesToSupabase(boardId: string, modules: any): Promise<void> {
  try {
    const { error } = await supabase
      .from("boards")
      .update({
        modules,
        updated_at: new Date().toISOString(),
      })
      .eq("id", boardId)
    if (error) {
      console.error("syncBoardModulesToSupabase error:", error.message)
    }
  } catch (err) {
    console.warn("syncBoardModulesToSupabase error:", err)
  }
}

export async function seedInitialBoardToSupabase(board: Board): Promise<void> {
  try {
    await supabase.from("boards").upsert({
      id: board.id,
      title: board.title,
      description: board.description?.trim() ? board.description.trim() : null,
      icon: board.icon,
      modules: board.modules,
      is_archived: board.isArchived ?? false,
      position: board.position ?? 0,
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
        await syncTaskToSupabase(board.id, col.id, t, tIdx, true)
      }
    }
  } catch (err) {
    console.warn("seedInitialBoardToSupabase error:", err)
  }
}

export async function archiveBoardInSupabase(boardId: string, isArchived: boolean): Promise<void> {
  try {
    const { error } = await supabase.from("boards").update({ is_archived: isArchived }).eq("id", boardId)
    if (error) console.error("archiveBoardInSupabase error:", error.message)
  } catch (err) {
    console.warn("archiveBoardInSupabase error:", err)
  }
}

export async function reorderBoardsInSupabase(boardOrder: { id: string; position: number }[]): Promise<void> {
  try {
    for (const b of boardOrder) {
      const { error } = await supabase.from("boards").update({ position: b.position }).eq("id", b.id)
      if (error) console.error("reorderBoardsInSupabase error:", error.message)
    }
  } catch (err) {
    console.warn("reorderBoardsInSupabase error:", err)
  }
}

const taskSyncTimers = new Map<string, ReturnType<typeof setTimeout>>()
const pendingSyncActions = new Map<string, () => Promise<void>>()

export async function flushTaskSync(taskId: string): Promise<void> {
  const timer = taskSyncTimers.get(taskId)
  if (timer) {
    clearTimeout(timer)
    taskSyncTimers.delete(taskId)
  }
  const action = pendingSyncActions.get(taskId)
  if (action) {
    pendingSyncActions.delete(taskId)
    await action()
  }
}

export async function syncTaskToSupabase(
  boardId: string,
  columnId: string,
  task: Task,
  position = 0,
  immediate = false
): Promise<void> {
  const existingTimer = taskSyncTimers.get(task.id)
  if (existingTimer) {
    clearTimeout(existingTimer)
    taskSyncTimers.delete(task.id)
  }

  const performSync = async () => {
    try {
      const assigneesList =
        Array.isArray(task.assignees) && task.assignees.length > 0
          ? task.assignees
          : task.assignee
          ? [task.assignee]
          : []

      const { error } = await supabase.from("tasks").upsert({
        id: task.id,
        board_id: boardId,
        column_id: columnId,
        title: task.title,
        description: task.description?.trim() ? task.description.trim() : null,
        priority: task.priority,
        assignee: assigneesList[0] || null,
        assignees: assigneesList,
        leader: task.leader || null,
        created_by: task.createdBy || null,
        customer_name: task.customerName || null,
        customer_phone: task.customerPhone || null,
        customer_email: task.customerEmail || null,
        amount: task.amount ?? null,
        advance_paid: task.advancePaid ?? null,
        due_date: task.dueDate || null,
        travel_start_date: task.travelStartDate || null,
        travel_end_date: task.travelEndDate || null,
        pickup_location: task.pickupLocation || null,
        destination: task.destination || null,
        vehicle_type: task.vehicleType || null,
        pax_adults: task.paxAdults ?? null,
        pax_kids: task.paxKids ?? null,
        position,
        checklist: task.checklist || [],
        activities: task.activities || [],
        reminders: task.reminders || [],
        hotel_booking: task.hotelBooking || null,
        payment_tracking: task.paymentTracking || null,
        updated_at: new Date().toISOString(),
      })

      if (error) {
        console.error("syncTaskToSupabase error:", error.message, error.details)
      }
    } catch (err) {
      console.warn("syncTaskToSupabase error:", err)
    } finally {
      taskSyncTimers.delete(task.id)
      pendingSyncActions.delete(task.id)
    }
  }

  pendingSyncActions.set(task.id, performSync)

  if (immediate) {
    await performSync()
  } else {
    taskSyncTimers.set(
      task.id,
      setTimeout(() => {
        performSync()
      }, 400)
    )
  }
}

export async function deleteTaskFromSupabase(taskId: string): Promise<boolean> {
  const timer = taskSyncTimers.get(taskId)
  if (timer) {
    clearTimeout(timer)
    taskSyncTimers.delete(taskId)
  }
  pendingSyncActions.delete(taskId)

  try {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId)
    if (error) {
      console.error("deleteTaskFromSupabase error:", error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn("deleteTaskFromSupabase error:", err)
    return false
  }
}

export async function deleteBoardFromSupabase(boardId: string): Promise<void> {
  try {
    const { error } = await supabase.from("boards").delete().eq("id", boardId)
    if (error) console.error("deleteBoardFromSupabase error:", error.message)
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
    const { error } = await supabase.from("columns").upsert({
      id: columnId,
      board_id: boardId,
      title,
      position,
    })
    if (error) console.error("syncColumnToSupabase error:", error.message)
  } catch (err) {
    console.warn("syncColumnToSupabase error:", err)
  }
}

export async function deleteColumnFromSupabase(columnId: string): Promise<void> {
  try {
    const { error } = await supabase.from("columns").delete().eq("id", columnId)
    if (error) console.error("deleteColumnFromSupabase error:", error.message)
  } catch (err) {
    console.warn("deleteColumnFromSupabase error:", err)
  }
}

export async function fetchGeneralRemindersFromSupabase(): Promise<TaskReminder[]> {
  try {
    const { data, error } = await supabase
      .from("general_reminders")
      .select("*")
      .order("created_at", { ascending: false })

    if (error || !data) return []

    return data.map((row) => ({
      id: row.id,
      text: row.text,
      dueDate: row.due_date,
      dueTime: row.due_time || undefined,
      priority: row.priority || "medium",
      completed: !!row.completed,
      completedAt: row.completed_at || undefined,
      createdBy: row.created_by || undefined,
      createdAt: row.created_at || new Date().toISOString(),
    }))
  } catch (err) {
    console.warn("fetchGeneralRemindersFromSupabase error:", err)
    return []
  }
}

export async function syncGeneralReminderToSupabase(reminder: TaskReminder): Promise<void> {
  try {
    const { error } = await supabase.from("general_reminders").upsert({
      id: reminder.id,
      text: reminder.text,
      due_date: reminder.dueDate,
      due_time: reminder.dueTime || null,
      priority: reminder.priority || "medium",
      completed: !!reminder.completed,
      completed_at: reminder.completedAt || null,
      created_by: reminder.createdBy || null,
    })
    if (error) console.error("syncGeneralReminderToSupabase error:", error.message)
  } catch (err) {
    console.warn("syncGeneralReminderToSupabase error:", err)
  }
}

export async function deleteGeneralReminderFromSupabase(reminderId: string): Promise<void> {
  try {
    const { error } = await supabase.from("general_reminders").delete().eq("id", reminderId)
    if (error) console.error("deleteGeneralReminderFromSupabase error:", error.message)
  } catch (err) {
    console.warn("deleteGeneralReminderFromSupabase error:", err)
  }
}

