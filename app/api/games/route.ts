import { NextResponse } from "next/server"
import { getTodaysGames } from "@/lib/espn"

// Always compute fresh on request; the underlying league fetches are
// cached for 60s (see lib/espn.ts) so polling stays cheap.
export const dynamic = "force-dynamic"

export async function GET() {
  const data = await getTodaysGames()
  return NextResponse.json(data, {
    headers: {
      // Let shared caches (CDN) serve for up to 60s with SWR semantics.
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  })
}
