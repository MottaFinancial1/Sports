"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { RefreshCw, Star, Sunrise, Sun, Moon } from "lucide-react"
import { AskSlate } from "@/components/ask-slate"
import { GameCard } from "@/components/game-card"
import { SportsNews } from "@/components/sports-news"
import { SportSpotlight, orderCategories, type CategoryStatus } from "@/components/sport-spotlight"
import { StandingsLeaderboard } from "@/components/standings-leaderboard"
import { StarPerformers } from "@/components/star-performers"
import {
  LEAGUES,
  isFavoriteGame,
  type Game,
  type LeagueCategory,
  type NewsArticle,
  type SportsData,
  type StatcastHighlight,
} from "@/lib/espn"

const fetcher = (url: string) => fetch(url).then((res) => res.json() as Promise<SportsData>)

// Personalized priority: baseball first, then football, soccer, F1, golf,
// tennis, basketball.
const CATEGORY_ORDER: LeagueCategory[] = [
  "Baseball",
  "Football",
  "Soccer",
  "Motorsport",
  "Golf",
  "Tennis",
  "Basketball",
]

type Filter = "all" | "live" | string

function greetingForHour(hour: number) {
  if (hour < 12) return { text: "Good morning", Icon: Sunrise }
  if (hour < 17) return { text: "Good afternoon", Icon: Sun }
  return { text: "Good evening", Icon: Moon }
}

