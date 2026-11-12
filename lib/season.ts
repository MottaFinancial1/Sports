// Approximate real-world season windows for each sport category, used to
// rank "what's actually in season" ahead of sports that are technically
// off but still have a stray exhibition/all-star game on the schedule.
//
// Windows are expressed as { startMonth, startDay, endMonth, endDay } and
// support wrapping across the new year (e.g. NFL: Aug -> Feb).

import type { Game, LeagueCategory } from "./espn"

interface SeasonWindow {
  startMonth: number // 1-12
  startDay: number
  endMonth: number
  endDay: number
}

// Tie-break order, used only when two categories are equally active.
const BASE_ORDER: LeagueCategory[] = [
  "Baseball",
  "Soccer",
  "Football",
  "Basketball",
  "Motorsport",
  "Golf",
  "Tennis",
]

const CATEGORY_SEASONS: Record<LeagueCategory, SeasonWindow[]> = {
  // MLB regular season (late March–Sept) + playoffs/World Series (Oct–early Nov),
  // plus spring training buzz starting mid-Feb.
  Baseball: [{ startMonth: 2, startDay: 15, endMonth: 11, endDay: 5 }],
  // NFL/NCAAF: preseason (Aug) through the Super Bowl (early Feb). Wraps the new year.
  Football: [{ startMonth: 8, startDay: 1, endMonth: 2, endDay: 12 }],
  // Premier League / La Liga / Champions League run Aug–May/June; MLS runs
  // Feb–Dec. Between the two, soccer is in season essentially all year.
  Soccer: [{ startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 }],
  // NBA/NCAAM: October through the NBA Finals in June.
  Basketball: [{ startMonth: 10, startDay: 1, endMonth: 6, endDay: 20 }],
  // F1: pre-season testing/first race in March through the finale in early December.
  Motorsport: [{ startMonth: 3, startDay: 1, endMonth: 12, endDay: 7 }],
  // PGA Tour: January through the FedEx Cup finale (August); light fall series after.
  Golf: [{ startMonth: 1, startDay: 1, endMonth: 9, endDay: 15 }],
  // ATP/WTA: essentially year-round, with a short off-season in late Nov/Dec.
  Tennis: [{ startMonth: 1, startDay: 1, endMonth: 11, endDay: 24 }],
}

function isWithinWindow(date: Date, w: SeasonWindow): boolean {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const value = m * 100 + d
  const start = w.startMonth * 100 + w.startDay
  const end = w.endMonth * 100 + w.endDay
  if (start <= end) return value >= start && value <= end
  // Wraps across the new year (e.g. Football: Aug -> Feb)
  return value >= start || value <= end
}

export function isCategoryInSeason(category: LeagueCategory, date: Date = new Date()): boolean {
  const windows = CATEGORY_SEASONS[category] ?? []
  return windows.some((w) => isWithinWindow(date, w))
}

export type SeasonStatus =
  | "live" // something is being played right now
  | "today" // in season, with games today
  | "week" // in season, with games later this week
  | "in-season" // in season, but nothing on the schedule this week
  | "stray" // off-season, but a game is still on the schedule
  | "off-season"

