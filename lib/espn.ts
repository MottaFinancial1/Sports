// Live sports data via ESPN's public (unofficial) scoreboard endpoints.
// No API key required. The scoreboard endpoint returns "today's" slate by
// default, so this naturally rolls over to a new day. We revalidate on a
// short interval so times/scores stay fresh and the date updates on its own.

import { isCategoryInSeason } from "./season"

// Personalized sport ranking: Baseball, Football, Soccer, Motorsport (F1),
// Golf, Tennis, Basketball. NHL and UFC are intentionally excluded.
export type LeagueCategory =
  | "Baseball"
  | "Football"
  | "Soccer"
  | "Motorsport"
  | "Golf"
  | "Tennis"
  | "Basketball"

export interface LeagueConfig {
  id: string
  label: string
  shortLabel: string
  category: LeagueCategory
  path: string // ESPN sport/league path
}

export const LEAGUES: LeagueConfig[] = [
  // MLB comes from the MLB Stats API (statsapi.mlb.com), not ESPN —
  // ESPN blocks Vercel IPs. getTodaysGames routes "mlb" to fetchMLBGames().
  { id: "mlb", label: "MLB", shortLabel: "MLB", category: "Baseball", path: "" },
  // Triple-A (Omaha Storm Chasers) — also MLB Stats API.
  { id: "aaa", label: "Triple-A", shortLabel: "AAA", category: "Baseball", path: "" },
  { id: "nfl", label: "NFL", shortLabel: "NFL", category: "Football", path: "football/nfl" },
  {
    id: "ncaaf",
    label: "College Football",
    shortLabel: "NCAAF",
    category: "Football",
    path: "football/college-football",
  },
  // Soccer leagues are ordered by priority: the top 5 European domestic
  // leagues first (Premier League, La Liga, Bundesliga, Serie A, Ligue 1),
  // then the Champions League, with MLS deliberately last — it's shown but
  // never prioritized ahead of the major European leagues.
  { id: "epl", label: "Premier League", shortLabel: "EPL", category: "Soccer", path: "soccer/eng.1" },
  { id: "laliga", label: "La Liga", shortLabel: "La Liga", category: "Soccer", path: "soccer/esp.1" },
  { id: "bundesliga", label: "Bundesliga", shortLabel: "Bundesliga", category: "Soccer", path: "soccer/ger.1" },
  { id: "seriea", label: "Serie A", shortLabel: "Serie A", category: "Soccer", path: "soccer/ita.1" },
  { id: "ligue1", label: "Ligue 1", shortLabel: "Ligue 1", category: "Soccer", path: "soccer/fra.1" },
  {
    id: "ucl",
    label: "Champions League",
    shortLabel: "UCL",
    category: "Soccer",
    path: "soccer/uefa.champions",
  },
  { id: "mls", label: "MLS", shortLabel: "MLS", category: "Soccer", path: "soccer/usa.1" },
  { id: "uel", label: "Europa League", shortLabel: "UEL", category: "Soccer", path: "soccer/uefa.europa" },
  { id: "uecl", label: "Conference League", shortLabel: "UECL", category: "Soccer", path: "soccer/uefa.europa.conf" },
  // International soccer. These are only fetched in depth while they're
  // actually being played (see fetchSoccerWeek), so listing a tournament here
  // costs next to nothing the rest of the time and it appears on its own the
  // moment fixtures show up.
  { id: "unl", label: "UEFA Nations League", shortLabel: "Nations League", category: "Soccer", path: "soccer/uefa.nations" },
  { id: "intl", label: "International Friendlies", shortLabel: "Friendlies", category: "Soccer", path: "soccer/fifa.friendly" },
  { id: "cnl", label: "CONCACAF Nations League", shortLabel: "CONCACAF NL", category: "Soccer", path: "soccer/concacaf.nations.league" },
  { id: "wc", label: "FIFA World Cup", shortLabel: "World Cup", category: "Soccer", path: "soccer/fifa.world" },
  { id: "euro", label: "UEFA European Championship", shortLabel: "Euros", category: "Soccer", path: "soccer/uefa.euro" },
  { id: "copa", label: "Copa América", shortLabel: "Copa América", category: "Soccer", path: "soccer/conmebol.america" },
  { id: "gold", label: "CONCACAF Gold Cup", shortLabel: "Gold Cup", category: "Soccer", path: "soccer/concacaf.gold" },
  { id: "afcon", label: "Africa Cup of Nations", shortLabel: "AFCON", category: "Soccer", path: "soccer/caf.nations" },
  { id: "asian", label: "AFC Asian Cup", shortLabel: "Asian Cup", category: "Soccer", path: "soccer/afc.asian.cup" },
  { id: "f1", label: "Formula 1", shortLabel: "F1", category: "Motorsport", path: "racing/f1" },
  { id: "pga", label: "PGA Tour", shortLabel: "PGA", category: "Golf", path: "golf/pga" },
  { id: "atp", label: "ATP Tour", shortLabel: "ATP", category: "Tennis", path: "tennis/atp" },
  { id: "wta", label: "WTA Tour", shortLabel: "WTA", category: "Tennis", path: "tennis/wta" },
  { id: "nba", label: "NBA", shortLabel: "NBA", category: "Basketball", path: "basketball/nba" },
  {
    id: "ncaam",
    label: "College Basketball",
    shortLabel: "NCAAM",
    category: "Basketball",
    path: "basketball/mens-college-basketball",
  },
]

export interface ProbablePitcher {
  name: string
  shortName: string
  record?: string // e.g. "10-1"
  era?: string // e.g. "2.13"
}

export interface Competitor {
  name: string
  shortName: string
  logo?: string
  score?: string
  isHome: boolean
  winner?: boolean
  record?: string
  probablePitcher?: ProbablePitcher
  // Tennis: individual set scores e.g. ["6", "4", "7"]
  sets?: string[]
}

export type GameState = "pre" | "in" | "post"

