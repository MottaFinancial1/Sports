"use client"

import { Trophy, Star } from "lucide-react"
import type { F1Constructor, F1Driver, PGAPlayer } from "@/lib/espn"

// ---------- MLB Standings (static seed, updated by live game data) ----------

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
  TB:  { name: "Tampa Bay Rays", shortName: "TB", division: "AL East", wins: 59, losses: 45 },
  BAL: { name: "Baltimore Orioles", shortName: "BAL", division: "AL East", wins: 58, losses: 46 },
  TOR: { name: "Toronto Blue Jays", shortName: "TOR", division: "AL East", wins: 56, losses: 48 },
  CLE: { name: "Cleveland Guardians", shortName: "CLE", division: "AL Central", wins: 65, losses: 39 },
  DET: { name: "Detroit Tigers", shortName: "DET", division: "AL Central", wins: 61, losses: 43 },
  MIN: { name: "Minnesota Twins", shortName: "MIN", division: "AL Central", wins: 60, losses: 44 },
  KC:  { name: "Kansas City Royals", shortName: "KC", division: "AL Central", wins: 47, losses: 57 },
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
  SD:  { name: "San Diego Padres", shortName: "SD", division: "NL West", wins: 59, losses: 45 },
  SF:  { name: "San Francisco Giants", shortName: "SF", division: "NL West", wins: 56, losses: 48 },
  ARI: { name: "Arizona Diamondbacks", shortName: "ARI", division: "NL West", wins: 55, losses: 49 },
  COL: { name: "Colorado Rockies", shortName: "COL", division: "NL West", wins: 48, losses: 56 },
}

// ---- Shared table primitives ----

function SectionHeader({ icon: Icon, title }: { icon: typeof Trophy; title: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      {title}
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </h2>
  )
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  )
}

function Td({ children, right, mono, bold, accent }: { children: React.ReactNode; right?: boolean; mono?: boolean; bold?: boolean; accent?: boolean }) {
  return (
    <td
      className={`px-4 py-2.5 ${right ? "text-right" : ""} ${mono ? "font-mono text-xs tabular-nums" : ""} ${bold ? "font-bold" : "font-semibold"} ${accent ? "text-primary" : "text-foreground"}`}
    >
      {children}
    </td>
  )
}

// ---- F1 Driver Standings ----

