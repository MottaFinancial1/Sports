import { SportsGuide } from "@/components/sports-guide"
import { getTodaysGames } from "@/lib/espn"

// Always fetch fresh on every request — never serve a stale ISR-cached
// empty slate. The client polls /api/games every 60s anyway, so ISR
// caching at the page level only causes the "0 games on first load" bug.
export const dynamic = "force-dynamic"

export default async function Page() {
  const { games, news, statcast, f1Standings, pgaLeaderboard, mlbStandings, fetchedAt } = await getTodaysGames()

  return (
    <main className="min-h-screen bg-background">
      <SportsGuide games={games} news={news} statcast={statcast} f1Standings={f1Standings} pgaLeaderboard={pgaLeaderboard} mlbStandings={mlbStandings} fetchedAt={fetchedAt} />
    </main>
  )
}
