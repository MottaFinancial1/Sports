import { SportsGuide } from "@/components/sports-guide"
import { getTodaysGames } from "@/lib/espn"

// Revalidate the page every 5 minutes. Combined with the fetch-level
// revalidation, the schedule stays fresh and automatically advances to the
// new day's games without any manual action.
export const revalidate = 300

export default async function Page() {
  const { games, fetchedAt } = await getTodaysGames()

  return (
    <main className="min-h-screen bg-background">
      <SportsGuide games={games} fetchedAt={fetchedAt} />
    </main>
  )
}
