"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { Activity, Star } from "lucide-react"
import { AskSlate } from "@/components/ask-slate"
import { LiveCrawl } from "@/components/live-crawl"
import { AuthStatus } from "@/components/auth-status"
import { GameCard } from "@/components/game-card"
import { KeyDates } from "@/components/key-dates"
import { SportsNews } from "@/components/sports-news"
import { SportSpotlight, orderCategories, type CategoryStatus } from "@/components/sport-spotlight"
import { StandingsLeaderboard, F1DriverStandings, F1ConstructorStandings, PGALeaderboard } from "@/components/standings-leaderboard"
import { StarPerformers } from "@/components/star-performers"
import {
  LEAGUES,
  isFavoriteGame,
  type F1Constructor,
  type F1Driver,
  type Game,
  type LeagueCategory,
  type NewsArticle,
  type PGAPlayer,
  type SportsData,
  type StatcastHighlight,
} from "@/lib/espn"
import { getTeamViews, gameViewScore, type TeamViewMap } from "@/lib/team-views"

const fetcher = (url: string) => fetch(url).then((res) => res.json() as Promise<SportsData>)

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

export function SportsGuide({
  games: initialGames,
  news: initialNews,
  statcast: initialStatcast,
  f1Standings: initialF1Standings,
  pgaLeaderboard: initialPGALeaderboard,
  mlbStandings: initialMlbStandings,
  fetchedAt: initialFetchedAt,
}: {
  games: Game[]
  news: NewsArticle[]
  statcast: StatcastHighlight[]
  f1Standings: { drivers: F1Driver[]; constructors: F1Constructor[] }
  pgaLeaderboard: PGAPlayer[]
  mlbStandings: import("@/lib/espn").MLBStandingTeam[]
  fetchedAt: string
}) {
  const { data } = useSWR<SportsData>("/api/games", fetcher, {
    fallbackData: { games: initialGames, news: initialNews, statcast: initialStatcast, f1Standings: initialF1Standings, pgaLeaderboard: initialPGALeaderboard, mlbStandings: initialMlbStandings, fetchedAt: initialFetchedAt },
    refreshInterval: 60_000,
    refreshWhenHidden: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const games = data?.games ?? initialGames
  const news = data?.news ?? initialNews
  const statcast = data?.statcast ?? initialStatcast
  const f1Standings = data?.f1Standings ?? initialF1Standings
  const pgaLeaderboard = data?.pgaLeaderboard ?? initialPGALeaderboard
  const mlbStandings = data?.mlbStandings ?? initialMlbStandings
  const fetchedAt = data?.fetchedAt ?? initialFetchedAt

  const [filter, setFilter] = useState<Filter>("all")
  const [today, setToday] = useState<string>("")
  const [updated, setUpdated] = useState<string>("")
  const [teamViews, setTeamViews] = useState<TeamViewMap>({})

  useEffect(() => {
    setTeamViews(getTeamViews())
  }, [])

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
  }, [fetchedAt])

  const liveCount = useMemo(() => games.filter((g) => g.state === "in").length, [games])

  const activeLeagues = useMemo(() => {
    const ids = new Set(games.map((g) => g.leagueId))
    return LEAGUES.filter((l) => ids.has(l.id))
  }, [games])

  const favoriteGames = useMemo(
    () =>
      games.filter(isFavoriteGame).sort((a, b) => {
        const viewDiff =
          gameViewScore(b.competitors.map((c) => c.name), teamViews) -
          gameViewScore(a.competitors.map((c) => c.name), teamViews)
        if (viewDiff !== 0) return viewDiff
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      }),
    [games, teamViews],
  )

  const mostWatchedGames = useMemo(() => {
    if (Object.keys(teamViews).length === 0) return []
    return games
      .filter((g) => !isFavoriteGame(g))
      .map((g) => ({ game: g, score: gameViewScore(g.competitors.map((c) => c.name), teamViews) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ game }) => game)
  }, [games, teamViews])

  const filtered = useMemo(() => {
    if (filter === "all") return games
    if (filter === "live") return games.filter((g) => g.state === "in")
    if (filter === "favorites") return games.filter(isFavoriteGame)
    if (filter.startsWith("cat:")) return games.filter((g) => g.category === filter.slice(4))
    return games.filter((g) => g.leagueId === filter)
  }, [games, filter])

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
      arr.sort((a, b) => {
        const viewDiff =
          gameViewScore(b.competitors.map((c) => c.name), teamViews) -
          gameViewScore(a.competitors.map((c) => c.name), teamViews)
        if (viewDiff !== 0) return viewDiff
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      })
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
  }, [filtered, teamViews])

  return (
    <div className="relative z-[1] mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">

      {/* Top bar */}
      <div className="-mx-4 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          {/* Wordmark */}
          <span className="text-sm font-black tracking-tight text-foreground">
            Ball<span className="text-primary">Knowledge</span>
          </span>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:block">
            {today || "—"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-destructive">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
              {liveCount} Live
            </span>
          )}
          <AuthStatus />
        </div>
      </div>

      {/* Hero header */}
      <header className="data-grid relative overflow-hidden rounded-2xl border border-primary/10 bg-card/60 px-5 pb-7 pt-8 sm:px-8 sm:pb-9 sm:pt-12">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" />
            </div>
            <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-primary">
              Sports Intelligence Platform
            </span>
          </div>
          <h1 className="text-5xl font-black leading-none tracking-tight text-foreground sm:text-7xl">
            Ask Ball<br />
            <span className="text-primary">Knowledge.</span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
            Live scores, standings, breaking news, and AI-powered answers for the passionate sports fan.
          </p>
        </div>
      </header>

      {/* Filter nav */}
      <nav
        aria-label="Filter by league"
        className="sticky top-0 z-10 -mx-4 mb-8 flex gap-1.5 overflow-x-auto border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
      >
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All ({games.length})
        </FilterChip>
        <FilterChip active={filter === "live"} onClick={() => setFilter("live")} highlight={liveCount > 0}>
          {liveCount > 0 && <span className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-destructive" />}
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

      {/* Live scores / upcoming crawl */}
      <LiveCrawl games={games} />

      {/* Two-column layout: sticky Ask panel left, scrollable content right */}
      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">

        {/* LEFT — sticky Ask Ball Knowledge */}
        <div className="w-full lg:sticky lg:top-[100px] lg:w-[380px] lg:shrink-0 xl:w-[420px]">
          <AskSlate />
        </div>

        {/* RIGHT — scrollable content feed */}
        <div className="min-w-0 flex-1">

          {/* Biggest News — first thing visible */}
          {filter === "all" ? <SportsNews articles={news} /> : null}

          {filter === "all" ? (
            <div className="mt-8">
              <SportSpotlight
                games={games}
                priority={CATEGORY_ORDER}
                onFilterLeague={(category) => setFilter(`cat:${category}`)}
              />
            </div>
          ) : null}

          {filter === "all" && mostWatchedGames.length > 0 ? (
            <section className="mb-10">
              <SectionLabel>Most Watched</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {mostWatchedGames.map((g) => (
                  <GameCard key={`mw-${g.id}`} game={g} />
                ))}
              </div>
            </section>
          ) : null}

          {filter === "all" && favoriteGames.length > 0 ? (
            <section className="mb-10">
              <SectionLabel icon={<Star className="h-3.5 w-3.5 fill-primary text-primary" />}>
                Favorites
              </SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {favoriteGames.map((g) => (
                  <GameCard key={`fav-${g.id}`} game={g} />
                ))}
              </div>
            </section>
          ) : null}

          {filter === "all" || filter === "live" ? <StarPerformers games={games} statcast={statcast} /> : null}

          {filter === "all" ? (
            <>
              <F1DriverStandings drivers={f1Standings.drivers} />
              <F1ConstructorStandings constructors={f1Standings.constructors} />
            </>
          ) : null}

          {filter === "all" ? <PGALeaderboard players={pgaLeaderboard} /> : null}
          {filter === "all" ? <StandingsLeaderboard standings={mlbStandings} /> : null}
          {filter === "all" ? <KeyDates /> : null}

          {grouped.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
              <p className="text-sm font-bold text-foreground">No games right now</p>
              <p className="mt-1 text-xs text-muted-foreground">Refreshes automatically every 60s.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {grouped.map(({ category, status, leagues }) => (
                <section key={category} className={status === "done" || status === "scheduled" ? "opacity-70" : ""}>
                  <div className="mb-4 flex items-center gap-2.5">
                    <span
                      className={`h-4 w-1 rounded-full ${status === "live" ? "bg-destructive" : "bg-primary"}`}
                      aria-hidden="true"
                    />
                    <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground/70">
                      {category}
                    </h2>
                    <CategoryBadge status={status} />
                    <span className="h-px flex-1 bg-border" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col gap-6">
                    {leagues.map(({ league, games: leagueGames }) => (
                      <div key={league.id}>
                        <h3 className="mb-3 flex items-baseline gap-2 text-sm font-bold text-foreground">
                          {league.label}
                          <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-muted-foreground">
                            {leagueGames.length}
                          </span>
                        </h3>
                        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${leagueGames.length >= 6 ? "lg:grid-cols-3" : ""}`}>
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
      </div>
    </div>
  )
}

function SectionLabel({
  children,
  icon,
}: {
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
      {icon}
      {children}
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </h2>
  )
}

function CategoryBadge({ status }: { status: CategoryStatus }) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-destructive">
        <span className="live-dot inline-block h-1 w-1 rounded-full bg-destructive" aria-hidden="true" />
        Live
      </span>
    )
  }
  if (status === "soon") {
    return (
      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
        Up Next
      </span>
    )
  }
  if (status === "done") {
    return (
      <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Final
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
      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-all ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : highlight
            ? "border-destructive/30 bg-destructive/8 text-destructive hover:bg-destructive/15"
            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
      }`}
    >
      {children}
    </button>
  )
}
