import { streamText, createUIMessageStreamResponse } from 'ai'
import {
  getTodaysGames,
  type Game,
  type NewsArticle,
  type MLBStandingTeam,
  type F1Driver,
  type F1Constructor,
  type PGAPlayer,
} from '@/lib/espn'
import { getGameVibe } from '@/lib/game-vibe'

// AI SDK routes `provider/model` strings through Vercel AI Gateway automatically.
const MODEL = 'openai/gpt-4.1'

export const dynamic = 'force-dynamic'

// ─── Intent classification ────────────────────────────────────────────────────

type Intent =
  | 'standings'
  | 'live_scores'
  | 'schedule'
  | 'news'
  | 'general'

// Division / conference name patterns that always imply standings intent.
const DIVISION_PATTERN =
  /\b(nl|al|afc|nfc|eastern|western|central|north|south|atlantic|pacific|metropolitan)\s+(east|west|central|north|south|division|conference)?\b|\b(nl|al)\s+(east|west|central)\b|\b(american league|national league)\s+(east|west|central)\b/i

function classifyIntent(q: string): Intent {
  const lower = q.toLowerCase()

  // Standings — broad set of phrases, including implicit "who leads / who's first" patterns.
  if (
    // Explicit standings vocabulary
    /\b(standing|rank(ing|ings|ed)?|table|leaderboard|points leader|points table)\b/.test(lower) ||
    // Division / conference names are a dead giveaway
    DIVISION_PATTERN.test(lower) ||
    // "Who leads / who's first / who's on top" type questions
    /\b(who (leads?|is (first|second|third|on top|in (first|last)|ahead)|has (the )?best (record|win)|tops?|leads? the)\b|leading (the )?(division|league|conference|standings)|division leader|first place|last place|top of (the )?(table|division|league|standings)|best record|worst record|games? back|gb|in (first|last) place|position in (the )?(league|table|division)|how (many games? )?(back|ahead))\b/.test(lower) ||
    // "Where do the [team] sit / rank / stand"
    /\b(where (do|does|are|is) .{2,30} (sit|stand|rank|place)|how (are|is) .{2,20} (doing|performing) in the (division|league|standings))\b/.test(lower)
  )
    return 'standings'

  if (/\b(live|right now|happening|current(ly)?|score(s|line)?|final|result|winning|losing|inning|quarter|half|period|overtime)\b/.test(lower))
    return 'live_scores'
  if (/\b(next game|schedule|when (do|does|is|are)|upcoming|tip.?off|first pitch|kick.?off|tee time|start time|broadcast|channel|watch|air)\b/.test(lower))
    return 'schedule'
  if (/\b(news|trade|injury|injur|report|sign(ed|ing)?|fire[ds]?|hire[ds]?|deal|contract|retire|suspend|suspend|transfer|rumou?r|latest|update|broke?|breaking)\b/.test(lower))
    return 'news'
  return 'general'
}

// ─── Entity extraction ────────────────────────────────────────────────────────

const LEAGUE_ALIASES: Record<string, string[]> = {
  // MLB division names (NL/AL East/West/Central) are unique identifiers for baseball.
  mlb: [
    'mlb', 'baseball', 'major league baseball',
    'nl east', 'nl west', 'nl central',
    'al east', 'al west', 'al central',
    'national league east', 'national league west', 'national league central',
    'american league east', 'american league west', 'american league central',
  ],
  nfl: ['nfl', 'football', 'national football league'],
  ncaaf: ['ncaaf', 'college football', 'cfb'],
  nba: ['nba', 'basketball', 'national basketball'],
  ncaam: ['ncaam', 'college basketball', 'march madness'],
  epl: ['epl', 'premier league', 'english premier', 'bpl'],
  ucl: ['ucl', 'champions league', 'uefa champions'],
  laliga: ['laliga', 'la liga', 'spanish league'],
  mls: ['mls', 'major league soccer'],
  f1: ['f1', 'formula 1', 'formula one', 'formula1', 'grand prix'],
  pga: ['pga', 'golf', 'masters', 'open championship', 'us open golf'],
  atp: ['atp', 'tennis', 'wimbledon', 'us open tennis', 'french open', 'australian open'],
  wta: ['wta', "women's tennis"],
  aaa: ['aaa', 'triple-a', 'triple a', 'storm chasers', 'omaha'],
}

function extractLeague(q: string): string | null {
  const lower = q.toLowerCase()
  for (const [id, aliases] of Object.entries(LEAGUE_ALIASES)) {
    if (aliases.some((a) => lower.includes(a))) return id
  }
  return null
}

