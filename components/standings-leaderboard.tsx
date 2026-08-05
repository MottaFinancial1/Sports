"use client"

import { Trophy, Star } from "lucide-react"
import type { F1Constructor, F1Driver, PGAPlayer } from "@/lib/espn"

// ---- Shared primitives ----

function SectionLabel({ icon: Icon, title }: { icon: typeof Trophy; title: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      {title}
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </h2>
  )
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`bg-secondary/60 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  right,
  mono,
  bold,
  accent,
}: {
  children: React.ReactNode
  right?: boolean
  mono?: boolean
  bold?: boolean
  accent?: boolean
}) {
  return (
    <td
      className={`px-4 py-2.5 ${right ? "text-right" : ""} ${mono ? "font-mono text-xs tabular-nums" : ""} ${bold ? "font-bold" : "font-semibold"} ${accent ? "text-primary" : "text-foreground"}`}
    >
      {children}
    </td>
  )
}

function RankCell({ position }: { position: string | number }) {
  return (
    <td className="w-10 px-4 py-2.5 font-mono text-xs font-bold text-muted-foreground/60">{position}</td>
  )
}

// ---- F1 Driver Standings ----

export function F1DriverStandings({ drivers }: { drivers: F1Driver[] }) {
  if (drivers.length === 0) return null
  return (
    <section className="mb-6">
      <SectionLabel icon={Trophy} title="F1 Driver Standings" />
      <TableWrap>
        <thead>
          <tr className="border-b border-border">
            <Th>#</Th>
            <Th>Driver</Th>
            <Th>Team</Th>
            <Th right>Pts</Th>
            <Th right>W</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {drivers.slice(0, 10).map((d) => (
            <tr key={d.name} className="transition-colors hover:bg-secondary/40">
              <RankCell position={d.position} />
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
      <SectionLabel icon={Trophy} title="F1 Constructor Standings" />
      <TableWrap>
        <thead>
          <tr className="border-b border-border">
            <Th>#</Th>
            <Th>Constructor</Th>
            <Th right>Pts</Th>
            <Th right>W</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {constructors.slice(0, 10).map((c) => (
            <tr key={c.name} className="transition-colors hover:bg-secondary/40">
              <RankCell position={c.position} />
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {c.logo ? (
                    <img src={c.logo} alt="" className="h-4 w-4 shrink-0 object-contain" />
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[8px] font-bold text-muted-foreground">
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
      <SectionLabel icon={Trophy} title="PGA Tour Leaderboard" />
      <TableWrap>
        <thead>
          <tr className="border-b border-border">
            <Th>#</Th>
            <Th>Player</Th>
            <Th right>Score</Th>
            <Th right>Today</Th>
            <Th right>Thru</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {players.slice(0, 10).map((p, i) => (
            <tr
              key={p.name}
              className={`transition-colors hover:bg-secondary/40 ${i < 3 ? "bg-primary/4" : ""}`}
            >
              <RankCell position={p.position} />
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
              <td
                className={`px-4 py-2.5 text-right font-mono text-xs font-bold tabular-nums ${
                  p.score.startsWith("-") ? "text-primary" : p.score === "E" ? "text-foreground" : "text-destructive"
                }`}
              >
                {p.score}
              </td>
              <td
                className={`px-4 py-2.5 text-right font-mono text-xs tabular-nums ${
                  p.today.startsWith("-") ? "text-primary/80" : "text-muted-foreground"
                }`}
              >
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

// ---- MLB Standings ----

import type { MLBStandingTeam } from "@/lib/espn"

export function StandingsLeaderboard({ standings }: { standings: MLBStandingTeam[] }) {
  const byDivision = new Map<string, (MLBStandingTeam & { position: number })[]>()
  for (const team of standings) {
    if (!byDivision.has(team.division)) byDivision.set(team.division, [])
    byDivision.get(team.division)!.push({ ...team, position: 0 })
  }
  byDivision.forEach((teams) => {
    teams.sort((a, b) => (b.wins !== a.wins ? b.wins - a.wins : a.losses - b.losses))
    teams.forEach((t, i) => { t.position = i + 1 })
  })

  const divisionOrder = ["AL East", "AL Central", "AL West", "NL East", "NL Central", "NL West"]
  const sortedDivisions = divisionOrder.filter((d) => byDivision.has(d))

  if (standings.length === 0) return null

  return (
    <section className="mb-10 space-y-6">
      <SectionLabel icon={Trophy} title="MLB Standings" />
      {sortedDivisions.map((division) => (
        <div key={division}>
          <h3 className="mb-2 px-1 font-mono text-xs font-bold uppercase tracking-wider text-primary">
            {division}
          </h3>
          <TableWrap>
            <thead>
              <tr className="border-b border-border">
                <Th>#</Th>
                <Th>Team</Th>
                <Th right>W</Th>
                <Th right>L</Th>
                <Th right>PCT</Th>
                <Th right>GB</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byDivision.get(division)?.map((entry) => (
                <tr key={entry.abbreviation} className="transition-colors hover:bg-secondary/40">
                  <RankCell position={entry.position} />
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {entry.logo ? (
                        <img src={entry.logo} alt="" className="h-5 w-5 shrink-0 object-contain" />
                      ) : (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[8px] font-bold text-muted-foreground">
                          {entry.abbreviation.slice(0, 1)}
                        </span>
                      )}
                      <span className="font-semibold text-foreground">{entry.shortName}</span>
                      <span className="hidden text-xs text-muted-foreground sm:inline">{entry.abbreviation}</span>
                    </div>
                  </td>
                  <Td right mono bold accent>{entry.wins}</Td>
                  <Td right mono>{entry.losses}</Td>
                  <Td right mono>{entry.pct}</Td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {entry.gb === "0.0" || entry.gb === "-" ? "—" : entry.gb}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      ))}
    </section>
  )
}
