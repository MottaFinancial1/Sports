'use client'

/**
 * Geographic backdrop layer showing favorite teams' locations.
 * Rendered as a fixed pseudo-map with subtle location markers.
 * Positioned behind content, professional and unobtrusive.
 */

export function GeographicBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-20">
      {/* Los Angeles Angels - West Coast, primary position */}
      <div className="absolute top-1/4 left-1/12 flex flex-col items-center">
        <div className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
        <div className="mt-1 h-12 w-12 rounded-full border border-primary/30" aria-hidden="true" />
        <div className="mt-2 font-mono text-xs font-semibold text-primary/60">LA</div>
      </div>

      {/* Boston Red Sox - Northeast, top-right */}
      <div className="absolute top-1/3 right-1/6 flex flex-col items-center">
        <div className="h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden="true" />
        <div className="mt-1 h-12 w-12 rounded-full border border-destructive/25" aria-hidden="true" />
        <div className="mt-2 font-mono text-xs font-semibold text-destructive/50">BOS</div>
      </div>

      {/* Gwinnett Stripers - Southeast (Atlanta area), bottom-right */}
      <div className="absolute bottom-1/4 right-1/4 flex flex-col items-center">
        <div className="h-1.5 w-1.5 rounded-full bg-yellow-600/80" aria-hidden="true" />
        <div className="mt-1 h-12 w-12 rounded-full border border-yellow-600/20" aria-hidden="true" />
        <div className="mt-2 font-mono text-xs font-semibold text-yellow-600/40">ATL</div>
      </div>

      {/* Subtle connecting lines between locations */}
      <svg
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.85 0.23 148 / 0.1)" />
            <stop offset="50%" stopColor="oklch(0.68 0.21 27 / 0.05)" />
            <stop offset="100%" stopColor="oklch(0.65 0.18 60 / 0.08)" />
          </linearGradient>
        </defs>
        {/* LA to Boston connection */}
        <line
          x1="8%"
          y1="25%"
          x2="83%"
          y2="33%"
          stroke="url(#line-gradient)"
          strokeWidth="0.5"
          strokeDasharray="2,3"
        />
        {/* Boston to Atlanta connection */}
        <line
          x1="83%"
          y1="33%"
          x2="75%"
          y2="75%"
          stroke="url(#line-gradient)"
          strokeWidth="0.5"
          strokeDasharray="2,3"
        />
        {/* Atlanta to LA connection */}
        <line
          x1="75%"
          y1="75%"
          x2="8%"
          y2="25%"
          stroke="url(#line-gradient)"
          strokeWidth="0.5"
          strokeDasharray="2,3"
        />
      </svg>
    </div>
  )
}
