"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { CalendarDays, Clock, Flame, RefreshCw, Sunrise, Sun, Moon, Trophy } from "lucide-react"
import { GameCard } from "@/components/game-card"
import { LEAGUES, type Game, type LeagueCategory, type SportsData } from "@/lib/espn"

const fetcher = (url: string) => fetch(url).then((res) => res.json() as Promise<SportsData>)

const CATEGORY_ORDER: LeagueCategory[] = [
  "Baseball",
  "Soccer",
  "Football",
  "Basketball",
  "Hockey",
  "Combat & Motorsport",
]

type Filter = "all" | "live" | string

function greetingForHour(hour: number) {
  if (hour < 12) return { text: "Good morning", Icon: Sunrise }
  if (hour < 17) return { text: "Good afternoon", Icon: Sun }
  return { text: "Good evening", Icon: Moon }
}

export function SportsGuide({ games: initialGames, fetchedAt: initialFetchedAt }: { games: Game[]; fetchedAt: string }) {
  // Poll for fresh data every 60s, revalidate when the tab regains focus or
  // the network reconnects, and keep polling in background tabs. The
  // server-rendered payload seeds the cache so there is never a blank state.
  const { data } = useSWR<SportsData>("/api/games", fetcher, {
    fallbackData: { games: initialGames, fetchedAt: initialFetchedAt },
    refreshInterval: 60_000,
    refreshWhenHidden: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const games = data?.games ?? initialGames
  const fetchedAt = data?.fetchedAt ?? initialFetchedAt

  const [filter, setFilter] = useState<Filter>("all")
  const [today, setToday] = useState<string>("")
  const [updated, setUpdated] = useState<string>("")
  const [greeting, setGreeting] = useState<{ text: string; Icon: typeof Sunrise } | null>(null)
  const [nextUp, setNextUp] = useState<string>("")

  useEffect(() => {
    const now = new Date()
    setToday(
      now.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    )
    setUpdated(new Date(fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }))
    setGreeting(greetingForHour(now.getHours()))

    // Next upcoming start time from now.
    const upcoming = games
      .filter((g) => g.state === "pre" && new Date(g.date).getTime() > now.getTime())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    setNextUp(
      upcoming ? new Date(upcoming.date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—",
    )
  }, [fetchedAt, games])

  const liveCount = useMemo(() => games.filter((g) => g.state === "in").length, [games])
  const finalCount = useMemo(() => games.filter((g) => g.state === "post").length, [games])

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

  const GreetingIcon = greeting?.Icon ?? Sunrise

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6 sm:pb-10">
      <header className="flex flex-col gap-4 pt-6 sm:pt-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <GreetingIcon className="h-4 w-4" aria-hidden="true" />
              <span>{greeting?.text ?? "Hello"}</span>
            </p>
            <h1 className="mt-0.5 font-mono text-3xl font-extrabold uppercase tracking-tight text-foreground sm:text-4xl">
              Sports Slate
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              <span>{today || "Loading…"}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs text-secondary-foreground">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Auto-updates · synced {updated || "…"}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <BriefingStat icon={Trophy} label="Games today" value={String(games.length)} />
          <BriefingStat
            icon={Flame}
            label="Live now"
            value={String(liveCount)}
            highlight={liveCount > 0}
            onClick={liveCount > 0 ? () => setFilter("live") : undefined}
          />
          <BriefingStat icon={Clock} label="Next start" value={nextUp || "…"} />
          <BriefingStat icon={CalendarDays} label="Finished" value={String(finalCount)} />
        </div>
      </header>

      <nav
        aria-label="Filter by league"
        className="sticky top-0 z-10 -mx-4 mb-6 mt-4 flex gap-2 overflow-x-auto border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
      >
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

function BriefingStat({
  icon: Icon,
  label,
  value,
  highlight,
  onClick,
}: {
  icon: typeof Trophy
  label: string
  value: string
  highlight?: boolean
  onClick?: () => void
}) {
  const inner = (
    <>
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${highlight ? "text-destructive" : "text-primary"}`} aria-hidden="true" />
        {label}
      </span>
      <span
        className={`mt-1 font-mono text-xl font-extrabold tabular-nums ${
          highlight ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex flex-col items-start rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-left transition-colors hover:bg-destructive/10"
      >
        {inner}
      </button>
    )
  }

  return <div className="flex flex-col rounded-xl border border-border bg-card p-3">{inner}</div>
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
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
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
