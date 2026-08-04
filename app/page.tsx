import { SportsGuide } from "@/components/sports-guide"
import { getTodaysGames } from "@/lib/espn"

// Revalidate the page every 5 minutes. Combined with the fetch-level
// revalidation, the schedule stays fresh and automatically advances to the
// new day's games without any manual action.
export const revalidate = 300

export default async function Page() {
  const { games, news, statcast, f1Standings, pgaLeaderboard, mlbStandings, fetchedAt } = await getTodaysGames()

  return (
    <main className="min-h-screen bg-background">
      <SportsGuide games={games} news={news} statcast={statcast} f1Standings={f1Standings} pgaLeaderboard={pgaLeaderboard} mlbStandings={mlbStandings} fetchedAt={fetchedAt} />
    </main>
  )
}