export interface Game {
  id: string
  leagueId: string
  leagueLabel: string
  leagueShort: string
  category: LeagueCategory
  name: string
  shortName: string
  date: string // ISO
  state: GameState
  statusDetail: string
  competitors: Competitor[]
  broadcasts: string[]
  venue?: string
  note?: string
  week?: number // NFL/NCAAF week number
  round?: string // Tennis: e.g. "Round of 128", "Quarterfinals", "Final"
  link?: string // Live stats / box score page (ESPN Gamecast or MiLB Gameday)
  leaders?: GameLeader[] // Star performers (populated for live games)
  isToday?: boolean // true if the game date matches today (US Eastern date)
}

export interface GameLeader {
  category: string // e.g. "Passing Yards", "Home Runs"
  athlete: string
  shortName: string
  headshot?: string
  team?: string // team abbreviation
  value: string // e.g. "2-3, HR, 3 RBI"
}

interface EspnResponse {
  events?: EspnEvent[]
  week?: { number?: number }
  // The date ESPN resolved the (undated) scoreboard to: today's slate when
  // there are games, otherwise the nearest match day.
  day?: { date?: string }
  leagues?: { calendarStartDate?: string; calendarEndDate?: string; calendar?: unknown }[]
}

interface EspnEvent {
  id: string
  name?: string
  shortName?: string
  date?: string
  week?: { number?: number }
  links?: { text?: string; href?: string }[]
  competitions?: EspnCompetition[]
  // Tennis scoreboards nest matches under groupings (e.g. "Men's Singles").
  groupings?: { competitions?: EspnCompetition[] }[]
}

interface EspnCompetition {
  date?: string
  venue?: { fullName?: string }
  broadcasts?: { names?: string[] }[]
  geoBroadcasts?: { media?: { shortName?: string } }[]
  notes?: { headline?: string }[]
  status?: { type?: { state?: string; shortDetail?: string; detail?: string } }
  competitors?: EspnCompetitor[]
}

interface EspnProbable {
  abbreviation?: string
  athlete?: { displayName?: string; shortName?: string }
  statistics?: { abbreviation?: string; displayValue?: string }[]
}

interface EspnLeaderGroup {
  displayName?: string
  leaders?: {
    displayValue?: string
    athlete?: { displayName?: string; shortName?: string; headshot?: string }
  }[]
}

interface EspnCompetitor {
  homeAway?: string
  winner?: boolean
  score?: string
  team?: { displayName?: string; shortDisplayName?: string; abbreviation?: string; logo?: string }
  athlete?: { displayName?: string; shortName?: string; flag?: { href?: string } }
  records?: { summary?: string }[]
  probables?: EspnProbable[]
  leaders?: EspnLeaderGroup[]
  // Tennis: set-by-set scores
  linescores?: { value?: number | string }[]
}

function mapProbablePitcher(c: EspnCompetitor): ProbablePitcher | undefined {
  // MLB scoreboard lists the starting pitcher under `probables` (abbreviation "SP").
  const probable = (c.probables ?? []).find((p) => p.abbreviation === "SP") ?? c.probables?.[0]
  const name = probable?.athlete?.displayName
  if (!name) return undefined
  const stats = probable?.statistics ?? []
  const stat = (abbr: string) => stats.find((s) => s.abbreviation === abbr)?.displayValue
  const wins = stat("W")
  const losses = stat("L")
  return {
    name,
    shortName: probable?.athlete?.shortName ?? name,
    record: wins !== undefined && losses !== undefined ? `${wins}-${losses}` : undefined,
    era: stat("ERA"),
  }
}

function extractBroadcasts(comp: EspnCompetition): string[] {
  const names = new Set<string>()
  for (const b of comp.broadcasts ?? []) {
    for (const n of b.names ?? []) {
      if (n) names.add(n)
    }
  }
  for (const g of comp.geoBroadcasts ?? []) {
    const n = g.media?.shortName
    if (n) names.add(n)
  }
  return Array.from(names)
}

function mapCompetitor(c: EspnCompetitor): Competitor {
  const team = c.team
  const athlete = c.athlete
  const sets =
    c.linescores && c.linescores.length > 0
      ? c.linescores.map((s) => String(s.value ?? ""))
      : undefined
  return {
    name: team?.displayName ?? athlete?.displayName ?? "TBD",
    shortName: team?.shortDisplayName ?? team?.abbreviation ?? athlete?.shortName ?? "TBD",
    logo: team?.logo ?? athlete?.flag?.href,
    score: c.score,
    isHome: c.homeAway === "home",
    winner: c.winner,
    record: c.records?.[0]?.summary,
    probablePitcher: mapProbablePitcher(c),
    sets,
  }
}

/** Fetch with an AbortController timeout so a slow upstream never hangs the
 *  Vercel serverless function past its execution limit. */
async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (sports-today)" },
    })
  } finally {
    clearTimeout(timer)
  }
}

/** Today's date as YYYYMMDD in US Eastern time — the relevant "sports day"
 *  for MLB/NFL/NBA. Using the server's local timezone (often UTC in cloud
 *  environments) rolls the calendar date over mid-evening ET, which cuts
 *  live night games out of "today" entirely and makes it look like nothing
 *  is happening in baseball while soccer (fetched without a date param)
 *  keeps showing live matches. Anchoring to America/New_York fixes that. */
function todayESPN(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const y = parts.find((p) => p.type === "year")!.value
  const m = parts.find((p) => p.type === "month")!.value
  const day = parts.find((p) => p.type === "day")!.value
  return `${y}${m}${day}`
}

/** An ESPN `dates` / compact day string (YYYYMMDD) for a Date, in US Eastern. */
const ET_DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

function etDay(date: Date): string {
  const parts = ET_DAY_FORMAT.formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  return `${get("year")}${get("month")}${get("day")}`
}

/** The US Eastern day an ISO timestamp falls on, or "" if it can't be parsed. */
function etDayOfIso(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : etDay(d)
}

