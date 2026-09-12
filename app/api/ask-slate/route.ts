import { streamText, stepCountIs, tool, createUIMessageStreamResponse } from 'ai'
import { z } from 'zod'
import { getTodaysGames } from '@/lib/espn'
import { getGameVibe } from '@/lib/game-vibe'

// True only when a search/news API key is actually configured. When this is
// false, the webSearch tool is not registered at all — the model is told
// plainly that live news access isn't wired up, instead of pretending to
// search and returning a canned "check ESPN" non-answer.
const HAS_SEARCH_API = Boolean(process.env.PERPLEXITY_API_KEY)

// AI SDK routes `provider/model` strings through Vercel AI Gateway automatically.
// Deployed Vercel projects authenticate with OIDC, so no AI Gateway API key is
// needed; locally the AI_GATEWAY_API_KEY env var is used when present.
// gpt-4.1 is the best balance of speed, accuracy, and cost on the AI Gateway.
// It has a 1M token context window and strong sports/real-world knowledge.
const MODEL = 'openai/gpt-4.1'

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
    // AI SDK v7 useChat sends { messages: UIMessage[] } where each message has
    // a `parts` array, not a plain `content` string. We also still support the
    // legacy { question: string } shape for direct API calls.
    const body = await req.json() as {
      question?: string
      messages?: Array<{
        role: string
        content?: string
        parts?: Array<{ type: string; text?: string }>
      }>
    }

    // Extract the latest user question from whatever format was sent.
    let question = body.question ?? ''
    if (!question && body.messages?.length) {
      const lastUser = [...body.messages].reverse().find((m) => m.role === 'user')
      if (lastUser) {
        // v7 UIMessage: extract text from parts
        if (lastUser.parts?.length) {
          question = lastUser.parts
            .filter((p) => p.type === 'text')
            .map((p) => p.text ?? '')
            .join('')
        }
        // legacy: plain content string
        if (!question && typeof lastUser.content === 'string') {
          question = lastUser.content
        }
      }
    }

    if (!question) {
      return Response.json({ error: 'Question required' }, { status: 400 })
    }

    // Pull the same live dataset that powers the ticker, game cards, and
    // standings tables on the page — this is the app's real data source,
    // not a re-fetch or a separate mock.
    const { games, mlbStandings, f1Standings, pgaLeaderboard } = await getTodaysGames()

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

    // Standings context — grounded in the exact same MLB/F1/PGA data the
    // standings tables on the page render, so "who's leading the AL East"
    // or "top of the PGA leaderboard" questions get real numbers instead of
    // a punt to webSearch (which may not even be configured).
    const mlbStandingsContext = mlbStandings.length
      ? mlbStandings
          .map((t) => `${t.division}: ${t.shortName} (${t.wins}-${t.losses}, ${t.pct}${t.gb && t.gb !== '-' ? `, GB ${t.gb}` : ''})`)
          .join('\n')
      : 'No MLB standings data available.'

    const f1StandingsContext = f1Standings.drivers.length
      ? [
          'Drivers: ' +
            f1Standings.drivers
              .slice(0, 10)
              .map((d) => `${d.position}. ${d.name} (${d.team}, ${d.points} pts)`)
              .join(', '),
          'Constructors: ' +
            f1Standings.constructors
              .slice(0, 10)
              .map((c) => `${c.position}. ${c.name} (${c.points} pts)`)
              .join(', '),
        ].join('\n')
      : 'No F1 standings data available.'

    const pgaLeaderboardContext = pgaLeaderboard.length
      ? pgaLeaderboard
          .slice(0, 10)
          .map((p) => `${p.position}. ${p.name} (${p.score}, today ${p.today}, thru ${p.thru})`)
          .join('\n')
      : 'No PGA leaderboard data available.'

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

      getStandings: tool({
        description:
          'Get real, live standings/leaderboard data already loaded by the app: MLB division standings, F1 driver & constructor championship standings, or the PGA Tour leaderboard. Use this for any "who\'s leading/in first/standings/rankings" question in those three — it is grounded data, not a guess.',
        inputSchema: z.object({
          league: z.enum(['mlb', 'f1', 'pga']).describe('Which standings/leaderboard to return'),
        }),
        execute: async ({ league }) => {
          if (league === 'mlb') return mlbStandingsContext
          if (league === 'f1') return f1StandingsContext
          return pgaLeaderboardContext
        },
      }),

      // Only registered when PERPLEXITY_API_KEY is actually configured.
      // Without a key, this tool is omitted entirely rather than being called
      // and silently returning a canned "check ESPN" string — the model is
      // told in the system prompt that this capability doesn't exist yet.
      ...(HAS_SEARCH_API
        ? {
            webSearch: tool({
              description:
                'Search the live web (via Perplexity, with citations) across sports platforms, major news outlets, and social platforms (X/Twitter, Reddit) for real-time news, injury reports, trades, rumors, and analysis. Returns a synthesized, cited answer — not raw links. Use for anything not covered by searchSchedule/findNextGame/getStandings. Pick a scope: "all" (default, sports + news + social), "sports", "news", "social" (X/Reddit buzz & insider reports), or "open" (unrestricted whole-web search). Use "social" or "open" for breaking rumors and insider chatter.',
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
                // Perplexity's search_domain_filter accepts up to 20 domains, but we
                // keep the list short and high-signal per scope for relevance.
                let targetSites: string[] | null
                if (sites?.length) {
                  targetSites = sites.slice(0, 10)
                } else {
                  switch (scope) {
                    case 'sports':
                      targetSites = ['espn.com', 'theathletic.com', 'cbssports.com', 'bleacherreport.com', 'sportingnews.com', 'si.com']
                      break
                    case 'news':
                      targetSites = ['apnews.com', 'reuters.com', 'nytimes.com', 'washingtonpost.com', 'theguardian.com', 'usatoday.com']
                      break
                    case 'social':
                      targetSites = ['x.com', 'twitter.com', 'reddit.com']
                      break
                    case 'open':
                    case 'all':
                    default:
                      // No domain filter — Perplexity's own ranking already favors
                      // high-authority sources and surfaces ESPN, wire services, etc.
                      targetSites = null
                      break
                  }
                }

                const recencyMap: Record<string, string> = { day: 'day', week: 'week', month: 'month' }
                const searchRecencyFilter = recency && recency !== 'any' ? recencyMap[recency] : 'week'

                const scopeLabel = targetSites ? targetSites.join(', ') : 'the open web'

                try {
                  const res = await fetch('https://api.perplexity.ai/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY ?? ''}`,
                    },
                    body: JSON.stringify({
                      model: 'sonar',
                      messages: [
                        {
                          role: 'system',
                          content:
                            'You are a sports research assistant. Answer the query concisely using only current, verifiable information. Include specific facts, numbers, and dates. Keep the answer under 150 words.',
                        },
                        { role: 'user', content: query },
                      ],
                      ...(targetSites ? { search_domain_filter: targetSites } : {}),
                      search_recency_filter: searchRecencyFilter,
                      return_citations: true,
                    }),
                  })

                  if (!res.ok) {
                    // The key is configured but the request itself failed
                    // (rate limit, outage, bad key). Be honest about that
                    // rather than implying a search happened.
                    return `Search request failed (HTTP ${res.status}) for "${query}". No results were retrieved — say so plainly rather than guessing.`
                  }

                  const data = await res.json() as {
                    choices?: { message?: { content?: string } }[]
                    citations?: string[]
                  }

                  const answer = data.choices?.[0]?.message?.content?.trim()
                  if (!answer) {
                    return `No results found for "${query}" across ${scopeLabel}.`
                  }

                  const citations = data.citations ?? []
                  const citationList = citations.length
                    ? `\n\nSources:\n${citations.slice(0, 6).map((url, i) => `[${i + 1}] ${url}`).join('\n')}`
                    : ''

                  return `${answer}${citationList}`
                } catch {
                  return `Search request errored for "${query}". No results were retrieved — say so plainly rather than guessing.`
                }
              },
            }),
          }
        : {}),
    }

    const result = streamText({
      model: MODEL,
      tools,
      toolChoice: 'auto',
      stopWhen: stepCountIs(8),
      system: `You are the sports intelligence engine powering "Ball Knowledge" — a sharp, data-forward platform for serious sports fans.

You have access to:
1. Live game schedules across MLB, NFL, NCAAF, EPL, UCL, La Liga, MLS, F1, PGA, ATP, WTA, NBA, NCAAM (searchSchedule, findNextGame tools) — this is the exact same live data feeding the site's ticker and game cards.
2. Live MLB standings, F1 driver/constructor championship standings, and the PGA Tour leaderboard (getStandings tool) — same data as the standings tables on the page.
${
  HAS_SEARCH_API
    ? `3. Real-time web search via Perplexity (webSearch tool) — returns a synthesized, cited answer (not raw links) spanning:
   - Live sports platforms: ESPN, The Athletic, league sites (MLB/NFL/NBA/NHL/F1/PGA/ATP/WTA/Premier League/UEFA/MLS), broadcasters (Fox Sports, Sky Sports, TSN, Sportsnet, BBC, Yahoo, The Score), and reference/analytics sites (Pro/Baseball/Basketball Reference, FiveThirtyEight, RotoWire, Spotrac)
   - Major news outlets: AP, Reuters, NYT, Washington Post, The Guardian, Bloomberg, USA Today
   - Social platforms: X/Twitter and Reddit for real-time buzz, insider reports, and fan reaction`
    : `3. No web/news search tool. It is not configured yet — do NOT claim to have searched, checked wires, or scanned social media, and do NOT tell the user to "check ESPN" as if that were your finding. When a question needs live trade/injury/rumor/breaking-news information you don't have (from tools 1-2 or your own training knowledge), say plainly and briefly that live news search isn't connected yet, then still answer with whatever you *do* know from schedule/standings data or general knowledge if relevant.`
}

Rules:
- Be direct, fast, and specific. No fluff.
- For schedule/score/broadcast questions → use searchSchedule or findNextGame. These are live, not guesses.
- For "who's leading/in first/standings" in MLB, F1, or PGA → use getStandings. This is live, not a guess.
${
  HAS_SEARCH_API
    ? `- For trades, injuries, breaking news, or social buzz outside MLB/F1/PGA standings → use webSearch. Choose the scope deliberately: "sports" for official stats/news, "news" for business/legal/breaking wire stories, "social" (X/Twitter, Reddit) for insider reports, rumors, and reactions, "all" to cast the widest net, and "open" only when the topic is niche and none of the curated sources fit.
- For breaking news and live rumors, set recency to "day" and prefer the "social" or "all" scope. For historical stats, set recency to "any".
- Cite your source (site name, or handle/platform for X/Reddit) when using webSearch results.`
    : `- For trades, injuries, breaking news, or standings outside MLB/F1/PGA — you have no live source for these right now. Be upfront about that instead of fabricating a search or a generic "go check ESPN" deflection.`
}
- Never claim to have accessed a source, run a search, or checked a site unless a tool call actually happened this turn.
- Use **bold** for team names, player names, and key numbers. Use bullet points for lists of 3+ items.
- Today's date: ${now.toLocaleDateString()}.

When summarizing a live or completed game (or previewing an upcoming one), lead with the ONE descriptor that best captures its character, then back it with the decisive number(s). Draw from this vocabulary and apply it honestly — only use a label the data supports:
- Baseball: "pitcher's duel" (both lineups shut down), "slugfest" (runs pouring in), "bullpen game" (no traditional starter going deep), "enticing pitching matchup" / "ace duel" (two aces on the mound for a preview), "EXTRA INNINGS" (tied after 9), "bats alive", "nail-biter".
- All sports: "shootout" (points/goals flying), "nail-biter" (razor-thin margin), "instant classic" (dramatic, went to OT/extras and stayed close), "statement game" (a favorite dominating), "defensive masterclass" (elite low-scoring effort), "must-win" (elimination or standings stakes), "revenge game" (rematch after a prior loss), "rivalry match" (historic rivalry), "upset alert" (an underdog leading/beating a favorite).
- The "Vibe" tag in the schedule context below is the deterministic read of each game — treat it as a strong hint, and enrich it with the stakes (records, standings, elimination, rivalry, revenge angle) when you know them.

Current live standings/leaderboards (same data as the standings tables on the page — already loaded, no tool call needed to see this):
MLB Standings:
${mlbStandingsContext}

F1 Championship:
${f1StandingsContext}

PGA Tour Leaderboard:
${pgaLeaderboardContext}

Current live schedule context:
${scheduleContext}`,
      prompt: question,
    })

    // createUIMessageStreamResponse is the correct v7 standalone API.
    // result.toUIMessageStreamResponse() is deprecated in AI SDK v7.
    return createUIMessageStreamResponse({
      stream: result.toUIMessageStream(),
    })
  } catch (error) {
    console.error('[Ask Slate] Error:', error)
    return Response.json(
      { error: 'Failed to answer question' },
      { status: 500 },
    )
  }
}
