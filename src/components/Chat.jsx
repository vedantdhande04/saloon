import { Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

function Bubble({ message, mine }) {
  const isCodvyn = String(message.name || '').trim().toLowerCase() === 'codvyn'

  return (
    <div
      className={`animate-fade-up max-w-[85%] ${mine && !isCodvyn ? 'self-end' : 'self-start'}`}
    >
      <div
        className={`rounded-2xl px-3 py-2 text-[13px] leading-snug shadow-sm ${
          isCodvyn
            ? 'rounded-bl-md border border-[var(--bubble-codvyn-border)] bg-[var(--bubble-codvyn)] text-[var(--ink-dark)]'
            : mine
              ? 'rounded-br-md bg-[var(--bubble-me)] text-[var(--ink-dark)]'
              : 'rounded-bl-md bg-[var(--bubble-them)] text-[var(--ink-dark)]'
        }`}
      >
        {isCodvyn || !mine ? (
          <div
            className={`mb-0.5 text-[11px] font-semibold ${
              isCodvyn ? 'text-[var(--bubble-codvyn-name)]' : 'text-[#b45309]'
            }`}
          >
            {message.name}
          </div>
        ) : null}
        <div className="whitespace-pre-wrap break-words">{message.text}</div>
      </div>
    </div>
  )
}

function formatWait(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function Chat({
  joined,
  name,
  messages,
  showRespectNote,
  bannedUntil,
  renameAvailableAt,
  onSend,
  onRequestJoin,
  onRename,
}) {
  const [text, setText] = useState('')
  const [coolingDown, setCoolingDown] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [changingName, setChangingName] = useState(false)
  const [nextName, setNextName] = useState('')
  const [renameError, setRenameError] = useState('')
  const [renameBusy, setRenameBusy] = useState(false)
  const [now, setNow] = useState(Date.now())
  const endRef = useRef(null)
  const scrollRef = useRef(null)
  const stickToBottom = useRef(true)
  const settingsRef = useRef(null)

  useEffect(() => {
    if (!stickToBottom.current) return
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, showRespectNote])

  useEffect(() => {
    if (!settingsOpen) return
    function onDocClick(e) {
      if (!settingsRef.current?.contains(e.target)) {
        setSettingsOpen(false)
        setChangingName(false)
        setRenameError('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [settingsOpen])

  useEffect(() => {
    if (!renameAvailableAt || renameAvailableAt <= Date.now()) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [renameAvailableAt])

  const overLimit = text.length > 255
  const banned = bannedUntil > Date.now()
  const renameLocked = renameAvailableAt > now
  const renameWait = renameLocked ? renameAvailableAt - now : 0

  function updateText(value) {
    setText(value)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (banned) return
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

  async function handleRename(e) {
    e.preventDefault()
    if (!joined || renameBusy || renameLocked) return

    const value = nextName.trim()
    if (!value) {
      setRenameError('Enter a name')
      return
    }
    if (value.toLowerCase() === 'codvyn') {
      setRenameError('That name is reserved')
      return
    }

    setRenameBusy(true)
    setRenameError('')
    const res = await onRename(value)
    setRenameBusy(false)

    if (res?.ok) {
      setChangingName(false)
      setNextName('')
      setSettingsOpen(false)
      return
    }

    if (res?.error === 'Rename cooldown') {
      setRenameError(`Wait ${formatWait((res.renameAvailableAt || 0) - Date.now())}`)
    } else if (res?.error === 'That name is reserved') {
      setRenameError(res.error)
    } else if (res?.error === 'Same name') {
      setRenameError('That is already your name')
    } else {
      setRenameError(res?.error || 'Could not change name')
    }
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

            {banned ? (
              <div className="animate-fade-up self-center rounded-full bg-black/45 px-3 py-1.5 text-center text-[11px] text-white/90">
                You are temporarily banned from chat.
              </div>
            ) : null}

            <div ref={endRef} />
          </div>
        </div>
      </div>

      <div className="pointer-events-auto relative mt-2" ref={settingsRef}>
        {settingsOpen ? (
          <div className="animate-soft-in absolute bottom-[calc(100%+10px)] left-0 z-30 w-[min(100%,280px)] rounded-2xl border border-white/20 bg-black/55 p-3 text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
            {!joined ? (
              <p className="text-sm text-white/80">Join chat first to manage your name.</p>
            ) : (
              <>
                <p className="text-sm text-white/80">
                  You are chatting as{' '}
                  <span className="font-semibold text-white">‘{name}’</span>
                </p>

                {!changingName ? (
                  <button
                    type="button"
                    onClick={() => {
                      setChangingName(true)
                      setNextName(name)
                      setRenameError('')
                    }}
                    className="mt-3 w-full rounded-xl bg-white/15 px-3 py-2 text-sm font-medium transition hover:bg-white/25"
                  >
                    Change your name
                  </button>
                ) : (
                  <form onSubmit={handleRename} className="mt-3 space-y-2">
                    <input
                      value={nextName}
                      onChange={(e) => setNextName(e.target.value)}
                      maxLength={24}
                      disabled={renameLocked || renameBusy}
                      placeholder="New name"
                      className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-white/50 disabled:opacity-60"
                      autoFocus
                    />
                    {renameLocked ? (
                      <p className="text-[11px] text-white/75">
                        You can change again in {formatWait(renameWait)}
                      </p>
                    ) : null}
                    {renameError ? (
                      <p className="text-[11px] text-red-200">{renameError}</p>
                    ) : null}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setChangingName(false)
                          setRenameError('')
                        }}
                        className="flex-1 rounded-xl border border-white/20 px-3 py-2 text-xs font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={renameLocked || renameBusy}
                        className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[var(--btn-ink)] disabled:opacity-50"
                      >
                        {renameBusy ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        ) : null}

        <div className="flex items-stretch gap-2">
          <button
            type="button"
            aria-label="Chat settings"
            onClick={() => {
              setSettingsOpen((open) => !open)
              setChangingName(false)
              setRenameError('')
            }}
            className="flex aspect-square h-auto w-[42px] shrink-0 items-center justify-center self-stretch rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md transition hover:bg-black/45"
          >
            <Settings size={18} strokeWidth={2} />
          </button>

          <form
            onSubmit={handleSubmit}
            className={`flex min-w-0 flex-1 items-center gap-2 rounded-full border bg-black/30 px-3 py-2 backdrop-blur-md transition-colors ${
              overLimit
                ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.45)]'
                : 'border-white/20'
            }`}
          >
            <input
              value={text}
              onChange={(e) => updateText(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData?.getData('text') ?? ''
                if (!pasted) return
                e.preventDefault()
                const el = e.currentTarget
                const start = el.selectionStart ?? text.length
                const end = el.selectionEnd ?? text.length
                updateText(text.slice(0, start) + pasted + text.slice(end))
              }}
              onFocus={() => {
                if (!joined && !banned) onRequestJoin()
              }}
              disabled={banned}
              placeholder={
                banned
                  ? 'Banned from chat…'
                  : coolingDown
                    ? 'Wait a second…'
                    : joined
                      ? 'बातचीत…'
                      : 'Enter your name to chat…'
              }
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/55 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={coolingDown || overLimit || banned}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--btn-ink)] transition hover:bg-white/90 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>

        {overLimit ? (
          <p className="mt-1.5 px-1 text-center text-[11px] font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
            character limit exceeded, thoda kam baat karo
          </p>
        ) : null}
      </div>
    </section>
  )
}
