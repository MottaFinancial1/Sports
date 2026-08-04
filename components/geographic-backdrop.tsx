"use client"

const LOCATIONS = [
  { code: "LAX", city: "Anaheim", detail: "Angels", position: "left-[5%] top-[20%]", tone: "border-destructive/30 text-destructive/50" },
  { code: "BOS", city: "Boston", detail: "Red Sox", position: "right-[4%] top-[14%]", tone: "border-primary/30 text-primary/50" },
  { code: "OMA", city: "Omaha", detail: "Storm Chasers", position: "left-[38%] top-[30%]", tone: "border-primary/20 text-primary/35" },
]

/**
 * Stadium-lights backdrop. A fixed full-bleed layer that paints:
 * 1. A radial "floodlight cone" glow from the top-center — amber, stadium feel.
 * 2. A fine dot-grid that implies a scoreboard / broadcast overlay.
 * 3. Faint diagonal rule lines for a data-terminal broadcast texture.
 * 4. Team coordinate pins, restrained and non-intrusive.
 */
export function GeographicBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Floodlight cone — amber radial from top-center */}
      <div
        className="absolute inset-x-0 -top-40 h-[70vh]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.82 0.19 72 / 0.07) 0%, oklch(0.82 0.19 72 / 0.03) 40%, transparent 70%)",
        }}
      />

      {/* Secondary accent glow — bottom-right warm pool */}
      <div
        className="absolute -bottom-20 -right-20 h-[40vh] w-[40vw]"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 100% 100%, oklch(0.65 0.22 25 / 0.06) 0%, transparent 70%)",
        }}
      />

      {/* Dot-grid overlay — fine scoreboard texture, desktop only */}
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(1 0 0 / 0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Vertical centre rule */}
      <div className="absolute inset-y-0 left-1/2 w-px bg-border/20 hidden lg:block" />

      {/* Horizontal centre rule */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-border/15 hidden lg:block" />

      {/* Team coordinate pins — desktop only */}
      <div className="hidden lg:block">
        {LOCATIONS.map((location) => (
          <div key={location.code} className={`absolute ${location.position} opacity-60`}>
            <div className={`relative border-l pl-3 font-mono ${location.tone}`}>
              <span className="absolute -left-1 top-0 h-2 w-2 rounded-full border bg-background" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]">{location.code}</p>
              <p className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground/30">
                {location.city} / {location.detail}
              </p>
            </div>
          </div>
        ))}

        <div className="absolute bottom-8 left-8 font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground/18">
          Favorite team network · coast to coast
        </div>
      </div>
    </div>
  )
}
