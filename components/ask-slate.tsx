'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, isTextUIPart } from 'ai'
import ReactMarkdown from 'react-markdown'
import { Globe, MessageCircle, Send, Sparkles, X } from 'lucide-react'

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

  // Auto-scroll to the latest message.
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
    <section className="mb-10">
      <h2 className="mb-4 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-primary">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Ask Ball Knowledge
        {hasMessages ? (
          <button
            type="button"
            onClick={handleClear}
            className="ml-auto flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear conversation"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        ) : (
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        )}
      </h2>

      <div className="relative flex flex-col overflow-hidden rounded-lg border border-destructive/30 bg-card shadow-[inset_3px_0_0_var(--color-destructive)]">
        {/* Message thread */}
        <div className="flex max-h-[480px] min-h-[120px] flex-col gap-3 overflow-y-auto p-4 sm:p-5">
          {!hasMessages ? (
            /* Empty state */
            <div className="flex flex-col gap-3">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">
                  Intelligence desk
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs leading-relaxed text-muted-foreground">
                  <Globe className="h-3 w-3 shrink-0" aria-hidden="true" />
                  Scores, schedules, stats, injuries, trades — sourced live from ESPN, The Athletic,
                  X, Reddit, wire services, and more.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSuggestion(q)}
                    className="rounded-sm border border-border bg-card px-2.5 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-destructive/50 hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Conversation */
            <>
              {messages.map((msg) => {
                // Extract plain text from the UIMessage parts array.
                const text = msg.parts
                  .filter(isTextUIPart)
                  .map((p) => p.text)
                  .join('')

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' ? (
                      <MessageCircle
                        className="mt-1 h-4 w-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary font-mono text-primary-foreground'
                          : 'border border-border bg-muted/40 text-foreground'
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
                              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
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

              {/* Typing indicator while the response is incoming */}
              {isLoading && (
                <div className="flex justify-start gap-2">
                  <MessageCircle
                    className="mt-1 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-3 py-2">
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
        <div className="border-t border-border bg-card/80 p-3 sm:p-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Any big trades today? Who leads F1? Red Sox next game?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:border-destructive focus:outline-none disabled:opacity-50"
              aria-label="Ask Ball Knowledge a question"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="flex items-center justify-center rounded-lg bg-destructive px-3 py-2 font-mono text-xs font-bold uppercase text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
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
