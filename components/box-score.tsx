"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { Game } from "@/lib/espn"

export function BoxScore({ game }: { game: Game }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (game.state !== "in" || game.competitors.length !== 2) return null

  const [away, home] = game.competitors

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between gap-2 text-left hover:text-primary"
      >
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Box Score
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          <div className="rounded bg-secondary/20 p-2">
            <p className="text-xs font-semibold text-foreground">{away.name}</p>
            <p className="font-mono text-sm font-bold text-primary">{away.score || "—"}</p>
            {away.record && (
              <p className="text-xs text-muted-foreground">{away.record}</p>
            )}
          </div>
          <div className="rounded bg-secondary/20 p-2">
            <p className="text-xs font-semibold text-foreground">{home.name}</p>
            <p className="font-mono text-sm font-bold text-primary">{home.score || "—"}</p>
            {home.record && (
              <p className="text-xs text-muted-foreground">{home.record}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
