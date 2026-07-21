"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, RefreshCw } from "lucide-react"
import { GameCard } from "@/components/game-card"
import { LEAGUES, type Game, type LeagueCategory } from "@/lib/espn"

const CATEGORY_ORDER: LeagueCategory[] = ["US Leagues", "College", "Soccer", "Combat & Motorsport"]

type Filter = "all" | "live" | string

export function SportsGuide({ games, fetchedAt }: { games: Game[]; fetchedAt: string }) {
  const [filter, setFilter] = useState<Filter>("all")
  const [today, setToday] = useState<string>("")
  const [updated, setUpdated] = useState<string>("")

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    )
    setUpdated(new Date(fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }))
  }, [fetchedAt])

  const liveCount = useMemo(() => games.filter((g) => g.state === "in").length, [games])

  // Leagues that actually have games today, in a stable order.
  const activeLeagues = useMemo(() => {
    const ids = new Set(games.map((g) => g.leagueId))
    return LEAGUES.filter((l) => ids.has(l.id))
  }, [games])

  const filtered = useMemo(() => {
    if (filter === "all") return games
    if (filter === "live") return games.filter((g) => g.state === "in")
    return games.filter((g) => g.leagueId === filter)
  }, [games, filter])

  // Sort games by start time within each league.
  const grouped = useMemo(() => {
    const byLeague = new Map<string, Game[]>()
    for (const g of filtered) {
      const arr = byLeague.get(g.leagueId) ?? []
      arr.push(g)
      byLeague.set(g.leagueId, arr)
    }
    for (const arr of byLeague.values()) {
      arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    return CATEGORY_ORDER.map((category) => {
      const leaguesInCat = LEAGUES.filter((l) => l.category === category && byLeague.has(l.id))
      return {
        category,
        leagues: leaguesInCat.map((l) => ({ league: l, games: byLeague.get(l.id)! })),
      }
    }).filter((c) => c.leagues.length > 0)
  }, [filtered])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-mono text-3xl font-extrabold uppercase tracking-tight text-foreground sm:text-4xl">
              What&apos;s On Today
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              <span>{today || "Loading…"}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Auto-updates · last synced {updated || "…"}</span>
          </div>
        </div>

        <nav aria-label="Filter by league" className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All ({games.length})
          </FilterChip>
          <FilterChip active={filter === "live"} onClick={() => setFilter("live")} highlight={liveCount > 0}>
            Live ({liveCount})
          </FilterChip>
          {activeLeagues.map((l) => (
            <FilterChip key={l.id} active={filter === l.id} onClick={() => setFilter(l.id)}>
              {l.shortLabel}
            </FilterChip>
          ))}
        </nav>
      </header>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-lg font-semibold text-foreground">No games match this filter</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another league, or check back — the schedule refreshes automatically.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {grouped.map(({ category, leagues }) => (
            <section key={category}>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">{category}</h2>
              <div className="flex flex-col gap-6">
                {leagues.map(({ league, games: leagueGames }) => (
                  <div key={league.id}>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                      {league.label}
                      <span className="text-xs font-medium text-muted-foreground">({leagueGames.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {leagueGames.map((g) => (
                        <GameCard key={g.id} game={g} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterChip({
  active,
  highlight,
  onClick,
  children,
}: {
  active: boolean
  highlight?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : highlight
            ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
            : "bg-secondary text-secondary-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  )
}