function filterGamesByQuery(games: Game[], q: string): Game[] {
  const lower = q.toLowerCase()
  const words = lower.split(/\s+/).filter((w) => w.length > 3)
  return games.filter((g) => {
    const haystack = [
      g.name, g.shortName, g.leagueLabel, g.leagueShort,
      ...g.competitors.map((c) => c.name),
      ...g.competitors.map((c) => c.shortName),
    ].join(' ').toLowerCase()
    return words.some((w) => haystack.includes(w))
  })
}

// ─── Context builders ─────────────────────────────────────────────────────────

function formatGame(g: Game): string {
  const scoreline = g.competitors
    .map((c) => `${c.shortName}${c.score !== undefined ? ` ${c.score}` : ''}${c.record ? ` (${c.record})` : ''}`)
    .join(' vs ')
  const stateLabel =
    g.state === 'in' ? 'LIVE' : g.state === 'post' ? 'FINAL' : 'Scheduled'
  const status = g.statusDetail ? ` — ${g.statusDetail}` : ''
  const vibe = getGameVibe(g)
  const vibeStr = vibe ? ` [${vibe.label}]` : ''
  const broadcast = g.broadcasts.length ? ` | TV: ${g.broadcasts.join(', ')}` : ''
  const venue = g.venue ? ` | Venue: ${g.venue}` : ''
  const date = g.date ? ` | ${new Date(g.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}` : ''
  return `${g.leagueShort}: ${scoreline}${stateLabel === 'Scheduled' ? '' : ` [${stateLabel}${status}]`}${vibeStr}${date}${broadcast}${venue}`
}

function buildScoresContext(games: Game[], leagueFilter: string | null, q: string): string {
  let filtered = leagueFilter ? games.filter((g) => g.leagueId === leagueFilter) : games
  const queryFiltered = filterGamesByQuery(games, q)
  if (queryFiltered.length > 0 && queryFiltered.length < filtered.length) {
    filtered = queryFiltered
  }
  const live = filtered.filter((g) => g.state === 'in')
  const final = filtered.filter((g) => g.state === 'post')
  const pre = filtered.filter((g) => g.state === 'pre')
  const sections: string[] = []
  if (live.length) sections.push(`LIVE GAMES:\n${live.map(formatGame).join('\n')}`)
  if (final.length) sections.push(`FINAL SCORES:\n${final.map(formatGame).join('\n')}`)
  if (pre.length) sections.push(`UPCOMING:\n${pre.slice(0, 10).map(formatGame).join('\n')}`)
  return sections.join('\n\n') || 'No games found for this query today.'
}

function buildScheduleContext(games: Game[], leagueFilter: string | null, q: string): string {
  let filtered = leagueFilter ? games.filter((g) => g.leagueId === leagueFilter) : games
  const queryFiltered = filterGamesByQuery(games, q)
  if (queryFiltered.length > 0) filtered = queryFiltered
  const upcoming = filtered
    .filter((g) => g.state === 'pre')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 15)
  const recent = filtered
    .filter((g) => g.state === 'post')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
  const sections: string[] = []
  if (upcoming.length) sections.push(`UPCOMING GAMES:\n${upcoming.map(formatGame).join('\n')}`)
  if (recent.length) sections.push(`RECENT RESULTS:\n${recent.map(formatGame).join('\n')}`)
  return sections.join('\n\n') || 'No schedule data found for this query.'
}

