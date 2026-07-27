"use client"

/**
 * Full-viewport fixed backdrop. Renders a stylised baseball field diagram
 * (foul lines, base paths, pitcher's mound, infield arc) in the lower-right
 * quadrant so it anchors the design without obscuring the content column.
 * No text labels — purely illustrative.
 */
export function GeographicBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* ── Baseball field illustration ─────────────────────────────── */}
      {/*
        Coordinate space: 900 × 900 viewBox.
        Home plate sits at (450, 820). The diamond rotates 45° so foul lines
        run toward upper-left and upper-right corners naturally.
        All strokes use currentColor so they inherit the SVG's color class.
      */}
      <svg
        viewBox="0 0 900 900"
        preserveAspectRatio="xMaxYMax meet"
        className="absolute bottom-0 right-0 h-[700px] w-[700px] text-primary opacity-[0.055] lg:h-[820px] lg:w-[820px]"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Foul lines extending from home plate toward the corners */}
        <line x1="450" y1="820" x2="30"  y2="30"  stroke="currentColor" strokeWidth="1.5" />
        <line x1="450" y1="820" x2="870" y2="30"  stroke="currentColor" strokeWidth="1.5" />

        {/* Base paths — the 90-ft diamond */}
        {/* Home → 1st → 2nd → 3rd → Home */}
        <polygon
          points="450,820 730,540 450,260 170,540"
          stroke="currentColor"
          strokeWidth="2"
        />

        {/* Bases (small squares rotated 45°) */}
        {[
          [730, 540], // 1st base
          [450, 260], // 2nd base
          [170, 540], // 3rd base
        ].map(([cx, cy], i) => (
          <rect
            key={i}
            x={cx - 10}
            y={cy - 10}
            width={20}
            height={20}
            transform={`rotate(45 ${cx} ${cy})`}
            stroke="currentColor"
            strokeWidth="1.5"
          />
        ))}

        {/* Home plate — pentagon */}
        <polygon
          points="450,840 465,825 465,808 435,808 435,825"
          stroke="currentColor"
          strokeWidth="1.5"
        />

        {/* Pitcher's mound circle */}
        <circle cx="450" cy="540" r="22" stroke="currentColor" strokeWidth="1.5" />

        {/* Infield arc (grass line) */}
        <path
          d="M 210,570 Q 450,330 690,570"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="6 5"
        />

        {/* Outfield warning-track arc */}
        <path
          d="M 80,680 Q 450,100 820,680"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="8 6"
        />

        {/* Second (outer) outfield arc */}
        <path
          d="M 55,720 Q 450,60 845,720"
          stroke="currentColor"
          strokeWidth="0.7"
          strokeDasharray="5 7"
        />

        {/* Batter's boxes (left & right of home) */}
        <rect x="415" y="808" width="20" height="32" stroke="currentColor" strokeWidth="1" />
        <rect x="465" y="808" width="20" height="32" stroke="currentColor" strokeWidth="1" />

        {/* Coaching boxes — faint rectangles near 1st and 3rd */}
        <rect x="680" y="590" width="40" height="60" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
        <rect x="180" y="590" width="40" height="60" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      </svg>

      {/* ── Horizontal scan line grid (data-terminal aesthetic) ──────── */}
      <div
        className="absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 28px, currentColor 28px, currentColor 29px)",
        }}
      />
    </div>
  )
}