const STATUS_RANK: Record<SeasonStatus, number> = {
  live: 0,
  today: 1,
  week: 2,
  "in-season": 3,
  stray: 4,
  "off-season": 5,
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// If this many games are actually on the board, the sport is clearly being
// played regardless of what the calendar windows above say.
const ACTIVE_GAMES_THRESHOLD = 3

/**
 * How "in play" a category is right now, from the real schedule first and the
 * approximate calendar second. Live games always win; a category with games
 * today or this week outranks one that's merely in season on paper.
 */
export function getCategorySeasonStatus(
  category: LeagueCategory,
  games: Game[],
  now: Date = new Date(),
): SeasonStatus {
  const ts = now.getTime()
  const inCategory = games.filter((g) => g.category === category)
  if (inCategory.some((g) => g.state === "in")) return "live"

  const playingToday = inCategory.filter((g) => g.isToday)
  const playingThisWeek = inCategory.filter((g) => {
    const t = new Date(g.date).getTime()
    return g.state === "pre" && t >= ts - 12 * 60 * 60 * 1000 && t <= ts + WEEK_MS
  })
  const hasToday = playingToday.length > 0
  const hasWeek = playingThisWeek.length > 0

  const inSeason =
    isCategoryInSeason(category, now) || playingToday.length + playingThisWeek.length >= ACTIVE_GAMES_THRESHOLD

  if (inSeason && hasToday) return "today"
  if (inSeason && hasWeek) return "week"
  if (hasToday || hasWeek) return "stray"
  return inSeason ? "in-season" : "off-season"
}

/**
 * Orders categories by what's actually being played: live first, then sports
 * with games today, then games later this week, then everything else by
 * calendar season. No sport is pinned; the order follows the schedule.
 */
export function getSeasonalCategoryOrder(games: Game[] = [], now: Date = new Date()): LeagueCategory[] {
  const status = new Map(BASE_ORDER.map((c) => [c, getCategorySeasonStatus(c, games, now)]))
  return [...BASE_ORDER].sort(
    (a, b) => STATUS_RANK[status.get(a)!] - STATUS_RANK[status.get(b)!] || BASE_ORDER.indexOf(a) - BASE_ORDER.indexOf(b),
  )
}

/** Orders leagues within a category: live, then today, then this week, then the rest. Stable otherwise. */
export function rankLeaguesByActivity<T extends { id: string }>(leagues: T[], games: Game[]): T[] {
  const tier = (id: string) => {
    const g = games.filter((x) => x.leagueId === id)
    if (g.some((x) => x.state === "in")) return 0
    if (g.some((x) => x.isToday)) return 1
    if (g.some((x) => x.state === "pre")) return 2
    return g.length > 0 ? 3 : 4
  }
  return leagues
    .map((l, i) => ({ l, i, t: tier(l.id) }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map((x) => x.l)
}

const STATUS_DESCRIPTION: Record<SeasonStatus, string> = {
  live: "LIVE right now",
  today: "in season, playing today",
  week: "in season, games later this week",
  "in-season": "in season, nothing scheduled this week",
  stray: "off-season (only isolated games on the schedule)",
  "off-season": "off-season",
}

/** A short, model-friendly summary of what's actually being played, most active first. */
export function describeSeasonalContext(games: Game[], now: Date = new Date()): string {
  return getSeasonalCategoryOrder(games, now)
    .map((category) => {
      const status = getCategorySeasonStatus(category, games, now)
      const leagues = Array.from(
        new Set(games.filter((g) => g.category === category).map((g) => g.leagueShort)),
      )
      const detail = leagues.length > 0 && status !== "off-season" ? ` [${leagues.join(", ")}]` : ""
      return `- ${category}: ${STATUS_DESCRIPTION[status]}${detail}`
    })
    .join("\n")
}

const CATEGORY_SUGGESTIONS: Record<LeagueCategory, string[]> = {
  Baseball: ["Red Sox injury report?", "Who's the best pitching matchup today?"],
  Football: ["Bills next game + broadcast?", "NFL injury report this week?"],
  Basketball: ["Best NBA games tonight?", "NBA standings and playoff picture?"],
  Soccer: ["What international soccer is on this week?", "Where can I watch the big match today?"],
  Motorsport: ["F1 standings after last race?", "When is the next F1 race?"],
  Golf: ["PGA leaderboard right now?", "Who's leading the FedEx Cup?"],
  Tennis: ["Who's still alive in the draw?", "Biggest tennis matches today?"],
}

/**
 * Starter questions for the Ask panel, drawn from the sports actually being
 * played right now rather than a fixed list. The top sport gets two prompts;
 * every other active sport gets one.
 */
export function getSeasonalSuggestions(games: Game[], now: Date = new Date(), limit = 6): string[] {
  const active = getSeasonalCategoryOrder(games, now).filter(
    (c) => getCategorySeasonStatus(c, games, now) !== "off-season",
  )
  const picks: string[] = ["Any big trades today?"]
  active.forEach((category, i) => {
    const options = CATEGORY_SUGGESTIONS[category]
    picks.push(...(i === 0 ? options : options.slice(0, 1)))
  })
  return picks.slice(0, limit)
}
