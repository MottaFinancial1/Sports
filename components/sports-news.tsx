"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Newspaper } from "lucide-react"
import type { NewsArticle } from "@/lib/espn"

function TimeAgo({ iso }: { iso: string }) {
  const [label, setLabel] = useState<string>("")

  useEffect(() => {
    if (!iso) return
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.max(1, Math.round(diffMs / 60_000))
    if (mins < 60) {
      setLabel(`${mins}m ago`)
    } else if (mins < 60 * 24) {
      setLabel(`${Math.round(mins / 60)}h ago`)
    } else {
      setLabel(new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" }))
    }
  }, [iso])

  return <span>{label}</span>
}

export function SportsNews({ articles }: { articles: NewsArticle[] }) {
  if (articles.length === 0) return null

  const [lead, ...rest] = articles

  return (
    <section className="flex flex-col">
      <h2 className="mb-3 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.22em] text-primary">
        <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
        Biggest News in Sports
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </h2>
      <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Lead story */}
        <a
          href={lead.link}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex min-h-56 flex-col justify-end overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {lead.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lead.image || "/placeholder.svg"}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" aria-hidden="true" />
          <div className="relative flex flex-col gap-1.5 p-4">
            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-white/80">
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 backdrop-blur-sm">{lead.source}</span>
              <TimeAgo iso={lead.published} />
            </div>
            <p className="text-pretty text-base font-bold leading-snug text-white sm:text-lg">{lead.headline}</p>
            {lead.description ? (
              <p className="line-clamp-2 text-sm leading-relaxed text-white/80">{lead.description}</p>
            ) : null}
          </div>
        </a>

        {/* Secondary stories */}
        <ul className="flex flex-col gap-2">
          {rest.slice(0, 5).map((a) => (
            <li key={a.id}>
              <a
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:border-primary/30 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{a.headline}</p>
                  <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="font-bold text-primary">{a.source}</span>
                    <TimeAgo iso={a.published} />
                  </p>
                </div>
                <ExternalLink
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary"
                  aria-hidden="true"
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
