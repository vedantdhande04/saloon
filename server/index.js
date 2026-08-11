import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
const httpServer = createServer(app)

app.use(cors({ origin: true }))

const io = new Server(httpServer, {
  cors: { origin: true },
})

const ADMIN_SECRET = String(process.env.ADMIN_SECRET || '').trim()
const MAX_MESSAGES = 100
const MESSAGE_COOLDOWN_MS = 1000
const RESERVED_NAME = 'codvyn'

/** @type {Map<string, { id: string, name: string | null, lastMessageAt: number, ip: string, isAdmin: boolean }>} */
const users = new Map()

/** @type {Array<{ id: string, name: string, text: string, at: number }>} */
const recentMessages = []

/** @type {Map<string, number>} ip -> bannedUntil timestamp */
const bans = new Map()

function getClientIp(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim()
  }
  return socket.handshake.address || 'unknown'
}

function pruneBans(now = Date.now()) {
  for (const [ip, until] of bans.entries()) {
    if (until <= now) bans.delete(ip)
  }
}

function isBanned(ip) {
  pruneBans()
  const until = bans.get(ip)
  return until && until > Date.now() ? until : 0
}

function listUsers() {
  return [...users.values()].map((u) => ({
    id: u.id,
    name: u.name,
    ip: u.ip,
    isAdmin: u.isAdmin,
  }))
}

function broadcastPresence() {
  const named = [...users.values()].filter((u) => u.name).length
  const connected = users.size
  io.emit('presence', { online: Math.max(named, connected) })
}

function broadcastAdminUsers() {
  io.to('admin').emit('admin:users', { users: listUsers() })
}

function requireAdmin(socket, ack) {
  const user = users.get(socket.id)
  if (!user?.isAdmin) {
    ack?.({ ok: false, error: 'Unauthorized' })
    return null
  }
  return user
}