/** YYYYMMDD strings for today and the next `count - 1` days (US Eastern). */
function upcomingDays(count: number): string[] {
  const today = todayESPN()
  const base = Date.UTC(Number(today.slice(0, 4)), Number(today.slice(4, 6)) - 1, Number(today.slice(6, 8)))
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base + i * 86_400_000)
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`
  })
}

function daysBetween(a: string, b: string): number {
  const toMs = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)))
  return Math.round((toMs(b) - toMs(a)) / 86_400_000)
}

interface LeagueFetchResult {
  games: Game[]
  /** The match day ESPN resolved an undated request to (YYYYMMDD). */
  day?: string
  /** Every match day on the league's calendar, when ESPN publishes one. */
  calendarDays?: Set<string>
}

const compactDay = (s?: string) => (s ? s.slice(0, 10).replace(/-/g, "") : undefined)

// Fixtures further out than today barely change, and tournaments that are
// nowhere near being played don't need re-checking every minute.
const scoreboardCache = new Map<string, { at: number; ttl: number; value: LeagueFetchResult }>()
const FUTURE_DAY_TTL_MS = 10 * 60_000
const DORMANT_LEAGUE_TTL_MS = 30 * 60_000

async function fetchLeagueCached(league: LeagueConfig, date?: string): Promise<LeagueFetchResult> {
  const key = `${league.id}:${date ?? "default"}`
  const hit = scoreboardCache.get(key)
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value

  const value = await fetchLeagueRaw(league, date)

  let ttl = 0
  if (date && date > todayESPN()) ttl = FUTURE_DAY_TTL_MS
  else if (!date && value.day && Math.abs(daysBetween(todayESPN(), value.day)) > 14) ttl = DORMANT_LEAGUE_TTL_MS
  if (ttl > 0) scoreboardCache.set(key, { at: Date.now(), ttl, value })
  return value
}

async function fetchLeague(league: LeagueConfig): Promise<Game[]> {
  return (await fetchLeagueRaw(league)).games
}

/**
 * Soccer is scheduled on specific match days, and ESPN's undated scoreboard
 * only returns a single day, which is often a past one. This returns what's
 * actually relevant: live matches, today's slate, and everything in the next
 * seven days. Leagues that aren't being played (off-season domestic leagues,
 * tournaments months away) cost one cheap, cached request and return nothing.
 */
async function fetchSoccerWeek(league: LeagueConfig): Promise<Game[]> {
  const window = upcomingDays(7)
  const base = await fetchLeagueCached(league)

  let days: string[] = []
  if (base.calendarDays) {
    // Domestic leagues publish their match days: only fetch the ones in range.
    days = window.filter((d) => base.calendarDays!.has(d))
  } else if (base.day && Math.abs(daysBetween(window[0], base.day)) <= 14) {
    // Tournaments / international windows: play is happening around now.
    days = window
  }

  const extra = await Promise.all(days.map((d) => fetchLeagueCached(league, d)))
  const byId = new Map<string, Game>()
  for (const g of [...base.games, ...extra.flatMap((r) => r.games)]) byId.set(g.id, g)

  // Drop stale results (the undated scoreboard can resolve to a match day
  // from last week) but keep live matches and yesterday's finals.
  const oldest = etDay(new Date(Date.now() - 86_400_000))
  const newest = window[window.length - 1]
  return Array.from(byId.values()).filter((g) => {
    if (g.state === "in") return true
    const day = etDayOfIso(g.date)
    return day !== "" && day >= oldest && day <= newest
  })
}

async function fetchLeagueRaw(league: LeagueConfig, date?: string): Promise<LeagueFetchResult> {
  const dateParam = date ? `?dates=${date}` : league.id === "mlb" ? `?dates=${todayESPN()}` : ""
  const url = `https://site.api.espn.com/apis/site/v2/sports/${league.path}/scoreboard${dateParam}`
  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) return { games: [] }
    const data = (await res.json()) as EspnResponse
    const isFootball = league.id === "nfl" || league.id === "ncaaf"
    const isTennis = league.category === "Tennis"
    const games: Game[] = []
    for (const event of data.events ?? []) {
      // Tennis events are tournaments containing many matches (nested under
      // groupings); every other sport has a single competition per event.
      const tennisComps =
        (event.competitions?.length ?? 0) > 0
          ? (event.competitions ?? [])
          : (event.groupings ?? []).flatMap((g) => g.competitions ?? [])
      const comps = isTennis ? tennisComps.slice(0, 8) : (event.competitions ?? []).slice(0, 1)
      comps.forEach((comp, compIndex) => {
        const state = (comp.status?.type?.state as GameState) ?? "pre"
        let competitors = (comp.competitors ?? []).map(mapCompetitor)
        // Order away first, home second for team sports.
        competitors.sort((a, b) => Number(a.isHome) - Number(b.isHome))
        // Field events (golf tournaments, F1 races) can list 100+ entrants —
        // keep only the leaders so cards stay scannable.
        if (competitors.length > 2) competitors = competitors.slice(0, 5)
        const matchName = isTennis
          ? competitors.map((c) => c.shortName).join(" vs ")
          : (event.name ?? event.shortName ?? "")
        // Tennis round from the competition note headline or event name
        const tennisRound = isTennis
          ? (comp.notes?.[0]?.headline ?? event.name ?? undefined)
          : undefined

        games.push({
          // Prefix with leagueId so identical ESPN event IDs from different leagues
          // (e.g. MLS vs CONCACAF sharing the same event slug) don't collide as React keys.
          id: isTennis
            ? `${league.id}-${event.id}-${compIndex}`
            : `${league.id}-${event.id}`,
          leagueId: league.id,
          leagueLabel: league.label,
          leagueShort: league.shortLabel,
          category: league.category,
          name: isTennis ? `${event.name} — ${matchName}` : matchName,
          shortName: isTennis ? matchName : (event.shortName ?? event.name ?? ""),
          date: comp.date ?? event.date ?? "",
          state,
          statusDetail: comp.status?.type?.shortDetail ?? comp.status?.type?.detail ?? "",
          competitors,
          broadcasts: extractBroadcasts(comp),
          venue: comp.venue?.fullName,
          note: isTennis ? event.name : (comp.notes?.[0]?.headline ?? undefined),
          round: tennisRound,
          week: isFootball ? (event.week?.number ?? data.week?.number) : undefined,
          link:
            (event.links ?? []).find((l) => l.text === "Gamecast")?.href ??
            (event.links ?? []).find((l) => l.text === "Box Score")?.href ??
            event.links?.[0]?.href,
          leaders: state === "in" ? extractLeaders(comp) : undefined,
        })
      })
    }
    const calendar = data.leagues?.[0]?.calendar
    const calendarDays =
      Array.isArray(calendar) && calendar.length > 0 && calendar.every((c) => typeof c === "string")
        ? new Set((calendar as string[]).map((c) => compactDay(c)!))
        : undefined
    return { games, day: compactDay(data.day?.date), calendarDays }
  } catch {
    return { games: [] }
  }
}

