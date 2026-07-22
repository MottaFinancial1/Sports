import { generateText, stepCountIs, tool } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { getTodaysGames } from '@/lib/espn'

const model = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
}).languageModel('openai/gpt-4o-mini')

export async function POST(req: Request) {
  try {
    const { question } = await req.json() as { question: string }
    if (!question || typeof question !== 'string') {
      return Response.json({ error: 'Question required' }, { status: 400 })
    }

    const { games } = await getTodaysGames()

    // Build schedule context: today's games, tomorrow's top games, etc.
    const now = new Date()
    const scheduleContext = games
      .slice(0, 50)
      .map(
        (g) =>
          `${g.leagueShort} ${g.date ? new Date(g.date).toLocaleDateString() : 'Today'}: ${g.shortName}, ${g.state === 'in' ? 'LIVE' : 'Pre'}, ${g.broadcasts.join(', ') || 'TBD'}`,
      )
      .join('\n')

    const tools = {
      searchSchedule: tool({
        description:
          'Search the schedule for games matching a team, date range, or league',
        inputSchema: z.object({
          query: z
            .string()
            .describe(
              'Search query: team name (e.g. "Red Sox"), league (e.g. "NFL"), date (e.g. "next Sunday")',
            ),
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
          return matches
            .slice(0, 5)
            .map(
              (g) =>
                `${g.leagueShort}: ${g.shortName} on ${new Date(g.date).toLocaleDateString()}, ${g.state === 'in' ? 'LIVE' : 'Scheduled'}`,
            )
            .join('\n')
        },
      }),
      findNextGame: tool({
        description: 'Find the next game for a specific team',
        inputSchema: z.object({
          teamName: z.string().describe('Team name or abbreviation'),
        }),
        execute: async ({ teamName }) => {
          const next = games.find((g) =>
            g.competitors.some((c) =>
              c.name.toLowerCase().includes(teamName.toLowerCase()),
            ),
          )
          if (!next) return 'No upcoming games found'
          const homeTeam = next.competitors.find((c) => c.isHome)
          const awayTeam = next.competitors.find((c) => !c.isHome)
          return `${awayTeam?.shortName} @ ${homeTeam?.shortName} on ${new Date(next.date).toLocaleDateString()} (${next.leagueShort}). ${next.broadcasts.length > 0 ? `Watch on: ${next.broadcasts.join(', ')}` : 'Broadcast TBD'}`
        },
      }),
      findHomeGames: tool({
        description: 'Check if a team plays at home on a specific date or date range',
        inputSchema: z.object({
          teamName: z.string().describe('Team name'),
          dateRange: z
            .string()
            .describe(
              'Date range: "next weekend", "this week", "December", or a specific date',
            ),
        }),
        execute: async ({ teamName, dateRange }) => {
          const inRange = games.filter((g) => {
            const q = teamName.toLowerCase()
            const home = g.competitors.find((c) => c.isHome)
            return home && home.name.toLowerCase().includes(q)
          })
          if (inRange.length === 0) return `No home games found for ${teamName}`
          return inRange
            .slice(0, 3)
            .map(
              (g) =>
                `${g.shortName} on ${new Date(g.date).toLocaleDateString()} (${g.leagueShort}). ${g.broadcasts.length > 0 ? `Watch on: ${g.broadcasts.join(', ')}` : 'Broadcast TBD'}`,
            )
            .join('\n')
        },
      }),
    }

    const response = await generateText({
      model,
      tools,
      toolChoice: 'auto',
      system: `You are a sports schedule assistant for "Ball Knowledge", a personalized sports intelligence app. 
You have access to live game schedules across baseball, football, soccer, F1, golf, tennis, and basketball.
Answer questions about upcoming games, schedules, teams, and broadcasts.
Be conversational and helpful. Keep answers under 2 sentences.
Today's date: ${now.toLocaleDateString()}.

Current games and schedule:
${scheduleContext}`,
      prompt: question,
      stopWhen: stepCountIs(3),
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
