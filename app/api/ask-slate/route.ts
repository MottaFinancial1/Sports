import { streamText, stepCountIs, tool } from 'ai'
import { z } from 'zod'
import { getTodaysGames } from '@/lib/espn'
import { getGameVibe } from '@/lib/game-vibe'

// AI SDK routes `provider/model` strings through Vercel AI Gateway automatically.
// Deployed Vercel projects authenticate with OIDC, so no AI Gateway API key is
// needed; locally the AI_GATEWAY_API_KEY env var is used when present.
const MODEL = 'openai/gpt-5.4-mini'

// Live sports platforms — league sites, broadcasters, and dedicated outlets.
const SPORTS_SOURCES = [
  'espn.com',
  'theathletic.com',
  'mlb.com',
  'nfl.com',
  'nba.com',
  'nhl.com',
  'f1.com',
  'formula1.com',
  'pgatour.com',
  'atptour.com',
  'wtatennis.com',
  'premierleague.com',
  'uefa.com',
  'mlssoccer.com',
  'si.com',
  'cbssports.com',
  'foxsports.com',
  'yahoo.com',
  'bleacherreport.com',
  'thescore.com',
  'sportingnews.com',
  'sportsnet.ca',
  'tsn.ca',
  'skysports.com',
  'bbc.com',
  'goal.com',
  'espncricinfo.com',
  'pro-football-reference.com',
  'baseball-reference.com',
  'basketball-reference.com',
  'fivethirtyeight.com',
  'rotowire.com',
  'spotrac.com',
]

// General news wires and outlets that break sports stories (trades, legal, business).
const NEWS_SOURCES = [
  'apnews.com',
  'reuters.com',
  'nytimes.com',
  'washingtonpost.com',
  'theguardian.com',
  'bloomberg.com',
  'usatoday.com',
]

// Social / community platforms for real-time buzz, insider reports, and reactions.
const SOCIAL_SOURCES = ['x.com', 'twitter.com', 'reddit.com', 'youtube.com']

// The full universe the model may search across.
const ALL_SOURCES = [...SPORTS_SOURCES, ...NEWS_SOURCES, ...SOCIAL_SOURCES]

