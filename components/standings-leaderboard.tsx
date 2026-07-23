"use client"

import { ChevronRight, Trophy } from "lucide-react"
import type { Game } from "@/lib/espn"

interface StandingEntry {
  position: number
  name: string
  shortName: string
  points?: number
  wins?: number
  losses?: number
  score?: number
  strokes?: number
  parDiff?: string
  logo?: string
}

export function StandingsLeaderboard({
  games,
  leagueId,
}: {
  games: Game[]
  leagueId: "f1" | "pga" | "mlb"
}) {
  // Extract standings from game competitors for field events (golf, F1, MLB standings)
  const standings: StandingEntry[] = []
  const seenTeams = new Set<string>()

  for (const game of games) {
    // For MLB: show top 5 competitors as pseudo-standings
    if (leagueId === "mlb") {
      game.competitors.slice(0, 5).forEach((c, i) => {
        const key = c.shortName
        if (!seenTeams.has(key)) {
          seenTeams.add(key)
          standings.push({
            position: standings.length + 1,
            name: c.name,
            shortName: c.shortName,
            wins: c.record ? parseInt(c.record.split("-")[0]) : undefined,
            losses: c.record ? parseInt(c.record.split("-")[1]) : undefined,
            logo: c.logo,
          })
        }
      })
    }

    // For F1: extract position and points from competitors
    if (leagueId === "f1") {
      game.competitors.slice(0, 8).forEach((c) => {
        const key = c.shortName
        if (!seenTeams.has(key)) {
          seenTeams.add(key)
          standings.push({
            position: standings.length + 1,
            name: c.name,
            shortName: c.shortName,
            points: c.score ? parseInt(c.score) : undefined,
            logo: c.logo,
          })
        }
      })
    }

    // For PGA: show scores and par differences
    if (leagueId === "pga") {
      game.competitors.slice(0, 10).forEach((c) => {
        const key = c.shortName
        if (!seenTeams.has(key)) {
          seenTeams.add(key)
          standings.push({
            position: standings.length + 1,
            name: c.name,
            shortName: c.shortName,
            score: c.score ? parseInt(c.score) : undefined,
            parDiff: c.record,
            logo: c.logo,
          })
        }
      })
    }
  }

  if (standings.length === 0) return null

  const title = leagueId === "f1" ? "Drivers Championship" : leagueId === "pga" ? "Tournament Leaderboard" : "Standings"

  return (
    <section className="mb-10">
      <h2 className="mb-4 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <Trophy className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        {title}
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </h2>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Pos
              </th>
              <th className="px-4 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {leagueId === "mlb" ? "Team" : "Driver"}
              </th>
              {leagueId === "mlb" && (
                <>
                  <th className="px-4 py-2 text-right font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    W-L
                  </th>
                </>
              )}
              {leagueId === "f1" && (
                <th className="px-4 py-2 text-right font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Pts
                </th>
              )}
              {leagueId === "pga" && (
                <>
                  <th className="px-4 py-2 text-right font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Score
                  </th>
                  <th className="px-4 py-2 text-right font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    vs Par
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {standings.slice(0, leagueId === "f1" ? 8 : 10).map((entry) => (
              <tr
                key={entry.shortName}
                className="transition-colors hover:bg-secondary/30"
              >
                <td className="px-4 py-2.5 font-mono text-xs font-bold text-muted-foreground">
                  {entry.position}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {entry.logo ? (
                      <img
                        src={entry.logo}
                        alt=""
                        className="h-4 w-4 shrink-0 object-contain"
                      />
                    ) : (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground">
                        {entry.shortName.slice(0, 1)}
                      </span>
                    )}
                    <span className="font-semibold text-foreground">{entry.shortName}</span>
                  </div>
                </td>
                {leagueId === "mlb" && (
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-foreground">
                    {entry.wins}-{entry.losses}
                  </td>
                )}
                {leagueId === "f1" && (
                  <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-primary">
                    {entry.points ?? "—"}
                  </td>
                )}
                {leagueId === "pga" && (
                  <>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-foreground">
                      {entry.score ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-muted-foreground">
                      {entry.parDiff ?? "—"}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
