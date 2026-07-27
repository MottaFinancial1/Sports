"use client"

const LOCATIONS = [
  {
    code: "LAX",
    city: "Anaheim",
    detail: "Angels",
    position: "left-[8%] top-[28%]",
    tone: "border-destructive/35 text-destructive/60",
  },
  {
    code: "BOS",
    city: "Boston",
    detail: "Red Sox",
    position: "right-[6%] top-[18%]",
    tone: "border-destructive/35 text-destructive/60",
  },
  {
    code: "ATL",
    city: "Gwinnett",
    detail: "Stripers",
    position: "right-[12%] bottom-[20%]",
    tone: "border-primary/30 text-primary/50",
  },
]

/**
 * Professional geographic context for favorite teams. Positioned grid with
 * subtle team location markers that anchor the design without overwhelming
 * the content layer. Uses improved contrast and positioning.
 */
export function GeographicBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block"
      aria-hidden="true"
    >
      {/* Subtle grid lines */}
      <div className="absolute inset-y-0 left-1/3 w-px bg-gradient-to-b from-border/10 via-border/5 to-transparent" />
      <div className="absolute inset-y-0 right-1/3 w-px bg-gradient-to-b from-transparent via-border/5 to-border/10" />
      <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-border/10 via-border/5 to-transparent" />
      <div className="absolute inset-x-0 bottom-1/3 h-px bg-gradient-to-r from-transparent via-border/5 to-border/10" />

      {/* Team location markers */}
      {LOCATIONS.map((location) => (
        <div key={location.code} className={`absolute ${location.position} opacity-80`}>
          <div className={`relative border-l-2 pl-4 font-mono ${location.tone}`}>
            <span className="absolute -left-1.5 top-1 h-2.5 w-2.5 rounded-full border border-current bg-background/50" />
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] leading-tight">
              {location.code}
            </p>
            <p className="mt-0.5 text-[8px] uppercase tracking-widest text-muted-foreground/50 leading-tight">
              {location.city}
            </p>
            <p className="text-[8px] uppercase tracking-widest text-muted-foreground/40 leading-tight">
              {location.detail}
            </p>
          </div>
        </div>
      ))}

      {/* Corner label */}
      <div className="absolute bottom-6 left-8 font-mono text-[8px] uppercase tracking-[0.32em] text-muted-foreground/30">
        Favorite teams
      </div>
    </div>
  )
}
