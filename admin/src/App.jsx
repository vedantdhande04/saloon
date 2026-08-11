import { useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SECRET_KEY = 'saloon-admin-secret'

function formatUntil(until) {
  if (!until) return '—'
  return new Date(until).toLocaleString()
}

function Login({ onAuth, error, busy }) {
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
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="ADMIN_SECRET"
          className="mt-5 w-full rounded-xl border border-[var(--line)] bg-black/40 px-3 py-2.5 outline-none focus:border-[var(--accent)]"
          autoFocus
        />
        {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || !secret.trim()}
          className="mt-4 w-full rounded-xl bg-[var(--accent)] px-3 py-2.5 font-semibold text-black disabled:opacity-50"
        >
          {busy ? 'Connecting…' : 'Unlock admin'}
        </button>
      </form>
    </div>
  )
}

export default function App() {
  const socketRef = useRef(null)
  const [authed, setAuthed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [users, setUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [bans, setBans] = useState([])
  const [composer, setComposer] = useState('')
  const [renameDrafts, setRenameDrafts] = useState({})

  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

  useEffect(() => {
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
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

    const saved = sessionStorage.getItem(SECRET_KEY)
    if (saved) {
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
    }

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [socketUrl])

  function auth(secret) {
    setBusy(true)
    setError('')
    socketRef.current?.emit('admin:auth', secret, (res) => {
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

  if (!authed) {
    return <Login onAuth={auth} error={error} busy={busy || !connected} />
  }

  return (
    <div className="min-h-full p-4 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Saloon Admin</h1>
          <p className="text-sm text-[var(--muted)]">
            Chatting as <span className="text-[var(--accent)]">codvyn</span> ·{' '}
            {connected ? 'connected' : 'disconnected'} · {socketUrl}
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

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
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

        <section className="flex min-h-[520px] flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <h2 className="mb-3 text-lg font-semibold">Messages</h2>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
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
          </div>

          <form onSubmit={sendAsCodvyn} className="mt-3 flex gap-2">
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
