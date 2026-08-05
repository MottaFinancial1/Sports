"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogIn, LogOut, User as UserIcon } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

export function AuthStatus() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
  }

  if (loading) {
    return <span className="h-5 w-16 animate-pulse rounded-sm bg-muted" aria-hidden="true" />
  }

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="flex items-center gap-1.5 rounded-sm border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/20"
      >
        <LogIn className="h-3 w-3 shrink-0" aria-hidden="true" />
        Sign in
      </Link>
    )
  }

  const label = user.email?.split("@")[0] ?? "Account"

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/80">
        <UserIcon className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
        <span className="max-w-[10ch] truncate">{label}</span>
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
      >
        <LogOut className="h-3 w-3 shrink-0" aria-hidden="true" />
        Sign out
      </button>
    </div>
  )
}