function buildNewsContext(news: NewsArticle[], leagueFilter: string | null, q: string): string {
  let filtered = news
  if (leagueFilter) {
    const leagueLabel = leagueFilter.toUpperCase()
    filtered = news.filter((a) => a.source.toUpperCase().includes(leagueLabel) || leagueLabel.includes(a.source.toUpperCase()))
  }
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  const scored = filtered.map((a) => {
    const haystack = `${a.headline} ${a.description ?? ''}`.toLowerCase()
    const score = words.filter((w) => haystack.includes(w)).length
    return { article: a, score }
  })
  scored.sort((a, b) => b.score - a.score || new Date(b.article.published).getTime() - new Date(a.article.published).getTime())
  const top = scored.slice(0, 8).map(({ article: a }) => {
    const age = a.published
      ? (() => {
          const diffMs = Date.now() - new Date(a.published).getTime()
          const mins = Math.round(diffMs / 60_000)
          return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`
        })()
      : 'recently'
    return `[${a.source} — ${age}] ${a.headline}${a.description ? `: ${a.description}` : ''}`
  })
  return top.length ? top.join('\n') : 'No recent news found for this query.'
}

// Detect which specific division (if any) the user is asking about.
function extractDivision(q: string): string | null {
  const lower = q.toLowerCase()
  const divMap: Record<string, string[]> = {
    'NL West':    ['nl west', 'national league west'],
    'NL East':    ['nl east', 'national league east'],
    'NL Central': ['nl central', 'national league central'],
    'AL West':    ['al west', 'american league west'],
    'AL East':    ['al east', 'american league east'],
    'AL Central': ['al central', 'american league central'],
  }
  for (const [div, aliases] of Object.entries(divMap)) {
    if (aliases.some((a) => lower.includes(a))) return div
  }
  return null
}

function buildMLBStandingsContext(teams: MLBStandingTeam[], q = ''): string {
  const targetDiv = extractDivision(q)
  const byDivision: Record<string, MLBStandingTeam[]> = {}
  for (const t of teams) {
    if (!byDivision[t.division]) byDivision[t.division] = []
    byDivision[t.division].push(t)
  }

  // Division order: AL first, then NL; within each league: East, Central, West.
  const divOrder = ['AL East', 'AL Central', 'AL West', 'NL East', 'NL Central', 'NL West']
  const entries = divOrder
    .filter((d) => byDivision[d])
    .map((div) => ({ div, teams: byDivision[div] }))

  // If the question names a specific division, put that division first (or only show it).
  if (targetDiv) {
    const target = entries.find((e) => e.div === targetDiv)
    if (target) {
      // Show the target division prominently, then append others for context.
      const rest = entries.filter((e) => e.div !== targetDiv)
      const renderDiv = ({ div, teams: ts }: { div: string; teams: MLBStandingTeam[] }) => {
        const sorted = [...ts].sort((a, b) => b.wins - a.wins || a.losses - b.losses)
        const rows = sorted.map((t, i) => {
          const rank = i === 0 ? '1st (LEADER)' : `${i + 1}${i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}`
          const gbStr = t.gb === '-' || t.gb === '0' || t.gb === '0.0' ? 'GB: —' : `GB: ${t.gb}`
          return `  ${rank}  ${t.shortName} (${t.abbreviation})  ${t.wins}-${t.losses} (${t.pct})  ${gbStr}`
        })
        return `${div}:\n${rows.join('\n')}`
      }
      return [renderDiv(target), ...rest.map(renderDiv)].join('\n\n')
    }
  }

  // No specific division — show all six with condensed rows.
  return entries
    .map(({ div, teams: ts }) => {
      const sorted = [...ts].sort((a, b) => b.wins - a.wins || a.losses - b.losses)
      const rows = sorted.map((t, i) => {
        const gbStr = t.gb === '-' || t.gb === '0' || t.gb === '0.0' ? '—' : t.gb
        return `  ${i + 1}. ${t.shortName} ${t.wins}-${t.losses} (${t.pct}) GB:${gbStr}`
      })
      return `${div}:\n${rows.join('\n')}`
    })
    .join('\n\n')
}

function buildF1StandingsContext(drivers: F1Driver[], constructors: F1Constructor[]): string {
  const driverRows = drivers.slice(0, 10)
    .map((d) => `  ${d.position}. ${d.name} (${d.teamShort}) — ${d.points} pts, ${d.wins} wins`)
    .join('\n')
  const ctorRows = constructors.slice(0, 5)
    .map((c) => `  ${c.position}. ${c.name} — ${c.points} pts, ${c.wins} wins`)
    .join('\n')
  return `F1 DRIVER STANDINGS (top 10):\n${driverRows}\n\nF1 CONSTRUCTOR STANDINGS (top 5):\n${ctorRows}`
}

function buildPGAContext(players: PGAPlayer[]): string {
  const rows = players.slice(0, 15)
    .map((p) => `  ${p.position}. ${p.name} — ${p.score} (Today: ${p.today})`)
    .join('\n')
  return `PGA LEADERBOARD (top 15):\n${rows}`
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let question = ''
  try {
    const body = await req.json() as {
      question?: string
      messages?: Array<{
        role: string
        content?: string
        parts?: Array<{ type: string; text?: string }>
      }>
    }

    question = body.question ?? ''
    if (!question && body.messages?.length) {
      const lastUser = [...body.messages].reverse().find((m) => m.role === 'user')
      if (lastUser) {
        if (lastUser.parts?.length) {
          question = lastUser.parts.filter((p) => p.type === 'text').map((p) => p.text ?? '').join('')
        }
        if (!question && typeof lastUser.content === 'string') {
          question = lastUser.content
        }
      }
    }

    if (!question) {
      return Response.json({ error: 'Question required' }, { status: 400 })
    }

    // Fetch all live data (cached 60s) — same source used by the scores grid.
    const { games, news, f1Standings, pgaLeaderboard, mlbStandings, fetchedAt } = await getTodaysGames()

    const intent = classifyIntent(question)
    const leagueFilter = extractLeague(question)
    const now = new Date()
    const dataTimestamp = new Date(fetchedAt).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    })

    // Build the most relevant context slice for this intent.
    let contextBlock = ''
    let intentLabel = ''

    switch (intent) {
      case 'standings': {
        if (leagueFilter === 'mlb' || leagueFilter === null && DIVISION_PATTERN.test(question)) {
          contextBlock = buildMLBStandingsContext(mlbStandings, question)
          intentLabel = 'MLB standings'
        } else if (leagueFilter === 'f1') {
          contextBlock = buildF1StandingsContext(f1Standings.drivers, f1Standings.constructors)
          intentLabel = 'F1 standings'
        } else if (leagueFilter === 'pga') {
          contextBlock = buildPGAContext(pgaLeaderboard)
          intentLabel = 'PGA leaderboard'
        } else {
          // Return whichever standings data is available — prefer MLB/F1/PGA based on mention.
          const parts: string[] = []
          if (mlbStandings.length) parts.push(buildMLBStandingsContext(mlbStandings, question))
          if (f1Standings.drivers.length) parts.push(buildF1StandingsContext(f1Standings.drivers, f1Standings.constructors))
          if (pgaLeaderboard.length) parts.push(buildPGAContext(pgaLeaderboard))
          contextBlock = parts.join('\n\n')
          intentLabel = 'standings'
        }
        break
      }
      case 'live_scores': {
        contextBlock = buildScoresContext(games, leagueFilter, question)
        intentLabel = 'live scores and recent results'
        break
      }
      case 'schedule': {
        contextBlock = buildScheduleContext(games, leagueFilter, question)
        intentLabel = 'upcoming schedule'
        break
      }
      case 'news': {
        contextBlock = buildNewsContext(news, leagueFilter, question)
        intentLabel = 'latest news'
        // Also attach relevant schedule data so we can mention next games.
        const scheduleNote = buildScheduleContext(games, leagueFilter, question)
        if (scheduleNote && scheduleNote !== 'No schedule data found for this query.') {
          contextBlock += `\n\nRELEVANT SCHEDULE:\n${scheduleNote}`
        }
        break
      }
      default: {
        // General: provide a broad snapshot — today's live games + headlines + top standings.
        const liveGames = games.filter((g) => g.state === 'in').slice(0, 10).map(formatGame).join('\n')
        const recentFinals = games.filter((g) => g.state === 'post').slice(0, 8).map(formatGame).join('\n')
        const topNews = buildNewsContext(news, leagueFilter, question)
        const parts: string[] = []
        if (liveGames) parts.push(`LIVE RIGHT NOW:\n${liveGames}`)
        if (recentFinals) parts.push(`RECENT FINALS:\n${recentFinals}`)
        parts.push(`LATEST HEADLINES:\n${topNews}`)
        contextBlock = parts.join('\n\n')
        intentLabel = 'today\'s sports snapshot'
        break
      }
    }

    const systemPrompt = `You are the sports intelligence engine powering "Ball Knowledge" — a sharp, data-forward platform for serious sports fans.

DATA AS OF: ${dataTimestamp} (today is ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })})

INTENT DETECTED: ${intentLabel}

LIVE DATA (answer ONLY from this — do not cite external sites or ask the user to check elsewhere):
${contextBlock}

RULES:
- Answer directly and concisely from the data above. Do not apologize or redirect to external websites.
- If the data above does not cover a specific player/team detail, say what you DO have (e.g. the next scheduled game, the most recent score) and note that finer detail isn't in today's live feed.
- Never surface internal error text like "technical limitation" or "data unavailable" — if data is sparse, just give what you have.
- Use **bold** for team names, player names, and key numbers.
- Use bullet points for lists of 3 or more items.
- State that data is current as of ${dataTimestamp}.
- Be concise — no fluff, no filler sentences.`

    const result = streamText({
      model: MODEL,
      system: systemPrompt,
      prompt: question,
    })

    return createUIMessageStreamResponse({
      stream: result.toUIMessageStream(),
    })
  } catch (error) {
    // Log the real error server-side only — never expose it to the user.
    console.error('[ask-slate] Error handling question:', JSON.stringify({ question }), error)
    return createUIMessageStreamResponse({
      stream: streamText({
        model: MODEL,
        system: 'You are a friendly sports assistant. Something went wrong fetching live data.',
        prompt: 'Apologize briefly (one sentence) and say live sports data is temporarily unavailable — the user should try again in a moment.',
      }).toUIMessageStream(),
    })
  }
}