function extractLeaders(comp: EspnCompetition): GameLeader[] | undefined {
  const leaders: GameLeader[] = []
  const seen = new Set<string>()
  for (const c of comp.competitors ?? []) {
    for (const group of c.leaders ?? []) {
      const top = group.leaders?.[0]
      const name = top?.athlete?.displayName
      if (!name || !top?.displayValue || !group.displayName) continue
      // One entry per athlete per game — their first (most notable) category.
      if (seen.has(name)) continue
      seen.add(name)
      leaders.push({
        category: group.displayName,
        athlete: name,
        shortName: top.athlete?.shortName ?? name,
        headshot: top.athlete?.headshot,
        team: c.team?.abbreviation,
        value: top.displayValue,
      })
    }
  }
  return leaders.length > 0 ? leaders : undefined
}

// ---------- Omaha Storm Chasers (Triple-A) via the MLB Stats API ----------

const STORM_CHASERS_TEAM_ID = 541 // Omaha Storm Chasers, Pacific Coast League (AAA)

interface StatsApiGame {
  gamePk: number
  gameDate?: string
  status?: { abstractGameState?: string; detailedState?: string }
  teams?: {
    away?: StatsApiSide
    home?: StatsApiSide
  }
  linescore?: { currentInningOrdinal?: string; inningState?: string }
  broadcasts?: { name?: string; callSign?: string }[]
  venue?: { name?: string }
}

interface StatsApiSide {
  team?: { id?: number; name?: string; teamName?: string; abbreviation?: string }
  leagueRecord?: { wins?: number; losses?: number }
  score?: number
  probablePitcher?: { fullName?: string }
}

function mapStatsApiState(abstract?: string): GameState {
  if (abstract === "Live") return "in"
  if (abstract === "Final") return "post"
  return "pre"
}

function mapStatsApiSide(side: StatsApiSide | undefined, isHome: boolean, won?: boolean): Competitor {
  const record =
    side?.leagueRecord?.wins !== undefined && side?.leagueRecord?.losses !== undefined
      ? `${side.leagueRecord.wins}-${side.leagueRecord.losses}`
      : undefined
  const pitcherName = side?.probablePitcher?.fullName
  return {
    name: side?.team?.name ?? "TBD",
    shortName: side?.team?.teamName ?? side?.team?.abbreviation ?? "TBD",
    logo: side?.team?.id ? `https://www.mlbstatic.com/team-logos/${side.team.id}.svg` : undefined,
    score: side?.score !== undefined ? String(side.score) : undefined,
    isHome,
    winner: won,
    record,
    probablePitcher: pitcherName ? { name: pitcherName, shortName: pitcherName } : undefined,
  }
}

async function fetchStormChasers(): Promise<Game[]> {
  // No date param: the schedule endpoint defaults to today, so it rolls over
  // to the new day automatically, same as the ESPN scoreboards.
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=11&teamId=${STORM_CHASERS_TEAM_ID}&hydrate=team,linescore,broadcasts(all),probablePitcher`
  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) return []
    const data = (await res.json()) as { dates?: { games?: StatsApiGame[] }[] }
    const games: Game[] = []
    for (const date of data.dates ?? []) {
      for (const g of date.games ?? []) {
        const state = mapStatsApiState(g.status?.abstractGameState)
        const awayScore = g.teams?.away?.score
        const homeScore = g.teams?.home?.score
        const awayWon = state === "post" && awayScore !== undefined && homeScore !== undefined && awayScore > homeScore
        const homeWon = state === "post" && awayScore !== undefined && homeScore !== undefined && homeScore > awayScore
        const away = mapStatsApiSide(g.teams?.away, false, state === "post" ? awayWon : undefined)
        const home = mapStatsApiSide(g.teams?.home, true, state === "post" ? homeWon : undefined)
        const statusDetail =
          state === "in" && g.linescore?.currentInningOrdinal
            ? `${g.linescore.inningState ?? ""} ${g.linescore.currentInningOrdinal}`.trim()
            : (g.status?.detailedState ?? "")
        const broadcasts = Array.from(
          new Set((g.broadcasts ?? []).map((b) => b.name ?? b.callSign).filter((n): n is string => Boolean(n))),
        )
        games.push({
          id: `aaa-${g.gamePk}`,
          leagueId: "aaa",
          leagueLabel: "Triple-A",
          leagueShort: "AAA",
          category: "Baseball",
          name: `${away.name} at ${home.name}`,
          shortName: `${away.shortName} @ ${home.shortName}`,
          date: g.gameDate ?? "",
          state,
          statusDetail,
          competitors: [away, home],
          broadcasts,
          venue: g.venue?.name,
          link: `https://www.milb.com/gameday/${g.gamePk}`,
        })
      }
    }
    return games
  } catch {
    return []
  }
}

