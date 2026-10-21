import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Clock,
  Users,
  Search,
  RefreshCw,
  Download,
  ShieldAlert,
  Activity,
  Laptop,
  CheckCircle2,
  XCircle,
  MapPin,
  ChevronDown,
  ChevronUp,
  Layers,
  Timer,
} from "lucide-react"
import { supabase } from "../lib/supabase"
import { roleLabels } from "./staff/roleLabels"
import type { StaffRole } from "../store/staffStore"

export interface StaffPageVisit {
  id: string
  session_id: string
  user_id: string
  page: string
  started_at: string
  last_seen_at: string
  ended_at: string | null
  duration_seconds: number
}

interface StaffSessionRecord {
  id: string
  user_id: string
  started_at: string
  last_seen_at: string
  ended_at: string | null
  duration_seconds: number
  user_agent: string | null
  current_page: string | null
  profiles?: {
    name?: string | null
    email?: string | null
    role?: StaffRole | null
    phone?: string | null
  } | null
  staff_page_visits?: StaffPageVisit[]
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return "Unknown device"
  let os = "Desktop"
  if (/windows/i.test(ua)) os = "Windows"
  else if (/macintosh|mac os/i.test(ua)) os = "macOS"
  else if (/android/i.test(ua)) os = "Android"
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS"
  else if (/linux/i.test(ua)) os = "Linux"

