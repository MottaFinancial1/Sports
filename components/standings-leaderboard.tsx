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
  division?: string
  gamesBack?: string
}

// MLB team to division mapping with full roster data
interface MLBTeamInfo {
  name: string
  shortName: string
  division: string
  wins: number
  losses: number
  logo?: string
}

const MLB_TEAMS: Record<string, MLBTeamInfo> = {
  BOS: { name: "Boston Red Sox", shortName: "BOS", division: "AL East", wins: 62, losses: 42 },
  NYY: { name: "New York Yankees", shortName: "NYY", division: "AL East", wins: 63, losses: 41 },
  TB: { name: "Tampa Bay Rays", shortName: "TB", division: "AL East", wins: 59, losses: 45 },
  BAL: { name: "Baltimore Orioles", shortName: "BAL", division: "AL East", wins: 58, losses: 46 },
  TOR: { name: "Toronto Blue Jays", shortName: "TOR", division: "AL East", wins: 56, losses: 48 },
  
  CLE: { name: "Cleveland Guardians", shortName: "CLE", division: "AL Central", wins: 65, losses: 39 },
  DET: { name: "Detroit Tigers", shortName: "DET", division: "AL Central", wins: 61, losses: 43 },
  MIN: { name: "Minnesota Twins", shortName: "MIN", division: "AL Central", wins: 60, losses: 44 },
  KC: { name: "Kansas City Royals", shortName: "KC", division: "AL Central", wins: 47, losses: 57 },
  CWS: { name: "Chicago White Sox", shortName: "CWS", division: "AL Central", wins: 41, losses: 63 },
  
  HOU: { name: "Houston Astros", shortName: "HOU", division: "AL West", wins: 66, losses: 38 },
  TEX: { name: "Texas Rangers", shortName: "TEX", division: "AL West", wins: 60, losses: 44 },
  SEA: { name: "Seattle Mariners", shortName: "SEA", division: "AL West", wins: 59, losses: 45 },
  LAA: { name: "Los Angeles Angels", shortName: "LAA", division: "AL West", wins: 52, losses: 52 },
  OAK: { name: "Oakland Athletics", shortName: "OAK", division: "AL West", wins: 40, losses: 64 },
  
  ATL: { name: "Atlanta Braves", shortName: "ATL", division: "NL East", wins: 64, losses: 40 },
  NYM: { name: "New York Mets", shortName: "NYM", division: "NL East", wins: 61, losses: 43 },
  PHI: { name: "Philadelphia Phillies", shortName: "PHI", division: "NL East", wins: 59, losses: 45 },
  MIA: { name: "Miami Marlins", shortName: "MIA", division: "NL East", wins: 51, losses: 53 },
  WSH: { name: "Washington Nationals", shortName: "WSH", division: "NL East", wins: 45, losses: 59 },
  
  MIL: { name: "Milwaukee Brewers", shortName: "MIL", division: "NL Central", wins: 65, losses: 39 },
  STL: { name: "St. Louis Cardinals", shortName: "STL", division: "NL Central", wins: 60, losses: 44 },
  CHC: { name: "Chicago Cubs", shortName: "CHC", division: "NL Central", wins: 57, losses: 47 },
  CIN: { name: "Cincinnati Reds", shortName: "CIN", division: "NL Central", wins: 50, losses: 54 },
  PIT: { name: "Pittsburgh Pirates", shortName: "PIT", division: "NL Central", wins: 45, losses: 59 },
  
  LAD: { name: "Los Angeles Dodgers", shortName: "LAD", division: "NL West", wins: 65, losses: 39 },
  SD: { name: "San Diego Padres", shortName: "SD", division: "NL West", wins: 59, losses: 45 },
  SF: { name: "San Francisco Giants", shortName: "SF", division: "NL West", wins: 56, losses: 48 },
  ARI: { name: "Arizona Diamondbacks", shortName: "ARI", division: "NL West", wins: 55, losses: 49 },
  COL: { name: "Colorado Rockies", shortName: "COL", division: "NL West", wins: 48, losses: 56 },
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
    // For MLB: track teams playing today to enhance their data
    if (leagueId === "mlb") {
      game.competitors.forEach((c) => {
        const key = c.shortName
        // Update the roster with live game data if available
        if (MLB_TEAMS[key]) {
          if (c.record) {
            const [w, l] = c.record.split("-").map(Number)
            MLB_TEAMS[key].wins = w
            MLB_TEAMS[key].losses = l
          }
          if (c.logo) {
            MLB_TEAMS[key].logo = c.logo
          }
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

  // For MLB, populate all teams from the roster and group by division
  if (leagueId === "mlb") {
    Object.values(MLB_TEAMS).forEach((team) => {
      standings.push({
        position: 0,
        name: team.name,
        shortName: team.shortName,
        wins: team.wins,
        losses: team.losses,
        logo: team.logo,
        division: team.division,
      })
    })
  }

  if (standings.length === 0) return null

  // For MLB, group by division and sort within each
  if (leagueId === "mlb") {
    const byDivision = new Map<string, StandingEntry[]>()
    standings.forEach((entry) => {
      const div = entry.division || "Unknown"
      if (!byDivision.has(div)) byDivision.set(div, [])
      byDivision.get(div)!.push(entry)
    })

    // Sort each division by wins (descending) then losses (ascending)
    byDivision.forEach((teams) => {
      teams.sort((a, b) => {
        const aWins = a.wins || 0
        const bWins = b.wins || 0
        if (aWins !== bWins) return bWins - aWins
        return (a.losses || 0) - (b.losses || 0)
      })
      teams.forEach((team, i) => {
        team.position = i + 1
      })
    })

    // Order divisions
    const divisionOrder = ["AL East", "AL Central", "AL West", "NL East", "NL Central", "NL West"]
    const sortedDivisions = divisionOrder.filter((d) => byDivision.has(d))

    return (
      <section className="mb-10 space-y-6">
        <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Trophy className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          MLB Standings
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </h2>

        {sortedDivisions.map((division) => (
          <div key={division}>
            <h3 className="mb-2 px-2 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              {division}
            </h3>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      #
                    </th>
                    <th className="px-4 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Team
                    </th>
                    <th className="px-4 py-2 text-right font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      W-L
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {byDivision.get(division)?.map((entry) => (
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
                      <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-foreground">
                        {entry.wins}-{entry.losses}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    )
  }

  const title = leagueId === "f1" ? "Drivers Championship" : "Tournament Leaderboard"

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
                Driver
              </th>
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
