import type { Game, LeagueCategory } from "@/lib/espn"

export type VibeTone = "hot" | "tight" | "cool" | "neutral"

export interface GameVibe {
  label: string
  tone: VibeTone
}

function n(score?: string): number | null {
  if (score === undefined || score === null || score === "") return null
  const v = Number.parseInt(score, 10)
  return Number.isNaN(v) ? null : v
}

/**
 * Derives a glanceable, sport-aware descriptor for a head-to-head game
 * (e.g. "Pitcher's Duel", "Slugfest", "Shootout", "Nail-Biter").
 *
 * Only returns a vibe when there is enough signal:
 * - Both teams have numeric scores.
 * - Low-scoring descriptors ("duel", "defensive") require a finished game so
 *   an early live game isn't mislabeled.
 * - High-scoring / blowout / nail-biter descriptors work live or final.
 */
export function getGameVibe(game: Game): GameVibe | null {
  // Only head-to-head matchups with two competitors and shown scores.
  if (game.competitors.length !== 2) return null
  if (game.state === "pre") return null

  const a = n(game.competitors[0]?.score)
  const b = n(game.competitors[1]?.score)
  if (a === null || b === null) return null

  const total = a + b
  const margin = Math.abs(a - b)
  const isFinal = game.state === "post"
  const detail = (game.statusDetail || "").toLowerCase()
  const overtime = /\bot\b|overtime|extra|shootout|\bso\b/.test(detail)

  switch (game.category as LeagueCategory) {
    case "Baseball": {
      if (total >= 14) return { label: "Slugfest", tone: "hot" }
      if (margin >= 8) return { label: "Blowout", tone: "neutral" }
      if (margin <= 1 && total >= 2) return { label: "Nail-Biter", tone: "tight" }
      if (isFinal && total <= 3) return { label: "Pitcher's Duel", tone: "cool" }
      if (isFinal && total >= 10) return { label: "Bats Alive", tone: "hot" }
      return null
    }
    case "Football": {
      if (total >= 60) return { label: "Shootout", tone: "hot" }
      if (margin >= 21) return { label: "Blowout", tone: "neutral" }
      if (margin <= 3 && total >= 10) return { label: "Nail-Biter", tone: "tight" }
      if (total >= 45 && margin <= 8) return { label: "Barnburner", tone: "hot" }
      if (isFinal && total <= 24) return { label: "Defensive Battle", tone: "cool" }
      return null
    }
    case "Basketball": {
      if (total >= 240) return { label: "Track Meet", tone: "hot" }
      if (margin >= 20) return { label: "Blowout", tone: "neutral" }
      if (overtime) return { label: "Overtime Thriller", tone: "tight" }
      if (margin <= 4 && total >= 40) return { label: "Nail-Biter", tone: "tight" }
      if (isFinal && total <= 175) return { label: "Grind-It-Out", tone: "cool" }
      return null
    }
    case "Soccer": {
      if (total >= 5) return { label: "Goal Fest", tone: "hot" }
      if (margin >= 3) return { label: "Rout", tone: "neutral" }
      if (isFinal && total === 0) return { label: "Scoreless Draw", tone: "cool" }
      if (margin === 0 && total >= 2) return { label: "End-to-End", tone: "tight" }
      if (margin <= 1 && total >= 1) return { label: "One-Goal Game", tone: "tight" }
      if (isFinal && total <= 1) return { label: "Defensive Duel", tone: "cool" }
      return null
    }
    // Individual / field events (Golf, Tennis, Motorsport) don't map to
    // two-team score vibes.
    default:
      return null
  }
}
