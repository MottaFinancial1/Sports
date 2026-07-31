import { generateText, stepCountIs, tool } from 'ai'
import { z } from 'zod'
import { getTodaysGames } from '@/lib/espn'

// AI SDK routes `provider/model` strings through Vercel AI Gateway automatically.
// Deployed Vercel projects authenticate with OIDC, so no AI Gateway API key is needed.
const model = 'openai/gpt-4o-mini'

// Reputable sports sources queried by the web search tool.
const SPORTS_SOURCES = [
  'espn.com',
  'theathletic.com',
  'mlb.com',
  'nfl.com',
  'nba.com',
  'f1.com',
  'pgatour.com',
  'si.com',
  'cbssports.com',
  'bleacherreport.com',
  'pro-football-reference.com',
  'baseball-reference.com',
  'basketball-reference.com',
  'fivethirtyeight.com',
  'rotowire.com',
  'x.com',
]

export async function POST(req: Request) {
  try {
    const { question } = await req.json() as { question: string }
    if (!question || typeof question !== 'string') {
      return Response.json({ error: 'Question required' }, { status: 400 })
    }

    const { games } = await getTodaysGames()

    const now = new Date()
    const scheduleContext = games
      .slice(0, 50)
      .map(
        (g) =>
          `${g.leagueShort} ${g.date ? new Date(g.date).toLocaleDateString() : 'Today'}: ${g.shortName}, ${g.state === 'in' ? 'LIVE' : g.state === 'post' ? 'FINAL' : 'Pre'}, Venue: ${g.venue ?? 'TBD'}, Broadcasts: ${g.broadcasts.join(', ') || 'TBD'}`,
      )
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
          'Search reputable sports websites and X (Twitter) for real-time news, stats, injury reports, trades, standings, and analysis. Use for anything beyond today\'s schedule — trades, injuries, rankings, historical stats, player news, social buzz.',
        inputSchema: z.object({
          query: z.string().describe('Specific sports search query'),
          sites: z
            .array(z.string())
            .optional()
            .describe(
              `Optionally restrict to specific sites from: ${SPORTS_SOURCES.join(', ')}`,
            ),
        }),
        execute: async ({ query, sites }) => {
          const targetSites = sites?.length ? sites : SPORTS_SOURCES.slice(0, 8)
          const siteFilter = targetSites.map((s) => `site:${s}`).join(' OR ')
          const searchQuery = `${query} (${siteFilter})`

          try {
            const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=5&freshness=pd`
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
              return `Web search unavailable. For "${query}", I'd recommend checking: ${targetSites.join(', ')} directly. Today's date: ${now.toLocaleDateString()}.`
            }

            const data = await res.json() as {
              web?: {
                results?: { title?: string; description?: string; url?: string; age?: string }[]
              }
            }

            const results = data.web?.results ?? []
            if (results.length === 0) {
              return `No results found for "${query}" on ${targetSites.join(', ')}.`
            }

            return results
              .slice(0, 5)
              .map(
                (r) =>
                  `[${r.title ?? 'Article'}] ${r.description ?? ''} — ${r.url ?? ''} (${r.age ?? 'recent'})`,
              )
              .join('\n\n')
          } catch {
            return `Search unavailable. Check ESPN, The Athletic, or X for the latest on "${query}".`
          }
        },
      }),
    }

    const response = await generateText({
      model,
      tools,
      toolChoice: 'auto',
      system: `You are the sports intelligence engine powering "Ball Knowledge" — a sharp, data-forward platform for serious sports fans.

You have access to:
1. Live game schedules across MLB, NFL, NCAAF, EPL, UCL, La Liga, MLS, F1, PGA, ATP, WTA, NBA, NCAAM (searchSchedule, findNextGame tools)
2. Real-time web search across ESPN, The Athletic, MLB.com, NFL.com, NBA.com, F1.com, PGA Tour, SI, CBS Sports, Bleacher Report, Pro/Baseball/Basketball Reference, FiveThirtyEight, RotoWire, and X/Twitter (webSearch tool)

Rules:
- Be direct, fast, and specific. No fluff.
- For schedule/score questions → use searchSchedule or findNextGame.
- For stats, trades, injuries, news, standings, analysis, or anything on X → use webSearch.
- Cite your source (site name) when using webSearch results.
- Max 2–3 sentences per answer. Numbers and facts over prose.
- Today's date: ${now.toLocaleDateString()}.

Current live schedule context:
${scheduleContext}`,
      prompt: question,
      stopWhen: stepCountIs(4),
    })

    return Response.json({ answer: response.text })
  } catch (error) {
    console.error('[Ask Slate] Error:', error)
    return Response.json(
      { error: 'Failed to answer question' },
      { status: 500 },
    )
  }
}
