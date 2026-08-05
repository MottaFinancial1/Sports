"use client"

import { useMemo, useRef, useState } from "react"
import type { Game } from "@/lib/espn"

interface CrawlItem {
  id: string
  league: string
  label: string
  score?: string
  status: string
  state: "in" | "pre" | "post"
}

function buildItems(games: Game[]): CrawlItem[] {
  const live = games
    .filter((g) => g.state === "in")
    .sort((a, b) => {
      // Prioritise bigger sports first using the same category weight
      const order = ["Baseball", "Football", "Basketball", "Soccer", "Motorsport", "Golf", "Tennis"]
      return order.indexOf(a.category) - order.indexOf(b.category)
    })
    .map<CrawlItem>((g) => {
      const [away, home] = g.competitors.length === 2
        ? [g.competitors.find((c) => !c.isHome), g.competitors.find((c) => c.isHome)]
        : [g.competitors[0], g.competitors[1]]
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

  const upcoming = games
    .filter((g) => g.state === "pre")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 12)
    .map<CrawlItem>((g) => {
      const [away, home] = g.competitors.length === 2
        ? [g.competitors.find((c) => !c.isHome), g.competitors.find((c) => c.isHome)]
        : [g.competitors[0], g.competitors[1]]
      const time = new Date(g.date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
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
  const items = useMemo(() => buildItems(games), [games])
  const [paused, setPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

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