function makeMessage(name, text, at = Date.now()) {
  return {
    id: `${at}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    text,
    at,
  }
}

function pushMessage(message) {
  recentMessages.push(message)
  if (recentMessages.length > MAX_MESSAGES) recentMessages.shift()
  io.emit('chat:message', message)
}

io.on('connection', (socket) => {
  const ip = getClientIp(socket)
  const bannedUntil = isBanned(ip)

  if (bannedUntil) {
    socket.emit('chat:banned', { until: bannedUntil })
    socket.disconnect(true)
    return
  }

  users.set(socket.id, {
    id: socket.id,
    name: null,
    lastMessageAt: 0,
    ip,
    isAdmin: false,
  })
  broadcastPresence()
  broadcastAdminUsers()

  socket.emit('chat:history', recentMessages)

  socket.on('chat:join', (rawName, ack) => {
    const user = users.get(socket.id)
    if (!user) {
      ack?.({ ok: false, error: 'Not connected' })
      return
    }

    const ban = isBanned(user.ip)
    if (ban) {
      ack?.({ ok: false, error: 'Banned', until: ban })
      socket.emit('chat:banned', { until: ban })
      socket.disconnect(true)
      return
    }

    const name = String(rawName || '')
      .trim()
      .slice(0, 24)

    if (!name) {
      ack?.({ ok: false, error: 'Name is required' })
      return
    }

    if (name.toLowerCase() === RESERVED_NAME && !user.isAdmin) {
      ack?.({ ok: false, error: 'That name is reserved' })
      return
    }

    user.name = user.isAdmin && name.toLowerCase() === RESERVED_NAME ? RESERVED_NAME : name
    users.set(socket.id, user)
    broadcastPresence()
    broadcastAdminUsers()
    ack?.({ ok: true, name: user.name })
  })

  socket.on('chat:message', (rawText, ack) => {
    const user = users.get(socket.id)
    if (!user?.name) {
      ack?.({ ok: false, error: 'Join with a name first' })
      return
    }

    const ban = isBanned(user.ip)
    if (ban) {
      ack?.({ ok: false, error: 'Banned', until: ban })
      socket.disconnect(true)
      return
    }

    const now = Date.now()
    if (!user.isAdmin && now - user.lastMessageAt < MESSAGE_COOLDOWN_MS) {
      ack?.({ ok: false, error: 'Slow down' })
      return
    }

    const text = String(rawText || '').trim()
    if (!text) {
      ack?.({ ok: false, error: 'Empty message' })
      return
    }
    if (text.length > 255) {
      ack?.({ ok: false, error: 'Too long' })
      return
    }

    user.lastMessageAt = now
    users.set(socket.id, user)

    pushMessage(makeMessage(user.name, text, now))
    ack?.({ ok: true })
  })

  socket.on('admin:auth', (rawSecret, ack) => {
    if (!ADMIN_SECRET) {
      ack?.({ ok: false, error: 'Admin not configured' })
      return
    }

    const secret = String(rawSecret || '').trim()
    if (secret !== ADMIN_SECRET) {
      ack?.({ ok: false, error: 'Invalid secret' })
      return
    }

    const user = users.get(socket.id)
    if (!user) {
      ack?.({ ok: false, error: 'Not connected' })
      return
    }

    user.isAdmin = true
    user.name = RESERVED_NAME
    users.set(socket.id, user)
    socket.join('admin')

    broadcastPresence()
    broadcastAdminUsers()

    ack?.({
      ok: true,
      name: RESERVED_NAME,
      users: listUsers(),
      messages: recentMessages,
      bans: [...bans.entries()].map(([bannedIp, until]) => ({ ip: bannedIp, until })),
    })
  })

  socket.on('admin:users', (_payload, ack) => {
    if (!requireAdmin(socket, ack)) return
    ack?.({ ok: true, users: listUsers() })
  })

  socket.on('admin:rename', (payload, ack) => {
    if (!requireAdmin(socket, ack)) return

    const targetId = String(payload?.socketId || '')
    let nextName = String(payload?.name || '')
      .trim()
      .slice(0, 24)

    if (!targetId || !nextName) {
      ack?.({ ok: false, error: 'socketId and name required' })
      return
    }

    if (nextName.toLowerCase() === RESERVED_NAME) {
      ack?.({ ok: false, error: 'Cannot rename to reserved name' })
      return
    }

    const target = users.get(targetId)
    if (!target) {
      ack?.({ ok: false, error: 'User not found' })
      return
    }
    if (target.isAdmin) {
      ack?.({ ok: false, error: 'Cannot rename admin' })
      return
    }

    const previous = target.name
    target.name = nextName
    users.set(targetId, target)

    io.to(targetId).emit('chat:renamed', { name: nextName, previous })
    broadcastPresence()
    broadcastAdminUsers()
    ack?.({ ok: true, name: nextName })
  })

  socket.on('admin:delete_message', (payload, ack) => {
    if (!requireAdmin(socket, ack)) return

    const messageId = String(payload?.id || '')
    if (!messageId) {
      ack?.({ ok: false, error: 'id required' })
      return
    }

    const index = recentMessages.findIndex((m) => m.id === messageId)
    if (index === -1) {
      ack?.({ ok: false, error: 'Message not found' })
      return
    }

    recentMessages.splice(index, 1)
    io.emit('chat:deleted', { id: messageId })
    io.to('admin').emit('admin:messages', { messages: recentMessages })
    ack?.({ ok: true })
  })

  socket.on('admin:ban', (payload, ack) => {
    if (!requireAdmin(socket, ack)) return

    const targetIp = String(payload?.ip || '').trim()
    const hours = Number(payload?.hours)

    if (!targetIp || !Number.isFinite(hours) || hours <= 0) {
      ack?.({ ok: false, error: 'ip and positive hours required' })
      return
    }

    const until = Date.now() + hours * 60 * 60 * 1000
    bans.set(targetIp, until)

    for (const [id, user] of users.entries()) {
      if (user.ip === targetIp && !user.isAdmin) {
        io.to(id).emit('chat:banned', { until })
        io.sockets.sockets.get(id)?.disconnect(true)
      }
    }

    broadcastPresence()
    broadcastAdminUsers()
    io.to('admin').emit('admin:bans', {
      bans: [...bans.entries()].map(([bannedIp, banUntil]) => ({
        ip: bannedIp,
        until: banUntil,
      })),
    })

    ack?.({ ok: true, until })
  })

  socket.on('admin:unban', (payload, ack) => {
    if (!requireAdmin(socket, ack)) return
    const targetIp = String(payload?.ip || '').trim()
    if (!targetIp) {
      ack?.({ ok: false, error: 'ip required' })
      return
    }
    bans.delete(targetIp)
    io.to('admin').emit('admin:bans', {
      bans: [...bans.entries()].map(([bannedIp, until]) => ({ ip: bannedIp, until })),
    })
    ack?.({ ok: true })
  })

  socket.on('admin:message', (rawText, ack) => {
    if (!requireAdmin(socket, ack)) return

    const text = String(rawText || '').trim()
    if (!text) {
      ack?.({ ok: false, error: 'Empty message' })
      return
    }
    if (text.length > 255) {
      ack?.({ ok: false, error: 'Too long' })
      return
    }

    const user = users.get(socket.id)
    if (user) {
      user.name = RESERVED_NAME
      users.set(socket.id, user)
    }

    pushMessage(makeMessage(RESERVED_NAME, text))
    io.to('admin').emit('admin:messages', { messages: recentMessages })
    ack?.({ ok: true })
  })

  socket.on('disconnect', () => {
    users.delete(socket.id)
    broadcastPresence()
    broadcastAdminUsers()
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Saloon server on http://localhost:${PORT}`)
  if (!ADMIN_SECRET) {
    console.warn('ADMIN_SECRET is not set — admin panel auth is disabled')
  }
})
