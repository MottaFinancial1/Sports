import { createBrowserClient } from '@supabase/ssr'

const DEFAULT_SUPABASE_URL = 'https://ygwtjlhyvslydxmrjkkc.supabase.co'
const DEFAULT_SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlnd3RqbGh5dnNseWR4bXJqa2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NDAyOTQsImV4cCI6MjEwMTExNjI5NH0.sjQKT3FNXtujeG_2lNKHKufZY99rnmxuMFUe-fx2T2o'

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    DEFAULT_SUPABASE_KEY

  return { url, key }
}

export function createClient() {
  const { url, key } = getSupabaseConfig()

  return createBrowserClient(url, key, {
    // Secure cookies in production; not in dev, so localhost still works.
    cookieOptions: { secure: process.env.NODE_ENV === 'production' },
  })
}
