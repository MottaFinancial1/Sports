"use client"

/**
 * Full-page (not fixed) backdrop so the sports illustration scrolls with
 * content rather than staying frozen. Contains:
 *   – A large baseball field diagram (lower-right, coloured in the
 *     destructive red palette so it reads clearly on the dark bg)
 *   – Scattered sports-equipment silhouettes: baseball, basketball, football,
 *     tennis ball, golf ball, tennis racket, golf club, hockey stick
 * Zero text labels — purely illustrative.
 */
export function GeographicBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-0 min-h-full w-full overflow-hidden"
      aria-hidden="true"
    >
      {/* ── Baseball field ──────────────────────────────────────────── */}
      {/*
        viewBox 1000×1000. Home plate at (500,940). Diamond rotated so foul
        lines splay to upper-left / upper-right naturally.
        Coloured red-orange to complement the warm background.
      */}
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMaxYMax meet"
        className="absolute right-0 top-24 h-[900px] w-[900px] text-destructive opacity-[0.12] lg:h-[1100px] lg:w-[1100px]"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Foul lines */}
        <line x1="500" y1="940" x2="20"  y2="20"  stroke="currentColor" strokeWidth="1.8" />
        <line x1="500" y1="940" x2="980" y2="20"  stroke="currentColor" strokeWidth="1.8" />

        {/* Outfield wall arcs */}
        <path d="M 55 800 Q 500 50 945 800"  stroke="currentColor" strokeWidth="1.2" strokeDasharray="10 7" />
        <path d="M 90 840 Q 500 100 910 840" stroke="currentColor" strokeWidth="0.9" strokeDasharray="6 8" opacity="0.6" />

        {/* Infield grass arc */}
        <path d="M 220 630 Q 500 340 780 630" stroke="currentColor" strokeWidth="1.4" strokeDasharray="7 5" />

        {/* Base-path diamond */}
        <polygon points="500,940 800,640 500,340 200,640" stroke="currentColor" strokeWidth="2.2" />

        {/* Bases */}
        {([
          [800, 640],
          [500, 340],
          [200, 640],
        ] as [number, number][]).map(([cx, cy], i) => (
          <rect
            key={i}
            x={cx - 12} y={cy - 12}
            width={24} height={24}
            transform={`rotate(45 ${cx} ${cy})`}
            stroke="currentColor" strokeWidth="1.8"
          />
        ))}

        {/* Home plate */}
        <polygon points="500,962 518,944 518,924 482,924 482,944" stroke="currentColor" strokeWidth="1.8" />

        {/* Pitcher's mound */}
        <circle cx="500" cy="640" r="26" stroke="currentColor" strokeWidth="1.8" />

        {/* Batter's boxes */}
        <rect x="458" y="922" width="22" height="40" stroke="currentColor" strokeWidth="1.2" />
        <rect x="520" y="922" width="22" height="40" stroke="currentColor" strokeWidth="1.2" />

        {/* Coaching boxes */}
        <rect x="750" y="680" width="46" height="70" stroke="currentColor" strokeWidth="0.9" opacity="0.5" />
        <rect x="204" y="680" width="46" height="70" stroke="currentColor" strokeWidth="0.9" opacity="0.5" />

        {/* On-deck circles */}
        <circle cx="560" cy="900" r="18" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <circle cx="440" cy="900" r="18" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>

      {/* ── Sports equipment silhouettes ────────────────────────────── */}
      <svg
        viewBox="0 0 1200 2400"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-x-0 top-0 h-[2400px] w-full opacity-[0.09]"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* ---- Baseball (top-left) — circle + stitching curves ---- */}
        <g transform="translate(80,140)" stroke="white" strokeWidth="2.2">
          <circle cx="0" cy="0" r="38" />
          <path d="M -14,-36 C -6,-20 -6,20 -14,36"  />
          <path d="M  14,-36 C  6,-20  6,20  14,36"  />
          <path d="M -36,-14 C -20,-6  20,-6  36,-14" />
          <path d="M -36, 14 C -20, 6  20, 6  36, 14" />
        </g>

        {/* ---- Basketball (bottom-left) — circle + seam lines ---- */}
        <g transform="translate(100,1100)" stroke="white" strokeWidth="2.2">
          <circle cx="0" cy="0" r="46" />
          <line x1="-46" y1="0" x2="46" y2="0" />
          <line x1="0" y1="-46" x2="0" y2="46" />
          <path d="M -32,-33 Q 0,-46 32,-33" />
          <path d="M -32, 33 Q 0, 46 32, 33" />
          <path d="M -33,-32 Q -46,0 -33,32" />
          <path d="M  33,-32 Q  46,0  33,32" />
        </g>

        {/* ---- American football (upper-right area) ---- */}
        <g transform="translate(1100,280) rotate(35)" stroke="white" strokeWidth="2.2">
          {/* body */}
          <ellipse cx="0" cy="0" rx="52" ry="28" />
          {/* laces */}
          <line x1="0" y1="-28" x2="0" y2="28" />
          <line x1="-10" y1="-10" x2="10" y2="-10" />
          <line x1="-10" y1="-3"  x2="10" y2="-3"  />
          <line x1="-10" y1="4"   x2="10" y2="4"   />
          <line x1="-10" y1="11"  x2="10" y2="11"  />
        </g>

        {/* ---- Tennis ball (mid-left) ---- */}
        <g transform="translate(60,680)" stroke="white" strokeWidth="2.2">
          <circle cx="0" cy="0" r="34" />
          {/* curved seam */}
          <path d="M -34,0 C -20,-24 20,-24 34,0" />
          <path d="M -34,0 C -20, 24 20, 24 34,0" />
        </g>

        {/* ---- Golf ball (far right mid) ---- */}
        <g transform="translate(1150,820)" stroke="white" strokeWidth="1.8">
          <circle cx="0" cy="0" r="28" />
          {/* dimples hinted with small dashes */}
          {([-14,-6,2,10,-10,6,-4,12,-12,4,0] as number[]).map((dx, i) => {
            const dy = [-18,-14,-12,-16,-4,0,6,4,14,18,10][i]
            return <circle key={i} cx={dx} cy={dy} r="3" stroke="white" strokeWidth="1" opacity="0.7" />
          })}
        </g>

        {/* ---- Tennis racket (lower-right) ---- */}
        <g transform="translate(1080,1400) rotate(-30)" stroke="white" strokeWidth="2">
          {/* frame oval */}
          <ellipse cx="0" cy="-70" rx="44" ry="56" />
          {/* handle */}
          <rect x="-8" y="-14" width="16" height="90" rx="5" />
          {/* strings horizontal */}
          {([-40,-26,-12,2,16,30,44] as number[]).map((y) => (
            <line key={y} x1={-Math.sqrt(Math.max(0,44*44-(y+70)*(y+70)/(56*56)*44*44))} y1={y} x2={Math.sqrt(Math.max(0,44*44-(y+70)*(y+70)/(56*56)*44*44))} y2={y} strokeWidth="1" opacity="0.6" />
          ))}
          {/* strings vertical */}
          {([-36,-20,-4,12,28] as number[]).map((x) => (
            <line key={x} x1={x} y1={-126} x2={x} y2={-14} strokeWidth="1" opacity="0.6" />
          ))}
        </g>

        {/* ---- Golf club (left side, lower) ---- */}
        <g transform="translate(30,1600) rotate(20)" stroke="white" strokeWidth="2.2">
          {/* shaft */}
          <line x1="0" y1="-200" x2="0" y2="80" />
          {/* club head */}
          <path d="M 0,80 Q 40,90 50,70 Q 40,40 0,50 Z" />
        </g>

        {/* ---- Hockey stick (bottom center) ---- */}
        <g transform="translate(540,2200) rotate(-15)" stroke="white" strokeWidth="2.2">
          {/* shaft */}
          <line x1="0" y1="-160" x2="0" y2="60" />
          {/* blade */}
          <path d="M 0,60 Q 80,70 90,50 Q 80,30 0,40" />
        </g>

        {/* ---- Second baseball (right side, lower) ---- */}
        <g transform="translate(1100,1700)" stroke="white" strokeWidth="2">
          <circle cx="0" cy="0" r="30" />
          <path d="M -10,-28 C -4,-16 -4,16 -10,28"  />
          <path d="M  10,-28 C  4,-16  4,16  10,28"  />
        </g>

        {/* ---- Soccer ball (top right, faint) ---- */}
        <g transform="translate(1060,60)" stroke="white" strokeWidth="1.8">
          <circle cx="0" cy="0" r="40" />
          {/* pentagon patches hinted */}
          <polygon points="0,-22 21,-7 13,18 -13,18 -21,-7" strokeWidth="1.5" />
          <line x1="0" y1="-40" x2="0" y2="-22" />
          <line x1="38" y1="-13" x2="21" y2="-7" />
          <line x1="24" y1="34" x2="13" y2="18" />
          <line x1="-24" y1="34" x2="-13" y2="18" />
          <line x1="-38" y1="-13" x2="-21" y2="-7" />
        </g>
      </svg>
    </div>
  )
}
