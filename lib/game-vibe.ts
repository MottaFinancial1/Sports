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

function era(v?: string): number | null {
  if (!v) return null
  const x = Number.parseFloat(v)
  return Number.isNaN(x) ? null : x
}

/**
 * Winning percentage from a record string like "10-5", "10-5-1" (draws), or
 * "10-5, 2nd AL East". Draws count as half a win. Returns null when unparseable.
 */
function winPct(record?: string): number | null {
  if (!record) return null
  const first = record.split(",")[0].trim()
  const parts = first.split("-").map((p) => Number.parseInt(p, 10))
  if (parts.length < 2 || parts.some((p) => Number.isNaN(p))) return null
  const [w, l, t = 0] = parts
  const total = w + l + t
  if (total <= 0) return null
  return (w + t * 0.5) / total
}

/**
 * Extracts the current/final inning from a baseball status detail such as
 * "Top 10th", "Bot 11th", or "Final/10". Regulation finals read simply
 * "Final" (no number), so extra innings is inning >= 10.
 */
function inningNumber(detail: string): number | null {
  const ordinal = detail.match(/(\d+)\s*(?:st|nd|rd|th)/)
  if (ordinal) return Number.parseInt(ordinal[1], 10)
  const slash = detail.match(/\/\s*(\d+)/) // "Final/10"
  if (slash) return Number.parseInt(slash[1], 10)
  return null
}

/**
 * Derives a glanceable, sport-aware descriptor for a head-to-head game.
 *
 * The vocabulary is intentionally vivid and fan-facing — the same language a
 * sharp analyst would use to characterize a matchup at a glance:
 *   Pre-game  → "Ace Duel", "Rivalry", "Must-Win"
 *   Live/Final → "Slugfest", "Shootout", "Extra Innings", "Instant Classic",
 *                "Upset Alert" / "Upset", "Statement Game",
 *                "Defensive Masterclass", "Nail-Biter", etc.
 *
 * Only returns a vibe when there is enough signal in the live data (scores,
 * team records, probable-pitcher ERAs, status detail, or ESPN note headlines),
 * so an early or data-poor game is never mislabeled.
 */
export function getGameVibe(game: Game): GameVibe | null {
  // Only head-to-head matchups with two competitors.
  if (game.competitors.length !== 2) return null

  const isFinal = game.state === "post"
  const isLive = game.state === "in"
  const isPre = game.state === "pre"
  const cat = game.category as LeagueCategory
  const detail = (game.statusDetail || "").toLowerCase()
  const note = (game.note || "").toLowerCase()

  // ---- Context descriptors (any state) — derived from ESPN's note headline ----
  if (/rivalry|derby|cl[aá]sico|iron bowl|border war|backyard brawl|\bthe game\b/.test(note)) {
    return { label: "Rivalry", tone: "hot" }
  }
  if (/win or go home|elimination|must[-\s]?win|clinch|do[-\s]?or[-\s]?die/.test(note)) {
    return { label: "Must-Win", tone: "hot" }
  }

  // ---------------------------- Pre-game vibes ----------------------------
  if (isPre) {
    // Baseball: two ace-caliber probable starters = an enticing pitching matchup.
    if (cat === "Baseball") {
      const eras = game.competitors
        .map((c) => era(c.probablePitcher?.era))
        .filter((e): e is number => e !== null)
      if (eras.length === 2 && eras.every((e) => e <= 3.1)) {
        return { label: "Ace Duel", tone: "cool" }
      }
    }
    return null
  }

  // ------------------------- Live / Final vibes -------------------------
  const a = n(game.competitors[0]?.score)
  const b = n(game.competitors[1]?.score)
  if (a === null || b === null) return null

  const total = a + b
  const margin = Math.abs(a - b)
  const inning = inningNumber(detail)
  const extraInnings = cat === "Baseball" && inning !== null && inning >= 10
  const overtime = /\bot\b|overtime|extra|shootout|\bso\b/.test(detail)

  // Overtime / extra innings outrank the score-based descriptors: a game that
  // needed free baseball or an extra period is inherently the story.
  if (extraInnings || overtime) {
    if (isFinal && margin <= (cat === "Basketball" ? 8 : cat === "Football" ? 8 : 3)) {
      return { label: "Instant Classic", tone: "tight" }
    }
    if (extraInnings) return { label: "Extra Innings", tone: "tight" }
    return { label: "Overtime Thriller", tone: "tight" }
  }

  const base = perSportVibe(cat, { total, margin, isFinal })

  // Refine the score-based read with team quality: a leading/winning underdog
  // is an upset, and a favorite pulling away is making a statement.
  const leaderIdx = a === b ? -1 : a > b ? 0 : 1
  if (leaderIdx >= 0) {
    const leaderPct = winPct(game.competitors[leaderIdx]?.record)
    const trailPct = winPct(game.competitors[1 - leaderIdx]?.record)
    if (leaderPct !== null && trailPct !== null) {
      // Leader has the meaningfully worse record → upset.
      if (trailPct - leaderPct >= 0.15) {
        return { label: isFinal ? "Upset" : "Upset Alert", tone: "hot" }
      }
      // Favorite blowing the doors off → statement game.
      if (base?.label === "Blowout" && leaderPct - trailPct >= 0.12) {
        return { label: "Statement Game", tone: "neutral" }
      }
    }
  }

  return base
}

function perSportVibe(
  category: LeagueCategory,
  { total, margin, isFinal }: { total: number; margin: number; isFinal: boolean },
): GameVibe | null {
  switch (category) {
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
      if (isFinal && total <= 24) return { label: "Defensive Masterclass", tone: "cool" }
      return null
    }
    case "Basketball": {
      if (total >= 240) return { label: "Track Meet", tone: "hot" }
      if (margin >= 20) return { label: "Blowout", tone: "neutral" }
      if (margin <= 4 && total >= 40) return { label: "Nail-Biter", tone: "tight" }
      if (isFinal && total <= 175) return { label: "Defensive Masterclass", tone: "cool" }
      return null
    }
    case "Soccer": {
      if (total >= 5) return { label: "Goal Fest", tone: "hot" }
      if (margin >= 3) return { label: "Rout", tone: "neutral" }
      if (isFinal && total === 0) return { label: "Scoreless Draw", tone: "cool" }
      if (margin === 0 && total >= 2) return { label: "End-to-End", tone: "tight" }
      if (margin <= 1 && total >= 1) return { label: "One-Goal Game", tone: "tight" }
      if (isFinal && total <= 1) return { label: "Defensive Masterclass", tone: "cool" }
      return null
    }
    // Individual / field events (Golf, Tennis, Motorsport) don't map to
    // two-team score vibes.
    default:
      return null
  }
}
