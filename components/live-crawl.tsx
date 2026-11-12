"use client"

import { useEffect, useRef, useState } from "react"
import type { Game } from "@/lib/espn"
import { getSeasonalCategoryOrder } from "@/lib/season"

interface CrawlItem {
  id: string
  league: string
  label: string
  score?: string
  status: string
  state: "in" | "pre" | "post"
}

// Tennis rounds that signal top players are still in the draw
const TENNIS_LATE_ROUNDS = new Set([
  "quarterfinals", "quarter-finals", "quarter finals",
  "semifinals", "semi-finals", "semi finals",
  "final", "finals",
])

/** Per-game filter rules for the ticker. Returns false to exclude. */
function passesTickerRules(g: Game): boolean {
  // Soccer is already limited to a rolling week of fixtures upstream, which
  // keeps international windows (Nations League, qualifiers, friendlies) in play.
  if (g.category === "Soccer") return true

  // Golf (PGA): live events only — no upcoming, and cap to 3 entries handled later
  if (g.leagueId === "pga") {
    return g.state === "in"
  }

  // Tennis (ATP/WTA): only late-round matches (QF, SF, Final) — top players still in
  if (g.leagueId === "atp" || g.leagueId === "wta") {
    if (!g.round) return false
    return TENNIS_LATE_ROUNDS.has(g.round.toLowerCase())
  }

  return true
}

function buildItems(games: Game[]): CrawlItem[] {
  const now = Date.now()
  const sevenDays = now + 7 * 24 * 60 * 60 * 1000

  const filtered = games.filter(passesTickerRules)
  const categoryOrder = getSeasonalCategoryOrder(games)
  const sportRank = (g: Game) => categoryOrder.indexOf(g.category)

  // Live games — sorted by sport priority, golf capped at 3
  const liveByLeague = new Map<string, number>()
  const live = filtered
    .filter((g) => g.state === "in")
    .sort((a, b) => sportRank(a) - sportRank(b))
    .filter((g) => {
      if (g.leagueId === "pga") {
        const count = liveByLeague.get("pga") ?? 0
        if (count >= 3) return false
        liveByLeague.set("pga", count + 1)
      }
      return true
    })
    .map<CrawlItem>((g) => {
      const away = g.competitors.find((c) => !c.isHome) ?? g.competitors[0]
      const home = g.competitors.find((c) => c.isHome) ?? g.competitors[1]
      const score =
        away?.score && home?.score ? `${away.score}–${home.score}` : undefined
      return {
        id: g.id,
        league: g.leagueShort,
        label: `${away?.shortName ?? "?"} vs ${home?.shortName ?? "?"}`,
        score,
        status: g.statusDetail,
        state: "in",
      }
    })

  // Upcoming — today's games first, then within next 7 days
  const upcoming = filtered
    .filter((g) => {
      if (g.state !== "pre") return false
      const t = new Date(g.date).getTime()
      return t >= now && t <= sevenDays
    })
    .sort((a, b) => {
      // Today's games always come before future games in the ticker
      const aIsToday = a.isToday ?? false
      const bIsToday = b.isToday ?? false
      if (aIsToday && !bIsToday) return -1
      if (!aIsToday && bIsToday) return 1
      if (aIsToday && bIsToday && sportRank(a) !== sportRank(b)) return sportRank(a) - sportRank(b)
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })
    .slice(0, 14)
    .map<CrawlItem>((g) => {
      const away = g.competitors.find((c) => !c.isHome) ?? g.competitors[0]
      const home = g.competitors.find((c) => c.isHome) ?? g.competitors[1]
      const gameDate = new Date(g.date)
      const isToday = gameDate.toDateString() === new Date().toDateString()
      const time = isToday
        ? gameDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : gameDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) +
          " " +
          gameDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      return {
        id: g.id,
        league: g.leagueShort,
        label: `${away?.shortName ?? "?"} vs ${home?.shortName ?? "?"}`,
        status: time,
        state: "pre",
      }
    })

  return [...live, ...upcoming]
}

export function LiveCrawl({ games }: { games: Game[] }) {
  // buildItems uses Date.now() + locale formatting — must be client-only to
  // avoid server/client timezone mismatch that causes hydration errors.
  const [items, setItems] = useState<CrawlItem[]>([])
  const [paused, setPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setItems(buildItems(games))
  }, [games])

  if (items.length === 0) return null

  // Duplicate the list so the marquee loops seamlessly
  const doubled = [...items, ...items]

  return (
    <div
      className="sticky top-[48px] z-10 -mx-4 border-b border-primary/10 bg-background/98 backdrop-blur sm:-mx-6"
      aria-label="Live scores and upcoming games ticker"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Left fade + LIVE badge */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center">
        <div className="flex h-full items-center bg-background/98 pl-4 pr-3 sm:pl-6">
          <span className="flex items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-destructive">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden="true" />
            Ticker
          </span>
        </div>
        <div className="h-full w-8 bg-gradient-to-r from-background/98 to-transparent" />
      </div>

      {/* Right fade */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background/98 to-transparent" />

      {/* Scrolling track */}
      <div className="overflow-hidden py-2.5">
        <div
          ref={trackRef}
          className="flex gap-0"
          style={{
            animation: `ticker-scroll 55s linear infinite`,
            animationPlayState: paused ? "paused" : "running",
            width: "max-content",
          }}
        >
          {doubled.map((item, i) => (
            <CrawlChip key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

function CrawlChip({ item }: { item: CrawlItem }) {
  return (
    <div className="mx-5 flex shrink-0 items-center gap-2">
      {/* League tag */}
      <span
        className={`rounded px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-[0.15em] ${
          item.state === "in"
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/8 text-primary"
        }`}
      >
        {item.league}
      </span>

      {/* Match label */}
      <span className="font-mono text-[11px] font-bold text-foreground">{item.label}</span>

      {/* Score or time */}
      {item.score ? (
        <span className="font-mono text-[11px] font-black tabular-nums text-foreground">
          {item.score}
        </span>
      ) : null}

      {/* Status */}
      <span
        className={`font-mono text-[9px] font-semibold tabular-nums ${
          item.state === "in" ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {item.status}
      </span>

      {/* Separator dot */}
      <span className="h-1 w-1 rounded-full bg-border" aria-hidden="true" />
    </div>
  )
}