// ---------- MLB (Major League) via the MLB Stats API ----------

async function fetchMLBGames(): Promise<Game[]> {
  const today = todayESPN()
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today.slice(0,4)}-${today.slice(4,6)}-${today.slice(6,8)}&hydrate=team,linescore,broadcasts(all),probablePitcher`
  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) return []
    const data = (await res.json()) as { dates?: { games?: StatsApiGame[] }[] }
    const games: Game[] = []
    for (const date of data.dates ?? []) {
      for (const g of date.games ?? []) {
        const state = mapStatsApiState(g.status?.abstractGameState)
        const awayScore = g.teams?.away?.score
        const homeScore = g.teams?.home?.score
        const awayWon = state === "post" && awayScore !== undefined && homeScore !== undefined && awayScore > homeScore
        const homeWon = state === "post" && awayScore !== undefined && homeScore !== undefined && homeScore > awayScore
        const away = mapStatsApiSide(g.teams?.away, false, state === "post" ? awayWon : undefined)
        const home = mapStatsApiSide(g.teams?.home, true, state === "post" ? homeWon : undefined)
        const statusDetail =
          state === "in" && g.linescore?.currentInningOrdinal
            ? `${g.linescore.inningState ?? ""} ${g.linescore.currentInningOrdinal}`.trim()
            : (g.status?.detailedState ?? "")
        const broadcasts = Array.from(
          new Set((g.broadcasts ?? []).map((b) => b.name ?? b.callSign).filter((n): n is string => Boolean(n))),
        )
        games.push({
          id: `mlb-${g.gamePk}`,
          leagueId: "mlb",
          leagueLabel: "MLB",
          leagueShort: "MLB",
          category: "Baseball",
          name: `${away.name} at ${home.name}`,
          shortName: `${away.shortName} @ ${home.shortName}`,
          date: g.gameDate ?? "",
          state,
          statusDetail,
          competitors: [away, home],
          broadcasts,
          venue: g.venue?.name,
          link: `https://www.mlb.com/gameday/${g.gamePk}`,
        })
      }
    }
    return games
  } catch {
    return []
  }
}

// ---------- Favorites ----------

// Games featuring these teams are pinned in a Favorites section at the top.
export const FAVORITE_TEAMS = ["Los Angeles Angels", "Kansas City Royals", "Boston Red Sox", "Omaha Storm Chasers"]

export function isFavoriteGame(game: Game): boolean {
  return game.competitors.some((c) => FAVORITE_TEAMS.some((fav) => c.name.includes(fav) || fav.includes(c.name)))
}

// ---------- Top sports news (ESPN news feeds) ----------

export interface NewsArticle {
  id: string
  headline: string
  description?: string
  link: string
  image?: string
  published: string // ISO
  source: string // league label, e.g. "MLB"
}

interface EspnNewsResponse {
  articles?: {
    dataSourceIdentifier?: string
    headline?: string
    description?: string
    published?: string
    links?: { web?: { href?: string } }
    images?: { url?: string }[]
  }[]
}

// Matches the personalized sport set: no NHL/UFC.
const NEWS_FEEDS: { path: string; source: string }[] = [
  { path: "baseball/mlb", source: "MLB" },
  { path: "football/nfl", source: "NFL" },
  { path: "soccer/eng.1", source: "Soccer" },
  { path: "racing/f1", source: "F1" },
  { path: "golf/pga", source: "Golf" },
  { path: "tennis/atp", source: "Tennis" },
  { path: "basketball/nba", source: "NBA" },
]

async function fetchNewsFeed(feed: { path: string; source: string }): Promise<NewsArticle[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${feed.path}/news?limit=6`
  try {
    const res = await fetch(url, {
      // News moves slower than scores; refresh every 5 minutes.
      next: { revalidate: 300 },
      headers: { "User-Agent": "Mozilla/5.0 (sports-today)" },
    })
    if (!res.ok) return []
    const data = (await res.json()) as EspnNewsResponse
    return (data.articles ?? [])
      .filter((a) => a.headline && a.links?.web?.href)
      .map((a, i) => ({
        id: a.dataSourceIdentifier ?? `${feed.source}-${i}-${a.headline}`,
        headline: a.headline!,
        description: a.description,
        link: a.links!.web!.href!,
        image: a.images?.[0]?.url,
        published: a.published ?? "",
        source: feed.source,
      }))
  } catch {
    return []
  }
}

export async function getTopNews(): Promise<NewsArticle[]> {
  const results = await Promise.all(NEWS_FEEDS.map(fetchNewsFeed))
  const seen = new Set<string>()
  return results
    .flat()
    .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
    .filter((a) => {
      if (seen.has(a.headline)) return false
      seen.add(a.headline)
      return true
    })
    .slice(0, 8)
}

// ---------- Statcast highlights (MLB live feeds) ----------

export interface StatcastHighlight {
  id: string
  player: string
  team?: string
  event: string // e.g. "Home Run"
  description: string
  exitVelo?: number // mph
  distance?: number // ft
  launchAngle?: number
  matchup: string // e.g. "NYY @ BOS"
  link: string
}

// Thresholds for "extremely impressive": scorching contact, tape-measure
// distance, or any home run hit 105+.
const EV_THRESHOLD = 108
const DISTANCE_THRESHOLD = 425
const HR_EV_THRESHOLD = 105

interface LiveFeedPlay {
  result?: { event?: string; description?: string }
  about?: { atBatIndex?: number }
  matchup?: { batter?: { fullName?: string } }
  playEvents?: {
    hitData?: { launchSpeed?: number; totalDistance?: number; launchAngle?: number }
  }[]
}

async function fetchGameStatcast(gamePk: number, matchup: string): Promise<StatcastHighlight[]> {
  try {
    const res = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`, {
      // Live feeds are large; refresh every 2 minutes.
      next: { revalidate: 120 },
      headers: { "User-Agent": "Mozilla/5.0 (sports-today)" },
    })
    if (!res.ok) return []
    const data = (await res.json()) as {
      liveData?: { plays?: { allPlays?: LiveFeedPlay[] } }
    }
    const highlights: StatcastHighlight[] = []
    for (const play of data.liveData?.plays?.allPlays ?? []) {
      const hit = (play.playEvents ?? []).find((ev) => ev.hitData?.launchSpeed)?.hitData
      if (!hit?.launchSpeed) continue
      const eventType = play.result?.event ?? ""
      const isHomer = eventType === "Home Run"
      const impressive =
        hit.launchSpeed >= EV_THRESHOLD ||
        (hit.totalDistance ?? 0) >= DISTANCE_THRESHOLD ||
        (isHomer && hit.launchSpeed >= HR_EV_THRESHOLD)
      if (!impressive) continue
      const player = play.matchup?.batter?.fullName ?? "Unknown"
      highlights.push({
        id: `${gamePk}-${play.about?.atBatIndex ?? highlights.length}`,
        player,
        event: eventType,
        description: play.result?.description ?? "",
        exitVelo: hit.launchSpeed,
        distance: hit.totalDistance,
        launchAngle: hit.launchAngle,
        matchup,
        link: `https://www.mlb.com/gameday/${gamePk}`,
      })
    }
    return highlights
  } catch {
    return []
  }
}

