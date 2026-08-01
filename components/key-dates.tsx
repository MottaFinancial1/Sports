"use client"

import { Calendar } from "lucide-react"
import { useMemo } from "react"

export interface KeyDate {
  label: string
  date: Date
  league: string
  leagueShort: string
  category: "draft" | "deadline" | "opening" | "playoffs" | "championship" | "event"
  note?: string
}

// 2025–2026 sports calendar — drafts, trade deadlines, season openers, playoffs
const ALL_KEY_DATES: KeyDate[] = [
  // ---- MLB ----
  { label: "MLB Trade Deadline", date: new Date("2025-07-31"), league: "MLB", leagueShort: "MLB", category: "deadline" },
  { label: "MLB Wild Card Round", date: new Date("2025-09-30"), league: "MLB", leagueShort: "MLB", category: "playoffs", note: "Best-of-3" },
  { label: "MLB Division Series", date: new Date("2025-10-07"), league: "MLB", leagueShort: "MLB", category: "playoffs", note: "ALDS/NLDS" },
  { label: "MLB Championship Series", date: new Date("2025-10-15"), league: "MLB", leagueShort: "MLB", category: "playoffs", note: "ALCS/NLCS" },
  { label: "World Series", date: new Date("2025-10-25"), league: "MLB", leagueShort: "MLB", category: "championship" },
  { label: "MLB Opening Day", date: new Date("2026-03-26"), league: "MLB", leagueShort: "MLB", category: "opening" },

  // ---- NFL ----
  { label: "NFL Trade Deadline", date: new Date("2025-11-04"), league: "NFL", leagueShort: "NFL", category: "deadline" },
  { label: "NFL Wild Card Weekend", date: new Date("2026-01-10"), league: "NFL", leagueShort: "NFL", category: "playoffs" },
  { label: "NFL Divisional Round", date: new Date("2026-01-17"), league: "NFL", leagueShort: "NFL", category: "playoffs" },
  { label: "NFL Conference Championships", date: new Date("2026-01-25"), league: "NFL", leagueShort: "NFL", category: "playoffs" },
  { label: "Super Bowl LX", date: new Date("2026-02-08"), league: "NFL", leagueShort: "NFL", category: "championship", note: "New Orleans" },
  { label: "NFL Draft", date: new Date("2026-04-23"), league: "NFL", leagueShort: "NFL", category: "draft", note: "Green Bay, WI" },

  // ---- NBA ----
  { label: "NBA Trade Deadline", date: new Date("2026-02-05"), league: "NBA", leagueShort: "NBA", category: "deadline" },
  { label: "NBA Playoffs Begin", date: new Date("2026-04-18"), league: "NBA", leagueShort: "NBA", category: "playoffs" },
  { label: "NBA Finals", date: new Date("2026-06-04"), league: "NBA", leagueShort: "NBA", category: "championship" },
  { label: "NBA Draft", date: new Date("2026-06-25"), league: "NBA", leagueShort: "NBA", category: "draft", note: "Brooklyn, NY" },

  // ---- NHL ----
  { label: "NHL Trade Deadline", date: new Date("2026-03-02"), league: "NHL", leagueShort: "NHL", category: "deadline" },
  { label: "NHL Playoffs Begin", date: new Date("2026-04-20"), league: "NHL", leagueShort: "NHL", category: "playoffs" },
  { label: "Stanley Cup Finals", date: new Date("2026-06-01"), league: "NHL", leagueShort: "NHL", category: "championship" },
  { label: "NHL Draft", date: new Date("2026-06-26"), league: "NHL", leagueShort: "NHL", category: "draft", note: "Las Vegas, NV" },

  // ---- F1 ----
  { label: "F1 Belgian GP", date: new Date("2025-08-01"), league: "F1", leagueShort: "F1", category: "event", note: "Spa-Francorchamps" },
  { label: "F1 Dutch GP", date: new Date("2025-08-31"), league: "F1", leagueShort: "F1", category: "event", note: "Zandvoort" },
  { label: "F1 Italian GP", date: new Date("2025-09-07"), league: "F1", leagueShort: "F1", category: "event", note: "Monza" },
  { label: "F1 Singapore GP", date: new Date("2025-10-05"), league: "F1", leagueShort: "F1", category: "event", note: "Marina Bay" },
  { label: "F1 US Grand Prix", date: new Date("2025-10-19"), league: "F1", leagueShort: "F1", category: "event", note: "Austin, TX" },
  { label: "F1 Abu Dhabi GP (Season Finale)", date: new Date("2025-12-07"), league: "F1", leagueShort: "F1", category: "event", note: "Yas Marina" },

  // ---- Golf ----
  { label: "PGA Championship", date: new Date("2026-05-21"), league: "PGA", leagueShort: "PGA", category: "event", note: "Major" },
  { label: "US Open", date: new Date("2026-06-18"), league: "PGA", leagueShort: "PGA", category: "event", note: "Major" },
  { label: "The Open Championship", date: new Date("2026-07-16"), league: "PGA", leagueShort: "PGA", category: "event", note: "Major" },

  // ---- Tennis ----
  { label: "US Open", date: new Date("2025-08-25"), league: "Tennis", leagueShort: "Tennis", category: "event", note: "Grand Slam • New York" },
  { label: "Australian Open", date: new Date("2026-01-19"), league: "Tennis", leagueShort: "Tennis", category: "event", note: "Grand Slam • Melbourne" },
  { label: "Roland Garros", date: new Date("2026-05-25"), league: "Tennis", leagueShort: "Tennis", category: "event", note: "Grand Slam • Paris" },
  { label: "Wimbledon", date: new Date("2026-06-29"), league: "Tennis", leagueShort: "Tennis", category: "event", note: "Grand Slam • London" },

  // ---- Soccer ----
  { label: "MLS Playoffs Begin", date: new Date("2025-10-25"), league: "MLS", leagueShort: "MLS", category: "playoffs" },
  { label: "MLS Cup", date: new Date("2025-12-06"), league: "MLS", leagueShort: "MLS", category: "championship" },
  { label: "UEFA Champions League Final", date: new Date("2026-05-30"), league: "UCL", leagueShort: "UCL", category: "championship", note: "Wembley, London" },
]