// Mark as dynamic so Next.js doesn't try to cache a streaming response.
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json() as { question?: string; messages?: { role: string; content: string }[] }
    // Support both the legacy { question } shape and the useChat { messages } shape.
    const question =
      body.question ??
      [...(body.messages ?? [])].reverse().find((m) => m.role === 'user')?.content ?? ''

    if (!question || typeof question !== 'string') {
      return Response.json({ error: 'Question required' }, { status: 400 })
    }

    const { games } = await getTodaysGames()

    const now = new Date()
    const scheduleContext = games
      .slice(0, 50)
      .map((g) => {
        const vibe = getGameVibe(g)
        const scoreline = g.competitors
          .map((c) => `${c.shortName}${c.score !== undefined ? ` ${c.score}` : ''}`)
          .join(g.competitors.length === 2 ? ' vs ' : ', ')
        return `${g.leagueShort} ${g.date ? new Date(g.date).toLocaleDateString() : 'Today'}: ${g.shortName}, ${g.state === 'in' ? 'LIVE' : g.state === 'post' ? 'FINAL' : 'Pre'}${g.statusDetail ? ` (${g.statusDetail})` : ''}, Score: ${scoreline}${vibe ? `, Vibe: ${vibe.label}` : ''}, Venue: ${g.venue ?? 'TBD'}, Broadcasts: ${g.broadcasts.join(', ') || 'TBD'}`
      })
      .join('\n')

    const tools = {
      searchSchedule: tool({
        description: 'Search the live schedule for games matching a team, date range, or league',
        inputSchema: z.object({
          query: z.string().describe('Team name, league, or date (e.g. "Red Sox", "NFL", "next Sunday")'),
        }),
        execute: async ({ query }) => {
          const matches = games.filter((g) => {
            const q = query.toLowerCase()
            return (
              g.name.toLowerCase().includes(q) ||
              g.shortName.toLowerCase().includes(q) ||
              g.leagueLabel.toLowerCase().includes(q) ||
              g.competitors.some((c) => c.name.toLowerCase().includes(q))
            )
          })
          if (matches.length === 0) return 'No matching games found in today\'s schedule.'
          return matches
            .slice(0, 5)
            .map(
              (g) =>
                `${g.leagueShort}: ${g.shortName} on ${new Date(g.date).toLocaleDateString()}, ${g.state === 'in' ? 'LIVE' : g.state === 'post' ? 'FINAL' : 'Scheduled'} — ${g.statusDetail}`,
            )
            .join('\n')
        },
      }),

      findNextGame: tool({
        description: 'Find the next upcoming game for a specific team',
        inputSchema: z.object({
          teamName: z.string().describe('Team name or abbreviation'),
        }),
        execute: async ({ teamName }) => {
          const next = games
            .filter((g) =>
              g.competitors.some((c) =>
                c.name.toLowerCase().includes(teamName.toLowerCase()),
              ),
            )
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
          if (!next) return `No upcoming games found for ${teamName}.`
          const home = next.competitors.find((c) => c.isHome)
          const away = next.competitors.find((c) => !c.isHome)
          return `${away?.shortName ?? '?'} @ ${home?.shortName ?? '?'} — ${new Date(next.date).toLocaleDateString()} (${next.leagueShort}). ${next.broadcasts.length > 0 ? `On: ${next.broadcasts.join(', ')}` : 'Broadcast TBD'}. Venue: ${next.venue ?? 'TBD'}.`
        },
      }),

      webSearch: tool({
        description:
          'Search live sports platforms, major news outlets, and social platforms (X/Twitter, Reddit) for real-time news, stats, injury reports, trades, rumors, standings, and analysis. Use for anything beyond today\'s schedule. Pick a scope: "all" (default, sports + news + social), "sports", "news", "social" (X/Reddit buzz & insider reports), or "open" (unrestricted whole-web search). Use "social" or "open" for breaking rumors and insider chatter.',
        inputSchema: z.object({
          query: z.string().describe('Specific sports search query'),
          scope: z
            .enum(['all', 'sports', 'news', 'social', 'open'])
            .optional()
            .describe(
              'Where to search: "all" = sports+news+social sites, "sports" = league/sports outlets, "news" = wire services & major papers, "social" = X/Twitter/Reddit for buzz & insider reports, "open" = unrestricted web. Defaults to "all".',
            ),
          sites: z
            .array(z.string())
            .optional()
            .describe(
              `Optionally restrict to specific domains (overrides scope). Available: ${ALL_SOURCES.join(', ')}`,
            ),
          recency: z
            .enum(['day', 'week', 'month', 'any'])
            .optional()
            .describe('How recent results must be. Defaults to "week". Use "day" for breaking news, "any" for historical/stats.'),
        }),
        execute: async ({ query, scope, sites, recency }) => {
          // Brave's query string has a hard limit (~2048 chars). site: filters
          // blow past it quickly, so we keep the OR-list very short (≤6 domains)
          // and for "all" / "open" scopes we simply run an unrestricted search
          // (Brave already favors high-authority sports domains without filters).
          let targetSites: string[] | null
          if (sites?.length) {
            // Caller-supplied list: honour it but cap at 5 to stay under the limit.
            targetSites = sites.slice(0, 5)
          } else {
            switch (scope) {
              case 'sports':
                // Pick the 6 highest-signal sports domains only.
                targetSites = ['espn.com', 'theathletic.com', 'cbssports.com', 'bleacherreport.com', 'sportingnews.com', 'si.com']
                break
              case 'news':
                targetSites = ['apnews.com', 'reuters.com', 'nytimes.com', 'washingtonpost.com', 'theguardian.com', 'usatoday.com']
                break
              case 'social':
                // X (twitter.com) and Reddit — short list, no length issue.
                targetSites = ['x.com', 'twitter.com', 'reddit.com']
                break
              case 'open':
              case 'all':
              default:
                // No site filter — Brave returns the best results across the web
                // which naturally surfaces ESPN, The Athletic, wire services, X, etc.
                targetSites = null
                break
            }
          }

          // Build a concise site filter (≤6 domains keeps the URL well under 500 chars).
          const siteFilter = targetSites && targetSites.length > 0
            ? ` (${targetSites.map((s) => `site:${s}`).join(' OR ')})`
            : ''
          const searchQuery = `${query}${siteFilter}`

          const freshnessMap: Record<string, string> = { day: 'pd', week: 'pw', month: 'pm' }
          const freshnessParam =
            recency && recency !== 'any' && freshnessMap[recency]
              ? `&freshness=${freshnessMap[recency]}`
              : recency === 'any'
                ? ''
                : '&freshness=pw'

          const scopeLabel = targetSites ? targetSites.join(', ') : 'the open web'

          try {
            const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=8${freshnessParam}`
            const res = await fetch(searchUrl, {
              headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip',
                'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY ?? '',
              },
              next: { revalidate: 60 },
            })

            if (!res.ok) {
              // Graceful fallback: tell the model what sources to reference.
              return `Web search unavailable. For "${query}", I'd recommend checking: ${scopeLabel} directly. Today's date: ${now.toLocaleDateString()}.`
            }

            const data = await res.json() as {
              web?: {
                results?: { title?: string; description?: string; url?: string; age?: string; profile?: { name?: string } }[]
              }
            }

            const results = data.web?.results ?? []
            if (results.length === 0) {
              return `No results found for "${query}" across ${scopeLabel}.`
            }

            return results
              .slice(0, 6)
              .map(
                (r) =>
                  `[${r.profile?.name ?? r.title ?? 'Source'}] ${r.title ?? ''}: ${r.description ?? ''} — ${r.url ?? ''} (${r.age ?? 'recent'})`,
              )
              .join('\n\n')
          } catch {
            return `Search unavailable. Check ESPN, The Athletic, or X for the latest on "${query}".`
          }
        },
      }),
    }

    const result = streamText({
      model: MODEL,
      tools,
      toolChoice: 'auto',
      stopWhen: stepCountIs(8),
      system: `You are the sports intelligence engine powering "Ball Knowledge" — a sharp, data-forward platform for serious sports fans.

You have access to:
1. Live game schedules across MLB, NFL, NCAAF, EPL, UCL, La Liga, MLS, F1, PGA, ATP, WTA, NBA, NCAAM (searchSchedule, findNextGame tools)
2. Real-time web search (webSearch tool) spanning:
   - Live sports platforms: ESPN, The Athletic, league sites (MLB/NFL/NBA/NHL/F1/PGA/ATP/WTA/Premier League/UEFA/MLS), broadcasters (Fox Sports, Sky Sports, TSN, Sportsnet, BBC, Yahoo, The Score), and reference/analytics sites (Pro/Baseball/Basketball Reference, FiveThirtyEight, RotoWire, Spotrac)
   - Major news outlets: AP, Reuters, NYT, Washington Post, The Guardian, Bloomberg, USA Today
   - Social platforms: X/Twitter and Reddit for real-time buzz, insider reports, and fan reaction

Rules:
- Be direct, fast, and specific. No fluff.
- For schedule/score questions → use searchSchedule or findNextGame.
- For stats, trades, injuries, news, standings, analysis, or social buzz → use webSearch. Choose the scope deliberately: "sports" for official stats/news, "news" for business/legal/breaking wire stories, "social" (X/Twitter, Reddit) for insider reports, rumors, and reactions, "all" to cast the widest net, and "open" only when the topic is niche and none of the curated sources fit.
- For breaking news and live rumors, set recency to "day" and prefer the "social" or "all" scope. For historical stats, set recency to "any".
- Cite your source (site name, or handle/platform for X/Reddit) when using webSearch results.
- Use **bold** for team names, player names, and key numbers. Use bullet points for lists of 3+ items.
- Today's date: ${now.toLocaleDateString()}.

When summarizing a live or completed game (or previewing an upcoming one), lead with the ONE descriptor that best captures its character, then back it with the decisive number(s). Draw from this vocabulary and apply it honestly — only use a label the data supports:
- Baseball: "pitcher's duel" (both lineups shut down), "slugfest" (runs pouring in), "bullpen game" (no traditional starter going deep), "enticing pitching matchup" / "ace duel" (two aces on the mound for a preview), "EXTRA INNINGS" (tied after 9), "bats alive", "nail-biter".
- All sports: "shootout" (points/goals flying), "nail-biter" (razor-thin margin), "instant classic" (dramatic, went to OT/extras and stayed close), "statement game" (a favorite dominating), "defensive masterclass" (elite low-scoring effort), "must-win" (elimination or standings stakes), "revenge game" (rematch after a prior loss), "rivalry match" (historic rivalry), "upset alert" (an underdog leading/beating a favorite).
- The "Vibe" tag in the schedule context below is the deterministic read of each game — treat it as a strong hint, and enrich it with the stakes (records, standings, elimination, rivalry, revenge angle) when you know them.

Current live schedule context:
${scheduleContext}`,
      prompt: question,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('[Ask Slate] Error:', error)
    return Response.json(
      { error: 'Failed to answer question' },
      { status: 500 },
    )
  }
}
