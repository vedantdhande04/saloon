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

/** @type {Map<string, { id: string, name: string | null, lastMessageAt: number }>} */
const users = new Map()

/** @type {Array<{ id: string, name: string, text: string, at: number }>} */
const recentMessages = []
const MAX_MESSAGES = 100
const MESSAGE_COOLDOWN_MS = 1000

function broadcastPresence() {
  const online = [...users.values()].filter((u) => u.name).length
  // Count all connected sockets so the counter feels alive even before chat join
  const connected = users.size
  io.emit('presence', { online: Math.max(online, connected) })
}

io.on('connection', (socket) => {
  users.set(socket.id, { id: socket.id, name: null, lastMessageAt: 0 })
  broadcastPresence()

  socket.emit('chat:history', recentMessages)

  socket.on('chat:join', (rawName, ack) => {
    const name = String(rawName || '')
      .trim()
      .slice(0, 24)

    if (!name) {
      ack?.({ ok: false, error: 'Name is required' })
      return
    }

    if (name.toLowerCase() === 'codvyn') {
      ack?.({ ok: false, error: 'That name is reserved' })
      return
    }

    const prev = users.get(socket.id)
    users.set(socket.id, {
      id: socket.id,
      name,
      lastMessageAt: prev?.lastMessageAt || 0,
    })
    broadcastPresence()
    ack?.({ ok: true, name })
  })

  socket.on('chat:message', (rawText, ack) => {
    const user = users.get(socket.id)
    if (!user?.name) {
      ack?.({ ok: false, error: 'Join with a name first' })
      return
    }

    const now = Date.now()
    if (now - user.lastMessageAt < MESSAGE_COOLDOWN_MS) {
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

    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: user.name,
      text,
      at: now,
    }

    recentMessages.push(message)
    if (recentMessages.length > MAX_MESSAGES) {
      recentMessages.shift()
    }

    io.emit('chat:message', message)
    ack?.({ ok: true })
  })

  socket.on('disconnect', () => {
    users.delete(socket.id)
    broadcastPresence()
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Saloon server on http://localhost:${PORT}`)
})
