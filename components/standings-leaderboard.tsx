"use client"

import { Trophy } from "lucide-react"
import type { StandingsEntry } from "@/lib/espn"

// ── F1 Drivers Championship ──────────────────────────────────────────────────

export function F1StandingsLeaderboard({ entries }: { entries: StandingsEntry[] }) {
  if (entries.length === 0) return null

  return (
    <section className="mb-10">
      <h2 className="mb-4 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <Trophy className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        F1 Drivers Championship
        <span className="ml-1 rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
          Live
        </span>
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
              <th className="px-4 py-2 text-right font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Pts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.slice(0, 20).map((entry) => (
              <tr key={`${entry.position}-${entry.shortName}`} className="transition-colors hover:bg-secondary/30">
                <td className="px-4 py-2.5 font-mono text-xs font-bold text-muted-foreground">
                  {entry.position}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {entry.logo ? (
                      <img src={entry.logo} alt="" className="h-4 w-5 shrink-0 object-contain" />
                    ) : (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground">
                        {entry.shortName.slice(0, 1)}
                      </span>
                    )}
                    <span className="font-semibold text-foreground">{entry.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-primary">
                  {entry.points ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── MLB Standings (by division) ──────────────────────────────────────────────

export function MLBStandingsLeaderboard({
  divisions,
}: {
  divisions: { name: string; entries: StandingsEntry[] }[]
}) {
  if (divisions.length === 0) return null

  return (
    <section className="mb-10 space-y-6">
      <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <Trophy className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        MLB Standings
        <span className="ml-1 rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
          Live
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </h2>

      {divisions.map(({ name, entries }) => (
        <div key={name}>
          <h3 className="mb-2 px-2 font-mono text-xs font-semibold uppercase tracking-wider text-primary">
            {name}
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
                  <th className="hidden px-4 py-2 text-right font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:table-cell">
                    GB
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
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
                          <img src={entry.logo} alt="" className="h-4 w-4 shrink-0 object-contain" />
                        ) : (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground">
                            {entry.shortName.slice(0, 1)}
                          </span>
                        )}
                        <span className="font-semibold text-foreground">{entry.shortName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-foreground">
                      {entry.wins ?? 0}-{entry.losses ?? 0}
                    </td>
                    <td className="hidden px-4 py-2.5 text-right font-mono text-xs text-muted-foreground sm:table-cell">
                      {entry.gamesBack ?? "—"}
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

// ── PGA Leaderboard ──────────────────────────────────────────────────────────

export function PGALeaderboard({ entries }: { entries: StandingsEntry[] }) {
  if (entries.length === 0) return null

  return (
    <section className="mb-10">
      <h2 className="mb-4 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <Trophy className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        PGA Tour Leaderboard
        <span className="ml-1 rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
          Live
        </span>
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
                Player
              </th>
              <th className="px-4 py-2 text-right font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Score
              </th>
              <th className="hidden px-4 py-2 text-right font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:table-cell">
                vs Par
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry) => (
              <tr key={`${entry.position}-${entry.shortName}`} className="transition-colors hover:bg-secondary/30">
                <td className="px-4 py-2.5 font-mono text-xs font-bold text-muted-foreground">
                  {entry.position}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {entry.logo ? (
                      <img src={entry.logo} alt="" className="h-4 w-5 shrink-0 object-contain rounded-sm" />
                    ) : (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground">
                        {entry.shortName.slice(0, 1)}
                      </span>
                    )}
                    <span className="font-semibold text-foreground">{entry.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-foreground">
                  {entry.score ?? "—"}
                </td>
                <td className="hidden px-4 py-2.5 text-right font-mono text-xs font-semibold text-muted-foreground sm:table-cell">
                  {entry.parDiff ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── Legacy export kept for any imports that still use the old name ────────────
// (sports-guide.tsx imports StandingsLeaderboard — we keep this re-export
//  so it doesn't break until sports-guide is updated)
export { F1StandingsLeaderboard as StandingsLeaderboard }
