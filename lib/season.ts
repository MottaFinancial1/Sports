// Approximate real-world season windows for each sport category, used to
// rank "what's actually in season" ahead of sports that are technically
// off but still have a stray exhibition/all-star game on the schedule.
//
// Windows are expressed as { startMonth, startDay, endMonth, endDay } and
// support wrapping across the new year (e.g. NFL: Aug -> Feb).

import type { LeagueCategory } from "./espn"

interface SeasonWindow {
  startMonth: number // 1-12
  startDay: number
  endMonth: number
  endDay: number
}

// Sports whose games should always be surfaced (spotlighted + boosted in
// ordering) whenever they're in season, even if another sport happens to
// have a live game right now. Soccer here covers the major European
// leagues (Premier League, Champions League, La Liga) tracked in LEAGUES.
const ALWAYS_SURFACE_IN_SEASON: LeagueCategory[] = ["Baseball", "Soccer"]

// Base tie-break order, used when two categories share the same
// in-season/live status.
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

export function isAlwaysSurfaceCategory(category: LeagueCategory): boolean {
  return ALWAYS_SURFACE_IN_SEASON.includes(category)
}

/**
 * Ranks categories by season relevance: in-season sports first, out-of-season
 * sports last. Baseball and the major soccer leagues are pinned ahead of
 * every other in-season sport whenever they're active, since they're the
 * priority sports for this app.
 */
export function getSeasonalCategoryOrder(date: Date = new Date()): LeagueCategory[] {
  return [...BASE_ORDER].sort((a, b) => {
    const aPinned = isAlwaysSurfaceCategory(a) && isCategoryInSeason(a, date)
    const bPinned = isAlwaysSurfaceCategory(b) && isCategoryInSeason(b, date)
    if (aPinned !== bPinned) return aPinned ? -1 : 1

    const aInSeason = isCategoryInSeason(a, date)
    const bInSeason = isCategoryInSeason(b, date)
    if (aInSeason !== bInSeason) return aInSeason ? -1 : 1

    return BASE_ORDER.indexOf(a) - BASE_ORDER.indexOf(b)
  })
}
