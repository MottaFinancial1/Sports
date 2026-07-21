"use client"

import { useEffect, useState } from "react"
import { Radio, Tv } from "lucide-react"
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
    return <span className="text-sm font-bold text-destructive">LIVE</span>
  }
  if (state === "post") {
    return <span className="text-sm font-semibold text-muted-foreground">Final</span>
  }
  return (
    <span className="text-sm font-bold tabular-nums text-foreground">
      {dateLabel ? <span className="font-semibold text-muted-foreground">{dateLabel} · </span> : null}
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
          <span className={`shrink-0 text-sm tabular-nums ${winner ? "font-bold" : "font-medium"} text-foreground`}>
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

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
            {game.leagueShort}
          </span>
          {game.week !== undefined ? (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Week {game.week}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <GameTime iso={game.date} state={game.state} />
          {game.state === "in" ? (
            <span className="text-xs font-medium text-muted-foreground">{game.statusDetail}</span>
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
                className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
              >
                {b}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Broadcast TBD</span>
        )}
      </div>
    </article>
  )
}
