// Live sports data via ESPN's public (unofficial) scoreboard endpoints.
// No API key required. The scoreboard endpoint returns "today's" slate by
// default, so this naturally rolls over to a new day. We revalidate on a
// short interval so times/scores stay fresh and the date updates on its own.

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
  { id: "mlb", label: "MLB", shortLabel: "MLB", category: "Baseball", path: "baseball/mlb" },
  // Triple-A (Omaha Storm Chasers) comes from the MLB Stats API, not ESPN —
  // path is unused; getTodaysGames routes this id to fetchStormChasers().
  { id: "aaa", label: "Triple-A", shortLabel: "AAA", category: "Baseball", path: "" },
  { id: "nfl", label: "NFL", shortLabel: "NFL", category: "Football", path: "football/nfl" },
  {
    id: "ncaaf",
    label: "College Football",
    shortLabel: "NCAAF",
    category: "Football",
    path: "football/college-football",
  },
  { id: "epl", label: "Premier League", shortLabel: "EPL", category: "Soccer", path: "soccer/eng.1" },
  {
    id: "ucl",
    label: "Champions League",
    shortLabel: "UCL",
    category: "Soccer",
    path: "soccer/uefa.champions",
  },
  { id: "laliga", label: "La Liga", shortLabel: "La Liga", category: "Soccer", path: "soccer/esp.1" },
  { id: "mls", label: "MLS", shortLabel: "MLS", category: "Soccer", path: "soccer/usa.1" },
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

async function fetchLeague(league: LeagueConfig): Promise<Game[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${league.path}/scoreboard`
  try {
    const res = await fetch(url, {
      // Refresh every 60s so live scores stay current; the endpoint tracks
      // the current day itself, so the slate rolls over automatically.
      next: { revalidate: 60 },
      headers: { "User-Agent": "Mozilla/5.0 (sports-today)" },
    })
    if (!res.ok) return []
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
    return games
  } catch {
    return []
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
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { "User-Agent": "Mozilla/5.0 (sports-today)" },
    })
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

// ---------- Favorites ----------

// Games featuring these teams are pinned in a Favorites section at the top.
export const FAVORITE_TEAMS = ["Los Angeles Angels", "Boston Red Sox", "Omaha Storm Chasers"]

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
    fetch("https://site.api.espn.com/apis/site/v2/sports/racing/f1/standings?season=2025&type=driver", {
      next: { revalidate: 300 },
      headers: { "User-Agent": "Mozilla/5.0 (sports-today)" },
    }),
    fetch("https://site.api.espn.com/apis/site/v2/sports/racing/f1/standings?season=2025&type=constructor", {
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

// ---------- MLB Standings (live via MLB Stats API) ----------

export interface MLBStandingTeam {
  teamId: number
  name: string
  shortName: string
  abbreviation: string
  division: string
  wins: number
  losses: number
  pct: string
  gb: string
  logo: string
}

export async function getMLBStandings(): Promise<MLBStandingTeam[]> {
  try {
    const res = await fetch(
      "https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2025&standingsTypes=regularSeason&hydrate=team",
      {
        next: { revalidate: 300 },
        headers: { "User-Agent": "Mozilla/5.0 (sports-today)" },
      },
    )
    if (!res.ok) return []
    const data = (await res.json()) as {
      records?: {
        division?: { id?: number; nameShort?: string }
        teamRecords?: {
          team?: { id?: number; name?: string; teamName?: string; abbreviation?: string; clubName?: string }
          wins?: number
          losses?: number
          winningPercentage?: string
          gamesBack?: string
          divisionRank?: string
        }[]
      }[]
    }

    const divisionNames: Record<number, string> = {
      200: "AL West", 201: "AL East", 202: "AL Central",
      203: "NL West", 204: "NL East", 205: "NL Central",
    }

    const teams: MLBStandingTeam[] = []
    for (const record of data.records ?? []) {
      const divId = record.division?.id ?? 0
      const division = divisionNames[divId] ?? record.division?.nameShort ?? "Unknown"
      for (const tr of record.teamRecords ?? []) {
        const teamId = tr.team?.id ?? 0
        teams.push({
          teamId,
          name: tr.team?.name ?? "Unknown",
          shortName: tr.team?.teamName ?? tr.team?.clubName ?? tr.team?.abbreviation ?? "???",
          abbreviation: tr.team?.abbreviation ?? "???",
          division,
          wins: tr.wins ?? 0,
          losses: tr.losses ?? 0,
          pct: tr.winningPercentage ?? ".000",
          gb: tr.gamesBack ?? "-",
          logo: teamId ? `https://www.mlbstatic.com/team-logos/${teamId}.svg` : "",
        })
      }
    }
    return teams
  } catch {
    return []
  }
}

export interface SportsData {
  games: Game[]
  news: NewsArticle[]
  statcast: StatcastHighlight[]
  f1Standings: { drivers: F1Driver[]; constructors: F1Constructor[] }
  pgaLeaderboard: PGAPlayer[]
  mlbStandings: MLBStandingTeam[]
  fetchedAt: string
}

export async function getTodaysGames(): Promise<SportsData> {
  const [results, news, statcast, f1Standings, pgaLeaderboard, mlbStandings] = await Promise.all([
    Promise.all(LEAGUES.map((league) => (league.id === "aaa" ? fetchStormChasers() : fetchLeague(league)))),
    getTopNews(),
    getStatcastHighlights(),
    getF1Standings(),
    getPGALeaderboard(),
    getMLBStandings(),
  ])
  const games = results.flat()
  return { games, news, statcast, f1Standings, pgaLeaderboard, mlbStandings, fetchedAt: new Date().toISOString() }
}