export async function getStatcastHighlights(): Promise<StatcastHighlight[]> {
  try {
    const res = await fetch("https://statsapi.mlb.com/api/v1/schedule?sportId=1&hydrate=team", {
      next: { revalidate: 120 },
      headers: { "User-Agent": "Mozilla/5.0 (sports-today)" },
    })
    if (!res.ok) return []
    const data = (await res.json()) as {
      dates?: {
        games?: {
          gamePk: number
          status?: { abstractGameState?: string }
          teams?: {
            away?: { team?: { abbreviation?: string; name?: string } }
            home?: { team?: { abbreviation?: string; name?: string } }
          }
        }[]
      }[]
    }
    const active = (data.dates ?? [])
      .flatMap((d) => d.games ?? [])
      .filter((g) => g.status?.abstractGameState === "Live" || g.status?.abstractGameState === "Final")
      .slice(0, 12)
    const results = await Promise.all(
      active.map((g) => {
        const away = g.teams?.away?.team?.abbreviation ?? "AWY"
        const home = g.teams?.home?.team?.abbreviation ?? "HME"
        return fetchGameStatcast(g.gamePk, `${away} @ ${home}`)
      }),
    )
    return results
      .flat()
      .sort((a, b) => (b.exitVelo ?? 0) - (a.exitVelo ?? 0))
      .slice(0, 6)
  } catch {
    return []
  }
}

// ---------- F1 Standings (driver + constructor) ----------

export interface F1Driver {
  position: number
  name: string
  shortName: string
  team: string
  teamShort: string
  points: number
  wins: number
  logo?: string // constructor logo
}

export interface F1Constructor {
  position: number
  name: string
  shortName: string
  points: number
  wins: number
  logo?: string
}

interface EspnStandingsEntry {
  athlete?: { displayName?: string; shortName?: string }
  team?: { displayName?: string; shortDisplayName?: string; abbreviation?: string; logos?: { href?: string }[] }
  stats?: { name?: string; value?: number | string; displayValue?: string }[]
}

interface EspnStandingsGroup {
  standings?: { entries?: EspnStandingsEntry[] }
  entries?: EspnStandingsEntry[]
}

interface EspnStandingsResponse {
  standings?: {
    entries?: EspnStandingsEntry[]
    groups?: EspnStandingsGroup[]
  }
  children?: { standings?: { entries?: EspnStandingsEntry[] } }[]
}

function statVal(stats: EspnStandingsEntry["stats"], name: string): number {
  const s = (stats ?? []).find((s) => s.name === name)
  const v = s?.value ?? s?.displayValue
  return v !== undefined ? Number(v) : 0
}

export async function getF1Standings(): Promise<{ drivers: F1Driver[]; constructors: F1Constructor[] }> {
  const [driverRes, constructorRes] = await Promise.all([
    fetch("https://site.api.espn.com/apis/site/v2/sports/racing/f1/standings?season=2026&type=driver", {
      next: { revalidate: 300 },
      headers: { "User-Agent": "Mozilla/5.0 (sports-today)" },
    }),
    fetch("https://site.api.espn.com/apis/site/v2/sports/racing/f1/standings?season=2026&type=constructor", {
      next: { revalidate: 300 },
      headers: { "User-Agent": "Mozilla/5.0 (sports-today)" },
    }),
  ])

  const drivers: F1Driver[] = []
  const constructors: F1Constructor[] = []

  if (driverRes.ok) {
    const data = (await driverRes.json()) as EspnStandingsResponse
    const entries =
      data.standings?.entries ??
      data.standings?.groups?.flatMap((g) => g.standings?.entries ?? g.entries ?? []) ??
      data.children?.flatMap((c) => c.standings?.entries ?? []) ??
      []
    entries.forEach((e, i) => {
      const name = e.athlete?.displayName ?? e.team?.displayName ?? ""
      if (!name) return
      drivers.push({
        position: i + 1,
        name,
        shortName: e.athlete?.shortName ?? e.team?.shortDisplayName ?? name,
        team: e.team?.displayName ?? "",
        teamShort: e.team?.abbreviation ?? e.team?.shortDisplayName ?? "",
        points: statVal(e.stats, "points") || statVal(e.stats, "pts") || statVal(e.stats, "totalPoints"),
        wins: statVal(e.stats, "wins") || statVal(e.stats, "w"),
        logo: e.team?.logos?.[0]?.href,
      })
    })
  }

  if (constructorRes.ok) {
    const data = (await constructorRes.json()) as EspnStandingsResponse
    const entries =
      data.standings?.entries ??
      data.standings?.groups?.flatMap((g) => g.standings?.entries ?? g.entries ?? []) ??
      data.children?.flatMap((c) => c.standings?.entries ?? []) ??
      []
    entries.forEach((e, i) => {
      const name = e.team?.displayName ?? ""
      if (!name) return
      constructors.push({
        position: i + 1,
        name,
        shortName: e.team?.shortDisplayName ?? e.team?.abbreviation ?? name,
        points: statVal(e.stats, "points") || statVal(e.stats, "pts") || statVal(e.stats, "totalPoints"),
        wins: statVal(e.stats, "wins") || statVal(e.stats, "w"),
        logo: e.team?.logos?.[0]?.href,
      })
    })
  }

  return { drivers, constructors }
}

