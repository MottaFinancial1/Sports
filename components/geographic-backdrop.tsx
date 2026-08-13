"use client"

/**
 * Bright tech-platform backdrop.
 * A fixed full-bleed layer with:
 * 1. A fine square grid — data-terminal / sports analytics HUD feel.
 * 2. A soft radial blue glow from the top-right — feels like a monitor backlight.
 * 3. Faint horizontal scan lines for a broadcast overlay texture.
 * 4. Minimal location pins — restrained, purely decorative.
 */
export function GeographicBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Primary radial — electric blue glow, top-right */}
      <div
        className="absolute -right-32 -top-32 h-[60vh] w-[60vw]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 100% 0%, oklch(0.52 0.24 262 / 0.07) 0%, oklch(0.52 0.24 262 / 0.03) 45%, transparent 70%)",
        }}
      />

      {/* Secondary — faint sky blue pool, bottom-left */}
      <div
        className="absolute -bottom-24 -left-24 h-[45vh] w-[50vw]"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 0% 100%, oklch(0.65 0.18 210 / 0.05) 0%, transparent 70%)",
        }}
      />

      {/* Fine square grid — data-terminal texture */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.52 0.24 262 / 0.045) 1px, transparent 1px), linear-gradient(90deg, oklch(0.52 0.24 262 / 0.045) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Top-left corner bracket — HUD motif */}
      <div className="absolute left-6 top-6 hidden lg:block">
        <div className="h-6 w-6 border-l-2 border-t-2 border-primary/20" />
      </div>

      {/* Top-right corner bracket */}
      <div className="absolute right-6 top-6 hidden lg:block">
        <div className="h-6 w-6 border-r-2 border-t-2 border-primary/20" />
      </div>

      {/* Bottom-left corner bracket */}
      <div className="absolute bottom-6 left-6 hidden lg:block">
        <div className="h-6 w-6 border-b-2 border-l-2 border-primary/20" />
      </div>

      {/* Bottom-right corner bracket */}
      <div className="absolute bottom-6 right-6 hidden lg:block">
        <div className="h-6 w-6 border-b-2 border-r-2 border-primary/20" />
      </div>

      {/* Platform label — bottom left */}
      <div className="absolute bottom-8 left-10 hidden lg:block">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-primary/20">
          Ball Knowledge · Sports Intelligence Platform
        </span>
      </div>
    </div>
  )
}
