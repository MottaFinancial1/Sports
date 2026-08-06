"use client"

import { Zap, Sparkles } from "lucide-react"
import type { Game, GameLeader, StatcastHighlight } from "@/lib/espn"

interface PerformerEntry extends GameLeader {
  gameShortName: string
  gameLink?: string
  statusDetail: string
}

export function StarPerformers({ games, statcast }: { games: Game[]; statcast: StatcastHighlight[] }) {
  const seen = new Set<string>()
  const performers: PerformerEntry[] = []
  for (const g of games) {
    if (g.state !== "in" || !g.leaders) continue
    for (const l of g.leaders) {
      if (seen.has(l.athlete)) continue
      seen.add(l.athlete)
      performers.push({ ...l, gameShortName: g.shortName, gameLink: g.link, statusDetail: g.statusDetail })
    }
  }
  const top = performers.slice(0, 8)

  if (top.length === 0 && statcast.length === 0) return null

  return (
    <section className="mb-10 flex flex-col gap-8">
      {statcast.length > 0 ? (
        <div>
          <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            <Zap className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
            Statcast Watch
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {statcast.map((h) => (
              <a
                key={h.id}
                href={h.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                    {h.event || "Hard Hit"}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {h.matchup}
                  </span>
                </div>
                <p className="text-sm font-bold leading-snug text-foreground">{h.player}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs tabular-nums">
                  {h.exitVelo !== undefined ? (
                    <span className="text-primary">
                      <span className="font-extrabold">{h.exitVelo.toFixed(1)}</span>
                      <span className="text-muted-foreground"> mph EV</span>
                    </span>
                  ) : null}
                  {h.distance !== undefined && h.distance > 100 ? (
                    <span className="text-primary">
                      <span className="font-extrabold">{Math.round(h.distance)}</span>
                      <span className="text-muted-foreground"> ft</span>
                    </span>
                  ) : null}
                  {h.launchAngle !== undefined ? (
                    <span className="text-muted-foreground">
                      {h.launchAngle.toFixed(0)}
                      {"°"} LA
                    </span>
                  ) : null}
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{h.description}</p>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {top.length > 0 ? (
        <div>
          <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
            Star Performers — Live
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {top.map((p) => {
              const inner = (
                <>
                  {p.headshot ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.headshot || "/placeholder.svg"}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full bg-secondary object-cover ring-2 ring-primary/20"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary"
                    >
                      {p.shortName
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-bold text-foreground">{p.athlete}</span>
                      {p.team ? (
                        <span className="font-mono text-[10px] font-semibold uppercase text-muted-foreground">
                          {p.team}
                        </span>
                      ) : null}
                    </span>
                    <span className="truncate font-mono text-xs font-semibold text-primary">{p.value}</span>
                  </span>
                  <span className="hidden shrink-0 flex-col items-end sm:flex">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {p.gameShortName}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[10px] text-destructive">
                      <span className="live-dot inline-block h-1 w-1 rounded-full bg-destructive" />
                      {p.statusDetail}
                    </span>
                  </span>
                </>
              )
              const className =
                "flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:border-primary/30 hover:shadow-sm"
              return p.gameLink ? (
                <a
                  key={p.athlete}
                  href={p.gameLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
                >
                  {inner}
                </a>
              ) : (
                <div key={p.athlete} className={className}>
                  {inner}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </section>
  )
}