// ---------- PGA Leaderboard ----------

export interface PGAPlayer {
  position: number
  name: string
  shortName: string
  score: string // e.g. "-12" or "E"
  today: string // today's round score
  thru: string // e.g. "F" or "12"
  isBigName: boolean
  logo?: string
}

// Top names to prioritize in the leaderboard
const PGA_BIG_NAMES = new Set([
  "Scottie Scheffler", "Rory McIlroy", "Jon Rahm", "Brooks Koepka", "Xander Schauffele",
  "Patrick Cantlay", "Viktor Hovland", "Collin Morikawa", "Justin Thomas", "Jordan Spieth",
  "Dustin Johnson", "Tiger Woods", "Phil Mickelson", "Bryson DeChambeau", "Tony Finau",
  "Shane Lowry", "Tommy Fleetwood", "Ludvig Aberg", "Hideki Matsuyama", "Max Homa",
])

export async function getPGALeaderboard(): Promise<PGAPlayer[]> {
  try {
    // ESPN only exposes golf data via /scoreboard (not /leaderboard).
    // The scoreboard returns competitors sorted by `order` (leaderboard position).
    // `score` is a raw integer (strokes vs par), `linescores` are per-round scores.
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard", {
      next: { revalidate: 120 },
      headers: { "User-Agent": "Mozilla/5.0 (sports-today)" },
    })
    if (!res.ok) return []
    const data = (await res.json()) as {
      events?: {
        name?: string
        competitions?: {
          status?: { type?: { completed?: boolean; description?: string } }
          competitors?: {
            order?: number
            athlete?: { displayName?: string; shortName?: string }
            score?: number | string
            linescores?: { displayValue?: string; value?: number | string }[]
          }[]
        }[]
      }[]
    }

    const competitors = data.events?.[0]?.competitions?.[0]?.competitors ?? []
    const players: PGAPlayer[] = competitors.slice(0, 70).map((c) => {
      const name = c.athlete?.displayName ?? "Unknown"
      const rawScore = c.score
      // Format score as "+N", "-N", or "E"
      const scoreNum = rawScore !== undefined && rawScore !== null ? Number(rawScore) : null
      const scoreStr =
        scoreNum === null
          ? "E"
          : scoreNum === 0
            ? "E"
            : scoreNum > 0
              ? `+${scoreNum}`
              : `${scoreNum}`
      // Latest round score from last linescore entry
      const ls = c.linescores ?? []
      const lastRound = ls[ls.length - 1]?.displayValue ?? ls[ls.length - 1]?.value?.toString() ?? "-"

      return {
        position: c.order ?? 99,
        name,
        shortName: c.athlete?.shortName ?? name,
        score: scoreStr,
        today: lastRound,
        thru: "-",
        isBigName: PGA_BIG_NAMES.has(name),
      }
    })

    // Sort by actual leaderboard position, but always surface big names within top 25
    return players.sort((a, b) => {
      if (a.isBigName && !b.isBigName && b.position > 20) return -1
      if (b.isBigName && !a.isBigName && a.position > 20) return 1
      return a.position - b.position
    })
  } catch {
    return []
  }
}

// ---------- Top standings for the biggest leagues in season ----------

export interface StandingsRow {
  rank: number
  name: string
  abbreviation: string
  logo: string
  record: string
  pct?: string
  gb?: string
  streak?: string
  trend?: string
}

export interface StandingsGroup {
  label?: string
  rows: StandingsRow[]
}

export interface StandingsBoard {
  id: "cfb" | "ncaam" | "nfl" | "nba"
  title: string
  subtitle: string
  kind: "poll" | "standings"
  category: LeagueCategory
  groups: StandingsGroup[]
}

interface EspnLogo { href?: string; rel?: string[] }
interface EspnBoardTeam {
  location?: string
  displayName?: string
  shortDisplayName?: string
  abbreviation?: string
  logos?: EspnLogo[]
}

function pickLogo(logos?: EspnLogo[]): string {
  if (!logos?.length) return ""
  return (logos.find((l) => l.rel?.includes("default")) ?? logos[0]).href ?? ""
}

const BOARD_FETCH_INIT = {
  next: { revalidate: 300 },
  headers: { "User-Agent": "Mozilla/5.0 (sports-today)" },
} as const

async function fetchPollBoard(
  id: "cfb" | "ncaam",
  title: string,
  url: string,
  category: LeagueCategory,
): Promise<StandingsBoard | null> {
  try {
    const res = await fetch(url, BOARD_FETCH_INIT)
    if (!res.ok) return null
    const data = (await res.json()) as {
      rankings?: {
        type?: string
        headline?: string
        ranks?: {
          current?: number
          trend?: string
          recordSummary?: string
          team?: EspnBoardTeam
        }[]
      }[]
    }
    const ap = data.rankings?.find((r) => r.type === "ap") ?? data.rankings?.[0]
    if (!ap?.ranks?.length) return null
    const rows: StandingsRow[] = ap.ranks.slice(0, 10).map((r, i) => ({
      rank: r.current ?? i + 1,
      name: r.team?.location ?? r.team?.displayName ?? "Unknown",
      abbreviation: r.team?.abbreviation ?? "",
      logo: pickLogo(r.team?.logos),
      record: r.recordSummary ?? "",
      trend: r.trend,
    }))
    const week = ap.headline?.match(/Week\s+\d+/i)?.[0]
    return {
      id,
      title,
      subtitle: week ? `AP Top 25 · ${week}` : "AP Top 25",
      kind: "poll",
      category,
      groups: [{ rows }],
    }
  } catch {
    return null
  }
}

