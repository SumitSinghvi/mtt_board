import { useState, useEffect, useLayoutEffect, useRef } from "react"
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  Lock,
  X,
} from "lucide-react"
import { useTodoStore } from "../store/todoStore"
import { useAuthStore } from "../store/authStore"
import { formatDate } from "../lib/date"

interface AutoResizeTextareaProps {
  value: string
  onChange: (val: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  className?: string
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
}

function AutoResizeTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className = "",
  inputRef,
}: AutoResizeTextareaProps) {
  const localRef = useRef<HTMLTextAreaElement | null>(null)

  const adjustHeight = () => {
    const el = localRef.current
    if (!el) return
    el.style.height = "auto"
    if (value) {
      el.style.height = `${el.scrollHeight}px`
    }
  }

  useLayoutEffect(() => {
    adjustHeight()
  }, [value])

  return (
    <textarea
      ref={(node) => {
        localRef.current = node
        if (inputRef) {
          (inputRef as any).current = node
        }
      }}
      rows={1}
      value={value}
      onChange={(e) => {
        onChange(e.target.value)
        adjustHeight()
      }}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={`resize-none overflow-hidden block w-full whitespace-pre-wrap break-words leading-relaxed ${className}`}
    />
  )
}

interface DueDatePickerProps {
  value?: string
  onChange: (date?: string) => void
  align?: "left" | "right"
  showOnHoverOnly?: boolean
}

