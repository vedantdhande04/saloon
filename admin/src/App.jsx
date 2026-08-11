import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SECRET_KEY = 'saloon-admin-secret'

function formatUntil(until) {
  if (!until) return '—'
  return new Date(until).toLocaleString()
}

function Login({ onAuth, error, busy, connected, socketUrl, onRetry }) {
  const [secret, setSecret] = useState(() => sessionStorage.getItem(SECRET_KEY) || '')

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onAuth(secret.trim())
        }}
        className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6"
      >
        <h1 className="text-2xl font-bold">Saloon Admin</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Local-only panel. Enter <code>ADMIN_SECRET</code> to moderate live chat.
        </p>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Server:{' '}
          <span className={connected ? 'text-emerald-400' : 'text-[var(--danger)]'}>
            {connected ? 'connected' : 'not connected'}
          </span>
          <br />
          <span className="break-all opacity-80">{socketUrl}</span>
        </p>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="ADMIN_SECRET"
          className="mt-5 w-full rounded-xl border border-[var(--line)] bg-black/40 px-3 py-2.5 outline-none focus:border-[var(--accent)]"
          autoFocus
        />
        {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={busy || !secret.trim() || !connected}
            className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-2.5 font-semibold text-black disabled:opacity-50"
          >
            {busy ? 'Unlocking…' : 'Unlock admin'}
          </button>
          {!connected ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm hover:bg-white/5"
            >
              Retry
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}

export default function App() {
  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [authed, setAuthed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [users, setUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [bans, setBans] = useState([])
  const [composer, setComposer] = useState('')
  const [renameDrafts, setRenameDrafts] = useState({})
  const [connKey, setConnKey] = useState(0)

  // Direct to Railway (CORS allows localhost). Avoid brittle WS proxy.
  const socketUrl =
    import.meta.env.VITE_SOCKET_URL ||
    'https://saloon-production-9871.up.railway.app'
  const displayUrl = socketUrl

  useEffect(() => {
    const socket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      timeout: 15000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      setError('')
      const saved = sessionStorage.getItem(SECRET_KEY)
      if (!saved) return
      socket.emit('admin:auth', saved, (res) => {
        if (res?.ok) {
          setAuthed(true)
          setUsers(res.users || [])
          setMessages(res.messages || [])
          setBans(res.bans || [])
        } else {
          sessionStorage.removeItem(SECRET_KEY)
        }
      })
    })
    socket.on('connect_error', (err) => {
      setConnected(false)
      setError(err?.message || 'Cannot reach chat server')
    })
    socket.on('disconnect', () => {
      setConnected(false)
      setAuthed(false)
    })
    socket.on('admin:users', ({ users: next }) => setUsers(next || []))
    socket.on('admin:messages', ({ messages: next }) => setMessages(next || []))
    socket.on('admin:bans', ({ bans: next }) => setBans(next || []))
    socket.on('chat:message', (message) => {
      setMessages((prev) => [...prev.slice(-99), message])
    })
    socket.on('chat:deleted', ({ id }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [socketUrl, connKey])

  function auth(secret) {
    if (!socketRef.current?.connected) {
      setError('Cannot reach chat server. Click Retry or check Railway / admin/.env')
      return
    }
    setBusy(true)
    setError('')
    socketRef.current.emit('admin:auth', secret, (res) => {
      setBusy(false)
      if (res?.ok) {
        sessionStorage.setItem(SECRET_KEY, secret)
        setAuthed(true)
        setUsers(res.users || [])
        setMessages(res.messages || [])
        setBans(res.bans || [])
      } else {
        setError(res?.error || 'Auth failed')
      }
    })
  }

  function logout() {
    sessionStorage.removeItem(SECRET_KEY)
    setAuthed(false)
    socketRef.current?.disconnect()
    window.location.reload()
  }

  function retryConnect() {
    setError('')
    setConnected(false)
    setAuthed(false)
    socketRef.current?.disconnect()
    setConnKey((k) => k + 1)
  }

  function renameUser(socketId) {
    const name = String(renameDrafts[socketId] || '').trim()
    if (!name) return
    socketRef.current?.emit('admin:rename', { socketId, name }, (res) => {
      if (!res?.ok) window.alert(res?.error || 'Rename failed')
    })
  }

  function banIp(ip, hours) {
    if (!ip || !window.confirm(`Ban ${ip} for ${hours} hour(s)?`)) return
    socketRef.current?.emit('admin:ban', { ip, hours }, (res) => {
      if (!res?.ok) window.alert(res?.error || 'Ban failed')
    })
  }

  function unbanIp(ip) {
    socketRef.current?.emit('admin:unban', { ip }, (res) => {
      if (!res?.ok) window.alert(res?.error || 'Unban failed')
    })
  }

  function deleteMessage(id) {
    socketRef.current?.emit('admin:delete_message', { id }, (res) => {
      if (!res?.ok) window.alert(res?.error || 'Delete failed')
    })
  }

  function sendAsCodvyn(e) {
    e.preventDefault()
    const text = composer.trim()
    if (!text) return
    setComposer('')
    socketRef.current?.emit('admin:message', text, (res) => {
      if (!res?.ok) {
        setComposer(text)
        window.alert(res?.error || 'Send failed')
      }
    })
  }

  const visibleUsers = useMemo(
    () => users.filter((u) => !u.isAdmin || u.name),
    [users],
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  if (!authed) {
    return (
      <Login
        onAuth={auth}
        error={error}
        busy={busy}
        connected={connected}
        socketUrl={displayUrl}
        onRetry={retryConnect}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-6">
      <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Saloon Admin</h1>
          <p className="text-sm text-[var(--muted)]">
            Chatting as <span className="text-[var(--accent)]">codvyn</span> ·{' '}
            {connected ? 'connected' : 'disconnected'} · {displayUrl}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm hover:bg-white/5"
        >
          Lock
        </button>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.1fr_1fr]">
        <section className="min-h-0 overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <h2 className="mb-3 text-lg font-semibold">Live users ({visibleUsers.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">IP</th>
                  <th className="pb-2 font-medium">Rename</th>
                  <th className="pb-2 font-medium">Ban</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id} className="border-t border-[var(--line)]">
                    <td className="py-2 pr-2">
                      {user.name || <span className="text-[var(--muted)]">anonymous</span>}
                      {user.isAdmin ? (
                        <span className="ml-2 text-xs text-[var(--accent)]">admin</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2 font-mono text-xs">{user.ip}</td>
                    <td className="py-2 pr-2">
                      {!user.isAdmin ? (
                        <div className="flex gap-1">
                          <input
                            value={renameDrafts[user.id] || ''}
                            onChange={(e) =>
                              setRenameDrafts((prev) => ({
                                ...prev,
                                [user.id]: e.target.value,
                              }))
                            }
                            placeholder="new name"
                            className="w-28 rounded-lg border border-[var(--line)] bg-black/30 px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => renameUser(user.id)}
                            className="rounded-lg bg-white/10 px-2 py-1 text-xs hover:bg-white/15"
                          >
                            Set
                          </button>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2">
                      {!user.isAdmin ? (
                        <div className="flex flex-wrap gap-1">
                          {[2, 12, 24].map((hours) => (
                            <button
                              key={hours}
                              type="button"
                              onClick={() => banIp(user.ip, hours)}
                              className="rounded-lg bg-[var(--danger)]/20 px-2 py-1 text-xs text-red-300 hover:bg-[var(--danger)]/30"
                            >
                              {hours}h
                            </button>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mb-2 mt-6 text-base font-semibold">Active bans</h3>
          {bans.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No bans</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {bans.map((ban) => (
                <li
                  key={ban.ip}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] px-3 py-2"
                >
                  <span>
                    <span className="font-mono text-xs">{ban.ip}</span>
                    <span className="ml-2 text-[var(--muted)]">
                      until {formatUntil(ban.until)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => unbanIp(ban.ip)}
                    className="rounded-lg bg-white/10 px-2 py-1 text-xs hover:bg-white/15"
                  >
                    Unban
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex min-h-0 flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 max-xl:max-h-[55vh]">
          <h2 className="mb-3 shrink-0 text-lg font-semibold">Messages</h2>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-xl px-3 py-2 text-sm ${
                  message.name?.toLowerCase() === 'codvyn'
                    ? 'bg-[var(--accent)] text-black'
                    : 'bg-black/35'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-semibold">{message.name}</span>
                  <button
                    type="button"
                    onClick={() => deleteMessage(message.id)}
                    className="text-xs opacity-70 hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>
                <div className="whitespace-pre-wrap break-words">{message.text}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendAsCodvyn} className="mt-3 flex shrink-0 gap-2">
            <input
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              maxLength={255}
              placeholder="Message as codvyn…"
              className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-black/40 px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--accent)] px-4 py-2 font-semibold text-black"
            >
              Send
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
