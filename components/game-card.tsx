"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Radio, Tv } from "lucide-react"
import { BoxScore } from "@/components/box-score"
import type { Game, ProbablePitcher } from "@/lib/espn"

function GameTime({ iso, state }: { iso: string; state: Game["state"] }) {
  const [label, setLabel] = useState<string>("")
  const [dateLabel, setDateLabel] = useState<string>("")

  useEffect(() => {
    if (!iso) return
    const d = new Date(iso)
    setLabel(
      d.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    )
    // For games not on today's local date (future events), show the date too.
    const now = new Date()
    const isToday =
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    setDateLabel(isToday ? "" : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }))
  }, [iso])

  if (state === "in") {
    return (
      <span className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-destructive">
        <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden="true" />
        Live
      </span>
    )
  }
  if (state === "post") {
    return (
      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">Final</span>
    )
  }
  return (
    <span className="font-mono text-xs font-bold tabular-nums tracking-wide text-foreground">
      {dateLabel ? <span className="font-medium text-muted-foreground">{dateLabel} · </span> : null}
      {label || "--"}
    </span>
  )
}

function TeamRow({
  name,
  short,
  logo,
  score,
  record,
  winner,
  showScore,
  pitcher,
}: {
  name: string
  short: string
  logo?: string
  score?: string
  record?: string
  winner?: boolean
  showScore: boolean
  pitcher?: ProbablePitcher
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo || "/placeholder.svg"} alt="" className="h-6 w-6 shrink-0 object-contain" />
          ) : (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
              {short.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span
            className={`truncate text-sm ${winner ? "font-bold text-foreground" : "font-medium text-foreground"}`}
          >
            {name}
          </span>
          {record ? <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{record}</span> : null}
        </div>
        {showScore && score !== undefined ? (
          <span
            className={`shrink-0 font-mono text-base tabular-nums leading-none ${
              winner ? "font-extrabold text-primary" : "font-semibold text-foreground"
            }`}
          >
            {score}
          </span>
        ) : null}
      </div>
      {pitcher ? (
        <p className="truncate pl-8.5 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground/80">{pitcher.name}</span>
          {pitcher.record || pitcher.era ? (
            <span>
              {" "}
              ({[pitcher.record, pitcher.era ? `${pitcher.era} ERA` : undefined].filter(Boolean).join(", ")})
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}

export function GameCard({ game }: { game: Game }) {
  const showScore = game.state !== "pre"
  const isEvent = game.competitors.length !== 2

  const card = (
    <article
      className={`group flex h-full flex-col gap-3 rounded-lg border bg-card p-4 transition-all hover:border-primary/60 hover:shadow-[0_0_20px_-6px_var(--color-primary)] ${
        game.state === "in" ? "border-destructive/40" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="rounded-sm bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">
            {game.leagueShort}
          </span>
          {game.week !== undefined ? (
            <span className="rounded-sm bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
              Wk {game.week}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <GameTime iso={game.date} state={game.state} />
          {game.state === "in" ? (
            <span className="font-mono text-xs font-medium text-muted-foreground">{game.statusDetail}</span>
          ) : null}
          {game.link ? (
            <ExternalLink
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
              aria-hidden="true"
            />
          ) : null}
        </div>
      </div>

      {isEvent ? (
        <div className="flex flex-col gap-1">
          <p className="text-pretty text-sm font-semibold text-foreground">{game.name || game.shortName}</p>
          {game.note ? <p className="text-xs text-muted-foreground">{game.note}</p> : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {game.competitors.map((c, i) => (
            <TeamRow
              key={`${game.id}-${i}`}
              name={c.name}
              short={c.shortName}
              logo={c.logo}
              score={c.score}
              record={c.record}
              winner={c.winner}
              showScore={showScore}
              pitcher={game.state === "pre" ? c.probablePitcher : undefined}
            />
          ))}
        </div>
      )}

      <BoxScore game={game} />

      <div className="mt-auto flex items-start gap-2 border-t border-border pt-3">
        {game.state === "in" ? (
          <Radio className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        ) : (
          <Tv className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        )}
        {game.broadcasts.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {game.broadcasts.map((b) => (
              <span
                key={b}
                className="rounded-sm border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary"
              >
                {b}
              </span>
            ))}
          </div>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Broadcast TBD</span>
        )}
      </div>
    </article>
  )

  if (game.link) {
    return (
      <a
        href={game.link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${game.shortName || game.name} — open live stats and box score`}
        className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {card}
      </a>
    )
  }

  return card
}
