import { NextResponse } from "next/server"
import { getTodaysGames } from "@/lib/espn"

// Always compute fresh on request; the underlying league fetches are
// cached for 60s (see lib/espn.ts) so polling stays cheap.
export const dynamic = "force-dynamic"

export async function GET() {
  const data = await getTodaysGames()
  return NextResponse.json(data, {
    headers: {
      // Never let the CDN cache this — an empty slate (ESPN timeout) must
      // never be served stale. The client polls every 60s itself.
      "Cache-Control": "no-store",
    },
  })
}