export function SportsGuide({
  games: initialGames,
  news: initialNews,
  statcast: initialStatcast,
  fetchedAt: initialFetchedAt,
}: {
  games: Game[]
  news: NewsArticle[]
  statcast: StatcastHighlight[]
  fetchedAt: string
}) {
  // Poll for fresh data every 60s, revalidate when the tab regains focus or
  // the network reconnects, and keep polling in background tabs. The
  // server-rendered payload seeds the cache so there is never a blank state.
  const { data } = useSWR<SportsData>("/api/games", fetcher, {
    fallbackData: { games: initialGames, news: initialNews, statcast: initialStatcast, fetchedAt: initialFetchedAt },
    refreshInterval: 60_000,
    refreshWhenHidden: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const games = data?.games ?? initialGames
  const news = data?.news ?? initialNews
  const statcast = data?.statcast ?? initialStatcast
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

  const favoriteGames = useMemo(
    () =>
      games.filter(isFavoriteGame).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [games],
  )

  const filtered = useMemo(() => {
    if (filter === "all") return games
    if (filter === "live") return games.filter((g) => g.state === "in")
    if (filter === "favorites") return games.filter(isFavoriteGame)
    if (filter.startsWith("cat:")) return games.filter((g) => g.category === filter.slice(4))
    return games.filter((g) => g.leagueId === filter)
  }, [games, filter])

  // Sort games by start time within each league, then order categories by
  // activity (live first, then starting soon, then scheduled, idle last),
  // with ties broken by personal priority. The homepage reshapes itself
  // around whatever sports are actually in action.
  const grouped = useMemo(() => {
    const byLeague = new Map<string, Game[]>()
    const byCategory = new Map<LeagueCategory, Game[]>()
    for (const g of filtered) {
      const arr = byLeague.get(g.leagueId) ?? []
      arr.push(g)
      byLeague.set(g.leagueId, arr)
      const catArr = byCategory.get(g.category) ?? []
      catArr.push(g)
      byCategory.set(g.category, catArr)
    }
    for (const arr of byLeague.values()) {
      arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    const ordered = orderCategories(
      Array.from(byCategory, ([category, gs]) => ({ category, games: gs })),
      CATEGORY_ORDER,
      Date.now(),
    )

    return ordered
      .map(({ category, status }) => {
        const leaguesInCat = LEAGUES.filter((l) => l.category === category && byLeague.has(l.id))
        return {
          category,
          status,
          leagues: leaguesInCat.map((l) => ({ league: l, games: byLeague.get(l.id)! })),
        }
      })
      .filter((c) => c.leagues.length > 0)
  }, [filtered])

  const GreetingIcon = greeting?.Icon ?? Sunrise

  return (
    <div className="relative z-[1] mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
      {/* Status bar */}
      <div className="-mx-4 grid grid-cols-[1fr_auto_1fr] items-center border-b border-border px-4 py-2.5 sm:-mx-6 sm:px-6">
        {/* Left — greeting icon + short label */}
        <span className="flex items-center gap-1.5">
          <GreetingIcon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground/60">
            {greeting?.text ?? "—"}
          </span>
        </span>

        {/* Center — date */}
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-foreground/80">
          {today || "—"}
        </span>

        {/* Right — sync time only */}
        <span className="flex items-center justify-end gap-1.5 text-primary/70">
          <RefreshCw className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]">
            {updated || "—"}
          </span>
        </span>
      </div>

      <header className="flex flex-col gap-5 pt-8 sm:pt-12">
        <div className="border-l-2 border-primary pl-4">
          <h1 className="font-mono text-5xl font-black uppercase leading-none tracking-tighter text-foreground sm:text-7xl">
            Ball<span className="text-primary">_</span>Knowledge
          </h1>
        </div>
      </header>

      <nav
        aria-label="Filter by league"
        className="sticky top-0 z-10 -mx-4 mb-6 mt-4 flex gap-1.5 overflow-x-auto border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6"
      >
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All ({games.length})
        </FilterChip>
        <FilterChip active={filter === "live"} onClick={() => setFilter("live")} highlight={liveCount > 0}>
          Live ({liveCount})
        </FilterChip>
        {favoriteGames.length > 0 ? (
          <FilterChip active={filter === "favorites"} onClick={() => setFilter("favorites")}>
            Favorites ({favoriteGames.length})
          </FilterChip>
        ) : null}
        {activeLeagues.map((l) => (
          <FilterChip key={l.id} active={filter === l.id} onClick={() => setFilter(l.id)}>
            {l.shortLabel}
          </FilterChip>
        ))}
      </nav>

      {filter === "all" ? (
        <SportSpotlight
          games={games}
          priority={CATEGORY_ORDER}
          onFilterLeague={(category) => setFilter(`cat:${category}`)}
        />
      ) : null}

      {filter === "all" ? <AskSlate /> : null}

      {filter === "all" && favoriteGames.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            <Star className="h-3 w-3 fill-primary" aria-hidden="true" />
            Favorites
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteGames.map((g) => (
              <GameCard key={`fav-${g.id}`} game={g} />
            ))}
          </div>
        </section>
      ) : null}

      {filter === "all" ? (
        <>
          <StandingsLeaderboard games={games.filter((g) => g.leagueId === "f1")} leagueId="f1" />
          <StandingsLeaderboard games={games.filter((g) => g.leagueId === "mlb")} leagueId="mlb" />
          <StandingsLeaderboard games={games.filter((g) => g.leagueId === "pga")} leagueId="pga" />
        </>
      ) : null}

      {filter === "all" || filter === "live" ? <StarPerformers games={games} statcast={statcast} /> : null}

      {filter === "all" ? <SportsNews articles={news} /> : null}

      {grouped.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">No games</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground/60">Refreshes automatically.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {grouped.map(({ category, status, leagues }) => (
            <section key={category} className={status === "done" || status === "scheduled" ? "opacity-75" : ""}>
              <h2 className="mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                <span
                  className={`inline-block h-3 w-1 ${status === "live" ? "bg-destructive" : "bg-primary"}`}
                  aria-hidden="true"
                />
                {category}
                <CategoryBadge status={status} />
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
              </h2>
              <div className="flex flex-col gap-6">
                {leagues.map(({ league, games: leagueGames }) => (
                  <div key={league.id}>
                    <h3 className="mb-3 flex items-baseline gap-2 text-sm font-bold text-foreground">
                      {league.label}
                      <span className="font-mono text-xs font-medium tabular-nums text-muted-foreground">
                        {String(leagueGames.length).padStart(2, "0")}
                      </span>
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

function CategoryBadge({ status }: { status: CategoryStatus }) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1 rounded-sm bg-destructive/15 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-destructive">
        <span className="live-dot inline-block h-1 w-1 rounded-full bg-destructive" aria-hidden="true" />
        Live
      </span>
    )
  }
  if (status === "soon") {
    return (
      <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
        Up Next
      </span>
    )
  }
  if (status === "done") {
    return (
      <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Wrapped
      </span>
    )
  }
  return null
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
      className={`shrink-0 whitespace-nowrap rounded-sm border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : highlight
            ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
            : "border-border bg-card text-secondary-foreground hover:border-primary/50 hover:text-primary"
      }`}
    >
      {children}
    </button>
  )
}
