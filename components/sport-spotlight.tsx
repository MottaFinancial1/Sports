"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Zap } from "lucide-react"
import { isFavoriteGame, type Game, type LeagueCategory } from "@/lib/espn"

export type CategoryStatus = "live" | "soon" | "scheduled" | "done"

const SOON_WINDOW_MS = 48 * 60 * 60 * 1000

export function categoryStatus(games: Game[], now: number): CategoryStatus {
  if (games.some((g) => g.state === "in")) return "live"
  const upcoming = games
    .filter((g) => g.state === "pre")
    .map((g) => new Date(g.date).getTime())
    .filter((t) => t > now)
  if (upcoming.length === 0) return "done"
  return Math.min(...upcoming) - now <= SOON_WINDOW_MS ? "soon" : "scheduled"
}

const STATUS_RANK: Record<CategoryStatus, number> = { live: 0, soon: 1, scheduled: 2, done: 3 }

export function orderCategories(
  categories: { category: LeagueCategory; games: Game[] }[],
  priority: LeagueCategory[],
  now: number,
): { category: LeagueCategory; status: CategoryStatus }[] {
  return categories
    .map(({ category, games }) => ({ category, status: categoryStatus(games, now) }))
    .sort((a, b) => {
      const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status]
      if (rank !== 0) return rank
      return priority.indexOf(a.category) - priority.indexOf(b.category)
    })
}

function pickFeaturedGame(games: Game[], now: number): Game | undefined {
  const live = games.filter((g) => g.state === "in")
  if (live.length > 0) {
    return live.find(isFavoriteGame) ?? live[0]
  }
  return games
    .filter((g) => g.state === "pre" && new Date(g.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
}

function Countdown({ iso }: { iso: string }) {
  const [label, setLabel] = useState("")

  useEffect(() => {
    const compute = () => {
      const ms = new Date(iso).getTime() - Date.now()
      if (ms <= 0) { setLabel("Starting now"); return }
      const d = Math.floor(ms / 86_400_000)
      const h = Math.floor((ms % 86_400_000) / 3_600_000)
      const m = Math.floor((ms % 3_600_000) / 60_000)
      setLabel(d > 0 ? `in ${d}d ${h}h` : h > 0 ? `in ${h}h ${m}m` : `in ${m}m`)
    }
    compute()
    const t = setInterval(compute, 60_000)
    return () => clearInterval(t)
  }, [iso])

  return <span className="font-mono text-xs font-bold tabular-nums text-primary">{label || "…"}</span>
}

function SpotlightCard({
  category,
  status,
  games,
  onViewAll,
}: {
  category: LeagueCategory
  status: CategoryStatus
  games: Game[]
  onViewAll: () => void
}) {
  const now = Date.now()
  const featured = pickFeaturedGame(games, now)
  if (!featured) return null

  const liveCount = games.filter((g) => g.state === "in").length
  const isLive = status === "live"
  const isEvent = featured.competitors.length !== 2

  const inner = (
    <article
      className={`group relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border p-5 transition-all hover:shadow-md ${
        isLive
          ? "border-destructive/30 bg-destructive/4"
          : "border-primary/25 bg-primary/4"
      }`}
    >
      {/* Top accent */}
      <div className={`absolute inset-x-0 top-0 h-0.5 rounded-t-xl ${isLive ? "bg-destructive" : "bg-primary"}`} />

      <div className="flex items-center justify-between gap-2">
        <span
          className={`font-mono text-[11px] font-extrabold uppercase tracking-widest ${
            isLive ? "text-destructive" : "text-primary"
          }`}
        >
          {category}
        </span>
        {isLive ? (
          <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-destructive">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden="true" />
            {liveCount > 1 ? `${liveCount} live` : "Live"}
          </span>
        ) : (
          <Countdown iso={featured.date} />
        )}
      </div>

      {isEvent ? (
        <div className="flex flex-1 flex-col justify-center gap-1">
          <p className="text-pretty text-lg font-bold leading-snug text-foreground">
            {featured.name || featured.shortName}
          </p>
          {featured.venue ? <p className="text-xs text-muted-foreground">{featured.venue}</p> : null}
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-3">
          {featured.competitors.map((c, i) => (
            <div key={`${featured.id}-sp-${i}`} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                {c.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logo || "/placeholder.svg"} alt="" className="h-8 w-8 shrink-0 object-contain" />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                    {c.shortName.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className={`truncate text-base ${c.winner ? "font-bold text-foreground" : "font-semibold text-foreground/80"}`}>
                  {c.name}
                </span>
              </div>
              {featured.state !== "pre" && c.score !== undefined ? (
                <span
                  className={`shrink-0 font-mono text-2xl font-extrabold tabular-nums leading-none ${
                    c.winner ? "text-primary" : "text-foreground/60"
                  }`}
                >
                  {c.score}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {isLive
            ? featured.statusDetail
            : featured.broadcasts.slice(0, 2).join(" · ") || "Broadcast TBD"}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onViewAll()
          }}
          className="flex shrink-0 items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-wider text-primary transition-colors hover:text-foreground"
        >
          All {category}
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </article>
  )

  if (featured.link) {
    return (
      <a
        href={featured.link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${featured.shortName || featured.name} — open live stats`}
        className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {inner}
      </a>
    )
  }
  return inner
}

export function SportSpotlight({
  games,
  priority,
  onFilterLeague,
}: {
  games: Game[]
  priority: LeagueCategory[]
  onFilterLeague: (category: LeagueCategory) => void
}) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => setNow(Date.now()), [games])

  const spotlights = useMemo(() => {
    if (now === null) return []
    const byCategory = new Map<LeagueCategory, Game[]>()
    for (const g of games) {
      const arr = byCategory.get(g.category) ?? []
      arr.push(g)
      byCategory.set(g.category, arr)
    }
    const ordered = orderCategories(
      Array.from(byCategory, ([category, gs]) => ({ category, games: gs })),
      priority,
      now,
    )
    return ordered
      .filter((c) => c.status === "live" || c.status === "soon")
      .slice(0, 2)
      .map((c) => ({ ...c, games: byCategory.get(c.category)! }))
  }, [games, priority, now])

  if (spotlights.length === 0) return null

  return (
    <section className="mb-10">
      <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        <Zap className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
        Your Sports Right Now
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </h2>
      <div className={`grid grid-cols-1 gap-3 ${spotlights.length > 1 ? "lg:grid-cols-2" : ""}`}>
        {spotlights.map((s) => (
          <SpotlightCard
            key={s.category}
            category={s.category}
            status={s.status}
            games={s.games}
            onViewAll={() => onFilterLeague(s.category)}
          />
        ))}
      </div>
    </section>
  )
}
