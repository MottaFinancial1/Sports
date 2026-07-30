"use client"

// Tracks how many times the user has viewed a team's game card.
// Stored in localStorage under "bk:team-views" as a JSON map of teamName -> count.

const STORAGE_KEY = "bk:team-views"

export type TeamViewMap = Record<string, number>

export function getTeamViews(): TeamViewMap {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as TeamViewMap
  } catch {
    return {}
  }
}

export function recordTeamView(teamNames: string[]): void {
  if (typeof window === "undefined") return
  const views = getTeamViews()
  for (const name of teamNames) {
    views[name] = (views[name] ?? 0) + 1
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
  } catch {
    // Storage full or unavailable — silently ignore.
  }
}

/** Returns a score for a game based on how often its teams have been viewed. */
export function gameViewScore(teamNames: string[], views: TeamViewMap): number {
  return teamNames.reduce((sum, name) => sum + (views[name] ?? 0), 0)
}
