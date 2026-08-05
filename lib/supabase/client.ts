import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ygwtjlhyvslydxmrjkkc.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlnd3RqbGh5dnNseWR4bXJqa2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NDAyOTQsImV4cCI6MjEwMTExNjI5NH0.sjQKT3FNXtujeG_2lNKHKufZY99rnmxuMFUe-fx2T2o'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // Secure cookies in production; not in dev, so localhost still works.
    cookieOptions: { secure: process.env.NODE_ENV === 'production' },
  })
}