export function F1DriverStandings({ drivers }: { drivers: F1Driver[] }) {
  if (drivers.length === 0) return null
  return (
    <section className="mb-6">
      <SectionHeader icon={Trophy} title="F1 Driver Standings" />
      <TableWrap>
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            <Th>#</Th>
            <Th>Driver</Th>
            <Th>Team</Th>
            <Th right>Pts</Th>
            <Th right>W</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {drivers.slice(0, 20).map((d) => (
            <tr key={d.name} className="transition-colors hover:bg-secondary/30">
              <td className="px-4 py-2.5 font-mono text-xs font-bold text-muted-foreground">{d.position}</td>
              <Td bold>{d.name}</Td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  {d.logo ? (
                    <img src={d.logo} alt="" className="h-4 w-4 shrink-0 object-contain" />
                  ) : null}
                  <span className="font-mono text-xs text-muted-foreground">{d.teamShort || d.team}</span>
                </div>
              </td>
              <Td right mono accent bold>{d.points}</Td>
              <Td right mono>{d.wins || "—"}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </section>
  )
}

// ---- F1 Constructor Standings ----

export function F1ConstructorStandings({ constructors }: { constructors: F1Constructor[] }) {
  if (constructors.length === 0) return null
  return (
    <section className="mb-10">
      <SectionHeader icon={Trophy} title="F1 Constructor Standings" />
      <TableWrap>
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            <Th>#</Th>
            <Th>Constructor</Th>
            <Th right>Pts</Th>
            <Th right>W</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {constructors.slice(0, 10).map((c) => (
            <tr key={c.name} className="transition-colors hover:bg-secondary/30">
              <td className="px-4 py-2.5 font-mono text-xs font-bold text-muted-foreground">{c.position}</td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {c.logo ? (
                    <img src={c.logo} alt="" className="h-4 w-4 shrink-0 object-contain" />
                  ) : (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground">
                      {c.shortName.slice(0, 1)}
                    </span>
                  )}
                  <span className="font-semibold text-foreground">{c.name}</span>
                </div>
              </td>
              <Td right mono accent bold>{c.points}</Td>
              <Td right mono>{c.wins || "—"}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </section>
  )
}

// ---- PGA Leaderboard ----

export function PGALeaderboard({ players }: { players: PGAPlayer[] }) {
  if (players.length === 0) return null
  return (
    <section className="mb-10">
      <SectionHeader icon={Trophy} title="PGA Tour Leaderboard" />
      <TableWrap>
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            <Th>#</Th>
            <Th>Player</Th>
            <Th right>Score</Th>
            <Th right>Today</Th>
            <Th right>Thru</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {players.slice(0, 20).map((p, i) => (
            <tr key={p.name} className={`transition-colors hover:bg-secondary/30 ${i < 3 ? "bg-primary/5" : ""}`}>
              <td className="px-4 py-2.5 font-mono text-xs font-bold text-muted-foreground">{p.position}</td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  {p.isBigName ? (
                    <Star className="h-3 w-3 shrink-0 fill-primary text-primary" aria-hidden="true" />
                  ) : (
                    <span className="h-3 w-3 shrink-0" aria-hidden="true" />
                  )}
                  <span className={`${p.isBigName ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                    {p.name}
                  </span>
                </div>
              </td>
              <td className={`px-4 py-2.5 text-right font-mono text-xs font-bold tabular-nums ${
                p.score.startsWith("-") ? "text-primary" :
                p.score === "E" ? "text-foreground" : "text-destructive"
              }`}>
                {p.score}
              </td>
              <td className={`px-4 py-2.5 text-right font-mono text-xs tabular-nums ${
                p.today.startsWith("-") ? "text-primary/80" : "text-muted-foreground"
              }`}>
                {p.today}
              </td>
              <Td right mono>{p.thru}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </section>
  )
}

// ---- MLB Standings (legacy, kept for sports-guide) ----

import type { Game } from "@/lib/espn"

export function StandingsLeaderboard({
  games,
  leagueId,
}: {
  games: Game[]
  leagueId: "mlb"
}) {
  // Update seed data with live records from today's scoreboard
  const teamsClone: Record<string, MLBTeamInfo> = JSON.parse(JSON.stringify(MLB_TEAMS))
  for (const game of games) {
    game.competitors.forEach((c) => {
      const key = c.shortName
      if (teamsClone[key]) {
        if (c.record) {
          const [w, l] = c.record.split("-").map(Number)
          if (!isNaN(w) && !isNaN(l)) {
            teamsClone[key].wins = w
            teamsClone[key].losses = l
          }
        }
        if (c.logo) teamsClone[key].logo = c.logo
      }
    })
  }

  const byDivision = new Map<string, (MLBTeamInfo & { position: number })[]>()
  Object.values(teamsClone).forEach((team) => {
    const div = team.division
    if (!byDivision.has(div)) byDivision.set(div, [])
    byDivision.get(div)!.push({ ...team, position: 0 })
  })
  byDivision.forEach((teams) => {
    teams.sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : a.losses - b.losses)
    teams.forEach((t, i) => { t.position = i + 1 })
  })

  const divisionOrder = ["AL East", "AL Central", "AL West", "NL East", "NL Central", "NL West"]
  const sortedDivisions = divisionOrder.filter((d) => byDivision.has(d))

  return (
    <section className="mb-10 space-y-6">
      <SectionHeader icon={Trophy} title="MLB Standings" />
      {sortedDivisions.map((division) => (
        <div key={division}>
          <h3 className="mb-2 px-1 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
            {division}
          </h3>
          <TableWrap>
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <Th>#</Th>
                <Th>Team</Th>
                <Th right>W-L</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byDivision.get(division)?.map((entry) => (
                <tr key={entry.shortName} className="transition-colors hover:bg-secondary/30">
                  <td className="px-4 py-2.5 font-mono text-xs font-bold text-muted-foreground">{entry.position}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {entry.logo ? (
                        <img src={entry.logo} alt="" className="h-4 w-4 shrink-0 object-contain" />
                      ) : (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground">
                          {entry.shortName.slice(0, 1)}
                        </span>
                      )}
                      <span className="font-semibold text-foreground">{entry.shortName}</span>
                    </div>
                  </td>
                  <Td right mono bold>{entry.wins}-{entry.losses}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      ))}
    </section>
  )
}