  let browser = "Browser"
  if (/chrome|crios/i.test(ua) && !/edg|opr/i.test(ua)) browser = "Chrome"
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox"
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = "Safari"
  else if (/edg/i.test(ua)) browser = "Edge"
  else if (/opr\//i.test(ua)) browser = "Opera"

  return `${browser} on ${os}`
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}h ${mins}m`
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return isoString
  }
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return isoString
  }
}

function getAggregatedPages(visits?: StaffPageVisit[]): { page: string; totalSeconds: number; count: number }[] {
  if (!visits || visits.length === 0) return []
  const map = new Map<string, { totalSeconds: number; count: number }>()
  for (const v of visits) {
    const existing = map.get(v.page) || { totalSeconds: 0, count: 0 }
    existing.totalSeconds += v.duration_seconds || 0
    existing.count += 1
    map.set(v.page, existing)
  }
  return Array.from(map.entries())
    .map(([page, data]) => ({ page, totalSeconds: data.totalSeconds, count: data.count }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
}

export function SecretActivityPage() {
  const [sessions, setSessions] = useState<StaffSessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "week" | "all">("today")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date())
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(new Set())

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessionIds((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }

  const fetchSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("staff_sessions")
        .select(`
          id,
          user_id,
          started_at,
          last_seen_at,
          ended_at,
          duration_seconds,
          user_agent,
          current_page,
          profiles:user_id (
            name,
            email,
            role,
            phone
          ),
          staff_page_visits (
            id,
            session_id,
            user_id,
            page,
            started_at,
            last_seen_at,
            ended_at,
            duration_seconds
          )
        `)
        .order("started_at", { ascending: false })
        .limit(300)

      if (error) {
        console.warn("Failed to fetch staff sessions:", error.message)
      } else if (data) {
        const formatted: StaffSessionRecord[] = data
          .map((item: any) => ({
            ...item,
            profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
            staff_page_visits: Array.isArray(item.staff_page_visits)
              ? [...item.staff_page_visits].sort(
                  (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
                )
              : [],
          }))
          .filter((item) => {
            const name = (item.profiles?.name || "").toLowerCase().trim()
            const email = (item.profiles?.email || "").toLowerCase().trim()
            const userId = item.user_id || ""
            return (
              name !== "sumit jain" &&
              !name.includes("sumit jain") &&
              email !== "sumitjaindev@gmail.com" &&
              userId !== "c8b71f88-d4a8-467d-b583-1afcb04954bb"
            )
          })
        setSessions(formatted)
        setLastRefreshedAt(new Date())
      }
    } catch (err) {
      console.warn("Error querying staff sessions:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Polling every 25 seconds for live status
  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(() => {
      fetchSessions()
    }, 25000)
    return () => clearInterval(timer)
  }, [autoRefresh, fetchSessions])

  const now = new Date().getTime()
  // Considered online if no ended_at AND last_seen_at within past 120 seconds
  const isSessionOnline = (session: StaffSessionRecord): boolean => {
    if (session.ended_at) return false
    const lastSeen = new Date(session.last_seen_at).getTime()
    return now - lastSeen < 120 * 1000
  }

  // Filter sessions
  const filteredSessions = useMemo(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)

    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)

    return sessions.filter((s) => {
      const sessionDate = new Date(s.started_at)

      if (dateFilter === "today") {
        if (sessionDate < todayStart) return false
      } else if (dateFilter === "yesterday") {
        if (sessionDate < yesterdayStart || sessionDate >= todayStart) return false
      } else if (dateFilter === "week") {
        if (sessionDate < weekStart) return false
      }

      const role = s.profiles?.role || "travel"
      if (roleFilter !== "all" && role !== roleFilter) return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const name = s.profiles?.name?.toLowerCase() || ""
        const email = s.profiles?.email?.toLowerCase() || ""
        const pages = s.staff_page_visits?.map((p) => p.page.toLowerCase()).join(" ") || ""
        if (!name.includes(query) && !email.includes(query) && !pages.includes(query)) return false
      }

      return true
    })
  }, [sessions, dateFilter, roleFilter, searchQuery])

  // Current Online Staff (unique by user_id)
  const currentlyOnlineStaff = useMemo(() => {
    const onlineMap = new Map<string, StaffSessionRecord>()
    for (const session of sessions) {
      if (isSessionOnline(session)) {
        if (!onlineMap.has(session.user_id)) {
          onlineMap.set(session.user_id, session)
        }
      }
    }
    return Array.from(onlineMap.values())
  }, [sessions])

  // Summary Metrics
  const metrics = useMemo(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const todaySessions = sessions.filter((s) => new Date(s.started_at) >= todayStart)
    const totalTodayDurationSeconds = todaySessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0)
    const uniqueStaffToday = new Set(todaySessions.map((s) => s.user_id)).size

    return {
      onlineCount: currentlyOnlineStaff.length,
      todaySessionsCount: todaySessions.length,
      uniqueStaffToday,
      totalHoursToday: (totalTodayDurationSeconds / 3600).toFixed(1),
    }
  }, [sessions, currentlyOnlineStaff])

  const exportCSV = () => {
    const rows = [
      [
        "Staff Name",
        "Email",
        "Role",
        "Current/Last Page",
        "Page Breakdown (Page: Duration)",
        "Started Date",
        "Started Time",
        "Last Seen / Ended",
        "Total Duration",
        "Status",
        "Device",
      ],
    ]

    for (const s of filteredSessions) {
      const online = isSessionOnline(s)
      const pageSummary = getAggregatedPages(s.staff_page_visits)
        .map((p) => `${p.page}: ${formatDuration(p.totalSeconds)}`)
        .join(" | ")

      rows.push([
        s.profiles?.name || "Unknown",
        s.profiles?.email || "",
        s.profiles?.role || "",
        s.current_page || "Dashboard",
        pageSummary || "None",
        formatDate(s.started_at),
        formatTime(s.started_at),
        online ? "Online Now" : formatTime(s.ended_at || s.last_seen_at),
        formatDuration(s.duration_seconds),
        online ? "Online" : "Logged Off",
        parseUserAgent(s.user_agent),
      ])
    }

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.map((val) => `"${val}"`).join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `mtt_staff_attendance_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-stone-50 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">Staff Presence & Attendance</h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-800">
              <ShieldAlert className="size-3 text-amber-700" />
              Admin Audit Log
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Live monitoring: exactly which staff members are online, which pages they worked on, and exact time spent per page.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSessions()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-amber-600" : ""}`} />
            Refresh
          </button>

          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
            title="Export CSV attendance report"
          >
            <Download className="size-3.5 text-stone-500" />
            Export CSV
          </button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`rounded-lg px-2.5 py-2 text-xs font-medium transition ${
              autoRefresh ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-stone-100 text-stone-600"
            }`}
          >
            {autoRefresh ? "Live Sync (25s)" : "Sync Paused"}
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Online Now</span>
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{metrics.onlineCount}</span>
            <span className="text-xs text-stone-500">staff active</span>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Staff Active Today</span>
            <Users className="size-4 text-stone-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{metrics.uniqueStaffToday}</span>
            <span className="text-xs text-stone-500">people logged in</span>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Today's Sessions</span>
            <Activity className="size-4 text-stone-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{metrics.todaySessionsCount}</span>
            <span className="text-xs text-stone-500">logins recorded</span>
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Total Hours Today</span>
            <Clock className="size-4 text-stone-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{metrics.totalHoursToday}</span>
            <span className="text-xs text-stone-500">hours online</span>
          </div>
        </div>
      </div>

      {/* Currently Online Section */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-700">Currently Active Staff</h2>
          <span className="text-xs text-stone-400">Updated {lastRefreshedAt.toLocaleTimeString()}</span>
        </div>

        {currentlyOnlineStaff.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-xs text-stone-500">
            No staff members currently online right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentlyOnlineStaff.map((session) => {
              const role = session.profiles?.role || "travel"
              const roleConfig = roleLabels[role] || roleLabels.travel
              const liveDuration = formatDuration(session.duration_seconds)
              const name = session.profiles?.name || session.profiles?.email?.split("@")[0] || "Staff Member"

              // Active page visit
              const visits = session.staff_page_visits || []
              const activeVisit = visits.find((v) => !v.ended_at) || visits[visits.length - 1]
              const activePageDuration = activeVisit ? formatDuration(activeVisit.duration_seconds) : "Just now"

              return (
                <div
                  key={session.id}
                  className="relative flex flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm transition hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-9 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white uppercase shadow-sm">
                          {name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-stone-900 text-sm">{name}</span>
                            <span className="relative flex size-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
                            </span>
                          </div>
                          <span className="text-xs text-stone-500">{session.profiles?.email}</span>
                        </div>
                      </div>
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${roleConfig.color}`}>
                        {roleConfig.title}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-emerald-100 pt-3 text-xs">
                      <div>
                        <span className="text-stone-400 block text-[10px] uppercase font-medium">Logged in at</span>
                        <span className="font-semibold text-stone-800">{formatTime(session.started_at)}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px] uppercase font-medium">Total Session</span>
                        <span className="font-semibold text-emerald-800">{liveDuration}</span>
                      </div>
                    </div>

                    {/* Current Page with specific page duration */}
                    <div className="mt-3 rounded-lg border border-emerald-200/90 bg-white/90 p-2.5 text-xs shadow-2xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 font-semibold text-stone-600">
                          <MapPin className="size-3 text-emerald-600" />
                          Active Page:
                        </span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                          {activePageDuration} on this page
                        </span>
                      </div>
                      <p className="mt-1 font-bold text-stone-900 truncate text-xs">
                        {session.current_page || "Dashboard"}
                      </p>
                    </div>

                    {/* Small list of other pages visited */}
                    {visits.length > 1 && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-stone-500">
                        <Layers className="size-3 text-stone-400" />
                        <span>Visited {visits.length} pages this session</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-emerald-100 pt-2 text-[11px] text-stone-500">
                    <span className="inline-flex items-center gap-1">
                      <Laptop className="size-3 text-stone-400" />
                      {parseUserAgent(session.user_agent)}
                    </span>
                    <span className="text-emerald-700 font-medium">Live</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Attendance & Session History Table */}
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
        {/* Table Filter Toolbar */}
        <div className="flex flex-col gap-3 border-b border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5 text-xs font-medium text-stone-600">
              <button
                onClick={() => setDateFilter("today")}
                className={`rounded-md px-3 py-1.5 transition ${
                  dateFilter === "today" ? "bg-white font-semibold text-stone-900 shadow-sm" : "hover:text-stone-900"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateFilter("yesterday")}
                className={`rounded-md px-3 py-1.5 transition ${
                  dateFilter === "yesterday" ? "bg-white font-semibold text-stone-900 shadow-sm" : "hover:text-stone-900"
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setDateFilter("week")}
                className={`rounded-md px-3 py-1.5 transition ${
                  dateFilter === "week" ? "bg-white font-semibold text-stone-900 shadow-sm" : "hover:text-stone-900"
                }`}
              >
                Past 7 Days
              </button>
              <button
                onClick={() => setDateFilter("all")}
                className={`rounded-md px-3 py-1.5 transition ${
                  dateFilter === "all" ? "bg-white font-semibold text-stone-900 shadow-sm" : "hover:text-stone-900"
                }`}
              >
                All Time
              </button>
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-700 focus:border-amber-500 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="travel">Travel</option>
              <option value="visa">Visa</option>
              <option value="accounts">Accounts</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search staff, email, or page..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 py-1.5 pl-8 pr-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
              <tr>
                <th className="w-8 py-3 pl-4"></th>
                <th className="py-3 pr-3 font-semibold">Staff Member</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Time on Pages (Breakdown)</th>
                <th className="px-3 py-3 font-semibold">Date & Start Time</th>
                <th className="px-3 py-3 font-semibold">Last Active / Logoff</th>
                <th className="px-3 py-3 font-semibold">Total Duration</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="py-3 pl-3 pr-4 font-semibold">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-xs text-stone-400">
                    No session logs found for selected filters.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => {
                  const online = isSessionOnline(session)
                  const role = session.profiles?.role || "travel"
                  const roleConfig = roleLabels[role] || roleLabels.travel
                  const name = session.profiles?.name || session.profiles?.email?.split("@")[0] || "Staff Member"
                  const isExpanded = expandedSessionIds.has(session.id)
                  const aggregatedPages = getAggregatedPages(session.staff_page_visits)
                  const visits = session.staff_page_visits || []

                  return (
                    <tr key={session.id} className="group">
                      <td colSpan={9} className="p-0">
                        {/* Primary Row */}
                        <div
                          onClick={() => toggleSessionExpand(session.id)}
                          className={`flex items-center w-full cursor-pointer py-3 transition hover:bg-stone-50/80 ${
                            isExpanded ? "bg-amber-50/30" : ""
                          }`}
                        >
                          {/* Expand chevron */}
                          <div className="w-8 pl-4 flex items-center justify-center shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="size-4 text-stone-600" />
                            ) : (
                              <ChevronDown className="size-4 text-stone-400 group-hover:text-stone-600" />
                            )}
                          </div>

                          {/* Staff Info */}
                          <div className="w-[180px] shrink-0 pr-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-7 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-700 uppercase shrink-0">
                                {name.slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <span className="block font-semibold text-stone-900 truncate">{name}</span>
                                <span className="text-[11px] text-stone-400 truncate block">
                                  {session.profiles?.email}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Role */}
                          <div className="w-[90px] shrink-0 px-3">
                            <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-medium ${roleConfig.color}`}>
                              {roleConfig.title}
                            </span>
                          </div>

                          {/* Time on Pages Preview */}
                          <div className="flex-1 min-w-[220px] px-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {aggregatedPages.length === 0 ? (
                                <span className="text-stone-400 text-[11px] italic">
                                  {session.current_page || "Dashboard"} ({formatDuration(session.duration_seconds)})
                                </span>
                              ) : (
                                <>
                                  {aggregatedPages.slice(0, 2).map((item) => (
                                    <span
                                      key={item.page}
                                      className="inline-flex items-center gap-1 rounded border border-stone-200 bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-800"
                                    >
                                      <MapPin className="size-2.5 text-amber-600 shrink-0" />
                                      <span className="max-w-[120px] truncate">{item.page}</span>
                                      <span className="font-bold text-stone-900">
                                        ({formatDuration(item.totalSeconds)})
                                      </span>
                                    </span>
                                  ))}
                                  {aggregatedPages.length > 2 && (
                                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                      +{aggregatedPages.length - 2} more pages
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Started At */}
                          <div className="w-[130px] shrink-0 px-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-stone-800">{formatTime(session.started_at)}</span>
                              <span className="text-[10px] text-stone-400">{formatDate(session.started_at)}</span>
                            </div>
                          </div>

                          {/* Last Seen / Ended At */}
                          <div className="w-[130px] shrink-0 px-3">
                            {online ? (
                              <span className="font-semibold text-emerald-700">Active Now</span>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-medium text-stone-700">
                                  {formatTime(session.ended_at || session.last_seen_at)}
                                </span>
                                <span className="text-[10px] text-stone-400">
                                  {formatDate(session.ended_at || session.last_seen_at)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Total Duration */}
                          <div className="w-[110px] shrink-0 px-3">
                            <span className="font-bold text-stone-900">{formatDuration(session.duration_seconds)}</span>
                          </div>

                          {/* Status */}
                          <div className="w-[100px] shrink-0 px-3">
                            {online ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                <CheckCircle2 className="size-3.5 text-emerald-600" />
                                Online
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-stone-400 font-medium">
                                <XCircle className="size-3.5 text-stone-400" />
                                Logged Off
                              </span>
                            )}
                          </div>

                          {/* Device */}
                          <div className="w-[140px] shrink-0 pr-4 text-stone-500">
                            <span className="inline-flex items-center gap-1 text-[11px] truncate">
                              <Laptop className="size-3 text-stone-400 shrink-0" />
                              {parseUserAgent(session.user_agent)}
                            </span>
                          </div>
                        </div>

                        {/* Expandable Page Breakdown Drawer */}
                        {isExpanded && (
                          <div className="border-t border-stone-200 bg-stone-50/70 p-4 pl-12 pr-6">
                            <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-2xs">
                              {/* Header info */}
                              <div className="mb-3 flex items-center justify-between border-b border-stone-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <Timer className="size-4 text-amber-600" />
                                  <span className="font-bold text-stone-800 text-xs">
                                    Exact Time Spent on Each Page
                                  </span>
                                  <span className="text-[11px] text-stone-400">
                                    ({visits.length} page transitions recorded in this session)
                                  </span>
                                </div>
                                <span className="text-xs font-semibold text-stone-700">
                                  Total Session: {formatDuration(session.duration_seconds)}
                                </span>
                              </div>

                              {/* Aggregated totals per page */}
                              <div className="mb-4">
                                <span className="text-[10px] uppercase font-bold text-stone-400 block mb-2">
                                  Total Time Aggregated By Page
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {aggregatedPages.map((item) => (
                                    <div
                                      key={item.page}
                                      className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs"
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                        <MapPin className="size-3 text-amber-600 shrink-0" />
                                        <span className="font-semibold text-stone-800 truncate">{item.page}</span>
                                        <span className="text-[10px] text-stone-400">({item.count}x)</span>
                                      </div>
                                      <span className="font-bold text-stone-900 shrink-0">
                                        {formatDuration(item.totalSeconds)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Chronological Page Journey */}
                              <div>
                                <span className="text-[10px] uppercase font-bold text-stone-400 block mb-2">
                                  Chronological Visit Timeline
                                </span>
                                <div className="overflow-x-auto rounded border border-stone-100">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-stone-50 text-[10px] uppercase text-stone-500">
                                      <tr>
                                        <th className="py-2 pl-3 pr-2 w-8">#</th>
                                        <th className="py-2 px-3">Page Visited</th>
                                        <th className="py-2 px-3">Entered At</th>
                                        <th className="py-2 px-3">Left At</th>
                                        <th className="py-2 pr-3 text-right">Time Spent</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                      {visits.map((v, idx) => (
                                        <tr key={v.id} className="hover:bg-stone-50/50">
                                          <td className="py-2 pl-3 pr-2 font-mono text-[11px] text-stone-400">
                                            {idx + 1}
                                          </td>
                                          <td className="py-2 px-3 font-semibold text-stone-800">
                                            {v.page}
                                          </td>
                                          <td className="py-2 px-3 text-stone-600">
                                            {formatTime(v.started_at)}
                                          </td>
                                          <td className="py-2 px-3 text-stone-600">
                                            {v.ended_at ? formatTime(v.ended_at) : (
                                              <span className="font-semibold text-emerald-600">Currently Viewing</span>
                                            )}
                                          </td>
                                          <td className="py-2 pr-3 text-right font-bold text-stone-900">
                                            {formatDuration(v.duration_seconds)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50/50 px-4 py-2.5 text-xs text-stone-500">
          <span>Showing {filteredSessions.length} total logged sessions • Click any session to expand detailed per-page breakdown</span>
          <span>Access link: <code className="bg-stone-200 px-1 py-0.5 rounded text-stone-800 text-[11px]">#audit-logs</code></span>
        </div>
      </div>
    </div>
  )
}
