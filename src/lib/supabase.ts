import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://eflwqmybzutiddnokljn.supabase.co"
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmbHdxbXlienV0aWRkbm9rbGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNzc0NTcsImV4cCI6MjEwNjg1MzQ1N30.xDuNFJNsBOPnwGEa-6ReawI_8uGNXaj-BJ8mGbEWx3g"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
