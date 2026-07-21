// Live sports data via ESPN's public (unofficial) scoreboard endpoints.
// No API key required. The scoreboard endpoint returns "today's" slate by
// default, so this naturally rolls over to a new day. We revalidate on a
// short interval so times/scores stay fresh and the date updates on its own.

// Sports are ranked in display order: Baseball, Soccer, Football, Basketball,
// Hockey, then Combat & Motorsport.
export type LeagueCategory =
  | "Baseball"
  | "Soccer"
  | "Football"
  | "Basketball"
  | "Hockey"
  | "Combat & Motorsport"

export interface LeagueConfig {
  id: string
  label: string
  shortLabel: string
  category: LeagueCategory
  path: string // ESPN sport/league path
}

export const LEAGUES: LeagueConfig[] = [
  { id: "mlb", label: "MLB", shortLabel: "MLB", category: "Baseball", path: "baseball/mlb" },
  { id: "epl", label: "Premier League", shortLabel: "EPL", category: "Soccer", path: "soccer/eng.1" },
  {
    id: "ucl",
    label: "Champions League",
    shortLabel: "UCL",
    category: "Soccer",
    path: "soccer/uefa.champions",
  },
  { id: "mls", label: "MLS", shortLabel: "MLS", category: "Soccer", path: "soccer/usa.1" },
  { id: "laliga", label: "La Liga", shortLabel: "La Liga", category: "Soccer", path: "soccer/esp.1" },
  { id: "nfl", label: "NFL", shortLabel: "NFL", category: "Football", path: "football/nfl" },
  {
    id: "ncaaf",
    label: "College Football",
    shortLabel: "NCAAF",
    category: "Football",
    path: "football/college-football",
  },
  { id: "nba", label: "NBA", shortLabel: "NBA", category: "Basketball", path: "basketball/nba" },
  {
    id: "ncaam",
    label: "College Basketball",
    shortLabel: "NCAAM",
    category: "Basketball",
    path: "basketball/mens-college-basketball",
  },
  { id: "nhl", label: "NHL", shortLabel: "NHL", category: "Hockey", path: "hockey/nhl" },
  { id: "ufc", label: "UFC", shortLabel: "UFC", category: "Combat & Motorsport", path: "mma/ufc" },
  { id: "f1", label: "Formula 1", shortLabel: "F1", category: "Combat & Motorsport", path: "racing/f1" },
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
}

interface EspnResponse {
  events?: EspnEvent[]
}

interface EspnEvent {
  id: string
  name?: string
  shortName?: string
  date?: string
  competitions?: EspnCompetition[]
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

interface EspnCompetitor {
  homeAway?: string
  winner?: boolean
  score?: string
  team?: { displayName?: string; shortDisplayName?: string; abbreviation?: string; logo?: string }
  athlete?: { displayName?: string; shortName?: string; flag?: { href?: string } }
  records?: { summary?: string }[]
  probables?: EspnProbable[]
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
  return {
    name: team?.displayName ?? athlete?.displayName ?? "TBD",
    shortName: team?.shortDisplayName ?? team?.abbreviation ?? athlete?.shortName ?? "TBD",
    logo: team?.logo ?? athlete?.flag?.href,
    score: c.score,
    isHome: c.homeAway === "home",
    winner: c.winner,
    record: c.records?.[0]?.summary,
    probablePitcher: mapProbablePitcher(c),
  }
}

async function fetchLeague(league: LeagueConfig): Promise<Game[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${league.path}/scoreboard`
  try {
    const res = await fetch(url, {
      // Refresh every 5 minutes; the endpoint tracks the current day itself.
      next: { revalidate: 300 },
      headers: { "User-Agent": "Mozilla/5.0 (sports-today)" },
    })
    if (!res.ok) return []
    const data = (await res.json()) as EspnResponse
    const games: Game[] = []
    for (const event of data.events ?? []) {
      const comp = event.competitions?.[0]
      if (!comp) continue
      const state = (comp.status?.type?.state as GameState) ?? "pre"
      const competitors = (comp.competitors ?? []).map(mapCompetitor)
      // Order away first, home second for team sports.
      competitors.sort((a, b) => Number(a.isHome) - Number(b.isHome))
      games.push({
        id: event.id,
        leagueId: league.id,
        leagueLabel: league.label,
        leagueShort: league.shortLabel,
        category: league.category,
        name: event.name ?? event.shortName ?? "",
        shortName: event.shortName ?? event.name ?? "",
        date: comp.date ?? event.date ?? "",
        state,
        statusDetail: comp.status?.type?.shortDetail ?? comp.status?.type?.detail ?? "",
        competitors,
        broadcasts: extractBroadcasts(comp),
        venue: comp.venue?.fullName,
        note: comp.notes?.[0]?.headline,
      })
    }
    return games
  } catch {
    return []
  }
}

export interface SportsData {
  games: Game[]
  fetchedAt: string
}

export async function getTodaysGames(): Promise<SportsData> {
  const results = await Promise.all(LEAGUES.map(fetchLeague))
  const games = results.flat()
  return { games, fetchedAt: new Date().toISOString() }
}