function DueDatePicker({
  value,
  onChange,
  align = "right",
  showOnHoverOnly = false,
}: DueDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close popover when clicking outside
  useEffect(() => {
    if (!isOpen) return
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [isOpen])

  // Presets
  const now = new Date()
  const todayStr = now.toISOString().split("T")[0]
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0]
  const in3DaysStr = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0]
  const in1WeekStr = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]

  const isOverdue = value && value < todayStr
  const isDueToday = value === todayStr
  const isTomorrow = value === tomorrowStr

  return (
    <div ref={containerRef} className="relative inline-flex items-center shrink-0">
      {value ? (
        <span
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen((prev) => !prev)
          }}
          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md cursor-pointer transition select-none ${
            isOverdue
              ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
              : isDueToday
              ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
              : isTomorrow
              ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200"
          }`}
          title="Change due date"
        >
          <Calendar className="size-3 shrink-0" />
          <span>{isDueToday ? "Today" : isTomorrow ? "Tomorrow" : formatDate(value)}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange(undefined)
              setIsOpen(false)
            }}
            className="hover:text-stone-900 ml-0.5 p-0.5 rounded hover:bg-black/5"
            title="Remove date"
          >
            <X className="size-2.5" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen((prev) => !prev)
          }}
          className={`inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-700 hover:bg-stone-100 px-2 py-0.5 rounded-md cursor-pointer transition select-none ${
            showOnHoverOnly ? "opacity-100 sm:opacity-0 sm:group-hover:opacity-100" : ""
          }`}
          title="Add due date"
        >
          <Calendar className="size-3" />
          <span>Due date</span>
        </button>
      )}

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full mt-1.5 z-40 w-56 rounded-xl border border-stone-200 bg-white p-3 shadow-xl animate-in fade-in-50 zoom-in-95 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
            Set Due Date
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-2 gap-1.5 mb-2.5">
            <button
              type="button"
              onClick={() => {
                onChange(todayStr)
                setIsOpen(false)
              }}
              className="text-left text-xs font-medium text-stone-700 hover:bg-amber-50 hover:text-amber-800 p-1.5 rounded-lg border border-stone-100 transition"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(tomorrowStr)
                setIsOpen(false)
              }}
              className="text-left text-xs font-medium text-stone-700 hover:bg-amber-50 hover:text-amber-800 p-1.5 rounded-lg border border-stone-100 transition"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(in3DaysStr)
                setIsOpen(false)
              }}
              className="text-left text-xs font-medium text-stone-700 hover:bg-amber-50 hover:text-amber-800 p-1.5 rounded-lg border border-stone-100 transition"
            >
              In 3 days
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(in1WeekStr)
                setIsOpen(false)
              }}
              className="text-left text-xs font-medium text-stone-700 hover:bg-amber-50 hover:text-amber-800 p-1.5 rounded-lg border border-stone-100 transition"
            >
              Next week
            </button>
          </div>

          <div className="border-t border-stone-100 pt-2 space-y-1">
            <label className="block text-[10px] font-semibold text-stone-500">
              Or choose specific date:
            </label>
            <input
              type="date"
              autoFocus
              value={value || ""}
              onChange={(e) => {
                if (e.target.value) {
                  onChange(e.target.value)
                  setIsOpen(false)
                }
              }}
              className="w-full text-xs rounded-lg border border-stone-200 bg-stone-50 p-1.5 text-stone-800 focus:border-amber-500 focus:bg-white focus:outline-none cursor-pointer"
            />
          </div>

          {value && (
            <div className="border-t border-stone-100 mt-2.5 pt-1.5 text-right">
              <button
                type="button"
                onClick={() => {
                  onChange(undefined)
                  setIsOpen(false)
                }}
                className="text-[11px] font-semibold text-red-600 hover:text-red-700 cursor-pointer"
              >
                Clear date
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function TodoPage() {
  const { todos, fetchTodos, addTodo, toggleTodo, updateTodo, deleteTodo } = useTodoStore()
  const { profile, user } = useAuthStore()

  const [inputVal, setInputVal] = useState("")
  const [inputDueDate, setInputDueDate] = useState<string | undefined>(undefined)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos, user])

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const textToSave = inputVal.trim()
      const dateToSave = inputDueDate
      if (!textToSave) return

      // Synchronously clear input state before dispatching to eliminate flicker
      setInputVal("")
      setInputDueDate(undefined)

      await addTodo({
        title: textToSave,
        dueDate: dateToSave || undefined,
        priority: "medium",
      })
    }
  }

  const handleCreate = async () => {
    const textToSave = inputVal.trim()
    const dateToSave = inputDueDate
    if (!textToSave) return

    // Synchronously clear input state first
    setInputVal("")
    setInputDueDate(undefined)

    await addTodo({
      title: textToSave,
      dueDate: dateToSave || undefined,
      priority: "medium",
    })
  }

  const activeTodos = todos.filter((t) => !t.completed)
  const completedTodos = todos.filter((t) => t.completed)

  return (
    <div className="flex-1 overflow-y-auto bg-white p-4 sm:p-10 lg:p-14">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Notion-style Header */}
        <div className="border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-amber-50 text-amber-700">
              <CheckSquare className="size-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Notes
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600 border border-stone-200 ml-1.5">
              <Lock className="size-2.5 text-stone-400" />
              <span>Private</span>
            </span>
          </div>
          <p className="text-xs text-stone-400">
            Private checklist & notes for {profile?.name || user?.email || "you"}.
          </p>
        </div>

        {/* Active Checklist Items */}
        <div className="space-y-1">
          {activeTodos.map((todo) => (
            <div
              key={todo.id}
              className="group flex items-start gap-2.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-stone-50 transition"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                className="size-4.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0 accent-amber-600 mt-1"
              />

              {/* Multi-line Word-Wrapping Title */}
              <div className="flex-1 min-w-0">
                <AutoResizeTextarea
                  value={todo.title}
                  onChange={(val) => updateTodo(todo.id, { title: val })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      e.currentTarget.blur()
                    }
                  }}
                  className="bg-transparent text-sm text-stone-800 placeholder-stone-300 focus:outline-none py-0.5"
                />
              </div>

              {/* Reliable Due Date Picker & Delete */}
              <div className="mt-0.5 shrink-0 flex items-center gap-1">
                <DueDatePicker
                  value={todo.dueDate}
                  onChange={(newDate) => updateTodo(todo.id, { dueDate: newDate })}
                  showOnHoverOnly={!todo.dueDate}
                  align="right"
                />

                <button
                  type="button"
                  onClick={() => deleteTodo(todo.id)}
                  title="Delete item"
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-stone-300 hover:text-red-600 rounded transition cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Quick inline new item input with word-wrap and due date picker */}
          <div className="flex items-start gap-2 py-1.5 px-2 -mx-2 text-stone-400 focus-within:text-stone-700 rounded-lg hover:bg-stone-50/70 transition">
            <Plus className="size-4 shrink-0 text-stone-300 mt-1" />
            <div className="flex-1 min-w-0">
              <AutoResizeTextarea
                inputRef={inputRef}
                value={inputVal}
                onChange={(val) => setInputVal(val)}
                onKeyDown={handleKeyDown}
                placeholder="To-do... (press Enter to add)"
                className="bg-transparent text-sm text-stone-800 placeholder-stone-400 focus:outline-none py-0.5"
              />
            </div>

            <div className="mt-0.5 shrink-0 flex items-center gap-1.5">
              <DueDatePicker
                value={inputDueDate}
                onChange={(newDate) => setInputDueDate(newDate)}
                align="right"
              />

              {inputVal.trim() && (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded transition cursor-pointer"
                >
                  Add
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Completed Items Section */}
        {completedTodos.length > 0 && (
          <div className="pt-4 border-t border-stone-100 space-y-1">
            <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
              Completed ({completedTodos.length})
            </div>
            {completedTodos.map((todo) => (
              <div
                key={todo.id}
                className="group flex items-start gap-2.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-stone-50 transition opacity-60"
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  className="size-4.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0 accent-amber-600 mt-1"
                />
                <div className="flex-1 min-w-0">
                  <AutoResizeTextarea
                    value={todo.title}
                    onChange={(val) => updateTodo(todo.id, { title: val })}
                    className="bg-transparent text-sm text-stone-500 line-through placeholder-stone-300 focus:outline-none py-0.5"
                  />
                </div>
                <div className="mt-0.5 shrink-0 flex items-center gap-1">
                  <DueDatePicker
                    value={todo.dueDate}
                    onChange={(newDate) => updateTodo(todo.id, { dueDate: newDate })}
                    align="right"
                  />
                  <button
                    type="button"
                    onClick={() => deleteTodo(todo.id)}
                    title="Delete item"
                    className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-600 rounded transition cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
