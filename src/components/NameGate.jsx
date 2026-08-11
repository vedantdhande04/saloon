import { useState } from 'react'

export function NameGate({ open, onJoin }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    if (value.trim().toLowerCase() === 'codvyn') {
      setBusy(false)
      setError('That name is reserved')
      return
    }

    const res = await onJoin(value)
    setBusy(false)
    if (!res?.ok) {
      if (res?.error === 'That name is reserved') setError(res.error)
      else if (res?.error === 'Banned') setError('You are temporarily banned')
      else setError('Enter a name to join the chat')
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center px-4 pb-36 sm:items-center sm:pb-0">
      <form
        onSubmit={handleSubmit}
        className="animate-soft-in w-full max-w-sm rounded-2xl border border-white/20 bg-black/35 px-5 py-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md"
      >
        <p className="font-display text-2xl leading-none">सैलून चैट</p>
        <p className="mt-2 text-sm text-white/75">Enter your name to join the conversation.</p>

        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={24}
          placeholder="Your name"
          className="mt-4 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm outline-none placeholder:text-white/40 focus:border-white/50"
        />

        {error ? <p className="mt-2 text-xs text-white/80">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-[var(--btn-ink)] transition hover:bg-white/90 disabled:opacity-60"
        >
          {busy ? 'Joining…' : 'Join chat'}
        </button>
      </form>
    </div>
  )
}
