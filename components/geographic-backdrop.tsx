"use client"

/**
 * SportsEquipmentBackdrop — purely decorative background layer.
 * Renders faint SVG outlines of sports equipment scattered across the page.
 * No text, no labels — only stroked paths/shapes at very low opacity.
 */
export function GeographicBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block"
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        {/* ── Baseball (top-left) ── */}
        <g transform="translate(60, 90) rotate(-15)" opacity="0.07" stroke="currentColor" strokeWidth="1.5">
          {/* ball */}
          <circle cx="40" cy="40" r="38" />
          {/* left stitch arc */}
          <path d="M18 14 C10 28, 10 52, 18 66" strokeLinecap="round" />
          <path d="M16 18 C22 24, 22 32, 16 38" strokeLinecap="round" />
          <path d="M16 42 C22 48, 22 56, 16 62" strokeLinecap="round" />
          {/* right stitch arc */}
          <path d="M62 14 C70 28, 70 52, 62 66" strokeLinecap="round" />
          <path d="M64 18 C58 24, 58 32, 64 38" strokeLinecap="round" />
          <path d="M64 42 C58 48, 58 56, 64 62" strokeLinecap="round" />
        </g>

        {/* ── Baseball bat (top-left area) ── */}
        <g transform="translate(130, 30) rotate(35)" opacity="0.06" stroke="currentColor" strokeWidth="1.5">
          <path d="M10 140 C10 140, 8 80, 12 40 C14 20, 22 4, 28 2 C34 0, 42 0, 46 4 C52 10, 50 22, 44 28 C38 34, 28 34, 22 30 C16 26, 12 20, 12 40" strokeLinecap="round" strokeLinejoin="round" />
          {/* knob */}
          <ellipse cx="11" cy="144" rx="7" ry="5" />
        </g>

        {/* ── Soccer ball (top-right) ── */}
        <g transform="translate(1260, 60) rotate(10)" opacity="0.065" stroke="currentColor" strokeWidth="1.4">
          <circle cx="46" cy="46" r="44" />
          {/* pentagon + hex panel pattern */}
          <polygon points="46,6 66,18 66,42 46,54 26,42 26,18" />
          <line x1="46" y1="6" x2="46" y2="2" />
          <line x1="66" y1="18" x2="83" y2="10" />
          <line x1="66" y1="42" x2="83" y2="50" />
          <line x1="46" y1="54" x2="46" y2="72" />
          <line x1="26" y1="42" x2="9" y2="50" />
          <line x1="26" y1="18" x2="9" y2="10" />
          {/* lower pentagons */}
          <polygon points="46,72 60,62 68,70 60,82 32,82 24,70 32,62" />
          <polygon points="83,50 90,60 84,72 72,68 68,54" />
          <polygon points="9,50 2,60 8,72 20,68 24,54" />
        </g>

        {/* ── F1 / Steering wheel (center-right) ── */}
        <g transform="translate(1200, 340) rotate(-8)" opacity="0.06" stroke="currentColor" strokeWidth="1.5">
          {/* outer wheel */}
          <circle cx="50" cy="50" r="46" />
          {/* inner ring */}
          <circle cx="50" cy="50" r="20" />
          {/* spokes */}
          <line x1="50" y1="4" x2="50" y2="30" />
          <line x1="96" y1="50" x2="70" y2="50" />
          <line x1="50" y1="96" x2="50" y2="70" />
          <line x1="4" y1="50" x2="30" y2="50" />
          {/* flat bottom section (F1 wheel style) */}
          <path d="M20 78 Q50 95 80 78" strokeLinecap="round" />
          <line x1="20" y1="78" x2="28" y2="70" />
          <line x1="80" y1="78" x2="72" y2="70" />
        </g>

        {/* ── Golf ball (bottom-left) ── */}
        <g transform="translate(50, 680) rotate(5)" opacity="0.065" stroke="currentColor" strokeWidth="1.2">
          <circle cx="36" cy="36" r="34" />
          {/* dimple grid */}
          {[10,18,26,34,42,50,58].map((y) =>
            [10,18,26,34,42,50,58].map((x) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" />
            ))
          )}
        </g>

        {/* ── Golf club (bottom-left area) ── */}
        <g transform="translate(110, 560) rotate(-20)" opacity="0.055" stroke="currentColor" strokeWidth="1.4">
          {/* shaft */}
          <line x1="20" y1="10" x2="20" y2="170" strokeLinecap="round" />
          {/* grip */}
          <rect x="16" y="4" width="8" height="40" rx="4" />
          {/* club head */}
          <path d="M4 170 Q4 186, 20 188 Q40 190, 46 180 Q50 170, 36 165 Z" strokeLinejoin="round" />
        </g>

        {/* ── Tennis ball (bottom-right) ── */}
        <g transform="translate(1300, 740) rotate(25)" opacity="0.07" stroke="currentColor" strokeWidth="1.4">
          <circle cx="36" cy="36" r="34" />
          {/* seam curves */}
          <path d="M4 22 Q20 36, 4 50" strokeLinecap="round" />
          <path d="M68 22 Q52 36, 68 50" strokeLinecap="round" />
        </g>

        {/* ── Tennis racket (bottom-right area) ── */}
        <g transform="translate(1220, 640) rotate(30)" opacity="0.055" stroke="currentColor" strokeWidth="1.3">
          {/* head frame */}
          <ellipse cx="38" cy="38" rx="32" ry="36" />
          {/* handle */}
          <rect x="34" y="70" width="8" height="60" rx="4" />
          {/* strings – vertical */}
          <line x1="20" y1="8" x2="20" y2="68" /><line x1="28" y1="5" x2="28" y2="71" />
          <line x1="36" y1="3" x2="36" y2="73" /><line x1="44" y1="3" x2="44" y2="73" />
          <line x1="52" y1="5" x2="52" y2="71" /><line x1="60" y1="8" x2="60" y2="68" />
          {/* strings – horizontal */}
          <line x1="8" y1="16" x2="68" y2="16" /><line x1="6" y1="24" x2="70" y2="24" />
          <line x1="6" y1="32" x2="70" y2="32" /><line x1="6" y1="40" x2="70" y2="40" />
          <line x1="6" y1="48" x2="70" y2="48" /><line x1="8" y1="56" x2="68" y2="56" />
          <line x1="12" y1="64" x2="64" y2="64" />
        </g>

        {/* ── Basketball (center-left, mid page) ── */}
        <g transform="translate(30, 380) rotate(-10)" opacity="0.065" stroke="currentColor" strokeWidth="1.5">
          <circle cx="44" cy="44" r="42" />
          {/* seam lines */}
          <path d="M44 2 Q80 30, 80 58 Q80 75, 44 86" strokeLinecap="round" />
          <path d="M44 2 Q8 30, 8 58 Q8 75, 44 86" strokeLinecap="round" />
          <line x1="2" y1="44" x2="86" y2="44" />
        </g>

        {/* ── American football (center, mid-high) ── */}
        <g transform="translate(640, 40) rotate(20)" opacity="0.055" stroke="currentColor" strokeWidth="1.4">
          {/* ball */}
          <path d="M8 40 Q30 4, 72 4 Q96 4, 96 40 Q96 76, 72 76 Q30 76, 8 40 Z" strokeLinejoin="round" />
          {/* laces */}
          <line x1="52" y1="24" x2="52" y2="56" />
          <line x1="44" y1="28" x2="60" y2="28" /><line x1="44" y1="36" x2="60" y2="36" />
          <line x1="44" y1="44" x2="60" y2="44" /><line x1="44" y1="52" x2="60" y2="52" />
        </g>

        {/* ── F1 car silhouette (upper-center) ── */}
        <g transform="translate(680, 800) rotate(0)" opacity="0.055" stroke="currentColor" strokeWidth="1.3">
          {/* body */}
          <path d="M10 30 L30 20 L60 16 L120 16 L150 20 L170 30 L150 38 L120 40 L60 40 L30 38 Z" strokeLinejoin="round" />
          {/* front wing */}
          <path d="M150 34 L190 30 L190 38 L150 38" strokeLinejoin="round" />
          {/* rear wing */}
          <path d="M10 28 L-10 24 L-10 36 L10 36" strokeLinejoin="round" />
          {/* wheels */}
          <ellipse cx="40" cy="46" rx="12" ry="10" />
          <ellipse cx="140" cy="46" rx="12" ry="10" />
          <ellipse cx="40" cy="24" rx="10" ry="8" />
          <ellipse cx="140" cy="24" rx="10" ry="8" />
          {/* cockpit */}
          <path d="M75 16 Q90 6, 105 16" strokeLinecap="round" />
        </g>

        {/* ── Baseball diamond outline (right, mid) ── */}
        <g transform="translate(1160, 460) rotate(0)" opacity="0.05" stroke="currentColor" strokeWidth="1.2">
          <polygon points="80,4 156,80 80,156 4,80" />
          {/* pitcher mound */}
          <circle cx="80" cy="80" r="8" />
          {/* bases */}
          <rect x="74" y="-2" width="12" height="12" transform="rotate(45, 80, 4)" />
          <rect x="150" y="74" width="12" height="12" transform="rotate(45, 156, 80)" />
          <rect x="74" y="150" width="12" height="12" transform="rotate(45, 80, 156)" />
          <rect x="-2" y="74" width="12" height="12" transform="rotate(45, 4, 80)" />
        </g>

        {/* ── Subtle grid lines (very faint) ── */}
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" strokeWidth="0.5" opacity="0.025" />
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="currentColor" strokeWidth="0.5" opacity="0.025" />
      </svg>
    </div>
  )
}