const CATEGORY_COLOR: Record<KeyDate["category"], string> = {
  draft: "border-blue-500/40 bg-blue-500/10 text-blue-500",
  deadline: "border-destructive/40 bg-destructive/10 text-destructive",
  opening: "border-primary/40 bg-primary/10 text-primary",
  playoffs: "border-orange-500/40 bg-orange-500/10 text-orange-500",
  championship: "border-yellow-500/40 bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  event: "border-border bg-secondary text-secondary-foreground",
}

const CATEGORY_LABEL: Record<KeyDate["category"], string> = {
  draft: "Draft",
  deadline: "Deadline",
  opening: "Opening",
  playoffs: "Playoffs",
  championship: "Championship",
  event: "Event",
}

function daysUntil(date: Date, now: Date): number {
  const diff = date.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}

export function KeyDates() {
  const now = useMemo(() => new Date(), [])

  const upcoming = useMemo(() => {
    return ALL_KEY_DATES
      .map((d) => ({ ...d, daysUntil: daysUntil(d.date, now) }))
      .filter((d) => d.daysUntil >= -1) // include yesterday in case it spans days
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 18)
  }, [now])

  if (upcoming.length === 0) return null

  return (
    <section className="mb-10">
      <h2 className="mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
        <span className="inline-block h-3 w-1 bg-primary" aria-hidden="true" />
        Key Dates
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </h2>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {upcoming.map((d, i) => {
          const isToday = d.daysUntil === 0
          const isSoon = d.daysUntil > 0 && d.daysUntil <= 7
          const isPast = d.daysUntil < 0

          return (
            <div
              key={`${d.label}-${i}`}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                isToday
                  ? "border-primary/50 bg-primary/8"
                  : isSoon
                    ? "border-border bg-card hover:border-primary/30"
                    : isPast
                      ? "border-border/50 bg-card/50 opacity-60"
                      : "border-border bg-card hover:border-border/80"
              }`}
            >
              {/* Date column */}
              <div className="flex w-12 shrink-0 flex-col items-center rounded-md border border-border bg-secondary/60 py-1.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {d.date.toLocaleDateString(undefined, { month: "short" })}
                </span>
                <span className="font-mono text-lg font-black leading-none text-foreground">
                  {d.date.getDate()}
                </span>
              </div>

              {/* Content */}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`rounded-sm border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${CATEGORY_COLOR[d.category]}`}
                  >
                    {CATEGORY_LABEL[d.category]}
                  </span>
                  <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {d.leagueShort}
                  </span>
                  {isToday ? (
                    <span className="rounded-sm bg-primary px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                      Today
                    </span>
                  ) : isSoon ? (
                    <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                      {d.daysUntil}d
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-bold leading-tight text-foreground">{d.label}</p>
                {d.note ? (
                  <p className="font-mono text-[10px] text-muted-foreground">{d.note}</p>
                ) : (
                  <p className="font-mono text-[10px] text-muted-foreground">{formatDate(d.date)}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
