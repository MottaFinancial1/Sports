'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, isTextUIPart } from 'ai'
import ReactMarkdown from 'react-markdown'
import { Bot, Send, Sparkles, X } from 'lucide-react'

const SUGGESTED = [
  'Any big trades today?',
  'F1 standings after last race?',
  'Red Sox injury report?',
  'Bills next game + broadcast?',
  'PGA leaderboard right now?',
  'NBA offseason moves this week?',
]

export function AskSlate() {
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState('')

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/ask-slate' }),
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    sendMessage({ text })
  }

  const handleSuggestion = (q: string) => {
    setInput(q)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleClear = () => setMessages([])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      handleSend()
    }
  }

  const hasMessages = messages.length > 0

  return (
    <section className="flex h-full flex-col">
      {/* Section header */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-primary">
            Ask Ball Knowledge
          </h2>
        </div>
        {hasMessages ? (
          <button
            type="button"
            onClick={handleClear}
            className="ml-auto flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
            aria-label="Clear conversation"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        ) : (
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        )}
      </div>

      {/* Main panel */}
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm">

        {/* Top accent bar */}
        <div className="flex h-1 w-full overflow-hidden rounded-t-xl">
          <div className="h-full w-full bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
        </div>

        {/* Message thread */}
        <div className="flex max-h-[460px] min-h-[120px] flex-col gap-3 overflow-y-auto p-4 sm:p-5">
          {!hasMessages ? (
            <div className="flex flex-col gap-4">
              {/* Empty state */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-foreground">Sports Intelligence, live.</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Scores, schedules, stats, injuries, trades — sourced live from ESPN, The Athletic, and wire services. Ask anything.
                  </p>
                </div>
              </div>
              {/* Suggested questions */}
              <div className="flex flex-wrap gap-2">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSuggestion(q)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const text = msg.parts
                  .filter(isTextUIPart)
                  .map((p) => p.text)
                  .join('')

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                      </div>
                    ) : null}
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary font-medium text-primary-foreground'
                          : 'border border-border bg-card text-foreground shadow-sm'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        text
                      ) : (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="mb-1.5 last:mb-0">{children}</p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-bold text-foreground">{children}</strong>
                            ),
                            ul: ({ children }) => (
                              <ul className="mb-1.5 ml-4 list-disc space-y-0.5">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="mb-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>
                            ),
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline underline-offset-2 hover:opacity-80"
                              >
                                {children}
                              </a>
                            ),
                            code: ({ children }) => (
                              <code className="rounded bg-secondary px-1 py-0.5 font-mono text-xs">
                                {children}
                              </code>
                            ),
                          }}
                        >
                          {text}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                )
              })}

              {isLoading && (
                <div className="flex justify-start gap-2.5">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-sm">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-border bg-background/80 p-3 backdrop-blur sm:p-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask about any game, player, trade, or stat..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={isLoading}
              className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              aria-label="Ask Ball Knowledge a question"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
