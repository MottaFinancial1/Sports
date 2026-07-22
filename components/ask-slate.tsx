'use client'

import { useRef, useState } from 'react'
import { MessageCircle, Send, Sparkles } from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'assistant'
  text: string
  loading?: boolean
}

export function AskSlate() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: input,
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/ask-slate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input }),
      })
      const data = (await res.json()) as { answer?: string; error?: string }
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: data.answer || data.error || 'No answer',
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: 'Failed to get answer. Please try again.',
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <section className="mb-10">
      <h2 className="mb-4 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-primary">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Ask Slate
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </h2>

      <div
        ref={containerRef}
        className="flex flex-col gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4"
      >
        {/* Messages */}
        {messages.length > 0 ? (
          <div className="mb-4 flex max-h-48 flex-col gap-2 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 text-sm ${
                  msg.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.type === 'assistant' ? (
                  <MessageCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                ) : null}
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 ${
                    msg.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-card text-foreground'
                  }`}
                >
                  {msg.text}
                  {msg.loading ? <span className="ml-1 animate-pulse">…</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-3 text-xs text-muted-foreground">
            Ask about schedules, matchups, and broadcasts across all your sports.
          </p>
        )}

        {/* Input */}
        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Are the Red Sox at home next weekend?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:border-destructive focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex items-center justify-center rounded-lg bg-destructive px-3 py-2 font-mono text-xs font-bold uppercase text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </section>
  )
}
