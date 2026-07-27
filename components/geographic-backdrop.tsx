"use client"

const LOCATIONS = [
  {
    code: "LAX",
    position: "left-[8%] top-[28%]",
    tone: "border-destructive/35 text-destructive/60",
  },
  {
    code: "BOS",
    position: "right-[6%] top-[18%]",
    tone: "border-destructive/35 text-destructive/60",
  },
  {
    code: "ATL",
    position: "right-[12%] bottom-[20%]",
    tone: "border-primary/30 text-primary/50",
  },
]

/**
 * Baseball-themed backdrop with team location markers. Features a subtle
 * diamond pattern and stitching details reminiscent of a baseball field,
 * with team codes positioned at favorite locations without city labels.
 */
export function GeographicBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block"
      aria-hidden="true"
    >
      {/* Baseball diamond pattern SVG */}
      <svg
        className="absolute inset-0 h-full w-full opacity-3"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 800"
      >
        {/* Repeating diamond pattern */}
        <defs>
          <pattern id="diamond-pattern" x="0" y="0" width="150" height="150" patternUnits="userSpaceOnUse">
            <path
              d="M 75 0 L 150 75 L 75 150 L 0 75 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.4"
            />
            <circle cx="75" cy="75" r="2" fill="currentColor" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="1200" height="800" fill="url(#diamond-pattern)" className="text-primary/20" />

        {/* Baseball stitching curves */}
        <g stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.15" className="text-destructive/40">
          <path d="M 100 600 Q 300 550, 500 600 T 900 600" />
          <path d="M 150 200 Q 400 150, 650 200 T 1050 200" />
        </g>
      </svg>

      {/* Subtle grid lines for data aesthetic */}
      <div className="absolute inset-y-0 left-1/3 w-px bg-gradient-to-b from-border/8 via-border/4 to-transparent" />
      <div className="absolute inset-y-0 right-1/3 w-px bg-gradient-to-b from-transparent via-border/4 to-border/8" />
      <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-border/8 via-border/4 to-transparent" />
      <div className="absolute inset-x-0 bottom-1/3 h-px bg-gradient-to-r from-transparent via-border/4 to-border/8" />

      {/* Team location markers */}
      {LOCATIONS.map((location) => (
        <div key={location.code} className={`absolute ${location.position} opacity-80`}>
          <div className={`relative border-l-2 pl-4 font-mono ${location.tone}`}>
            <span className="absolute -left-1.5 top-1 h-2.5 w-2.5 rounded-full border border-current bg-background/50" />
            <p className="text-[12px] font-bold uppercase tracking-[0.24em] leading-tight">
              {location.code}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
