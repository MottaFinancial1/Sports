"use client"

const LOCATIONS = [
  { code: "LAX", city: "Anaheim", detail: "Angels", position: "left-[6%] top-[22%]", tone: "border-destructive/25 text-destructive/45" },
  { code: "BOS", city: "Boston", detail: "Red Sox", position: "right-[5%] top-[15%]", tone: "border-destructive/30 text-destructive/50" },
  { code: "ATL", city: "Gwinnett", detail: "Stripers", position: "right-[9%] bottom-[16%]", tone: "border-primary/20 text-primary/40" },
]

/**
 * Restrained geographic context for favorite teams. This behaves like a
 * broadcast coordinate overlay rather than a literal map, keeping the page
 * professional and preserving contrast behind score cards.
 */
export function GeographicBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block" aria-hidden="true">
      <div className="absolute inset-y-0 left-1/2 w-px bg-border/30" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-border/20" />

      {LOCATIONS.map((location) => (
        <div key={location.code} className={`absolute ${location.position} opacity-70`}>
          <div className={`relative border-l pl-3 font-mono ${location.tone}`}>
            <span className="absolute -left-1 top-0 h-2 w-2 rounded-full border bg-background" />
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]">{location.code}</p>
            <p className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground/30">
              {location.city} / {location.detail}
            </p>
          </div>
        </div>
      ))}

      <div className="absolute bottom-8 left-8 font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground/20">
        Favorite team network · coast to coast
      </div>
    </div>
  )
}
