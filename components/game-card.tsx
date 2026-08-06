"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Radio, Tv } from "lucide-react"
import type { Game, ProbablePitcher } from "@/lib/espn"
import { recordTeamView } from "@/lib/team-views"
import { getGameVibe, type VibeTone } from "@/lib/game-vibe"

const VIBE_TONE_CLASS: Record<VibeTone, string> = {
  hot: "border-destructive/40 bg-destructive/8 text-destructive",
  tight: "border-primary/40 bg-primary/8 text-primary",
  cool: "border-border bg-secondary text-secondary-foreground",
  neutral: "border-border bg-muted/40 text-muted-foreground",
}

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
  pitcherLabel,
  sets,
  isTennis,
}: {
  name: string
  short: string
  logo?: string
  score?: string
  record?: string
  winner?: boolean
  showScore: boolean
  pitcher?: ProbablePitcher
  pitcherLabel?: string
  sets?: string[]
  isTennis?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo || "/placeholder.svg"} alt="" className="h-6 w-6 shrink-0 object-contain" />
          ) : (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">
              {short.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span
            className={`truncate text-sm ${winner ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}
          >
            {name}
          </span>
          {record && !isTennis ? (
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{record}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isTennis && sets && sets.length > 0 ? (
            <div className="flex items-center gap-1">
              {sets.map((s, i) => (
                <span
                  key={i}
                  className={`rounded px-1 font-mono text-xs tabular-nums ${
                    winner ? "font-bold text-primary" : "text-muted-foreground"
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          ) : null}
          {showScore && score !== undefined ? (
            <span
              className={`font-mono text-base tabular-nums leading-none ${
                winner ? "font-extrabold text-primary" : "font-semibold text-foreground/70"
              }`}
            >
              {score}
            </span>
          ) : null}
        </div>
      </div>
      {pitcher ? (
        <p className="truncate pl-[34px] text-xs text-muted-foreground">
          {pitcherLabel ? (
            <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">{pitcherLabel}</span>
          ) : null}
          <span className="font-semibold text-foreground/70">{pitcher.name}</span>
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
  const isTennis = game.category === "Tennis"
  const vibe = getGameVibe(game)
  const isLive = game.state === "in"

  const card = (
    <article
      className={`group flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-all hover:shadow-md ${
        isLive
          ? "border-destructive/30 shadow-sm"
          : "border-border hover:border-primary/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {game.leagueShort}
          </span>
          {game.week !== undefined ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
              Wk {game.week}
            </span>
          ) : null}
          {vibe ? (
            <span
              className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${VIBE_TONE_CLASS[vibe.tone]}`}
            >
              {vibe.label}
            </span>
          ) : null}
          {isTennis && game.round ? (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {game.round}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <GameTime iso={game.date} state={game.state} />
          {game.state === "in" ? (
            <span className="font-mono text-[10px] font-medium text-muted-foreground">{game.statusDetail}</span>
          ) : null}
          {game.link ? (
            <ExternalLink
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary"
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
        <div className="flex flex-col gap-2.5">
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
              pitcher={game.category === "Baseball" ? c.probablePitcher : undefined}
              pitcherLabel={game.category === "Baseball" ? (game.state === "in" ? "pitching" : "probable") : undefined}
              sets={isTennis ? c.sets : undefined}
              isTennis={isTennis}
            />
          ))}
        </div>
      )}

      <div className="mt-auto flex items-start gap-2 border-t border-border pt-3">
        {game.state === "in" ? (
          <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        ) : (
          <Tv className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        {game.broadcasts.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {game.broadcasts.map((b) => (
              <span
                key={b}
                className="rounded-full border border-primary/20 bg-primary/8 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary"
              >
                {b}
              </span>
            ))}
          </div>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/60">Broadcast TBD</span>
        )}
      </div>
    </article>
  )

  const teamNames = game.competitors.map((c) => c.name)
  const handleClick = () => { recordTeamView(teamNames) }

  if (game.link) {
    return (
      <a
        href={game.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label={`${game.shortName || game.name} — open live stats and box score`}
        className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {card}
      </a>
    )
  }

  return <div onClick={handleClick}>{card}</div>
}
