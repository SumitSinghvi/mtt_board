import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://eflwqmybzutiddnokljn.supabase.co"
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmbHdxbXlienV0aWRkbm9rbGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNzc0NTcsImV4cCI6MjEwNjg1MzQ1N30.xDuNFJNsBOPnwGEa-6ReawI_8uGNXaj-BJ8mGbEWx3g"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const PAGE_SIZE = 1000

// PostgREST silently caps each response (default max-rows = 1000), so unpaged list queries drop rows.
// Fetches pages until an empty one; stopping on empty (not short) pages stays correct if max-rows < PAGE_SIZE.
// The query MUST end with a unique tiebreak order (e.g. .order("id")) or rows can repeat/skip across pages.
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = []
  for (;;) {
    const { data, error } = await page(rows.length, rows.length + PAGE_SIZE - 1)
    if (error) return { data: rows, error }
    if (!data || data.length === 0) return { data: rows, error: null }
    rows.push(...data)
  }
}
