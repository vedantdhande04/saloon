import { useEffect, useRef, useState } from 'react'

function Bubble({ message, mine }) {
  return (
    <div
      className={`animate-fade-up max-w-[85%] ${mine ? 'self-end' : 'self-start'}`}
    >
      <div
        className={`rounded-2xl px-3 py-2 text-[13px] leading-snug shadow-sm ${
          mine
            ? 'rounded-br-md bg-[var(--bubble-me)] text-[var(--ink-dark)]'
            : 'rounded-bl-md bg-[var(--bubble-them)] text-[var(--ink-dark)]'
        }`}
      >
        {!mine ? (
          <div className="mb-0.5 text-[11px] font-semibold text-[#b45309]">
            {message.name}
          </div>
        ) : null}
        <div className="whitespace-pre-wrap break-words">{message.text}</div>
      </div>
    </div>
  )
}

export function Chat({
  joined,
  name,
  messages,
  showRespectNote,
  onSend,
  onRequestJoin,
}) {
  const [text, setText] = useState('')
  const [coolingDown, setCoolingDown] = useState(false)
  const endRef = useRef(null)
  const scrollRef = useRef(null)
  const stickToBottom = useRef(true)

  useEffect(() => {
    if (!stickToBottom.current) return
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, showRespectNote])

  const overLimit = text.length > 255

  function updateText(value) {
    setText(value)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!joined) {
      onRequestJoin()
      return
    }
    if (coolingDown || overLimit) return

    const value = text.trim()
    if (!value) return

    setText('')
    stickToBottom.current = true
    const res = await onSend(value)

    if (res?.ok === false && res?.error === 'Slow down') {
      setCoolingDown(true)
      window.setTimeout(() => setCoolingDown(false), 1000)
      return
    }

    setCoolingDown(true)
    window.setTimeout(() => setCoolingDown(false), 1000)
  }

  return (
    <section className="pointer-events-none absolute inset-x-0 bottom-[6.75rem] z-20 mx-auto flex h-[min(42vh,360px)] w-full max-w-[420px] flex-col justify-end px-4 sm:bottom-32">
      <div className="chat-panel relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="chat-scroll pointer-events-auto absolute inset-0 flex flex-col overflow-y-auto overscroll-contain pt-8 pb-2"
          onScroll={() => {
            const el = scrollRef.current
            if (!el) return
            const distance = el.scrollHeight - el.scrollTop - el.clientHeight
            stickToBottom.current = distance < 48
          }}
        >
          <div className="mt-auto flex flex-col gap-2">
            {messages.map((message) => (
              <Bubble
                key={message.id}
                message={message}
                mine={message.name === name}
              />
            ))}

            {showRespectNote ? (
              <div className="animate-fade-up self-center rounded-full bg-black/35 px-3 py-1.5 text-center text-[11px] text-white/90">
                Be respectful. Do not harass anyone.
              </div>
            ) : null}

            <div ref={endRef} />
          </div>
        </div>
      </div>

      <div className="pointer-events-auto mt-2">
        <form
          onSubmit={handleSubmit}
          className={`flex items-center gap-2 rounded-full border bg-black/30 px-3 py-2 backdrop-blur-md transition-colors ${
            overLimit
              ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.45)]'
              : 'border-white/20'
          }`}
        >
          <input
            value={text}
            onChange={(e) => updateText(e.target.value)}
            onPaste={(e) => {
              // Let the paste land, then onChange picks up the full value
              // (including over-limit paste) so the red state still shows.
              const pasted = e.clipboardData?.getData('text') ?? ''
              if (!pasted) return
              e.preventDefault()
              const el = e.currentTarget
              const start = el.selectionStart ?? text.length
              const end = el.selectionEnd ?? text.length
              updateText(text.slice(0, start) + pasted + text.slice(end))
            }}
            onFocus={() => {
              if (!joined) onRequestJoin()
            }}
            placeholder={
              coolingDown
                ? 'Wait a second…'
                : joined
                  ? 'बातचीत…'
                  : 'Enter your name to chat…'
            }
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/55"
          />
          <button
            type="submit"
            disabled={coolingDown || overLimit}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--btn-ink)] transition hover:bg-white/90 disabled:opacity-50"
          >
            Send
          </button>
        </form>

        {overLimit ? (
          <p className="mt-1.5 px-1 text-center text-[11px] font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
            character limit exceeded, thoda kam baat karo
          </p>
        ) : null}
      </div>
    </section>
  )
}