async function fetchConferenceBoard(
  id: "nfl" | "nba",
  title: string,
  url: string,
  category: LeagueCategory,
  perConference: number,
): Promise<StandingsBoard | null> {
  try {
    const res = await fetch(url, BOARD_FETCH_INIT)
    if (!res.ok) return null
    const data = (await res.json()) as {
      children?: {
        name?: string
        abbreviation?: string
        standings?: {
          entries?: {
            team?: EspnBoardTeam
            stats?: { name?: string; displayValue?: string; value?: number }[]
          }[]
        }
      }[]
    }
    const groups: StandingsGroup[] = []
    for (const conf of data.children ?? []) {
      const entries = (conf.standings?.entries ?? []).map((e) => {
        const stat = (name: string) => e.stats?.find((s) => s.name === name)
        return {
          seed: stat("playoffSeed")?.value ?? 99,
          row: {
            rank: 0,
            name: e.team?.shortDisplayName ?? e.team?.displayName ?? "Unknown",
            abbreviation: e.team?.abbreviation ?? "",
            logo: pickLogo(e.team?.logos),
            record: stat("overall")?.displayValue ?? "",
            pct: stat("winPercent")?.displayValue,
            gb: stat("gamesBehind")?.displayValue,
            streak: stat("streak")?.displayValue,
          } as StandingsRow,
        }
      })
      entries.sort((a, b) => a.seed - b.seed)
      const rows = entries.slice(0, perConference).map((e, i) => ({ ...e.row, rank: i + 1 }))
      if (rows.length) groups.push({ label: conf.name ?? conf.abbreviation, rows })
    }
    if (groups.length === 0) return null
    return { id, title, subtitle: "Top seeds by conference", kind: "standings", category, groups }
  } catch {
    return null
  }
}

/**
 * Top standings for the most-followed leagues that are actually in season right
 * now. A league drops off the page the day its season window closes, so this
 * adapts without any manual switching.
 */
export async function getTopStandings(now: Date = new Date()): Promise<StandingsBoard[]> {
  const inFootball = isCategoryInSeason("Football", now)
  const inBasketball = isCategoryInSeason("Basketball", now)
  const boards = await Promise.all([
    inFootball
      ? fetchPollBoard(
          "cfb",
          "College Football",
          "https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings",
          "Football",
        )
      : null,
    inFootball
      ? fetchConferenceBoard(
          "nfl",
          "NFL",
          "https://site.api.espn.com/apis/v2/sports/football/nfl/standings",
          "Football",
          5,
        )
      : null,
    inBasketball
      ? fetchConferenceBoard(
          "nba",
          "NBA",
          "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings",
          "Basketball",
          5,
        )
      : null,
    inBasketball
      ? fetchPollBoard(
          "ncaam",
          "College Basketball",
          "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/rankings",
          "Basketball",
        )
      : null,
  ])
  return boards.filter((b): b is StandingsBoard => b !== null)
}

export interface SportsData {
  games: Game[]
  news: NewsArticle[]
  statcast: StatcastHighlight[]
  f1Standings: { drivers: F1Driver[]; constructors: F1Constructor[] }
  pgaLeaderboard: PGAPlayer[]
  standingsBoards: StandingsBoard[]
  fetchedAt: string
}

const MAX_SOCCER_GAMES_PER_LEAGUE = 24

export async function getTodaysGames(): Promise<SportsData> {
  const [results, news, statcast, f1Standings, pgaLeaderboard, standingsBoards] = await Promise.all([
    Promise.all(LEAGUES.map((league) => {
      if (league.id === "aaa") return fetchStormChasers()
      if (league.id === "mlb") return fetchMLBGames()
      if (league.category === "Soccer") return fetchSoccerWeek(league)
      return fetchLeague(league)
    })),
    getTopNews(),
    getStatcastHighlights(),
    getF1Standings(),
    getPGALeaderboard(),
    getTopStandings(),
  ])
  // Stamp isToday: compare each game's date against today's YYYYMMDD string
  // so the client can sort/filter without re-parsing dates in multiple places.
  const todayStr = todayESPN() // "YYYYMMDD"
  const todayYMD = `${todayStr.slice(0, 4)}-${todayStr.slice(4, 6)}-${todayStr.slice(6, 8)}`
  const stamped = results.flat().map((g) => ({
    ...g,
    // Soccer now spans a full week of fixtures, so a finished match only
    // counts as "today" if it was actually played today.
    isToday:
      g.category === "Soccer"
        ? g.state === "in" || etDayOfIso(g.date) === todayStr
        : g.state === "in" || g.state === "post" || g.date.startsWith(todayYMD),
  }))

  // A week of soccer can be a lot of cards (international windows especially).
  // Keep each league's live and today's matches, then the soonest upcoming.
  const soccerRank = (g: Game) => (g.state === "in" ? 0 : g.isToday ? 1 : 2)
  const perLeague = new Map<string, number>()
  const kept = new Set<Game>()
  const byPriority = stamped
    .filter((g) => g.category === "Soccer")
    .sort((a, b) => soccerRank(a) - soccerRank(b) || new Date(a.date).getTime() - new Date(b.date).getTime())
  for (const g of byPriority) {
    const n = perLeague.get(g.leagueId) ?? 0
    if (n < MAX_SOCCER_GAMES_PER_LEAGUE) {
      perLeague.set(g.leagueId, n + 1)
      kept.add(g)
    }
  }
  const games = stamped.filter((g) => g.category !== "Soccer" || kept.has(g))
  return { games, news, statcast, f1Standings, pgaLeaderboard, standingsBoards, fetchedAt: new Date().toISOString() }
}
